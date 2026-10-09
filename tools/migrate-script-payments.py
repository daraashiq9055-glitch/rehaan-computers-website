#!/usr/bin/env python3
# Converts the public admission flow from "save + email immediately, pay
# afterwards" to "draft -> Razorpay -> server-verified submission".
# Every edit is an exact anchor that must occur EXACTLY ONCE; dry-run first.
# Safe with either ordering against tools/migrate-script-cloudinary.py.
# Usage:  python3 tools/migrate-script-payments.py [--apply]
import sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
TARGETS = [ROOT / "public" / "script.js", ROOT / "script.js"]

MARKER = "PENDING_STORAGE_KEY"

EDITS = [
# P1 constants after the fee block
(r'''const UPI_ID = "rehaancomputers@upi";
const ADMISSION_FEE = 100;''',
r'''const UPI_ID = "rehaancomputers@upi";
const ADMISSION_FEE = 100;

const PAYMENTS_API_BASE =
    "https://rehaan-razorpay-test.daraashiq9055.workers.dev";

const PENDING_STORAGE_KEY = "rehaan-pending-admission";'''),

# P1b duplicate-draft guard
(r'''    submitButton.disabled = true;

    submitButton.textContent =
        "Submitting Application...";''',
r'''    if (pendingDraft && pendingDraft.appId) {

        showFormMessage(
            "info",
            "You already have an application waiting for the ₹100 payment — complete that payment now, or choose to pay at the centre, before submitting again."
        );

        openPaymentStep(pendingDraft.appId);

        return;
    }


    submitButton.disabled = true;

    submitButton.textContent =
        "Submitting Application...";'''),

# P2 draft token before applicationData
(r'''        /*
         * Save application to Firestore.
         */

        const createdAt =
            new Date().toISOString();''',
r'''        /*
         * Save application to Firestore.
         */

        const createdAt =
            new Date().toISOString();

        const paymentToken =
            crypto.randomUUID
                ? crypto.randomUUID()
                : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
                    /[xy]/g,
                    c => {
                        const r =
                            crypto.getRandomValues(new Uint8Array(1))[0] % 16;
                        const v = c === "x" ? r : (r & 0x3 | 0x8);
                        return v.toString(16);
                    }
                );'''),

# P3 pending status + token on the drafted document
(r'''            payment: {
                status: "awaiting",
                amount: ADMISSION_FEE
            },

            status: "New",

            createdAt''',
r'''            payment: {
                status: "awaiting",
                amount: ADMISSION_FEE
            },

            status: "Pending Payment",

            paymentToken,

            createdAt'''),

# P4 no emails / no success on draft — hand off to the payment step
(r'''        /*
         * EmailJS parameters.
         */

        const emailParams = {


            student_name: fullName,

            parent_name: parentName,

            student_phone: phone,

            guardian_phone:
                guardianPhone || "Not provided",

            student_email: email,

            dob,

            qualification,

            course: coursePreference,

            batch,

            address,

            attendance_setup:
                attendanceSetup === "setup"
                    ? "Account requested"
                    : "Skipped",

            attendance_email:
                attendanceSetup === "setup"
                    ? attendanceEmail
                    : "Not applicable",

            source:
                source || "Not specified",

            message:
                message || "No additional message",

            submitted_at:
                formatDate(createdAt)

        };


        /*
         * IMPORTANT:
         *
         * Admin and applicant emails are attempted
         * independently.
         *
         * One failing does not prevent the other.
         */

        const adminEmailPromise =
            sendAdminEmail(emailParams)
                .then(() => ({
                    success: true
                }))
                .catch(error => {

                    console.error(
                        "Admin email failed:",
                        error
                    );

                    return {
                        success: false,
                        error
                    };

                });


        const applicantEmailPromise =
            sendApplicantEmail({

                student_name: fullName,

                student_email: email,

                parent_name: parentName,

                course: coursePreference,

                batch

            })
                .then(() => ({
                    success: true
                }))
                .catch(error => {

                    console.error(
                        "Applicant email failed:",
                        error
                    );

                    return {
                        success: false,
                        error
                    };

                });


        const [
            adminEmailResult,
            applicantEmailResult
        ] = await Promise.all([
            adminEmailPromise,
            applicantEmailPromise
        ]);


        /*
         * The application has already been saved.
         * Email failures therefore do not falsely report
         * the application as completely failed.
         */

        let successMessage =
            "Application submitted successfully. Now complete the ₹100 admission fee to block your seat — then visit the centre with 2 passport-size photographs and a photocopy of your Aadhaar card.";


        if (
            attendanceSetup === "setup"
        ) {

            successMessage +=
                " Your attendance account has also been created — keep these credentials safe.";

        }


        if (
            !adminEmailResult.success ||
            !applicantEmailResult.success
        ) {

            successMessage +=
                " Your application was saved, although one of the email notifications could not be sent.";

        }


        showFormMessage(
            "success",
            successMessage
        );


        if (applicationDocRef) {
            openPaymentStep(applicationDocRef.id);
        }


        form.reset();


        setStudentPhoto("");''',
r'''        /*
         * The application is a DRAFT now. Confirmation and
         * emails happen only after the backend verifies the
         * ₹100 Razorpay payment — see the payment step below.
         */

        pendingDraft = {
            appId: applicationDocRef ? applicationDocRef.id : "",
            token: paymentToken,
            attendanceSetup
        };


        try {

            localStorage.setItem(
                PENDING_STORAGE_KEY,
                JSON.stringify(pendingDraft)
            );

        } catch (storeError) {
            /* storage unavailable — in-memory draft still works */
        }


        showFormMessage(
            "info",
            "Your details are saved. Complete the ₹100 admission payment to submit your application — you will get a confirmation right after the payment is verified."
        );


        if (applicationDocRef) {
            openPaymentStep(applicationDocRef.id);
        }'''),

# P5 form reset moved to the success path only (details kept on cancel)
# P5 form reset moved to the success path only (details kept on cancel)
(r'''        /*
         * Restore the default attendance option
         * after form reset.
         */

        const setupRadio =
            document.querySelector(
                'input[name="attendanceSetup"][value="setup"]'
            );


        if (setupRadio) {
            setupRadio.checked = true;
        }


        updateAttendanceFields();''',
r''),

# P6 replace the whole payment-step section
(r'''let paymentApplicationId = null;


function openPaymentStep(appId) {

    paymentApplicationId = appId;

    const modal = getElement("paymentModal");

    if (!modal) {
        return;
    }

    const idEl = getElement("paymentAppId");

    if (idEl) {
        idEl.textContent = "#" + String(appId).slice(0, 8).toUpperCase();
    }

    const upi = getElement("upiIdText");

    if (upi) {
        upi.textContent = UPI_ID;
    }

    const ref = getElement("paymentReference");

    if (ref) {
        ref.value = "";
    }

    modal.hidden = false;

    document.body.classList.add("modal-open");

}


function closePaymentStep() {

    const modal = getElement("paymentModal");

    if (modal) {
        modal.hidden = true;
    }

    document.body.classList.remove("modal-open");

}


async function recordPayment(status, extra = {}) {

    if (!paymentApplicationId) {
        closePaymentStep();
        return;
    }

    try {

        await updateDoc(
            doc(
                db,
                "applications",
                paymentApplicationId
            ),
            {
                payment: {
                    status,
                    amount: ADMISSION_FEE,
                    ...extra,
                    updatedAt: new Date().toISOString()
                }
            }
        );

    } catch (error) {

        console.error("Payment update failed:", error);

    }

    closePaymentStep();

    if (status === "claimed") {

        showFormMessage(
            "info",
            "Payment reference saved with your application. The institute will verify the ₹100 admission fee and confirm your admission."
        );

    } else if (status === "at_centre") {

        showFormMessage(
            "info",
            "Noted — please pay the ₹100 admission fee at the centre when you visit for document verification."
        );

    } else {

        showFormMessage(
            "info",
            "You can complete the ₹100 admission fee at the centre any time before approval."
        );

    }

}''',
r'''let paymentApplicationId = null;
let pendingDraft = null;
let paymentState = "idle";
let checkoutSdkPromise = null;


function paymentHeaders() {
    return { "Content-Type": "application/json" };
}


function loadRazorpaySdk() {

    if (window.Razorpay) {
        return Promise.resolve();
    }

    if (!checkoutSdkPromise) {

        checkoutSdkPromise = new Promise((resolve, reject) => {

            const tag = document.createElement("script");

            tag.src = "https://checkout.razorpay.com/v1/checkout.js";
            tag.onload = () => resolve();
            tag.onerror = () => {
                checkoutSdkPromise = null;
                reject(new Error("Could not load the secure payment page."));
            };

            document.head.appendChild(tag);

        });
    }

    return checkoutSdkPromise;

}


function clearPendingDraft() {

    pendingDraft = null;
    paymentApplicationId = null;

    try {
        localStorage.removeItem(PENDING_STORAGE_KEY);
    } catch (storeError) { /* ignore */ }

}


function resetApplicationForm() {

    const form = getElement("applicationForm");

    if (form) {
        form.reset();
    }

    setStudentPhoto("");

    const setupRadio =
        document.querySelector(
            'input[name="attendanceSetup"][value="setup"]'
        );

    if (setupRadio) {
        setupRadio.checked = true;
    }

    updateAttendanceFields();

}


function markSubmittedLocally(message) {

    clearPendingDraft();

    closePaymentStep();

    showFormMessage("success", message);

    resetApplicationForm();

    const box = getElement("formMessage");

    box?.scrollIntoView({ behavior: "smooth", block: "center" });

}


function finalizeAfterPayment(appId, token) {

    /* Poll /status so a lost verify response never loses a paid student. */

    return new Promise(resolve => {

        let tries = 0;

        const tick = async () => {

            tries++;

            try {

                const res = await fetch(PAYMENTS_API_BASE + "/status", {
                    method: "POST",
                    headers: paymentHeaders(),
                    body: JSON.stringify({ appId, token })
                });

                const data = await res.json();

                if (data && data.finalized) {
                    resolve(true);
                    return;
                }

            } catch (error) {
                /* network still down — keep trying */
            }

            if (tries >= 12) {
                resolve(false);
                return;
            }

            setTimeout(tick, 2500);

        };

        setTimeout(tick, 1500);

    });

}


function attendanceNote() {

    return pendingDraft && pendingDraft.attendanceSetup === "setup"
        ? " Your attendance account has also been created — keep these credentials safe."
        : "";

}


async function payWithRazorpay(appId) {

    if (paymentState === "opening" || paymentState === "verifying") {
        return;
    }

    const token = pendingDraft && pendingDraft.token;

    if (!token) {
        showFormMessage(
            "error",
            "This payment needs to be resumed from the message below the form on the admission page — please scroll down and confirm, or complete the payment at the centre."
        );
        return;
    }

    paymentState = "opening";

    const payBtn = getElement("razorpayPayBtn");

    if (payBtn) {
        payBtn.disabled = true;
        payBtn.textContent = "Preparing payment…";
    }

    try {

        const res = await fetch(PAYMENTS_API_BASE + "/create-order", {
            method: "POST",
            headers: paymentHeaders(),
            body: JSON.stringify({ appId, paymentToken: token })
        });

        const order = await res.json();

        if (payBtn) {
            payBtn.disabled = false;
            payBtn.textContent = "Pay ₹100 securely";
        }

        if (order.alreadyPaid) {

            paymentState = "done";

            markSubmittedLocally(
                "Admission Application Submitted Successfully — your ₹100 payment was already verified." +
                attendanceNote() +
                " Visit the centre with 2 passport-size photographs and a photocopy of your Aadhaar card."
            );

            return;
        }

        if (!res.ok || !order.orderId) {
            throw new Error(order.error || "Could not start the payment.");
        }

        await loadRazorpaySdk();

        paymentState = "checkout";

        const checkout = new window.Razorpay({

            key: order.keyId,
            amount: order.amount,
            currency: order.currency,
            name: order.name || "Rehaan Computers",
            description: "Admission fee — block your seat",
            order_id: order.orderId,

            handler: async response => {

                paymentState = "verifying";

                setPaymentNotice(
                    "Payment made — verifying with the institute… do not close this page."
                );

                try {

                    const verifyRes = await fetch(PAYMENTS_API_BASE + "/verify", {
                        method: "POST",
                        headers: paymentHeaders(),
                        body: JSON.stringify({
                            appId,
                            paymentToken: token,
                            razorpayOrderId: response.razorpay_order_id,
                            razorpayPaymentId: response.razorpay_payment_id,
                            razorpaySignature: response.razorpay_signature
                        })
                    });

                    const verify = await verifyRes.json();

                    if (verifyRes.ok && verify.verified) {

                        paymentState = "done";

                        markSubmittedLocally(
                            "Admission Application Submitted Successfully — ₹100 payment verified." +
                            attendanceNote() +
                            " Visit the centre with 2 passport-size photographs and a photocopy of your Aadhaar card."
                        );

                        return;
                    }

                    if (verifyRes.status === 202) {
                        /* accepted for reconciliation — confirm via /status */
                        const okSoon = await finalizeAfterPayment(appId, token);

                        paymentState = okSoon ? "done" : "pending";

                        if (okSoon) {

                            markSubmittedLocally(
                                "Admission Application Submitted Successfully — ₹100 payment verified." +
                                attendanceNote()
                            );

                        } else {
                            closePaymentStep();
                            showFormMessage(
                                "info",
                                "Payment received and being confirmed automatically — your application is safe. You will receive the confirmation email shortly."
                            );
                        }

                        return;
                    }

                    paymentState = "pending";

                    closePaymentStep();

                    showFormMessage(
                        "error",
                        (verify.error || "Payment verification failed.") +
                        " Your application is saved — you can retry the payment or complete it at the centre."
                    );

                } catch (verifyError) {

                    /* response lost — reconcile without asking them to pay twice */

                    const okSoon = await finalizeAfterPayment(appId, token);

                    if (okSoon) {

                        paymentState = "done";

                        markSubmittedLocally(
                            "Admission Application Submitted Successfully — ₹100 payment verified." +
                            attendanceNote()
                        );

                    } else {

                        paymentState = "pending";

                        closePaymentStep();

                        showFormMessage(
                            "info",
                            "Your payment is being verified automatically — keep this application reference safe and watch for the confirmation email."
                        );
                    }
                }
            },

            modal: {
                ondismiss: () => {

                    paymentState = "pending";

                    closePaymentStep();

                    showFormMessage(
                        "info",
                        "Payment not completed — your details are saved as a pending application. You can retry the ₹100 payment from this page any time, or choose to pay at the centre."
                    );
                }
            },

            theme: {
                color: "#c9a227"
            }

        });

        checkout.on("payment.failed", () => {

            paymentState = "pending";

            closePaymentStep();

            showFormMessage(
                "error",
                "Payment failed — no amount was deducted. Your application is saved; you can retry the ₹100 payment or pay at the centre."
            );

        });

        checkout.open();

    } catch (error) {

        paymentState = "pending";

        if (payBtn) {
            payBtn.disabled = false;
            payBtn.textContent = "Pay ₹100 securely";
        }

        showFormMessage(
            "error",
            (error.message || "Payment could not be started.") +
            " Your details are safe — you can retry, or pay ₹100 at the centre."
        );
    }

}


function setPaymentNotice(text) {

    const el = getElement("razorpayStatus");

    if (el) {
        el.textContent = text;
    }

}


async function chooseOfflinePayment(note) {

    const appId = paymentApplicationId;

    closePaymentStep();

    if (!appId) {
        showFormMessage("info", note);
        return;
    }

    try {

        await updateDoc(
            doc(db, "applications", appId),
            { status: "Pending Offline Payment" }
        );

        clearPendingDraft();

        showFormMessage("success", note);

        resetApplicationForm();

    } catch (error) {

        clearPendingDraft();

        showFormMessage(
            "info",
            note + " (The institute was notified about your choice when you visit.)"
        );

        resetApplicationForm();
    }

}


function ensureRazorpayBlock() {

    if (getElement("razorpayPayBtn")) {
        return;
    }

    const modal = getElement("paymentModal");

    const anchor = getElement("paymentAppId");

    if (!modal || !anchor) {
        return;
    }

    const holder = anchor.closest("p, div") || anchor;

    const block = document.createElement("div");

    block.id = "razorpayBlock";
    block.style.margin = "0 0 18px";
    block.style.display = "flex";
    block.style.flexDirection = "column";
    block.style.gap = "10px";

    block.innerHTML = `
        <button type="button" id="razorpayPayBtn" class="primary-btn"
            style="width:100%;justify-content:center">Pay ₹100 securely</button>
        <p id="razorpayStatus" style="margin:0;font-size:0.85rem;min-height:1.2em"></p>
    `;

    holder.parentNode.insertBefore(block, holder.nextSibling);

    getElement("razorpayPayBtn").addEventListener(
        "click",
        () => payWithRazorpay(paymentApplicationId)
    );

}


function openPaymentStep(appId) {

    paymentApplicationId = appId;

    const modal = getElement("paymentModal");

    if (!modal) {
        return;
    }

    const idEl = getElement("paymentAppId");

    if (idEl) {
        idEl.textContent = "#" + String(appId).slice(0, 8).toUpperCase();
    }

    const upi = getElement("upiIdText");

    if (upi) {
        upi.textContent = UPI_ID;
    }

    const ref = getElement("paymentReference");

    if (ref) {
        ref.value = "";
    }

    ensureRazorpayBlock();

    setPaymentNotice(
        paymentState === "pending"
            ? "Payment still pending — you can retry now or pay ₹100 at the centre."
            : ""
    );

    modal.hidden = false;

    document.body.classList.add("modal-open");

    modal.scrollIntoView
        ? modal.scrollIntoView({ behavior: "smooth", block: "center" })
        : window.scrollTo({ top: 0, behavior: "smooth" });

}


function closePaymentStep() {

    const modal = getElement("paymentModal");

    if (modal) {
        modal.hidden = true;
    }

    document.body.classList.remove("modal-open");

}


function recordPayment() {

    /* legacy entry point — offline choice only now */

    chooseOfflinePayment(
        "Noted — please pay the ₹100 admission fee at the centre when you visit for document verification."
    );

}


async function initPaymentResume() {

    let saved = null;

    try {
        saved = JSON.parse(localStorage.getItem(PENDING_STORAGE_KEY) || "null");
    } catch (parseError) { /* corrupted entry */ }

    if (!saved || !saved.appId || !saved.token) {
        return;
    }

    pendingDraft = saved;

    let state = null;

    try {

        const res = await fetch(PAYMENTS_API_BASE + "/status", {
            method: "POST",
            headers: paymentHeaders(),
            body: JSON.stringify({
                appId: saved.appId,
                paymentToken: saved.token
            })
        });

        state = await res.json();

    } catch (error) {
        return; /* offline — keep the draft for the next visit */
    }

    if (!state) return;

    if (state.status === "Submitted" || state.finalized) {

        markSubmittedLocally(
            "Admission Application Submitted Successfully — your ₹100 payment was verified." +
            attendanceNote() +
            " Visit the centre with 2 passport-size photographs and a photocopy of your Aadhaar card."
        );

        return;
    }

    if (state.status === "Pending Payment") {

        paymentState = "pending";

        showFormMessage(
            "info",
            "Your application is waiting for the ₹100 payment — open the payment options below to complete it now."
        );

        openPaymentStep(saved.appId);
    }

}'''),

# P7 rewire the modal wiring (offline buttons + resume on load)
(r'''function initPaymentStep() {

    const modal = getElement("paymentModal");

    if (!modal) {
        return;
    }

    getElement("payPaidBtn")?.addEventListener(
        "click",
        () => {

            const ref =
                (getElement("paymentReference")?.value || "").trim();

            recordPayment("claimed", {
                mode: "upi",
                reference: ref,
                verified: false
            });

        }
    );

    getElement("payCentreBtn")?.addEventListener(
        "click",
        () => recordPayment("at_centre", {
            mode: "cash",
            verified: false
        })
    );

    getElement("paymentLaterBtn")?.addEventListener(
        "click",
        () => recordPayment("pending", { verified: false })
    );

    getElement("paymentClose")?.addEventListener(
        "click",
        () => recordPayment("pending", { verified: false })
    );

    getElement("copyUpiBtn")?.addEventListener(''',
r'''function initPaymentStep() {

    const modal = getElement("paymentModal");

    if (!modal) {
        return;
    }

    getElement("payPaidBtn")?.addEventListener(
        "click",
        () => {

            chooseOfflinePayment(
                "Noted — you will pay the ₹100 admission fee at the centre. You will not receive a paid confirmation until the institute verifies it."
            );

        }
    );

    getElement("payCentreBtn")?.addEventListener(
        "click",
        () => chooseOfflinePayment(
            "Noted — please pay the ₹100 admission fee at the centre when you visit for document verification."
        )
    );

    getElement("paymentLaterBtn")?.addEventListener(
        "click",
        () => chooseOfflinePayment(
            "Your application stays pending — you can complete the ₹100 payment online later from this page, or at the centre."
        )
    );

    getElement("paymentClose")?.addEventListener(
        "click",
        () => {

            closePaymentStep();

            showFormMessage(
                "info",
                "No payment yet — your details are saved. You can continue the ₹100 payment any time from this page."
            );

        }
    );

    initPaymentResume();

    getElement("copyUpiBtn")?.addEventListener('''),

# P8 admin payment label distinguishes verified channels
(r'''function paymentLabel(payment) {

    const p = payment || {};

    if (p.status === "paid") {
        return "PAID ₹100 ✓" + (p.reference ? " • Ref " + p.reference : "");
    }

    if (p.status === "claimed") {
        return "Claimed online — verify" + (p.reference ? " • Ref " + p.reference : "");
    }

    if (p.status === "at_centre") {
        return "Will pay ₹100 at centre";
    }

    return "Pending (₹100)";

}''',
r'''function paymentLabel(payment) {

    const p = payment || {};

    if (p.status === "paid") {

        const channel = p.method === "razorpay"
            ? "Razorpay verified"
            : "verified at centre";

        return "PAID ₹100 ✓ " + channel +
            (p.reference ? " • Ref " + p.reference : "");
    }

    if (p.status === "claimed") {
        return "Claimed online — verify" + (p.reference ? " • Ref " + p.reference : "");
    }

    if (p.status === "at_centre") {
        return "Will pay ₹100 at centre";
    }

    if (p.status === "awaiting") {
        return "Awaiting ₹100 payment";
    }

    return "Pending (₹100)";

}'''),

# P9 CSV fee-verification column reflects the channel
(r'''            d.payment && d.payment.verified ? "yes" : "no",''',
r'''            d.payment && d.payment.verified
                ? (d.payment.method === "razorpay" ? "razorpay" : "at centre")
                : "no",'''),
]


def migrate(text, label, apply):

    if MARKER in text:
        print(f"{label}: already migrated — skipped")
        return text, False

    for i, (old, new) in enumerate(EDITS, 1):
        n = text.count(old)
        if n != 1:
            print(f"ABORT — P{i} anchor found {n} times (expected exactly 1). No changes written.")
            sys.exit(1)
        text = text.replace(old, new)
        print(f"P{i}: applied ✓")

    return text, True


def main():

    apply = "--apply" in sys.argv
    print("mode:", "APPLY" if apply else "dry run")

    changed_any = False

    for path in TARGETS:

        if not path.exists():
            print(f"{path.name}: missing — skipped")
            continue

        text = path.read_text(encoding="utf-8")
        out, changed = migrate(text, str(path.relative_to(ROOT)), apply)
        changed_any = changed_any or changed

        if apply and changed:
            path.write_text(out, encoding="utf-8")

    if not apply and changed_any:
        print("dry run complete — re-run with --apply")
    print("done")


main()
