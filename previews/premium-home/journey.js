// An informative introduction, independent of admissions, accounts and payments.
export function initJourney() {
  const region = document.querySelector(".hero-journey");
  const controls = [...region.querySelectorAll("[data-journey]")];
  const motion = region.querySelector("#journeyMotion");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const stages = [
    {
      title: "A starting point that fits you.",
      description:
        "New to computers or ready for your next skill? Explore seven learning paths and find a course for your goals.",
      tags: ["Beginner-friendly options", "Course guidance"],
    },
    {
      title: "Real practice. Personal guidance.",
      description:
        "Work on your own system with individual attention. Learn through documents, spreadsheets, typing and practical accounting tasks.",
      tags: ["Your own system", "Hands-on learning"],
    },
    {
      title: "Skills for your everyday future.",
      description:
        "Build confidence for study, office tasks or business work. Explore the full syllabus and choose the skills you want to develop.",
      tags: ["Useful computer skills", "Professional certificates"],
    },
  ];
  let selected = 0,
    paused = false,
    focused = false,
    visible = false,
    timer = 0;
  function select(index) {
    selected = (index + stages.length) % stages.length;
    const stage = stages[selected];
    controls.forEach((button, i) =>
      button.setAttribute("aria-pressed", String(i === selected)),
    );
    region.querySelector("#journeyCount").textContent =
      `${String(selected + 1).padStart(2, "0")} / 03`;
    region.querySelector("#journeyTitle").textContent = stage.title;
    region.querySelector("#journeyDescription").textContent = stage.description;
    region.querySelector("#journeyTags").replaceChildren(
      ...stage.tags.map((text) => {
        const tag = document.createElement("span");
        tag.textContent = text;
        return tag;
      }),
    );
    schedule();
  }
  function schedule() {
    clearTimeout(timer);
    const running =
      visible && !paused && !focused && !reduce.matches && !document.hidden;
    region.classList.remove("journey-running");
    // Restart the visual progress with the same duration as the next stage.
    void region.offsetWidth;
    region.classList.toggle("journey-running", running);
    if (running) timer = setTimeout(() => select(selected + 1), 6500);
    motion.disabled = reduce.matches;
    motion.setAttribute("aria-pressed", String(paused));
    motion.setAttribute(
      "aria-label",
      reduce.matches
        ? "Automatic journey disabled for reduced motion"
        : paused
          ? "Resume learning journey"
          : "Pause learning journey",
    );
    motion
      .querySelector("path")
      .setAttribute("d", paused ? "m7 4 8 6-8 6Z" : "M7 5v10M13 5v10");
  }
  controls.forEach((button, index) =>
    button.addEventListener("click", () => select(index)),
  );
  region
    .querySelector(".journey-stages")
    .addEventListener("keydown", (event) => {
      const current = controls.indexOf(document.activeElement);
      if (current < 0) return;
      let next;
      if (event.key === "ArrowRight") next = (current + 1) % stages.length;
      if (event.key === "ArrowLeft")
        next = (current + stages.length - 1) % stages.length;
      if (event.key === "Home") next = 0;
      if (event.key === "End") next = stages.length - 1;
      if (next === undefined) return;
      event.preventDefault();
      controls[next].focus();
      select(next);
    });
  motion.addEventListener("click", () => {
    paused = !paused;
    schedule();
  });
  region.addEventListener("focusin", () => {
    focused = true;
    schedule();
  });
  region.addEventListener("focusout", () =>
    queueMicrotask(() => {
      focused = region.contains(document.activeElement);
      schedule();
    }),
  );
  const observer = new IntersectionObserver(
    (entries) => {
      visible = entries[0].isIntersecting;
      schedule();
    },
    { threshold: 0.15 },
  );
  observer.observe(region);
  document.addEventListener("visibilitychange", schedule);
  reduce.addEventListener("change", schedule);
  window.addEventListener("pagehide", () => {
    clearTimeout(timer);
    region.classList.remove("journey-running");
  });
  window.addEventListener("pageshow", schedule);
  select(0);
}
