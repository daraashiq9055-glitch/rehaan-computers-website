/* =====================================================
   REHAAN COMPUTERS
   WEBSITE JAVASCRIPT
===================================================== */


/* =====================================================
   MOBILE NAVIGATION
===================================================== */

const mobileMenuButton =
    document.getElementById("mobileMenuButton");

const mobileNav =
    document.getElementById("mobileNav");


if (mobileMenuButton && mobileNav) {

    mobileMenuButton.addEventListener(
        "click",
        function () {

            mobileNav.classList.toggle("open");

        }
    );


    mobileNav.querySelectorAll("a").forEach(
        function (link) {

            link.addEventListener(
                "click",
                function () {

                    mobileNav.classList.remove("open");

                }
            );

        }
    );

}


/* =====================================================
   APPLICATION FORM
===================================================== */

const applicationForm =
    document.getElementById("applicationForm");

const submitButton =
    document.getElementById("submitButton");

const submitText =
    document.getElementById("submitText");

const submitArrow =
    document.getElementById("submitArrow");

const formStatus =
    document.getElementById("formStatus");


/*
    IMPORTANT

    This is the FormSubmit AJAX endpoint.

    The first email receives the message.
    The second email is added through _cc
    inside the HTML form.
*/

const FORM_ENDPOINT =
    "https://formsubmit.co/ajax/daraashiq9055@gmail.com";


/* =====================================================
   VALIDATE PHONE
===================================================== */

function isValidPhone(number) {

    return /^[0-9]{10}$/.test(number);

}


/* =====================================================
   SHOW MESSAGE
===================================================== */

function showStatus(type, title, message) {

    formStatus.className =
        "form-status " + type;

    formStatus.innerHTML = `
        <strong>${title}</strong>
        <span>${message}</span>
    `;

    formStatus.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });

}


/* =====================================================
   FORM SUBMISSION
===================================================== */

if (applicationForm) {

    applicationForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            /* -----------------------------------------
               GET VALUES
            ----------------------------------------- */

            const phone =
                document.getElementById("phone")
                    .value.trim();


            const whatsapp =
                document.getElementById("whatsapp")
                    .value.trim();


            const name =
                document.getElementById("name")
                    .value.trim();


            const course =
                document.getElementById("course")
                    .value;


            const agreement =
                document.getElementById("agreement")
                    .checked;


            /* -----------------------------------------
               VALIDATION
            ----------------------------------------- */

            if (name.length < 2) {

                showStatus(
                    "error",
                    "Please check your details.",
                    "Enter the student's full name."
                );

                return;

            }


            if (!isValidPhone(phone)) {

                showStatus(
                    "error",
                    "Invalid phone number.",
                    "Please enter a valid 10-digit phone number."
                );

                return;

            }


            if (
                whatsapp !== "" &&
                !isValidPhone(whatsapp)
            ) {

                showStatus(
                    "error",
                    "Invalid WhatsApp number.",
                    "Please enter a valid 10-digit WhatsApp number."
                );

                return;

            }


            if (!course) {

                showStatus(
                    "error",
                    "Course not selected.",
                    "Please select your preferred course."
                );

                return;

            }


            if (!agreement) {

                showStatus(
                    "error",
                    "Please confirm the application.",
                    "Tick the confirmation box before submitting."
                );

                return;

            }


            /* -----------------------------------------
               LOADING STATE
            ----------------------------------------- */

            submitButton.disabled =
                true;

            submitText.textContent =
                "Submitting...";

            submitArrow.textContent =
                "⌛";


            formStatus.className =
                "form-status";



            try {


                /* -------------------------------------
                   COLLECT FORM DATA
                ------------------------------------- */

                const formData =
                    new FormData(applicationForm);


                /*
                   Convert FormData into a normal
                   JavaScript object for AJAX submission.
                */

                const data =
                    Object.fromEntries(
                        formData.entries()
                    );


                /*
                   Remove checkbox value because
                   it is only for confirmation.
                */

                delete data.agreement;



                /* -------------------------------------
                   SEND TO FORMSUBMIT
                ------------------------------------- */

                const response =
                    await fetch(
                        FORM_ENDPOINT,
                        {
                            method:
                                "POST",

                            headers:
                                {
                                    "Content-Type":
                                        "application/json",

                                    "Accept":
                                        "application/json"
                                },

                            body:
                                JSON.stringify(data)
                        }
                    );


                const result =
                    await response.json();



                /* -------------------------------------
                   SUCCESS
                ------------------------------------- */

                if (
                    response.ok &&
                    result.success !== false
                ) {


                    applicationForm.reset();


                    submitButton.disabled =
                        false;


                    submitText.textContent =
                        "Application Submitted";


                    submitArrow.textContent =
                        "✓";


                    showStatus(
                        "success",
                        "Application received!",
                        "Thank you for your interest in Rehaan Computers. Our team will contact you manually."
                    );


                    /*
                       Keep button usable for another
                       application after a short delay.
                    */

                    setTimeout(
                        function () {

                            submitText.textContent =
                                "Submit Application";

                            submitArrow.textContent =
                                "→";

                        },
                        5000
                    );


                } else {

                    throw new Error(
                        result.message ||
                        "Unable to submit application."
                    );

                }


            } catch (error) {


                console.error(
                    "Application error:",
                    error
                );


                showStatus(
                    "error",
                    "Application could not be sent.",
                    "Please try again. If the problem continues, contact Rehaan Computers directly."
                );


                submitButton.disabled =
                    false;


                submitText.textContent =
                    "Submit Application";


                submitArrow.textContent =
                    "→";

            }

        }
    );

}