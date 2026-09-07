import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import '../index.css';

const ROLES = ['Casual', 'Student', 'Teacher', 'Interviewer', 'Interviewee', 'Employee', 'Manager'];

import { auth, db } from '../firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('Casual');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = searchParams.get('next') || '/dashboard';

  // Session-first: if already signed in, skip straight to the intended destination.
  useEffect(() => {
    if (localStorage.getItem('token')) navigate(next);
  }, [navigate, next]);

  const applySession = (data) => {
    localStorage.setItem('token', data.token);
    localStorage.setItem('userName', data.user.name);
    localStorage.setItem('userEmail', data.user.email);
    localStorage.setItem('userRole', data.user.role || 'Casual');
    localStorage.setItem('userId', 'acc-' + data.user.id);
    navigate(next);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) { setError('Enter your email and password.'); return; }
    setLoading(true);
    setError('');
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.exists() ? userDoc.data() : { name: 'User', email: user.email, role: 'Casual' };
      
      applySession({ token: await user.getIdToken(), user: { id: user.uid, ...userData } });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setError('Enter your name.'); return; }
    if (!email.trim()) { setError('Enter your email.'); return; }
    if (password.length < 4) { setError('Password must be at least 4 characters.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    setLoading(true);
    setError('');
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;
      const userData = {
        name: name.trim(),
        email: email.trim(),
        role: role,
        createdAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'users', user.uid), userData);
      
      applySession({ token: await user.getIdToken(), user: { id: user.uid, ...userData } });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const input = (placeholder, value, onChange, type = 'text', extra = {}) => (
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="neo-input" style={{ width: '100%', ...extra }} />
  );

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--accent-yellow)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px'
    }}>
      <div className="neo-window" style={{ maxWidth: '440px', width: '100%' }}>
        <div className="neo-window-header" style={{ background: 'var(--accent-blue)' }}>
          <div className="neo-window-dot red"></div>
          <div className="neo-window-dot yellow"></div>
          <div className="neo-window-dot green"></div>
          <span style={{ fontWeight: '900', marginLeft: 'auto', background: 'var(--surface-color)', padding: '2px 8px', border: '2px solid #000' }}>
            vyomaboard.exe
          </span>
        </div>

        <div className="neo-window-content" style={{ background: 'var(--surface-color)' }}>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <div className="neo-title-block" style={{ transform: 'rotate(-2deg)', background: 'var(--accent-pink)' }}>
              {isLogin ? 'SIGN IN' : 'CREATE ACCOUNT'}
            </div>
          </div>

          {error && (
            <div className="neo-badge" style={{ background: '#ff5f56', color: 'var(--surface-color)', marginBottom: '16px', display: 'block', textAlign: 'center' }}>
              {error}
            </div>
          )}

          <form onSubmit={isLogin ? handleLogin : handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {!isLogin && input('Full Name', name, setName)}
            {input('Email', email, setEmail, 'email')}
            {input('Password', password, setPassword, 'password')}
            {!isLogin && input('Confirm Password', confirmPassword, setConfirmPassword, 'password')}
            {!isLogin && (
              <select value={role} onChange={e => setRole(e.target.value)} className="neo-input" style={{ width: '100%', cursor: 'pointer' }}>
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            )}
            <button type="submit" disabled={loading} className="neo-btn" style={{ background: 'var(--accent-yellow)', display: 'flex', justifyContent: 'center', gap: '8px', alignItems: 'center' }}>
              {loading ? <Loader2 size={18} className="spin" /> : (isLogin ? 'Sign In' : 'Create Account')}
              {!loading && <ArrowRight size={18} />}
            </button>
            <button type="button" onClick={() => { setIsLogin(!isLogin); setError(''); }} className="neo-btn" style={{ background: 'var(--accent-purple)', fontSize: '12px' }}>
              {isLogin ? 'New here? Create an account' : 'Already have an account? Sign in'}
            </button>
          </form>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: '600', color: '#555', marginTop: '16px' }}>
            <KeyRound size={14} />
            {isLogin
              ? 'Sign in with your account email and password.'
              : 'Your account is saved in the backend database. Teacher / Interviewer accounts can edit tests and view results.'}
          </div>
        </div>
      </div>
    </div>
  );
}
