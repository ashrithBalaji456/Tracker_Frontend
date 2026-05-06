import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, Clock3, LogIn, LogOut, Play, Search, Send, TimerReset } from 'lucide-react';
import { taskingApi } from '../api/client';
import { useAuth } from '../state/AuthContext.jsx';
import AdminPanel from './AdminPanel.jsx';
import GlassSelect from '../ui/GlassSelect.jsx';

const fmt = (seconds = 0) => {
  const safe = Math.max(0, Math.floor(seconds));
  const h = String(Math.floor(safe / 3600)).padStart(2, '0');
  const m = String(Math.floor((safe % 3600) / 60)).padStart(2, '0');
  const s = String(safe % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
};

const todayKey = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
const fmtStamp = (value) => value ? new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--';
const attendanceLabel = (status) => ({
  FULL_DAY_PRESENT: 'Full day present',
  HALF_DAY_PRESENT: 'Half day present',
  ABSENT: 'Not marked present',
}[status] || 'Not marked present');

export default function TaskingWorkbench({ catalogOnly = false }) {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [summary, setSummary] = useState(null);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState('');
  const [taskId, setTaskId] = useState('');
  const [promptText, setPromptText] = useState('');
  const [justification, setJustification] = useState('');
  const [noJustification, setNoJustification] = useState(false);
  const [visibleSelection, setVisibleSelection] = useState([]);
  const [selectionComplete, setSelectionComplete] = useState(false);
  const [historyDate, setHistoryDate] = useState(todayKey());
  const [historySummary, setHistorySummary] = useState(null);
  const [productivityFlags, setProductivityFlags] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [leaveForm, setLeaveForm] = useState({ startDate: todayKey(), endDate: todayKey(), reason: '' });
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [missingProject, setMissingProject] = useState({ projectName: '', note: '' });
  const [error, setError] = useState('');
  const [tick, setTick] = useState(Date.now());
  const [summaryLoadedAt, setSummaryLoadedAt] = useState(Date.now());
  const [activeTaskStartedAt, setActiveTaskStartedAt] = useState(null);
  const currentDate = todayKey();

  const load = async () => {
    const [catalog, today] = await Promise.all([taskingApi.projects(), taskingApi.today()]);
    setProjects(catalog);
    setSummary(today);
    setSummaryLoadedAt(Date.now());
    setHistorySummary(today);
    setVisibleSelection(today.visibleProjectNames || []);
    setSelectionComplete(today.punchedIn || !!today.punchedOutAt);
    if (user?.role === 'MEMBER') {
      const [feedbackData, leaves] = await Promise.all([taskingApi.feedback(), taskingApi.leaveRequests()]);
      setFeedback(feedbackData);
      setLeaveRequests(leaves);
    }
    if (user?.role === 'ADMIN') {
      setProductivityFlags(await taskingApi.productivityFlags());
    }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => {
    const id = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    const activeTask = summary?.activeTask;
    if (!activeTask) {
      setActiveTaskStartedAt(null);
      return;
    }
    setActiveTaskStartedAt((current) => {
      if (current?.id === activeTask.id) return current;
      const serverStartedAt = new Date(activeTask.startedAt).getTime();
      return {
        id: activeTask.id,
        startedAt: Number.isFinite(serverStartedAt) ? serverStartedAt : Date.now(),
      };
    });
  }, [summary?.activeTask?.id, summary?.activeTask?.startedAt]);

  const currentProject = projects.find((project) => project.name === selected)
    || projects.find((project) => project.name === summary?.activeTask?.projectName);
  const visibleProjects = projects.filter((project) => visibleSelection.includes(project.name));

  const filtered = useMemo(() => {
    const needle = query.toLowerCase();
    return projects.filter((project) =>
      project.name.toLowerCase().includes(needle) || project.domain.toLowerCase().includes(needle));
  }, [projects, query]);

  const activeStartedAt = summary?.activeTask
    ? activeTaskStartedAt?.id === summary.activeTask.id
      ? activeTaskStartedAt.startedAt
      : new Date(summary.activeTask.startedAt).getTime()
    : null;
  const elapsed = summary?.activeTask && Number.isFinite(activeStartedAt)
    ? Math.floor((tick - activeStartedAt) / 1000)
    : 0;
  const dynamicLoginSeconds = summary?.punchedIn && summary?.punchedInAt
    ? (summary.loginSeconds || 0) + Math.floor((Date.now() - summaryLoadedAt) / 1000)
    : summary?.loginSeconds || 0;
  const required = Math.round((summary?.activeTask?.minutesPerTask || currentProject?.minutesPerTask || 0) * 60);
  const exceeded = summary?.activeTask ? Math.max(0, elapsed - required) : 0;
  const exceededPercent = required > 0 ? Math.round((exceeded / required) * 100) : 0;
  const canSubmit = summary?.activeTask && elapsed >= required && promptText.trim() && (noJustification || justification.trim());

  const call = async (fn) => {
    setError('');
    try {
      const data = await fn();
      if (data?.workDate) {
        setSummary(data);
        setSummaryLoadedAt(Date.now());
        if (data.workDate === historyDate) setHistorySummary(data);
      }
      else await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Action failed');
    }
  };

  const startTask = (event) => {
    event.preventDefault();
    call(async () => {
      const active = await taskingApi.start({ externalTaskId: taskId, projectName: selected });
      setActiveTaskStartedAt({ id: active.id, startedAt: Date.now() });
      setPromptText('');
      setJustification('');
      setNoJustification(active.projectName.includes('without'));
      return taskingApi.today();
    });
  };

  const submitTask = () => call(async () => {
    const data = await taskingApi.submit(summary.activeTask.id, { promptText, justification, noJustification });
    setTaskId('');
    setPromptText('');
    setJustification('');
    setNoJustification(false);
    setActiveTaskStartedAt(null);
    return data;
  });

  const toggleVisible = (projectName) => {
    setVisibleSelection((current) =>
      current.includes(projectName)
        ? current.filter((name) => name !== projectName)
        : [...current, projectName]);
  };

  const saveVisible = () => call(async () => {
    const data = await taskingApi.saveVisibleProjects(visibleSelection);
    setSelectionComplete(true);
    return data;
  });

  const updateVisibleProject = (projectName) => call(async () => {
    const next = visibleSelection.includes(projectName)
      ? visibleSelection.filter((name) => name !== projectName)
      : [...visibleSelection, projectName];
    const data = await taskingApi.saveVisibleProjects(next);
    setVisibleSelection(data.visibleProjectNames || next);
    if (!next.includes(selected)) setSelected('');
    setSelectionComplete(true);
    return data;
  });

  const punchOut = () => call(async () => {
    const data = await taskingApi.punchOut();
    setTaskId('');
    setSelected('');
    setPromptText('');
    setJustification('');
    setNoJustification(false);
    setActiveTaskStartedAt(null);
    setSelectionComplete(true);
    setHistorySummary(data);
    if (user?.role === 'ADMIN') setProductivityFlags(await taskingApi.productivityFlags());
    return data;
  });

  const loadHistory = async (date) => {
    setHistoryDate(date);
    setError('');
    try {
      setHistorySummary(await taskingApi.history(date));
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load history');
    }
  };

  const requestMissing = (event) => {
    event.preventDefault();
    call(async () => {
      await taskingApi.requestMissingProject(missingProject);
      setMissingProject({ projectName: '', note: '' });
      return taskingApi.today();
    });
  };

  const requestLeave = (event) => {
    event.preventDefault();
    call(async () => {
      await taskingApi.requestLeave(leaveForm);
      setLeaveForm({ startDate: todayKey(), endDate: todayKey(), reason: '' });
      setLeaveRequests(await taskingApi.leaveRequests());
      return taskingApi.today();
    });
  };

  const changeLeaveStart = (startDate) => {
    setLeaveForm((current) => ({
      ...current,
      startDate,
      endDate: current.endDate < startDate ? startDate : current.endDate,
    }));
  };

  const feedbackPanel = user?.role === 'MEMBER' && (
    <div className="work-card feedback-panel glass-panel">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Warnings</span>
          <h2>Feedback and rating</h2>
        </div>
        <span>Average {feedback?.averageRating || '--'} / 3</span>
      </div>
      {(!feedback || feedback.feedbackCount === 0) && <p className="muted">No warnings or feedback yet.</p>}
      {(feedback?.feedback || []).map((item) => (
        <div className="feedback-item" key={item.id}>
          <div>
            <strong>{item.rating} / 3</strong>
            <span>Work date {item.workDate || item.createdAt?.slice(0, 10)} · sent {item.createdAt?.slice(0, 10)} · {item.sentBy.name}</span>
          </div>
          <p>{item.message}</p>
        </div>
      ))}
    </div>
  );

  const leavePanel = (
    <form className="work-card leave-panel glass-panel" onSubmit={requestLeave}>
      <div className="section-heading">
        <div>
          <span className="eyebrow">Leave</span>
          <h2>Leave request</h2>
        </div>
        <span>{leaveRequests.length} sent</span>
      </div>
      <div className="date-pair">
        <input type="date" value={leaveForm.startDate} min={currentDate} onChange={(e) => changeLeaveStart(e.target.value)} required />
        <input type="date" value={leaveForm.endDate} min={leaveForm.startDate || currentDate} onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })} required />
      </div>
      <textarea placeholder="Reason for leave" value={leaveForm.reason} onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })} required />
      <button className="ghost">Apply leave</button>
      <div className="mini-list">
        {leaveRequests.slice(0, 3).map((leave) => (
          <span key={leave.id}>{leave.startDate} to {leave.endDate} · {leave.status}</span>
        ))}
      </div>
    </form>
  );

  if (user?.role === 'ADMIN') return <AdminPanel />;
  if (!summary) return <div className="loading glass-panel">Loading workbench...</div>;

  if (!catalogOnly && !summary.punchedIn && !selectionComplete) {
    return (
      <section className="selection-screen">
        <div className="wide-card glass-panel">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Before punch-in</span>
              <h2>Select visible MultiMango projects</h2>
            </div>
            <span>{visibleSelection.length} selected</span>
          </div>
          <p className="muted">Choose only the projects currently visible in your MultiMango account. These will be the only projects available while tasking.</p>
          <label className="search-box">
            <Search size={17} />
            <input placeholder="Search project catalog" value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
          <div className="visible-project-grid tall">
            {filtered.map((project) => (
              <label className={`project-check ${visibleSelection.includes(project.name) ? 'checked' : ''}`} key={project.name}>
                <input type="checkbox" checked={visibleSelection.includes(project.name)} onChange={() => toggleVisible(project.name)} />
                <span>{project.name}</span>
                <strong>{project.minutesPerTask} min</strong>
              </label>
            ))}
          </div>
          <button className="primary-button" disabled={visibleSelection.length === 0} onClick={saveVisible}>Next</button>
          {error && <p className="error-text">{error}</p>}
        </div>

        <form className="missing-card glass-panel" onSubmit={requestMissing}>
          <div className="section-heading">
            <h2>Project missing?</h2>
            <span>Request admin add it</span>
          </div>
          <input placeholder="Type missing project name" value={missingProject.projectName} onChange={(e) => setMissingProject({ ...missingProject, projectName: e.target.value })} required />
          <textarea placeholder="Optional note for admin" value={missingProject.note} onChange={(e) => setMissingProject({ ...missingProject, note: e.target.value })} />
          <button className="ghost">Send request</button>
        </form>
        {feedbackPanel}
        {leavePanel}
      </section>
    );
  }

  if (!catalogOnly && !summary.punchedIn) {
    return (
      <section className="tasking-layout pre-punch-layout">
        <div className="punch-panel glass-panel">
          <div>
            <span className="eyebrow">Ready to punch in</span>
            <h2>Punch in to access tasking tools.</h2>
            <p className="muted">Start task, submit task, catalog edits, history, and feedback unlock only after punch-in. Leave request stays available anytime.</p>
          </div>
          <div className="punch-actions">
            <button className="primary-button" disabled={visibleSelection.length === 0} onClick={() => call(taskingApi.punchIn)}><LogIn size={17} /> Punch in</button>
          </div>
        </div>
        {leavePanel}
      </section>
    );
  }

  return (
    <section className={`tasking-layout ${catalogOnly ? 'catalog-only' : ''}`}>
      {!catalogOnly && (
        <>
          <div className="metric glass-panel"><CheckCircle2 /><span>Done today</span><strong>{summary.completedTasksToday}</strong></div>
          <div className="metric glass-panel"><Clock3 /><span>Tasking time</span><strong>{fmt(summary.taskingSeconds)}</strong></div>
          <div className="metric glass-panel"><TimerReset /><span>Login time</span><strong>{fmt(dynamicLoginSeconds + (tick && 0))}</strong></div>
          <div className="metric glass-panel"><CalendarDays /><span>Attendance</span><strong>{attendanceLabel(summary.attendanceStatus)}</strong></div>
          <div className="metric danger glass-panel"><LogOut /><span>Login auto punch-out</span><strong>{fmt((summary.requiredLoginSeconds || 28800) - dynamicLoginSeconds)}</strong></div>

          <div className="punch-panel glass-panel">
            <div>
              <span className="eyebrow">{summary.punchedIn ? 'Punched in' : 'Not punched in'}</span>
              <h2>Tasking time counts only between Start and Submit.</h2>
              <p className="muted">Select visible MultiMango projects before punch-in. You can punch out manually anytime.</p>
            </div>
            <div className="punch-actions">
              <button className="primary-button" disabled={summary.punchedIn || visibleSelection.length === 0} onClick={() => call(taskingApi.punchIn)}><LogIn size={17} /> Punch in</button>
              <button className="ghost" disabled={!summary.punchedIn} onClick={punchOut}><LogOut size={17} /> Punch out</button>
            </div>
          </div>

          <form className="work-card glass-panel" onSubmit={startTask}>
            <div className="section-heading">
              <h2>Start task</h2>
              <span>{currentProject ? `${currentProject.minutesPerTask} min AHT` : 'Select visible MultiMango project'}</span>
            </div>
            <input
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="Task ID from MultiMango"
              value={taskId}
              onChange={(e) => setTaskId(e.target.value.replace(/\D/g, ''))}
              disabled={!summary.punchedIn || summary.activeTask}
              required
            />
            <GlassSelect value={selected} placeholder="Project name" onChange={setSelected} disabled={!summary.punchedIn || summary.activeTask} options={visibleProjects.map((project) => ({ value: project.name, label: `${project.name} · ${project.minutesPerTask} min` }))}>
              <option value="">Project name</option>
              {visibleProjects.map((project) => <option key={project.name} value={project.name}>{project.name} · {project.minutesPerTask} min</option>)}
            </GlassSelect>
            <button className="primary-button" disabled={!summary.punchedIn || summary.activeTask || !selected}><Play size={17} /> Start</button>
          </form>

          <div className="work-card glass-panel">
            <div className="section-heading">
              <h2>Submit task</h2>
              <span>{summary.activeTask ? `${fmt(elapsed)} / ${fmt(required)}` : 'No active task'}</span>
            </div>
            {summary.activeTask && (
              <div className="active-strip">
                <strong>{summary.activeTask.externalTaskId}</strong>
                <span>{summary.activeTask.projectName}</span>
                {exceeded > 0 && <em>AHT {fmt(required)} · exceeded by {fmt(exceeded)} ({exceededPercent}%)</em>}
              </div>
            )}
            <textarea placeholder="Prompt" value={promptText} onChange={(e) => setPromptText(e.target.value)} disabled={!summary.activeTask} />
            <textarea placeholder="Justification" value={justification} onChange={(e) => setJustification(e.target.value)} disabled={!summary.activeTask || noJustification} />
            <label className="check-line">
              <input type="checkbox" checked={noJustification} onChange={(e) => setNoJustification(e.target.checked)} disabled={!summary.activeTask} />
              No justification
            </label>
            <button className="primary-button" disabled={!canSubmit} onClick={submitTask}><Send size={17} /> Submit task</button>
            {error && <p className="error-text">{error}</p>}
          </div>

          <form className="work-card glass-panel" onSubmit={requestMissing}>
            <div className="section-heading">
              <h2>Missing project?</h2>
              <span>Send request to admin</span>
            </div>
            <input placeholder="Project name visible in MultiMango" value={missingProject.projectName} onChange={(e) => setMissingProject({ ...missingProject, projectName: e.target.value })} required />
            <textarea placeholder="Optional note" value={missingProject.note} onChange={(e) => setMissingProject({ ...missingProject, note: e.target.value })} />
            <button className="ghost">Raise request</button>
          </form>

          {feedbackPanel}
          {leavePanel}

          {/* Leave request is rendered through leavePanel above. */}
          {false && <form className="work-card leave-panel glass-panel" onSubmit={requestLeave}>
            <div className="section-heading">
              <div>
                <span className="eyebrow">Leave</span>
                <h2>Leave request</h2>
              </div>
              <span>{leaveRequests.length} sent</span>
            </div>
            <div className="date-pair">
              <input type="date" value={leaveForm.startDate} min={currentDate} onChange={(e) => changeLeaveStart(e.target.value)} required />
              <input type="date" value={leaveForm.endDate} min={leaveForm.startDate || currentDate} onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })} required />
            </div>
            <textarea placeholder="Reason for leave" value={leaveForm.reason} onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })} required />
            <button className="ghost">Apply leave</button>
            <div className="mini-list">
              {leaveRequests.slice(0, 3).map((leave) => (
                <span key={leave.id}>{leave.startDate} to {leave.endDate} · {leave.status}</span>
              ))}
            </div>
          </form>}

          <div className="history-panel glass-panel">
            <div className="section-heading">
              <div>
                <span className="eyebrow">Daily record</span>
                <h2>Tasking history</h2>
              </div>
              <input className="date-input" type="date" value={historyDate} max={currentDate} onChange={(e) => loadHistory(e.target.value)} />
            </div>
            <div className="history-stats">
              <span>Punch in <strong>{fmtStamp(historySummary?.punchedInAt)}</strong></span>
              <span>Punch out <strong>{fmtStamp(historySummary?.punchedOutAt)}</strong></span>
              <span>Login <strong>{fmt(historySummary?.loginSeconds)}</strong></span>
              <span>Tasking <strong>{fmt(historySummary?.taskingSeconds)}</strong></span>
              <span>Tasks <strong>{historySummary?.completedTasksToday || 0}</strong></span>
              <span>Attendance <strong>{attendanceLabel(historySummary?.attendanceStatus)}</strong></span>
            </div>
            <div className="visible-history">
              <strong>Visible MultiMango projects</strong>
              <p>{historySummary?.visibleProjectNames?.length ? historySummary.visibleProjectNames.join(', ') : 'No projects recorded for this date'}</p>
            </div>
            {(historySummary?.completedTasks || []).map((task) => (
              <div className={`task-row ${task.exceededSeconds > 0 ? 'over-aht-row' : ''}`} key={task.id}>
                <div>
                  <strong>{task.externalTaskId}</strong>
                  <span>{task.projectName}</span>
                </div>
                <span className="task-time-detail">
                  Actual <strong>{fmt(task.durationSeconds)}</strong>
                  <small>AHT {fmt(task.expectedDurationSeconds)}</small>
                  {task.exceededSeconds > 0 && <em>+{fmt(task.exceededSeconds)} ({task.exceededPercentage}%)</em>}
                </span>
              </div>
            ))}
          </div>

          {user?.role === 'ADMIN' && (
            <div className="history-panel admin-flags glass-panel">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">Admin review</span>
                  <h2>AHT mismatch flags</h2>
                </div>
                <span>{productivityFlags.length} flagged</span>
              </div>
              {productivityFlags.length === 0 && <p className="muted">No AHT mismatch flags after punch-out.</p>}
              {productivityFlags.map((flag) => (
                <div className="task-row flag-row" key={flag.sessionId}>
                  <div>
                    <strong>{flag.tasker.name} · {flag.workDate}</strong>
                    <span>{flag.completedTasks} tasks · expected {fmt(flag.expectedTaskingSeconds)} · actual {fmt(flag.taskingSeconds)}</span>
                  </div>
                  <span>{flag.reason}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <div className="catalog-panel glass-panel">
        <div className="section-heading">
          <h2>Project catalog</h2>
          <span>{filtered.length} visible</span>
        </div>
        <label className="search-box">
          <Search size={17} />
          <input placeholder="Search projects or domain" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <div className="catalog-list">
          {filtered.map((project) => (
            <button className={`catalog-item ${selected === project.name ? 'selected' : ''} ${visibleSelection.includes(project.name) ? 'visible' : ''}`} key={project.name} onClick={() => updateVisibleProject(project.name)}>
              <span>{project.name}</span>
              <strong>{project.minutesPerTask} min</strong>
              <em>{project.domain}{project.justificationExpected ? ' · justification' : ''}{visibleSelection.includes(project.name) ? ' · visible' : ''}</em>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
