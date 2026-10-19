/* Isolated visitor preview. No Firebase, payment SDK, uploads or stored form data. */
(() => {
  "use strict";
  const $ = (selector) => document.querySelector(selector);
  const escape = (value) =>
    String(value ?? "").replace(
      /[&<>"']/g,
      (char) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[char],
    );
  let courses = [],
    filter = "all",
    query = "";
  const comparison = new Set();
  const dialog = $("#previewDialog");
  let toastTimer;

  function toast(message) {
    clearTimeout(toastTimer);
    $("#toast").textContent = message;
    $("#toast").hidden = false;
    toastTimer = setTimeout(() => {
      $("#toast").hidden = true;
    }, 4500);
  }
  function openDialog(title, body) {
    $("#dialogContent").innerHTML =
      `<h2 id="dialogTitle">${escape(title)}</h2>${body}`;
    if (!dialog.open) dialog.showModal();
    dialog.scrollTop = 0;
    $("#dialogClose").focus();
  }
  function closeDialog() {
    dialog.close();
  }
  $("#dialogClose").addEventListener("click", closeDialog);
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
  // Escape is supported by the native dialog. Clear temporary input on close.
  dialog.addEventListener("close", () => {
    if (!dialog.open) $("#dialogContent").replaceChildren();
  });

  function category(course) {
    if (course.category === "Typing") return "typing";
    if (
      course.category.includes("Accounting") ||
      course.title.includes("Tally")
    )
      return "accounting";
    return "basics";
  }
  function cards() {
    const visible = courses
      .map((course, id) => ({ course, id }))
      .filter(({ course }) => {
        const text = [
          course.title,
          course.category,
          course.overview,
          ...course.learn,
          ...course.skills,
        ]
          .join(" ")
          .toLowerCase();
        return (
          (filter === "all" || category(course) === filter) &&
          (!query || text.includes(query))
        );
      });
    $("#courseGrid").innerHTML = visible
      .map(
        ({ course, id }) => `<article class="course-card">
      <div class="course-image"><img src="../../public/${escape(course.img)}" alt="" loading="lazy"><span class="course-index">LEARNING PATH / ${String(id + 1).padStart(2, "0")}</span></div>
      <div class="course-body"><span class="course-category">${escape(course.category)}</span><h3>${escape(course.title)}</h3><p>${escape(course.overview)}</p><div class="course-meta"><span>${escape(course.duration)}</span><span>${escape(course.level)}</span></div></div>
      <div class="course-actions"><button class="course-details" data-details="${id}">Explore syllabus <svg class="arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M6 18 18 6M6 6h12v12"/></svg></button><button data-apply="${id}">Apply now →</button></div>
      <label class="course-check"><input type="checkbox" data-compare="${id}" ${comparison.has(id) ? "checked" : ""}>Compare this course</label>
    </article>`,
      )
      .join("");
    $("#emptyCourses").hidden = visible.length > 0;
    $("#courseCount").textContent =
      `${visible.length} of ${courses.length} learning paths · Choose a course to explore its syllabus`;
  }
  function compareTray() {
    $("#compareTray").hidden = comparison.size === 0;
    $("#compareCount").textContent = `${comparison.size} of 2 courses selected`;
    $("#compareOpen").disabled = comparison.size !== 2;
    $("#compareTray small").textContent =
      comparison.size === 2
        ? "Your two paths, side by side."
        : "Choose one more learning path.";
  }
  function compareCourses() {
    if (comparison.size !== 2) return;
    const ids = [...comparison];
    const rows = [
      ["Duration", (course) => course.duration],
      ["Starting level", (course) => course.level],
      ["Best suited to", (course) => course.who],
      ["What you learn", (course) => course.learn.join(" · ")],
      ["Practical work", (course) => course.practical],
      ["Certificate", (course) => course.certificate],
    ];
    openDialog(
      "Two paths. Your choice.",
      `<p>Compare the course details from your existing website. The centre can help you decide and confirm full fees.</p><div class="comparison-scroll"><table class="comparison-table"><thead><tr><th scope="col">Your options</th>${ids.map((id) => `<th scope="col">${escape(courses[id].title)}</th>`).join("")}</tr></thead><tbody>${rows.map(([label, value]) => `<tr><th scope="row">${label}</th>${ids.map((id) => `<td>${escape(value(courses[id]))}</td>`).join("")}</tr>`).join("")}<tr><th scope="row">Next step</th>${ids.map((id) => `<td><button class="text-button" data-apply="${id}">Choose this course <svg class="arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M6 18 18 6M6 6h12v12"/></svg></button></td>`).join("")}</tr></tbody></table></div><div class="dialog-notice">₹100 is the admission fee. Tuition is separate; confirm course fees with the centre.</div>`,
    );
  }
  function detail(id) {
    const course = courses[id];
    if (!course) return;
    openDialog(
      course.title,
      `<p class="eyebrow">${escape(course.category)}</p><div class="dialog-meta"><span>${escape(course.duration)}</span><span>${escape(course.level)}</span><span>${escape(course.certificate)}</span></div><p>${escape(course.overview)}</p><h3>What you will learn</h3><ul>${course.learn.map((item) => `<li>${escape(item)}</li>`).join("")}</ul>${course.syllabus ? `<h3>Detailed syllabus</h3>${course.syllabus.map((module) => `<details><summary>${escape(module.module)}</summary><ul>${module.items.map((item) => `<li>${escape(item)}</li>`).join("")}</ul></details>`).join("")}` : ""}<h3>Your practical work</h3><p>${escape(course.practical)}</p><h3>Who is this for?</h3><p>${escape(course.who)}</p><div class="dialog-notice">Admission fee: ₹100. Tuition is separate. Batch preferences: Morning, Afternoon or Evening; timings are confirmed by the centre.</div><div class="dialog-actions"><button class="button button-gold" data-apply="${id}">Choose this course <span><svg class="arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M6 18 18 6M6 6h12v12"/></svg></span></button><button class="button button-outline" data-enquiry="${id}">Ask a question <span>→</span></button></div>`,
    );
  }
  function finder() {
    openDialog(
      "What would you like to learn?",
      `<p>Choose your main goal. We’ll suggest a starting point from our existing courses.</p><div class="finder-options"><button class="finder-option" data-goal="starting"><strong>I’m starting from the basics</strong><span>Get comfortable with computers, documents and everyday digital tasks.</span></button><button class="finder-option" data-goal="office"><strong>I want stronger office skills</strong><span>Build a broader foundation in spreadsheets, documents and practical work.</span></button><button class="finder-option" data-goal="accounts"><strong>I want to learn accounting</strong><span>Explore Tally Prime, GST, billing and business records.</span></button><button class="finder-option" data-goal="typing"><strong>I want to improve my typing</strong><span>Practise keyboard skills, accuracy and typing speed.</span></button></div><p class="dialog-notice">A suggestion, not an admission decision. You can explore every course and discuss your choice with the centre.</p>`,
    );
  }
  function recommendation(goal) {
    const choices = {
      starting: {
        match: "Three Month",
        reason:
          "This beginner course covers computer basics, MS Office, internet and email. A practical first step if you are new to computers.",
      },
      office: {
        match: "One Year",
        reason:
          "This longer learning path combines office tools with fundamentals, typing and accounting basics. The six-month certificate is another option to compare.",
      },
      accounts: {
        match: "Tally Prime with GST",
        reason:
          "Explore company setup, vouchers, GST invoicing, inventory and reporting. You can also compare it with the Marg ERP course.",
      },
      typing: {
        match: "Typing Diploma",
        reason:
          "Focus on keyboard familiarity, regular practice, speed and accuracy.",
      },
    };
    const choice = choices[goal];
    if (!choice) return;
    const id = courses.findIndex((course) =>
      course.title.includes(choice.match),
    );
    if (id < 0) return;
    openDialog(
      "A starting point for you.",
      `<p class="eyebrow">BASED ON YOUR LEARNING GOAL</p><div class="recommendation"><h3>${escape(courses[id].title)}</h3><p>${escape(choice.reason)}</p><div class="dialog-meta"><span>${escape(courses[id].duration)}</span><span>${escape(courses[id].level)}</span></div><button class="text-button" data-details="${id}">Explore the full syllabus <svg class="arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M6 18 18 6M6 6h12v12"/></svg></button></div><div class="dialog-actions"><button class="button button-gold" data-apply="${id}">Try application preview <span><svg class="arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M6 18 18 6M6 6h12v12"/></svg></span></button><button class="button button-outline" data-finder>Choose another goal</button></div>`,
    );
  }
  function apply(id) {
    if (dialog.open) closeDialog();
    $("#navigation").classList.remove("open");
    $("#menuButton").setAttribute("aria-expanded", "false");
    $("#menuButton").setAttribute("aria-label", "Open navigation");
    if (id !== "" && courses[Number(id)]) $("#applyCourse").value = String(id);
    $("#apply").scrollIntoView({
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "start",
    });
    $("#previewApplication input").focus({ preventScroll: true });
  }
  function enquiry(id = "") {
    const course = id !== "" ? courses[Number(id)] : null;
    const message = `Hello Rehaan Computers! I’d like to know more about ${course ? course.title : "your computer courses"}. Please share the course fees, batch timings and admission details. Thank you.`;
    openDialog(
      "Let’s talk about your next step.",
      `<p>This is a preview of the WhatsApp enquiry experience. You can edit and copy the message below. Nothing is sent.</p><label class="enquiry-label" for="enquiryMessage">Your message<textarea id="enquiryMessage" maxlength="1500">${escape(message)}</textarea></label><div class="dialog-actions"><button class="button button-gold" id="copyEnquiry">Copy message <span><svg class="arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M6 18 18 6M6 6h12v12"/></svg></span></button><button class="button button-outline" data-finder>Help me choose a course</button></div><div class="dialog-notice">Preview only. An institute WhatsApp destination has not been configured in this design.</div>`,
    );
  }
  async function copyEnquiry() {
    const field = $("#enquiryMessage");
    const value = field.value;
    try {
      if (!navigator.clipboard?.writeText) throw Error("Clipboard unavailable");
      await navigator.clipboard.writeText(value);
      toast("Enquiry copied. No message was sent.");
    } catch {
      field.focus();
      field.select();
      toast("Message selected. Press Ctrl+C, or touch and hold to copy.");
    }
  }
  $("#menuButton").addEventListener("click", () => {
    const open = $("#navigation").classList.toggle("open");
    $("#menuButton").setAttribute("aria-expanded", String(open));
    $("#menuButton").setAttribute(
      "aria-label",
      open ? "Close navigation" : "Open navigation",
    );
  });
  $("#navigation").addEventListener("click", (event) => {
    if (!event.target.closest("a")) return;
    $("#navigation").classList.remove("open");
    $("#menuButton").setAttribute("aria-expanded", "false");
    $("#menuButton").setAttribute("aria-label", "Open navigation");
  });
  $("#courseSearch").addEventListener("input", (event) => {
    query = event.target.value.trim().toLowerCase();
    cards();
  });
  $("#compareOpen").addEventListener("click", compareCourses);
  $("#compareClear").addEventListener("click", () => {
    comparison.clear();
    cards();
    compareTray();
  });
  document.addEventListener("change", (event) => {
    const input = event.target.closest("[data-compare]");
    if (!input) return;
    const id = Number(input.dataset.compare);
    if (input.checked) {
      if (comparison.size >= 2) {
        input.checked = false;
        toast("Compare two courses at a time. Uncheck one to choose another.");
        return;
      }
      comparison.add(id);
    } else comparison.delete(id);
    compareTray();
  });
  document.addEventListener("click", (event) => {
    const target = event.target.closest("button");
    if (!target || target.disabled) return;
    if (target.hasAttribute("data-filter")) {
      filter = target.dataset.filter;
      document
        .querySelectorAll("[data-filter]")
        .forEach((button) =>
          button.setAttribute("aria-pressed", String(button === target)),
        );
      cards();
    }
    if (target.hasAttribute("data-details"))
      detail(Number(target.dataset.details));
    if (target.hasAttribute("data-apply")) apply(target.dataset.apply);
    if (target.hasAttribute("data-finder")) finder();
    if (target.hasAttribute("data-goal")) recommendation(target.dataset.goal);
    if (target.hasAttribute("data-enquiry"))
      enquiry(target.dataset.enquiry || "");
    if (target.id === "copyEnquiry") copyEnquiry();
  });
  $("#previewApplication").addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(event.target),
      course = courses[Number(data.get("course"))];
    if (!course) return;
    openDialog(
      "That’s your first step.",
      `<p>Thank you, ${escape(String(data.get("name")).trim())}. Here is how the next step could look.</p><div class="recommendation"><h3>${escape(course.title)}</h3><p>Preferred batch: ${escape(data.get("batch"))}</p><p>On the live website, you would review the remaining application details before continuing to the existing admission process.</p></div><div class="dialog-notice">Design preview complete. Your details have not been submitted or saved. No payment was started.</div><div class="dialog-actions"><button class="button button-gold" data-details="${escape(data.get("course"))}">Review course <span><svg class="arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M6 18 18 6M6 6h12v12"/></svg></span></button><button class="button button-outline" data-enquiry="${escape(data.get("course"))}">Preview an enquiry</button></div>`,
    );
  });
  $("#year").textContent = new Date().getFullYear();

  fetch("courses.json", { cache: "no-store" })
    .then((response) => {
      if (!response.ok) throw Error("Could not load course details");
      return response.json();
    })
    .then((data) => {
      courses = data;
      $("#applyCourse").insertAdjacentHTML(
        "beforeend",
        courses
          .map(
            (course, id) =>
              `<option value="${id}">${escape(course.title)}</option>`,
          )
          .join(""),
      );
      cards();
    })
    .catch(() => {
      $("#courseCount").textContent =
        "Course details could not load. Use the Python preview server from the README, then reload this page.";
      $("#courseGrid").replaceChildren();
      document
        .querySelectorAll("[data-finder],[data-apply],[data-enquiry]")
        .forEach((button) => {
          button.disabled = true;
        });
    });
})();
