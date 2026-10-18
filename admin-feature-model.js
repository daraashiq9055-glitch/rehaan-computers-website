// Pure formatting and validation for saved mark cards and fee receipts.
export function indiaDate() {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (k) => p.find((v) => v.type === k).value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}
export function money(paise) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: paise % 100 ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(paise / 100);
}
export function dateLabel(v) {
  return /^\d{4}-\d{2}-\d{2}$/.test(v || "")
    ? new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Kolkata",
      }).format(new Date(v + "T00:00:00+05:30"))
    : "—";
}
export function monthLabel(v) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(v || "")
    ? new Intl.DateTimeFormat("en-IN", {
        month: "long",
        year: "numeric",
        timeZone: "Asia/Kolkata",
      }).format(new Date(v + "-01T00:00:00+05:30"))
    : "—";
}
export const escapeHTML = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export function validateCard(input) {
  const title = String(input.title || "").trim();
  if (!title || title.length > 120)
    throw Error("Enter an assessment title up to 120 characters.");
  const date = input.date;
  const time = new Date(date + "T00:00:00Z");
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date || "") ||
    !Number.isFinite(time.getTime()) ||
    time.toISOString().slice(0, 10) !== date ||
    date > indiaDate()
  )
    throw Error("Choose a valid assessment date that is not in the future.");
  if (
    !Array.isArray(input.subjects) ||
    !input.subjects.length ||
    input.subjects.length > 12
  )
    throw Error("Use between 1 and 12 subjects.");
  const names = new Set();
  const subjects = input.subjects.map((row) => {
    const name = String(row.name || "").trim();
    const max = Number(row.max);
    const marks =
      row.marks === "" || row.marks === null ? null : Number(row.marks);
    if (!name || name.length > 100 || names.has(name.toLowerCase()))
      throw Error("Give each subject a unique name, up to 100 characters.");
    names.add(name.toLowerCase());
    if (
      !Number.isFinite(max) ||
      max <= 0 ||
      max > 1000 ||
      !Number.isInteger(max)
    )
      throw Error("Maximum marks must be a whole number from 1 to 1000.");
    if (marks !== null && (!Number.isFinite(marks) || marks < 0 || marks > max))
      throw Error(
        "Obtained marks must be between zero and the subject maximum.",
      );
    return { name, max, marks };
  });
  return { title, date, subjects };
}
export function cardResult(card) {
  const complete = card.subjects.every((s) => s.marks !== null);
  const maximum = card.subjects.reduce((a, s) => a + s.max, 0);
  const total = complete
    ? card.subjects.reduce((a, s) => a + s.marks, 0)
    : null;
  const percentage = complete
    ? Math.round((total / maximum) * 10000) / 100
    : null;
  const passed =
    complete && card.subjects.every((s) => s.marks / s.max >= 0.33);
  const grade = !complete
    ? "Incomplete"
    : !passed
      ? "Not passed"
      : percentage >= 90
        ? "A+"
        : percentage >= 75
          ? "A"
          : percentage >= 60
            ? "B"
            : percentage >= 45
              ? "C"
              : percentage >= 33
                ? "D"
                : "Not passed";
  return { complete, maximum, total, percentage, passed, grade };
}
export function makeReceipt({
  id,
  data,
  due,
  added,
  total,
  monthly,
  receiptId,
  createdAt,
  createdBy,
}) {
  const amount = Math.round(added * 100),
    received = Math.round(total * 100),
    billed = Math.round(monthly * 100);
  const time = new Date(due + "T00:00:00Z");
  if (
    !id ||
    !/^\d{4}-\d{2}-\d{2}$/.test(due || "") ||
    !Number.isFinite(time.getTime()) ||
    time.toISOString().slice(0, 10) !== due ||
    !/^[a-f0-9]{32}$/.test(receiptId || "") ||
    ![amount, received, billed].every(Number.isSafeInteger) ||
    amount <= 0 ||
    received < amount ||
    received > billed ||
    billed <= 0
  )
    throw Error("Invalid payment receipt values.");
  return {
    id: receiptId,
    number: "RC-" + receiptId.toUpperCase(),
    studentId: id,
    student: {
      name: String(data.fullName || "Student"),
      admission: String(data.admissionNumber || "—"),
      course: String(data.coursePreference || data.course || "—"),
      phone: String(data.phone || ""),
    },
    period: due.slice(0, 7),
    due,
    date: indiaDate(),
    method: "Manually recorded",
    amount,
    billed,
    receivedAtIssue: received,
    balanceAtIssue: billed - received,
    createdAt,
    createdBy,
  };
}

export function validateReceiptCorrection(input) {
  const text = (key, max, required = false, min = 2) => {
    const value = String(input[key] ?? "").trim();
    if (value.length > max || (required && value.length < min))
      throw Error("Enter a valid " + key + " (up to " + max + " characters).");
    return value;
  };
  const amountText = String(input.amount ?? "").trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(amountText))
    throw Error("Enter an amount with up to two decimal places.");
  const amount = Math.round(Number(amountText) * 100);
  if (!Number.isSafeInteger(amount) || amount <= 0 || amount > 99900)
    throw Error("Receipt amount must be between ₹0.01 and ₹999.");
  const date = text("date", 10, true),
    time = new Date(date + "T00:00:00Z");
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(time.getTime()) ||
    time.toISOString().slice(0, 10) !== date ||
    date > indiaDate()
  )
    throw Error("Choose a valid payment date that is not in the future.");
  const method = String(input.method || "");
  if (!["Manually recorded", "Cash", "UPI", "Bank transfer"].includes(method))
    throw Error("Choose a recorded payment method.");
  const reason = text("reason", 500, true);
  if (reason.length < 5)
    throw Error(
      "Describe the correction reason using at least five characters.",
    );
  return {
    name: text("name", 120, true),
    admission: text("admission", 20, true, 1),
    course: text("course", 120, true),
    date,
    method,
    note: text("note", 160),
    reason,
    amount,
  };
}
export function receiptAuditSnapshot(receipt) {
  return {
    student: structuredClone(receipt.student),
    date: receipt.date,
    method: receipt.method,
    note: receipt.note || "",
    amount: receipt.amount,
    receivedAtIssue: receipt.receivedAtIssue,
    balanceAtIssue: receipt.balanceAtIssue,
    revision: receipt.revision || 0,
    balanceRecordedAt: receipt.balanceRecordedAt || receipt.createdAt,
  };
}
