// Local PNG rendering: no uploads, remote libraries or external image requests.
import { money, dateLabel, monthLabel } from "./admin-feature-model.js?v=20261021-admin-5";
export function whatsappPhone(value) {
  const digits = String(value || "").replace(/[\s()+.-]/g, "");
  const local = /^91[6-9]\d{9}$/.test(digits) ? digits.slice(2) : digits;
  return /^[6-9]\d{9}$/.test(local) ? "91" + local : null;
}
export function whatsappURL(phone, text) {
  const number = whatsappPhone(phone);
  return number
    ? "https://wa.me/" + number + "?text=" + encodeURIComponent(text)
    : null;
}
import {receiptImage} from './admin-receipt-canvas.js?v=20261024-admin-10';
import {presentReceipt} from './admin-receipt-layout.js?v=20261024-admin-10';
export async function receiptPNG(receipt){return receiptImage(presentReceipt(receipt));}
