import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

export default function Analytics() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [roomInfo, setRoomInfo] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const roomRef = doc(db, 'rooms', id);
        const roomSnap = await getDoc(roomRef);
        if (roomSnap.exists()) setRoomInfo(roomSnap.data());

        const subsRef = collection(db, 'rooms', id, 'submissions');
        const subsSnap = await getDocs(subsRef);
        const rows = [];
        subsSnap.forEach(sd => rows.push({ uid: sd.id, ...sd.data() }));
        setSubmissions(rows);
      } catch (e) {
        console.error('Failed to load analytics', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) {
    return (
      <div style={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FFFAF0' }}>
        <div className="neo-card" style={{ padding: '40px', background: 'var(--surface-color)' }}>
          <span style={{ fontSize: '18px', fontWeight: '900' }}>Loading Analytics...</span>
        </div>
      </div>
    );
  }

  const graded = submissions.filter(s => s.status === 'graded' && (s.totalMarks || 0) > 0);
  const avgPct = graded.length > 0
    ? (graded.reduce((sum, s) => sum + ((s.obtainedMarks || 0) / (s.totalMarks || 1)) * 100, 0) / graded.length).toFixed(1)
    : 0;

  const studentData = submissions.map(s => ({
    name: (s.studentName || 'Unknown').slice(0, 12),
    score: s.obtainedMarks || 0,
    total: s.totalMarks || 0,
    pct: (s.totalMarks || 1) > 0 ? Math.round(((s.obtainedMarks || 0) / (s.totalMarks || 1)) * 100) : 0
  }));

  // Per-question accuracy across all MCQ answers
  const questionAgg = {};
  submissions.forEach(s => {
    (s.answers || []).forEach((a, i) => {
      const key = `${i + 1}·${(a.question || '').slice(0, 20)}`;
      if (!questionAgg[key]) questionAgg[key] = { name: `Q${i + 1}`, total: 0, correct: 0 };
      if (a.type === 'mcq' && a.studentAnswer > 0) {
        questionAgg[key].total += 1;
        if (a.studentAnswer === a.correctOption) questionAgg[key].correct += 1;
      }
    });
  });
  const questionData = Object.values(questionAgg).map(q => ({
    name: q.name,
    accuracy: q.total > 0 ? Math.round((q.correct / q.total) * 100) : 0
  }));

  const statusPie = [
    { name: 'Graded', value: graded.length, fill: '#88D8C0' },
    { name: 'Pending', value: submissions.length - graded.length, fill: '#FBEA72' }
  ];

  const COLORS = ['#FF9CEE', '#88D8C0', '#FBEA72', '#C7CEEA', '#FFB7B2', '#92a9e1'];

  return (
    <div style={{ width: '100vw', minHeight: '100vh', background: 'var(--board-bg)', color: '#000' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
          <button className="neo-btn" onClick={() => navigate(`/board/${id}`)} style={{ background: 'var(--accent-yellow)', padding: '8px 12px' }}>
            <ArrowLeft size={18} /> Back to Board
          </button>
          <span className="neo-title-block" style={{ fontSize: '24px', background: 'var(--accent-pink)' }}>Class Analytics</span>
          <span className="neo-badge" style={{ background: 'var(--accent-green)', fontSize: '12px' }}>{roomInfo?.name || id}</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '32px' }}>
          <div className="neo-card" style={{ background: 'var(--surface-color)', padding: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '44px', height: '44px', border: '3px solid #000', background: 'var(--accent-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Users size={22} /></div>
            <div>
              <div style={{ fontSize: '28px', fontWeight: '900' }}>{submissions.length}</div>
              <div style={{ fontSize: '12px', fontWeight: '700' }}>Submissions</div>
            </div>
          </div>
          <div className="neo-card" style={{ background: 'var(--surface-color)', padding: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '44px', height: '44px', border: '3px solid #000', background: 'var(--accent-green)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trophy size={22} /></div>
            <div>
              <div style={{ fontSize: '28px', fontWeight: '900' }}>{avgPct}%</div>
              <div style={{ fontSize: '12px', fontWeight: '700' }}>Class Average</div>
            </div>
          </div>
          <div className="neo-card" style={{ background: 'var(--surface-color)', padding: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '44px', height: '44px', border: '3px solid #000', background: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CheckCircle2 size={22} /></div>
            <div>
              <div style={{ fontSize: '28px', fontWeight: '900' }}>{graded.length}</div>
              <div style={{ fontSize: '12px', fontWeight: '700' }}>Fully Graded</div>
            </div>
          </div>
          <div className="neo-card" style={{ background: 'var(--surface-color)', padding: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '44px', height: '44px', border: '3px solid #000', background: 'var(--accent-yellow)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><BarChart3 size={22} /></div>
            <div>
              <div style={{ fontSize: '28px', fontWeight: '900' }}>{questionData.length}</div>
              <div style={{ fontSize: '12px', fontWeight: '700' }}>Questions Analyzed</div>
            </div>
          </div>
        </div>

        {submissions.length === 0 ? (
          <div className="neo-card" style={{ textAlign: 'center', padding: '40px', background: 'var(--surface-color)' }}>
            <span className="neo-badge" style={{ background: 'var(--accent-yellow)', fontSize: '16px' }}>No data yet — waiting for student submissions.</span>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <div className="neo-card" style={{ background: 'var(--surface-color)', padding: '20px' }}>
              <span className="neo-badge" style={{ background: 'var(--accent-pink)', fontSize: '14px', marginBottom: '16px' }}>Score by Student (%)</span>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={studentData}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="pct" radius={[4, 4, 0, 0]}>
                    {studentData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="neo-card" style={{ background: 'var(--surface-color)', padding: '20px' }}>
              <span className="neo-badge" style={{ background: 'var(--accent-blue)', fontSize: '14px', marginBottom: '16px' }}>MCQ Accuracy by Question (%)</span>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={questionData}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="accuracy" radius={[4, 4, 0, 0]} fill="#92a9e1" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="neo-card" style={{ background: 'var(--surface-color)', padding: '20px' }}>
              <span className="neo-badge" style={{ background: 'var(--accent-green)', fontSize: '14px', marginBottom: '16px' }}>Grading Status</span>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={statusPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                    {statusPie.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="neo-card" style={{ background: 'var(--surface-color)', padding: '20px' }}>
              <span className="neo-badge" style={{ background: 'var(--accent-purple)', fontSize: '14px', marginBottom: '16px' }}>Individual Results</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '260px', overflowY: 'auto' }}>
                {studentData.map((s, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '110px', fontWeight: '800', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</span>
                    <div style={{ flex: 1, height: '20px', border: '2px solid #000', background: 'var(--surface-color)', position: 'relative' }}>
                      <div style={{ width: `${s.pct}%`, height: '100%', background: COLORS[i % COLORS.length] }} />
                    </div>
                    <span style={{ fontWeight: '900', fontSize: '13px', width: '60px', textAlign: 'right' }}>{s.score}/{s.total}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
