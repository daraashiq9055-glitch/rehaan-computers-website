# Group Marksheet

Open **Mark Cards → Group Marksheet · all students**.

Choose a saved assessment, select the students to include, optionally enter a group heading, and choose **Create / refresh sheet**. Download a 3840-pixel-wide PNG or use Print / PDF. The combined sheet includes admission numbers, marks for every subject, typing speed/accuracy where recorded, total, grade, result, grade counts, highest marks/speed/accuracy (including ties), individual guidance, institute address, contacts and website.

The sheet begins with saved individual mark cards. Open **Edit sheet · headings, student details & marks** to edit institute details, the exam title/date, table and section headings, subject names/maximums, student names/admissions/serials, marks, typing speed/accuracy, final grade and custom guidance. These are temporary sheet drafts: they recalculate the displayed results but do not save a separate assessment or change stored marks, student records or fees. Close discards the draft. Refresh the sheet after editing; exports are disabled while it is out of date. Save each student's individual card first. Only matching titles, dates, subject order, maximum marks and typing columns can be combined. Cards needing validation are flagged and excluded. Manual grades and the existing subject pass rules still apply. Typing guidance uses 25 WPM / 90% as practice targets only, without changing results.

PNG export is bounded to 48 million pixels to avoid browser memory failures. If a very large group exceeds that limit, select a smaller group or print. Printing fits the complete sheet to a page; use smaller groups or a larger paper size for readable physical copies. Regenerate if records change before exporting. Closing the sheet or logging out clears its temporary image.

Preview with fictional records, disconnected from Firebase and payment services:

```cmd
python preview-admin.py --group-marks
```

This opens the combined sheet automatically. Reload resets the sample data. The ordinary `python preview-admin.py` preview is unchanged.

Checks: `node --test tests/admin-group-marks.test.mjs` and `python tests/admin-group-marks-browser.py`. Browser checks cover zero writes, editable headings/details/marks, draft export invalidation, recalculated results, selection, true failing/incomplete results, PNG dimensions, print rendering, responsive layouts and session cleanup. Preview motion includes a sheet reveal, soft shimmer and button transitions, with reduced-motion support. PNG and printed documents are static.
