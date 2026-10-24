import {configureAdditions,renderMarkCards,openReceipt,receiptTools,resetAdditions,openStudentStatement,renderStatementDirectory} from "./admin-features.js?v=20261024-admin-9";
import {saveMarkCard,saveMonthlyPayment,correctReceipt} from "./admin-feature-store.js?v=20261021-admin-5";
import { photoStorageConfig } from "./photo-storage-config.js";
import { storeStudentPhoto, displayStudentPhoto, clearPhotoSession, isPrivateStudentPhoto } from "./photo-storage.js?v=20261018-login-fix-1";
let activePhotoMigration = null;

// Admin features adapted from website-updates d738bb2. The public site keeps its existing script.
import { recordTime, isSafePhoto, csvCell, fieldValue, paymentPatch, assertUnchanged, validateChanges, canonicalRecord, formatGender, compareAdmissionRecords } from "./admin-records.js";
/* =========================================================
   REHAAN COMPUTERS
   MAIN WEBSITE + FIREBASE + ADMIN
========================================================= */

import {
    initializeApp,
    getApps
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";

import {
    getAuth,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    setPersistence,
    inMemoryPersistence
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

import {
    getFirestore,
    collection,
    getDocs,
    doc,
    getDoc,

    runTransaction,
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";


/* =========================================================
   FIREBASE CONFIG
========================================================= */

const firebaseConfig = {
    apiKey: "AIzaSyBXRQvUZBPP_E3Q0SZBYTsOc6sfzAEiqpE",
    authDomain: "rehaan-computers.firebaseapp.com",
    projectId: "rehaan-computers",
    storageBucket: "rehaan-computers.firebasestorage.app",
    messagingSenderId: "292017935720",
    appId: "1:292017935720:web:d767adbf23823fbf5c72dd"
};


const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

const auth = getAuth(app);

const db = getFirestore(app);


/* =========================================================
   EMAILJS
========================================================= */

const EMAILJS_PUBLIC_KEY = "YRae0-hRcye59NaRL";
const EMAILJS_SERVICE_ID = "service_52jdh14";

const EMAILJS_ADMIN_TEMPLATE = "template_ubj4sw3";
const EMAILJS_APPLICANT_TEMPLATE = "template_ka7zy85";

const EMAILJS_APPROVAL_TEMPLATE = "template_rehaan_approval";

const ADMISSION_FEE = 100;
if (window.emailjs) emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });

const courses = [

    {
        title: "One Year Computer Diploma Course",
        img: "assets/excel-sheet.jpg",

        subtitle:
            "Basic to Advanced Computer Skills",

        duration:
            "1 Year",

        level:
            "Beginner → Advanced",

        certificate:
            "Professional Certificate",

        category:
            "Computer Diploma",

        overview:
            "A complete computer diploma designed to build strong fundamentals and practical computer skills from beginner to advanced level.",

        learn: [
            "Computer Fundamentals",
            "Windows & File Management",
            "MS Word",
            "MS Excel",
            "MS PowerPoint",
            "Internet & Email",
            "Typing Practice",
            "Tally Prime",
            "GST Basics"
        ],

        practical:
            "Students practice office documents, spreadsheets, presentations, typing, accounting tasks and everyday computer operations.",

        who:
            "Students, beginners and learners who want a complete computer foundation.",

        skills: [
            "Office Productivity",
            "Accounting Basics",
            "Typing",
            "Digital Skills",
            "Practical Computer Work"
        ]
    },


    {
        title: "Six Month Computer Certificate Course",
        img: "assets/word-doc.jpg",

        subtitle:
            "Get Certified • Boost Your Profile",

        duration:
            "6 Months",

        level:
            "Beginner → Intermediate",

        certificate:
            "Professional Certificate",

        category:
            "Computer Certificate",

        overview:
            "A practical six-month certificate course covering the most useful computer and office productivity skills.",

        learn: [
            "Computer Fundamentals",
            "MS Word",
            "MS Excel",
            "PowerPoint",
            "Internet",
            "Email",
            "Typing",
            "Office Productivity"
        ],

        practical:
            "Practice documents, spreadsheets, presentations, typing, internet tasks and everyday office work.",

        who:
            "Students and beginners who want practical computer skills with a structured learning path.",

        skills: [
            "Office Skills",
            "Typing",
            "Internet Skills",
            "Document Creation",
            "Digital Productivity"
        ]
    },


    {
        title: "Three Month Computer Certificate Course",
        img: "assets/excel-desk.jpg",

        subtitle:
            "Learn Fast • Gain Skills",

        duration:
            "3 Months",

        level:
            "Beginner",

        certificate:
            "Professional Certificate",

        category:
            "Computer Certificate",

        overview:
            "A short practical course focused on essential computer skills for beginners.",

        learn: [
            "Computer Basics",
            "MS Word",
            "MS Excel",
            "PowerPoint",
            "Internet",
            "Email",
            "Typing Practice"
        ],

        practical:
            "Practice documents, spreadsheets, presentations, typing and basic internet tasks.",

        who:
            "Beginners who want essential computer skills within a short learning period.",

        skills: [
            "Computer Basics",
            "MS Office",
            "Typing",
            "Internet",
            "Email"
        ]
    },


    {
        title: "Typing Diploma Course",
        img: "assets/typing-keys.jpg",

        subtitle:
            "Typing Speed & Accuracy",

        duration:
            "Flexible",

        level:
            "Beginner → Advanced",

        certificate:
            "Typing Diploma",

        category:
            "Typing",

        overview:
            "A focused typing course designed to improve keyboard familiarity, speed and typing accuracy through regular practice.",

        learn: [
            "English Typing",
            "Typing Accuracy",
            "Speed Development",
            "Daily Practice",
            "Keyboard Familiarity"
        ],

        practical:
            "Regular typing exercises are used to build speed, accuracy and confidence.",

        who:
            "Students, job seekers and anyone who wants to improve typing skills.",

        skills: [
            "Typing Speed",
            "Typing Accuracy",
            "Keyboard Skills",
            "Computer Confidence"
        ]
    },


    {
        title: "Tally Prime with GST — Detailed Course",
        img: "assets/tally-prime.jpg",
        subtitle: "Complete Accounting & GST Training",
        duration: "3 Months",
        level: "Beginner → Job-Ready",
        certificate: "Professional Certificate",
        category: "Accounting",
        overview:
            "Our most detailed accounting programme — from Tally Prime basics to GST invoicing, inventory, payroll and final accounts, taught module by module on live company data.",
        syllabus: [
            { module: "1. Accounting Foundations", items: [
                "Computer basics for accountants",
                "Accounting terms, ledgers & the three golden rules",
                "Tally Prime interface, menus & data-entry speed" ] },
            { module: "2. Company Setup", items: [
                "Company creation, alteration & security control",
                "Groups, ledgers & master creation",
                "Opening balances & F11 features" ] },
            { module: "3. Vouchers — All Types", items: [
                "Receipt, Payment, Contra & Journal",
                "Purchase, Sales, Debit & Credit Notes",
                "Order processing, inventory vouchers & shortcut keys" ] },
            { module: "4. Inventory Management", items: [
                "Stock groups, stock items & units",
                "Godowns, batching & manufacturing dates",
                "Purchase orders, re-order levels & stock reports" ] },
            { module: "5. GST Accounting", items: [
                "GST concepts, registration & HSN/SAC codes",
                "CGST / SGST / IGST vouchers & tax invoices",
                "Credit notes, advances & e-way bill basics",
                "GSTR-1 & GSTR-3B preparation practice" ] },
            { module: "6. Payroll & TDS", items: [
                "Employees, pays, earnings & deductions",
                "Payroll register & salary vouchers",
                "TDS basics & deduction entries" ] },
            { module: "7. Final Accounts & Reports", items: [
                "Day book, ledger, trial balance & journals",
                "Balance sheet & profit/loss analysis",
                "Cash flow, ratio analysis & interest calc",
                "Backup, restore, export to Excel & printing" ] }
        ],
        learn: [
            "Company Setup",
            "All Voucher Types",
            "Inventory & GST",
            "Payroll & TDS",
            "Final Accounts",
            "Reports, Backup & Excel Export"
        ],
        practical:
            "Students create their own company and complete billing sets, GST return practice, a full payroll month and final accounts on real business data.",
        who:
            "Students, graduates, shopkeepers and anyone aiming for an accounting or computer-operator job.",
        skills: [
            "Vouchers",
            "GST Invoicing",
            "Inventory",
            "Payroll",
            "Final Accounts",
            "GSTR-1 & 3B"
        ]
    },


    {
        title: "Crash Computer Course",
        img: "assets/tally-prime.jpg",

        subtitle:
            "Accounts • Design • Office Work",

        duration:
            "Short Term",

        level:
            "Beginner → Intermediate",

        certificate:
            "Course Certificate",

        category:
            "Crash Course",

        overview:
            "A short job-oriented computer course covering accounting, GST, design and office-related practical work.",

        learn: [
            "Tally Prime",
            "GST",
            "Photoshop",
            "InPage",
            "Office Work",
            "Practical Tasks"
        ],

        practical:
            "Students practice accounting, GST, design and office-related exercises.",

        who:
            "Learners who want practical job-oriented computer skills in a shorter period.",

        skills: [
            "Tally Prime",
            "GST Basics",
            "Graphic Design",
            "InPage",
            "Office Work"
        ]
    },


    {
        title: "Marg ERP 9 Course",
        img: "assets/marg-erp.jpg",

        subtitle:
            "Tally + Inventory + Business Solutions",

        duration:
            "Flexible",

        level:
            "Beginner → Intermediate",

        certificate:
            "Course Certificate",

        category:
            "ERP / Accounting",

        overview:
            "A practical ERP course covering accounting, inventory, billing and business management using Marg ERP 9.",

        learn: [
            "Marg ERP 9",
            "Accounting",
            "Inventory",
            "Billing",
            "Business Management",
            "Practical Work"
        ],

        practical:
            "Practice accounting, inventory, billing and business ERP operations.",

        who:
            "Students, business learners and anyone interested in accounting or inventory work.",

        skills: [
            "ERP Operations",
            "Accounting",
            "Inventory",
            "Billing",
            "Business Management"
        ]
    }

];


/* =========================================================
   HELPERS
========================================================= */

function getElement(id) {
    return document.getElementById(id);
}


function showElement(element) {
    if (element) {
        element.style.display = "";
    }
}


function hideElement(element) {
    if (element) {
        element.style.display = "none";
    }
}


function escapeHTML(value) {

    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        String(email).trim()
    );
}


function isValidPhone(phone) {
    return /^\d{10}$/.test(
        String(phone).trim()
    );
}


function formatDate(value) {

    if (!value) {
        return "—";
    }

    if (value && typeof value === "object") {

        if (typeof value.toDate === "function") {
            value = value.toDate();
        } else if (typeof value.seconds === "number") {
            value = value.seconds * 1000 + (value.nanoseconds || 0) / 1e6;
        }

    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return String(value);
    }

    return date.toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Kolkata"
    });
}


function paymentLabel(payment) {

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

}


async function approveApplication(applicationId, data, button) {

    if (!window.confirm(
        "Approve this application?\n\n" +
        "Student: " + (data.fullName || "Unnamed") + "\n\n" +
        "Only approve AFTER the student has visited the centre and completed formalities (2 photographs + Aadhaar photocopy)."
    )) {
        return;
    }

    const card = button.closest(".application-card");

    const admissionNumber =
        (
            card?.querySelector(".admission-no-input")?.value || ""
        ).trim() ||
        button.dataset.nextAdmission ||
        "";

    button.disabled = true;
    button.textContent = "Approving...";

    try {

        await updateDoc(
            doc(
                db,
                "applications",
                applicationId
            ),
            {
                status: "Approved",
                admissionNumber,
                approvedAt: new Date().toISOString()
            }
        );


        /* student approval mail (never blocks approval) */

        try {

            if (data.email) {

                const emailjs = await loadEmailService();

                await emailjs.send(
                    EMAILJS_SERVICE_ID,
                    EMAILJS_APPROVAL_TEMPLATE,
                    {
                        to_email: data.email,
                        student_name: data.fullName || "Student",
                        admission_number: admissionNumber,
                        course: data.coursePreference || "the selected course",
                        batch: data.batch || "As allotted",
                        institute: "Rehaan Computers, Charangam, Beerwah",
                        note: "Congratulations — your admission has been approved. Please report as per your batch timing."
                    }
                );

            }

        } catch (emailError) {

            console.warn(
                "Approval email not sent. Create the EmailJS approval template and set EMAILJS_APPROVAL_TEMPLATE.",
                emailError.code || "email-unavailable"
            );
            window.alert("The admission was approved and saved, but the confirmation email could not be sent. Check the configured EmailJS approval template before retrying email delivery. Do not approve the student again.");

        }


        await loadApplications();
        // Offer a user-clicked draft only after approval was saved and refreshed.
        const enrolled = adminState.apps.find(entry => entry.id === applicationId);
        if (enrolled?.data.status === "Approved") {
            openAdminDetails(applicationId);
            const confirmation = document.querySelector("#adminDetailsModal .admin-modal-msg");
            if (confirmation) {
                confirmation.hidden = false;
                confirmation.className = "admin-modal-msg ok";
                confirmation.textContent = "Admission approved and saved. Use Send Admission Confirmation on WhatsApp to open the student's message. You still need to press Send in WhatsApp.";
            }
        }

    } catch (error) {

        window.alert(
            "Could not approve this application.\n\n" +
            (error.message || "Firestore denied the update.")
        );

        button.disabled = false;
        button.textContent = "Approve";

    }

}


async function markFeePaid(applicationId, data, button) {

    if (!window.confirm("Confirm that the ₹100 admission fee was actually received for " + (data.fullName || "this student") + "?")) return;
    if (button) {
        button.disabled = true;
        button.textContent = "Saving...";
    }

    try {

        await updateDoc(
            doc(
                db,
                "applications",
                applicationId
            ),
            {
                payment: {
                    status: "paid",
                    amount: ADMISSION_FEE,
                    mode: data?.payment?.mode || "cash",
                    reference: data?.payment?.reference || "",
                    verified: true,
                    updatedAt: new Date().toISOString()
                }
            }
        );

        await loadApplications();

    } catch (error) {

        window.alert(
            "Could not mark the fee as paid.\n\n" +
            (error.message || "Firestore denied the update.")
        );

        if (button) {
            button.disabled = false;
            button.textContent = "Mark Fee Paid";
        }

    }

}


async function saveAdmissionNumber(applicationId, input) {
    const original = adminState.apps.find(a => a.id === applicationId)?.data.admissionNumber || "";
    if (input.disabled) return;
    input.disabled = true;

    try {

        await updateDoc(
            doc(
                db,
                "applications",
                applicationId
            ),
            {
                admissionNumber: input.value.trim()
            }
        );

        input.classList.add("saved");

        setTimeout(
            () => input.classList.remove("saved"),
            1500
        );

    } catch (error) {

        input.value = original;
        window.alert("Admission number not saved: " + friendlyError(error));
    } finally {
        input.disabled = false;

    }

}


/* =========================================================
   APPLICATION FORM INIT
========================================================= */

async function verifyAdmin(user) {

    if (!user) {

        return {
            authorized: false,
            reason: "No authenticated user."
        };

    }


    try {

        const adminReference =
            doc(
                db,
                "admins",
                user.uid
            );


        const adminSnapshot =
            await getDoc(adminReference);


        if (!adminSnapshot.exists()) {

            return {
                authorized: false,
                reason:
                    "No administrator record was found for this Firebase account."
            };

        }


        const adminData =
            adminSnapshot.data();


        if (
            adminData.isAdmin !== true
        ) {

            return {
                authorized: false,
                reason:
                    "This administrator record does not have isAdmin set to true."
            };

        }


        if (
            adminData.uid &&
            adminData.uid !== user.uid
        ) {

            return {
                authorized: false,
                reason:
                    "The administrator UID does not match the signed-in account."
            };

        }


        return {
            authorized: true,
            data: adminData
        };


    } catch (error) {

        console.error(
            "Admin verification error:",
            error
        );


        return {
            authorized: false,
            reason:
                "Firestore permission denied while checking administrator access."
        };

    }

}


/* =========================================================
   ADMIN MESSAGE
========================================================= */

function showAdminMessage(
    type,
    message
) {

    const box =
        getElement("adminLoginMessage");


    if (!box) {
        return;
    }


    box.className =
        `message ${type}`;


    box.textContent =
        message;


    box.style.display =
        "block";

}


/* =========================================================
   ADMIN UI
========================================================= */

function showAdminDashboard() {
    document.body.classList.add("signed-in");

    const loginCard =
        getElement("adminLoginCard");

    const dashboard =
        getElement("adminDashboard");


    if (loginCard) {
        loginCard.style.display = "none";
    }


    if (dashboard) {
        dashboard.style.display = "block";
    }

}


function showAdminLogin() {
    document.body.classList.remove("signed-in");

    const loginCard =
        getElement("adminLoginCard");

    const dashboard =
        getElement("adminDashboard");


    if (dashboard) {
        dashboard.style.display = "none";
    }


    if (loginCard) {
        loginCard.style.removeProperty("display");
    }

}


/* =========================================================
   LOAD APPLICATIONS
========================================================= */

/*
 * Admin dashboard v8 — compact rows, stats, tabs, search,
 * full-photo lightbox, details/edit modal and offline "Add Student".
 * All records live in the same Firestore "applications" collection.
 */

const adminState = {
    apps: [],
    tab: "all",
    query: "",
    course: "",
    feeFilter: "all",
    batch: ""
};



/* Admin-only monthly tuition tracking. The ₹100 admission fee is separate.
 * Billing begins one month after admission, using the same day (clamped for shorter months).
 * All day comparisons use local India calendar dates, not UTC milliseconds.
 */
const MONTHLY_TUITION_FEE = 999;
function indiaCalendarDate(date = new Date()) {
    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit"
    }).formatToParts(date);
    const part = key => Number(parts.find(item => item.type === key).value);
    return { year: part("year"), month: part("month"), day: part("day") };
}
function monthDayDate(year, month, day) {
    return new Date(Date.UTC(year, month - 1, Math.min(day, new Date(Date.UTC(year, month, 0)).getUTCDate())));
}
function tuitionPeriod(data, today = indiaCalendarDate()) {
    if (!adminIsEnrolled(data) || !data.admissionNumber || data.enrolmentStatus === "Cancelled") return null;
    const joined = data.admissionDate || data.approvedAt;
    if (!joined || !/^\d{4}-\d{2}-\d{2}/.test(joined)) return null;
    const [year, month, day] = joined.slice(0, 10).split("-").map(Number);
    if (!year || !month || !day || month > 12 || day > 31) return null;
    const now = new Date(Date.UTC(today.year, today.month - 1, today.day));
    // The first monthly tuition installment is due one month after admission.
    let due = monthDayDate(year, month + 1, day);
    while (due < now) {
        due = monthDayDate(due.getUTCFullYear(), due.getUTCMonth() + 2, day);
    }
    const key = due.toISOString().slice(0, 10);
    const diff = Math.round((due.getTime() - now.getTime()) / 86400000);
    const paid = Number((data.monthlyFees || {})[key] || 0);
    return { key, due, diff, paid, remaining: Math.max(0, MONTHLY_TUITION_FEE - paid),
        sent: Boolean((data.feeReminders || {})[key]) };
}
function overdueMonthlyTuition(data, today = indiaCalendarDate()) {
    if (!adminIsEnrolled(data) || !data.admissionNumber || data.enrolmentStatus === "Cancelled") return null;
    const joined = data.admissionDate || data.approvedAt;
    if (!joined || !/^\d{4}-\d{2}-\d{2}/.test(joined)) return null;
    const [year, month, day] = joined.slice(0, 10).split("-").map(Number);
    if (!year || month < 1 || month > 12 || day < 1 || day > 31) return null;
    const now = new Date(Date.UTC(today.year, today.month - 1, today.day));
    let due = monthDayDate(year, month + 1, day);
    let oldest = null;
    for (let i = 0; i < 240 && due < now; i++) {
        const key = due.toISOString().slice(0, 10);
        const received = Number((data.monthlyFees || {})[key] || 0);
        const balance = Math.max(0, MONTHLY_TUITION_FEE - received);
        const daysLate = Math.round((now.getTime() - due.getTime()) / 86400000);
        if (balance > 0 && !oldest) oldest = { key, balance, daysLate, review: daysLate > 5 };
        due = monthDayDate(due.getUTCFullYear(), due.getUTCMonth() + 2, day);
    }
    return oldest;
}
function tuitionWhatsAppMessage(data, bill) {
    // Stored keys are due dates after a month of learning. Label the month
    // being paid for, without moving or rewriting the existing ledger key.
    const [dueYear, dueMonth] = bill.key.split("-").map(Number);
    const period = new Intl.DateTimeFormat("en-IN", {
        timeZone: "Asia/Kolkata", month: "long", year: "numeric"
    }).format(new Date(Date.UTC(dueYear, dueMonth - 2, 1)));
    const amount = new Intl.NumberFormat("en-IN", {
        minimumFractionDigits: Number.isInteger(bill.remaining) ? 0 : 2,
        maximumFractionDigits: 2
    }).format(bill.remaining);
    return [
        "*REHAAN COMPUTERS*",
        "Charangam, Beerwah",
        "",
        bill.diff < 0 ? "*OVERDUE MONTHLY FEE REMINDER*" : "*MONTHLY FEE REMINDER*",
        "",
        "Dear " + (data.fullName || "Student") + ",",
        "",
        "Greetings from Rehaan Computers.",
        bill.diff < 0 ? "Your previous billing period still has an unpaid balance. Please clear this period first." : "This is a gentle reminder regarding your pending monthly course fee.",
        "",
        "*Student Name:* " + (data.fullName || "Student"),
        "*Admission No.:* " + (data.admissionNumber || "—"),
        "*Fee Month:* *" + period + "*",
        "*Due Date:* " + bill.key.split("-").reverse().join("-"),
        "",
        bill.diff < 0 ? "Kindly clear the remaining fee for the overdue period shown above." : "Kindly clear your outstanding fee on or before the due date.",
        "",
        "━━━━━━━━━━━━━━━━━━",
        "*AMOUNT TO PAY*",
        "*₹" + amount + "*",
        "━━━━━━━━━━━━━━━━━━",
        "",
        "If you have already paid, kindly disregard this reminder and share your payment confirmation for verification.",
        "",
        "Thank you for your cooperation.",
        "",
        "*Accounts Department*",
        "*Rehaan Computers*"
    ].join("\n");
}
function actionableFeeReminder(data, now = new Date()) {
    const today = indiaCalendarDate(now);
    const upcoming = tuitionPeriod(data, today);
    const overdue = overdueMonthlyTuition(data, today);
    if (overdue) {
        const sent = Boolean((data.feeReminders || {})[overdue.key]);
        if (overdue.balance > 0) return {
            key: overdue.key, remaining: overdue.balance, diff: -overdue.daysLate, sent
        };
    }
    return upcoming && upcoming.diff >= 0 && upcoming.remaining > 0 ? upcoming : null;
}
async function openTuitionReminder(id, data, bill) {
    requireAdmin();
    // Use the latest loaded balance and oldest unpaid period at the click.
    // A sent reminder never skips an unpaid month or marks it paid.
    const latest = adminState.apps.find(entry => entry.id === id);
    if (!latest || !bill) return;
    data = latest.data;
    const current = actionableFeeReminder(data);
    if (!current || current.key !== bill.key) return;
    bill = current;
    const reminderUid = verifiedAdminUid;
    const digits = String(data.phone || "").replace(/\D/g, "");
    if (!/^[6-9]\d{9}$/.test(digits)) {
        window.alert("Student phone must contain 10 digits.");
        return;
    }
    const url = "https://wa.me/91" + digits + "?text=" +
        encodeURIComponent(tuitionWhatsAppMessage(data, bill));
    // User gesture opens WhatsApp; this does NOT prove a message was sent.
    const opened = window.open(url, "_blank");
    if (opened) opened.opener = null;
    if (!opened) {
        window.alert("Pop-up blocked. Please allow WhatsApp pop-ups for this site.");
        return;
    }
    if (window.confirm("WhatsApp opened. Only click OK after you have actually pressed Send in WhatsApp. Record this reminder for the displayed fee period? You can remind again while it is unpaid.")) {
        try {
            requireAdmin();
            if (verifiedAdminUid !== reminderUid) throw new Error("Your session changed. Sign in again before recording reminders.");
            await updateDoc(doc(db, "applications", id), {
                ["feeReminders." + bill.key]: new Date().toISOString()
            });
            await loadApplications();
        } catch (error) {
            window.alert("Reminder status was not saved: " + (error.message || error));
        }
    }
}

async function recordMonthlyTuition(id, data) {
    const upcoming = tuitionPeriod(data);
    const overdue = overdueMonthlyTuition(data);
    const bill = overdue ? { key: overdue.key, paid: MONTHLY_TUITION_FEE - overdue.balance } : upcoming;
    if (!bill) { window.alert("Set a valid admission date before recording monthly fees."); return; }
    const receiptId = crypto.randomUUID().replaceAll("-", "");
    const paymentUid = verifiedAdminUid;
    const existing = Math.max(0, Number(bill.paid) || 0);
    const remaining = Math.max(0, MONTHLY_TUITION_FEE - existing);
    const modal = adminCreateModal("rcTuitionModal", `
      <div class="admin-modal-card rc-payment-modal">
        <button type="button" class="admin-modal-close" aria-label="Close">×</button>
        <p class="rc-pay-eyebrow">REHAAN COMPUTERS · FEE MANAGEMENT</p>
        <h3>Record Monthly Payment</h3>
        <p class="rc-pay-subtitle">${escapeHTML(data.fullName || "Student")} · ADM ${escapeHTML(String(data.admissionNumber || ""))} · Due ${escapeHTML(bill.key)}</p>
        <div class="rc-pay-stats">
          <div><span>Monthly fee</span><strong>₹${MONTHLY_TUITION_FEE}</strong></div>
          <div><span>Already received</span><strong>₹${existing}</strong></div>
          <div><span>Outstanding</span><strong class="rc-pay-due">₹${remaining}</strong></div>
        </div>
        <form id="rcPaymentForm" class="rc-payment-form">
          <label>New payment amount (₹)
            <input id="rcPaymentAmount" type="number" min="0.01" max="${remaining}" step="0.01" value="${remaining}" required>
          </label>
          <p class="rc-pay-preview">After payment: <strong id="rcPaymentBalance">₹0 remaining</strong></p>
          <button class="admin-save-btn" type="submit" ${remaining === 0 ? "disabled" : ""}>Confirm & Record Payment</button>
          <p class="admin-modal-msg" id="rcPaymentMessage" hidden></p>
        </form>
        <p class="rc-pay-help">This amount will be ADDED to payments already received, not replace them. ₹100 admission fee is separate.</p>
      </div>`);
    const form = modal.querySelector("#rcPaymentForm");
    const amount = modal.querySelector("#rcPaymentAmount");
    const balance = modal.querySelector("#rcPaymentBalance");
    const status = modal.querySelector("#rcPaymentMessage");
    const submit = form.querySelector('button[type="submit"]');
    amount.addEventListener("input", () => {
        const added = Number(amount.value) || 0;
        balance.textContent = "₹" + Math.max(0, remaining - added).toFixed(2) + " remaining";
    });
    form.addEventListener("submit", async event => {
        event.preventDefault();
        if (form.dataset.saved === "true" || form.dataset.pending === "true") return;
        const added = Number(amount.value);
        if (!Number.isFinite(added) || added <= 0 || added > remaining || !/^\d+(?:\.\d{1,2})?$/.test(amount.value)) {
            status.hidden = false; status.className = "admin-modal-msg err";
            status.textContent = "Enter a valid new payment between ₹0.01 and ₹" + remaining + ".";
            return;
        }
        if (!window.confirm("Record an additional ₹" + added + " for " + (data.fullName || "student") + "?")) return;
        form.dataset.pending = "true";
        submit.disabled = true;
        let receipt;
        try {
            receipt = await saveMonthlyPayment({db,ref:doc(db,"applications",id),counterRef:doc(db,"receiptCounters","tuition"),runTransaction,
                assertSession:()=>{requireAdmin();if(verifiedAdminUid!==paymentUid)throw new Error("Your session changed. Sign in and refresh before recording payment.");},
                actor:paymentUid,id,due:bill.key,amount:added,expectedPaid:existing,
                expectedAdmission:data.admissionNumber,expectedJoined:data.admissionDate||data.approvedAt||"",receiptId});
        } catch (error) {
            status.hidden = false; status.className = "admin-modal-msg err";
            status.textContent = "Payment not saved: " + (error.message || error);
            form.dataset.pending = "false"; submit.disabled = false;
            return;
        }
        // UI/refresh issues after a confirmed commit must never invite a repeat payment.
        form.dataset.saved = "true";
        if (verifiedAdminUid !== paymentUid || !modal.isConnected) return;
        status.hidden = false; status.className = "admin-modal-msg ok";
        status.textContent = "Payment saved. Total received ₹" + (receipt.receivedAtIssue/100) + ", remaining ₹" + (receipt.balanceAtIssue/100) + ".";
        const receiptButton = document.createElement("button");
        receiptButton.type="button";receiptButton.id="rcOpenSavedReceipt";receiptButton.className="admin-save-btn";
        receiptButton.textContent="Print / WhatsApp receipt";
        receiptButton.onclick=()=>{closeAdminModal(modal);openReceipt(receipt);};
        form.appendChild(receiptButton);
        await loadApplications();
    });
}

const ADMIN_QUALIFICATIONS = [
    "5th", "6th", "7th", "8th", "9th", "10th",
    "11th", "12th", "Diploma", "ITI",
    "Undergraduate", "Graduate", "Post Graduate", "Other"
];


function adminIsEnrolled(data) {
    return (data.status || "") === "Approved";
}


function nextAdmissionNumber() {

    let maxAdmission = 0;

    adminState.apps.forEach(entry => {

        const match = String(
            entry.data.admissionNumber || ""
        ).match(/(\d+)/);

        if (match) {
            const n = Number(match[1]);
            if (Number.isSafeInteger(n) && n < 999999999) maxAdmission = Math.max(maxAdmission, n);
        }

    });

    return String(maxAdmission + 1).padStart(3, "0");

}


async function loadApplications() {

    const list = getElement("applicationsList");

    if (!list) {
        return;
    }

    if (!verifiedAdminUid) return;
    const sequence = ++loadSequence;
    const requestUid = verifiedAdminUid;
    recordsLoaded = false;
    adminEnsureToolbar();
    updateWorkspace();

    list.innerHTML = `
        <div class="admin-loading">
            Loading applications...
        </div>
    `;

    try {

        const applicationsQuery = collection(db, "applications");

        const snapshot = await getDocs(applicationsQuery);
        if (!requestUid || verifiedAdminUid !== requestUid || sequence !== loadSequence) return;

        adminState.apps = [];

        snapshot.forEach(entry => {
            adminState.apps.push({
                id: entry.id,
                data: entry.data() || {}
            });
        });

        adminState.apps.sort(compareAdmissionRecords);
        recordsLoaded = true;
        renderAdminList();

    } catch (error) {

        if (verifiedAdminUid !== requestUid || sequence !== loadSequence) return;
        console.error("Loading applications error:", error.code || "load-failed");
        recordsLoaded = false;
        adminState.apps = [];
        updateWorkspace();

        list.innerHTML = `
            <div class="admin-error">
                <h3>Could Not Load Applications</h3>
                <p>${escapeHTML(friendlyError(error))}</p>
            </div>
        `;

    }

}


function adminEnsureToolbar() {

    if (document.getElementById("adminToolbar")) {
        return;
    }

    const title = document.querySelector(".applications-title");

    if (!title || !title.parentNode) {
        return;
    }

    const bar = document.createElement("div");

    bar.id = "adminToolbar";

    bar.innerHTML = `
        <div class="admin-stats" id="adminStats"></div>
        <div class="admin-toolbar">
            <div class="admin-tabs" role="tablist">
                <button type="button" class="admin-tab" data-tab="new">${workspaceIcon("admissions")}<span>New Applications</span></button>
                <button type="button" class="admin-tab" data-tab="enrolled">${workspaceIcon("students")}<span>Enrolled Students</span></button>
                <button type="button" class="admin-tab" data-tab="fees">${workspaceIcon("fees")}<span>Fee Management</span></button>
                <button type="button" class="admin-tab is-active" data-tab="all">${workspaceIcon("reports")}<span>All Records</span></button>
            </div>
            <div class="admin-tools">
                <input id="adminSearch" class="admin-search" type="search" placeholder="Search name, phone, email or admission no…" autocomplete="off">
                <select id="adminCourseFilter" class="admin-select"><option value="">All courses</option></select>
                <select id="adminBatchFilter" class="admin-select" aria-label="Filter by batch"><option value="">All batches</option></select>
                <button type="button" id="adminCsvBtn" class="admin-action-button">Export CSV</button>
                <button type="button" id="adminAddBtn" class="admin-add-student-btn">+ Add Student (Offline)</button>
            </div>
        </div>
    `;

    title.parentNode.insertBefore(bar, title.nextSibling);

    bar.querySelectorAll(".admin-tab").forEach(tab => {
        tab.id = "registerTab-" + tab.dataset.tab;
        tab.setAttribute("role", "tab");
        tab.setAttribute("aria-controls", "applicationsList");
        tab.addEventListener("click", () => openRegisterTab(tab.dataset.tab));
        tab.addEventListener("keydown", event => {
            const tabs = [...bar.querySelectorAll(".admin-tab")];
            const current = tabs.indexOf(tab);
            const target = event.key === "ArrowRight" ? (current + 1) % tabs.length : event.key === "ArrowLeft" ? (current - 1 + tabs.length) % tabs.length : event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : -1;
            if (target < 0) return;
            event.preventDefault();
            openRegisterTab(tabs[target].dataset.tab);
            tabs[target].focus();
        });
    });

    bar.querySelector("#adminSearch").addEventListener("input", event => {
        adminState.query = event.target.value.trim().toLowerCase();
        renderAdminList();
    });

    bar.querySelector("#adminCourseFilter").addEventListener("change", event => {
        adminState.course = event.target.value;
        renderAdminList();
    });

    bar.querySelector("#adminBatchFilter").addEventListener("change", event => { adminState.batch = event.target.value; renderAdminList(); });

    bar.querySelector("#adminCsvBtn").addEventListener("click", exportAdminCsv);
    bar.querySelector("#adminAddBtn").addEventListener("click", openAddStudentModal);

}


function adminFilteredApps() {

    let arr = adminState.apps.slice();

    if (adminState.tab === "new") {
        arr = arr.filter(a => !adminIsEnrolled(a.data) && a.data.status !== "Cancelled");
    } else if (adminState.tab === "enrolled" || adminState.tab === "fees") {
        arr = arr.filter(a => adminIsEnrolled(a.data) && (adminState.tab !== "fees" || Boolean(a.data.admissionNumber)));
    }

    if (adminState.batch) arr = arr.filter(a => a.data.batch === adminState.batch);

    if (adminState.course) {
        arr = arr.filter(a => String(a.data.coursePreference || a.data.course || "") === adminState.course);
    }

    if (adminState.query) {
        arr = arr.filter(a => (
            [
                a.data.fullName,
                a.data.parentName,
                a.data.phone,
                a.data.email,
                a.data.admissionNumber, a.data.rollNumber, a.data.guardianPhone, a.data.address
            ].some(v => String(v || "").toLowerCase().includes(adminState.query))
        ));
    }

    return arr;

}



/* Premium admin-only monthly fee dashboard. This is a view of existing
   Firestore applications, not a new publicly readable collection. */
function renderFeeManagement(list, entries) {
    const money = n => "₹" + Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 });
    const report = entries.map(entry => {
        const current = tuitionPeriod(entry.data);
        const overdue = overdueMonthlyTuition(entry.data);
        // The old ledger is kept separate from the one-time ₹100 admission payment.
        const dueKey = overdue ? overdue.key : current?.key;
        const fees = entry.data.monthlyFees || {};
        const paid = dueKey ? Number(fees[dueKey] || 0) : 0;
        const outstanding = Math.max(0, MONTHLY_TUITION_FEE - paid);
        return { ...entry, current, overdue, dueKey, paid, outstanding,
            reminder: actionableFeeReminder(entry.data),
            eligibleReminder: Boolean(actionableFeeReminder(entry.data)) };
    });
    const active = report.filter(x => x.current);
    const received = active.reduce((sum, x) => sum + x.paid, 0);
    const balance = active.reduce((sum, x) => sum + x.outstanding, 0);
    const reminders = active.filter(x => x.eligibleReminder).length;
    const overdue = active.filter(x => x.overdue).length;
    const filtered = report.filter(x => adminState.feeFilter === "all" ||
        (adminState.feeFilter === "reminders" && x.eligibleReminder) ||
        (adminState.feeFilter === "overdue" && Boolean(x.overdue)) ||
        (adminState.feeFilter === "paid" && x.dueKey && x.outstanding === 0) ||
        (adminState.feeFilter === "partial" && x.paid > 0 && x.outstanding > 0) ||
        (adminState.feeFilter === "unpaid" && x.dueKey && x.paid === 0));
    list.innerHTML = `
      <section class="rc-fees">
        <div class="rc-fees-top">
          <div><p class="rc-eyebrow">REHAAN COMPUTERS · ADMIN ONLY</p>
          <h2>Fee Management</h2><p>₹999 monthly tuition · due on admission anniversary · reminders available anytime</p></div>
          <span class="rc-fees-tag">Manual WhatsApp reminders</span>
        </div>
        <div class="rc-fees-kpis">
          <div><small>Students with billing date</small><strong>${active.length}</strong></div>
          <div><small>Received for displayed dues</small><strong>${money(received)}</strong></div>
          <div><small>Outstanding for displayed dues</small><strong>${money(balance)}</strong></div>
          <div><small>Reminders ready / overdue</small><strong>${reminders} / ${overdue}</strong></div>
        </div>
        <div class="rc-fees-heading"><strong>Student Fee Register</strong><label>Filter <select id="rcFeeFilter" aria-label="Filter monthly fees"><option value="all">All</option><option value="paid">Paid</option><option value="partial">Partially paid</option><option value="unpaid">Unpaid</option><option value="reminders">Reminders due</option><option value="overdue">Overdue</option></select></label></div>
        <div class="rc-fees-rows">
          ${filtered.length ? filtered.map(x => `
            <div class="rc-fee-row">
              <div class="rc-fee-identity">
                <b>${escapeHTML(x.data.fullName || "Unnamed Student")}</b>
                <small>ADM ${escapeHTML(String(x.data.admissionNumber || ""))} · ${escapeHTML(x.data.coursePreference || "Course not set")}</small>
                ${x.eligibleReminder ? `<button type="button" class="rc-fee-phone" data-fee-wa="${escapeHTML(x.id)}" title="Open WhatsApp with saved phone">📱 ${escapeHTML(x.data.phone || "")} · WhatsApp</button>` : `<small>${escapeHTML(x.data.phone || "")}</small>`}
              </div>
              <div class="rc-fee-amount">
                <b>${x.dueKey ? money(x.outstanding) : "Date needed"}</b>
                <small>${x.dueKey ? "Due " + x.dueKey : "Set admission date"} · ${x.dueKey && x.outstanding === 0 ? "Paid" : x.overdue ? (x.overdue.review ? "Cancellation review" : "Overdue") : x.paid > 0 ? "Partial" : "Upcoming"}</small><small>History: ${escapeHTML(Object.entries(x.data.monthlyFees || {}).sort(([a],[b]) => b.localeCompare(a)).slice(0, 3).map(([d,amt]) => d + " ₹" + amt).join(" · ") || "No payments recorded")}</small>
              </div>
              <div class="rc-fee-actions">
                ${x.current ? `<button type="button" data-fee-pay="${escapeHTML(x.id)}">Record Payment</button>` : ""}
                <button type="button" data-new="statement" data-student="${escapeHTML(x.id)}">Fee statement</button>
                ${x.eligibleReminder ? `<button type="button" class="rc-reminder" data-fee-wa="${escapeHTML(x.id)}" title="Open personalized WhatsApp message">🔔 ${x.reminder?.sent ? "Remind again" : "Send reminder"}</button>` : ""}
              </div>
            </div>`).join("") : '<p class="rc-fees-empty">No enrolled students match the current search and filters.</p>'}
        </div>
        <p class="rc-fees-footnote">Monthly fee is ₹999. Recorded payments reduce the outstanding balance; for example, ₹500 paid leaves ₹499 due. The 🔔 WhatsApp reminder is always available for an unpaid billing period. Previous unpaid months come first, including partial payments. Sending a reminder does not mark a month paid; you can remind again until its balance is cleared. Due dates and recorded payments are unchanged.</p>
      </section>`;
    const feeFilter = list.querySelector("#rcFeeFilter");
    feeFilter.value = adminState.feeFilter;
    feeFilter.addEventListener("change", event => { adminState.feeFilter = event.target.value; renderAdminList(); });
    list.querySelectorAll("[data-fee-pay]").forEach(button => button.addEventListener("click", () => {
        const entry = report.find(x => x.id === button.dataset.feePay);
        if (entry) recordMonthlyTuition(entry.id, entry.data);
    }));
    list.querySelectorAll("[data-fee-wa]").forEach(button => button.addEventListener("click", () => {
        const entry = report.find(x => x.id === button.dataset.feeWa);
        if (entry && entry.reminder) openTuitionReminder(entry.id, entry.data, entry.reminder);
    }));
}

function renderAdminList() {
    updateWorkspace();

    const list = getElement("applicationsList");

    if (!list) {
        return;
    }

    const total = adminState.apps.length;
    const enrolled = adminState.apps.filter(a => adminIsEnrolled(a.data)).length;
    const admissionFees = adminState.apps.filter(a => a.data.payment?.status === "paid").reduce((sum,a) => sum + (Number.isFinite(Number(a.data.payment.amount)) ? Number(a.data.payment.amount) : ADMISSION_FEE), 0);

    const stats = document.getElementById("adminStats");

    if (stats) {

        stats.innerHTML = [
            [total, "Total Records"],
            [total - enrolled, "Awaiting Approval"],
            [enrolled, "Enrolled Students"],
            ["₹" + (admissionFees), "Admission Fees Collected"]
        ].map(pair => `<div class="admin-stat"><strong>${pair[0]}</strong><span>${pair[1]}</span></div>`).join("");

    }

    const filterSel = document.getElementById("adminCourseFilter");

    if (filterSel) {

        const names = [...new Set(
            adminState.apps
                .map(a => a.data.coursePreference || a.data.course)
                .filter(Boolean)
        )];

        filterSel.innerHTML = '<option value="">All courses</option>' +
            names.map(n => `<option ${n === adminState.course ? "selected" : ""}>${escapeHTML(n)}</option>`).join("");

    }

    const batchSelect = getElement("adminBatchFilter");
    if (batchSelect) batchSelect.innerHTML = '<option value="">All batches</option>' + [...new Set(adminState.apps.map(a => a.data.batch).filter(Boolean))].map(name => `<option ${name === adminState.batch ? "selected" : ""}>${escapeHTML(name)}</option>`).join("");

    if (adminState.tab === "fees") {
        renderFeeManagement(list, adminFilteredApps());
        receiptTools(list,adminState.apps);
        return;
    }
    const rows = adminFilteredApps();

    if (!rows.length) {

        const filtered = Boolean(adminState.query || adminState.course || adminState.tab !== "all");

        list.innerHTML = `
            <div class="no-applications">
                <h3>${filtered ? "Nothing matches this view" : "No Applications Yet"}</h3>
                <p>${adminState.apps.length
                    ? "Try another tab, search or course filter."
                    : "New admission applications will appear here. Use “Add Student” to enrol walk-ins from the institute."}</p>
            </div>
        `;

        return;

    }

    list.innerHTML = "";

    const nextAdm = nextAdmissionNumber();

    rows.forEach((entry, index) => {

        const id = entry.id;
        const data = entry.data;

        const approved = adminIsEnrolled(data);
        const paid = Boolean(data.payment && data.payment.status === "paid");
        const tuition = tuitionPeriod(data);
        const overdueTuition = overdueMonthlyTuition(data);
        const actionableReminder = actionableFeeReminder(data);

        const card = document.createElement("article");

        card.className =
            "application-card application-row" + (approved ? " is-enrolled" : "");

        card.dataset.applicationId = id;

        const photoCell = isSafePhoto(data.photo)
            ? `<button type="button" class="row-photo zoomable" data-photo-zoom aria-label="View full photo of ${escapeHTML(data.fullName || "applicant")}"><img ${isPrivateStudentPhoto(data.photo) ? "" : `src="${escapeHTML(data.photo)}"`} alt="Applicant photo"></button>`
            : studentAvatarPlaceholder(data);

        card.innerHTML = `
            ${photoCell}
            <div class="row-body">
                <div class="row-line1">
                    <span class="application-number">${String(index + 1).padStart(2, "0")} · ${approved ? "ENROLLED" : "APPLICATION"}</span>
                    <h3>${escapeHTML(data.fullName || "Unnamed Applicant")}</h3>
                    <span class="application-status ${approved ? "status-approved" : ""}">${escapeHTML(data.status || "New")}</span>
                    ${data.admissionNumber
                        ? `<span class="adm-chip">ADM ${escapeHTML(String(data.admissionNumber))}</span>`
                        : '<span class="adm-chip adm-chip-none">No admission no.</span>'}
                    ${data.channel === "offline" ? '<span class="src-chip">OFFLINE</span>' : ""}
                </div>
                <div class="row-meta">
                    <span>${escapeHTML(data.coursePreference || data.course || "—")}</span>
                    <span>· ${escapeHTML(data.batch || "—")}</span>
                    ${actionableReminder ? `<button type="button" class="rc-phone-reminder" data-act="phone-reminder" title="Open WhatsApp reminder for unpaid fee">📱 ${escapeHTML(data.phone || "—")}</button>` : `<span class="row-phone">${escapeHTML(data.phone || "—")}</span>`}
                    <span class="fee-chip ${paid ? "fee-ok" : "fee-pending"}">₹${ADMISSION_FEE}: ${escapeHTML(paymentLabel(data.payment))}</span>
                    ${tuition ? `<span class="fee-chip ${tuition.remaining === 0 ? "fee-ok" : "fee-pending"}">Monthly ₹${MONTHLY_TUITION_FEE}: ${tuition.remaining === 0 ? "Paid" : "₹" + tuition.remaining + " due " + tuition.key}</span>` : ""}
                    ${overdueTuition ? `<span class="fee-chip fee-pending">${overdueTuition.review ? "⚠ Cancellation review: " : "Overdue: "}₹${overdueTuition.balance} from ${overdueTuition.key} (${overdueTuition.daysLate} days). Admin decision required.</span>` : ""}
                </div>
            </div>
            <div class="row-actions">
                <div class="admission-entry"><span>Adm No</span><input class="admission-no-input" type="text" maxlength="10" placeholder="${nextAdm}" value="${escapeHTML(data.admissionNumber || "")}" data-application-id="${escapeHTML(id)}"></div>
                <button type="button" class="mark-paid-btn" data-act="fee" ${paid ? "disabled" : ""}>${paid ? "✓ Fee Paid" : "Mark Fee Paid"}</button>
                <button type="button" class="approve-application-btn" data-act="approve" data-next-admission="${nextAdm}" ${approved ? "disabled" : ""}>${approved ? "✓ Approved" : "Approve"}</button>
                ${tuition ? `<button type="button" class="admin-ghost-btn rc-monthly-action" data-act="monthly-fee" title="Record or update this student’s monthly fee payment">💳 Manage Fee</button>` : ""}
                ${actionableReminder
                  ? `<button type="button" class="admin-ghost-btn rc-reminder-action" data-act="monthly-reminder" title="Open WhatsApp reminder for this student's unpaid monthly fee" aria-label="WhatsApp fee reminder for ${escapeHTML(data.fullName || "student")}">🔔 WhatsApp</button>` : ""}
                <button type="button" class="admin-ghost-btn" data-act="details">Details</button>
                <button type="button" class="delete-application-btn" data-application-id="${escapeHTML(id)}">Delete</button>
            </div>
        `;

        card.querySelector("[data-photo-zoom]")?.addEventListener(
            "click",
            () => openAdminPhotoViewer(data.fullName, data.photo, data.admissionNumber)
        );

        card.querySelector('[data-act="approve"]')?.addEventListener(
            "click",
            event => {
                if (!approved) {
                    approveApplication(id, data, event.currentTarget);
                }
            }
        );

        card.querySelector('[data-act="fee"]')?.addEventListener(
            "click",
            event => {
                if (!paid) {
                    markFeePaid(id, data, event.currentTarget);
                }
            }
        );

        card.querySelector('[data-act="phone-reminder"]')?.addEventListener("click", () => openTuitionReminder(id, data, actionableReminder));
        card.querySelector('[data-act="monthly-fee"]')?.addEventListener(
            "click", () => recordMonthlyTuition(id, data)
        );
        card.querySelector('[data-act="monthly-reminder"]')?.addEventListener(
            "click", () => openTuitionReminder(id, data, actionableReminder)
        );
        card.querySelector('[data-act="details"]')?.addEventListener(
            "click",
            () => openAdminDetails(id)
        );

        card.querySelector(".admission-no-input")?.addEventListener(
            "change",
            event => saveAdmissionNumber(id, event.currentTarget)
        );

        card.querySelector(".delete-application-btn")?.addEventListener(
            "click",
            event => deleteApplication(id, event.currentTarget)
        );

        list.appendChild(card);
        if (isSafePhoto(data.photo)) displayAdminPhoto(card.querySelector("[data-photo-zoom] img"), data.photo, adminPhotoToken);

    });

}


/* =========================================================
   ADMIN: FULL PHOTO VIEWER (click any student photo)
========================================================= */

function openAdminPhotoViewer(name, photoUrl, admissionNumber) {

    if (!isSafePhoto(photoUrl)) {
        return;
    }

    let box = document.getElementById("adminPhotoViewer");

    if (!box) {

        box = document.createElement("div");
        box.id = "adminPhotoViewer";
        box.className = "admin-lightbox";
        box.hidden = true;
        box.innerHTML = `
            <div class="admin-lightbox-inner">
                <button type="button" class="admin-lightbox-close" aria-label="Close">×</button>
                <img alt="Applicant full photo">
                <p></p>
            </div>
        `;
        document.body.appendChild(box);

        box.addEventListener("click", event => {
            if (event.target === box || event.target.classList.contains("admin-lightbox-close")) {
                box.hidden = true;
            }
        });

        document.addEventListener("keydown", event => {
            if (event.key === "Escape") {
                box.hidden = true;
            }
        });

    }

    displayAdminPhoto(box.querySelector("img"), photoUrl);
    box.querySelector("p").textContent =
        (name || "Applicant") +
        (admissionNumber ? "  ·  Admission No " + admissionNumber : "");
    box.hidden = false;

}


/* =========================================================
   ADMIN: DETAILS + EDIT MODAL
========================================================= */

function openAdminDetails(applicationId) {

    const entry = adminState.apps.find(a => a.id === applicationId);

    if (!entry) {
        return;
    }

    const data = entry.data;

    const modal = adminCreateModal("adminDetailsModal", `
        <div class="admin-modal-card">
            <button type="button" class="admin-modal-close" aria-label="Close">×</button>
            <span class="admin-modal-kicker">STUDENT DETAILS</span>
            <button type="button" class="admin-ghost-btn admin-toggle-edit" aria-label="Edit student details" title="Edit student details" style="position:absolute;top:20px;right:65px;font-size:20px" >✎</button>
            <div class="admin-details-top">
                ${isSafePhoto(data.photo)
                    ? `<button type="button" class="row-photo zoomable admin-details-photo" data-photo-zoom aria-label="View full photo"><img ${isPrivateStudentPhoto(data.photo) ? "" : `src="${escapeHTML(data.photo)}"`} alt="Applicant photo"></button>`
                    : studentAvatarPlaceholder(data, "admin-details-photo")}
                <div>
                    <h3>${escapeHTML(data.fullName || "Unnamed Applicant")}</h3>
                    <p>${data.admissionNumber ? "Admission No " + escapeHTML(String(data.admissionNumber)) : "No admission number yet"} · ${data.channel === "offline" ? "Added offline by admin" : "Online application"} · Applied ${escapeHTML(formatDate(data.createdAt))}</p>
                </div>
            </div>
            <div class="admin-details-grid">
                ${adminField("Parent / Guardian", data.parentName)}
                ${adminField("Student Phone", data.phone)}
                ${adminField("Guardian Phone", data.guardianPhone)}
                ${adminField("Email", data.email)}
                ${adminField("Date of Birth", data.dob)}
                ${adminField("Aadhaar Last 4", data.aadhaarLast4 ? "XXXX XXXX " + data.aadhaarLast4 : "—")}
                ${adminField("Qualification", data.qualification)}
                ${adminField("Course", data.coursePreference || data.course)}
                ${adminField("Attendance Setup", data.attendanceSetup === "setup" ? "Requested" : "Skipped")}
                ${adminField("Source", data.source)}
                ${adminField("Batch", data.batch)}
                ${adminField("Gender", formatGender(data.gender))}
                ${adminField("Roll Number", data.rollNumber)}
                ${adminField("Admission Date", data.admissionDate)}
                ${adminField("Attendance Email", data.attendanceEmail)}
                ${adminField("Attendance UID", data.attendanceUid)}
                ${adminField("Admin Note", data.adminNote, true)}
                ${adminField("Monthly Fee History", Object.entries(data.monthlyFees || {}).map(([date,amount]) => date + ": ₹" + amount).join(" · "), true)}
                ${adminField("Approved On", data.approvedAt ? formatDate(data.approvedAt) : "—")}
                ${adminField("Address", data.address, true)}
                ${adminField("Message", data.message, true)}
                ${adminField("Admission Fee", paymentLabel(data.payment), true)}
            </div>
            <div class="admin-edit-fields" hidden>
            <div class="admin-edit-row">
<label>Full Name<input class="edit-fullName" value="${escapeHTML(data.fullName || "")}"></label>
<label>Parent / Guardian<input class="edit-parentName" value="${escapeHTML(data.parentName || "")}"></label>
<label>Student Phone<input class="edit-phone" maxlength="10" value="${escapeHTML(data.phone || "")}"></label>
<label>Guardian Phone<input class="edit-guardianPhone" value="${escapeHTML(data.guardianPhone || "")}" maxlength="10"></label>
<label>Email<input type="email" class="edit-email" value="${escapeHTML(data.email || "")}"></label>
<label>Date of Birth<input type="date" class="edit-dob" value="${escapeHTML(data.dob || "")}"></label>
<label>Gender<select class="edit-gender"><option value="">Not specified</option>${data.gender && !["male","female","other","prefer_not_to_say"].includes(data.gender) ? `<option value="${escapeHTML(data.gender)}" selected>${escapeHTML(data.gender)}</option>` : ""}<option value="male" ${data.gender === "male" ? "selected" : ""}>Male</option><option value="female" ${data.gender === "female" ? "selected" : ""}>Female</option><option value="other" ${data.gender === "other" ? "selected" : ""}>Other</option><option value="prefer_not_to_say" ${data.gender === "prefer_not_to_say" ? "selected" : ""}>Prefer not to say</option></select></label>
<label>Roll No<input class="edit-rollNumber" value="${escapeHTML(data.rollNumber || "")}"></label>
<label>Admission Date<input type="date" class="edit-admissionDate" value="${escapeHTML((data.admissionDate || "").slice(0,10))}"></label>
<label>Course<input class="edit-coursePreference" value="${escapeHTML(data.coursePreference || data.course || "")}"></label>
<label>Qualification<input class="edit-qualification" value="${escapeHTML(data.qualification || "")}"></label>
<label>Aadhaar last 4<input class="edit-aadhaarLast4" maxlength="4" value="${escapeHTML(data.aadhaarLast4 || "")}"></label>
<label>Source<input class="edit-source" value="${escapeHTML(data.source || "")}"></label>
<label class="admin-edit-wide">Message<textarea class="edit-message">${escapeHTML(data.message || "")}</textarea></label>
<label class="admin-edit-wide">Address<input class="edit-address" value="${escapeHTML(data.address || "")}"></label>
<label class="admin-edit-wide">Replace Photo (optional)<input class="edit-photo" type="file" accept="image/jpeg,image/png"></label>
<p class="admin-modal-hint edit-photo-notice">The existing photograph is kept unless you choose a replacement.</p>
</div>
<div class="admin-edit-row">
                <label>Admission No<input class="admin-edit-adm" type="text" maxlength="10" value="${escapeHTML(data.admissionNumber || "")}" placeholder="${nextAdmissionNumber()}"></label>
                <label>Batch<select class="admin-edit-batch">${["", "Morning", "Afternoon", "Evening"].concat(data.batch && !["Morning", "Afternoon", "Evening"].includes(data.batch) ? [data.batch] : []).map(b => `<option ${data.batch === b ? "selected" : ""}>${escapeHTML(b)}</option>`).join("")}</select></label>
                <label>Fee Status<select class="admin-edit-fee">${[
                    ["awaiting", "Awaiting payment"],
                    ["pending", "Pending (fee not received)"],
                    ["at_centre", "Will pay at centre"],
                    ["claimed", "Claimed online — verify"],
                    ["paid", "Paid — verified"]
                ].concat(data.payment?.status && !["awaiting","pending","at_centre","claimed","paid"].includes(data.payment.status) ? [[data.payment.status,data.payment.status]] : []).map(opt => `<option value="${escapeHTML(opt[0])}" ${((data.payment && data.payment.status) || "pending") === opt[0] ? "selected" : ""}>${escapeHTML(opt[1])}</option>`).join("")}</select></label>
                <label class="admin-edit-wide">Admin Note (private)<input class="admin-edit-note" type="text" value="${escapeHTML(data.adminNote || "")}"></label>
                <label class="admin-edit-wide">Record Status<select class="admin-edit-status"><option ${!data.status || data.status === "New" ? "selected" : ""}>New</option>${data.status && !["New","Approved","Cancelled"].includes(data.status) ? `<option selected>${escapeHTML(data.status)}</option>` : ""}<option ${data.status === "Approved" ? "selected" : ""}>Approved</option><option ${data.status === "Cancelled" ? "selected" : ""}>Cancelled</option></select></label>
            </div>
            <button type="button" class="admin-save-btn admin-save-edits">Save Changes</button>
            </div>
            ${data.status === "Approved" && data.admissionNumber ? '<button type="button" class="admin-ghost-btn admin-send-admission" style="margin-top:14px">Send Admission Confirmation on WhatsApp ↗</button>' : ""}
            <p class="admin-modal-msg" hidden></p>
        </div>
    `);

    modal.querySelector("[data-photo-zoom]")?.addEventListener(
        "click",
        () => openAdminPhotoViewer(data.fullName, data.photo, data.admissionNumber)
    );

    const editGroup = modal.querySelector(".admin-edit-fields");
    modal.querySelector(".admin-toggle-edit").addEventListener("click", () => {
        editGroup.hidden = !editGroup.hidden;
        modal.querySelector(".admin-toggle-edit").textContent = editGroup.hidden ? "✎" : "✕";
    });
    modal.querySelector(".admin-send-admission")?.addEventListener("click", () => openAdmissionWhatsApp({
        ...data,
        coursePreference: data.coursePreference || data.course || "",
        admissionDate: admissionConfirmationDate(data)
    }));
    if (isSafePhoto(data.photo)) displayAdminPhoto(modal.querySelector("[data-photo-zoom] img"), data.photo);
    let updatedPhoto = null;
    modal.querySelector(".edit-photo").addEventListener("change", event => {
        const file = event.target.files && event.target.files[0];
        if (!file) return;
        openStudentCropper(file, url => {
            updatedPhoto = url;
            modal.querySelector(".edit-photo-notice").textContent = "Cropped replacement ready to save.";
        });
    });
    modal.querySelector(".admin-save-edits").addEventListener("click", async () => {

        const btn = modal.querySelector(".admin-save-edits");
        const msg = modal.querySelector(".admin-modal-msg");

        const feeVal = modal.querySelector(".admin-edit-fee").value;

        const getValue = name => modal.querySelector(".edit-" + name).value.trim();
        const newName = getValue("fullName");
        const newPhone = getValue("phone");
        if (newName !== (data.fullName || "") && newName.length < 2) {
            msg.hidden = false; msg.className = "admin-modal-msg err";
            msg.textContent = "Name must contain at least two characters."; return;
        }
        if (newPhone !== (data.phone || "") && newPhone && !/^[0-9]{10}$/.test(newPhone)) {
            msg.hidden = false; msg.className = "admin-modal-msg err";
            msg.textContent = "Edited phone number must contain exactly 10 digits."; return;
        }
        const patch = {
            fullName: getValue("fullName"),
            parentName: getValue("parentName"),
            phone: getValue("phone"),
            guardianPhone: getValue("guardianPhone"),
            email: getValue("email"),
            dob: getValue("dob"),
            gender: getValue("gender"),
            rollNumber: getValue("rollNumber"),
            admissionDate: getValue("admissionDate") || data.admissionDate || "",
            coursePreference: getValue("coursePreference"),
            qualification: getValue("qualification"),
            address: getValue("address"),
            aadhaarLast4: getValue("aadhaarLast4"),
            source: getValue("source"),
            message: getValue("message"),
            ...(updatedPhoto ? {photo: updatedPhoto} : {}),
            admissionNumber: modal.querySelector(".admin-edit-adm").value.trim(),
            batch: modal.querySelector(".admin-edit-batch").value,
            adminNote: modal.querySelector(".admin-edit-note").value.trim(),
            status: modal.querySelector(".admin-edit-status").value,
        };
        // Only write fields that actually changed, preserving payment metadata and unrelated records.
        for (const key of Object.keys(patch)) {
            const baseline = key === "coursePreference" ? (data.coursePreference || data.course || "") : key === "status" ? (data.status || "New") : (data[key] ?? "");
            if (key !== "photo" && patch[key] === baseline) delete patch[key];
        }
        if (feeVal !== ((data.payment && data.payment.status) || "pending")) {
            patch.payment = {...(data.payment || {}), status: feeVal, amount: ADMISSION_FEE,
                verified: feeVal === "paid", updatedAt: new Date().toISOString()};
        }
        if (!Object.keys(patch).length) {
            msg.hidden = false; msg.className = "admin-modal-msg ok"; msg.textContent = "No changes to save."; return;
        }

        if (patch.status === "Cancelled" && data.status !== "Cancelled") {
            const overdue = overdueMonthlyTuition(data);
            if (!overdue || !overdue.review) {
                window.alert("Cancellation review is available only after a monthly fee is overdue by more than five days.");
                return;
            }
            if (!window.confirm("Cancel admission for " + (data.fullName || "this student") + "? Confirm the fee ledger, payment receipts and any agreed extension first. The record will be retained.")) return;
            patch.cancelledAt = new Date().toISOString();
        }
        if (patch.status === "Approved" && data.status !== "Approved") {
            patch.approvedAt = new Date().toISOString();
        }

        btn.disabled = true;
        btn.textContent = "Saving…";

        try {

            if (updatedPhoto) patch.photo = await storeStudentPhoto(updatedPhoto, adminPhotoToken);
            await updateDoc(doc(db, "applications", applicationId), patch);

            msg.hidden = false;
            msg.textContent = "Saved ✓";
            msg.className = "admin-modal-msg ok";

            await loadApplications();
            scheduleModalClose(modal, 800);

        } catch (error) {

            msg.hidden = false;
            msg.textContent = "Could not save: " + (error.message || error);
            msg.className = "admin-modal-msg err";

        } finally {
            btn.disabled = false;
            btn.textContent = "Save Changes";
        }

    });

}


function scheduleModalClose(modal, delay) {
    const generation = modal._generation;
    setTimeout(() => { if (generation === modal._generation) closeAdminModal(modal); }, delay);
}

function closeAdminModal(modal) {
    if (modal._canClose === false) return;
    modal._generation++;
    modal.hidden = true;
    if (modal._returnFocus?.isConnected) modal._returnFocus.focus();
}

function adminCreateModal(id, inner) {
    let modal = document.getElementById(id);
    if (!modal) {
        modal = document.createElement("div");
        modal.id = id;
        modal.className = "admin-modal";
        modal.setAttribute("role", "dialog");
        modal.setAttribute("aria-modal", "true");
        document.body.appendChild(modal);
        modal.addEventListener("click", event => {
            if (event.target === modal) closeAdminModal(modal);
        });
        modal.addEventListener("keydown", event => {
            if (event.key === "Escape") { event.stopPropagation(); closeAdminModal(modal); }
            if (event.key !== "Tab") return;
            const controls = [...modal.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]')].filter(el => el.getClientRects().length);
            const first = controls[0], last = controls.at(-1);
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
        });
    }
    // A reused cropper must appear above the newer offline-student dialog.
    document.body.appendChild(modal);
    modal._generation = (modal._generation || 0) + 1;
    modal._canClose = true;
    modal._returnFocus = document.activeElement;
    modal.innerHTML = inner;
    modal.hidden = false;
    const heading = modal.querySelector("h3");
    if (heading) { heading.id = id + "Heading"; modal.setAttribute("aria-labelledby", heading.id); }
    modal.querySelector(".admin-modal-close")?.addEventListener("click", () => closeAdminModal(modal));
    queueMicrotask(() => modal.querySelector(".admin-modal-close, input, button")?.focus());
    return modal;
}

function studentAvatarPlaceholder(data, extraClass = "") {
    const gender = data.channel === "offline" ? String(data.gender || "").toLowerCase() : "";
    const shape = gender === "female"
        ? '<path d="M9 39V25c0-12 6-19 15-19s15 7 15 19v14l-7-5v-9c0-5-3-9-8-9s-8 4-8 9v9z" fill="currentColor" opacity=".82"/><ellipse cx="24" cy="25" rx="9" ry="11" fill="currentColor"/><path d="M7 45c1-10 8-15 17-15s16 5 17 15z" fill="currentColor"/>'
        : gender === "male"
        ? '<path d="M13 20c0-9 5-14 11-14 9 0 13 6 12 14l-3-4-5-4-6 2-7 6z" fill="currentColor"/><ellipse cx="24" cy="25" rx="10" ry="11" fill="currentColor"/><path d="M6 45c1-10 8-15 18-15s17 5 18 15z" fill="currentColor"/>'
        : '<circle cx="24" cy="20" r="11" fill="currentColor"/><path d="M5 45c1-11 8-17 19-17s18 6 19 17z" fill="currentColor"/>';
    const label = gender === "female" ? "Female silhouette (no uploaded photo)" : gender === "male" ? "Male silhouette (no uploaded photo)" : "No uploaded photo";
    return '<div class="row-photo row-photo-empty student-silhouette ' + extraClass + '" title="' + label + '" role="img" aria-label="' + label + '"><svg viewBox="0 0 48 48" width="36" height="36" aria-hidden="true" focusable="false">' + shape + '</svg></div>';
}

function openStudentCropper(file, onDone) {
    if (file && file.size > 10 * 1024 * 1024) { window.alert("Choose a photograph smaller than 10 MB."); return; }
    if (!file || !/^image\/(jpeg|jpg|png)$/.test(file.type || "")) { window.alert("Choose a JPG or PNG photograph."); return; }
    const image = new Image(), url = URL.createObjectURL(file);
    image.onerror = () => { URL.revokeObjectURL(url); window.alert("Could not open image."); };
    image.onload = () => {
        URL.revokeObjectURL(url);
        const modal = adminCreateModal("adminCropModal", `
          <div class="admin-modal-card" style="max-width:480px">
            <button type="button" class="admin-modal-close" aria-label="Cancel">×</button>
            <h3>Crop student photograph</h3><p>Preview a square profile photograph. Adjust zoom and position, then apply.</p>
            <canvas id="photoCropCanvas" width="360" height="360" style="display:block;width:min(100%,360px);margin:12px auto;border-radius:10px"></canvas>
            <label>Zoom<input id="cropZoom" type="range" min="1" max="3" step=".02" value="1" style="width:100%"></label>
            <label>Left / right<input id="cropX" type="range" min="0" max="100" value="50" style="width:100%"></label>
            <label>Up / down<input id="cropY" type="range" min="0" max="100" value="50" style="width:100%"></label>
            <button type="button" class="admin-save-btn" id="applyStudentCrop">Use this crop</button>
          </div>`);
        const canvas = modal.querySelector("#photoCropCanvas"), context = canvas.getContext("2d");
        const zoom = modal.querySelector("#cropZoom"), x = modal.querySelector("#cropX"), y = modal.querySelector("#cropY");
        const paint = () => {
            const side = Math.min(image.width,image.height)/Number(zoom.value);
            context.drawImage(image,(image.width-side)*Number(x.value)/100,(image.height-side)*Number(y.value)/100,side,side,0,0,360,360);
        };
        [zoom,x,y].forEach(el => el.addEventListener("input",paint));
        paint();
        modal.querySelector("#applyStudentCrop").addEventListener("click", () => {
            let q=.82, result=canvas.toDataURL("image/jpeg",q);
            while(result.length>380000 && q>.4){q-=.1; result=canvas.toDataURL("image/jpeg",q);}
            if(result.length>500000){window.alert("Cropped photo is too large.");return;}
            closeAdminModal(modal);onDone(result);
        });
    };
    image.src=url;
}

function admissionConfirmationDate(data) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(data.admissionDate || "")) return data.admissionDate;
    const time = recordTime(data.approvedAt);
    if (!time) return "Not recorded";
    const day = indiaCalendarDate(new Date(time));
    return [day.year, String(day.month).padStart(2, "0"), String(day.day).padStart(2, "0")].join("-");
}

function admissionWhatsAppMessage(student) {
    return [
        "*REHAAN COMPUTERS*",
        "Charangam, Beerwah, Jammu & Kashmir",
        "E-Max India Affiliated Training Centre",
        "",
        "*OFFICIAL ADMISSION CONFIRMATION*",
        "",
        "Dear " + student.fullName + ",",
        "",
        "Congratulations! Your admission has been successfully registered at *Rehaan Computers*.",
        "",
        "*STUDENT ADMISSION DETAILS*",
        "*Full Name:* " + student.fullName,
        "*Admission Number:* " + student.admissionNumber,
        "*Institute Roll Number:* " + (student.rollNumber || student.admissionNumber),
        "*Course Enrolled:* " + student.coursePreference,
        "*Date of Admission:* " + student.admissionDate,
        "*Admission Status:* Confirmed",
        "",
        "Rehaan Computers is an E-Max India affiliated training centre committed to practical and quality computer education.",
        "",
        "Please keep your *Admission Number* and *Roll Number* safe for future reference.",
        "",
        "We welcome you and wish you success in your learning journey.",
        "",
        "*Admissions Department*",
        "*Rehaan Computers*"
    ].join("\n");
}
function openAdmissionWhatsApp(student) {
    const phone = String(student.phone || "").replace(/\D/g, "");
    if (!/^[6-9]\d{9}$/.test(phone)) { window.alert("A valid 10-digit student phone is required."); return; }
    const url = "https://wa.me/91" + phone + "?text=" + encodeURIComponent(admissionWhatsAppMessage(student));
    const tab = window.open(url, "_blank");
    if (tab) tab.opener = null;
    else window.alert("Please allow pop-ups to open the WhatsApp admission confirmation.");
}

// Loading a private photo is separate from saving its Cloudinary reference.
async function displayAdminPhoto(image,photo) {
    if(!image)return;
    const host=image.parentElement;
    let status=host.querySelector('.rc-photo-status');
    if(!status){
        status=document.createElement('span');status.className='rc-photo-status';status.setAttribute('role','status');
        image.insertAdjacentElement('afterend',status);
        const retry=event=>{
            if(image.dataset.photoState!=='error'||!(event.target===image||event.target===status||event.target===host))return;
            event.preventDefault();event.stopImmediatePropagation();displayAdminPhoto(image,image.dataset.photoReference);
        };
        host.addEventListener('click',retry,true);
        status.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();displayAdminPhoto(image,image.dataset.photoReference);}});
        image.addEventListener('error',()=>{image.dataset.photoState='error';image.hidden=true;status.hidden=false;status.textContent='Retry photo';status.tabIndex=0;});
    }
    image.hidden=true;status.hidden=false;status.textContent='Loading photo…';status.removeAttribute('tabindex');
    const ready=await displayStudentPhoto(image,photo,adminPhotoToken);
    if(!image.isConnected||!verifiedAdminUid||image.dataset.photoReference!==photo)return;
    image.hidden=!ready;status.hidden=ready;
    if(!ready){status.textContent='Retry photo';status.tabIndex=0;}
}

function openAddStudentModal() {
    if (!recordsLoaded) { window.alert("Load the student register successfully before adding students."); return; }

    let photoData = "";

    const courseOptions =
        `<option value="">Select Course</option>` +
        courses.map(c =>
            `<option value="${escapeHTML(c.title)}">${escapeHTML(c.title)}</option>`
        ).join("");

    const modal = adminCreateModal("adminAddModal", `
        <div class="admin-modal-card">
            <button type="button" class="admin-modal-close" aria-label="Close">×</button>
            <span class="admin-modal-kicker">OFFLINE ENROLMENT</span>
            <h3>Add Student (Walk-in Enrolment)</h3>
            <p>For students who enrolled directly at the institute. Saved to the same register as online applications, marked <b>Approved</b> with the <b>₹${ADMISSION_FEE} admission fee PAID</b> (received at centre).</p>
            <div class="admin-photo-row">
                <div class="add-student-photo" id="addPhotoBox" tabindex="0" role="button" aria-label="Optional: attach scanned passport photo">
                    <span id="addPhotoHint">+ Add photo<br>(optional)</span>
                    <img id="addPhotoImg" alt="" hidden>
                </div>
                <input type="file" id="addPhotoInput" accept="image/jpeg,image/png" hidden>
                <div class="admin-modal-hint">Optional — physical passport photos + Aadhaar photocopy are collected at the centre.<br><button type="button" class="admin-ghost-btn" id="addPhotoRemove" hidden>Remove photo</button></div>
            </div>
            <div class="admin-form-grid">
                <label>Full Name *<input id="addName" type="text" autocomplete="off"></label>
                <label>Gender (optional)<select id="addGender"><option value="">Not specified</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option><option value="prefer_not_to_say">Prefer not to say</option></select></label>
                <label>Parent / Guardian<input id="addGuardian" type="text" autocomplete="off"></label>
                <label>Phone *<input id="addPhone" type="tel" inputmode="numeric" maxlength="10" autocomplete="off"></label>
                <label>Guardian Phone<input id="addGuardianPhone" type="tel" inputmode="numeric" maxlength="10" autocomplete="off"></label>
                <label>Email<input id="addEmail" type="email" autocomplete="off"></label>
                <label>Date of Birth<input id="addDob" type="date"></label>
                <label>Aadhaar last 4 digits (optional)<input id="addAadhaarLast4" inputmode="numeric" maxlength="4" pattern="[0-9]{4}" autocomplete="off" placeholder="Last 4 only"></label>
                <label>Admission Date *<input id="addAdmissionDate" type="date" required></label>
                <label>Qualification<select id="addQual"><option value="">—</option>${ADMIN_QUALIFICATIONS.map(q => `<option>${q}</option>`).join("")}</select></label>
                <label>Course *<select id="addCourse">${courseOptions}</select></label>
                <label>Batch<select id="addBatch"><option>Morning</option><option>Afternoon</option><option>Evening</option></select></label>
                <label>Roll No (optional)<input id="addRoll" type="text" maxlength="20" placeholder="Defaults to admission no."></label>\n                <label>Admission No *<input id="addAdm" type="text" maxlength="10" value="${nextAdmissionNumber()}"></label>
                <label class="admin-edit-wide">Address<input id="addAddress" type="text" autocomplete="off"></label>
                <label class="admin-edit-wide">Note (fee receipt, remarks…)<input id="addNote" type="text" autocomplete="off"></label>
            </div>
            <button type="button" class="admin-save-btn" id="addSaveBtn">Save Student</button>
            <p class="admin-modal-msg" id="addMsg" hidden></p>
        </div>
    `);

    const todayIndia = indiaCalendarDate();
    modal.querySelector("#addAdmissionDate").value = `${todayIndia.year}-${String(todayIndia.month).padStart(2, "0")}-${String(todayIndia.day).padStart(2, "0")}`;
    const box = modal.querySelector("#addPhotoBox");
    const input = modal.querySelector("#addPhotoInput");
    const img = modal.querySelector("#addPhotoImg");
    const hint = modal.querySelector("#addPhotoHint");
    const remove = modal.querySelector("#addPhotoRemove");

    const showPhoto = url => {
        photoData = url || "";
        if (photoData) {
            img.src = photoData;
            img.hidden = false;
            hint.hidden = true;
            remove.hidden = false;
            box.classList.add("has-photo");
        } else {
            img.hidden = true;
            img.removeAttribute("src");
            hint.hidden = false;
            remove.hidden = true;
            box.classList.remove("has-photo");
        }
    };

    box.addEventListener("click", () => input.click());
    box.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            input.click();
        }
    });
    input.addEventListener("change", () => {
        const file = input.files && input.files[0];
        if (!file) return;
        openStudentCropper(file, showPhoto);
        input.value = "";
    });
    remove.addEventListener("click", () => showPhoto(""));

    modal.querySelector("#addSaveBtn").addEventListener("click", async () => {

        const msg = modal.querySelector("#addMsg");
        const btn = modal.querySelector("#addSaveBtn");

        const value = id => (modal.querySelector("#" + id).value || "").trim();

        const fullName = value("addName");
        const phone = value("addPhone");
        const admissionNumber = value("addAdm");
        const aadhaarLast4 = value("addAadhaarLast4");
        const admissionDate = value("addAdmissionDate");
        if (aadhaarLast4 && !/^\d{4}$/.test(aadhaarLast4)) {
            msg.hidden = false; msg.className = "admin-modal-msg err";
            msg.textContent = "Enter exactly 4 Aadhaar digits or leave the field blank.";
            return;
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(admissionDate)) {
            msg.hidden = false; msg.className = "admin-modal-msg err";
            msg.textContent = "Choose the student admission date.";
            return;
        }

        if (fullName.length < 2) {
            msg.hidden = false; msg.className = "admin-modal-msg err";
            msg.textContent = "Enter the student's full name.";
            return;
        }

        if (!/^\d{10}$/.test(phone)) {
            msg.hidden = false; msg.className = "admin-modal-msg err";
            msg.textContent = "Phone must be exactly 10 digits.";
            return;
        }

        const course = modal.querySelector("#addCourse").value;

        if (!course) {
            msg.hidden = false; msg.className = "admin-modal-msg err";
            msg.textContent = "Select a course.";
            return;
        }

        if (!admissionNumber) {
            msg.hidden = false; msg.className = "admin-modal-msg err";
            msg.textContent = "An admission number is required for offline enrolment (next suggested: " + nextAdmissionNumber() + ").";
            return;
        }

        if (!window.confirm("Save this offline enrolment and confirm that the ₹100 admission fee was received at the centre?")) return;
        const nowIso = new Date().toISOString();

        btn.disabled = true;
        btn.textContent = "Saving…";

        try {

            await addDoc(collection(db, "applications"), {
                fullName,
                parentName: value("addGuardian"),
                phone,
                guardianPhone: value("addGuardianPhone"),
                email: value("addEmail"),
                dob: value("addDob"),
                qualification: modal.querySelector("#addQual").value,
                address: value("addAddress"),
                coursePreference: course,
                batch: modal.querySelector("#addBatch").value,
                source: "Institute — offline enrolment",
                attendanceSetup: "skip",
                attendanceEmail: "",
                attendanceUid: "",
                message: value("addNote"),
                photo: await storeStudentPhoto(photoData, adminPhotoToken),
                gender: value("addGender"),
                admissionNumber,
                rollNumber: value("addRoll") || admissionNumber,
                admissionDate,
                aadhaarLast4,
                monthlyFees: {},
                feeReminders: {},
                status: "Approved",
                channel: "offline",
                approvedAt: nowIso,
                payment: {
                    status: "paid",
                    amount: ADMISSION_FEE,
                    verified: true,
                    mode: "cash",
                    note: "Fee received at centre (offline enrolment)",
                    updatedAt: nowIso
                },
                createdAt: nowIso
            });

            msg.hidden = false;
            msg.className = "admin-modal-msg ok";
            msg.textContent = "Student saved to the register ✓";
            btn.dataset.saved = "true";
            btn.textContent = "Student saved";
            modal.querySelectorAll("input,select,textarea").forEach(field => field.disabled = true);
            const wa = document.createElement("button");
            wa.type = "button";
            wa.className = "admin-save-btn";
            wa.style.marginTop = "12px";
            wa.textContent = "Send admission confirmation on WhatsApp ↗";
            wa.addEventListener("click", () => openAdmissionWhatsApp({
                fullName, phone, admissionNumber,
                rollNumber: value("addRoll") || admissionNumber,
                coursePreference: course,
                batch: modal.querySelector("#addBatch").value,
                admissionDate
            }));
            msg.insertAdjacentElement("afterend", wa);

            await loadApplications();
            // Keep the confirmation action visible until the administrator closes the modal.

        } catch (error) {

            msg.hidden = false;
            msg.className = "admin-modal-msg err";
            msg.textContent = "Could not save: " + (error.message || error);

        } finally {
            if (!btn.dataset.saved) {
                btn.disabled = false;
                btn.textContent = "Save Student";
            }
        }

    });

}


/* =========================================================
   ADMIN: CSV EXPORT (current tab / filter view)
========================================================= */

function exportAdminCsv() {

    const rows = adminFilteredApps();

    if (!rows.length) {
        window.alert("No records match the current filters.");
        return;
    }

    const esc = csvCell;

    const head = [
        "Admission No", "Name", "Guardian", "Phone", "Email", "DOB",
        "Qualification", "Course", "Batch", "Status", "Source",
        "Admission Fee", "Fee Verified", "Photo", "Applied On",
        "Approved On", "Admin Note", "Guardian Phone", "Gender", "Roll Number", "Admission Date", "Address", "Message", "Referral Source", "Attendance Setup", "Attendance Email", "Attendance UID", "Aadhaar Last 4", "Monthly Fee Ledger", "Reminder History", "Payment Details"
    ];

    const lines = [head.map(esc).join(",")];

    rows.forEach(({ data: d }) => {

        lines.push([
            d.admissionNumber || "",
            d.fullName,
            d.parentName,
            d.phone,
            d.email,
            d.dob,
            d.qualification,
            d.coursePreference || d.course,
            d.batch,
            d.status || "New",
            d.channel === "offline" ? "Offline (institute)" : "Online",
            d.payment && d.payment.status === "paid" ? "PAID ₹" + ADMISSION_FEE : paymentLabel(d.payment),
            d.payment && d.payment.verified ? "yes" : "no",
            isSafePhoto(d.photo) ? "yes" : "no",
            formatDate(d.createdAt),
            d.approvedAt ? formatDate(d.approvedAt) : "",
            d.adminNote || "", d.guardianPhone, formatGender(d.gender), d.rollNumber, d.admissionDate, d.address, d.message, d.source, d.attendanceSetup, d.attendanceEmail, d.attendanceUid, d.aadhaarLast4, JSON.stringify(d.monthlyFees || {}), JSON.stringify(d.feeReminders || {}), JSON.stringify(d.payment || {})
        ].map(esc).join(","));

    });

    const blob = new Blob(["\ufeff" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");

    link.href = URL.createObjectURL(blob);
    link.download = "rehaan-" + (adminState.tab === "enrolled" ? "enrolled" : "applications") + "-" + new Date().toISOString().slice(0, 10) + ".csv";

    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(link.href), 8000);

}


function adminField(
    label,
    value,
    wide = false
) {

    const safeValue =
        value === undefined ||
        value === null ||
        String(value).trim() === ""
            ? "—"
            : String(value);


    return `

        <div class="
            application-field
            ${wide ? "application-field-wide" : ""}
        ">

            <span>
                ${escapeHTML(label)}
            </span>

            <strong>
                ${escapeHTML(safeValue)}
            </strong>

        </div>

    `;

}


/* =========================================================
   DELETE APPLICATION
========================================================= */

function deleteApplication(applicationId) {
    const entry = adminState.apps.find(record => record.id === applicationId);
    if (!entry) return;
    const enrolled = adminIsEnrolled(entry.data) || Boolean(entry.data.admissionNumber);
    const confirmation = String(entry.data.admissionNumber || entry.data.fullName || applicationId);
    const modal = adminCreateModal("adminDeleteModal", `
        <div class="admin-modal-card delete-modal-card">
            <button type="button" class="admin-modal-close" aria-label="Close">×</button>
            <span class="admin-modal-kicker">REVIEW BEFORE DELETING</span>
            <h3>Delete ${enrolled ? "student record" : "application"}?</h3>
            <p><strong>${escapeHTML(entry.data.fullName || "Unnamed applicant")}</strong>${entry.data.admissionNumber ? " · ADM " + escapeHTML(String(entry.data.admissionNumber)) : ""}</p>
            <p>This permanently removes this record and its saved fee history. Other students are not affected. This cannot be undone.</p>
            <form id="adminDeleteForm">
                ${enrolled ? `<label class="field">Type <strong>${escapeHTML(confirmation)}</strong> to confirm<input id="deleteConfirmation" autocomplete="off" required></label>` : '<p class="delete-pending-note">This application has not been enrolled. Confirm below to remove it from awaiting approval.</p>'}
                <p id="deleteMessage" class="admin-modal-msg" role="alert" hidden></p>
                <div class="delete-dialog-actions"><button type="button" id="deleteCancel">Keep record</button><button type="submit" class="danger-button" id="deleteConfirm">Delete permanently</button></div>
            </form>
        </div>`);
    modal.querySelector("#deleteCancel").onclick = () => closeAdminModal(modal);
    modal.querySelector("#adminDeleteForm").addEventListener("submit", async event => {
        event.preventDefault();
        const button = modal.querySelector("#deleteConfirm");
        const message = modal.querySelector("#deleteMessage");
        const input = modal.querySelector("#deleteConfirmation");
        if (input && input.value.trim() !== confirmation) {
            message.hidden = false;
            message.className = "admin-modal-msg err";
            message.textContent = "Enter the admission number or name exactly as shown above.";
            input.focus();
            return;
        }
        if (button.disabled) return;
        button.disabled = true;
        button.textContent = "Deleting…";
        try {
            await deleteDoc(doc(db, "applications", applicationId));
            closeAdminModal(modal);
            await loadApplications();
        } catch (error) {
            message.hidden = false;
            message.className = "admin-modal-msg err";
            message.textContent = "Record kept. " + friendlyError(error);
            button.disabled = false;
            button.textContent = "Try deleting again";
        }
    });
}

async function handleAdminLogin(event) {
    event.preventDefault();
    const button = getElement("adminLoginButton");
    if (button.disabled) return;
    button.disabled = true;
    button.textContent = "Checking access…";
    try {
        const { user } = await signInWithEmailAndPassword(auth,
            getElement("adminEmail").value.trim(), getElement("adminPassword").value);
        const verification = await verifyAdmin(user);
        if (!verification.authorized) {
            await signOut(auth);
            throw new Error(verification.reason);
        }
        verifiedAdminUid = user.uid;
        getElement("adminPassword").value = "";
        showAdminDashboard();
        await loadApplications();
    } catch (error) {
        showAdminMessage("error", friendlyError(error));
    } finally {
        button.disabled = false;
        button.textContent = "Sign in securely";
    }
}


async function handleAdminLogout() {
    try { await signOut(auth); clearAdminSession(); }
    catch (error) { window.alert("Could not sign out: " + friendlyError(error)); }
}


async function initAdminAuthentication() {
    const button = getElement("adminLoginButton");
    try {
        await auth.authStateReady();
        await signOut(auth);
        await setPersistence(auth, inMemoryPersistence);
        onAuthStateChanged(auth, user => { if (!user) clearAdminSession(); });
        getElement("adminLoginForm").addEventListener("submit", handleAdminLogin);
        getElement("adminLogoutBtn").addEventListener("click", handleAdminLogout);
        getElement("refreshApplications").addEventListener("click", loadApplications);
        setupWorkspace();
        button.disabled = false;
        button.textContent = "Sign in securely";
    } catch (error) { showAdminMessage("error", friendlyError(error)); }
}

// Writes are scoped to existing applications. There is no migration or automatic write on load.
let verifiedAdminUid = null;
let recordsLoaded = false;
let loadSequence = 0;
let workspaceSection = "overview";

function requireAdmin() {
    if (!verifiedAdminUid || auth.currentUser?.uid !== verifiedAdminUid) throw new Error("Your session ended. Sign in again before saving.");
    if (!recordsLoaded) throw new Error("Refresh and load the register successfully before making changes.");
}

async function assertAvailableAdmission(number, exceptId = "") {
    if (!number) return;
    const key = String(number).trim().toUpperCase();
    const snapshot = await getDocs(collection(db, "applications"));
    let duplicate = false;
    snapshot.forEach(entry => {
        if (entry.id !== exceptId && String(entry.data().admissionNumber || "").trim().toUpperCase() === key) duplicate = true;
    });
    if (duplicate) throw new Error("That admission number already belongs to another student. Choose a different number.");
}

async function updateDoc(reference, requested) {
    requireAdmin();
    const original = adminState.apps.find(entry => entry.id === reference.id)?.data;
    if (!original) throw new Error("Student record not found. Refresh the register.");
    validateChanges(original, requested);
    if (requested.admissionNumber) await assertAvailableAdmission(requested.admissionNumber, reference.id);
    const patch = paymentPatch(original, requested);
    await runTransaction(db, async transaction => {
        requireAdmin();
        const snapshot = await transaction.get(reference);
        if (!snapshot.exists()) throw new Error("This record was deleted in another session. Refresh the register.");
        const latest = snapshot.data();
        assertUnchanged(original, latest, patch);
        transaction.update(reference, { ...patch, updatedAt: new Date().toISOString(), updatedBy: verifiedAdminUid });
    });
}

async function addDoc(_collection, data) {
    requireAdmin();
    validateChanges({}, data);
    await assertAvailableAdmission(data.admissionNumber);
    // A stable ID also prevents double-clicks and simultaneous offline enrolments using the same number.
    const reference = doc(db, "applications", "offline_" + encodeURIComponent(data.admissionNumber.toUpperCase()));
    await runTransaction(db, async transaction => {
        requireAdmin();
        const snapshot = await transaction.get(reference);
        if (snapshot.exists()) throw new Error("This offline enrolment already exists. Refresh instead of saving again.");
        transaction.set(reference, { ...data, createdBy: verifiedAdminUid });
    });
    return reference;
}

async function deleteDoc(reference) {
    requireAdmin();
    const original = adminState.apps.find(entry => entry.id === reference.id)?.data;
    if (!original) throw new Error("Refresh the register before deleting.");
    await runTransaction(db, async transaction => {
        requireAdmin();
        const snapshot = await transaction.get(reference);
        if (!snapshot.exists()) throw new Error("Record no longer exists. Refresh the register.");
        // Preserve records changed after the administrator reviewed them.
        if (canonicalRecord(snapshot.data()) !== canonicalRecord(original)) throw new Error("The record changed. Refresh and review it before deleting.");
        transaction.delete(reference);
    });
}

function friendlyError(error) {
    const code = String(error?.code || "");
    if (code.includes("permission-denied")) return "Firebase denied this action. Check that this account is an administrator and that the deployed rules permit this operation. No changes were saved.";
    if (code.includes("invalid-credential") || code.includes("wrong-password") || code.includes("user-not-found")) return "The admin email or password is incorrect.";
    if (code.includes("too-many-requests")) return "Too many sign-in attempts. Wait a few minutes and try again.";
    if (code.includes("network-request-failed") || code.includes("unavailable")) return "Could not reach Firebase. Check your connection and retry. Refresh the register before repeating a save.";
    return error?.message || "The operation could not be completed. Please try again.";
}

function clearAdminSession() {
    resetAdditions();
    clearPhotoSession();
    if (activePhotoMigration) activePhotoMigration.stopped = true;
    verifiedAdminUid = null;
    loadSequence++;
    recordsLoaded = false;
    adminState.apps = [];
    adminState.query = "";
    adminState.course = "";
    adminState.batch = "";
    getElement("applicationsList").replaceChildren();
    getElement("adminToolbar")?.remove();
    getElement("workspaceSummary").replaceChildren();
    getElement("workspaceView").replaceChildren();
    document.querySelectorAll(".admin-modal,.admin-lightbox").forEach(modal => modal.remove());
    getElement("adminLoginForm").reset();
    getElement("adminPassword").type = "password";
    showAdminLogin();
}

function selectSection(section) {
    workspaceSection = section;
    adminState.tab = section === "fees" ? "fees" : section === "students" ? "enrolled" : section === "admissions" ? "new" : "all";
    adminState.query = "";
    adminState.course = "";
    adminState.batch = "";
    const batchFilter = getElement("adminBatchFilter");
    if (batchFilter) batchFilter.value = "";
    const search = getElement("adminSearch");
    if (search) search.value = "";
    renderAdminList();
    document.body.classList.remove("nav-open");
    getElement("menuToggle").setAttribute("aria-expanded", "false");
}

function openRegisterTab(tab) {
    selectSection(tab === "fees" ? "fees" : tab === "enrolled" ? "students" : "admissions");
    adminState.tab = tab;
    renderAdminList();
}

function setupWorkspace() {
    getElement("workspaceSummary").addEventListener("click", event => {
        const card = event.target.closest("[data-summary]");
        if (card && !card.disabled) {
            selectSection(card.dataset.summary);
            const destination = ["courses", "batches"].includes(card.dataset.summary) ? getElement("workspaceView") : getElement("registerPanel");
            destination.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    });
    document.querySelectorAll("[data-section]").forEach(button => button.addEventListener("click", () => selectSection(button.dataset.section)));
    getElement("workspaceAdd").addEventListener("click", openAddStudentModal);
    getElement("workspaceExport").addEventListener("click", exportAdminCsv);
    getElement("menuToggle").addEventListener("click", () => {
        const open = document.body.classList.toggle("nav-open");
        getElement("menuToggle").setAttribute("aria-expanded", String(open));
    });
    getElement("mobileShade").addEventListener("click", () => {
        document.body.classList.remove("nav-open");
        getElement("menuToggle").setAttribute("aria-expanded", "false");
    });
}

let emailServicePromise;
function loadEmailService() {
    if (window.emailjs) {
        window.emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
        return Promise.resolve(window.emailjs);
    }
    if (!emailServicePromise) emailServicePromise = new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js";
        const timer = setTimeout(() => { script.remove(); emailServicePromise = undefined; reject(new Error("Email service timed out.")); }, 12000);
        script.onload = () => {
            clearTimeout(timer);
            if (!window.emailjs) { emailServicePromise = undefined; reject(new Error("Email service did not initialize.")); return; }
            window.emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
            resolve(window.emailjs);
        };
        script.onerror = () => { clearTimeout(timer); script.remove(); emailServicePromise = undefined; reject(new Error("Email service unavailable.")); };
        document.head.appendChild(script);
    });
    return emailServicePromise;
}

function workspaceIcon(name) {
    const paths = {
        students: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/><circle cx="9" cy="7" r="4"/>',
        admissions: '<rect x="4" y="4" width="16" height="17" rx="2"/><path d="M9 4V2h6v2M8 10h8M8 15h6"/>',
        courses: '<path d="M12 5v16M12 5C8 2 4 3 2 4v15c3-1 6-1 10 2 4-3 7-3 10-2V4c-2-1-6-2-10 1Z"/>',
        batches: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18M8 15h2M14 15h2"/>',
        fees: '<rect x="3" y="5" width="18" height="15" rx="2"/><path d="M3 10h18M7 15h3"/>',
        overview: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/>',
        reports: '<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/>',
        settings: '<path d="m10 2-.5 3-2 .9L5 4.5 2.5 9l2.3 1.8v2.4L2.5 15 5 19.5l2.5-1.4 2 .9.5 3h4l.5-3 2-.9 2.5 1.4 2.5-4.5-2.3-1.8v-2.4L21.5 9 19 4.5l-2.5 1.4-2-.9L14 2Z"/><circle cx="12" cy="12" r="3"/>',
        plus: '<path d="M12 5v14M5 12h14"/>',
        arrow: '<path d="M7 17 17 7M7 7h10v10"/>',
        arrowRight: '<path d="M5 12h14m-5-5 5 5-5 5"/>'
    };
    return `<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.admissions}</svg>`;
}

function updateWorkspace() {
    const apps = adminState.apps;
    const enrolled = apps.filter(entry => adminIsEnrolled(entry.data));
    const pending = apps.filter(entry => !["Approved", "Cancelled"].includes(entry.data.status));
    const distinct = key => new Set(enrolled.map(entry => key === "coursePreference" ? entry.data.coursePreference || entry.data.course : entry.data[key]).filter(Boolean)).size;
    getElement("workspaceSummary").innerHTML = [
        [enrolled.length, "Enrolled students", "Approved admissions", "students", "students"],
        [pending.length, "Awaiting approval", "Applications to review", "admissions", "admissions"],
        [distinct("coursePreference"), "Courses with students", "Browse the course directory", "courses", "courses"],
        [distinct("batch"), "Batches with students", "Browse batch assignments", "batches", "batches"]
    ].map(([count,label,note,icon,target]) => `<button type="button" class="workspace-stat" data-summary="${target}" aria-label="Open ${label.toLowerCase()}${recordsLoaded ? ': ' + count : ''}" ${recordsLoaded ? "" : "disabled"}><span class="workspace-stat-icon" aria-hidden="true">${workspaceIcon(icon)}</span><span class="workspace-stat-body"><span class="workspace-stat-label">${label}</span><strong>${recordsLoaded ? count : "—"}</strong><small>${note}</small></span><span class="workspace-stat-arrow" aria-hidden="true">${workspaceIcon("arrow")}</span></button>`).join("");
    const titles = { statements: "Fee Statements", marks: "Student mark cards", overview: "Your institute, at a glance.", admissions: "Admission applications", students: "Enrolled students", fees: "Fees & payments", courses: "Course directory", batches: "Batch directory", reports: "Reports & exports", settings: "Workspace settings" };
    getElement("workspaceHeading").textContent = titles[workspaceSection];
    getElement("workspaceBreadcrumb").textContent = workspaceSection === "statements" ? "Fee Statements" : workspaceSection[0].toUpperCase() + workspaceSection.slice(1);
    getElement("workspaceProfile").textContent = auth.currentUser?.email || "Administrator";
    getElement("workspaceAdd").disabled = !recordsLoaded;
    getElement("workspaceExport").disabled = !recordsLoaded || !apps.length;
    document.querySelectorAll("[data-section]").forEach(button => {
        const active = button.dataset.section === workspaceSection;
        button.classList.toggle("active", active);
        if (active) button.setAttribute("aria-current", "page"); else button.removeAttribute("aria-current");
    });
    document.querySelectorAll(".admin-tab").forEach(button => { const active = button.dataset.tab === adminState.tab; button.classList.toggle("is-active", active); button.setAttribute("aria-selected", String(active)); button.tabIndex = active ? 0 : -1; });
    getElement("applicationsList").setAttribute("role", "tabpanel");
    getElement("applicationsList").setAttribute("aria-labelledby", "registerTab-" + adminState.tab);
    const directory = ["courses", "batches", "reports", "settings", "marks", "statements"].includes(workspaceSection);
    getElement("registerPanel").hidden = directory && recordsLoaded;
    getElement("workspaceView").hidden = !recordsLoaded || (!["overview"].includes(workspaceSection) && !directory);
    if (!recordsLoaded) return;
    const view = getElement("workspaceView");
    if (workspaceSection === "overview") {
        const today = indiaCalendarDate();
        const labels = Array.from({ length: 6 }, (_,i) => new Date(Date.UTC(today.year, today.month - 6 + i, 1)));
        const points = labels.map(month => ({ label: month.toLocaleString("en-IN", { month: "short", timeZone: "UTC" }), count: apps.filter(entry => {
            if (!recordTime(entry.data.createdAt)) return false;
            const date = indiaCalendarDate(new Date(recordTime(entry.data.createdAt)));
            return date.year === month.getUTCFullYear() && date.month === month.getUTCMonth() + 1;
        }).length }));
        const maximum = Math.max(1, ...points.map(point => point.count));
        view.innerHTML = `<div class="workspace-overview"><section class="workspace-card"><div class="workspace-card-heading"><div><h2>Admissions overview</h2><p>Applications received in the last six months</p></div><span class="workspace-period">India time</span></div><div class="workspace-chart" role="img" aria-label="${escapeHTML(points.map(p => p.label + ' ' + p.count).join(', '))}">${points.map(point => `<div class="workspace-column"><div class="workspace-bar" style="height:${Math.max(1,point.count / maximum * 80)}%"><b>${point.count}</b></div><span>${point.label}</span></div>`).join("")}</div></section><section class="workspace-card"><h2>Quick actions</h2><p>Keep the day moving.</p><button class="workspace-quick" data-go="add"><span>${workspaceIcon("plus")}</span><div><strong>Add offline student</strong><small>Register a walk-in admission</small></div><b>${workspaceIcon("arrowRight")}</b></button><button class="workspace-quick" data-go="admissions"><span>${workspaceIcon("admissions")}</span><div><strong>Review applications</strong><small>${pending.length} awaiting approval</small></div><b>${workspaceIcon("arrowRight")}</b></button><button class="workspace-quick" data-go="fees"><span>${workspaceIcon("fees")}</span><div><strong>Manage fees</strong><small>Payments, balances and reminders</small></div><b>${workspaceIcon("arrowRight")}</b></button></section></div>`;
        view.querySelectorAll("[data-go]").forEach(button => button.onclick = () => button.dataset.go === "add" ? openAddStudentModal() : selectSection(button.dataset.go));
    } else if (workspaceSection === "courses" || workspaceSection === "batches") {
        const isCourse = workspaceSection === "courses";
        const names = [...new Set([...(isCourse ? courses.map(c => c.title) : ["Morning", "Afternoon", "Evening"]), ...apps.map(entry => isCourse ? (entry.data.coursePreference || entry.data.course) : entry.data.batch)].filter(Boolean))];
        view.innerHTML = `<section class="workspace-card"><h2>${isCourse ? "Courses" : "Batch assignments"}</h2><p>View and manage students by ${isCourse ? "course" : "batch"}. Change assignments in the student's Details → Edit panel.</p><div class="workspace-directory">${names.map((name,index) => {
            const matches = apps.filter(entry => (isCourse ? (entry.data.coursePreference || entry.data.course) : entry.data.batch) === name);
            const catalog = isCourse ? courses.find(c => c.title === name) : null;
            return `<article><span class="workspace-stat-icon">${workspaceIcon(isCourse ? "courses" : "batches")}</span><h3>${escapeHTML(name)}</h3><p>${catalog ? escapeHTML(catalog.duration + " · " + catalog.level) : "From the student register"}</p><strong>${matches.filter(entry => adminIsEnrolled(entry.data)).length} enrolled · ${matches.length} total</strong><button data-directory="${index}" ${matches.length ? "" : "disabled"}>View students →</button></article>`;
        }).join("")}</div></section>`;
        view.querySelectorAll("[data-directory]").forEach(button => button.onclick = () => {
            const name = names[Number(button.dataset.directory)];
            workspaceSection = "students";
            adminState.tab = "all";
            adminState.course = isCourse ? name : "";
            adminState.query = "";
            if (!isCourse) {
                adminState.batch = name;
                const select = getElement("adminBatchFilter");
                if (select) select.value = name;
            } else adminState.batch = "";
            renderAdminList();
        });
    } else if (workspaceSection === "statements") {
        renderStatementDirectory(view);
    } else if (workspaceSection === "marks") {
        renderMarkCards(view,apps);
    } else if (workspaceSection === "reports") {
        view.innerHTML = `<section class="workspace-card"><h2>Export your register</h2><p>Download the loaded student records as CSV, or back up every stored field as JSON. Treat downloaded files as private student data.</p><div class="workspace-report-actions"><button class="admin-save-btn" id="reportCsv">Export all records (CSV)</button><button class="admin-ghost-btn" id="reportJson">Download full JSON backup</button></div><p>JSON includes the original document IDs, photographs, fee ledgers, reminder history and all other stored fields. This dashboard does not import or restore backups automatically.</p></section>`;
        getElement("reportCsv").onclick = () => { adminState.tab = "all"; adminState.query = ""; adminState.course = ""; adminState.batch = ""; exportAdminCsv(); };
        getElement("reportJson").onclick = () => {
            if (!window.confirm("Download a private backup of all " + apps.length + " loaded student records? Store it securely; it contains personal data.")) return;
            const text = JSON.stringify({ exportedAt: new Date().toISOString(), project: firebaseConfig.projectId, collection: "applications", records: apps },null,2);
            downloadFile(text,"rehaan-student-backup-" + new Date().toISOString().slice(0,10) + ".json","application/json");
        };
    } else if (workspaceSection === "settings") {
        view.innerHTML = `<section class="workspace-card"><h2>Your workspace</h2><dl class="workspace-settings"><dt>Signed in as</dt><dd>${escapeHTML(auth.currentUser?.email || "Administrator")}</dd><dt>Firebase project</dt><dd>${escapeHTML(firebaseConfig.projectId)}</dd><dt>Student register</dt><dd>applications · ${apps.length} loaded records</dd><dt>Admission fee</dt><dd>₹${ADMISSION_FEE} · separate from monthly tuition</dd><dt>Monthly tuition</dt><dd>₹${MONTHLY_TUITION_FEE} · admission anniversary</dd><dt>Session</dt><dd>Memory only · sign-in required after reloading</dd></dl><div class="workspace-report-actions"><button class="admin-save-btn" id="settingsRefresh">Refresh student register</button><button class="admin-ghost-btn" id="settingsLogout">Sign out securely</button><a href="index.html" class="admin-ghost-btn">Visit public website ↗</a><button class="admin-ghost-btn" id="settingsMigratePhotos" ${photoStorageConfig.enabled ? "" : "disabled"}>Transfer existing photos to Cloudinary</button></div><p>${photoStorageConfig.enabled ? `New student photos upload directly to Cloudinary. ${apps.filter(entry=>isPrivateStudentPhoto(entry.data.photo)).length} photos are already linked. ${apps.filter(entry=>isSafePhoto(entry.data.photo)&&entry.data.photo.startsWith("data:")).length} older inline photos remain to transfer. A transfer count of 0 does not mean photos are missing. Download a backup before transferring older photos.` : "Cloudinary uploads will be available after the photo service is configured."}</p></section>`;
        getElement("settingsRefresh").onclick = loadApplications;
        getElement("settingsLogout").onclick = handleAdminLogout;
        getElement("settingsMigratePhotos").onclick = openPhotoMigration;
    }
}

function downloadFile(text, name, type) {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

configureAdditions({assertSession:requireAdmin,refreshRecords:loadApplications,loadMarkPhoto:async(photo)=>{
    requireAdmin();const uid=verifiedAdminUid;
    if(!photo)return null;
    if(!isSafePhoto(photo))throw new Error("The stored photo reference needs review in student Details.");
    const image=new Image();image.crossOrigin="anonymous";
    const ready=await displayStudentPhoto(image,photo,adminPhotoToken);
    if(!ready)throw new Error("Student photo could not load. Retry the photo before printing or downloading.");
    await image.decode();
    requireAdmin();if(verifiedAdminUid!==uid)throw new Error("Your session changed. Sign in again before viewing photos.");
    return image;
},getRecords:()=>adminState.apps,saveReceipt:async(receipt,input,expectedPaid,correctionId)=>{
    requireAdmin();const uid=verifiedAdminUid;
    const result=await correctReceipt({db,ref:doc(db,"applications",receipt.studentId),runTransaction,
        assertSession:()=>{requireAdmin();if(verifiedAdminUid!==uid)throw new Error("Your session changed. Sign in again before correcting receipts.");},
        actor:uid,receiptId:receipt.id,correctionId,input,expected:receipt,expectedPaid});
    if(verifiedAdminUid!==uid)throw new Error("Correction saved. Sign in again to view it.");
    await loadApplications();return result.receipt;
},saveMarks:async(id,card,expected)=>{
    requireAdmin();const uid=verifiedAdminUid;
    const saved=await saveMarkCard({db,ref:doc(db,"applications",id),runTransaction,
        assertSession:()=>{requireAdmin();if(verifiedAdminUid!==uid)throw new Error("Your session changed. Sign in and refresh before saving marks.");},
        actor:uid,card,expected});
    requireAdmin();if(verifiedAdminUid!==uid)throw new Error("Your session changed. Sign in again to view saved marks.");
    const record=adminState.apps.find(entry=>entry.id===id);
    if(record)record.data={...record.data,markCard:saved};
    return saved;
}});
await initAdminAuthentication();

async function adminPhotoToken() {
    requireAdmin();
    return auth.currentUser.getIdToken();
}


async function cropExistingPhoto(photo) {
    if (!/^data:image\/(?:jpeg|jpg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(photo)) throw new Error("This photograph needs a manual replacement.");
    const image = new Image();
    image.src = photo;
    await image.decode();
    const side = Math.min(image.naturalWidth, image.naturalHeight);
    if (!side) throw new Error("This photograph could not be opened. The original has been kept.");
    const canvas = document.createElement("canvas"); canvas.width = 360; canvas.height = 360;
    const context = canvas.getContext("2d");
    context.fillStyle = "#f4efe2"; context.fillRect(0, 0, 360, 360);
    context.drawImage(image, (image.naturalWidth-side)/2, (image.naturalHeight-side)/2, side, side, 0, 0, 360, 360);
    let quality = .82, crop = canvas.toDataURL("image/jpeg", quality);
    while (crop.length > 380000 && quality > .4) { quality -= .1; crop = canvas.toDataURL("image/jpeg", quality); }
    return crop;
}

function openPhotoMigration() {
    requireAdmin();
    if (!photoStorageConfig.enabled || activePhotoMigration) return;
    const records = adminState.apps.map(entry => ({id:entry.id,data:structuredClone(entry.data)}));
    const candidates = records.filter(entry => isSafePhoto(entry.data.photo) && entry.data.photo.startsWith("data:"));
    const modal = adminCreateModal("adminPhotoMigration", `<div class="admin-modal-card">
        <button type="button" class="admin-modal-close" aria-label="Close">×</button>
        <h3>Transfer existing photos</h3>
        <p>${candidates.length} older inline photos can be transferred. ${records.filter(entry=>isPrivateStudentPhoto(entry.data.photo)).length} photos are already linked to Cloudinary. They will stay visible in the dashboard. Student details and fee records are kept.</p>
        <p>Download and keep the private backup first. It contains the original photos and all loaded records. Already linked photos are skipped.</p>
        <div class="workspace-report-actions"><button type="button" class="admin-ghost-btn" id="photoMigrationBackup">Download original backup</button>
        <button type="button" class="admin-save-btn" id="photoMigrationStart" disabled>Transfer ${candidates.length} photos</button>
        <button type="button" class="admin-ghost-btn" id="photoMigrationStop" hidden>Stop after current photo</button></div>
        <p class="admin-modal-msg" id="photoMigrationMessage" role="status">No records changed.</p></div>`);
    const start = modal.querySelector("#photoMigrationStart"), stop = modal.querySelector("#photoMigrationStop"), backup = modal.querySelector("#photoMigrationBackup");
    const message = modal.querySelector("#photoMigrationMessage");
    backup.onclick = () => {
        requireAdmin();
        downloadFile(JSON.stringify({exportedAt:new Date().toISOString(),project:firebaseConfig.projectId,collection:"applications",records},null,2),"rehaan-original-photos-"+new Date().toISOString().slice(0,10)+".json","application/json");
        start.disabled = !candidates.length;
        message.textContent = "Backup download started. Keep that file safely before transferring photos.";
    };
    start.onclick = async () => {
        if (activePhotoMigration) return;
        const control = {stopped:false}; activePhotoMigration = control;
        start.disabled = true; backup.disabled = true; stop.hidden = false; modal._canClose = false;
        modal.querySelector(".admin-modal-close").disabled = true;
        stop.onclick = () => { control.stopped = true; stop.disabled = true; };
        let completed = 0;
        try {
            for (const entry of candidates) {
                if (control.stopped) break;
                requireAdmin();
                message.textContent = `Transferring photo ${completed+1} of ${candidates.length}…`;
                const crop = await cropExistingPhoto(entry.data.photo);
                const photo = await storeStudentPhoto(crop, adminPhotoToken);
                if (control.stopped) break;
                if (adminState.apps.find(record => record.id === entry.id)?.data.photo !== entry.data.photo) throw new Error("A photograph changed during transfer. Refresh and review it before continuing.");
                await updateDoc(doc(db,"applications",entry.id),{photo});
                completed++;
                message.textContent = `${completed} of ${candidates.length} photos transferred. Photos remain visible in the register.`;
                if (completed < candidates.length) await new Promise(resolve => setTimeout(resolve,7000));
            }
            message.textContent = `${completed} photos transferred. ${control.stopped ? "Stopped; remaining originals are kept. Reopen this tool to continue." : "Finished. Original photos are retained in your downloaded backup."}`;
        } catch (error) {
            message.textContent = `${completed} photos transferred. Stopped: ${error.message || "Could not continue."} Untransferred photos are kept. Refresh and reopen this tool to continue.`;
        } finally {
            if (activePhotoMigration === control) activePhotoMigration = null;
            stop.hidden = true; modal._canClose = true;
            modal.querySelector(".admin-modal-close").disabled = false;
            if (verifiedAdminUid) await loadApplications();
        }
    };
}
