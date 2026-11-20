// Shared assessment helpers used by ExamPortal, Gradebook and Analytics.

/**
 * Build a structured list of questions from the current page shapes.
 * Time Complexity: O(N log N) where N is the total number of shapes, due to sorting.
 * Space Complexity: O(Q) where Q is the number of quiz shapes (Q <= N) returned.
 */
export function extractQuestions(shapes) {
  return shapes
    .filter(s => s.type === 'quiz-mcq-shape' || s.type === 'quiz-written-shape' || s.type === 'quiz-code-shape')
    .sort((a, b) => a.y - b.y)
    .map(s => {
      const p = s.props;
      if (s.type === 'quiz-mcq-shape') {
        return {
          shapeId: s.id,
          type: 'mcq',
          question: p.question || '',
          marks: p.marks || 1,
          correctOption: p.correctOption,
          options: [p.option1, p.option2, p.option3, p.option4],
          studentAnswer: p.selectedOption || 0,
          mode: p.mode || 'author'
        };
      }
      if (s.type === 'quiz-code-shape') {
        return {
          shapeId: s.id,
          type: 'code',
          question: p.question || '',
          marks: p.marks || 5,
          expectedOutput: p.expectedOutput || '',
          studentAnswer: { code: '', language: '', output: '' },
          mode: p.mode || 'author'
        };
      }
      return {
        shapeId: s.id,
        type: 'written',
        question: p.question || '',
        marks: p.marks || 1,
        expectedLines: p.expectedLines || 5,
        expectedAnswer: p.expectedAnswer || '',
        studentAnswer: p.answer || '',
        mode: p.mode || 'author'
      };
    });
}

/**
 * Score a single question. Returns null for written (manual grading required).
 * Time Complexity: O(1)
 * Space Complexity: O(1)
 */
export function scoreQuestion(q) {
  if (q.type === 'mcq') {
    const answered = !!q.studentAnswer && q.studentAnswer > 0;
    if (!answered) return 0;
    return q.studentAnswer === q.correctOption ? (q.marks || 1) : 0;
  }
  if (q.type === 'code') {
    const out = (q.studentAnswer && q.studentAnswer.output || '').trim();
    const expected = (q.expectedOutput || '').trim();
    if (out === 'Failed to execute code. Try again later.') return 'system_error';
    if (!out) return 0;
    // Pass only when the compiled output matches the expected result exactly.
    return out === expected ? (q.marks || 5) : 0;
  }
  return null; // written -> teacher grades
}

/**
 * Score an entire submission. 
 * Returns { totalMarks, obtainedMarks, perQuestion, autoGraded, pendingManual }
 * Time Complexity: O(Q) where Q is the number of questions.
 * Space Complexity: O(Q) to store the result array.
 */
export function gradeSubmission(questions) {
  let totalMarks = 0;
  let obtainedMarks = 0;
  let pendingManual = 0;

  const perQuestion = questions.map(q => {
    const score = scoreQuestion(q);
    
    if (score === 'system_error') {
      return { ...q, score: 0, status: 'system_error' };
    }

    totalMarks += q.marks || 1;
    
    if (score !== null) {
      obtainedMarks += score;
      return { ...q, score, status: 'auto' };
    }
    
    pendingManual += 1;
    return { ...q, score: null, status: 'pending' };
  });

  return {
    totalMarks,
    obtainedMarks,
    perQuestion,
    autoGraded: pendingManual === 0,
    pendingManual
  };
}

// Format the room id used in exam mode headers.
export function formatRoomName(roomName) {
  return roomName || 'Untitled';
}