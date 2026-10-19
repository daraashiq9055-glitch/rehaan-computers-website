// The entire application is a memory-only UI preview. No storage or requests.
export function initAdmission({ courses, showDialog, toast, escape, icon }) {
  const $ = (selector) => document.querySelector(selector),
    form = $("#applicationForm");
  const sections = [...form.querySelectorAll("[data-form-step]")];
  const scrollBehavior = () =>
    matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
  let step = 0,
    furthest = 0,
    photoURL = "",
    photoBusy = false,
    photoEpoch = 0;
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
      `<section class="review-group"><div class="review-title"><h3>Photo & documents</h3><button type="button" class="text-link" data-review-edit="2">Edit</button></div>${photoURL ? `<img class="review-photo" src="${photoURL}" alt="Local application photo">` : "<p>No photo selected.</p>"}<p class="form-intro">Bring 2 passport photographs and 1 Aadhaar photocopy when you visit.</p></section>`;
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
    $("#formNext").innerHTML =
      step === 4
        ? "Finish preview " + icon("check")
        : "Continue " + icon("arrow");
    $("#formStatus").textContent = "";
    if (step === 3) review();
  }
  function validate() {
    if (step === 2) {
      if (photoBusy) {
        $("#formStatus").textContent =
          "Wait for the local photo preview to finish.";
        return false;
      }
      if (!photoURL) {
        $("#formStatus").textContent =
          "Choose a photo or use the sample image to continue.";
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
    if (photoURL) URL.revokeObjectURL(photoURL);
    photoURL = "";
    $("#photoPreview").removeAttribute("src");
    $("#photoPreview").hidden = true;
    $("#photoPlaceholder").hidden = false;
    $("#removePhoto").hidden = true;
    $("#studentPhoto").value = "";
    $("#photoStatus").textContent = "";
    $("#applicationReview").replaceChildren();
  }
  async function cropPhoto(source) {
    const epoch = ++photoEpoch;
    photoBusy = true;
    $("#photoStatus").textContent = "Preparing a local square photo…";
    let sourceURL = "",
      image;
    try {
      image = new Image();
      if (source instanceof File) {
        if (
          !["image/jpeg", "image/png"].includes(source.type) ||
          source.size > 10 * 1024 * 1024
        )
          throw Error("Choose a JPG or PNG smaller than 10 MB.");
        sourceURL = URL.createObjectURL(source);
        image.src = sourceURL;
      } else image.src = source;
      await image.decode();
      if (
        !image.naturalWidth ||
        image.naturalWidth * image.naturalHeight > 40000000
      )
        throw Error("Choose a smaller photograph.");
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 360;
      const context = canvas.getContext("2d");
      if (!context)
        throw Error("Photo preview is unavailable in this browser.");
      const side = Math.min(image.naturalWidth, image.naturalHeight);
      context.drawImage(
        image,
        (image.naturalWidth - side) / 2,
        (image.naturalHeight - side) / 2,
        side,
        side,
        0,
        0,
        360,
        360,
      );
      const encoded = canvas.toDataURL("image/jpeg", 0.82),
        bytes = Uint8Array.from(atob(encoded.split(",")[1]), (char) =>
          char.charCodeAt(0),
        );
      if (epoch !== photoEpoch) return;
      if (photoURL) URL.revokeObjectURL(photoURL);
      photoURL = URL.createObjectURL(new Blob([bytes], { type: "image/jpeg" }));
      $("#photoPreview").src = photoURL;
      $("#photoPreview").hidden = false;
      $("#photoPlaceholder").hidden = true;
      $("#removePhoto").hidden = false;
      $("#photoStatus").textContent =
        "Square photo ready on this page. Nothing was uploaded.";
    } catch (error) {
      if (epoch === photoEpoch)
        $("#photoStatus").textContent =
          error.message ||
          "This photo could not be opened. Try another JPG or PNG.";
    } finally {
      if (sourceURL) URL.revokeObjectURL(sourceURL);
      if (epoch === photoEpoch) photoBusy = false;
    }
  }
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!validate()) return;
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
    } else
      showDialog(
        "Your application preview is complete.",
        `<div class="completion">${icon("check")}<h3>Review complete. No application was submitted.</h3><p>You have explored all five steps, including the separate ₹100 admission fee. The real website’s existing payment process will be connected only after design approval and testing.</p><p><strong>No money was charged, no email was sent and no student record was created.</strong></p></div><div class="dialog-actions"><button class="button gold" data-action="close-dialog">Return to preview</button><button class="button outline" data-action="clear-application">Clear my preview entries</button></div>`,
      );
  });
  $("#formBack").addEventListener("click", () => {
    if (step > 0) go(step - 1);
  });
  document.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
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
    if (button.dataset.action === "sample-photo")
      cropPhoto("../../public/assets/hero-library.jpg");
  });
  $("#studentPhoto").addEventListener("change", () => {
    const file = $("#studentPhoto").files[0];
    if (file) cropPhoto(file);
  });
  $("#removePhoto").addEventListener("click", clearPhoto);
  function clear() {
    clearPhoto();
    form.reset();
    form
      .querySelectorAll("input,select,textarea")
      .forEach((control) => control.setCustomValidity(""));
    furthest = 0;
    go(0);
    toast("Preview entries cleared. No records were created.");
  }
  $("#clearApplication").addEventListener("click", clear);
  window.addEventListener("pagehide", () => {
    if (photoURL) URL.revokeObjectURL(photoURL);
  });
  go(0);
  return {
    open(id, batch) {
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
