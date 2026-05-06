import React from 'react';
import { Route, Routes, useNavigate } from 'react-router-dom';
import { Clock3, FolderKanban, LogOut, ShieldCheck, Sparkles } from 'lucide-react';
import AdminPanel from './pages/AdminPanel.jsx';
import TaskingWorkbench from './pages/TaskingWorkbench.jsx';
import TaskerHistory from './pages/TaskerHistory.jsx';
import { useAuth } from './state/AuthContext.jsx';

export default function App() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <aside className="sidebar glass-panel">
        <div className="brand-mark">
          <Sparkles size={22} />
          <div>
            <strong>AHT Tracker</strong>
            <span>Tasker OS</span>
          </div>
        </div>
        <nav>
          {user?.role === 'ADMIN' ? (
            <button onClick={() => navigate('/')}><ShieldCheck size={18} /> Admin</button>
          ) : (
            <>
              <button onClick={() => navigate('/')}><Clock3 size={18} /> Workbench</button>
              <button onClick={() => navigate('/projects')}><FolderKanban size={18} /> Catalog</button>
            </>
          )}
        </nav>
        <div className="profile-chip">
          <div className="avatar">{user?.name?.slice(0, 1) || 'U'}</div>
          <div>
            <strong>{user?.name}</strong>
            <span>{user?.role}</span>
          </div>
        </div>
      </aside>
      <main className="main-stage">
        <header className="topbar glass-panel">
          <div>
            <span className="eyebrow">{user?.role === 'ADMIN' ? 'Reviewer Console' : 'Assignment Tracker'}</span>
            <h1>{user?.role === 'ADMIN' ? 'Review taskers, flags, and feedback.' : 'Track AHT, prompts, and tasking time.'}</h1>
          </div>
          <button className="icon-text" onClick={logout}><LogOut size={17} /> Logout</button>
        </header>
        <Routes>
          {user?.role === 'ADMIN' ? (
            <>
              <Route path="/" element={<AdminPanel />} />
              <Route path="/admin" element={<AdminPanel />} />
              <Route path="/admin/taskers/:id" element={<TaskerHistory />} />
              <Route path="*" element={<AdminPanel />} />
            </>
          ) : (
            <>
              <Route path="/" element={<TaskingWorkbench />} />
              <Route path="/projects" element={<TaskingWorkbench catalogOnly />} />
              <Route path="*" element={<TaskingWorkbench />} />
            </>
          )}
        </Routes>
      </main>
    </div>
  );
}
