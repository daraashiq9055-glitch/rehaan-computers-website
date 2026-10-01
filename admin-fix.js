/* REHAAN COMPUTERS - admin fixes. Load in admin.html AFTER script.js */

import { getApps } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";

import {
    getAuth,
    signOut,
    setPersistence,
    inMemoryPersistence
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";


/* 1. Always ask for email + password when the admin page opens */

// keep the dashboard hidden until any old saved login is cleared
const hideDashboard = document.createElement("style");
hideDashboard.textContent = "#adminDashboard{display:none!important}";
document.head.appendChild(hideDashboard);

// if the browser restores the page from the Back button, reload it fresh
window.addEventListener("pageshow", event => {
    if (event.persisted) {
        window.location.reload();
    }
});

const auth = getAuth(getApps()[0]);

auth.authStateReady()
    .then(() => signOut(auth))
    .then(() => setPersistence(auth, inMemoryPersistence))
    .catch(error => console.error("Admin session reset error:", error))
    .then(() => setTimeout(() => hideDashboard.remove(), 400));


/* 2. Replace "APPLICATION NaN" with the student's name */

const list = document.getElementById("applicationsList");

if (list) {

    const fixLabels = () => {

        list.querySelectorAll(".application-number").forEach(label => {

            if (label.textContent.includes("NaN")) {

                const heading = label
                    .closest(".application-card")
                    ?.querySelector("h3");

                label.textContent = heading
                    ? heading.textContent.trim()
                    : "";
            }

        });

    };

    new MutationObserver(fixLabels).observe(list, {
        childList: true,
        subtree: true
    });

    fixLabels();

}