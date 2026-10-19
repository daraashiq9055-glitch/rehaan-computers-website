/* Current-site design preview: local course data only; no production SDKs. */
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
    currentFilter = "all",
    search = "",
    currentCourse = 0;
  let visibleIds = [],
    statusTimer;
  const dialog = $("#currentCourseDialog");

  function notify(message) {
    let status = $("#previewStatus");
    if (!status) {
      status = document.createElement("div");
      status.id = "previewStatus";
      status.className = "current-status";
      status.setAttribute("role", "status");
      document.body.append(status);
    }
    status.textContent = message;
    status.hidden = false;
    clearTimeout(statusTimer);
    statusTimer = setTimeout(() => {
      status.hidden = true;
    }, 5000);
  }
  function matchesCategory(course) {
    if (currentFilter === "all") return true;
    if (currentFilter === "basics")
      return ["Computer Diploma", "Computer Certificate"].includes(
        course.category,
      );
    if (currentFilter === "accounting")
      return ["Accounting", "ERP / Accounting"].includes(course.category);
    return course.category === "Typing";
  }
  function render() {
    visibleIds = courses
      .map((_, id) => id)
      .filter((id) => {
        const course = courses[id];
        return (
          matchesCategory(course) &&
          [course.title, course.overview, course.category, ...course.learn]
            .join(" ")
            .toLowerCase()
            .includes(search)
        );
      });
    $("#courseGrid").innerHTML = visibleIds
      .map((id) => {
        const course = courses[id];
        return `<article class="course-card"><img class="course-thumb" src="../../public/${escape(course.img)}" alt="" loading="lazy">${id === 0 ? '<span class="course-badge">Most Popular</span>' : ""}<div class="course-number">COURSE ${String(id + 1).padStart(2, "0")}</div><div><span class="course-category">${escape(course.category)}</span></div><div class="course-content"><h3>${escape(course.title)}</h3><p>${escape(course.overview)}</p><div class="course-chips"><span>${escape(course.duration)}</span><span>${escape(course.level)}</span><span>${escape(course.certificate)}</span></div><p class="course-start">Admission fee <b>₹100</b> · tuition separate</p></div><div class="course-card-footer"><strong class="course-fee">Explore Course</strong><div class="course-card-actions"><button class="course-detail-btn" type="button" data-course="${id}">View Details</button><button class="course-apply-btn" type="button" data-apply="${id}">Apply Now</button></div></div></article>`;
      })
      .join("");
    $("#courseResults").textContent =
      `${visibleIds.length} of ${courses.length} courses · Select View Details for syllabus, fees and batch information.`;
    $("#noCourseResults").hidden = visibleIds.length > 0;
  }
  function selectFilter(button) {
    currentFilter = button.dataset.filter;
    document.querySelectorAll("[data-filter]").forEach((tab) => {
      const active = tab === button;
      tab.setAttribute("aria-selected", String(active));
      tab.tabIndex = active ? 0 : -1;
    });
    $("#courseGrid").setAttribute("aria-labelledby", button.id);
    render();
  }
  function selectDetail(name) {
    document.querySelectorAll("[data-detail]").forEach((tab) => {
      const active = tab.dataset.detail === name;
      tab.setAttribute("aria-selected", String(active));
      tab.tabIndex = active ? 0 : -1;
      $("#detailPanel-" + tab.dataset.detail).hidden = !active;
    });
  }
  function openCourse(id) {
    const course = courses[id];
    if (!course) return;
    currentCourse = id;
    $("#currentDetailCategory").textContent = course.category;
    $("#currentDetailTitle").textContent = course.title;
    $("#currentDetailMeta").innerHTML = [
      course.duration,
      course.level,
      course.certificate,
    ]
      .map((item) => `<span>${escape(item)}</span>`)
      .join("");
    $("#detailPanel-overview").innerHTML =
      `<h3>About this course</h3><p>${escape(course.overview)}</p><h3>Who is it for?</h3><p>${escape(course.who)}</p><h3>Practical learning</h3><p>${escape(course.practical)}</p>`;
    $("#detailPanel-syllabus").innerHTML =
      `<h3>What you will learn</h3><ul>${course.learn.map((item) => `<li>${escape(item)}</li>`).join("")}</ul>${course.syllabus ? course.syllabus.map((module) => `<details><summary>${escape(module.module)}</summary><ul>${module.items.map((item) => `<li>${escape(item)}</li>`).join("")}</ul></details>`).join("") : ""}<h3>Skills you will practise</h3><div class="current-batches">${course.skills.map((skill) => `<span>${escape(skill)}</span>`).join("")}</div>`;
    $("#detailPanel-fees").innerHTML =
      `<div class="current-fee-grid"><div><span>ONE-TIME ADMISSION FEE</span><strong>₹100</strong><p>Separate from tuition.</p></div><div><span>COURSE TUITION</span><strong>At the centre</strong><p>Confirm current course fees and the payment schedule with the institute.</p></div></div><h3>Choose your batch preference</h3><div class="current-batches"><span>Morning</span><span>Afternoon</span><span>Evening</span></div><p>The centre will confirm current timings and availability for your chosen course. Admission remains subject to payment verification and institute formalities.</p><p><strong>No payment can be made in this design preview.</strong></p>`;
    const position = visibleIds.indexOf(id);
    $("#currentPrevious").disabled = position <= 0;
    $("#currentNext").disabled =
      position < 0 || position >= visibleIds.length - 1;
    selectDetail("overview");
    if (!dialog.open) dialog.showModal();
    document.body.classList.add("modal-open");
    dialog.scrollTop = 0;
    $("#currentCourseClose").focus();
  }
  function closeCourse() {
    dialog.close();
    document.body.classList.remove("modal-open");
  }
  function apply(id) {
    if (dialog.open) closeCourse();
    if (courses[id]) $("#coursePreference").value = courses[id].title;
    $("#admission").scrollIntoView({
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "start",
    });
    notify(
      "This is the existing application layout. Submission and payment are disabled in this preview.",
    );
  }
  function wireTabs(selector, activate) {
    $(selector).addEventListener("keydown", (event) => {
      if (!event.target.matches("[role=tab]")) return;
      const tabs = [...$(selector).querySelectorAll("[role=tab]")],
        index = tabs.indexOf(event.target);
      let next;
      if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
      if (event.key === "ArrowLeft")
        next = (index - 1 + tabs.length) % tabs.length;
      if (event.key === "Home") next = 0;
      if (event.key === "End") next = tabs.length - 1;
      if (next === undefined) return;
      event.preventDefault();
      tabs[next].focus();
      activate(tabs[next]);
    });
  }
  wireTabs(".current-course-tabs", selectFilter);
  wireTabs(".current-detail-tabs", (button) =>
    selectDetail(button.dataset.detail),
  );
  $("#currentCourseSearch").addEventListener("input", (event) => {
    search = event.target.value.trim().toLowerCase();
    render();
  });
  $("#currentCourseClose").addEventListener("click", closeCourse);
  dialog.addEventListener("close", () => {
    document.body.classList.remove("modal-open");
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
      closeCourse();
  });
  $("#currentPrevious").addEventListener("click", () => {
    const pos = visibleIds.indexOf(currentCourse);
    if (pos > 0) openCourse(visibleIds[pos - 1]);
  });
  $("#currentNext").addEventListener("click", () => {
    const pos = visibleIds.indexOf(currentCourse);
    if (pos >= 0 && pos < visibleIds.length - 1)
      openCourse(visibleIds[pos + 1]);
  });
  $("#currentApply").addEventListener("click", () => apply(currentCourse));
  document.addEventListener("click", (event) => {
    const filter = event.target.closest("[data-filter]");
    if (filter) selectFilter(filter);
    const details = event.target.closest("[data-course]");
    if (details) openCourse(Number(details.dataset.course));
    const application = event.target.closest("[data-apply]");
    if (application) apply(Number(application.dataset.apply));
    if (event.target.closest("[data-admin-preview]")) {
      event.preventDefault();
      notify(
        "The admin dashboard is unchanged. This page previews visitor-side improvements only.",
      );
    }
  });
  $("#mobileMenuBtn").addEventListener("click", () => {
    const expanded = $("#navMenu").classList.toggle("open");
    $("#mobileMenuBtn").setAttribute("aria-expanded", String(expanded));
    $("#mobileMenuBtn").setAttribute(
      "aria-label",
      expanded ? "Close menu" : "Open menu",
    );
  });
  $("#navMenu").addEventListener("click", (event) => {
    if (!event.target.closest("a")) return;
    $("#navMenu").classList.remove("open");
    $("#mobileMenuBtn").setAttribute("aria-expanded", "false");
    $("#mobileMenuBtn").setAttribute("aria-label", "Open menu");
  });
  document.addEventListener("submit", (event) => {
    event.preventDefault();
    notify("Applications and payments are disabled in this preview.");
  });
  $("#footerYear").textContent = new Date().getFullYear();
  fetch("courses.json", { cache: "no-store" })
    .then((response) => {
      if (!response.ok) throw Error("Course data unavailable");
      return response.json();
    })
    .then((data) => {
      courses = data;
      $("#coursePreference").insertAdjacentHTML(
        "beforeend",
        courses
          .map((course) => `<option>${escape(course.title)}</option>`)
          .join(""),
      );
      render();
    })
    .catch(() => {
      $("#courseResults").textContent =
        "Course details could not load. Start the preview with python preview-home.py, then reload.";
      document.querySelectorAll("[data-filter]").forEach((button) => {
        button.disabled = true;
      });
    });
})();
