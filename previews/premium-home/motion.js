// Decorative motion remains controllable, keyboard accessible and local-only.
export function initMotion() {
  const $ = (selector) => document.querySelector(selector);
  const brand = $("#brandMenuButton"),
    brandMenu = $("#brandMenu");
  function showMenu(open, focus = false) {
    brandMenu.hidden = !open;
    brand.setAttribute("aria-expanded", String(open));
    if (open && focus) brandMenu.querySelector("[role=menuitem]").focus();
  }
  brand.addEventListener("click", () => showMenu(brandMenu.hidden));
  brand.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      showMenu(true, true);
      if (event.key === "ArrowUp")
        [...brandMenu.querySelectorAll("[role=menuitem]")].at(-1).focus();
    }
  });
  brandMenu.addEventListener("keydown", (event) => {
    const items = [...brandMenu.querySelectorAll("[role=menuitem]")],
      index = items.indexOf(document.activeElement);
    let next;
    if (event.key === "ArrowDown") next = (index + 1) % items.length;
    if (event.key === "ArrowUp")
      next = (index - 1 + items.length) % items.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = items.length - 1;
    if (next !== undefined) {
      event.preventDefault();
      items[next].focus();
    }
    if (event.key === "Escape") {
      event.preventDefault();
      showMenu(false);
      brand.focus();
    }
  });
  brandMenu.addEventListener("click", (event) => {
    if (event.target.closest("a")) showMenu(false);
  });
  document.addEventListener("pointerdown", (event) => {
    if (!event.target.closest(".brand-wrap")) showMenu(false);
  });
  $(".brand-wrap").addEventListener("focusout", () =>
    queueMicrotask(() => {
      if (!$(".brand-wrap").contains(document.activeElement)) showMenu(false);
    }),
  );
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !brandMenu.hidden) {
      showMenu(false);
      brand.focus();
    }
  });

  let skillsPaused = false;
  $("#skillsPause").addEventListener("click", () => {
    skillsPaused = !skillsPaused;
    $(".skills-line").classList.toggle("is-paused", skillsPaused);
    $("#skillsPause").setAttribute("aria-pressed", String(skillsPaused));
    $("#skillsPause").setAttribute(
      "aria-label",
      skillsPaused ? "Resume moving skills line" : "Pause moving skills line",
    );
  });

  const region = $(".experience-visual");
  const slides = [...document.querySelectorAll(".experience-slide")];
  const dots = [...document.querySelectorAll("[data-experience-slide]")];
  const captions = [
    "Understanding comes<br>from trying.",
    "Practise real tasks.<br>Build real confidence.",
    "Your ideas.<br>Clearer documents.",
    "A little practice.<br>A lasting difference.",
  ];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  let selected = 0,
    paused = false,
    hovered = false,
    focused = false,
    visible = false,
    timer = 0;
  function select(index) {
    selected = ((index % slides.length) + slides.length) % slides.length;
    slides.forEach((slide, current) => {
      const active = current === selected;
      slide.classList.toggle("is-active", active);
      slide.setAttribute("aria-hidden", String(!active));
    });
    dots.forEach((dot, current) =>
      dot.setAttribute("aria-pressed", String(current === selected)),
    );
    $("#experienceSlideCount").textContent =
      `${String(selected + 1).padStart(2, "0")} / 04`;
    $("#experienceSlideTitle").innerHTML = captions[selected];
  }
  function schedule() {
    clearInterval(timer);
    timer = 0;
    if (
      !paused &&
      !hovered &&
      !focused &&
      visible &&
      !reduce.matches &&
      !document.hidden
    ) {
      timer = setInterval(() => select(selected + 1), 5000);
    }
    $("#experiencePause").disabled = reduce.matches;
    $("#experiencePause").setAttribute("aria-pressed", String(paused));
    $("#experiencePause").setAttribute(
      "aria-label",
      reduce.matches
        ? "Automatic slideshow disabled for reduced motion"
        : paused
          ? "Resume learning slideshow"
          : "Pause learning slideshow",
    );
  }
  $("#experiencePause").addEventListener("click", () => {
    paused = !paused;
    schedule();
  });
  dots.forEach((dot, index) =>
    dot.addEventListener("click", () => {
      select(index);
      schedule();
    }),
  );
  region.addEventListener("mouseenter", () => {
    hovered = true;
    schedule();
  });
  region.addEventListener("mouseleave", () => {
    hovered = false;
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
  region.addEventListener("keydown", (event) => {
    if (event.target.closest("button")) return;
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      select(selected + (event.key === "ArrowRight" ? 1 : -1));
      schedule();
    }
  });
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
  window.addEventListener("pagehide", () => clearInterval(timer));
  window.addEventListener("pageshow", schedule);
  select(0);
  schedule();
}
