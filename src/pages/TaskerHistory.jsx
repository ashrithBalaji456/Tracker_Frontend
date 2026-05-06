import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, Clock3, MessageSquare, TimerReset } from 'lucide-react';
import { taskingApi } from '../api/client';
import GlassSelect from '../ui/GlassSelect.jsx';

const fmt = (seconds = 0) => {
  const safe = Math.max(0, Math.floor(seconds));
  const h = String(Math.floor(safe / 3600)).padStart(2, '0');
  const m = String(Math.floor((safe % 3600) / 60)).padStart(2, '0');
  const s = String(safe % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
};

const attendanceLabel = (status) => ({
  FULL_DAY_PRESENT: 'Full day',
  HALF_DAY_PRESENT: 'Half day',
  ABSENT: 'Absent',
}[status] || 'Absent');

const stamp = (value) => value ? new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--';

export default function TaskerHistory() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [history, setHistory] = useState(null);
  const [viewMode, setViewMode] = useState(searchParams.get('date') || 'overall');
  const [error, setError] = useState('');
  const [warned, setWarned] = useState([]);
  const [notice, setNotice] = useState('');
  const [pendingWarning, setPendingWarning] = useState(null);
  const [warningRating, setWarningRating] = useState('1');

  useEffect(() => {
    taskingApi.taskerHistory(id)
      .then(setHistory)
      .catch((err) => setError(err.response?.data?.message || 'Could not load tasker history'));
  }, [id]);

  const openWarningPrompt = (workDate, message) => {
    setPendingWarning({ workDate, message });
    setWarningRating('1');
  };

  const sendWarning = async () => {
    if (!pendingWarning) return;
    const { workDate, message } = pendingWarning;
    const key = `${workDate}:${message}`;
    setError('');
    try {
      await taskingApi.sendFeedback(id, { message, rating: Number(warningRating), workDate });
      setWarned((current) => current.includes(key) ? current : [...current, key]);
      setHistory((current) => current ? ({
        ...current,
        feedback: [
          {
            id: `${Date.now()}`,
            message,
            rating: Number(warningRating),
            workDate,
            createdAt: new Date().toISOString(),
            sentBy: { name: 'Admin' },
          },
          ...current.feedback,
        ],
      }) : current);
      setPendingWarning(null);
      setNotice('Warning sent.');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not send warning');
    }
  };

  const isWarned = (workDate, message) =>
    warned.includes(`${workDate}:${message}`)
    || (history?.feedback || []).some((item) => item.workDate === workDate && item.message === message);

  if (error) return <div className="admin-card glass-panel"><p className="error-text">{error}</p></div>;
  if (!history) return <div className="admin-card glass-panel">Loading tasker history...</div>;
  const visibleDays = viewMode === 'overall'
    ? history.days
    : history.days.filter((day) => day.workDate === viewMode);
  const visibleTotals = visibleDays.reduce((totals, day) => ({
    tasks: totals.tasks + day.completedTasksToday,
    tasking: totals.tasking + day.taskingSeconds,
    login: totals.login + day.loginSeconds,
  }), { tasks: 0, tasking: 0, login: 0 });

  return (
    <section className="tasker-history">
      {pendingWarning && (
        <div className="warning-modal-backdrop">
          <div className="warning-modal glass-panel">
            <div className="section-heading">
              <div>
                <span className="eyebrow">Warning rating</span>
                <h2>Send warning to tasker</h2>
              </div>
              <MessageSquare size={20} />
            </div>
            <p>{pendingWarning.message}</p>
            <GlassSelect
              value={warningRating}
              onChange={setWarningRating}
              options={[
                { value: '3', label: '3 - Strong' },
                { value: '2', label: '2 - Average' },
                { value: '1', label: '1 - Needs improvement' },
              ]}
            />
            <div className="modal-actions">
              <button type="button" className="ghost" onClick={() => setPendingWarning(null)}>Cancel</button>
              <button type="button" className="primary-button" onClick={sendWarning}><MessageSquare size={17} /> Send warning</button>
            </div>
          </div>
        </div>
      )}
      <div className="admin-hero glass-panel">
        <button type="button" className="icon-text" onClick={() => navigate('/admin')}><ArrowLeft size={17} /> Back</button>
        <div>
          <span className="eyebrow">Tasker profile</span>
          <h2>{history.tasker.name}</h2>
          <p className="muted">{history.tasker.email}</p>
        </div>
        <div className="admin-kpis">
          <span><strong>{visibleTotals.tasks}</strong>Tasks</span>
          <span><strong>{history.averageRating || '--'}</strong>Rating</span>
        </div>
      </div>

      <div className="admin-card glass-panel">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Daily history</span>
            <h2>{viewMode === 'overall' ? 'Overall work records' : `Work record for ${viewMode}`}</h2>
          </div>
          <div className="history-filter">
            <button type="button" className={viewMode === 'overall' ? 'active' : ''} onClick={() => setViewMode('overall')}>Overall</button>
            <input
              className="date-input"
              type="date"
              value={viewMode === 'overall' ? '' : viewMode}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(event) => setViewMode(event.target.value)}
            />
            <CalendarDays size={20} />
          </div>
        </div>
        {notice && <div className="admin-toast glass-panel success"><span>{notice}</span><button onClick={() => setNotice('')}>Close</button></div>}
        <div className="history-day-list">
          {visibleDays.length === 0 && <p className="muted">No work data for this date.</p>}
          {visibleDays.map((day) => (
            <article className="history-day-card" key={day.workDate}>
              <div className="section-heading">
                <div>
                  <strong>{day.workDate}</strong>
                  <span>{attendanceLabel(day.attendanceStatus)}</span>
                </div>
                <span>{day.completedTasksToday} tasks</span>
              </div>
              <div className="history-stats">
                <span>Punch in <strong>{stamp(day.punchedInAt)}</strong></span>
                <span>Punch out <strong>{stamp(day.punchedOutAt)}</strong></span>
                <span><TimerReset size={15} /> Login <strong>{fmt(day.loginSeconds)}</strong></span>
                <span><Clock3 size={15} /> Tasking <strong>{fmt(day.taskingSeconds)}</strong></span>
                <span>Expected <strong>{fmt(day.expectedTaskingSeconds)}</strong></span>
                <span className="history-flag-cell">
                  Flag <strong>{day.productivityFlagged ? day.productivityFlagReason : 'None'}</strong>
                  {day.productivityFlagged && (
                    <button
                      type="button"
                      className="admin-warn-chip"
                      disabled={isWarned(day.workDate, day.productivityFlagReason)}
                      onClick={() => openWarningPrompt(day.workDate, day.productivityFlagReason)}
                    >
                      <MessageSquare size={15} /> {isWarned(day.workDate, day.productivityFlagReason) ? 'Sent' : 'Warn'}
                    </button>
                  )}
                </span>
              </div>
              <div className="visible-history">
                <strong>Visible MultiMango projects</strong>
                <p>{day.visibleProjectNames?.length ? day.visibleProjectNames.join(', ') : 'No projects recorded'}</p>
              </div>
              {(day.completedTasks || []).map((task) => {
                const taskWarning = `Task ${task.externalTaskId} exceeded AHT by ${Math.round(task.exceededPercentage)}% (${Math.round(task.exceededSeconds / 60)} min extra)`;
                const canWarnTask = task.exceededPercentage > 50;
                return (
                <div className={`task-row ${task.exceededSeconds > 0 ? 'over-aht-row' : ''}`} key={task.id}>
                  <div>
                    <strong>{task.externalTaskId}</strong>
                    <span>{task.projectName}</span>
                  </div>
                  <span className="task-time-detail">
                    Actual <strong>{fmt(task.durationSeconds)}</strong>
                    <small>AHT {fmt(task.expectedDurationSeconds)}</small>
                    {task.exceededSeconds > 0 && <em>+{fmt(task.exceededSeconds)} ({task.exceededPercentage}%)</em>}
                    {canWarnTask && (
                      <button
                        type="button"
                        className="admin-warn-chip"
                        disabled={isWarned(day.workDate, taskWarning)}
                        onClick={() => openWarningPrompt(day.workDate, taskWarning)}
                      >
                        <MessageSquare size={15} /> {isWarned(day.workDate, taskWarning) ? 'Sent' : 'Warn'}
                      </button>
                    )}
                  </span>
                </div>
              );
              })}
            </article>
          ))}
        </div>
      </div>

      <div className="admin-card glass-panel">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Warnings</span>
            <h2>Feedback history</h2>
          </div>
          <MessageSquare size={20} />
        </div>
        <div className="admin-list compact">
          {history.feedback.length === 0 && <p className="muted">No warnings or feedback yet.</p>}
          {history.feedback.map((item) => (
            <div className="feedback-item" key={item.id}>
              <div>
                <strong>{item.rating} / 3</strong>
                <span>Work date {item.workDate || '--'} · sent {item.createdAt?.slice(0, 10)}</span>
              </div>
              <p>{item.message}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
