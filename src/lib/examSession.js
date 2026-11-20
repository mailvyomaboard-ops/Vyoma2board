// Per-tab, per-student exam answer store.
// This is intentionally NOT part of the Yjs shared document — answers stay in
// the student's own browser so they never leak to other participants.
const session = {};

export function getExamAnswer(shapeId) {
  return session[shapeId];
}

export function setExamAnswer(shapeId, answer) {
  session[shapeId] = answer;
}

export function getExamAnswers() {
  return { ...session };
}

export function resetExamSession() {
  for (const key in session) {
    delete session[key];
  }
}