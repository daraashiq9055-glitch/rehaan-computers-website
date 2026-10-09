/* Local unit/integration test for backend/payments/rehaan-payments.worker.mjs
 * Run: node tools/payments-worker-test.mjs
 * External APIs are mocked; crypto (HMAC + RS256 JWT) is REAL.
 * The Firestore mock enforces the official v1 Commit Write structure:
 * (update: Document, updateMask.fieldPaths) and rejects document: Document. */

import { webcrypto, generateKeyPairSync, createHmac } from "node:crypto";
import worker from "../backend/payments/rehaan-payments.worker.mjs";

if (!globalThis.crypto) globalThis.crypto = webcrypto;

const KEY_SECRET = "test_key_secret_zzz";
const WEBHOOK_SECRET = "whsec_test";
const APP_ID = "draftapp1234567";
const TOKEN = "11111111-2222-4333-8444-555555555555";
const OTHER_APP = "draftapp9876543";

const { privateKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
    publicKeyEncoding: { type: "spki", format: "pem" }
});

/* ------------------------------------------------ mock state */

let docs = new Map();
let orders = new Map();
let payments = new Map();
let emails = [];
let emailFailTemplates = new Set();   /* template ids that error */
let commitCount = 0;
let badWriteShape = 0;

const nowSec = () => String(Math.floor(Date.now() / 1000));

function encodeAll(obj) {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
        if (v && typeof v === "object") out[k] = { mapValue: { fields: encodeAll(v) } };
        else if (typeof v === "number") out[k] = { integerValue: String(v) };
        else if (typeof v === "boolean") out[k] = { booleanValue: v };
        else if (v === null) out[k] = { nullValue: null };
        else out[k] = { stringValue: String(v) };
    }
    return out;
}

function decodeAll(fields) {
    const out = {};
    for (const [k, v] of Object.entries(fields || {})) {
        if ("mapValue" in v) out[k] = decodeAll(v.mapValue.fields);
        else if ("integerValue" in v) out[k] = Number(v.integerValue);
        else if ("booleanValue" in v) out[k] = v.booleanValue;
        else if ("stringValue" in v) out[k] = v.stringValue;
        else if ("nullValue" in v) out[k] = null;
        else out[k] = v;
    }
    return out;
}

function seedDoc(id = APP_ID, extra = {}) {
    docs.set(id, {
        fields: encodeAll(Object.assign({
            fullName: "Test Student",
            parentName: "Test Parent",
            phone: "9999999999",
            email: "student@example.com",
            coursePreference: "Diploma",
            batch: "Morning",
            address: "Charangam",
            dob: "2005-01-01",
            qualification: "12th",
            message: "",
            source: "Website",
            attendanceSetup: "setup",
            attendanceEmail: "att@example.com",
            photo: "data:image/jpeg;base64,xx",
            status: "Pending Payment",
            paymentToken: TOKEN,
            payment: { status: "awaiting", amount: 100 },
            createdAt: "2026-10-08T00:00:00.000Z"
        }, extra)),
        updateTime: { seconds: nowSec(), nanos: commitCount + 1 }
    });
}

function hmacHex(message, key) {
    return createHmac("sha256", key).update(message).digest("hex");
}

/* ------------------------------------------------ mock fetch */

globalThis.fetch = async (url, init = {}) => {
    const u = String(url);
    let body = null;
    if (init.body) {
        try { body = JSON.parse(init.body); } catch (e) { body = null; }
    }

    if (u.includes("oauth2.googleapis.com/token")) {
        return resp({ access_token: "ya29.mock", expires_in: 3600 });
    }

    if (u.includes("firestore.googleapis.com") && u.includes(":commit")) {
        commitCount++;
        const w = body.writes[0];

        /* ENFORCE the official Firestore v1 Commit Write shape */
        if (!w.update || w.document || !w.updateMask || !Array.isArray(w.updateMask.fieldPaths)) {
            badWriteShape++;
            return resp({
                error: { code: 3, message: "INVALID_ARGUMENT: Write needs update + updateMask.fieldPaths" }
            }, 400);
        }

        const id = w.update.name.split("/").pop();
        const cur = docs.get(id);
        if (w.currentDocument && cur &&
            w.currentDocument.updateTime &&
            cur.updateTime.seconds !== w.currentDocument.updateTime.seconds) {
            return resp({ error: "ABORTED: precondition failed" }, 409);
        }

        const merged = decodeAll(cur ? cur.fields : {});
        const newFields = decodeAll(w.update.fields);
        for (const k of w.updateMask.fieldPaths) merged[k] = newFields[k];
        docs.set(id, {
            fields: encodeAll(merged),
            updateTime: { seconds: nowSec(), nanos: commitCount + 1 }
        });
        return resp({ commitTime: {} });
    }

    if (u.includes("firestore.googleapis.com")) {
        const id = u.split("/applications/")[1];
        const d = docs.get(id);
        if (!d) return resp({ error: "not found" }, 404);
        return resp(Object.assign(
            { name: `projects/p/databases/(default)/documents/applications/${id}` },
            d
        ));
    }

    if (u.includes("api.razorpay.com/v1/orders") && init.method === "POST") {
        const id = "order_MOCK" + (orders.size + 1);
        orders.set(id, {
            id,
            status: "created",
            amount: body.amount,
            amount_paid: 0,
            currency: body.currency,
            receipt: body.receipt,
            created_at: Math.floor(Date.now() / 1000)
        });
        return resp(orders.get(id));
    }

    if (u.includes("api.razorpay.com/v1/orders/") && u.endsWith("/payments")) {
        const id = u.split("/orders/")[1].split("/payments")[0];
        if (!orders.has(id)) return resp({ error: { description: "not found" } }, 404);
        const items = Array.from(payments.values()).filter(p => p.order_id === id);
        return resp({ entity: "collection", count: items.length, items });
    }

    if (u.includes("api.razorpay.com/v1/orders/")) {
        const o = orders.get(u.split("/orders/")[1]);
        if (!o) return resp({ error: { description: "not found" } }, 404);
        return resp(o);
    }

    if (u.includes("api.razorpay.com/v1/payments/")) {
        const p = payments.get(u.split("/payments/")[1]);
        if (!p) return resp({ error: { description: "not found" } }, 404);
        return resp(p);
    }

    if (u.includes("api.emailjs.com")) {
        if (emailFailTemplates.has(body.template_id)) {
            return resp({ error: "quota exceeded" }, 402);
        }
        emails.push(body);
        return resp({ ok: true });
    }

    throw new Error("unmocked fetch " + u);
};

function resp(obj, status = 200) {
    return new Response(JSON.stringify(obj), {
        status,
        headers: { "Content-Type": "application/json" }
    });
}

/* ------------------------------------------------ helpers */

const env = {
    FIREBASE_PROJECT_ID: "rehaan-computers",
    RAZORPAY_KEY_ID: "rzp_test_XXXXXXXXXX",
    RAZORPAY_KEY_SECRET: KEY_SECRET,
    RAZORPAY_WEBHOOK_SECRET: WEBHOOK_SECRET,
    FIREBASE_SERVICE_ACCOUNT: JSON.stringify({
        client_email: "test@rehaan-computers.iam.gserviceaccount.com",
        private_key: privateKey,
        token_uri: "https://oauth2.googleapis.com/token"
    }),
    EMAILJS_PRIVATE_KEY: "priv",
    EMAILJS_SERVICE_ID: "service_x",
    EMAILJS_ADMIN_TEMPLATE: "template_admin",
    EMAILJS_APPLICANT_TEMPLATE: "template_applicant",
    ALLOWED_ORIGIN: "https://rehaan-computers.web.app",
    FEE_Paise: 10000
};

async function call(path, payload) {
    const request = new Request("https://pay.test" + path, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Origin: "https://rehaan-computers.web.app",
            "CF-Connecting-IP": "10.9.9." + (1 + (commitCount % 9))
        },
        body: JSON.stringify(payload)
    });
    const res = await worker.fetch(request, env, { waitUntil() {} });
    return { status: res.status, body: await res.json().catch(() => ({})) };
}

async function rawCall(path, rawText, headers) {
    const req = new Request("https://pay.test" + path, {
        method: "POST",
        headers: Object.assign({ "Content-Type": "application/json" }, headers || {}),
        body: rawText
    });
    const res = await worker.fetch(req, env, { waitUntil() {} });
    const status = res.status;
    const body = await res.json().catch(() => ({}));
    return { status, body };
}

let pass = 0, fail = 0;
function check(name, cond) {
    if (cond) { pass++; console.log("  PASS —", name); }
    else { fail++; console.log("  FAIL —", name); }
}

function docOf(id = APP_ID) { return decodeAll(docs.get(id).fields); }

function simulateCapture(orderId, amountPaid = 10000) {
    const order = orders.get(orderId);
    const paymentId = "pay_MOCK" + orderId.slice(-2) + "_" + payments.size;
    order.status = "paid";
    order.amount_paid = amountPaid;
    payments.set(paymentId, {
        id: paymentId, order_id: orderId, status: "captured", amount: 10000, currency: "INR"
    });
    return paymentId;
}

/* ------------------------------------------------ run */

console.log("\n[0] Firestore Write structure is update + updateMask (not `document`)");
seedDoc();
{
    const r0 = await call("/status", { appId: APP_ID, paymentToken: "00000000-0000-4000-8000-000000000000" });
    check("control call runs", r0.status === 403);
}
{   /* an order-less status poll triggers no write; force one via create+capture+status */
    const r = await call("/create-order", { appId: APP_ID, paymentToken: TOKEN });
    simulateCapture(r.body.orderId);
    const s = await call("/status", { appId: APP_ID, paymentToken: TOKEN });
    check("finalize write used valid Write shape", s.status === 200 && s.body.finalized === true);
    check("zero invalid Write structures sent", badWriteShape === 0);
    check("transition finalized", docOf().status === "Submitted" && docOf().payment.status === "paid");
    check("mock Order follows Razorpay API (no last_payment_id)",
        [...orders.values()].every(o => !Object.hasOwn(o, "last_payment_id")));
}

console.log("\n[1] create-order: draft → order + link written");
docs.clear(); orders.clear(); payments.clear(); emails.length = 0; commitCount = 0;
docs.clear(); orders.clear(); payments.clear(); emails.length = 0;
seedDoc();
let r = await call("/create-order", { appId: APP_ID, paymentToken: TOKEN });
check("200 with orderId", r.status === 200 && /^order_MOCK/.test(r.body.orderId));
check("order stored on doc", docOf().razorpayOrderId === r.body.orderId);

console.log("\n[2] create-order reuses the single active order (no duplicate charge)");
let r2 = await call("/create-order", { appId: APP_ID, paymentToken: TOKEN });
check("same order reused", r2.body.orderId === r.body.orderId);
check("exactly one Razorpay order exists", orders.size === 1);

console.log("\n[3] create-order rejects wrong token and unknown draft");
check("403 on token mismatch", (await call("/create-order", { appId: APP_ID, paymentToken: "00000000-0000-4000-8000-000000000000" })).status === 403);
check("404 on unknown draft", (await call("/create-order", { appId: "nonexistentapp", paymentToken: TOKEN })).status === 404);

console.log("\n[4] verify: signature + INDEPENDENT Razorpay-API confirmation → finalize + exactly 2 emails");
docs.clear(); orders.clear(); payments.clear(); emails.length = 0; commitCount = 0;
seedDoc();
r = await call("/create-order", { appId: APP_ID, paymentToken: TOKEN });
const orderId = r.body.orderId;
const paymentId = simulateCapture(orderId);
const sig = hmacHex(`${orderId}|${paymentId}`, KEY_SECRET);
r = await call("/verify", {
    appId: APP_ID, paymentToken: TOKEN,
    razorpayOrderId: orderId, razorpayPaymentId: paymentId, razorpaySignature: sig
});
let doc = docOf();
check("verified: true", r.status === 200 && r.body.verified === true);
check("status → Submitted", doc.status === "Submitted");
check("payment paid + razorpay + verified + captured id stored",
    doc.payment.status === "paid" && doc.payment.method === "razorpay" &&
    doc.payment.verified === true && doc.payment.reference === paymentId &&
    doc.payment.orderId === orderId);
check("two emails sent once each", emails.length === 2);
check("per-channel delivery markers set",
    doc.payment.notifyAdmin && doc.payment.notifyAdmin.at &&
    doc.payment.notifyStudent && doc.payment.notifyStudent.at);
check("email params carry reference + fee + verified status",
    emails[0].template_params.application_reference.startsWith("#") &&
    emails[0].template_params.payment_status.includes("verified") &&
    emails[1].template_params.admission_fee.includes("100"));

console.log("\n[5] finalization refused when the Razorpay order does not truly match");
{   /* client claims paid but API says created */
    docs.clear(); orders.clear(); payments.clear(); emails.length = 0;
    seedDoc();
    const rc = await call("/create-order", { appId: APP_ID, paymentToken: TOKEN });
    const oid = rc.body.orderId;
    /* no simulateCapture — order still 'created'; signature is valid-shaped */
    const s2 = hmacHex(`${oid}|pay_MOCKFAKE`, KEY_SECRET);
    const rv = await call("/verify", {
        appId: APP_ID, paymentToken: TOKEN, razorpayOrderId: oid,
        razorpayPaymentId: "pay_MOCKFAKE", razorpaySignature: s2
    });
    check("unverified payment → 400, still Pending Payment",
        rv.status === 400 && docOf().status === "Pending Payment" && emails.length === 0);

    /* partial amount captured — must NOT finalize */
    simulateCapture(oid, 5000);
    const s3 = await call("/status", { appId: APP_ID, paymentToken: TOKEN });
    check("partial-amount order never reconciles to paid",
        s3.status === 200 && s3.body.finalized === false && docOf().status === "Pending Payment");
}

console.log("\n[6] verify: forgery rejected");
docs.clear(); orders.clear(); payments.clear(); emails.length = 0;
seedDoc();
r = await call("/create-order", { appId: APP_ID, paymentToken: TOKEN });
const fid = r.body.orderId;
const fpid = simulateCapture(fid);
r = await call("/verify", {
    appId: APP_ID, paymentToken: TOKEN, razorpayOrderId: fid,
    razorpayPaymentId: fpid, razorpaySignature: hmacHex(`${fid}|${fpid}`, "attacker-key")
});
check("bad HMAC → 400", r.status === 400);
{   /* correct HMAC but order belongs to a DIFFERENT application (receipt) */
    orders.set("order_FOREIGN", { id: "order_FOREIGN", status: "paid", amount_paid: 10000,
        currency: "INR", receipt: "someoneelsesapp", created_at: 1, last_payment_id: "pay_FOREIGN" });
    payments.set("pay_FOREIGN", { id: "pay_FOREIGN", order_id: "order_FOREIGN", status: "captured", amount: 10000 });
    r = await call("/verify", {
        appId: APP_ID, paymentToken: TOKEN, razorpayOrderId: "order_FOREIGN",
        razorpayPaymentId: "pay_FOREIGN",
        razorpaySignature: hmacHex("order_FOREIGN|pay_FOREIGN", KEY_SECRET)
    });
    check("cross-app order → 400 (doc linkage)", r.status === 400);
}

console.log("\n[7] webhook: signed payment.captured (real entity shape, no receipt field) finalizes the RIGHT app");
docs.clear(); orders.clear(); payments.clear(); emails.length = 0;
seedDoc(); seedDoc(OTHER_APP);
r = await call("/create-order", { appId: APP_ID, paymentToken: TOKEN });
const wid = r.body.orderId;
const wpid = simulateCapture(wid);
const whEvent = JSON.stringify({
    event: "payment.captured",
    payload: { payment: { entity: {
        id: wpid, order_id: wid, amount: 10000, status: "captured"
        /* NOTE: no receipt — resolution must come from the API-fetched order */
    } } }
});
let rh = await rawCall("/webhook", whEvent, { "X-Razorpay-Signature": hmacHex(whEvent, WEBHOOK_SECRET) });
check("webhook 200 + correct app finalized", rh.status === 200 && docOf().status === "Submitted");
check("unrelated app untouched", docOf(OTHER_APP).status === "Pending Payment");
check("emails sent once", emails.length === 2);

console.log("\n[8] webhook: bad signature 401; signed-but-unrelated order ignored");
let rbad = await rawCall("/webhook", whEvent, { "X-Razorpay-Signature": hmacHex(whEvent, "wrong") });
check("bad webhook signature → 401", rbad.status === 401);
{
    docs.clear(); emails.length = 0;
    seedDoc();
    const stray = "order_STRAYX";
    orders.set(stray, { id: stray, status: "paid", amount_paid: 10000, currency: "INR",
        receipt: "totallyunknown", created_at: 1, last_payment_id: "pay_STRAY" });
    payments.set("pay_STRAY", { id: "pay_STRAY", order_id: stray, status: "captured", amount: 10000 });
    const ev2 = JSON.stringify({ event: "payment.captured",
        payload: { payment: { entity: { id: "pay_STRAY", order_id: stray } } } });
    const r2b = await rawCall("/webhook", ev2, { "X-Razorpay-Signature": hmacHex(ev2, WEBHOOK_SECRET) });
    check("unrelated order receipt → ignored, app stays Pending Payment",
        r2b.status === 200 && r2b.body.ignored === true && docOf().status === "Pending Payment" && emails.length === 0);
}

console.log("\n[9] /status reconciles paid-but-unreported; idempotent afterwards");
docs.clear(); orders.clear(); payments.clear(); emails.length = 0;
seedDoc();
r = await call("/create-order", { appId: APP_ID, paymentToken: TOKEN });
const oid9 = r.body.orderId;
simulateCapture(oid9);
r = await call("/status", { appId: APP_ID, paymentToken: TOKEN });
check("reconciled to finalized", r.status === 200 && r.body.finalized === true && docOf().status === "Submitted");
const emailCountAfter = emails.length;
const r3 = await call("/status", { appId: APP_ID, paymentToken: TOKEN });
check("repeat poll: no duplicate emails", r3.body.finalized === true && emails.length === emailCountAfter);
const ev3 = JSON.stringify({ event: "order.paid",
    payload: { order: { entity: { id: r.body.orderId } } } });
await rawCall("/webhook", ev3, { "X-Razorpay-Signature": hmacHex(ev3, WEBHOOK_SECRET) });
check("repeat webhook after finalize: still no duplicate emails", emails.length === emailCountAfter);

console.log("\n[10] independent email channels: only the FAILED one is retried");
docs.clear(); orders.clear(); payments.clear(); emails.length = 0;
emailFailTemplates = new Set(["template_admin"]);
seedDoc();
r = await call("/create-order", { appId: APP_ID, paymentToken: TOKEN });
const oid10 = r.body.orderId;
const pid10 = simulateCapture(oid10);
r = await call("/verify", {
    appId: APP_ID, paymentToken: TOKEN, razorpayOrderId: oid10,
    razorpayPaymentId: pid10, razorpaySignature: hmacHex(`${oid10}|${pid10}`, KEY_SECRET)
});
doc = docOf();
check("payment finalized despite admin email failure", r.status === 200 && doc.status === "Submitted");
check("student email delivered, admin failed separately",
    emails.length === 1 && emails[0].template_id === "template_applicant");
check("admin channel carries error + attempt 1; student delivered",
    doc.payment.notifyAdmin.at === null && doc.payment.notifyAdmin.attempts === 1 &&
    /EmailJS/.test(doc.payment.notifyAdmin.error) && doc.payment.notifyStudent.at);

emailFailTemplates = new Set();
r = await call("/status", { appId: APP_ID, paymentToken: TOKEN });
doc = docOf();
check("retry sends ONLY the admin email (student never re-sent)",
    emails.length === 2 && emails[1].template_id === "template_admin");
check("admin channel marked delivered", !!doc.payment.notifyAdmin.at);
const before = emails.length;
await call("/status", { appId: APP_ID, paymentToken: TOKEN });
await call("/status", { appId: APP_ID, paymentToken: TOKEN });
check("further retries are no-ops", emails.length === before);

console.log("\n[11] bounded retry: persistent failure stops at MAX attempts");
docs.clear(); orders.clear(); payments.clear(); emails.length = 0;
emailFailTemplates = new Set(["template_admin", "template_applicant"]);
seedDoc();
r = await call("/create-order", { appId: APP_ID, paymentToken: TOKEN });
simulateCapture(r.body.orderId);
await call("/status", { appId: APP_ID, paymentToken: TOKEN });   /* attempt 1 */
await call("/status", { appId: APP_ID, paymentToken: TOKEN });   /* attempt 2 */
await call("/status", { appId: APP_ID, paymentToken: TOKEN });   /* attempt 3 */
doc = docOf();
const extra = await call("/status", { appId: APP_ID, paymentToken: TOKEN }); /* would be 4th */
check("money still finalized on total email outage", doc.status === "Submitted" && doc.payment.status === "paid");
check("attempts bounded at 3 per channel",
    doc.payment.notifyAdmin.attempts === 3 && doc.payment.notifyStudent.attempts === 3 && extra.status === 200);
emailFailTemplates = new Set();

console.log("\n[12] CORS + method guards");
let opt = await worker.fetch(new Request("https://pay.test/verify", {
    method: "OPTIONS", headers: { Origin: "https://evil.example" }
}), env, { waitUntil() {} });
check("foreign origin not echoed", opt.headers.get("Access-Control-Allow-Origin") !== "https://evil.example");
let g = await call("/nope", {});
check("unknown route 404s", g.status === 404);

console.log(`\n==== payments worker tests: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
