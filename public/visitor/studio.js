// Decorative motion only. Course actions use the existing preview catalogue.
export function initStudio() {
  const studio = document.querySelector(".hero-studio");
  const button = document.querySelector("#studioMotion");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let paused = false;
  let visible = false;
  function update() {
    studio.classList.toggle(
      "studio-live",
      visible && !paused && !reduced.matches && !document.hidden,
    );
    button.disabled = reduced.matches;
    button.setAttribute("aria-pressed", String(paused));
    button.setAttribute(
      "aria-label",
      reduced.matches
        ? "Computer learning animation disabled for reduced motion"
        : paused
          ? "Resume computer learning animation"
          : "Pause computer learning animation",
    );
    button
      .querySelector("path")
      .setAttribute("d", paused ? "m7 4 8 6-8 6Z" : "M7 5v10M13 5v10");
  }
  button.addEventListener("click", () => {
    paused = !paused;
    update();
  });
  const observer = new IntersectionObserver(
    (entries) => {
      visible = entries[0].isIntersecting;
      update();
    },
    { threshold: 0.1 },
  );
  observer.observe(studio);
  reduced.addEventListener("change", update);
  document.addEventListener("visibilitychange", update);
  window.addEventListener("pagehide", () =>
    studio.classList.remove("studio-live"),
  );
  window.addEventListener("pageshow", update);
  update();
}
