// User profile (designation / domain / year / division / roll no / PRN) and the
// master-sheet sort logic used for the exam spreadsheet database.

export const DESIGNATIONS = ['Interviewer', 'Interviewee', 'Teacher', 'Student', 'Casual', 'Employee', 'Manager'];
export const DOMAINS = ['CS', 'AIML', 'IT', 'CSE', 'AIDS', 'ECE', 'EE', 'ME', 'CE', 'Civil', 'Other'];
export const YEARS = ['FY', 'SY', 'TY', 'Final Year'];
export const DIVISIONS = ['A', 'B', 'C', 'D', 'E'];

// Sort priority for designation: interviewer, interviewee, teacher, student, then others.
const DESIGNATION_MAP = new Map(['interviewer', 'interviewee', 'teacher', 'student'].map((d, i) => [d, i]));
// Sort priority for year: fy, sy, ty, final/degree year.
const YEAR_MAP = new Map(['fy', 'sy', 'ty', 'final', 'degree', 'final year', '4th', 'fourth'].map((y, i) => [y, i]));

/**
 * Normalizes a string for comparison.
 * Time Complexity: O(L) where L is string length.
 * Space Complexity: O(L) for the new string.
 */
export function normalize(v) {
  return String(v == null ? '' : v).trim().toLowerCase();
}

/**
 * Time Complexity: O(L) string normalization + O(1) Map lookup.
 */
function designationIndex(designation) {
  const norm = normalize(designation);
  return DESIGNATION_MAP.has(norm) ? DESIGNATION_MAP.get(norm) : 99;
}

/**
 * Time Complexity: O(L) string normalization + O(1) Map lookup.
 */
function yearIndex(year) {
  const n = normalize(year);
  if (n.startsWith('fy') || n.startsWith('1st') || n === '1') return 0;
  if (n.startsWith('sy') || n.startsWith('2nd') || n === '2') return 1;
  if (n.startsWith('ty') || n.startsWith('3rd') || n === '3') return 2;
  if (n.startsWith('fin') || n.startsWith('deg') || n === '4') return 3;
  return YEAR_MAP.has(n) ? YEAR_MAP.get(n) : 99;
}

/**
 * Comparator for master-sheet rows: designation -> domain -> year -> division -> roll no.
 * Time Complexity: O(L) where L is max string length.
 * Space Complexity: O(L) for normalizations.
 */
export function compareByProfile(a, b) {
  const byDesignation = designationIndex(a.designation) - designationIndex(b.designation);
  if (byDesignation !== 0) return byDesignation;

  const byDomain = normalize(a.domain).localeCompare(normalize(b.domain));
  if (byDomain !== 0) return byDomain;

  const byYear = yearIndex(a.year) - yearIndex(b.year);
  if (byYear !== 0) return byYear;

  const byDivision = normalize(a.division).localeCompare(normalize(b.division));
  if (byDivision !== 0) return byDivision;

  const aRoll = Number(a.rollNo);
  const bRoll = Number(b.rollNo);
  if (isNaN(aRoll) && isNaN(bRoll)) return 0;
  if (isNaN(aRoll)) return 1;
  if (isNaN(bRoll)) return -1;
  return aRoll - bRoll;
}

/**
 * Loads user profile from localStorage.
 * Time Complexity: O(L) where L is string length.
 * Space Complexity: O(L)
 */
export function loadProfile() {
  let profile = {};
  try {
    profile = JSON.parse(localStorage.getItem('userProfile') || '{}');
  } catch (e) { /* ignore */ }
  return {
    name: localStorage.getItem('userName') || '',
    designation: localStorage.getItem('userRole') || profile.designation || '',
    domain: profile.domain || '',
    year: profile.year || '',
    division: profile.division || '',
    rollNo: profile.rollNo ?? '',
    prn: profile.prn ?? ''
  };
}

export function saveProfile(p) {
  localStorage.setItem('userProfile', JSON.stringify({
    domain: p.domain,
    year: p.year,
    division: p.division,
    rollNo: p.rollNo,
    prn: p.prn
  }));
}

export function profileComplete(p) {
  return !!(p && p.domain && p.year && p.division && (p.rollNo !== '' && p.rollNo != null) && (p.prn !== '' && p.prn != null));
}

// Custom fields added by the teacher for a specific exam (saved per-exam in localStorage).
export function loadCustomFields(roomId) {
  try {
    const answers = JSON.parse(localStorage.getItem('examFields_' + roomId) || '{}');
    const fields = JSON.parse(localStorage.getItem('examFieldsMeta_' + roomId) || '{}');
    return Object.keys(answers)
      .filter(k => (answers[k] || '').trim())
      .map(k => ({ id: k, label: (fields[k] && fields[k].label) || k, value: String(answers[k]).trim() }));
  } catch (e) {
    return [];
  }
}

export function saveCustomFieldsMeta(roomId, fields) {
  if (!roomId) return;
  const meta = {};
  fields.forEach(f => { meta[f.id] = { label: f.label }; });
  localStorage.setItem('examFieldsMeta_' + roomId, JSON.stringify(meta));
}

// Build the sorted master-sheet rows from submissions. Each submission should
// carry a `profile` object with name/prn/designation/domain/year/division/rollNo.
export function buildMasterRows(submissions) {
  // Collect custom-field column labels across submissions (insertion order preserved).
  const customLabels = [];
  const seen = {};
  (submissions || []).forEach(s => {
    (s.profile && s.profile.custom || []).forEach(c => {
      if (c && c.label && !seen[c.label]) { seen[c.label] = true; customLabels.push(c.label); }
    });
  });

  const rows = (submissions || []).map(s => {
    const prof = s.profile || {};
    const customMap = {};
    (prof.custom || []).forEach(c => { if (c && c.label) customMap[c.label] = c.value ?? ''; });
    return {
      Name: prof.name || s.studentName || 'Unknown',
      PRN: prof.prn ?? '',
      Designation: prof.designation || 'Student',
      Domain: prof.domain || '',
      Year: prof.year || '',
      Division: prof.division || '',
      RollNo: prof.rollNo ?? '',
      ...customMap,
      Score: s.obtainedMarks ?? 0,
      Total: s.totalMarks ?? 0,
      Status: s.status || 'submitted',
      SubmittedAt: s.submittedAt || ''
    };
  });

  rows.sort(compareByProfile);
  return rows;
}