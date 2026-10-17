// Pure record helpers shared by the dashboard and its isolated regression tests.
export function recordTime(value) {
    if (value && typeof value.toDate === "function") value = value.toDate();
    else if (value && typeof value.seconds === "number") value = value.seconds * 1000;
    const time = new Date(value || 0).getTime();
    return Number.isFinite(time) ? time : 0;
}

export function isCloudinaryPhoto(value) {
    // Standard raster delivery URLs only. No credentials, arbitrary hosts,
    // HTML characters, query strings or transformations supplied as HTML.
    return typeof value === "string" && value.length <= 2048
        && /^https:\/\/res\.cloudinary\.com\/[A-Za-z0-9_-]+\/image\/(?:upload|private|authenticated)\/[A-Za-z0-9_.,!~():/+-]+\.(?:jpe?g|png|webp)$/.test(value);
}

export function isSafePhoto(value) {
    return typeof value === "string" && (
        /^data:image\/(?:jpeg|jpg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value)
        || isCloudinaryPhoto(value)
    );
}

export function csvCell(value) {
    let text = String(value ?? "");
    // Quoting alone does not stop spreadsheet formula execution.
    if (/^[\s]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
}

export function fieldValue(record, path) {
    return path.split(".").reduce((value, key) => value?.[key], record);
}

export function formatGender(value) {
    const labels = { male: "Male", female: "Female", other: "Other", prefer_not_to_say: "Prefer not to say" };
    return Object.hasOwn(labels, value) ? labels[value] : value || "Not specified";
}

export function canonicalRecord(value) {
    // Firestore map field order is not a change to the stored record.
    return JSON.stringify(value, (_key, item) => item && typeof item === "object" && !Array.isArray(item)
        ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]]))
        : item);
}

export function paymentPatch(original, patch) {
    const result = { ...patch };
    if (patch.payment) {
        delete result.payment;
        for (const [key, value] of Object.entries(patch.payment)) {
            if (canonicalRecord(value) !== canonicalRecord(original.payment?.[key])) result["payment." + key] = value;
        }
    }
    return result;
}

export function assertUnchanged(original, latest, patch) {
    for (const path of Object.keys(patch)) {
        if (canonicalRecord(fieldValue(original, path)) !== canonicalRecord(fieldValue(latest, path))) {
            throw new Error("This record changed in another session. Close this window, refresh and try again. Your changes were not saved.");
        }
    }
}

export function validateChanges(original, patch) {
    if ("gender" in patch && !["", "male", "female", "other", "prefer_not_to_say"].includes(patch.gender)) throw new Error("Choose a gender from the list or leave it unspecified.");
    const limits = { fullName: 120, parentName: 120, email: 254, address: 300, message: 5000,
        coursePreference: 120, batch: 40, source: 120, qualification: 64, adminNote: 5000,
        admissionNumber: 20, rollNumber: 20, guardianPhone: 20 };
    for (const [field, max] of Object.entries(limits)) {
        if (field in patch && (typeof patch[field] !== "string" || patch[field].length > max)) {
            throw new Error(field + " must be text of no more than " + max + " characters.");
        }
    }
    if ("fullName" in patch && patch.fullName.trim().length < 2) throw new Error("Enter the student's full name.");
    if ("phone" in patch && !/^\d{10}$/.test(patch.phone)) throw new Error("Student phone must contain exactly 10 digits.");
    if ("guardianPhone" in patch && patch.guardianPhone && !/^\d{10}$/.test(patch.guardianPhone)) throw new Error("Guardian phone must contain exactly 10 digits or be blank.");
    if ("email" in patch && patch.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(patch.email)) throw new Error("Enter a valid email address or leave it blank.");
    if ("aadhaarLast4" in patch && patch.aadhaarLast4 && !/^\d{4}$/.test(patch.aadhaarLast4)) throw new Error("Enter only the last four Aadhaar digits.");
    if ("photo" in patch && patch.photo && (!isSafePhoto(patch.photo) || patch.photo.length > 500000)) throw new Error("Choose a valid JPG or PNG student photograph below 500 KB after cropping.");
    for (const field of ["dob", "admissionDate"]) {
        if (!(field in patch) || !patch[field]) continue;
        const text = patch[field];
        const date = new Date(text + "T00:00:00Z");
        if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0,10) !== text || date.getUTCFullYear() < 1900) throw new Error("Enter a valid " + (field === "dob" ? "date of birth" : "admission date") + ".");
        const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
        if (text > today) throw new Error("Date of birth and admission date cannot be in the future.");
    }
    if ("admissionNumber" in patch && patch.admissionNumber && !/^[A-Za-z0-9/_-]+$/.test(patch.admissionNumber)) throw new Error("Admission number may contain letters, numbers, /, _ and -.");
    if ((patch.status || original.status) === "Approved" && !(patch.admissionNumber ?? original.admissionNumber)) throw new Error("An admission number is required before approval.");
    if ("coursePreference" in patch && !patch.coursePreference.trim()) throw new Error("A course is required.");
}
