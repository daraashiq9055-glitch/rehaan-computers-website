export function courseSlug(course) {
  return course.title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
export function matchesDuration(course, duration) {
  return (
    duration === "all" ||
    (
      {
        short: ["3 Months", "Short Term"],
        six: ["6 Months"],
        year: ["1 Year"],
        flexible: ["Flexible"],
      }[duration] || []
    ).includes(course.duration)
  );
}
export function typingScore(passage, typed, elapsedMs) {
  let correct = 0;
  for (let i = 0; i < typed.length; i++) if (typed[i] === passage[i]) correct++;
  const minutes = Math.max(0, Math.min(30000, elapsedMs)) / 60000;
  return {
    correct,
    accuracy: typed.length ? Math.round((correct / typed.length) * 100) : 0,
    wpm: minutes ? Math.round(correct / 5 / minutes) : 0,
  };
}
export function recommendCourses(courses, answers) {
  let title, reason, alternative;
  if (answers.goal === "typing") {
    title = "Typing Diploma";
    reason =
      "This course focuses on English typing, keyboard familiarity, accuracy and regular speed practice.";
  } else if (answers.goal === "accounting") {
    title = "Tally Prime with GST";
    alternative = "Marg ERP";
    reason =
      "The detailed Tally course covers company setup, vouchers, inventory, GST, payroll and final accounts. Compare Marg ERP if your interest is billing and business inventory.";
  } else if (answers.time === "year") {
    title = "One Year";
    alternative = "Six Month";
    reason =
      "You selected a longer learning path. The diploma combines computer fundamentals, office tools, typing and accounting basics with practical exercises.";
  } else if (
    answers.time === "six" ||
    (answers.goal === "office" && answers.time !== "short")
  ) {
    title = "Six Month";
    alternative = "Three Month";
    reason =
      "The six-month course develops office productivity, documents, spreadsheets, presentations and everyday digital skills. The three-month option is a shorter introduction.";
  } else {
    title = "Three Month";
    alternative = "Six Month";
    reason =
      "The beginner course covers essential computer skills, MS Office, typing, internet and email. It is a short starting point; compare six months if you want a longer course.";
  }
  const id = courses.findIndex((course) => course.title.includes(title));
  if (id < 0) throw Error("Suggested course could not be found.");
  return {
    id,
    reason,
    alternative: alternative
      ? courses.findIndex((course) => course.title.includes(alternative))
      : -1,
    experienceNote:
      answers.experience === "some"
        ? "You can discuss your existing skills with the centre before choosing a starting level."
        : "Beginner courses start with fundamentals; no prior computer experience is needed for those courses.",
  };
}

// A small vector-PDF writer. Built-in PDF fonts keep downloads self-contained.
// Course text is converted to readable ASCII (e.g. Rs., ->) for these fonts.
const ascii = (value) =>
  String(value ?? "")
    .normalize("NFKD")
    .replace(/₹/g, "Rs. ")
    .replace(/[–—]/g, "-")
    .replace(/→/g, "->")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[•·]/g, " / ")
    .replace(/∞/g, "Unlimited")
    .replace(/[^\x20-\x7e\n]/g, "");
const pdfEscape = (value) =>
  ascii(value)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
export function brochurePDF(course) {
  const pages = [];
  let commands = [],
    y = 732;
  const text = (
    value,
    x,
    at,
    size = 10,
    font = "F1",
    color = "0.23 0.23 0.20",
  ) =>
    commands.push(
      `BT /${font} ${size} Tf ${color} rg 1 0 0 1 ${x} ${at} Tm (${pdfEscape(value)}) Tj ET`,
    );
  const line = (x, at, x2, at2, color = "0.76 0.63 0.36") =>
    commands.push(`${color} RG 0.7 w ${x} ${at} m ${x2} ${at2} l S`);
  function header() {
    commands = [];
    commands.push("0.98 0.97 0.94 rg 0 0 595 842 re f");
    text("REHAAN COMPUTERS", 48, 796, 23, "F2", "0.20 0.19 0.15");
    text("CHARANGAM / BEERWAH / KASHMIR", 49, 776, 8, "F1", "0.49 0.42 0.29");
    text("COURSE GUIDE", 455, 798, 9, "F1", "0.53 0.42 0.22");
    line(48, 758, 547, 758);
    y = 732;
  }
  function finish() {
    pages.push(commands.join("\n"));
  }
  function ensure(height) {
    if (y - height < 75) {
      finish();
      header();
    }
  }
  function wrap(value, size = 10, width = 490) {
    const limit = Math.floor(width / (size * 0.55)),
      result = [];
    for (const paragraph of ascii(value).split("\n")) {
      let row = "";
      for (const token of paragraph.split(/\s+/)) {
        const parts = token.match(new RegExp(`.{1,${limit}}`, "g")) || [""];
        for (const word of parts) {
          if ((row + " " + word).trim().length > limit && row) {
            result.push(row);
            row = word;
          } else row = (row + " " + word).trim();
        }
      }
      result.push(row);
    }
    return result;
  }
  function paragraph(
    value,
    { size = 10, font = "F1", gap = 7, color = "0.25 0.25 0.22" } = {},
  ) {
    for (const row of wrap(value, size)) {
      ensure(size * 1.6);
      text(row, 49, y, size, font, color);
      y -= size * 1.55;
    }
    y -= gap;
  }
  function heading(value) {
    ensure(54);
    y -= 11;
    paragraph(value, {
      size: 13,
      font: "F2",
      gap: 11,
      color: "0.52 0.40 0.19",
    });
  }
  header();
  paragraph(course.title, {
    size: 22,
    font: "F2",
    gap: 15,
    color: "0.22 0.21 0.17",
  });
  paragraph(course.subtitle, { size: 11, gap: 10, color: "0.49 0.42 0.29" });
  paragraph(`${course.category} / ${course.duration} / ${course.level}`, {
    size: 10,
    gap: 8,
    color: "0.49 0.42 0.29",
  });
  paragraph(`Certificate: ${course.certificate}`, { size: 10, gap: 15 });
  paragraph(course.overview, { size: 11, gap: 10 });
  heading("What you will learn");
  course.learn.forEach((item) => paragraph("- " + item, { gap: 3 }));
  if (course.syllabus) {
    heading("Detailed syllabus");
    course.syllabus.forEach((module) => {
      heading(module.module);
      module.items.forEach((item) => paragraph("- " + item, { gap: 3 }));
    });
  }
  heading("Your practical work");
  paragraph(course.practical);
  heading("Who is this course for?");
  paragraph(course.who);
  heading("Skills you will practise");
  paragraph(course.skills.join(" / "));
  heading("Fees, batches and joining");
  paragraph(
    "One-time admission fee: Rs. 100. Course tuition is separate. Confirm current course fees and the payment schedule with the centre.",
  );
  paragraph(
    "Batch preferences: Morning, Afternoon or Evening. The institute confirms timings and availability. Admissions are open throughout the year, with no last date.",
  );
  paragraph(
    "Choose a course, complete the application and follow the existing admission/payment process. Visit the centre with 2 printed passport-size photographs and 1 Aadhaar photocopy. Admission is completed after payment verification and institute formalities.",
  );
  heading("Contact Rehaan Computers");
  paragraph(
    "Charangam, Beerwah, Kashmir\nEnquiries: +91 9149551258 / +91 9797205429\nLocation: 34.026895, 74.643088\nWebsite: https://rehaan-computers.web.app/",
  );
  paragraph(
    "Managed by Dar Yasir / Website designed and developed by Dar Yasir.",
    { size: 9, gap: 8 },
  );
  paragraph(
    "Rehaan Computers course guide. Confirm current fees and batch availability with the institute. This guide is not a payment receipt or admission confirmation.",
    { size: 8, color: "0.49 0.43 0.31" },
  );
  finish();
  const objects = [
    null,
    "<< /Type /Catalog /Pages 2 0 R >>",
    null,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman >>",
  ];
  const kids = [];
  pages.forEach((content, index) => {
    content += `\n0.76 0.63 0.36 RG 0.5 w 48 55 m 547 55 l S\nBT /F1 7 Tf 0.48 0.43 0.33 rg 1 0 0 1 49 39 Tm (REHAAN COMPUTERS / LEARN. PRACTICE. GROW.) Tj ET\nBT /F1 7 Tf 0.48 0.43 0.33 rg 1 0 0 1 484 39 Tm (${index + 1} / ${pages.length}) Tj ET`;
    const pageId = objects.length,
      streamId = pageId + 1;
    kids.push(`${pageId} 0 R`);
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${streamId} 0 R >>`,
    );
    objects.push(
      `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    );
  });
  objects[2] = `<< /Type /Pages /Count ${pages.length} /Kids [${kids.join(" ")}] >>`;
  let result = "%PDF-1.4\n",
    offsets = [0];
  for (let id = 1; id < objects.length; id++) {
    offsets[id] = result.length;
    result += `${id} 0 obj\n${objects[id]}\nendobj\n`;
  }
  const xref = result.length;
  result += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let id = 1; id < objects.length; id++)
    result += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  result += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new Blob([result], { type: "application/pdf" });
}
