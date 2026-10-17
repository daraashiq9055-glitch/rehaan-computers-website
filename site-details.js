// Reveal the location only on request. No geolocation or Firebase access.
const trigger = document.querySelector('.footer-location-link');
const section = document.getElementById('location');
const close = document.getElementById('locationClose');
const frame = section?.querySelector('iframe[data-src]');
const heading = document.getElementById('locationHeading');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function showLocation(show) {
    if (!trigger || !section) return;
    section.hidden = !show;
    trigger.setAttribute('aria-expanded', String(show));
    const label = trigger.querySelector('.location-toggle-label');
    if (label) label.textContent = show ? 'Hide map' : 'Find us on the map';
    if (show) {
        if (frame && !frame.hasAttribute('src')) frame.src = frame.dataset.src;
        heading?.focus({ preventScroll: true });
        section.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'start' });
    } else {
        trigger.focus({ preventScroll: true });
    }
}

trigger?.addEventListener('click', event => {
    // Modified clicks retain the native directions-link behavior.
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    showLocation(section?.hidden ?? true);
});
close?.addEventListener('click', () => showLocation(false));
section?.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !section.hidden) {
        event.preventDefault();
        showLocation(false);
    }
});
