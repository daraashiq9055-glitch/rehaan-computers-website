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
    createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

import {
    getFirestore,
    collection,
    addDoc,
    getDocs,
    doc,
    getDoc,
    deleteDoc,
    updateDoc,
    query,
    orderBy
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


const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const db = getFirestore(app);


/* =========================================================
   EMAILJS
========================================================= */

const EMAILJS_PUBLIC_KEY = "YRae0-hRcye59NaRL";
const EMAILJS_SERVICE_ID = "service_52jdh14";

const EMAILJS_ADMIN_TEMPLATE = "template_ubj4sw3";
const EMAILJS_APPLICANT_TEMPLATE = "template_ka7zy85";

/* optional student approval mail */
const EMAILJS_APPROVAL_TEMPLATE = "template_rehaan_approval";

const ADMISSION_NOTIFY_EMAIL =
    "daraashiq9055@gmail.com";

const ADMISSION_CC_EMAILS =
    "rehanbhat881@gmail.com";

const UPI_ID = "rehaancomputers@upi";
const ADMISSION_FEE = 100;


if (window.emailjs) {
    emailjs.init({
        publicKey: EMAILJS_PUBLIC_KEY
    });
}


/* =========================================================
   COURSE DATA
========================================================= */

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
        timeStyle: "short"
    });
}


function showFormMessage(type, message) {

    const box = getElement("applicationMessage");

    if (!box) {
        return;
    }

    box.className = `form-message ${type}`;

    box.textContent = message;

    box.style.display = "block";
}


/* =========================================================
   MOBILE NAVIGATION
========================================================= */

function initMobileNavigation() {

    const menuButton = getElement("mobileMenuBtn");
    const navMenu = getElement("navMenu");

    if (!menuButton || !navMenu) {
        return;
    }


    menuButton.addEventListener("click", () => {

        const isOpen =
            navMenu.classList.toggle("open");

        menuButton.setAttribute(
            "aria-expanded",
            String(isOpen)
        );

        menuButton.setAttribute(
            "aria-label",
            isOpen ? "Close menu" : "Open menu"
        );

    });


    navMenu.querySelectorAll("a").forEach(link => {

        link.addEventListener("click", () => {

            navMenu.classList.remove("open");

            menuButton.setAttribute(
                "aria-expanded",
                "false"
            );

            menuButton.setAttribute(
                "aria-label",
                "Open menu"
            );

        });

    });

}


/* =========================================================
   NAV ACTIVE SECTION
========================================================= */

function initNavigationHighlight() {

    const navLinks =
        [...document.querySelectorAll(".nav-menu a")];

    if (!navLinks.length) {
        return;
    }


    const sections = [
        ...document.querySelectorAll(
            "main section[id]"
        )
    ];


    const observer = new IntersectionObserver(
        entries => {

            entries.forEach(entry => {

                if (!entry.isIntersecting) {
                    return;
                }

                navLinks.forEach(link => {

                    link.classList.toggle(
                        "active",
                        link.getAttribute("href") ===
                        `#${entry.target.id}`
                    );

                });

            });

        },
        {
            rootMargin: "-35% 0px -55% 0px"
        }
    );


    sections.forEach(section => {
        observer.observe(section);
    });

}


/* =========================================================
   COURSE GRID
========================================================= */

function renderCourseGrid() {

    const grid = getElement("courseGrid");

    if (!grid) {
        return;
    }


    grid.innerHTML = courses.map(
        (course, index) => {

            return `
                <article class="course-card reveal">
                    ${
                        course.img
                            ? `<div class="course-thumb" style="background-image:url('${course.img}')" aria-hidden="true"></div>`
                            : ""
                    }


                    ${
                        index === 0
                            ? '<span class="course-badge">Most Popular</span>'
                            : ""
                    }

                    <div class="course-number">
                        COURSE ${String(index + 1).padStart(2, "0")}
                    </div>

                    <div>
                        <span class="course-category">
                            ${escapeHTML(course.category)}
                        </span>
                    </div>

                    <div class="course-content">

                        <h3>
                            ${escapeHTML(course.title)}
                        </h3>

                        <p>
                            ${escapeHTML(course.overview)}
                        </p>

                        <div class="course-chips">
                            <span>${escapeHTML(course.duration)}</span>
                            <span>${escapeHTML(course.level)}</span>
                            <span>${escapeHTML(course.certificate)}</span>
                        </div>

                        <p class="course-start">
                            Admission fee <b>₹100</b> — Morning, Afternoon &amp; Evening batches
                        </p>

                    </div>

                    <div class="course-card-footer">

                        <strong class="course-fee">
                            ₹999/-
                        </strong>

                        <div class="course-card-actions">

                            <button
                                type="button"
                                class="course-detail-btn"
                                data-course-index="${index}">
                                View Details
                            </button>

                            <button
                                type="button"
                                class="course-apply-btn"
                                data-apply-index="${index}">
                                Apply Now
                            </button>

                        </div>

                    </div>

                </article>
            `;

        }
    ).join("");


    grid.querySelectorAll(
        ".course-detail-btn"
    ).forEach(button => {

        button.addEventListener("click", () => {

            const index =
                Number(button.dataset.courseIndex);

            openCourseModal(index);

        });

    });


    grid.querySelectorAll(
        ".course-apply-btn"
    ).forEach(button => {

        button.addEventListener("click", () => {

            const index =
                Number(button.dataset.applyIndex);

            selectCourseForApplication(index);

        });

    });

}


/*
 * Pre-fill the admission form with a course and
 * bring the applicant to the form. Shared by the
 * course cards and the course modal.
 */

function selectCourseForApplication(index) {

    const course = courses[index];

    if (!course) {
        return;
    }


    const select =
        getElement("coursePreference");

    if (select) {

        select.value = course.title;

        select.classList.remove("flash");

        void select.offsetWidth;

        select.classList.add("flash");

        select.addEventListener(
            "animationend",
            () => select.classList.remove("flash"),
            { once: true }
        );

    }


    closeCourseModal();


    const admission =
        getElement("admission");

    if (admission) {

        admission.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

    }

}


/* =========================================================
   COURSE SELECT
========================================================= */

function populateCourseSelect() {

    const select =
        getElement("coursePreference");

    if (!select) {
        return;
    }


    /*
       Important:
       Only this select is populated.
       Qualification is NEVER overwritten.
    */

    select.innerHTML = `
        <option value="">
            Select Course
        </option>
    `;


    courses.forEach(course => {

        const option =
            document.createElement("option");

        option.value = course.title;

        option.textContent =
            `${course.title} — ₹999/-`;

        select.appendChild(option);

    });

}


/* =========================================================
   COURSE MODAL
========================================================= */

let currentCourseIndex = 0;


function openCourseModal(index) {

    const modal = getElement("courseModal");

    if (!modal) {
        return;
    }


    if (
        index < 0 ||
        index >= courses.length
    ) {
        index = 0;
    }


    currentCourseIndex = index;

    updateCourseModal();

    modal.classList.add("active");

    modal.setAttribute(
        "aria-hidden",
        "false"
    );

    document.body.classList.add("modal-open");

}


function closeCourseModal() {

    const modal = getElement("courseModal");

    if (!modal) {
        return;
    }


    modal.classList.remove("active");

    modal.setAttribute(
        "aria-hidden",
        "true"
    );

    document.body.classList.remove("modal-open");

}


function updateCourseModal() {

    const course =
        courses[currentCourseIndex];

    if (!course) {
        return;
    }


    const number =
        getElement("detailNumber");

    const category =
        getElement("detailCategory");

    const counter =
        getElement("courseCounter");

    const title =
        getElement("detailTitle");

    const subtitle =
        getElement("detailSubtitle");

    const overview =
        getElement("detailOverview");

    const learn =
        getElement("detailLearn");

    const practical =
        getElement("detailPractical");

    const who =
        getElement("detailWho");

    const skills =
        getElement("detailSkills");

    const duration =
        getElement("detailDuration");

    const level =
        getElement("detailLevel");

    const certificate =
        getElement("detailCertificate");


    if (number) {
        number.textContent =
            `COURSE ${String(currentCourseIndex + 1).padStart(2, "0")}`;
    }


    if (category) {
        category.textContent =
            course.category;
    }


    if (counter) {
        counter.textContent =
            `${currentCourseIndex + 1} / ${courses.length}`;
    }


    if (title) {
        title.textContent =
            course.title;
    }


    if (subtitle) {
        subtitle.textContent =
            course.subtitle;
    }


    if (overview) {
        overview.textContent =
            course.overview;
    }


    if (learn) {

        learn.innerHTML =
            course.learn.map(
                item => `<li>${escapeHTML(item)}</li>`
            ).join("");

    }


    const syllabusBox =
        getElement("detailSyllabus");

    if (syllabusBox) {

        syllabusBox.innerHTML =
            (course.syllabus || [])
                .map(
                    section => `
                        <div class="syllabus-module">
                            <h5>${escapeHTML(section.module)}</h5>
                            <ul>
                                ${section.items.map(item => `<li>${escapeHTML(item)}</li>`).join("")}
                            </ul>
                        </div>
                    `
                )
                .join("");

    }


    if (practical) {
        practical.textContent =
            course.practical;
    }


    if (who) {
        who.textContent =
            course.who;
    }


    if (skills) {

        skills.innerHTML =
            course.skills.map(
                item => `
                    <span>
                        ${escapeHTML(item)}
                    </span>
                `
            ).join("");

    }


    if (duration) {
        duration.textContent =
            course.duration;
    }


    if (level) {
        level.textContent =
            course.level;
    }


    if (certificate) {
        certificate.textContent =
            course.certificate;
    }

}


function initCourseModal() {

    const closeButton =
        getElement("courseModalClose");

    const overlay =
        getElement("courseModalOverlay");

    const previous =
        getElement("previousCourse");

    const next =
        getElement("nextCourse");

    const apply =
        getElement("detailApplyBtn");


    if (closeButton) {
        closeButton.addEventListener(
            "click",
            closeCourseModal
        );
    }


    if (overlay) {
        overlay.addEventListener(
            "click",
            closeCourseModal
        );
    }


    if (previous) {

        previous.addEventListener(
            "click",
            () => {

                currentCourseIndex =
                    currentCourseIndex === 0
                        ? courses.length - 1
                        : currentCourseIndex - 1;

                updateCourseModal();

            }
        );

    }


    if (next) {

        next.addEventListener(
            "click",
            () => {

                currentCourseIndex =
                    currentCourseIndex === courses.length - 1
                        ? 0
                        : currentCourseIndex + 1;

                updateCourseModal();

            }
        );

    }


    if (apply) {

        apply.addEventListener(
            "click",
            () => selectCourseForApplication(
                currentCourseIndex
            )
        );

    }


    document.addEventListener(
        "keydown",
        event => {

            if (event.key === "Escape") {
                closeCourseModal();
            }

        }
    );

}


/* =========================================================
   ATTENDANCE AUTH
========================================================= */

let attendanceApp = null;
let attendanceAuth = null;


function getAttendanceAuth() {

    if (!attendanceAuth) {

        const existingApps =
            getApps();

        const existingAttendanceApp =
            existingApps.find(
                item => item.name === "attendanceApp"
            );


        attendanceApp =
            existingAttendanceApp ||
            initializeApp(
                firebaseConfig,
                "attendanceApp"
            );


        attendanceAuth =
            getAuth(attendanceApp);

    }


    return attendanceAuth;

}


/* =========================================================
   ATTENDANCE UI
========================================================= */

function updateAttendanceFields() {

    const selected =
        document.querySelector(
            'input[name="attendanceSetup"]:checked'
        );


    const fields =
        getElement("attendancePasswordFields");

    const email =
        getElement("attendanceEmail");

    const password =
        getElement("attendancePassword");

    const confirm =
        getElement("confirmAttendancePassword");


    if (!selected || !fields) {
        return;
    }


    const setup =
        selected.value === "setup";


    if (setup) {

        fields.classList.remove(
            "attendance-hidden"
        );

        if (email) {
            email.required = true;
        }

        if (password) {
            password.required = true;
        }

        if (confirm) {
            confirm.required = true;
        }

    } else {

        fields.classList.add(
            "attendance-hidden"
        );

        if (email) {
            email.required = false;
        }

        if (password) {
            password.required = false;
        }

        if (confirm) {
            confirm.required = false;
        }

    }

}


function initAttendanceUI() {

    document
        .querySelectorAll(
            'input[name="attendanceSetup"]'
        )
        .forEach(radio => {

            radio.addEventListener(
                "change",
                updateAttendanceFields
            );

        });


    updateAttendanceFields();

}


/* =========================================================
   INPUT CLEANING
========================================================= */

function initPhoneInputs() {

    [
        getElement("phone"),
        getElement("guardianPhone")
    ].forEach(input => {

        if (!input) {
            return;
        }


        input.addEventListener(
            "input",
            () => {

                input.value =
                    input.value
                        .replace(/\D/g, "")
                        .slice(0, 10);

            }
        );

    });

}


/* =========================================================
   APPLICATION VALIDATION
========================================================= */

function validateApplication(data) {

    if (!data.photoUploaded) {

        return {
            valid: false,
            message: "Please upload the student's passport-size photograph in the square box at the top of the form."
        };

    }


    if (!data.fullName || data.fullName.length < 2) {

        return {
            valid: false,
            message: "Please enter the student's full name."
        };

    }


    if (!data.parentName || data.parentName.length < 2) {

        return {
            valid: false,
            message: "Please enter the parent / guardian name."
        };

    }


    if (!isValidPhone(data.phone)) {

        return {
            valid: false,
            message: "Student phone number must contain exactly 10 digits."
        };

    }


    if (
        data.guardianPhone &&
        !isValidPhone(data.guardianPhone)
    ) {

        return {
            valid: false,
            message: "Guardian phone number must contain exactly 10 digits."
        };

    }


    if (!isValidEmail(data.email)) {

        return {
            valid: false,
            message: "Please enter a valid student email."
        };

    }


    if (!data.dob) {

        return {
            valid: false,
            message: "Please select the date of birth."
        };

    }


    if (!data.qualification) {

        return {
            valid: false,
            message: "Please select a qualification."
        };

    }


    if (!data.coursePreference) {

        return {
            valid: false,
            message: "Please select a course."
        };

    }


    if (!data.batch) {

        return {
            valid: false,
            message: "Please select a preferred batch."
        };

    }


    if (!data.address || data.address.length < 3) {

        return {
            valid: false,
            message: "Please enter the address."
        };

    }


    if (!data.agreement) {

        return {
            valid: false,
            message: "Please confirm that the information is correct."
        };

    }


    if (data.attendanceSetup === "setup") {

        if (!isValidEmail(data.attendanceEmail)) {

            return {
                valid: false,
                message: "Please enter a valid attendance email."
            };

        }


        if (data.attendancePassword.length < 6) {

            return {
                valid: false,
                message: "Attendance password must be at least 6 characters."
            };

        }


        if (
            data.attendancePassword !==
            data.confirmAttendancePassword
        ) {

            return {
                valid: false,
                message: "Attendance passwords do not match."
            };

        }

    }


    return {
        valid: true
    };

}


/* =========================================================
   EMAILJS
========================================================= */

async function sendAdminEmail(params) {

    if (!window.emailjs) {
        throw new Error("EmailJS is not available.");
    }


    return emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_ADMIN_TEMPLATE,
        params
    );

}


async function sendApplicantEmail(params) {

    if (!window.emailjs) {
        throw new Error("EmailJS is not available.");
    }


    return emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_APPLICANT_TEMPLATE,
        params
    );

}


/* =========================================================
   APPLICATION SUBMISSION
========================================================= */

async function submitApplication(event) {

    event.preventDefault();


    const form =
        getElement("applicationForm");

    const submitButton =
        getElement("applicationSubmit");


    if (!form || !submitButton) {
        return;
    }


    const fullName =
        getElement("fullName").value.trim();

    const parentName =
        getElement("parentName").value.trim();

    const phone =
        getElement("phone").value.trim();

    const guardianPhone =
        getElement("guardianPhone").value.trim();

    const email =
        getElement("email").value.trim();

    const dob =
        getElement("dob").value;

    const qualification =
        getElement("qualification").value;

    const coursePreference =
        getElement("coursePreference").value;

    const batch =
        getElement("batch").value;

    const source =
        getElement("source").value;

    const address =
        getElement("address").value.trim();

    const attendanceSetup =
        document.querySelector(
            'input[name="attendanceSetup"]:checked'
        )?.value || "skip";

    const attendanceEmail =
        getElement("attendanceEmail").value.trim();

    const attendancePassword =
        getElement("attendancePassword").value;

    const confirmAttendancePassword =
        getElement("confirmAttendancePassword").value;

    const message =
        getElement("message").value.trim();

    const agreement =
        getElement("agreement").checked;


    const data = {

        fullName,
        parentName,
        phone,
        guardianPhone,
        email,
        dob,
        qualification,
        coursePreference,
        batch,
        source,
        address,
        attendanceSetup,
        attendanceEmail,
        attendancePassword,
        confirmAttendancePassword,
        message,
        agreement,
        photoUploaded: Boolean(studentPhotoDataUrl)

    };


    const validation =
        validateApplication(data);


    if (!validation.valid) {

        showFormMessage(
            "error",
            validation.message
        );

        return;

    }


    submitButton.disabled = true;

    submitButton.textContent =
        "Submitting Application...";


    showFormMessage(
        "info",
        "Please wait while your application is being submitted."
    );


    let attendanceUser = null;


    try {

        /*
         * Create attendance account first when requested.
         *
         * This uses the SECONDARY Firebase Auth instance,
         * so the main/admin Firebase session is not replaced.
         */

        if (
            attendanceSetup === "setup"
        ) {

            try {

                const attendanceAuthInstance =
                    getAttendanceAuth();


                const credentials =
                    await createUserWithEmailAndPassword(
                        attendanceAuthInstance,
                        attendanceEmail,
                        attendancePassword
                    );


                attendanceUser =
                    credentials.user;

            } catch (attendanceError) {

                console.error(
                    "Attendance account error:",
                    attendanceError
                );


                let message =
                    "Could not create the attendance account.";


                if (
                    attendanceError.code ===
                    "auth/email-already-in-use"
                ) {

                    message =
                        "That attendance email is already registered. Please use another email.";

                } else if (
                    attendanceError.code ===
                    "auth/invalid-email"
                ) {

                    message =
                        "The attendance email is invalid.";

                } else if (
                    attendanceError.code ===
                    "auth/weak-password"
                ) {

                    message =
                        "The attendance password is too weak.";

                }


                throw new Error(message);

            }

        }


        /*
         * Save application to Firestore.
         */

        const createdAt =
            new Date().toISOString();


        const applicationData = {

            fullName,
            parentName,
            phone,
            guardianPhone,
            email,
            dob,
            qualification,
            address,
            coursePreference,
            batch,
            source,
            attendanceSetup,

            attendanceEmail:
                attendanceSetup === "setup"
                    ? attendanceEmail
                    : "",

            attendanceUid:
                attendanceUser
                    ? attendanceUser.uid
                    : "",

            message,

            photo: studentPhotoDataUrl || "",

            payment: {
                status: "awaiting",
                amount: ADMISSION_FEE
            },

            status: "New",

            createdAt

        };


        const applicationDocRef =
            await addDoc(
                collection(db, "applications"),
                applicationData
            );


        /*
         * EmailJS parameters.
         */

        const emailParams = {

            to_email: ADMISSION_NOTIFY_EMAIL,

            cc_email: ADMISSION_CC_EMAILS,

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


        setStudentPhoto("");


        /*
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


        updateAttendanceFields();


        submitButton.disabled = false;

        submitButton.textContent =
            "Submit Application";


        window.scrollTo({
            top:
                document.getElementById(
                    "admission"
                )?.offsetTop || 0,
            behavior: "smooth"
        });


    } catch (error) {

        console.error(
            "Application submission error:",
            error
        );


        showFormMessage(
            "error",
            error.message ||
            "Could not submit the application. Please try again."
        );


        submitButton.disabled = false;

        submitButton.textContent =
            "Submit Application";

    }

}


/* =========================================================
   PASSPORT PHOTO UPLOAD (student form)
========================================================= */

let studentPhotoDataUrl = "";


function setStudentPhoto(dataUrl) {

    studentPhotoDataUrl = dataUrl || "";

    const box = getElement("photoBox");
    const preview = getElement("photoPreview");
    const prompt = getElement("photoPrompt");
    const remove = getElement("photoRemove");

    if (!preview || !prompt) {
        return;
    }

    if (studentPhotoDataUrl) {

        preview.src = studentPhotoDataUrl;
        preview.hidden = false;
        prompt.hidden = true;

        if (remove) {
            remove.hidden = false;
        }

        box?.classList.add("has-photo");

    } else {

        preview.removeAttribute("src");
        preview.hidden = true;
        prompt.hidden = false;

        if (remove) {
            remove.hidden = true;
        }

        box?.classList.remove("has-photo");

    }

}


function handlePhotoFile(file) {

    processPassportPhoto(file, (error, dataUrl) => {

        if (error) {

            showFormMessage("error", error);
            return;

        }

        setStudentPhoto(dataUrl);

    });

}


function assessPassportPhoto(img, type) {

    if (img.width < 240 || img.height < 240) {

        return "That image is too small to be a real passport photo (minimum 240 × 240 pixels). Please upload the original photograph.";

    }

    const S = 96;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    canvas.width = S;
    canvas.height = S;
    ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, S, S);

    let data;

    try {
        data = ctx.getImageData(0, 0, S, S).data;
    } catch (e) {
        return null;
    }

    const colors = new Set();
    let sum = 0;
    let sumSq = 0;
    let transparent = 0;
    const total = data.length / 4;

    for (let i = 0; i < data.length; i += 4) {

        if (data[i + 3] < 250) {
            transparent++;
        }

        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        sum += 0.2126 * r + 0.7152 * g + 0.0722 * b;
        sumSq += (0.2126 * r + 0.7152 * g + 0.0722 * b) * (0.2126 * r + 0.7152 * g + 0.0722 * b);
        colors.add(((r >> 5) << 6) | ((g >> 5) << 3) | (b >> 5));

    }

    if (type === "image/png" && transparent / total > 0.06) {

        return "The image has transparent areas — a passport photograph must be a solid photo (JPG), not a cut-out or sticker.";

    }

    const mean = sum / total;
    const stdev = Math.sqrt(Math.max(0, sumSq / total - mean * mean));

    if (stdev < 10 || colors.size < 20) {

        return "That doesn't look like a real photograph — it is flat or graphic (like a logo or blank image). Please upload the student's actual passport-size photo.";

    }

    return null;

}


function processPassportPhoto(file, done) {

    if (!file) {
        return;
    }

    if (!/^image\/(jpeg|jpg|png)$/.test(file.type || "")) {

        done("The photo must be a JPG or PNG image — a real passport-size photograph.");
        return;

    }

    if (file.size < 10000) {

        done("That image file is too small (under 10 KB) to be a real photograph. Upload the original passport-size photo.");
        return;

    }

    const reader = new FileReader();

    reader.onload = () => {

        const img = new Image();

        img.onload = () => {

            const problem = assessPassportPhoto(img, file.type);

            if (problem) {
                done(problem);
                return;
            }

            const SIZE = 360;
            const canvas = document.createElement("canvas");
            canvas.width = SIZE;
            canvas.height = SIZE;

            const ctx = canvas.getContext("2d");
            ctx.fillStyle = "#f4efe2";
            ctx.fillRect(0, 0, SIZE, SIZE);

            const side = Math.min(img.width, img.height);

            ctx.drawImage(
                img,
                (img.width - side) / 2,
                (img.height - side) / 2,
                side,
                side,
                0, 0, SIZE, SIZE
            );

            let quality = 0.82;
            let dataUrl = canvas.toDataURL("image/jpeg", quality);

            while (dataUrl.length > 380000 && quality > 0.4) {
                quality -= 0.1;
                dataUrl = canvas.toDataURL("image/jpeg", quality);
            }

            if (dataUrl.length > 500000) {

                done("That photo is too large to upload — please retake it in good light and try again.");
                return;

            }

            done(null, dataUrl);

        };

        img.onerror = () => done("Could not read that image. Please try another photo.");

        img.src = reader.result;

    };

    reader.onerror = () => done("Could not read that file. Please try another photo.");

    reader.readAsDataURL(file);

}


function initPhotoUpload() {

    const box = getElement("photoBox");
    const input = getElement("studentPhoto");
    const remove = getElement("photoRemove");

    if (!box || !input) {
        return;
    }

    box.addEventListener("click", event => {

        if (event.target === remove) {
            return;
        }

        input.click();

    });

    box.addEventListener("keydown", event => {

        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            input.click();
        }

    });

    box.addEventListener("dragover", event => event.preventDefault());

    box.addEventListener("drop", event => {

        event.preventDefault();

        const file = event.dataTransfer?.files?.[0];

        if (file) {
            handlePhotoFile(file);
        }

    });

    input.addEventListener("change", () => {

        if (input.files && input.files[0]) {
            handlePhotoFile(input.files[0]);
        }

    });

    remove?.addEventListener("click", event => {

        event.stopPropagation();
        input.value = "";
        setStudentPhoto("");

    });

}


/* =========================================================
   ₹100 ADMISSION FEE — PAYMENT STEP
========================================================= */

let paymentApplicationId = null;


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

}


function initPaymentStep() {

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

    getElement("copyUpiBtn")?.addEventListener(
        "click",
        () => {

            const finish = () => {

                const button = getElement("copyUpiBtn");

                if (button) {
                    button.textContent = "Copied ✓";
                    setTimeout(() => {
                        if (button) {
                            button.textContent = "Copy";
                        }
                    }, 1500);
                }

            };

            const fallback = () => {

                try {

                    const area = document.createElement("textarea");
                    area.value = UPI_ID;
                    area.style.position = "fixed";
                    area.style.opacity = "0";
                    document.body.appendChild(area);
                    area.select();
                    document.execCommand("copy");
                    area.remove();
                    finish();

                } catch (copyError) {
                    /* clipboard unavailable — silently skip */
                }

            };

            if (navigator.clipboard && navigator.clipboard.writeText) {

                navigator.clipboard.writeText(UPI_ID)
                    .then(finish)
                    .catch(fallback);

            } else {
                fallback();
            }

        }
    );

}


/* =========================================================
   ADMIN: ADMISSION NUMBER, APPROVE & FEE VERIFICATION
========================================================= */

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

            if (window.emailjs && data.email) {

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
                emailError
            );

        }


        await loadApplications();

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

        console.error("Admission number save failed:", error);

    }

}


/* =========================================================
   APPLICATION FORM INIT
========================================================= */

function initApplicationForm() {

    const form =
        getElement("applicationForm");


    if (!form) {
        return;
    }


    form.addEventListener(
        "submit",
        submitApplication
    );

}


/* =========================================================
   ADMIN VERIFICATION
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

    const loginCard =
        getElement("adminLoginCard");

    const dashboard =
        getElement("adminDashboard");


    if (dashboard) {
        dashboard.style.display = "none";
    }


    if (loginCard) {
        loginCard.style.display = "block";
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
    tab: "new",
    query: "",
    course: ""
};


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
            maxAdmission = Math.max(maxAdmission, parseInt(match[1], 10));
        }

    });

    return String(maxAdmission + 1).padStart(3, "0");

}


async function loadApplications() {

    const list = getElement("applicationsList");

    if (!list) {
        return;
    }

    adminEnsureToolbar();

    list.innerHTML = `
        <div class="admin-loading">
            Loading applications...
        </div>
    `;

    try {

        const applicationsQuery =
            query(
                collection(db, "applications"),
                orderBy("createdAt", "desc")
            );

        const snapshot = await getDocs(applicationsQuery);

        adminState.apps = [];

        snapshot.forEach(entry => {
            adminState.apps.push({
                id: entry.id,
                data: entry.data() || {}
            });
        });

        renderAdminList();

    } catch (error) {

        console.error("Loading applications error:", error);

        list.innerHTML = `
            <div class="admin-error">
                <h3>Could Not Load Applications</h3>
                <p>${escapeHTML(error.message || "Firestore could not return the applications.")}</p>
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
                <button type="button" class="admin-tab is-active" data-tab="new">New Applications</button>
                <button type="button" class="admin-tab" data-tab="enrolled">Enrolled Students</button>
                <button type="button" class="admin-tab" data-tab="all">All Records</button>
            </div>
            <div class="admin-tools">
                <input id="adminSearch" class="admin-search" type="search" placeholder="Search name, phone, email or admission no…" autocomplete="off">
                <select id="adminCourseFilter" class="admin-select"><option value="">All courses</option></select>
                <button type="button" id="adminCsvBtn" class="admin-action-button">Export CSV</button>
                <button type="button" id="adminAddBtn" class="admin-add-student-btn">+ Add Student (Offline)</button>
            </div>
        </div>
    `;

    title.parentNode.insertBefore(bar, title.nextSibling);

    bar.querySelectorAll(".admin-tab").forEach(tab => {
        tab.addEventListener("click", () => {
            bar.querySelectorAll(".admin-tab").forEach(x => x.classList.remove("is-active"));
            tab.classList.add("is-active");
            adminState.tab = tab.dataset.tab;
            renderAdminList();
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

    bar.querySelector("#adminCsvBtn").addEventListener("click", exportAdminCsv);
    bar.querySelector("#adminAddBtn").addEventListener("click", openAddStudentModal);

}


function adminFilteredApps() {

    let arr = adminState.apps.slice();

    if (adminState.tab === "new") {
        arr = arr.filter(a => !adminIsEnrolled(a.data));
    } else if (adminState.tab === "enrolled") {
        arr = arr.filter(a => adminIsEnrolled(a.data));
    }

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
                a.data.admissionNumber
            ].some(v => String(v || "").toLowerCase().includes(adminState.query))
        ));
    }

    return arr;

}


function renderAdminList() {

    const list = getElement("applicationsList");

    if (!list) {
        return;
    }

    const total = adminState.apps.length;
    const enrolled = adminState.apps.filter(a => adminIsEnrolled(a.data)).length;
    const feePaidCount = adminState.apps.filter(a => a.data.payment && a.data.payment.status === "paid").length;

    const stats = document.getElementById("adminStats");

    if (stats) {

        stats.innerHTML = [
            [total, "Total Records"],
            [total - enrolled, "Awaiting Approval"],
            [enrolled, "Enrolled Students"],
            ["₹" + (feePaidCount * ADMISSION_FEE), "Admission Fees Collected"]
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

        const card = document.createElement("article");

        card.className =
            "application-card application-row" + (approved ? " is-enrolled" : "");

        card.dataset.applicationId = id;

        const photoCell = /^data:image\//.test(data.photo || "")
            ? `<button type="button" class="row-photo zoomable" data-photo-zoom aria-label="View full photo of ${escapeHTML(data.fullName || "applicant")}"><img src="${data.photo}" alt="Applicant photo"></button>`
            : `<div class="row-photo row-photo-empty" title="No uploaded photo">${escapeHTML(String(data.fullName || "?").trim().slice(0, 1).toUpperCase())}</div>`;

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
                    <span class="row-phone">${escapeHTML(data.phone || "—")}</span>
                    <span class="fee-chip ${paid ? "fee-ok" : "fee-pending"}">₹${ADMISSION_FEE}: ${escapeHTML(paymentLabel(data.payment))}</span>
                </div>
            </div>
            <div class="row-actions">
                <div class="admission-entry"><span>Adm No</span><input class="admission-no-input" type="text" maxlength="10" placeholder="${nextAdm}" value="${escapeHTML(data.admissionNumber || "")}" data-application-id="${escapeHTML(id)}"></div>
                <button type="button" class="mark-paid-btn" data-act="fee" ${paid ? "disabled" : ""}>${paid ? "✓ Fee Paid" : "Mark Fee Paid"}</button>
                <button type="button" class="approve-application-btn" data-act="approve" data-next-admission="${nextAdm}" ${approved ? "disabled" : ""}>${approved ? "✓ Approved" : "Approve"}</button>
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

    });

}


/* =========================================================
   ADMIN: FULL PHOTO VIEWER (click any student photo)
========================================================= */

function openAdminPhotoViewer(name, photoUrl, admissionNumber) {

    if (!/^data:image\//.test(photoUrl || "")) {
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

    box.querySelector("img").src = photoUrl;
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
            <span class="admin-modal-kicker">FULL APPLICATION · EDIT</span>
            <div class="admin-details-top">
                ${/^data:image\//.test(data.photo || "")
                    ? `<button type="button" class="row-photo zoomable admin-details-photo" data-photo-zoom aria-label="View full photo"><img src="${data.photo}" alt="Applicant photo"></button>`
                    : '<div class="row-photo row-photo-empty admin-details-photo">?</div>'}
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
                ${adminField("Qualification", data.qualification)}
                ${adminField("Course", data.coursePreference || data.course)}
                ${adminField("Attendance Setup", data.attendanceSetup === "setup" ? "Requested" : "Skipped")}
                ${adminField("Source", data.source)}
                ${adminField("Approved On", data.approvedAt ? formatDate(data.approvedAt) : "—")}
                ${adminField("Address", data.address, true)}
                ${adminField("Message", data.message, true)}
                ${adminField("Admission Fee", paymentLabel(data.payment), true)}
            </div>
            <div class="admin-edit-row">
                <label>Admission No<input class="admin-edit-adm" type="text" maxlength="10" value="${escapeHTML(data.admissionNumber || "")}" placeholder="${nextAdmissionNumber()}"></label>
                <label>Batch<select class="admin-edit-batch">${["Morning", "Afternoon", "Evening"].concat(data.batch && !["Morning", "Afternoon", "Evening"].includes(data.batch) ? [data.batch] : []).map(b => `<option ${data.batch === b ? "selected" : ""}>${escapeHTML(b)}</option>`).join("")}</select></label>
                <label>Fee Status<select class="admin-edit-fee">${[
                    ["pending", "Pending (fee not received)"],
                    ["at_centre", "Will pay at centre"],
                    ["claimed", "Claimed online — verify"],
                    ["paid", "Paid — verified"]
                ].map(opt => `<option value="${opt[0]}" ${((data.payment && data.payment.status) || "pending") === opt[0] ? "selected" : ""}>${opt[1]}</option>`).join("")}</select></label>
                <label class="admin-edit-wide">Admin Note (private)<input class="admin-edit-note" type="text" value="${escapeHTML(data.adminNote || "")}"></label>
                <label class="admin-edit-wide">Record Status<select class="admin-edit-status"><option ${data.status !== "Approved" ? "selected" : ""}>New</option><option ${data.status === "Approved" ? "selected" : ""}>Approved</option></select></label>
            </div>
            <button type="button" class="admin-save-btn">Save Changes</button>
            <p class="admin-modal-msg" hidden></p>
        </div>
    `);

    modal.querySelector("[data-photo-zoom]")?.addEventListener(
        "click",
        () => openAdminPhotoViewer(data.fullName, data.photo, data.admissionNumber)
    );

    modal.querySelector(".admin-save-btn").addEventListener("click", async () => {

        const btn = modal.querySelector(".admin-save-btn");
        const msg = modal.querySelector(".admin-modal-msg");

        const feeVal = modal.querySelector(".admin-edit-fee").value;

        const patch = {
            admissionNumber: modal.querySelector(".admin-edit-adm").value.trim(),
            batch: modal.querySelector(".admin-edit-batch").value,
            adminNote: modal.querySelector(".admin-edit-note").value.trim(),
            status: modal.querySelector(".admin-edit-status").value,
            payment: Object.assign({}, data.payment || {}, {
                status: feeVal,
                amount: ADMISSION_FEE,
                verified: feeVal === "paid",
                updatedAt: new Date().toISOString()
            })
        };

        if (patch.status === "Approved" && data.status !== "Approved") {
            patch.approvedAt = new Date().toISOString();
        }

        btn.disabled = true;
        btn.textContent = "Saving…";

        try {

            await updateDoc(doc(db, "applications", applicationId), patch);

            msg.hidden = false;
            msg.textContent = "Saved ✓";
            msg.className = "admin-modal-msg ok";

            await loadApplications();
            setTimeout(() => { modal.hidden = true; }, 800);

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


function adminCreateModal(id, inner) {

    let modal = document.getElementById(id);

    if (!modal) {

        modal = document.createElement("div");
        modal.id = id;
        modal.className = "admin-modal";
        document.body.appendChild(modal);

        modal.addEventListener("click", event => {
            if (event.target === modal) {
                modal.hidden = true;
            }
        });

        document.addEventListener("keydown", event => {
            if (event.key === "Escape") {
                modal.hidden = true;
            }
        });

    }

    modal.innerHTML = inner;
    modal.hidden = false;

    modal.querySelector(".admin-modal-close")?.addEventListener(
        "click",
        () => { modal.hidden = true; }
    );

    return modal;

}


/* =========================================================
   ADMIN: ADD STUDENT (offline walk-in enrolment)
   Fee is recorded as PAID ₹100 (received at centre).
========================================================= */

function openAddStudentModal() {

    let photoData = "";

    const courseOptions =
        (typeof courses !== "undefined" && courses.length ? courses : [])
            .map(c => `<option>${escapeHTML(c.name)}</option>`)
            .join("");

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
                <label>Parent / Guardian<input id="addGuardian" type="text" autocomplete="off"></label>
                <label>Phone *<input id="addPhone" type="tel" inputmode="numeric" maxlength="10" autocomplete="off"></label>
                <label>Email<input id="addEmail" type="email" autocomplete="off"></label>
                <label>Date of Birth<input id="addDob" type="date"></label>
                <label>Qualification<select id="addQual"><option value="">—</option>${ADMIN_QUALIFICATIONS.map(q => `<option>${q}</option>`).join("")}</select></label>
                <label>Course *<select id="addCourse">${courseOptions}</select></label>
                <label>Batch<select id="addBatch"><option>Morning</option><option>Afternoon</option><option>Evening</option></select></label>
                <label>Admission No *<input id="addAdm" type="text" maxlength="10" value="${nextAdmissionNumber()}"></label>
                <label class="admin-edit-wide">Address<input id="addAddress" type="text" autocomplete="off"></label>
                <label class="admin-edit-wide">Note (fee receipt, remarks…)<input id="addNote" type="text" autocomplete="off"></label>
            </div>
            <button type="button" class="admin-save-btn" id="addSaveBtn">Save Student</button>
            <p class="admin-modal-msg" id="addMsg" hidden></p>
        </div>
    `);

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
        processPassportPhoto(file, (error, url) => {
            if (error) {
                showPhoto("");
                const msg = modal.querySelector("#addMsg");
                msg.hidden = false;
                msg.className = "admin-modal-msg err";
                msg.textContent = error;
                return;
            }
            showPhoto(url);
        });
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

        if (!admissionNumber) {
            msg.hidden = false; msg.className = "admin-modal-msg err";
            msg.textContent = "An admission number is required for offline enrolment (next suggested: " + nextAdmissionNumber() + ").";
            return;
        }

        const nowIso = new Date().toISOString();

        btn.disabled = true;
        btn.textContent = "Saving…";

        try {

            await addDoc(collection(db, "applications"), {
                fullName,
                parentName: value("addGuardian"),
                phone,
                guardianPhone: "",
                email: value("addEmail"),
                dob: value("addDob"),
                qualification: modal.querySelector("#addQual").value,
                address: value("addAddress"),
                coursePreference: modal.querySelector("#addCourse").value,
                batch: modal.querySelector("#addBatch").value,
                source: "Institute — offline enrolment",
                attendanceSetup: "skip",
                attendanceEmail: "",
                attendanceUid: "",
                message: value("addNote"),
                photo: photoData,
                admissionNumber,
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

            await loadApplications();
            setTimeout(() => { modal.hidden = true; }, 1000);

        } catch (error) {

            msg.hidden = false;
            msg.className = "admin-modal-msg err";
            msg.textContent = "Could not save: " + (error.message || error);

        } finally {
            btn.disabled = false;
            btn.textContent = "Save Student";
        }

    });

}


/* =========================================================
   ADMIN: CSV EXPORT (current tab / filter view)
========================================================= */

function exportAdminCsv() {

    const rows = adminFilteredApps();

    if (!rows.length) {
        return;
    }

    const esc = value => '"' + String(value === undefined || value === null ? "" : value).replace(/"/g, '""') + '"';

    const head = [
        "Admission No", "Name", "Guardian", "Phone", "Email", "DOB",
        "Qualification", "Course", "Batch", "Status", "Source",
        "Admission Fee", "Fee Verified", "Photo", "Applied On",
        "Approved On", "Admin Note"
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
            /^data:image\//.test(d.photo || "") ? "yes" : "no",
            formatDate(d.createdAt),
            d.approvedAt ? formatDate(d.approvedAt) : "",
            d.adminNote || ""
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

async function deleteApplication(
    applicationId,
    button
) {

    if (!applicationId) {
        return;
    }


    const confirmed =
        window.confirm(
            "Are you sure you want to permanently delete this application?"
        );


    if (!confirmed) {
        return;
    }


    if (button) {

        button.disabled = true;

        button.textContent =
            "Deleting...";

    }


    try {

        await deleteDoc(
            doc(
                db,
                "applications",
                applicationId
            )
        );


        await loadApplications();


    } catch (error) {

        console.error(
            "Delete application error:",
            error
        );


        window.alert(
            "Could not delete this application.\n\n" +
            (
                error.message ||
                "Firestore denied the delete request."
            )
        );


        if (button) {

            button.disabled = false;

            button.textContent =
                "Delete Application";

        }

    }

}


/* =========================================================
   ADMIN LOGIN
========================================================= */

async function handleAdminLogin(event) {

    event.preventDefault();


    const email =
        getElement("adminEmail")?.value.trim();

    const password =
        getElement("adminPassword")?.value;


    const button =
        getElement("adminLoginButton");


    if (!email || !password) {

        showAdminMessage(
            "error",
            "Please enter your admin email and password."
        );

        return;

    }


    if (button) {

        button.disabled = true;

        button.textContent =
            "Checking Access...";

    }


    try {

        const credentials =
            await signInWithEmailAndPassword(
                auth,
                email,
                password
            );


        const verification =
            await verifyAdmin(
                credentials.user
            );


        if (!verification.authorized) {

            await signOut(auth);


            showAdminMessage(
                "error",
                verification.reason
            );


            if (button) {

                button.disabled = false;

                button.textContent =
                    "Login to Dashboard";

            }

            return;

        }


        showAdminMessage(
            "success",
            "Administrator verified. Loading dashboard..."
        );


        showAdminDashboard();

        await loadApplications();


    } catch (error) {

        console.error(
            "Admin login error:",
            error
        );


        let message =
            "Could not sign in. Please check your email and password.";


        if (
            error.code ===
            "auth/invalid-credential"
        ) {

            message =
                "Invalid admin email or password.";

        } else if (
            error.code ===
            "auth/user-not-found"
        ) {

            message =
                "No Firebase account was found for this email.";

        } else if (
            error.code ===
            "auth/wrong-password"
        ) {

            message =
                "Incorrect admin password.";

        } else if (
            error.code ===
            "auth/too-many-requests"
        ) {

            message =
                "Too many login attempts. Please try again later.";

        }


        showAdminMessage(
            "error",
            message
        );


        if (button) {

            button.disabled = false;

            button.textContent =
                "Login to Dashboard";

        }

    }

}


/* =========================================================
   ADMIN LOGOUT
========================================================= */

async function handleAdminLogout() {

    try {

        await signOut(auth);

        showAdminLogin();

        const form =
            getElement("adminLoginForm");

        if (form) {
            form.reset();
        }


    } catch (error) {

        console.error(
            "Admin logout error:",
            error
        );

    }

}


/* =========================================================
   ADMIN AUTH STATE
========================================================= */

function initAdminAuthentication() {

    const adminPage =
        document.body.classList.contains(
            "admin-page"
        );


    const adminLoginForm =
        getElement("adminLoginForm");


    /*
     * CRITICAL:
     *
     * The main website does not run admin
     * authentication logic.
     *
     * This prevents the admin panel from
     * appearing on index.html.
     */

    if (
        !adminPage ||
        !adminLoginForm
    ) {
        return;
    }


    adminLoginForm.addEventListener(
        "submit",
        handleAdminLogin
    );


    const logoutButton =
        getElement("adminLogoutBtn");


    if (logoutButton) {

        logoutButton.addEventListener(
            "click",
            handleAdminLogout
        );

    }


    const refreshButton =
        getElement("refreshApplications");


    if (refreshButton) {

        refreshButton.addEventListener(
            "click",
            loadApplications
        );

    }


    /*
     * Back to Website is a normal link
     * in admin.html.
     *
     * It does not modify authentication
     * and does not remove admin access.
     */


    onAuthStateChanged(
        auth,
        async user => {

            if (!user) {

                showAdminLogin();

                return;

            }


            const verification =
                await verifyAdmin(user);


            if (!verification.authorized) {

                await signOut(auth);

                showAdminLogin();

                showAdminMessage(
                    "error",
                    verification.reason
                );

                return;

            }


            showAdminDashboard();

            await loadApplications();

        }
    );

}


/* =========================================================
   INITIALIZE MAIN WEBSITE
========================================================= */

function initMainWebsite() {

    if (
        document.body.classList.contains(
            "admin-page"
        )
    ) {
        return;
    }


    initMobileNavigation();

    initNavigationHighlight();

    renderCourseGrid();

    populateCourseSelect();

    initCourseModal();

    initAttendanceUI();

    initPhoneInputs();

    initPhotoUpload();

    initPaymentStep();

    initApplicationForm();

}


/* =========================================================
   INITIALIZE
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        initMainWebsite();

        initAdminAuthentication();

    }
);