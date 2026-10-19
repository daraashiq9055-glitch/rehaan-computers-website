// Premium form steps delegate persistence and payments to the existing production service.
export function initAdmission({ courses, toast, escape, icon }) {
  const $ = (selector) => document.querySelector(selector),
    form = $("#applicationForm");
  const sections = [...form.querySelectorAll("[data-form-step]")];
  const scrollBehavior = () =>
    matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
  let step = 0,
    furthest = 0,
    photoURL = "",
    photoBusy = false,
    photoEpoch = 0,
    busy = false,
    core = null;
  const names = {
    fullName: "Full name",
    gender: "Gender",
    parentName: "Parent / guardian",
    phone: "Student phone",
    guardianPhone: "Guardian phone",
    aadhaarLast4: "Aadhaar last 4 digits",
    email: "Email",
    dob: "Date of birth",
    qualification: "Qualification",
    address: "Address",
    coursePreference: "Course",
    batch: "Preferred batch",
    source: "How you heard about us",
    message: "Message",
  };
  const labels = {
    male: "Male",
    female: "Female",
    other: "Other",
    prefer_not_to_say: "Prefer not to say",
  };
  $("#coursePreference").insertAdjacentHTML(
    "beforeend",
    courses
      .map((course) => `<option>${escape(course.title)}</option>`)
      .join(""),
  );
  for (const name of ["fullName", "parentName"]) {
    form.elements[name].minLength = 2;
    form.elements[name].maxLength = 120;
  }
  form.elements.email.maxLength = 254;
  form.elements.address.maxLength = 300;
  form.elements.message.maxLength = 5000;
  for (const name of ["phone", "guardianPhone"])
    form.elements[name].pattern = "[0-9]{10}";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const datePart = (type) => parts.find((part) => part.type === type).value;
  form.elements.dob.max = `${datePart("year")}-${datePart("month")}-${datePart("day")}`;

  function values() {
    return Object.fromEntries(
      Object.keys(names).map((name) => [
        name,
        String(form.elements[name].value).trim(),
      ]),
    );
  }
  function review() {
    const data = values();
    const block = (title, index, keys) =>
      `<section class="review-group"><div class="review-title"><h3>${title}</h3><button type="button" class="text-link" data-review-edit="${index}">Edit</button></div><div class="review-fields">${keys.map((name) => `<div><small>${names[name]}</small><p>${escape(name === "gender" ? labels[data[name]] || "Not specified" : data[name] || "Not provided")}</p></div>`).join("")}</div></section>`;
    $("#applicationReview").innerHTML =
      block("Student details", 0, Object.keys(names).slice(0, 10)) +
      block("Course & batch", 1, Object.keys(names).slice(10)) +
      `<section class="review-group"><div class="review-title"><h3>Photo & documents</h3><button type="button" class="text-link" data-review-edit="2">Edit</button></div>${photoURL ? `<img class="review-photo" src="${photoURL}" alt="Student passport photograph">` : "<p>No photo selected.</p>"}<p class="form-intro">Bring 2 passport photographs and 1 Aadhaar photocopy when you visit.</p></section>`;
  }
  function go(next) {
    step = next;
    sections.forEach((section, index) => {
      section.hidden = index !== step;
      section.disabled = index !== step;
    });
    document.querySelectorAll("#admissionSteps li").forEach((li, index) => {
      li.classList.toggle("active", index === step);
      li.classList.toggle("done", index < step);
      const button = li.querySelector("button");
      button.disabled = index > furthest;
      button.toggleAttribute("aria-current", index === step);
      if (index === step) button.setAttribute("aria-current", "step");
    });
    $("#formStepLabel").textContent =
      `STEP ${String(step + 1).padStart(2, "0")} / 05`;
    $("#formBack").hidden = step === 0;
    $("#applicationSubmit").innerHTML =
      step === 4
        ? "Submit & continue to payment " + icon("check")
        : "Continue " + icon("arrow");
    $("#formStatus").textContent = "";
    $("#applicationSubmit").disabled = busy || (step === 4 && !core);
    if (step === 3) review();
  }
  function validate() {
    if (step === 2) {
      if (photoBusy) {
        $("#formStatus").textContent =
          "Wait for the photograph to finish processing.";
        return false;
      }
      if (!photoURL) {
        $("#formStatus").textContent =
          "Choose the student’s passport photograph to continue.";
        $("#studentPhoto").focus();
        return false;
      }
    }
    for (const control of sections[step].querySelectorAll(
      "input,select,textarea",
    )) {
      if (control.type === "file") continue;
      control.setCustomValidity("");
      if (
        control.required &&
        control.type !== "checkbox" &&
        typeof control.value === "string" &&
        !control.value.trim()
      )
        control.setCustomValidity("Please complete this field.");
      if (!control.checkValidity()) {
        control.reportValidity();
        control.focus();
        $("#formStatus").textContent =
          "Please check the highlighted field before continuing.";
        return false;
      }
    }
    return true;
  }
  function clearPhoto() {
    photoEpoch++;
    photoBusy = false;
    core?.setStudentPhoto("");
    photoURL = "";
    $("#photoPreview").removeAttribute("src");
    $("#photoPreview").hidden = true;
    $("#photoPrompt").hidden = false;
    $("#photoRemove").hidden = true;
    $("#studentPhoto").value = "";
    $("#photoStatus").textContent = "";
    $("#applicationReview").replaceChildren();
  }
  function cropPhoto(file) {
    if (!core) {
      $("#photoStatus").textContent =
        "The secure admission service is still loading. Check your connection and reload if it remains unavailable.";
      return;
    }
    clearPhoto();
    const epoch = ++photoEpoch;
    if (file.size > 10 * 1024 * 1024) {
      $("#photoStatus").textContent = "Choose a JPG or PNG smaller than 10 MB.";
      return;
    }
    photoBusy = true;
    $("#photoStatus").textContent =
      "Checking and preparing your passport photograph…";
    core.processPassportPhoto(file, (error, dataUrl) => {
      if (epoch !== photoEpoch) return;
      photoBusy = false;
      if (error) {
        $("#photoStatus").textContent = error;
        return;
      }
      photoURL = dataUrl;
      core.setStudentPhoto(dataUrl);
      $("#photoStatus").textContent =
        "Passport photograph ready. It will be stored securely when you submit.";
    });
  }
  function setBusy(value) {
    busy = value;
    $("#clearApplication").disabled = value;
    $("#formBack").disabled = value;
    go(step);
    if (value) {
      sections.forEach((section) => {
        section.disabled = true;
      });
      document.querySelectorAll("#admissionSteps button").forEach((button) => {
        button.disabled = true;
      });
      $("#applicationSubmit").textContent = "Saving your application…";
    }
  }
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (busy || !validate()) return;
    if (step === 4) {
      for (let index = 0; index < 5; index++) {
        go(index);
        if (!validate()) return;
      }
    }
    if (step < 4) {
      furthest = Math.max(furthest, step + 1);
      go(step + 1);
      form.scrollIntoView({ behavior: scrollBehavior(), block: "start" });
      sections[step]
        .querySelector("input,select,button")
        ?.focus({ preventScroll: true });
    } else {
      if (!core) {
        $("#formStatus").textContent =
          "Secure admissions are unavailable. Check your connection and reload. No application has been submitted.";
        return;
      }
      setBusy(true);
      try {
        await core.submitApplication(event);
      } finally {
        setBusy(false);
      }
    }
  });
  $("#formBack").addEventListener("click", () => {
    if (!busy && step > 0) go(step - 1);
  });
  document.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button || busy) return;
    if (
      button.hasAttribute("data-step") &&
      Number(button.dataset.step) <= furthest
    ) {
      const target = Number(button.dataset.step);
      if (target > step) {
        for (let index = 0; index < target; index++) {
          go(index);
          if (!validate()) return;
        }
      }
      go(target);
    }
    if (button.hasAttribute("data-review-edit"))
      go(Number(button.dataset.reviewEdit));
  });
  $("#studentPhoto").addEventListener("change", () => {
    const file = $("#studentPhoto").files[0];
    if (file) cropPhoto(file);
  });
  $("#photoRemove").addEventListener("click", clearPhoto);
  function clear() {
    if (busy) return;
    clearPhoto();
    form.reset();
    form
      .querySelectorAll("input,select,textarea")
      .forEach((control) => control.setCustomValidity(""));
    furthest = 0;
    go(0);
    toast("Unsaved form entries cleared. Any saved payment reference is kept.");
  }
  $("#clearApplication").addEventListener("click", clear);
  form.addEventListener("reset", () =>
    queueMicrotask(() => {
      clearPhoto();
      furthest = 0;
      go(0);
    }),
  );
  $("#photoBox").addEventListener("click", () => $("#studentPhoto").click());
  $("#photoBox").addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      $("#studentPhoto").click();
    }
  });
  $("#photoBox").addEventListener("dragover", (event) =>
    event.preventDefault(),
  );
  $("#photoBox").addEventListener("drop", (event) => {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (!busy && file) cropPhoto(file);
  });
  import("../script.js?v=20261020-visitor-1")
    .then((service) => {
      core = service;
      core.initPhoneInputs();
      core.initPaymentSuccessDialog();
      core.initPaymentStep();
      $("#serviceStatus").textContent =
        "Secure admission service connected. Submit only after reviewing your details.";
      $("#admissionServiceState").textContent = "SECURE APPLICATION";
      go(step);
    })
    .catch(() => {
      $("#serviceStatus").textContent =
        "The secure admission service could not load. Check your connection and reload. No application has been submitted.";
      $("#admissionServiceState").textContent = "CONNECTION REQUIRED";
      go(step);
    });
  const payment = $("#paymentModal"),
    success = $("#paymentSuccessModal");
  function updateResume() {
    try {
      const saved = JSON.parse(
        localStorage.getItem("rehaan-pending-admission") || "null",
      );
      $("#resumeAdmissionPayment").hidden = !(saved?.appId && saved?.token);
    } catch {
      $("#resumeAdmissionPayment").hidden = true;
    }
  }
  $("#resumeAdmissionPayment").addEventListener("click", async () => {
    if (!core) return;
    $("#resumeAdmissionPayment").disabled = true;
    try {
      await core.initPaymentResume();
    } finally {
      $("#resumeAdmissionPayment").disabled = false;
      updateResume();
    }
  });
  updateResume();
  const paymentObserver = new MutationObserver(() => {
    updateResume();
    if (!payment.hidden || !success.hidden) {
      const other = document.querySelector("#featureDialog");
      if (other.open) other.close();
      (!success.hidden
        ? $("#paymentSuccessDone")
        : $("#razorpayPayBtn")
      )?.focus();
    }
  });
  paymentObserver.observe(payment, {
    attributes: true,
    attributeFilter: ["hidden"],
  });
  paymentObserver.observe(success, {
    attributes: true,
    attributeFilter: ["hidden"],
  });
  go(0);
  return {
    open(id, batch) {
      if (busy) return;
      if (courses[id]) $("#coursePreference").value = courses[id].title;
      if (batch) $("#batch").value = batch;
      go(0);
      $("#admission").scrollIntoView({
        behavior: scrollBehavior(),
        block: "start",
      });
    },
    clear,
  };
}
