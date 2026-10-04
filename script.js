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
                            Classes start <b>1 October</b> — Morning, Afternoon &amp; Evening batches
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
        agreement

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

            status: "New",

            createdAt

        };


        await addDoc(
            collection(db, "applications"),
            applicationData
        );


        /*
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
            "Application submitted successfully. Our team will contact you soon. To complete your admission, please visit the center with 2 passport-size photographs and a photocopy of your Aadhar card.";


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


        form.reset();


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

async function loadApplications() {

    const list =
        getElement("applicationsList");


    if (!list) {
        return;
    }


    list.innerHTML = `
        <div class="admin-loading">
            Loading applications...
        </div>
    `;


    try {

        const applicationsQuery =
            query(
                collection(db, "applications"),
                orderBy(
                    "createdAt",
                    "desc"
                )
            );


        const snapshot =
            await getDocs(
                applicationsQuery
            );


        if (snapshot.empty) {

            list.innerHTML = `
                <div class="no-applications">

                    <h3>
                        No Applications Yet
                    </h3>

                    <p>
                        New admission applications will appear here.
                    </p>

                </div>
            `;

            return;

        }


        list.innerHTML = "";


        snapshot.forEach(
            (applicationSnapshot, index) => {

                const data =
                    applicationSnapshot.data();

                const id =
                    applicationSnapshot.id;


                const card =
                    document.createElement("article");

                card.className =
                    "application-card";


                card.innerHTML = `

                    <div class="application-card-header">

                        <div>

                            <span class="application-number">
                                APPLICATION ${String(index + 1).padStart(2, "0")}
                            </span>

                            <h3>
                                ${escapeHTML(
                                    data.fullName ||
                                    "Unnamed Applicant"
                                )}
                            </h3>

                        </div>

                        <span class="application-status">
                            ${escapeHTML(
                                data.status || "New"
                            )}
                        </span>

                    </div>


                    <div class="application-grid">

                        ${adminField(
                            "Parent / Guardian",
                            data.parentName
                        )}

                        ${adminField(
                            "Student Phone",
                            data.phone
                        )}

                        ${adminField(
                            "Guardian Phone",
                            data.guardianPhone
                        )}

                        ${adminField(
                            "Email",
                            data.email
                        )}

                        ${adminField(
                            "Date of Birth",
                            data.dob
                        )}

                        ${adminField(
                            "Qualification",
                            data.qualification
                        )}

                        ${adminField(
                            "Course",
                            data.coursePreference
                        )}

                        ${adminField(
                            "Preferred Batch",
                            data.batch
                        )}

                        ${adminField(
                            "Attendance Setup",
                            data.attendanceSetup === "setup"
                                ? "Account Requested"
                                : "Skipped"
                        )}

                        ${adminField(
                            "Attendance Email",
                            data.attendanceEmail
                        )}

                        ${adminField(
                            "Attendance UID",
                            data.attendanceUid
                        )}

                        ${adminField(
                            "Source",
                            data.source
                        )}

                        ${adminField(
                            "Submission Date",
                            formatDate(data.createdAt)
                        )}

                        ${adminField(
                            "Address",
                            data.address,
                            true
                        )}

                        ${adminField(
                            "Message",
                            data.message,
                            true
                        )}

                    </div>


                    <div class="application-actions">

                        <button
                            type="button"
                            class="delete-application-btn"
                            data-application-id="${escapeHTML(id)}">

                            Delete Application

                        </button>

                    </div>
                `;


                list.appendChild(card);

            }
        );


        list.querySelectorAll(
            ".delete-application-btn"
        ).forEach(button => {

            button.addEventListener(
                "click",
                () => deleteApplication(
                    button.dataset.applicationId,
                    button
                )
            );

        });


    } catch (error) {

        console.error(
            "Loading applications error:",
            error
        );


        list.innerHTML = `

            <div class="admin-error">

                <h3>
                    Could Not Load Applications
                </h3>

                <p>
                    ${escapeHTML(
                        error.message ||
                        "Firestore could not return the applications."
                    )}
                </p>

            </div>

        `;

    }

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