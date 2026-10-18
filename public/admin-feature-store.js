// Admin-only persistence. Callers supply Firebase's transaction function and a
// session guard; no writes happen outside the transaction callback.
import { validateCard, makeReceipt } from "./admin-feature-model.js";
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
