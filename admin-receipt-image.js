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
export async function receiptPNG(receipt) {
  await document.fonts.ready;
  const canvas = document.createElement("canvas");
  canvas.width = 1600;
  canvas.height = 1160;
  const ctx = canvas.getContext("2d");
  if (!ctx)
    throw Error(
      "Image rendering is unavailable in this browser. Use Print / Save PDF.",
    );
  const ink = "#252218",
    gold = "#9b7833",
    muted = "#716b5d";
  ctx.fillStyle = "#fffcef";
  ctx.fillRect(0, 0, 1600, 1160);
  function line(x, y, x2, y2, color = "#ded4b8") {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  function text(
    value,
    x,
    y,
    size = 22,
    color = ink,
    font = "Inter",
    weight = 400,
  ) {
    ctx.fillStyle = color;
    ctx.font = `${weight} ${size}px ${font}`;
    ctx.textAlign = "left";
    ctx.fillText(String(value), x, y);
  }
  function wrap(
    value,
    x,
    y,
    maxWidth,
    size = 24,
    font = "Inter",
    weight = 500,
  ) {
    ctx.font = `${weight} ${size}px ${font}`;
    const words = String(value).split(/\s+/);
    let row = "";
    let yy = y;
    for (const word of words) {
      const next = row ? row + " " + word : word;
      if (ctx.measureText(next).width > maxWidth && row) {
        text(row, x, yy, size, ink, font, weight);
        row = word;
        yy += size * 1.35;
      } else row = next;
    }
    if (row) text(row, x, yy, size, ink, font, weight);
    return yy;
  }
  ctx.strokeStyle = gold;
  ctx.lineWidth = 2;
  ctx.strokeRect(25, 25, 1550, 1110);
  ctx.strokeStyle = "#d7c89f";
  ctx.strokeRect(36, 36, 1528, 1088);
  text("RC", 80, 144, 70, gold, "Playfair");
  line(205, 74, 205, 160);
  text("Rehaan Computers", 235, 125, 62, ink, "Playfair", 500);
  text("CHARANGAM · BEERWAH · KASHMIR", 238, 164, 17, muted);
  text("FEE RECEIPT", 1220, 111, 21, gold, "Inter", 600);
  text("LEARN · PRACTICE · GROW", 1160, 146, 13, muted);
  line(80, 205, 1520, 205, gold);
  text("RECEIPT NUMBER", 80, 253, 15, muted);
  text(receipt.number, 80, 290, 22);
  text("PAYMENT DATE", 1180, 253, 15, muted);
  text(dateLabel(receipt.date), 1180, 290, 24);
  function field(label, value, x, y, width) {
    text(label.toUpperCase(), x, y, 15, muted);
    wrap(value || "—", x, y + 40, width, 26);
  }
  field("Student name", receipt.student.name, 80, 354, 880);
  field("Admission number", receipt.student.admission, 1110, 354, 400);
  field("Course / programme", receipt.student.course, 80, 473, 880);
  field("Fee month", monthLabel(receipt.period), 1110, 473, 400);
  field("Payment method", receipt.method, 80, 592, 470);
  field("Monthly tuition", money(receipt.billed), 600, 592, 440);
  const top = 704;
  ctx.fillStyle = "#faedb9";
  ctx.fillRect(80, top, 1440, 144);
  ctx.strokeStyle = "#d7c89f";
  ctx.strokeRect(80, top, 1440, 144);
  const values = [
    ["RECEIVED NOW", receipt.amount],
    [
      receipt.balanceBasis === "correction"
        ? "TOTAL AT CORRECTION"
        : "RECEIVED FOR THIS MONTH",
      receipt.receivedAtIssue,
    ],
    [
      receipt.balanceBasis === "correction"
        ? "BALANCE AT CORRECTION"
        : "BALANCE AFTER PAYMENT",
      receipt.balanceAtIssue,
    ],
  ];
  values.forEach(([label, value], i) => {
    const x = 107 + i * 480;
    if (i) line(x - 27, top, x - 27, top + 144);
    text(label, x, top + 38, 15, muted);
    text(money(value), x, top + 103, 48, ink, "Playfair", 500);
  });
  text(
    "Please retain this acknowledgement for your records.",
    80,
    917,
    18,
    muted,
  );
  text(
    `${receipt.balanceBasis === "correction" ? "Balance shown is the balance when this receipt was corrected." : "Balance shown is the balance when this payment was recorded."}`,
    80,
    950,
    16,
    muted,
  );
  line(1140, 963, 1520, 963);
  text("AUTHORIZED SIGNATORY", 1190, 997, 14, muted);
  if (receipt.note)
    wrap("Note: " + receipt.note, 80, 986, 1000, 15, "Inter", 400);
  line(80, 1040, 1520, 1040);
  text("REHAAN COMPUTERS · FEE PAYMENT ACKNOWLEDGEMENT", 510, 1082, 15, muted);
  // Chrome can defer detached-canvas toBlob encoding indefinitely after a
  // print/download cycle. Encode this fixed-size local canvas immediately.
  const encoded = canvas.toDataURL("image/png");
  if (!encoded.startsWith("data:image/png;base64,"))
    throw Error("Could not create the image. Use Print / Save PDF.");
  const bytes = Uint8Array.from(atob(encoded.split(",")[1]), (char) =>
    char.charCodeAt(0),
  );
  return new Blob([bytes], { type: "image/png" });
}
