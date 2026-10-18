// Decorative login interactions only. No credentials, database or payment access.
const card = document.getElementById("adminLoginCard");
const story = card?.querySelector(".login-story");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let frame = 0;
let pointer;

function resetTilt() {
    story?.style.setProperty("--machine-x", "0deg");
    story?.style.setProperty("--machine-y", "0deg");
}

function updateMotion() {
    card?.classList.toggle("motion-paused", reducedMotion.matches);
    if (reducedMotion.matches) resetTilt();
}

reducedMotion.addEventListener("change", updateMotion);

story?.addEventListener("pointermove", event => {
    if (event.pointerType !== "mouse" || reducedMotion.matches || document.body.classList.contains("signed-in")) return;
    pointer = { x: event.clientX, y: event.clientY };
    if (frame) return;
    frame = requestAnimationFrame(() => {
        frame = 0;
        if (!pointer || reducedMotion.matches || document.body.classList.contains("signed-in")) return;
        const box = story.getBoundingClientRect();
        const x = Math.max(-.5, Math.min(.5, (pointer.x - box.left) / box.width - .5));
        const y = Math.max(-.5, Math.min(.5, (pointer.y - box.top) / box.height - .5));
        story.style.setProperty("--machine-x", (-y * 8).toFixed(2) + "deg");
        story.style.setProperty("--machine-y", (x * 10).toFixed(2) + "deg");
    });
});
story?.addEventListener("pointerleave", () => { pointer = null; resetTilt(); });
updateMotion();
