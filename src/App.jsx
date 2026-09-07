import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom';
import { CallProvider } from './components/CallManager.jsx';

// Lazy load the heavy pages so the main bundle is tiny
const Home = lazy(() => import('./pages/Home.jsx'));
const Auth = lazy(() => import('./pages/Auth.jsx'));
const Board = lazy(() => import('./pages/Board.jsx'));
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const ExamPortal = lazy(() => import('./pages/ExamPortal.jsx'));
const Gradebook = lazy(() => import('./pages/Gradebook.jsx'));
const Analytics = lazy(() => import('./pages/Analytics.jsx'));
const Exams = lazy(() => import('./pages/Exams.jsx'));
const ExamEditor = lazy(() => import('./pages/ExamEditor.jsx'));

// Simple loading spinner for while the chunks are downloading
const PageLoader = () => (
  <div style={{ width: '100vw', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#FFFAF0' }}>
    <div style={{ color: '#8A90C7', fontSize: '18px', fontWeight: 'bold' }}>Loading...</div>
  </div>
);


function RootRedirect() {
  return <Home />;
}

const BoardWrapper = () => {
  const { id } = useParams();
  return (
    <CallProvider roomId={id || 'global-moodboard'}>
      <Board key={id} />
    </CallProvider>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/board/:id" element={<BoardWrapper />} />
          <Route path="/exam/:id" element={<ExamPortal />} />
          <Route path="/exam-editor/:id" element={<ExamEditor />} />
          <Route path="/gradebook/:id" element={<Gradebook />} />
          <Route path="/analytics/:id" element={<Analytics />} />
          <Route path="/exams" element={<Exams />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
