/* Rehaan Computers — admission payments guard (Cloudflare Worker).
 *
 * Routes:
 *   POST /create-order  draft application  -> Razorpay order (one active per app)
 *   POST /verify        checkout result    -> signature + API checks, finalize
 *   POST /status        reconnect/retry    -> reconcile + finalize if paid
 *   POST /webhook       Razorpay callbacks -> reconcile (payment.captured etc.)
 *   GET  /health        liveness
 *
 * Invariants:
 *   - A document only ever reaches Submitted + paid after the Razorpay
 *     ORDER API confirms status=paid, amount=fee, currency=INR and
 *     receipt=appId, and the PAYMENT API confirms status=captured on that
 *     exact order. No client-supplied or event-supplied value finalizes
 *     anything on its own.
 *   - Email channels (institute + student) are tracked independently,
 *     at-most-once per attempt, retried only on the channel that failed.
 *
 * Secrets (wrangler secret put — never stored in code or GitHub):
 *   RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET,
 *   FIREBASE_SERVICE_ACCOUNT, EMAILJS_PRIVATE_KEY
 */

const FIRESTORE = "https://firestore.googleapis.com/v1";
const RZP = "https://api.razorpay.com/v1";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const EMAILJS_URL = "https://api.emailjs.com/api/v1.0/email/send";

const APP_ID_RE = /^[A-Za-z0-9_-]{8,40}$/;
const ORDER_ID_RE = /^order_[A-Za-z0-9_-]{4,40}$/;
const TOKEN_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const STATUS_PENDING = "Pending Payment";
const STATUS_SUBMITTED = "Submitted";

const MAX_NOTIFY_ATTEMPTS = 3;

/* ------------------------------------------------------------------ util */

function env_vars(env) {
    const fee = Number(env.FEE_Paise || env.FEE_PAISE || 10000);
    return {
        project: env.FIREBASE_PROJECT_ID || "",
        keyId: env.RAZORPAY_KEY_ID || "",
        keySecret: env.RAZORPAY_KEY_SECRET || "",
        webhookSecret: env.RAZORPAY_WEBHOOK_SECRET || "",
        serviceAccount: env.FIREBASE_SERVICE_ACCOUNT || "",
        emailjsPrivateKey: env.EMAILJS_PRIVATE_KEY || "",
        emailjsPublicKey: env.EMAILJS_PUBLIC_KEY || "",
        emailjsService: env.EMAILJS_SERVICE_ID || "service_52jdh14",
        emailjsAdmin: env.EMAILJS_ADMIN_TEMPLATE || "template_ubj4sw3",
        emailjsApplicant: env.EMAILJS_APPLICANT_TEMPLATE || "template_ka7zy85",
        appName: env.RZP_APP_NAME || "Rehaan Computers",
        allowedOrigin: env.ALLOWED_ORIGIN ||
            "https://rehaan-computers.web.app",
        feePaise: Number.isFinite(fee) && fee > 0 ? fee : 10000,
        feeCurrency: env.FEE_CURRENCY || "INR",
        maxAgeMinutes: Number(env.MAX_AGE_MINUTES || 10080)
    };
}

function corsHeaders(origin, allowed) {
    const allow = allowed.split(",").map(s => s.trim());
    if (!allow.includes(origin)) {
        return { "Access-Control-Allow-Origin": allow[0] };
    }
    return {
        "Access-Control-Allow-Origin": origin,
        "Vary": "Origin"
    };
}

function json(body, status, headers) {
    return new Response(JSON.stringify(body), {
        status: status || 200,
        headers: Object.assign({
            "Content-Type": "application/json"
        }, headers || {})
    });
}

async function sha256Hex(message, key) {
    const enc = new TextEncoder();
    const cryptoKey = await crypto.subtle.importKey(
        "raw", enc.encode(key),
        { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
    );
    const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(message));
    return [...new Uint8Array(sig)]
        .map(b => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeHexEqual(a, b) {
    if (typeof a !== "string" || typeof b !== "string") return false;
    if (a.length !== b.length || a.length === 0) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) {
        diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return diff === 0;
}

function b64url(bytes) {
    const arr = bytes instanceof Uint8Array ? bytes :
        bytes instanceof ArrayBuffer ? new Uint8Array(bytes) :
        new TextEncoder().encode(bytes);
    let bin = "";
    for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]);
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/* Basic auth header for the Razorpay API (test or live key pair). */
function rzpAuth(env) {
    const raw = `${env.keyId}:${env.keySecret}`;
    let bin = "";
    for (let i = 0; i < raw.length; i++) bin += String.fromCharCode(raw.charCodeAt(i));
    return "Basic " + btoa(bin);
}

async function rzpFetch(path, env, init) {
    const res = await fetch(RZP + path, Object.assign({
        headers: {
            "Authorization": rzpAuth(env),
            "Content-Type": "application/json"
        }
    }, init || {}));
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
        const err = new Error(
            (body && body.error && body.error.description) ||
            `Razorpay API ${res.status}`
        );
        err.rzpStatus = res.status;
        throw err;
    }
    return body;
}

/*
 * The ONLY path to finalization: independently confirms with the
 * Razorpay API that this exact order was fully captured for the right
 * rupee amount, currency, and application receipt. Returns:
 *   { paymentId }  -> verified
 *   false          -> verified NOT (amount/currency/receipt/status mismatch)
 *   "unavailable"  -> Razorpay API unreachable; caller must not finalize
 */
async function verifyPaymentWithRazorpay(orderId, appId, env) {
    if (!ORDER_ID_RE.test(String(orderId || ""))) return false;

    let order;
    try {
        order = await rzpFetch(`/orders/${orderId}`, env);
    } catch (e) {
        return "unavailable";
    }

    if (order.status !== "paid" ||
        Number(order.amount_paid) !== env.feePaise ||
        order.currency !== env.feeCurrency ||
        order.receipt !== appId) {
        return false;
    }

    /* The Order GET response does not contain last_payment_id. Fetch all
     * payments for this order from Razorpay and identify a captured ₹100
     * payment. This also supports payment recovery after browser closure. */
    let paymentCollection;
    try {
        paymentCollection = await rzpFetch(`/orders/${orderId}/payments`, env);
    } catch (e) {
        return "unavailable";
    }

    const captured = Array.isArray(paymentCollection.items)
        ? paymentCollection.items.find(p =>
            p && p.status === "captured" &&
            p.order_id === orderId &&
            Number(p.amount) === env.feePaise &&
            p.currency === env.feeCurrency &&
            /^pay_[A-Za-z0-9_-]{4,40}$/.test(String(p.id || ""))
        )
        : null;

    return captured ? { paymentId: captured.id } : false;
}

/* ------------------------------------------------------ Firestore (REST) */

let cachedToken = null;
let cachedTokenUntil = 0;

async function googleAccessToken(serviceAccountJson) {
    const now = Math.floor(Date.now() / 1000);
    if (cachedToken && now < cachedTokenUntil - 60) return cachedToken;

    const sa = JSON.parse(serviceAccountJson);
    const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
    const claim = b64url(JSON.stringify({
        iss: sa.client_email,
        scope: "https://www.googleapis.com/auth/datastore",
        aud: sa.token_uri || TOKEN_URL,
        iat: now,
        exp: now + 3600
    }));
    const signingInput = `${header}.${claim}`;

    const pkcs8 = Uint8Array.from(
        atob((sa.private_key || "")
            .replace(/-----[^-]+-----/g, "")
            .replace(/\s+/g, "")),
        c => c.charCodeAt(0)
    );

    const key = await crypto.subtle.importKey(
        "pkcs8", pkcs8,
        { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
        false, ["sign"]
    );
    const sig = await crypto.subtle.sign(
        "RSASSA-PKCS1-v1_5", key,
        new TextEncoder().encode(signingInput)
    );

    const res = await fetch(sa.token_uri || TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: "grant_type=" +
            "urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer" +
            "&assertion=" + encodeURIComponent(`${signingInput}.${b64url(sig)}`)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.access_token) {
        throw new Error("Google token exchange failed");
    }
    cachedToken = data.access_token;
    cachedTokenUntil = now + (data.expires_in || 3600);
    return cachedToken;
}

function docName(project, appId) {
    return `projects/${project}/databases/(default)/documents/applications/${appId}`;
}

async function fsGet(project, sa, appId) {
    const token = await googleAccessToken(sa);
    const res = await fetch(
        `${FIRESTORE}/${docName(project, appId)}`,
        { headers: { Authorization: `Bearer ${token}` } }
    );
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Firestore read ${res.status}`);
    const raw = await res.json();
    return {
        name: raw.name,
        updateTime: raw.updateTime,
        data: decodeFields(raw.fields || {})
    };
}

function decodeFields(fields) {
    const out = {};
    for (const [k, v] of Object.entries(fields)) {
        if ("stringValue" in v) out[k] = v.stringValue;
        else if ("integerValue" in v) out[k] = Number(v.integerValue);
        else if ("doubleValue" in v) out[k] = v.doubleValue;
        else if ("booleanValue" in v) out[k] = v.booleanValue;
        else if ("mapValue" in v) out[k] = decodeFields(v.mapValue.fields || {});
        else if ("nullValue" in v) out[k] = null;
        else out[k] = v;
    }
    return out;
}

function encodeValue(value) {
    if (typeof value === "string") return { stringValue: value };
    if (typeof value === "number") {
        return Number.isInteger(value)
            ? { integerValue: String(value) }
            : { doubleValue: value };
    }
    if (typeof value === "boolean") return { booleanValue: value };
    if (value === null || value === undefined) return { nullValue: null };
    if (typeof value === "object") {
        const fields = {};
        for (const [k, v] of Object.entries(value)) fields[k] = encodeValue(v);
        return { mapValue: { fields } };
    }
    return { stringValue: String(value) };
}

/*
 * Merge-patch specific top-level fields (update + updateMask, per the
 * Firestore v1 Write message) with an optional updateTime precondition.
 * Throws Error with .aborted = true when the document changed under us.
 */
async function fsPatch(project, sa, appId, fields, precondition) {
    const token = await googleAccessToken(sa);
    const document = {
        name: docName(project, appId),
        fields: Object.fromEntries(
            Object.entries(fields).map(([k, v]) => [k, encodeValue(v)])
        )
    };
    const write = {
        update: document,
        updateMask: { fieldPaths: Object.keys(fields) }
    };
    if (precondition && precondition.updateTime) {
        write.currentDocument = { updateTime: precondition.updateTime };
    }
    const res = await fetch(`${FIRESTORE}/projects/${project}/databases/(default)/documents:commit`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ writes: [write] })
    });
    if (res.status === 409) {
        const err = new Error("precondition-failed");
        err.aborted = true;
        throw err;
    }
    if (!res.ok) throw new Error(`Firestore write ${res.status}`);
    return res.json();
}

/* ------------------------------------------------------------ EmailJS    */

async function sendEmail(templateId, params, env) {
    const res = await fetch(EMAILJS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
           service_id: env.emailjsService || env.EMAILJS_SERVICE_ID,
template_id: templateId,
user_id: env.emailjsPublicKey || env.EMAILJS_PUBLIC_KEY || "",
accessToken: env.emailjsPrivateKey || env.EMAILJS_PRIVATE_KEY || "",
template_params: params
        })
    });
 if (!res.ok) {
    const detail = (await res.text()).slice(0, 250);
    throw new Error(`EmailJS ${res.status}: ${detail}`);
}
    return true;
}

function formatDate(iso) {
    try {
        const d = new Date(iso);
        return d.toLocaleDateString("en-IN", {
            day: "numeric", month: "long", year: "numeric"
        });
    } catch (e) {
        return iso || "";
    }
}

/* ----------------------------------------------------------- notify      */

/*
 * Per-channel read-merge-write on the payment map. Precondition-guarded
 * so concurrent writers (verify + webhook) never clobber each other's
 * channel markers.
 */
async function patchPayment(project, sa, appId, mutation) {
    for (let i = 0; i < 3; i++) {
        const snap = await fsGet(project, sa, appId);
        if (!snap || snap.data.status !== STATUS_SUBMITTED) return false;
        const merged = Object.assign({}, snap.data.payment || {}, mutation);
        try {
            await fsPatch(project, sa, appId, { payment: merged },
                { updateTime: snap.updateTime });
            return true;
        } catch (err) {
            if (!err || !err.aborted) return false;
        }
    }
    return false;
}

/*
 * Institute + student emails are independent channels:
 *   - each channel records { at, attempts, error }
 *   - a delivered channel is never re-sent
 *   - only a FAILED channel is retried (bounded), e.g. via /status or webhook
 */
async function notifyApplication(project, sa, appId, env) {
    const snap = await fsGet(project, sa, appId);
    if (!snap || snap.data.status !== STATUS_SUBMITTED) return;
    const d = snap.data;
    const payment = d.payment || {};

    const refId = "#" + String(appId).slice(0, 8).toUpperCase();
    const feeText = "₹" + (env.feePaise / 100);
    const paidStatus = "Paid — verified by Razorpay";

    const channels = [
        {
            key: "notifyAdmin",
            template: env.emailjsAdmin,
            params: {
                student_name: d.fullName || "Student",
                parent_name: d.parentName || "",
                student_phone: d.phone || "",
                guardian_phone: d.guardianPhone || "Not provided",
                student_email: d.email || "",
                dob: d.dob || "",
                qualification: d.qualification || "",
                course: d.coursePreference || "",
                batch: d.batch || "",
                address: d.address || "",
                attendance_setup: d.attendanceSetup === "setup"
                    ? "Account requested" : "Skipped",
                attendance_email: d.attendanceSetup === "setup"
                    ? (d.attendanceEmail || "") : "Not applicable",
                source: d.source || "Not specified",
                message: d.message || "No additional message",
                submitted_at: formatDate(d.createdAt),
                application_reference: refId,
                admission_fee: feeText,
                payment_status: paidStatus
            }
        }
    ];

    if (d.email) {
        channels.push({
            key: "notifyStudent",
            template: env.emailjsApplicant,
            params: {
                student_name: d.fullName || "Student",
                student_email: d.email,
                parent_name: d.parentName || "",
                course: d.coursePreference || "",
                batch: d.batch || "",
                application_reference: refId,
                admission_fee: feeText,
                payment_status: paidStatus
            }
        });
    }

    for (const ch of channels) {

        const fresh = await fsGet(project, sa, appId);
        const cur = (fresh && fresh.data.payment &&
            fresh.data.payment[ch.key]) || {};

        if (cur.at) continue;                        /* delivered */
        if ((cur.attempts || 0) >= MAX_NOTIFY_ATTEMPTS) continue;

        const attempt = (cur.attempts || 0) + 1;

        /* claim the attempt BEFORE sending (at-most-once per attempt) */
        const claimed = await patchPayment(project, sa, appId, {
            [ch.key]: { at: null, attempts: attempt, error: "" }
        });
        if (!claimed) continue;

        let sendError = null;
        try {
            if (ch.key === 'notifyStudent') await new Promise(r => setTimeout(r, 1200));
            await sendEmail(ch.template, ch.params, env);
        } catch (e) {
            sendError = String(e && e.message || e).slice(0, 200);
        }

        await patchPayment(project, sa, appId, {
            [ch.key]: sendError
                ? { at: null, attempts: attempt, error: sendError }
                : { at: new Date().toISOString(), attempts: attempt, error: null }
        });
    }
}

/* ------------------------------------------------------------ finalize   */

/*
 * The single, guarded transition Pending Payment -> Submitted (paid).
 * Every entry point (verify, status, webhook, create-order) funnels here,
 * and Razorpay-API verification is mandatory inside before any write.
 * Idempotent: an already-finalized document only gets its failed email
 * channels retried — never re-paid, never re-sent on a delivered channel.
 */
async function finalizeApplication(project, sa, appId, env, ref) {

    const orderId = ref && ref.orderId || "";

    for (let loop = 0; loop < 3; loop++) {

        const snap = await fsGet(project, sa, appId);
        if (!snap) return { ok: false, reason: "not-found" };
        const d = snap.data;

        if (d.status !== STATUS_PENDING) {
            if (d.status === STATUS_SUBMITTED &&
                d.payment && d.payment.status === "paid") {
                await notifyApplication(project, sa, appId, env);
            }
            return {
                ok: true,
                already: true,
                status: d.status || STATUS_PENDING,
                fullName: d.fullName || "",
                paid: Boolean(d.payment && d.payment.status === "paid")
            };
        }

        const verdict = await verifyPaymentWithRazorpay(orderId, appId, env);
        if (verdict === "unavailable") {
            return { ok: false, reason: "unavailable" };
        }
        if (!verdict) {
            return { ok: false, reason: "unverified" };
        }

        const nowIso = new Date().toISOString();
        const payment = {
            status: "paid",
            amount: env.feePaise / 100,
            currency: env.feeCurrency,
            method: "razorpay",
            verified: true,
            reference: verdict.paymentId,
            orderId: orderId,
            verifiedAt: nowIso,
            updatedAt: nowIso
        };

        try {
            await fsPatch(project, sa, appId, {
                status: STATUS_SUBMITTED,
                payment: payment
            }, { updateTime: snap.updateTime });
        } catch (err) {
            if (err && err.aborted) continue;         /* raced — re-read */
            throw err;
        }

        await notifyApplication(project, sa, appId, env);

        return {
            ok: true,
            status: STATUS_SUBMITTED,
            fullName: d.fullName || "",
            paid: true
        };
    }

    return { ok: false, reason: "busy" };
}

/* -------------------------------------------------------------- routes   */

function badRequest(msg, headers) {
    return json({ error: msg }, 400, headers);
}

async function readJson(request) {
    try {
        return await request.json();
    } catch (e) {
        return null;
    }
}

async function handleCreateOrder(request, env) {
    const v = env_vars(env);
    const headers = corsHeaders(request.headers.get("Origin") || "", v.allowedOrigin);
    const body = await readJson(request);

    if (!body || !APP_ID_RE.test(body.appId || "") || !TOKEN_RE.test(body.paymentToken || "")) {
        return badRequest("Invalid request.", headers);
    }

    const snap = await fsGet(v.project, v.serviceAccount, body.appId);
    if (!snap) return json({ error: "Application not found." }, 404, headers);
    const d = snap.data;

    if (d.paymentToken !== body.paymentToken) {
        return json({ error: "This request is not linked to that application." }, 403, headers);
    }

    if (d.status !== STATUS_PENDING) {
        if (d.payment && d.payment.status === "paid") {
            return json({ alreadyPaid: true, status: d.status }, 200, headers);
        }
        return json({ error: "This application is not awaiting payment." }, 409, headers);
    }

    let orderId = d.razorpayOrderId || "";
    let reusable = false;

    if (orderId) {
        try {
            const order = await rzpFetch(`/orders/${orderId}`, v);
            if (order.status === "created") {
                const ageMin = (Date.now() / 1000) - (order.created_at || 0);
                if (ageMin / 60 < v.maxAgeMinutes) reusable = true;
            } else if (order.status === "paid") {
                const r = await finalizeApplication(
                    v.project, v.serviceAccount, body.appId, v,
                    { orderId: orderId });
                if (r.ok) {
                    return json({ alreadyPaid: true, status: r.status }, 200, headers);
                }
                return json({
                    error: "Payment is being confirmed — try again shortly."
                }, 202, headers);
            }
        } catch (e) {
            /* stale/missing order — create a fresh one below */
        }
    }

    if (!reusable) {
        const created = await rzpFetch("/orders", v, {
            method: "POST",
            body: JSON.stringify({
                amount: v.feePaise,
                currency: v.feeCurrency,
                receipt: body.appId,
                notes: { application: body.appId }
            })
        });
        orderId = created.id;

        await fsPatch(v.project, v.serviceAccount, body.appId, {
            razorpayOrderId: orderId,
            orderRequestedAt: new Date().toISOString()
        }, { updateTime: snap.updateTime }).catch(() => {
            /* raced with a finalize — the order simply goes unused */
        });
    }

    return json({
        orderId: orderId,
        amount: v.feePaise,
        currency: v.feeCurrency,
        keyId: v.keyId,
        name: v.appName
    }, 200, headers);
}

async function handleVerify(request, env) {
    const v = env_vars(env);
    const headers = corsHeaders(request.headers.get("Origin") || "", v.allowedOrigin);
    const body = await readJson(request);

    if (!body ||
        !APP_ID_RE.test(body.appId || "") ||
        !TOKEN_RE.test(body.paymentToken || "") ||
        !ORDER_ID_RE.test(body.razorpayOrderId || "") ||
        !/^(pay|trx)_[A-Za-z0-9_-]{4,40}$/.test(body.razorpayPaymentId || "") ||
        !/^[0-9a-f]{64}$/.test(body.razorpaySignature || "")) {
        return badRequest("Incomplete verification request.", headers);
    }

    /* 1. checkout signature */
    const expected = await sha256Hex(
        `${body.razorpayOrderId}|${body.razorpayPaymentId}`, v.keySecret
    );
    if (!timingSafeHexEqual(expected, String(body.razorpaySignature))) {
        return json({ error: "Payment signature verification failed." }, 400, headers);
    }

    /* 2. the order must be the one this application was issued */
    const snap = await fsGet(v.project, v.serviceAccount, body.appId);
    if (!snap) return json({ error: "Application not found." }, 404, headers);
    const d = snap.data;

    if (d.paymentToken !== body.paymentToken) {
        return json({ error: "This request is not linked to that application." }, 403, headers);
    }
    if (d.razorpayOrderId !== body.razorpayOrderId) {
        return json({ error: "Order does not belong to this application." }, 400, headers);
    }

    /* 3. finalize ONLY after Razorpay-API confirmation (checked inside) */
    const result = await finalizeApplication(v.project, v.serviceAccount,
        body.appId, v, { orderId: body.razorpayOrderId });

    if (!result.ok) {
        if (result.reason === "unavailable") {
            return json({
                error: "Razorpay could not be reached — the payment will be confirmed automatically."
            }, 202, headers);
        }
        return json({ error: "Payment details did not match this application." }, 400, headers);
    }

    return json({
        verified: true,
        already: Boolean(result.already),
        status: result.status,
        fullName: result.fullName
    }, 200, headers);
}

async function handleStatus(request, env) {
    const v = env_vars(env);
    const headers = corsHeaders(request.headers.get("Origin") || "", v.allowedOrigin);
    const body = await readJson(request);

    if (!body || !APP_ID_RE.test(body.appId || "") || !TOKEN_RE.test(body.paymentToken || "")) {
        return badRequest("Invalid request.", headers);
    }

    let snap = await fsGet(v.project, v.serviceAccount, body.appId);
    if (!snap) return json({ error: "Application not found." }, 404, headers);
    let d = snap.data;

    if (d.paymentToken !== body.paymentToken) {
        return json({ error: "Not linked." }, 403, headers);
    }

    /*
     * Reconciliation: money captured but the browser never reported it,
     * OR the application is finalized while an email channel is still
     * undelivered — both route through the guarded idempotent finalize,
     * whose already-path repairs only the FAILED channel.
     */
    const channelsPending = d.payment &&
        ((!d.payment.notifyAdmin || !d.payment.notifyAdmin.at) ||
         (d.email && (!d.payment.notifyStudent || !d.payment.notifyStudent.at)));

    if (d.razorpayOrderId &&
        (d.status === STATUS_PENDING ||
         (d.status === STATUS_SUBMITTED && channelsPending))) {

        const r = await finalizeApplication(v.project, v.serviceAccount,
            body.appId, v, { orderId: d.razorpayOrderId });
        if (r.ok) {
            snap = await fsGet(v.project, v.serviceAccount, body.appId);
            d = snap ? snap.data : d;
        }
    }

    const paid = Boolean(d.payment && d.payment.status === "paid");
    const status = d.status || STATUS_PENDING;

    return json({
        status: status,
        finalized: status === STATUS_SUBMITTED || paid
    }, 200, headers);
}

async function handleWebhook(request, env) {
    const v = env_vars(env);

    if (!v.webhookSecret) {
        return json({ error: "Webhook is not configured." }, 503);
    }

    const raw = await request.text();
    const signature = request.headers.get("X-Razorpay-Signature") || "";
    const expected = await sha256Hex(raw, v.webhookSecret);

    if (!timingSafeHexEqual(expected, signature)) {
        return json({ error: "Invalid webhook signature." }, 401);
    }

    let event;
    try {
        event = JSON.parse(raw);
    } catch (e) {
        return badRequest("Bad payload.");
    }

    /*
     * Never trust event payload fields to pick the application. The event
     * only names an ORDER; the order is re-fetched from Razorpay and its
     * server-side receipt (which this Worker wrote at creation time)
     * decides which application — if any — may be finalized.
     */
    let orderId = "";
    if (event && event.event === "payment.captured") {
        const ent = event.payload && event.payload.payment &&
            event.payload.payment.entity;
        orderId = (ent && (ent.order_id || ent.razorpay_order_id)) || "";
    } else if (event && event.event === "order.paid") {
        const ent = event.payload && event.payload.order &&
            event.payload.order.entity;
        orderId = (ent && ent.id) || "";
    } else {
        return json({ ok: true, ignored: true });
    }

    if (!ORDER_ID_RE.test(orderId)) {
        return json({ ok: true, ignored: true });
    }

    let order;
    try {
        order = await rzpFetch(`/orders/${orderId}`, v);
    } catch (e) {
        /* transient API problem — let Razorpay retry the delivery */
        return json({ error: "Order lookup failed; retry later." }, 500);
    }

    const appId = String(order.receipt || "");
    if (!APP_ID_RE.test(appId)) {
        return json({ ok: true, ignored: true });
    }

    const result = await finalizeApplication(v.project, v.serviceAccount,
        appId, v, { orderId: orderId });

    if (!result.ok) {
        if (result.reason === "unavailable" || result.reason === "busy") {
            return json({ error: "Deferred — retry later." }, 500);
        }
        return json({ ok: true, ignored: true });
    }

    return json({ ok: true });
}

/* ------------------------------------------------------------ handler    */

const rate = new Map();

function tooMany(ip, limit, windowMs) {
    const now = Date.now();
    const rec = rate.get(ip);
    if (!rec || now - rec.start > windowMs) {
        rate.set(ip, { start: now, count: 1 });
        return false;
    }
    rec.count++;
    return rec.count > limit;
}

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const v = env_vars(env);
        const ip = (request.headers.get("CF-Connecting-IP") || "unknown");

        if (request.method === "OPTIONS") {
            const h = corsHeaders(request.headers.get("Origin") || "", v.allowedOrigin);
            return new Response(null, {
                status: 204,
                headers: Object.assign({
                    "Allow": "POST, OPTIONS",
                    "Access-Control-Allow-Methods": "POST, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type"
                }, h)
            });
        }

        if (request.method !== "POST") {
            if (url.pathname === "/health") return json({ ok: true });
            return json({ error: "Method not allowed" }, 405);
        }

        if (!v.project || !v.serviceAccount || !v.keyId || !v.keySecret) {

            return json({ error: "Worker is not configured yet." }, 500);
        }

        if (tooMany(ip, url.pathname === "/webhook" ? 300 : 20, 60000)) {
            return json({ error: "Too many requests — try again shortly." }, 429);
        }

        try {
            switch (url.pathname) {
                case "/create-order": return await handleCreateOrder(request, env);
                case "/verify":       return await handleVerify(request, env);
                case "/status":       return await handleStatus(request, env);
                case "/webhook":      return await handleWebhook(request, env);
                default:
                    return json({ error: "Not found" }, 404);
            }
        } catch (err) {
            console.error("payments worker error:", err);
            return json({ error: "Service error — please try again." }, 500);
        }
    }
};

export {
    sha256Hex, timingSafeHexEqual, finalizeApplication, env_vars,
    encodeValue, decodeFields, verifyPaymentWithRazorpay, fsPatch,
    docName
};
