import { initStudio } from "./studio.js?v=20261020-visitor-1";
import { initMotion } from "./motion.js?v=20261020-visitor-1";
import {
  courseSlug,
  matchesDuration,
  typingScore,
  recommendCourses,
  brochurePDF,
} from "./model.js?v=20261020-visitor-1";
import { initAdmission } from "./admission.js?v=20261020-visitor-1";
const $ = (selector) => document.querySelector(selector);
const scrollBehavior = () =>
  matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
const escape = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ],
  );
const icon = (name) =>
  `<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`;
const contacts = [
  {
    label: "Institute contact 1",
    phone: "919149551258",
    display: "+91 9149551258",
  },
  {
    label: "Institute contact 2",
    phone: "919797205429",
    display: "+91 9797205429",
  },
];
let courses = [],
  site = {},
  filter = "all",
  query = "",
  duration = "all",
  dialogKind = "",
  detailId = 0,
  admission,
  toastTimer;
let saved = new Set(),
  comparison = new Set(),
  finderAnswers = {},
  finderStep = 0;
const storageKey = "rehaan-visitor-saved-courses-v1",
  dialog = $("#featureDialog");
function toast(message) {
  clearTimeout(toastTimer);
  $("#toast").textContent = message;
  $("#toast").hidden = false;
  toastTimer = setTimeout(() => ($("#toast").hidden = true), 4500);
}
function showDialog(title, body, kind = "general") {
  if (
    document.querySelector(
      "#paymentModal:not([hidden]), #paymentSuccessModal:not([hidden])",
    )
  )
    return;
  dialogKind = kind;
  $("#dialogContent").innerHTML =
    `<h2 id="dialogTitle">${escape(title)}</h2>${body}`;
  if (!dialog.open) dialog.showModal();
  dialog.scrollTop = 0;
  $("#dialogClose").focus();
}
function closeDialog() {
  dialog.close();
  if (location.hash.startsWith("#course="))
    history.replaceState(null, "", "#courses");
  dialogKind = "";
}
$("#dialogClose").addEventListener("click", closeDialog);
dialog.addEventListener("cancel", (event) => {
  event.preventDefault();
  closeDialog();
});
dialog.addEventListener("close", () => {
  if (dialog.open) return;
  if (location.hash.startsWith("#course="))
    history.replaceState(null, "", "#courses");
  $("#dialogContent").replaceChildren();
  dialogKind = "";
});
dialog.addEventListener("click", (event) => {
  if (event.target !== dialog) return;
  const box = dialog.getBoundingClientRect();
  if (
    event.clientX < box.left ||
    event.clientX > box.right ||
    event.clientY < box.top ||
    event.clientY > box.bottom
  )
    closeDialog();
});
function download(blob, name) {
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
function brochure(id) {
  if (!courses[id]) return;
  download(
    brochurePDF(courses[id]),
    "Rehaan-Computers-" + courseSlug(courses[id]) + ".pdf",
  );
  toast(
    "Course brochure downloaded. Admission and tuition details are included.",
  );
}
async function copy(value, success) {
  try {
    await navigator.clipboard.writeText(value);
    toast(success);
  } catch {
    toast("Clipboard unavailable here. Select and copy the text manually.");
  }
}
function loadSaved() {
  try {
    const data = JSON.parse(localStorage.getItem(storageKey) || "[]");
    if (Array.isArray(data))
      saved = new Set(
        data.filter(
          (value) =>
            typeof value === "string" &&
            courses.some((course) => courseSlug(course) === value),
        ),
      );
  } catch {
    saved = new Set();
  }
}
function persistSaved() {
  try {
    localStorage.setItem(storageKey, JSON.stringify([...saved]));
  } catch {
    toast(
      "Saving is unavailable in this browser. Your course choices are kept for this page session.",
    );
  }
}
function toggleSaved(id) {
  const slug = courseSlug(courses[id]);
  saved.has(slug) ? saved.delete(slug) : saved.add(slug);
  persistSaved();
  cards();
  if (dialogKind === "course" && id === detailId) {
    const button = $("#dialogContent [data-action=save]");
    if (button) {
      button.setAttribute("aria-pressed", String(saved.has(slug)));
      button.innerHTML =
        icon("bookmark") + (saved.has(slug) ? "Saved" : "Save course");
    }
  }
}
function categoryMatches(course) {
  if (filter === "all" || filter === "saved") return true;
  if (filter === "basics")
    return [
      "Computer Diploma",
      "Computer Certificate",
      "Crash Course",
    ].includes(course.category);
  if (filter === "accounting") return course.category.includes("Accounting");
  return course.category === "Typing";
}
// Original photographs and actual software interfaces, selected per course.
// Keep the curriculum snapshot intact; presentation assets are mapped separately.
const courseImages = {
  "One Year Computer Diploma Course": [
    "hero-library.jpg",
    "Learners studying together with a laptop",
  ],
  "Six Month Computer Certificate Course": [
    "word-doc.jpg",
    "Microsoft Word document tools and workspace",
  ],
  "Three Month Computer Certificate Course": [
    "excel-desk.jpg",
    "A learner working with a spreadsheet on a laptop",
  ],
  "Typing Diploma Course": [
    "typing-keys.jpg",
    "Hands practising on a computer keyboard",
  ],
  "Tally Prime with GST — Detailed Course": [
    "tally-prime.jpg",
    "Actual Tally Prime educational interface and company menu",
  ],
  "Crash Computer Course": [
    "excel-sheet.jpg",
    "A practical spreadsheet with quantities, prices and formulas",
  ],
  "Marg ERP 9 Course": [
    "marg-erp.jpg",
    "Actual Marg ERP billing, inventory and business reports interface",
  ],
};
function courseArtwork(course) {
  const [file, alt] = courseImages[course.title];
  return { src: "assets/" + file, alt };
}
function cards() {
  const visible = courses
    .map((course, id) => ({ course, id }))
    .filter(
      ({ course }) =>
        categoryMatches(course) &&
        matchesDuration(course, duration) &&
        (filter !== "saved" || saved.has(courseSlug(course))) &&
        [
          course.title,
          course.overview,
          course.category,
          ...course.learn,
          ...course.skills,
        ]
          .join(" ")
          .toLowerCase()
          .includes(query),
    );
  $("#courseGrid").innerHTML = visible
    .map(
      ({ course, id }) =>
        `<article class="course-card"><div class="course-image${course.category.includes("Accounting") ? " course-software" : ""}"><img src="${courseArtwork(course).src}" alt="${escape(courseArtwork(course).alt)}" loading="lazy"><span class="course-number">LEARNING PATH / ${String(id + 1).padStart(2, "0")}</span><button class="save-course" data-action="save" data-id="${id}" aria-label="${saved.has(courseSlug(course)) ? "Unsave" : "Save"} ${escape(course.title)}" aria-pressed="${saved.has(courseSlug(course))}">${icon("bookmark")}</button></div><div class="course-body"><span class="course-category">${escape(course.category)}</span><h3>${escape(course.title)}</h3><p>${escape(course.overview)}</p><div class="course-meta"><span>${escape(course.duration)}</span><span>${escape(course.level)}</span></div></div><div class="course-actions"><button data-action="course" data-id="${id}">Explore syllabus ${icon("arrow")}</button><button data-action="apply" data-id="${id}">Apply now ${icon("arrow")}</button></div><div class="course-bottom"><label><input type="checkbox" data-compare="${id}" ${comparison.has(id) ? "checked" : ""}>Compare</label><button data-action="pdf" data-id="${id}">${icon("download")}Brochure</button></div></article>`,
    )
    .join("");
  $("#courseCount").textContent =
    `${visible.length} of ${courses.length} courses · ₹100 admission fee; tuition is separate`;
  $("#emptyCourses").hidden = visible.length > 0;
  $("#emptyMessage").textContent =
    filter === "saved" && !saved.size
      ? "Save a course using its bookmark button. Only course choices are stored on this device."
      : "Try a different search or reset your filters.";
  $("#savedCount").textContent = saved.size;
  document
    .querySelectorAll("[data-filter]")
    .forEach((button) =>
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.filter === filter),
      ),
    );
}
function resetFilters() {
  filter = "all";
  query = "";
  duration = "all";
  $("#courseSearch").value = "";
  $("#durationFilter").value = "all";
  cards();
}
function comparisonTray() {
  const size = comparison.size;
  $("#compareTray").hidden = !size;
  $("#compareCount").textContent = `${size} of 3 courses selected`;
  $("#compareOpen").disabled = size < 2;
  $("#compareTray small").textContent =
    size < 2
      ? "Choose one more course to compare."
      : "Your learning paths, side by side.";
}
function compareCourses() {
  if (comparison.size < 2) return;
  const ids = [...comparison],
    rows = [
      ["Duration", (course) => course.duration],
      ["Starting level", (course) => course.level],
      ["Who it is for", (course) => course.who],
      ["What you learn", (course) => course.learn.join(" · ")],
      ["Practical work", (course) => course.practical],
      ["Certificate", (course) => course.certificate],
      [
        "Admission",
        () =>
          "₹100 one-time fee. Tuition separate; confirm course fees with the centre.",
      ],
    ];
  showDialog(
    "Find the path that fits you.",
    `<p>Compare the actual course details before you choose. Ask the centre about current tuition, timings and the best starting point for you.</p><div class="comparison-scroll"><table class="comparison-table"><thead><tr><th scope="col">Your options</th>${ids.map((id) => `<th scope="col">${escape(courses[id].title)}</th>`).join("")}</tr></thead><tbody>${rows.map(([label, value]) => `<tr><th scope="row">${label}</th>${ids.map((id) => `<td>${escape(value(courses[id]))}</td>`).join("")}</tr>`).join("")}<tr><th scope="row">Explore</th>${ids.map((id) => `<td><button class="text-link" data-action="course" data-id="${id}">Full syllabus ${icon("arrow")}</button></td>`).join("")}</tr><tr><th scope="row">Next step</th>${ids.map((id) => `<td><button class="text-link" data-action="apply" data-id="${id}">Choose course ${icon("arrow")}</button></td>`).join("")}</tr></tbody></table></div>`,
  );
}
function detailTab(name) {
  document.querySelectorAll("[data-detail-tab]").forEach((button) => {
    const active = button.dataset.detailTab === name;
    button.setAttribute("aria-selected", String(active));
    button.tabIndex = active ? 0 : -1;
    $("#course-panel-" + button.dataset.detailTab).hidden = !active;
  });
}
function openCourse(id, { route = true } = {}) {
  const course = courses[id];
  if (!course) return;
  detailId = id;
  const modules = course.syllabus
    ? course.syllabus
        .map(
          (module) =>
            `<details><summary>${escape(module.module)}</summary><ul>${module.items.map((item) => `<li>${escape(item)}</li>`).join("")}</ul></details>`,
        )
        .join("")
    : "";
  showDialog(
    course.title,
    `<p>${escape(course.subtitle)}</p><div class="dialog-meta"><span>${escape(course.category)}</span><span>${escape(course.duration)}</span><span>${escape(course.level)}</span><span>${escape(course.certificate)}</span></div><div class="detail-tabs" role="tablist" aria-label="Course information">${["overview", "syllabus", "fees"].map((tab, index) => `<button role="tab" id="course-tab-${tab}" aria-controls="course-panel-${tab}" aria-selected="${index === 0}" tabindex="${index === 0 ? "0" : "-1"}" data-detail-tab="${tab}">${["Overview", "Syllabus", "Fees & Batches"][index]}</button>`).join("")}</div><section class="detail-panel" role="tabpanel" tabindex="0" aria-labelledby="course-tab-overview" id="course-panel-overview"><p>${escape(course.overview)}</p><h3>Who is this for?</h3><p>${escape(course.who)}</p><h3>Your practical work</h3><p>${escape(course.practical)}</p></section><section class="detail-panel" role="tabpanel" tabindex="0" aria-labelledby="course-tab-syllabus" id="course-panel-syllabus" hidden><h3>What you will learn</h3><ul>${course.learn.map((item) => `<li>${escape(item)}</li>`).join("")}</ul>${modules}<h3>Skills you will practise</h3><div class="dialog-meta">${course.skills.map((skill) => `<span>${escape(skill)}</span>`).join("")}</div></section><section class="detail-panel" role="tabpanel" tabindex="0" aria-labelledby="course-tab-fees" id="course-panel-fees" hidden><div class="fee-grid"><div><small>ONE-TIME ADMISSION</small><b>₹100</b><p>Separate from course tuition.</p></div><div><small>COURSE TUITION</small><b>At the centre</b><p>Confirm current course fees and the payment schedule with the institute.</p></div></div><h3>Morning. Afternoon. Evening.</h3><p>Choose your batch preference in the application. The centre confirms current timings and availability. Admissions remain open throughout the year.</p><h3>Bring these when you visit</h3><p>2 printed passport-size photographs and 1 Aadhaar photocopy. Admission is completed after payment verification and institute formalities.</p></section><div class="dialog-actions"><button class="button gold" data-action="apply" data-id="${id}">Choose this course ${icon("arrow")}</button><button class="button outline" data-action="pdf" data-id="${id}">${icon("download")}Download PDF</button><button class="button outline" data-action="enquiry" data-id="${id}">${icon("chat")}Enquire</button><button class="button outline" data-action="save" data-id="${id}" aria-pressed="${saved.has(courseSlug(course))}">${icon("bookmark")}${saved.has(courseSlug(course)) ? "Saved" : "Save course"}</button><button class="text-link" data-action="copy-course" data-id="${id}">Copy course link ${icon("arrow")}</button></div>`,
    "course",
  );
  if (route && location.hash !== "#course=" + courseSlug(course))
    history.pushState(null, "", "#course=" + courseSlug(course));
}
function checkCourseRoute() {
  const match = location.hash.match(/^#course=([a-z0-9-]+)$/);
  if (match) {
    const id = courses.findIndex((course) => courseSlug(course) === match[1]);
    if (id >= 0) openCourse(id, { route: false });
  } else if (dialog.open && dialogKind === "course") closeDialog();
}
window.addEventListener("hashchange", checkCourseRoute);
window.addEventListener("popstate", checkCourseRoute);
function brochurePicker() {
  showDialog(
    "Take your learning path with you.",
    `<p>Download a professionally laid-out course guide with the full syllabus, practical work, admission information, documents and institute contacts.</p><div class="course-picker">${courses.map((course, id) => `<button data-action="pdf" data-id="${id}">${escape(course.title)}<small>${escape(course.duration)} · ${escape(course.category)} ${icon("download")}</small></button>`).join("")}</div><div class="dialog-notice">PDFs are generated on this device. They contain public course details only, with no student information or payment confirmation.</div>`,
  );
}
const finderQuestions = [
  {
    name: "goal",
    title: "What would you like to achieve?",
    choices: [
      [
        "basics",
        "Start with computer basics",
        "Become confident with everyday digital tasks.",
      ],
      [
        "office",
        "Build office skills",
        "Work with documents, spreadsheets and presentations.",
      ],
      [
        "accounting",
        "Learn business accounting",
        "Explore Tally, GST, billing and business records.",
      ],
      [
        "typing",
        "Improve my typing",
        "Build keyboard confidence, speed and accuracy.",
      ],
    ],
  },
  {
    name: "experience",
    title: "Where are you starting from?",
    choices: [
      ["new", "I’m a beginner", "Start with a clear foundation."],
      ["some", "I know some basics", "Build on what I already know."],
    ],
  },
  {
    name: "time",
    title: "What learning path suits you?",
    choices: [
      [
        "short",
        "A shorter introduction",
        "Explore three months or a short course.",
      ],
      [
        "six",
        "Around six months",
        "Build skills through a structured certificate.",
      ],
      ["year", "A complete year", "Take a longer diploma learning path."],
      ["flexible", "I’m flexible", "Choose the course around my goal."],
    ],
  },
];
function finder(start = false) {
  if (start) {
    finderAnswers = {};
    finderStep = 0;
  }
  const question = finderQuestions[finderStep];
  showDialog(
    question.title,
    `<div class="finder-progress" aria-label="Question ${finderStep + 1} of 3">${finderQuestions.map((_, i) => `<span class="${i <= finderStep ? "active" : ""}"></span>`).join("")}</div><p>Question ${finderStep + 1} of 3 · ${finderStep === 0 ? "A few answers will help us suggest a relevant starting point." : "Your answers stay on this page."}</p><div class="finder-options">${question.choices.map(([value, label, description]) => `<button class="finder-choice" data-finder-value="${value}"><b>${label}</b><small>${description}</small></button>`).join("")}</div>${finderStep ? '<div class="dialog-actions"><button class="text-link" data-action="finder-back">← Previous question</button></div>' : ""}`,
    "finder",
  );
}
function finderResult() {
  const result = recommendCourses(courses, finderAnswers),
    course = courses[result.id];
  showDialog(
    "A useful place to begin.",
    `<p>Based on your learning goal and preferred course length. This is guidance, not an admission or employment guarantee.</p><div class="recommendation"><h3>${escape(course.title)}</h3><p>${escape(result.reason)}</p><p>${escape(result.experienceNote)}</p><div class="dialog-meta"><span>${escape(course.duration)}</span><span>${escape(course.level)}</span></div><button class="text-link" data-action="course" data-id="${result.id}">Explore full syllabus ${icon("arrow")}</button></div>${result.alternative >= 0 ? `<div class="dialog-notice">Also consider: <button class="text-link" data-action="course" data-id="${result.alternative}">${escape(courses[result.alternative].title)}</button></div>` : ""}<div class="dialog-actions"><button class="button gold" data-action="apply" data-id="${result.id}">Apply for this course ${icon("arrow")}</button><button class="button outline" data-action="enquiry" data-id="${result.id}">Discuss this course</button><button class="text-link" data-action="finder">Start again</button></div>`,
    "finder",
  );
}
function enquiry(id = -1) {
  showDialog(
    "A question today. A clearer next step.",
    `<p>Choose your course and an institute contact. Edit the message if you wish, then open WhatsApp. Nothing is sent until you press Send in WhatsApp.</p><div class="enquiry-form"><label for="enquiryCourse">Course<select id="enquiryCourse"><option value="-1">General course enquiry</option>${courses.map((course, index) => `<option value="${index}" ${index === id ? "selected" : ""}>${escape(course.title)}</option>`).join("")}</select></label><label for="enquiryContact">Send your enquiry to<select id="enquiryContact">${contacts.map((contact, index) => `<option value="${index}">${contact.label} · ${contact.display}</option>`).join("")}</select></label><label for="enquiryMessage">Your message<textarea id="enquiryMessage" maxlength="1500"></textarea></label></div><div class="dialog-actions"><a class="button gold" id="openWhatsApp" target="_blank" rel="noopener noreferrer">Open WhatsApp ${icon("chat")}</a><button class="button outline" data-action="copy-enquiry">Copy message</button></div><div class="dialog-notice">This opens the selected contact’s chat with a draft. It does not automatically send a message, attachment or application.</div>`,
    "enquiry",
  );
  const updateMessage = () => {
    const course = courses[Number($("#enquiryCourse").value)];
    $("#enquiryMessage").value =
      `Hello Rehaan Computers! I would like to know more about ${course ? course.title : "your computer courses"}. Please share the course tuition, batch timings and admission details. Thank you.`;
    updateLink();
  };
  const updateLink = () => {
    const contact = contacts[Number($("#enquiryContact").value)] || contacts[0];
    $("#openWhatsApp").href =
      "https://wa.me/" +
      contact.phone +
      "?text=" +
      encodeURIComponent($("#enquiryMessage").value);
  };
  $("#enquiryCourse").addEventListener("change", updateMessage);
  $("#enquiryContact").addEventListener("change", updateLink);
  $("#enquiryMessage").addEventListener("input", updateLink);
  updateMessage();
}
const galleryItems = [
  {
    image: "excel-sheet.jpg",
    title: "Spreadsheet practice",
    description:
      "Microsoft Excel: formula cells, tables and practical spreadsheet work.",
  },
  {
    image: "word-doc.jpg",
    title: "Documents that work",
    description: "Microsoft Word: create, format and prepare useful documents.",
  },
  {
    image: "typing-keys.jpg",
    title: "Confidence at the keyboard",
    description:
      "Typing: regular practice helps build familiarity, accuracy and speed.",
  },
];
function renderSite() {
  $("#aboutCopy").innerHTML = site.about
    .map((text) => `<p>${escape(text)}</p>`)
    .join("");
  $("#benefitsGrid").innerHTML = site.benefits
    .map(
      (item, index) =>
        `<article class="benefit"><span>0${index + 1}</span><h3>${escape(item.title)}</h3><p>${escape(item.text)}</p></article>`,
    )
    .join("");
  $("#toolsGrid").innerHTML = site.tools
    .map(
      (item, index) =>
        `<article class="tool"><span>${["X", "T", "</>", "W"][index].replace("<", "&lt;")}</span><h3>${escape(item.title)}</h3><p>${escape(item.text)}</p></article>`,
    )
    .join("");
  $("#gallery").innerHTML = galleryItems
    .map(
      (item, id) =>
        `<button data-action="gallery" data-id="${id}" aria-label="Open ${escape(item.title)} image"><img src="assets/${item.image}" alt="${escape(item.title)}" loading="lazy"><span>${escape(item.title)}${icon("arrow")}</span></button>`,
    )
    .join("");
  $("#stepsGrid").innerHTML = site.steps
    .map(
      (item, index) =>
        `<article class="step"><span>0${index + 1}</span><h3>${escape(item.title)}</h3><p>${escape(item.text)}</p></article>`,
    )
    .join("");
  $("#batchGrid").innerHTML = site.batches
    .map(
      (item, index) =>
        `<article class="batch"><span>0${index + 1} / YOUR LEARNING TIME</span><h3>${escape(item.title)}</h3><p>${escape(item.text)}</p><button class="text-link" data-action="batch" data-batch="${["Morning", "Afternoon", "Evening"][index]}">Choose this preference ${icon("arrow")}</button></article>`,
    )
    .join("");
  $("#faqList").innerHTML = site.faq
    .map(
      (item) =>
        `<details><summary>${escape(item.q)}</summary><p>${escape(item.a)}</p></details>`,
    )
    .join("");
  $(".contact-card").insertAdjacentHTML(
    "beforeend",
    contacts
      .map(
        (contact) =>
          `<a class="contact-phone" href="tel:+${contact.phone}">${contact.display}</a>`,
      )
      .join(""),
  );
}
const passage =
  "Practice builds confidence. Learn a little each day, type with care, and focus on accuracy before speed. Useful computer skills begin with simple steps.";
let typingStart = 0,
  typingInterval = 0,
  typingDone = false;
function typingUpdate(force = false) {
  const typed = $("#typingInput").value,
    elapsed = typingStart
      ? Math.min(30000, performance.now() - typingStart)
      : 0,
    score = typingScore(passage, typed, elapsed);
  $("#typingSpeed").textContent = score.wpm;
  $("#typingAccuracy").textContent = typed.length ? score.accuracy + "%" : "—";
  $("#typingTimer").textContent =
    "00:" +
    String(Math.max(0, Math.ceil((30000 - elapsed) / 1000))).padStart(2, "0");
  if (force || elapsed >= 30000 || typed === passage) {
    typingDone = true;
    clearInterval(typingInterval);
    $("#typingInput").disabled = true;
    $("#typingStatus").textContent =
      `Practice complete: ${score.wpm} WPM and ${score.accuracy}% text accuracy. This result was not saved or sent.`;
  }
}
function resetTyping() {
  clearInterval(typingInterval);
  typingStart = 0;
  typingDone = false;
  $("#typingInput").value = "";
  $("#typingInput").disabled = false;
  $("#typingTimer").textContent = "00:30";
  $("#typingSpeed").textContent = "0";
  $("#typingAccuracy").textContent = "—";
  $("#typingStatus").textContent =
    "Type the passage above. Pasting is disabled for a fair practice run.";
}
$("#typingPassage").textContent = passage;
$("#typingInput").addEventListener("input", () => {
  if (typingDone) return;
  if (!typingStart && $("#typingInput").value) {
    typingStart = performance.now();
    typingInterval = setInterval(typingUpdate, 250);
    $("#typingStatus").textContent =
      "Focus on accuracy. Your practice is in progress.";
  }
  typingUpdate();
});
$("#typingInput").addEventListener("paste", (event) => {
  event.preventDefault();
  toast("Type the passage yourself to measure your practice.");
});
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && typingStart && !typingDone) typingUpdate();
});
window.addEventListener("pagehide", () => clearInterval(typingInterval));
$("#menuButton").addEventListener("click", () => {
  const open = $("#mainNav").classList.toggle("open");
  $("#menuButton").setAttribute("aria-expanded", String(open));
  $("#menuButton").setAttribute(
    "aria-label",
    open ? "Close navigation" : "Open navigation",
  );
});
$("#mainNav").addEventListener("click", (event) => {
  if (event.target.closest("a")) {
    $("#mainNav").classList.remove("open");
    $("#menuButton").setAttribute("aria-expanded", "false");
    $("#menuButton").setAttribute("aria-label", "Open navigation");
  }
});
$("#courseSearch").addEventListener("input", (event) => {
  query = event.target.value.trim().toLowerCase();
  cards();
});
$("#durationFilter").addEventListener("change", (event) => {
  duration = event.target.value;
  cards();
});
$("#compareOpen").addEventListener("click", compareCourses);
$("#compareClear").addEventListener("click", () => {
  comparison.clear();
  comparisonTray();
  cards();
});
document.addEventListener("change", (event) => {
  if (!event.target.hasAttribute("data-compare")) return;
  const id = Number(event.target.dataset.compare);
  if (event.target.checked) {
    if (comparison.size >= 3) {
      event.target.checked = false;
      toast("Compare up to three courses. Remove one to choose another.");
      return;
    }
    comparison.add(id);
  } else comparison.delete(id);
  comparisonTray();
});
document.addEventListener("keydown", (event) => {
  const button = event.target.closest("[role=tab]");
  if (!button) return;
  const group = button.closest("[role=tablist]"),
    buttons = [...group.querySelectorAll("[role=tab]")],
    index = buttons.indexOf(button);
  let next;
  if (event.key === "ArrowRight") next = (index + 1) % buttons.length;
  if (event.key === "ArrowLeft")
    next = (index - 1 + buttons.length) % buttons.length;
  if (event.key === "Home") next = 0;
  if (event.key === "End") next = buttons.length - 1;
  if (next === undefined) return;
  event.preventDefault();
  buttons[next].focus();
  detailTab(buttons[next].dataset.detailTab);
});
document.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button || button.disabled) return;
  if (button.hasAttribute("data-filter")) {
    filter = button.dataset.filter;
    cards();
  }
  if (button.dataset.detailTab) detailTab(button.dataset.detailTab);
  if (button.dataset.finderValue) {
    finderAnswers[finderQuestions[finderStep].name] =
      button.dataset.finderValue;
    if (finderStep < 2) {
      finderStep++;
      finder();
    } else finderResult();
  }
  const id = button.hasAttribute("data-id") ? Number(button.dataset.id) : -1;
  switch (button.dataset.action) {
    case "course":
      openCourse(id);
      break;
    case "save":
      if (courses[id]) toggleSaved(id);
      break;
    case "saved":
      if (dialog.open) closeDialog();
      filter = "saved";
      query = "";
      duration = "all";
      $("#courseSearch").value = "";
      $("#durationFilter").value = "all";
      cards();
      $("#courses").scrollIntoView({ behavior: scrollBehavior() });
      break;
    case "reset-filters":
      resetFilters();
      break;
    case "pdf":
      brochure(id);
      break;
    case "brochure":
      brochurePicker();
      break;
    case "copy-course":
      if (courses[id])
        copy(
          location.origin +
            location.pathname +
            "#course=" +
            courseSlug(courses[id]),
          "Course link copied.",
        );
      break;
    case "apply":
      if (dialog.open) closeDialog();
      admission.open(id);
      break;
    case "batch":
      admission.open(-1, button.dataset.batch);
      break;
    case "finder":
      finder(true);
      break;
    case "finder-back":
      if (finderStep > 0) {
        finderStep--;
        finder();
      }
      break;
    case "enquiry":
      enquiry(id);
      break;
    case "copy-enquiry":
      copy($("#enquiryMessage").value, "Enquiry copied. No message was sent.");
      break;
    case "gallery": {
      const item = galleryItems[id];
      if (item)
        showDialog(
          item.title,
          `<div class="gallery-lightbox"><img src="assets/${item.image}" alt="${escape(item.title)}"><p>${escape(item.description)} These are existing learning images, not a new photograph of the institute.</p></div>`,
        );
      break;
    }
    case "typing-reset":
      resetTyping();
      $("#typingInput").focus();
      break;
    case "typing-course":
      openCourse(courses.findIndex((course) => course.category === "Typing"));
      break;
    case "close-dialog":
      closeDialog();
      break;
    case "clear-application":
      closeDialog();
      admission.clear();
      break;
  }
});
initMotion();
initStudio();
$("#year").textContent = new Date().getFullYear();
Promise.all(
  ["courses.json", "site.json"].map((name) =>
    fetch(new URL(name, import.meta.url), { cache: "no-store" }).then(
      (response) => {
        if (!response.ok) throw Error("Course information unavailable");
        return response.json();
      },
    ),
  ),
)
  .then(([courseData, siteData]) => {
    courses = courseData;
    site = siteData;
    loadSaved();
    cards();
    renderSite();
    admission = initAdmission({ courses, showDialog, toast, escape, icon });
    checkCourseRoute();
  })
  .catch(() => {
    $("#courseCount").textContent =
      "Course information could not load. Check your connection and reload.";
    document
      .querySelectorAll("[data-action],[data-filter]")
      .forEach((button) => (button.disabled = true));
  });
