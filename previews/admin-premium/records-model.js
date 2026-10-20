// Read-only record review. These checks never approve, merge, cancel or edit data.
const text = value => typeof value === 'string' ? value.trim() : '';
const normal = value => text(value).toLocaleLowerCase('en-IN');
export const courseOf = data => text(data.coursePreference) || text(data.course);
export function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + 'T00:00:00Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function reviewRecords(entries) {
  const admission = new Map(), phones = new Map();
  function index(map, value, id) {if (value) map.set(value, [...(map.get(value) || []), id]);}
  for (const entry of entries) {
    index(admission, normal(entry.data.admissionNumber), entry.id);
    if (/^\d{10}$/.test(text(entry.data.phone))) index(phones, text(entry.data.phone), entry.id);
  }
  return entries.map(entry => {
    const d = entry.data, essential = [], suggestions = [], possibleDuplicates = [];
    if (text(d.fullName).length < 2) essential.push('Student name needs review');
    if (!/^\d{10}$/.test(text(d.phone))) essential.push('Student phone needs review');
    if (!courseOf(d)) essential.push('Course is missing');
    if (d.status === 'Approved') {
      if (!text(d.admissionNumber)) essential.push('Admission number is missing');
      if (!validDate(text(d.admissionDate) || text(d.approvedAt).slice(0, 10))) essential.push('Admission date needs review');
    }
    // Optional details are suggestions, never failed requirements or payment gates.
    for (const [key, label] of [['parentName', 'Guardian name'], ['batch', 'Batch'], ['address', 'Address'], ['qualification', 'Qualification']])
      if (!text(d[key])) suggestions.push(label);
    const photo = text(d.photo);
    if (!photo) suggestions.push('Optional photograph');
    const ids = admission.get(normal(d.admissionNumber)) || [];
    if (ids.length > 1) possibleDuplicates.push({kind: 'admission', label: 'Admission number used in another record', ids: ids.filter(id => id !== entry.id)});
    const shared = phones.get(text(d.phone)) || [];
    if (shared.length > 1) possibleDuplicates.push({kind: 'phone', label: 'Shared student phone — may be a family number', ids: shared.filter(id => id !== entry.id)});
    return {...entry, review: {essential, suggestions, possibleDuplicates, photoSaved: Boolean(photo)}};
  });
}
export function filterRecords(rows, filters = {}) {
  const query = normal(filters.query);
  return rows.filter(entry => {
    const d = entry.data, r = entry.review;
    const matchesQuery = !query || [d.fullName, d.parentName, d.phone, d.guardianPhone, d.email, d.admissionNumber, d.rollNumber, entry.id].some(value => String(value ?? '').toLocaleLowerCase('en-IN').includes(query));
    const queue = filters.queue || 'all';
    return matchesQuery && (!filters.course || courseOf(d) === filters.course)
      && (!filters.batch || d.batch === filters.batch)
      && (!filters.status || (filters.status === 'pending' ? !['Approved', 'Cancelled'].includes(d.status) : d.status === filters.status))
      && (queue === 'all' || (queue === 'review' && r.essential.length > 0)
        || (queue === 'photos' && !r.photoSaved) || (queue === 'duplicates' && r.possibleDuplicates.length > 0));
  });
}
export function sortRecords(rows, sort = 'name') {
  const copy = [...rows];
  return copy.sort((a, b) => {
    if (sort === 'review') return (b.review.essential.length + b.review.possibleDuplicates.length) - (a.review.essential.length + a.review.possibleDuplicates.length) || String(a.data.fullName || '').localeCompare(String(b.data.fullName || ''), 'en-IN');
    if (sort === 'admission') return String(a.data.admissionNumber || '\uffff').localeCompare(String(b.data.admissionNumber || '\uffff'), 'en-IN', {numeric: true});
    return String(a.data.fullName || '').localeCompare(String(b.data.fullName || ''), 'en-IN');
  });
}
export function savedActivity(entry) {
  const d = entry.data, events = [];
  function add(date, title, detail = '') {if (typeof date === 'string' && Number.isFinite(new Date(date).getTime())) events.push({date, title, detail});}
  const timestamp = d.createdAt && typeof d.createdAt === 'object' && Number.isFinite(d.createdAt.seconds) ? new Date(d.createdAt.seconds * 1000) : null;
  const created = timestamp && Number.isFinite(timestamp.getTime()) ? timestamp.toISOString() : d.createdAt;
  add(created, 'Record created', d.channel === 'offline' ? 'Offline enrolment' : 'Website application');
  add(d.approvedAt, 'Admission approved', d.admissionNumber ? 'Admission ' + d.admissionNumber : '');
  add(d.markCard?.updatedAt, 'Mark card saved', d.markCard?.title || '');
  for (const receipt of Object.values(d.feeReceipts || {})) {
    if (!receipt || receipt.studentId !== entry.id) continue;
    add(receipt.createdAt, 'Receipt recorded', receipt.number || '');
    for (const change of Array.isArray(receipt.amendments) ? receipt.amendments : []) add(change.at || change.correctedAt, 'Receipt corrected', change.reason || 'Saved correction');
  }
  add(d.updatedAt, 'Latest saved update', d.updatedBy || 'Administrator');
  return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
