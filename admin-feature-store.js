// Admin-only persistence. Callers supply Firebase's transaction function and a
// session guard; no writes happen outside the transaction callback.
import {
  validateCard,
  makeReceipt,
  validateReceiptCorrection,
  receiptAuditSnapshot,
} from "./admin-feature-model.js?v=20261018-login-fix-1";
import { canonicalRecord } from "./admin-records.js";
function paise(value) {
  const number = Number(value);
  const cents = Math.round(number * 100);
  if (
    !Number.isFinite(number) ||
    number < 0 ||
    !Number.isSafeInteger(cents) ||
    Math.abs(number * 100 - cents) > 0.00001
  )
    throw Error(
      "The stored payment amount is invalid. Review this record before saving.",
    );
  return cents;
}
export async function saveMarkCard({
  db,
  ref,
  runTransaction,
  assertSession,
  actor,
  card,
  expected,
  now = new Date().toISOString(),
}) {
  const clean = validateCard(card);
  const saved = { ...clean, updatedAt: now, updatedBy: actor };
  await runTransaction(db, async (transaction) => {
    assertSession();
    const snapshot = await transaction.get(ref);
    assertSession();
    if (!snapshot.exists())
      throw Error("Student record no longer exists. Refresh the register.");
    const data = snapshot.data();
    if (
      canonicalRecord(data.markCard ?? null) !==
      canonicalRecord(expected ?? null)
    )
      throw Error(
        "These marks changed in another session. Refresh and review before saving.",
      );
    transaction.update(ref, {
      markCard: saved,
      updatedAt: now,
      updatedBy: actor,
    });
  });
  return saved;
}
export async function saveMonthlyPayment({
  db,
  ref,
  runTransaction,
  assertSession,
  actor,
  id,
  due,
  amount,
  expectedPaid,
  expectedAdmission,
  expectedJoined,
  receiptId,
  monthly = 999,
  now = new Date().toISOString(),
}) {
  if (!/^[a-f0-9]{32}$/.test(receiptId || ""))
    throw Error(
      "Receipt reference could not be generated. Close and reopen the payment form.",
    );
  const added = paise(amount),
    expected = paise(expectedPaid),
    fee = paise(monthly);
  if (!added || added > fee) throw Error("Enter a valid payment amount.");
  return runTransaction(db, async (transaction) => {
    assertSession();
    const snapshot = await transaction.get(ref);
    assertSession();
    if (!snapshot.exists()) throw Error("Student record no longer exists.");
    const data = snapshot.data();
    // A stable per-form ID makes retry after a lost acknowledgement idempotent.
    const recorded = data.feeReceipts?.[receiptId];
    if (recorded) {
      if (
        recorded.studentId !== id ||
        recorded.due !== due ||
        recorded.amount !== added
      )
        throw Error(
          "This receipt reference was already used for another payment. Refresh the register.",
        );
      return structuredClone(recorded);
    }
    if (
      data.status !== "Approved" ||
      !data.admissionNumber ||
      data.enrolmentStatus === "Cancelled"
    )
      throw Error("Student is no longer enrolled.");
    if (
      data.admissionNumber !== expectedAdmission ||
      (data.admissionDate || data.approvedAt || "") !== expectedJoined
    )
      throw Error(
        "Admission details changed. Close this form, refresh and review the fee date.",
      );
    const paid = paise(data.monthlyFees?.[due] ?? 0);
    if (paid !== expected)
      throw Error(
        "Payment record changed. Close this form, refresh and try again.",
      );
    if (paid + added > fee) throw Error("Payment exceeds remaining balance.");
    const receipt = makeReceipt({
      id,
      data,
      due,
      added: added / 100,
      total: (paid + added) / 100,
      monthly,
      receiptId,
      createdAt: now,
      createdBy: actor,
    });
    transaction.update(ref, {
      ["monthlyFees." + due]: (paid + added) / 100,
      ["feeReceipts." + receiptId]: receipt,
      updatedAt: now,
      updatedBy: actor,
    });
    return receipt;
  });
}

export async function correctReceipt({
  db,
  ref,
  runTransaction,
  assertSession,
  actor,
  receiptId,
  correctionId,
  input,
  expected,
  expectedPaid,
  now = new Date().toISOString(),
}) {
  const clean = validateReceiptCorrection(input),
    paidExpected = paise(expectedPaid);
  if (
    !/^[a-f0-9]{32}$/.test(receiptId || "") ||
    !/^[a-f0-9]{32}$/.test(correctionId || "")
  )
    throw Error("Invalid correction reference. Reopen the receipt.");
  return runTransaction(db, async (transaction) => {
    assertSession();
    const snapshot = await transaction.get(ref);
    assertSession();
    if (!snapshot.exists()) throw Error("Student record no longer exists.");
    const data = snapshot.data(),
      stored = data.feeReceipts?.[receiptId];
    if (!stored) throw Error("Receipt no longer exists. Refresh the register.");
    const history = stored.amendments || [];
    if (!Array.isArray(history))
      throw Error("Receipt history needs review before editing.");
    const repeated = history.find((item) => item.id === correctionId);
    if (repeated) {
      if (canonicalRecord(repeated.request) !== canonicalRecord(clean))
        throw Error(
          "This correction reference was already used. Reopen the receipt.",
        );
      return {
        receipt: structuredClone(stored),
        totalPaid: paise(data.monthlyFees?.[stored.due] ?? 0) / 100,
      };
    }
    if (canonicalRecord(stored) !== canonicalRecord(expected))
      throw Error(
        "This receipt changed in another session. Refresh and review before correcting.",
      );
    const paid = paise(data.monthlyFees?.[stored.due] ?? 0);
    if (paid !== paidExpected)
      throw Error(
        "The fee ledger changed. Refresh and review the current balance before correcting.",
      );
    if (
      !Number.isSafeInteger(stored.amount) ||
      stored.amount <= 0 ||
      !Number.isSafeInteger(stored.billed)
    )
      throw Error("Stored receipt values need review.");
    const delta = clean.amount - stored.amount,
      total = paid + delta;
    if (paid < stored.amount || total < clean.amount || total > stored.billed)
      throw Error(
        "This correction would make the monthly total invalid or exceed the monthly fee. Review the other payments first.",
      );
    if (history.length >= 100)
      throw Error(
        "This receipt has reached the correction-history limit. Review with the institute administrator.",
      );
    const receipt = {
      ...stored,
      student: {
        ...stored.student,
        name: clean.name,
        admission: clean.admission,
        course: clean.course,
      },
      date: clean.date,
      method: clean.method,
      note: clean.note,
      amount: clean.amount,
      revision: (stored.revision || 0) + 1,
      amendedAt: now,
      amendedBy: actor,
    };
    if (delta !== 0) {
      receipt.receivedAtIssue = total;
      receipt.balanceAtIssue = stored.billed - total;
      receipt.balanceBasis = "correction";
      receipt.balanceRecordedAt = now;
    }
    const audit = {
      id: correctionId,
      at: now,
      by: actor,
      reason: clean.reason,
      request: clean,
      before: receiptAuditSnapshot(stored),
      after: receiptAuditSnapshot(receipt),
      ledgerBefore: paid,
      ledgerAfter: total,
      amountDelta: delta,
    };
    receipt.amendments = [...history, audit];
    const patch = {
      ["feeReceipts." + receiptId]: receipt,
      updatedAt: now,
      updatedBy: actor,
    };
    if (delta !== 0) patch["monthlyFees." + stored.due] = total / 100;
    transaction.update(ref, patch);
    return { receipt, totalPaid: total / 100 };
  });
}
