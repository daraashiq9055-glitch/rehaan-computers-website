import {
  escapeHTML as e,
  indiaDate,
  money,
  dateLabel,
  monthLabel,
  validateCard,
  cardResult,
  validateReceiptCorrection,
} from "./admin-feature-model.js?v=20261018-login-fix-1";
import { receiptPNG, whatsappURL } from "./admin-receipt-image.js?v=20261018-login-fix-1";
let apps = [],
  selected = "",
  receipts = [],
  imageURL = null,
  renderVersion = 0,
  sessionEpoch = 0,
  saving = false;
let markPhotoVersion = 0, markImageWidth = 3840;
let services = {};
export function configureAdditions(options) {
  services = options;
}
function storedCard(entry) {
  return entry.data.markCard
    ? validateCard(entry.data.markCard)
    : defaultCard();
}
function syncReceipts(records) {
  receipts = records
    .flatMap((entry) =>
      Object.values(entry.data.feeReceipts || {}).filter(
        (r) =>
          r &&
          r.studentId === entry.id &&
          /^[a-f0-9]{32}$/.test(r.id || "") &&
          r.student &&
          typeof r.student.name === "string" &&
          Number.isSafeInteger(r.amount) &&
          r.amount > 0 &&
          Number.isSafeInteger(r.balanceAtIssue) &&
          r.balanceAtIssue >= 0 &&
          Number.isSafeInteger(r.receivedAtIssue) &&
          Number.isSafeInteger(r.billed),
      ),
    )
    .sort((a, b) =>
      String(b.createdAt || "").localeCompare(String(a.createdAt || "")),
    );
}
const $ = (s) => document.querySelector(s);
const defaultCard = () => ({
  title: "Progress assessment",
  date: indiaDate(),
  subjects: [
    { name: "Computer fundamentals", max: 100, marks: null },
    { name: "Office applications", max: 100, marks: null },
    { name: "Practical assessment", max: 100, marks: null },
  ],
});
function modal(title, html) {
  let d = $("#rcFeatureDialog");
  if (!d) {
    d = document.createElement("dialog");
    d.id = "rcFeatureDialog";
    d.className = "rc-feature-dialog";
    d.addEventListener("close", () => {
      renderVersion++;
      if (imageURL) {
        URL.revokeObjectURL(imageURL);
        imageURL = null;
      }
      d.replaceChildren();
    });
    document.body.append(d);
  }
  d.innerHTML = `<div class="rc-feature-head"><div><small>REHAAN COMPUTERS · ADMINISTRATION</small><h3>${title}</h3></div><button type="button" data-new="close" aria-label="Close dialog">×</button></div>${html}`;
  if (!d.open) d.showModal();
  return d;
}
function download(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function print(kind, html) {
  let area = $("#rcPrintArea");
  if (!area) {
    area = document.createElement("div");
    area.id = "rcPrintArea";
    document.body.append(area);
  }
  area.dataset.kind = kind;
  area.innerHTML = html;
  window.print();
}
export function resetAdditions() {
  renderVersion++;
  sessionEpoch++;
  markPhotoVersion++;
  saving = false;
  apps = [];
  selected = "";
  receipts = [];
  $("#rcFeatureDialog")?.close();
  $("#rcPrintArea")?.replaceChildren();
}
function markHTML(entry, card) {
  const d = entry.data,
    r = cardResult(card);
  return `<article class="mark-paper"><div class="paper-brand"><div><h2>Rehaan Computers</h2><small>CHARANGAM · BEERWAH · KASHMIR</small></div><b>ACADEMIC RECORD</b><div class="mark-portrait-preview"><img alt="Student photograph" hidden><span>Student<br>photo</span></div></div><h2 class="mark-title">Statement of Marks</h2><p class="mark-subtitle">${e(card.title)}</p><div class="mark-details">${[
    ["STUDENT NAME", d.fullName],
    ["ADMISSION NUMBER", d.admissionNumber || "Not assigned"],
    ["PARENT / GUARDIAN", d.parentName],
    ["ROLL NUMBER", d.rollNumber],
    ["COURSE", d.coursePreference || d.course],
    ["BATCH", d.batch],
    ["ASSESSMENT DATE", dateLabel(card.date)],
    ["PREPARED ON", dateLabel(indiaDate())],
  ]
    .map(([key, value]) => `<div><span>${key}</span>${e(value || "—")}</div>`)
    .join(
      "",
    )}</div><table><thead><tr><th>SUBJECT / COMPONENT</th><th>MAXIMUM</th><th>OBTAINED</th><th>RESULT</th></tr></thead><tbody>${card.subjects.map((s) => `<tr><td>${e(s.name)}</td><td>${s.max}</td><td>${s.marks ?? "Unmarked"}</td><td>${s.marks === null ? "Unmarked" : s.marks / s.max >= 0.33 ? "Pass" : "Below pass mark"}</td></tr>`).join("")}<tr><td><strong>TOTAL</strong></td><td>${r.maximum}</td><td>${r.total ?? "Incomplete"}</td><td></td></tr></tbody></table><div class="mark-result"><div><span>PERCENTAGE</span><strong>${r.percentage === null ? "—" : r.percentage + "%"}</strong></div><div><span>GRADE</span><strong>${r.grade}</strong></div><div><span>RESULT</span><strong>${!r.complete ? "Incomplete" : r.passed ? "Pass" : "Not passed"}</strong></div></div><p class="mark-policy">Grading: at least 33% in each component. A+ ≥ 90%, A ≥ 75%, B ≥ 60%, C ≥ 45%, D ≥ 33%, subject to passing each component.</p><div class="mark-signatures"><div>EXAMINER / ASSESSOR</div><div>AUTHORIZED SIGNATORY</div></div><p class="paper-proof">REHAAN COMPUTERS · STUDENT ACADEMIC RECORD</p></article>`;
}
function formCard() {
  return {
    title: $("#rcExamTitle").value,
    date: $("#rcExamDate").value,
    subjects: [...document.querySelectorAll("#rcSubjectRows tr")].map(
      (row) => ({
        name: row.querySelector("[data-subject=name]").value,
        max: row.querySelector("[data-subject=max]").value,
        marks: row.querySelector("[data-subject=marks]").value,
      }),
    ),
  };
}
async function loadMarkPhoto(entry) {
  if (!entry.data.photo) return null;
  if (!services.loadMarkPhoto) throw Error("Photo viewing is unavailable. Reload the dashboard before downloading.");
  return services.loadMarkPhoto(entry.data.photo);
}
async function showMarkPhoto(entry) {
  const host=$("#rcMarkPreview .mark-portrait-preview");
  if (!host) return;
  const version=++markPhotoVersion, epoch=sessionEpoch, photo=entry.data.photo;
  if (!photo) return;
  const image=host.querySelector('img'), note=host.querySelector('span');
  note.textContent='Loading photo…';
  try {
    const loaded=await loadMarkPhoto(entry);
    if(version!==markPhotoVersion||epoch!==sessionEpoch||selected!==entry.id||!host.isConnected)return;
    image.src=loaded.src;await image.decode();
    if(version!==markPhotoVersion||epoch!==sessionEpoch||selected!==entry.id||!host.isConnected)return;
    image.hidden=false;note.hidden=true;
  } catch {
    if(version!==markPhotoVersion||epoch!==sessionEpoch||selected!==entry.id||!host.isConnected)return;
    note.replaceChildren();const retry=document.createElement('button');retry.type='button';retry.dataset.new='retryMarkPhoto';retry.textContent='Retry photo';note.append(retry);
  }
}
function drawMarks(view, card) {
  markPhotoVersion++;
  const entry = apps.find((a) => a.id === selected);
  if (!entry) {
    view.innerHTML =
      '<section class="workspace-card"><h2>No student records loaded.</h2><p>Refresh the student register to load your records.</p></section>';
    return;
  }
  let canExport=false;
  try { canExport=Boolean(entry.data.markCard)&&JSON.stringify(validateCard(card))===JSON.stringify(storedCard(entry)); } catch {}
  view.innerHTML = `<section class="workspace-card"><div class="workspace-card-heading"><div><h2>Mark Cards</h2><p>Select any loaded student, enter marks and print their card here. Saved marks remain available after signing in again.</p></div><div class="rc-feature-actions"><label class="mark-image-quality">Image size<select id="rcMarkImageWidth"><option value="3840" ${markImageWidth===3840?"selected":""}>4K · 3840 pixels wide</option><option value="1600" ${markImageWidth===1600?"selected":""}>HD · 1600 pixels wide</option></select></label><button type="button" class="admin-save-btn" data-new="downloadMarks" ${canExport ? "" : "disabled"}>Download HD image · PNG</button><button class="admin-ghost-btn" data-new="printMarks" ${canExport ? "" : "disabled"}>Print mark card / PDF</button></div></div><div class="rc-marks-controls"><label>Find a student<input id="rcMarkSearch" type="search" placeholder="Name or admission number"></label><label>Student · all ${apps.length} loaded records<select id="rcMarkStudent">${apps.map((a) => `<option value="${e(a.id)}" ${a.id === selected ? "selected" : ""}>${e(a.data.fullName || "Unnamed")} · ${e(a.data.admissionNumber || "No admission number")}</option>`).join("")}</select></label></div><div class="rc-marks-layout"><form id="rcMarksForm"><div class="rc-marks-meta"><label>Assessment title<input id="rcExamTitle" maxlength="120" value="${e(card.title)}" required></label><label>Date<input id="rcExamDate" type="date" value="${e(card.date)}" max="${indiaDate()}" required></label></div><div class="rc-subject-scroll"><table class="rc-subject-table"><thead><tr><th>Subject</th><th>Max.</th><th>Obtained</th><th></th></tr></thead><tbody id="rcSubjectRows">${card.subjects.map((s, i) => `<tr><td><input data-subject="name" aria-label="Subject ${i + 1}" maxlength="100" value="${e(s.name)}" required></td><td><input data-subject="max" aria-label="Maximum ${i + 1}" type="number" min="1" max="1000" step="1" value="${s.max}" required></td><td><input data-subject="marks" aria-label="Marks ${i + 1}" type="number" min="0" max="${s.max}" step=".25" value="${s.marks ?? ""}" placeholder="Unmarked"></td><td><button type="button" data-new="removeSubject" data-index="${i}" aria-label="Remove subject ${i + 1}" ${card.subjects.length === 1 ? "disabled" : ""}>×</button></td></tr>`).join("")}</tbody></table></div><div class="rc-feature-actions"><button type="button" data-new="addSubject" ${card.subjects.length >= 12 ? "disabled" : ""}>+ Add subject</button><button type="submit" class="admin-save-btn">Save marks & update preview</button></div><p id="rcMarksStatus" role="status"></p><p class="rc-feature-note">Blank marks keep the result incomplete. Saving marks changes only the mark card fields. Student details and payments are kept. Save changes before printing or downloading. The saved student photo is included automatically. Photo detail depends on the uploaded original.</p></form><div class="rc-paper-stage" id="rcMarkPreview">${markHTML(entry, card)}</div></div></section>`;
  void showMarkPhoto(entry);
}
export function renderMarkCards(view, records) {
  apps = records;
  if (!apps.some((a) => a.id === selected)) selected = apps[0]?.id || "";
  try {
    drawMarks(
      view,
      apps.length
        ? storedCard(apps.find((a) => a.id === selected))
        : defaultCard(),
    );
  } catch (error) {
    view.innerHTML = `<section class="workspace-card"><h2>Stored marks need review</h2><p>${e(error.message)} No records were changed.</p></section>`;
  }
}
function receiptHTML(r = null) {
  const blank = !r;
  const field = (label, value, wide = false) =>
    `<div class="receipt-field${wide ? " full" : ""}"><span>${label}</span><b>${blank ? "" : e(value)}</b></div>`;
  return `<article class="receipt-paper"><div class="paper-brand"><div><h2>Rehaan Computers</h2><small>CHARANGAM · BEERWAH · KASHMIR</small></div><b>FEE RECEIPT</b></div><div class="receipt-meta"><span>Receipt no. <b>${blank ? "" : e(r.number)}</b></span><span>Date <b>${blank ? "" : dateLabel(r.date)}</b></span></div><div class="receipt-fields">${field("Student name", r?.student.name, true)}${field("Admission no.", r?.student.admission)}${field("Fee month", r ? monthLabel(r.period) : "")}${field("Course / programme", r?.student.course, true)}${field("Due date", r?.due)}${field("Monthly tuition", r ? money(r.billed) : "")}</div><div class="receipt-totals">${[
    ["RECEIVED NOW", r?.amount],
    [
      r?.balanceBasis === "correction"
        ? "TOTAL AT CORRECTION"
        : "RECEIVED FOR THIS MONTH",
      r?.receivedAtIssue,
    ],
    [
      r?.balanceBasis === "correction"
        ? "BALANCE AT CORRECTION"
        : "BALANCE AFTER PAYMENT",
      r?.balanceAtIssue,
    ],
  ]
    .map(
      ([label, value]) =>
        `<div><small>${label}</small><strong>${blank ? "" : money(value)}</strong></div>`,
    )
    .join(
      "",
    )}</div><div class="receipt-bottom"><p>Please retain this acknowledgement for your records.<br>₹100 admission fee is separate from monthly tuition.${r ? "<br>Recorded method: " + e(r.method) : ""}${r?.note ? "<br>Note: " + e(r.note) : ""}${r?.balanceRecordedAt ? "<br>Balance recorded: " + dateLabel(r.balanceRecordedAt.slice(0, 10)) : ""}</p><div>AUTHORIZED SIGNATORY</div></div><p class="paper-proof">REHAAN COMPUTERS · ${blank ? "BLANK FORM FOR HANDWRITTEN DETAILS" : "FEE PAYMENT ACKNOWLEDGEMENT"}</p></article>`;
}
export function openReceipt(receipt) {
  modal(
    "Payment receipt",
    `<div class="rc-paper-stage">${receiptHTML(receipt)}</div><div class="rc-feature-actions"><button class="admin-save-btn" data-new="printReceipt" data-id="${receipt.id}">Print / Save PDF</button><button data-new="image" data-id="${receipt.id}">Download image</button><button data-new="whatsapp" data-id="${receipt.id}">WhatsApp receipt</button><button data-new="editReceipt" data-id="${receipt.id}">Edit / correct receipt</button><button data-new="receiptHistory" data-id="${receipt.id}">Correction history (${receipt.amendments?.length || 0})</button></div><p class="rc-feature-note">${receipt.balanceBasis === "correction" ? "Corrected receipt. The totals show the balance at the financial correction." : "This receipt preserves the amount and balance when this payment was recorded."}</p>`,
  );
}
export function receiptTools(list, records) {
  syncReceipts(records);
  $("#rcReceiptTools")?.remove();
  const div = document.createElement("section");
  div.id = "rcReceiptTools";
  div.className = "rc-receipt-tools";
  div.innerHTML = `<div><strong>Payment receipts</strong><small>After recording a payment, print or share its receipt. Historical monthly totals are not converted into receipt events.</small></div><div class="rc-feature-actions"><button data-new="blank">Print blank receipt</button><button data-new="receipts">Saved receipts (${receipts.length})</button></div>`;
  list.prepend(div);
}
async function image(receipt) {
  const blob = await receiptPNG(receipt);
  download(blob, receipt.number + ".png");
}
async function whatsapp(receipt) {
  const current = (services.getRecords?.() || apps).find(
    (a) => a.id === receipt.studentId,
  );
  const phone = current?.data.phone || receipt.student.phone;
  const url = whatsappURL(
    phone,
    `REHAAN COMPUTERS\nFee receipt: ${receipt.number}\nStudent: ${receipt.student.name}\nFee month: ${monthLabel(receipt.period)}\nPayment date: ${dateLabel(receipt.date)}\nAmount received: ${money(receipt.amount)}\n${receipt.balanceBasis === "correction" ? "Balance at correction" : "Remaining after payment"}: ${money(receipt.balanceAtIssue)}\n\nPlease retain this acknowledgement for your records.`,
  );
  const version = ++renderVersion;
  modal(
    "WhatsApp receipt image",
    `<div class="rc-share-layout"><div class="rc-paper-stage"><img id="rcShareImage" alt="Payment receipt image" hidden><p id="rcImageStatus" role="status">Preparing image…</p></div><div><h4>${e(receipt.student.name)}</h4><p>Saved student mobile: <strong>${e(phone || "Not set")}</strong></p><p>Download the image, open this student’s chat, attach the downloaded PNG and press Send.</p><div class="rc-feature-actions"><button class="admin-save-btn" data-new="image" data-id="${receipt.id}">Download receipt image</button>${url ? `<a id="rcOpenWhatsApp" class="admin-ghost-btn" href="${url}" target="_blank" rel="noopener noreferrer">Open student’s WhatsApp</a>` : '<button id="rcOpenWhatsApp" disabled>Save a valid student mobile first</button>'}</div><p class="rc-feature-note">A WhatsApp link cannot attach a local image automatically. Nothing is sent until you attach the image and press Send. Mobile numbers can be edited in the existing student Details panel.</p></div></div>`,
  );
  try {
    const blob = await receiptPNG(receipt);
    if (version !== renderVersion || !$("#rcShareImage")) return;
    if (imageURL) URL.revokeObjectURL(imageURL);
    imageURL = URL.createObjectURL(blob);
    $("#rcShareImage").src = imageURL;
    $("#rcShareImage").hidden = false;
    $("#rcImageStatus").textContent = "PNG image ready.";
  } catch (error) {
    if ($("#rcImageStatus")) $("#rcImageStatus").textContent = error.message;
  }
}
document.addEventListener("change", (event) => {
  if(event.target.id === "rcMarkImageWidth") { markImageWidth=Number(event.target.value);return; }
  if (event.target.id === "rcMarkStudent" && !saving) {
    selected = event.target.value;
    drawMarks(
      $("#workspaceView"),
      storedCard(apps.find((a) => a.id === selected)),
    );
  }
  if (event.target.dataset.subject === "max") {
    const row = event.target.closest("tr");
    row.querySelector("[data-subject=marks]").max = event.target.value;
  }
});
document.addEventListener("input", (event) => {
  if (event.target.closest("#rcMarksForm")) {
    for (const action of ["printMarks","downloadMarks"]) { const control=$("[data-new="+action+"]"); if(control)control.disabled=true; }
    return;
  }
  if (event.target.id !== "rcMarkSearch") return;
  const query = event.target.value.toLowerCase();
  const selector = $("#rcMarkStudent");
  for (const option of selector.options)
    option.hidden = !option.text.toLowerCase().includes(query);
});
document.addEventListener("submit", async (event) => {
  if (event.target.id !== "rcMarksForm") return;
  event.preventDefault();
  if (saving) return;
  const form = event.target,
    saveId = selected,
    epoch = sessionEpoch,
    entry = apps.find((a) => a.id === saveId);
  const button = form.querySelector("[type=submit]");
  const controls = [...form.elements].filter((control) => !control.disabled);
  try {
    const card = validateCard(formCard());
    const expected = structuredClone(entry.data.markCard ?? null);
    saving = true;
    controls.forEach((control) => (control.disabled = true));
    $("#rcMarkStudent").disabled = true;
    $("#rcMarksStatus").textContent = "Saving marks…";
    const saved = await services.saveMarks(saveId, card, expected);
    if (epoch !== sessionEpoch) return;
    entry.data = { ...entry.data, markCard: saved };
    if (selected === saveId && $("#rcMarkPreview")) {
      $("#rcMarkPreview").innerHTML = markHTML(entry, saved);
      void showMarkPhoto(entry);
      $("[data-new=printMarks]").disabled = false;
      $("[data-new=downloadMarks]").disabled = false;
      $("#rcMarksStatus").textContent =
        "Marks saved securely. Student details and payments are unchanged.";
    }
  } catch (error) {
    if (epoch === sessionEpoch && $("#rcMarksStatus"))
      $("#rcMarksStatus").textContent = "Marks not saved: " + error.message;
  } finally {
    if (epoch === sessionEpoch) {
      saving = false;
      controls.forEach((control) => {
        if (control.isConnected) control.disabled = false;
      });
      if ($("#rcMarkStudent")) $("#rcMarkStudent").disabled = false;
    }
  }
});
function editReceipt(receipt) {
  const entry = (services.getRecords?.() || apps).find(
    (a) => a.id === receipt.studentId,
  );
  if (!entry)
    throw Error("Refresh the student register before correcting this receipt.");
  const paid = Number(entry.data.monthlyFees?.[receipt.due] || 0);
  const field = (key, label, value, max) =>
    `<label>${label}<input name="${key}" value="${e(value)}" maxlength="${max}" required></label>`;
  modal(
    "Correct payment receipt",
    `<p>${e(receipt.number)} · Due ${e(receipt.due)} · Monthly total currently ${money(Math.round(paid * 100))}</p><form id="rcReceiptEditForm" data-id="${receipt.id}" data-paid="${paid}" data-correction="${crypto.randomUUID().replaceAll("-", "")}"><div class="rc-receipt-edit-grid">${field("name", "Student name on receipt", receipt.student.name, 120)}${field("admission", "Admission number on receipt", receipt.student.admission, 20)}${field("course", "Course on receipt", receipt.student.course, 120)}<label>Payment date<input name="date" type="date" value="${receipt.date}" max="${indiaDate()}" required></label><label>Correct receipt amount (₹)<input name="amount" type="number" min="0.01" max="${receipt.billed / 100}" step="0.01" value="${receipt.amount / 100}" required></label><label>Recorded method<select name="method">${["Manually recorded", "Cash", "UPI", "Bank transfer"].map((method) => `<option ${receipt.method === method ? "selected" : ""}>${method}</option>`).join("")}</select></label><label class="rc-full">Receipt note (printed, optional)<input name="note" maxlength="160" value="${e(receipt.note || "")}"></label><label class="rc-full">Reason for correction (required, private history)<textarea name="reason" minlength="5" maxlength="500" required></textarea></label></div><p id="rcCorrectionPreview" class="rc-feature-note">Correcting the amount adjusts this due's monthly ledger by the difference. The original receipt values are retained in history. This does not charge or refund an online payment.</p><p class="rc-feature-note">Student profile, admission fee, due date, receipt number and other receipts stay unchanged. A zero/reversed payment requires separate review.</p><label class="rc-correction-confirm"><input type="checkbox" name="confirmed" required>I reviewed the correction and its effect on the monthly balance.</label><p id="rcReceiptEditStatus" role="status"></p><div class="rc-feature-actions"><button class="admin-save-btn" type="submit">Save correction with history</button><button type="button" data-new="openReceipt" data-id="${receipt.id}">Cancel</button></div></form>`,
  );
  const form = $("#rcReceiptEditForm");
  form.querySelector("[name=amount]").addEventListener("input", () => {
    const next = Number(form.elements.amount.value),
      total = paid + next - receipt.amount / 100;
    $("#rcCorrectionPreview").textContent =
      `Amount change: ${money(Math.round((next - receipt.amount / 100) * 100))}. Monthly total after correction: ${money(Math.round(total * 100))}. Remaining: ${money(Math.round((receipt.billed / 100 - total) * 100))}. No online charge or refund is made.`;
  });
}
function receiptHistory(receipt) {
  const labels = [
    ["Student name", (r) => r.student.name],
    ["Admission number", (r) => r.student.admission],
    ["Course", (r) => r.student.course],
    ["Payment date", (r) => dateLabel(r.date)],
    ["Recorded method", (r) => r.method],
    ["Receipt note", (r) => r.note || "—"],
    ["Receipt amount", (r) => money(r.amount)],
    ["Monthly total on receipt", (r) => money(r.receivedAtIssue)],
    ["Balance on receipt", (r) => money(r.balanceAtIssue)],
  ];
  modal(
    "Receipt correction history",
    `<p>${e(receipt.number)} · ${e(receipt.student.name)}</p>${
      (receipt.amendments || [])
        .map((item) => {
          const time = new Intl.DateTimeFormat("en-IN", {
            timeZone: "Asia/Kolkata",
            dateStyle: "medium",
            timeStyle: "short",
          }).format(new Date(item.at));
          return `<details class="rc-correction-history"><summary>${e(time)} IST · ${money(item.before.amount)} → ${money(item.after.amount)}</summary><p>Reason: ${e(item.reason)}<br>Administrator: ${e(item.by)}<br>Monthly total: ${money(item.ledgerBefore)} → ${money(item.ledgerAfter)}</p><div class="rc-history-scroll"><table><thead><tr><th>Receipt detail</th><th>Before</th><th>After</th></tr></thead><tbody>${labels.map(([label, value]) => `<tr><th>${e(label)}</th><td>${e(value(item.before))}</td><td>${e(value(item.after))}</td></tr>`).join("")}</tbody></table></div></details>`;
        })
        .join("") ||
      "<p>No corrections have been made. Original receipt values are retained.</p>"
    }<div class="rc-feature-actions"><button data-new="openReceipt" data-id="${receipt.id}">Back to receipt</button></div>`,
  );
}

document.addEventListener("submit", async (event) => {
  const form = event.target;
  if (form.id !== "rcReceiptEditForm") return;
  event.preventDefault();
  if (saving) return;
  const epoch = sessionEpoch,
    receipt = receipts.find((r) => r.id === form.dataset.id),
    controls = [...form.elements].filter((c) => !c.disabled);
  try {
    if (!form.elements.confirmed.checked)
      throw Error("Review and confirm the correction first.");
    const input = Object.fromEntries(new FormData(form));
    validateReceiptCorrection(input);
    saving = true;
    controls.forEach((c) => (c.disabled = true));
    $("#rcReceiptEditStatus").textContent = "Saving correction…";
    const saved = await services.saveReceipt(
      receipt,
      input,
      Number(form.dataset.paid),
      form.dataset.correction,
    );
    if (epoch !== sessionEpoch || !form.isConnected) return;
    syncReceipts(services.getRecords?.() || apps);
    receipts = [...receipts.filter((r) => r.id !== saved.id), saved];
    openReceipt(saved);
  } catch (error) {
    if (epoch === sessionEpoch && $("#rcReceiptEditStatus"))
      $("#rcReceiptEditStatus").textContent =
        "Correction not saved: " + error.message;
  } finally {
    if (epoch === sessionEpoch) {
      saving = false;
      controls.forEach((c) => {
        if (c.isConnected) c.disabled = false;
      });
    }
  }
});
document.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-new]");
  if (!button || button.disabled || saving) return;
  const { new: action, id } = button.dataset;
  const receipt = receipts.find((r) => r.id === id);
  try {
    if (action === "close") $("#rcFeatureDialog").close();
    if (action === "addSubject" || action === "removeSubject") {
      const card = formCard();
      if (action === "addSubject" && card.subjects.length < 12)
        card.subjects.push({ name: "", max: 100, marks: null });
      if (action === "removeSubject" && card.subjects.length > 1)
        card.subjects.splice(Number(button.dataset.index), 1);
      drawMarks($("#workspaceView"), card);
    }
    if (action === "retryMarkPhoto") {
      const entry=apps.find(a=>a.id===selected);if(entry)void showMarkPhoto(entry);
    }
    if (action === "printMarks" || action === "downloadMarks") {
      const entry = apps.find((a) => a.id === selected),
        card = validateCard(formCard());
      if (
        !entry.data.markCard ||
        JSON.stringify(card) !== JSON.stringify(storedCard(entry))
      )
        throw Error("Save the changed marks before printing or downloading.");
      const epoch=sessionEpoch,studentId=selected,expected=JSON.stringify(card),photoRef=entry.data.photo,form=$("#rcMarksForm");
      const current=()=>epoch===sessionEpoch&&studentId===selected&&form.isConnected&&$("#rcMarksForm")===form&&apps.find(a=>a.id===studentId)?.data.photo===photoRef;
      const unchanged=()=>{if(JSON.stringify(validateCard(formCard()))!==expected)throw Error("Marks changed while the image was prepared. Save them before downloading.");};
      button.disabled=true;
      try {
        const photo=await loadMarkPhoto(entry);
        if(!current())return;
        unchanged();
        if(action === "printMarks") {
          let area=$("#rcPrintArea");if(!area){area=document.createElement('div');area.id='rcPrintArea';document.body.append(area);}
          area.dataset.kind='marks';area.innerHTML=markHTML(entry,card);const paper=area.firstElementChild;
          if(photo){const image=area.querySelector('.mark-portrait-preview img');image.src=photo.src;await image.decode();if(!current()){if(area.firstElementChild===paper)area.replaceChildren();return;}unchanged();image.hidden=false;area.querySelector('.mark-portrait-preview span').hidden=true;}
          if(current())window.print();
        } else {
          const {markCardPNG}=await import('./admin-mark-image.js?v=20261020-admin-4');
          if(!current())return;
          const blob=await markCardPNG(structuredClone(entry),card,{photo,outputWidth:markImageWidth});
          if(!current())return;
          unchanged();
          const filename=String(entry.data.admissionNumber||entry.id).replace(/[^a-zA-Z0-9_-]/g,'-').slice(0,80);
          download(blob,'Rehaan-Mark-Card-'+filename+'-'+card.date+'.png');
          $("#rcMarksStatus").textContent="Mark-card image downloaded with all saved details"+(photo?" and student photo":"")+". Student and payment records are unchanged.";
        }
      } catch(error) {
        if(current())$("#rcMarksStatus").textContent=error.message;
      } finally {
        if(button.isConnected){let clean=false;try{clean=JSON.stringify(validateCard(formCard()))===JSON.stringify(storedCard(entry));}catch{}button.disabled=!clean;}
      }
    }

    if (action === "printReceipt" && receipt)
      print("receipt", receiptHTML(receipt));
    if (action === "image" && receipt) await image(receipt);
    if (action === "whatsapp" && receipt) await whatsapp(receipt);
    if (action === "openReceipt" && receipt) openReceipt(receipt);
    if (action === "editReceipt" && receipt) editReceipt(receipt);
    if (action === "receiptHistory" && receipt) receiptHistory(receipt);
    if (action === "blank")
      modal(
        "Blank receipt",
        `<div class="rc-paper-stage">${receiptHTML()}</div><div class="rc-feature-actions"><button class="admin-save-btn" data-new="printBlank">Print blank · A5</button><button data-new="printSheet">Print two blanks · A4</button></div>`,
      );
    if (action === "printBlank") print("receipt", receiptHTML());
    if (action === "printSheet")
      print(
        "sheet",
        receiptHTML() +
          '<div class="rc-cutline">CUT HERE</div>' +
          receiptHTML(),
      );
    if (action === "receipts")
      modal(
        "Saved payment receipts",
        `<p>Receipts are saved with each new monthly payment. Older fee totals have no individual receipt events and are kept unchanged.</p><div class="rc-receipt-list">${
          receipts
            .slice()
            .reverse()
            .map(
              (r) =>
                `<button data-new="openReceipt" data-id="${r.id}"><strong>${e(r.student.name)}</strong><span>${e(r.number)} · ${money(r.amount)} · ${monthLabel(r.period)}</span></button>`,
            )
            .join("") || "<p>No saved receipts yet.</p>"
        }</div>`,
      );
  } catch (error) {
    if ($("#rcMarksStatus") && ["printMarks","downloadMarks"].includes(action))
      $("#rcMarksStatus").textContent = error.message;
    else modal("Could not complete action", `<p>${e(error.message)}</p>`);
  }
});
