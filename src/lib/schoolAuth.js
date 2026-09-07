// Per-school authentication configuration.
// Schools identify themselves (subdomain / ?school= param / dropdown) and we
// fetch their auth config from Firestore schools/{schoolId}. The config lists
// which sign-in methods to show and in what ORDER.

import { doc, getDoc, getDocs, collection } from 'firebase/firestore';
import { db } from '../firebase';

// Canonical precedence when a school doesn't override it:
// SQLite accounts first, then enterprise SSO, then Google Workspace, then email, then no-account.
export const DEFAULT_METHOD_ORDER = ['account', 'sso', 'google', 'email', 'no-account'];

/**
 * Resolve the school id from, in order: URL param, subdomain, saved value.
 * Time Complexity: O(L) where L is the length of URL/host strings.
 * Space Complexity: O(L) for string splitting.
 */
export function resolveSchoolId() {
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get('school');
  if (fromQuery && fromQuery.trim()) return fromQuery.trim().toLowerCase();
  const host = window.location.hostname || '';
  const parts = host.split('.');
  if (parts.length >= 3 && parts[0] && parts[0] !== 'www') return parts[0].toLowerCase();
  return (localStorage.getItem('schoolId') || '').toLowerCase();
}

/**
 * Time Complexity: O(1)
 * Space Complexity: O(1)
 */
export function saveSchoolId(id) {
  if (id) localStorage.setItem('schoolId', id);
}

/**
 * Time Complexity: O(1) network request overhead.
 * Space Complexity: O(D) where D is document data size.
 */
export async function getSchoolConfig(schoolId) {
  if (!schoolId) return null;
  try {
    const snap = await getDoc(doc(db, 'schools', schoolId));
    if (snap.exists()) return { id: schoolId, ...snap.data() };
  } catch (e) {
    console.error('Failed to load school config', e);
  }
  return null;
}

/**
 * Time Complexity: O(N) where N is number of schools (API response).
 * Space Complexity: O(N)
 */
export async function listSchools() {
  try {
    const snap = await getDocs(collection(db, 'schools'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.error('Failed to list schools', e);
    return [];
  }
}

// Global fallback when no school doc exists.
export function globalAuthMethods() {
  return import.meta.env.VITE_AUTH_MODE === 'school' ? ['account', 'no-account'] : ['account', 'google', 'email'];
}

export function methodLabel(method) {
  switch (method) {
    case 'account': return 'School Account (Username)';
    case 'sso': return 'School SSO (SAML / OIDC)';
    case 'google': return 'Continue with Google Workspace';
    case 'microsoft': return 'Continue with Microsoft / Entra';
    case 'email': return 'Email & Password';
    case 'no-account': return 'Name + Roll No (no account)';
    default: return method;
  }
}

export function methodHint(method) {
  switch (method) {
    case 'account': return 'Sign in with your school account stored in the backend database. Ask the admin if you don\u2019t have one yet.';
    case 'no-account': return 'No sign-in needed — used by schools without per-student accounts. Results are matched by your exam profile (designation, domain, year, division, roll no).';
    case 'sso': return 'Authenticates with your school identity provider.';
    case 'microsoft': return 'Authenticates with your Microsoft school account.';
    case 'google': return 'Authenticates with your school Google account.';
    case 'email': return 'Use your school email and password account.';
    default: return '';
  }
}