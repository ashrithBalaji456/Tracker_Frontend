import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, MessageSquare, Plus, RotateCcw, Search, UserCog } from 'lucide-react';
import { authApi, taskingApi } from '../api/client';
import GlassSelect from '../ui/GlassSelect.jsx';

const todayKey = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
const fmt = (seconds = 0) => {
  const safe = Math.max(0, Math.floor(seconds));
  const h = String(Math.floor(safe / 3600)).padStart(2, '0');
  const m = String(Math.floor((safe % 3600) / 60)).padStart(2, '0');
  const s = String(safe % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
};
const attendance = (status) => ({
  FULL_DAY_PRESENT: 'Full day',
  HALF_DAY_PRESENT: 'Half day',
  ABSENT: 'Absent',
}[status] || 'Absent');
const emptyReportFor = (tasker, workDate) => ({
  tasker,
  workDate,
  punchedInAt: null,
  punchedOutAt: null,
  loginSeconds: 0,
  taskingSeconds: 0,
  expectedTaskingSeconds: 0,
  completedTasks: 0,
  attendanceStatus: 'ABSENT',
  flagged: false,
  flagReason: '',
  flagReasons: [],
  averageRating: 0,
});
const adminErrorMessage = (error) => error?.response?.data?.message || 'Request failed';

export default function AdminPanel() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [reports, setReports] = useState([]);
  const [missing, setMissing] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [date, setDate] = useState(todayKey());
  const [sortBy, setSortBy] = useState('taskingSeconds');
  const [query, setQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [projectForm, setProjectForm] = useState({ name: '', minutesPerTask: '', domain: 'Generalist', justificationExpected: false });
  const [feedbackForm, setFeedbackForm] = useState({ userId: '', message: '', rating: 2 });
  const [draftedWarnings, setDraftedWarnings] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = async (targetDate = date) => {
    const [usersResult, reportsResult, missingResult, leavesResult] = await Promise.allSettled([
      authApi.users(),
      taskingApi.taskerReports(targetDate),
      taskingApi.missingProjectRequests(),
      taskingApi.leaveRequests(),
    ]);

    const nextUsers = usersResult.status === 'fulfilled' ? usersResult.value : users;
    if (usersResult.status === 'fulfilled') setUsers(nextUsers);
    if (reportsResult.status === 'fulfilled') {
      setReports(reportsResult.value);
    } else if (usersResult.status === 'fulfilled') {
      setReports(nextUsers.filter((user) => user.role === 'MEMBER').map((user) => emptyReportFor(user, targetDate)));
    }
    if (missingResult.status === 'fulfilled') setMissing(missingResult.value);
    if (leavesResult.status === 'fulfilled') setLeaves(leavesResult.value);

    const failures = [
      usersResult.status === 'rejected' ? `Users: ${adminErrorMessage(usersResult.reason)}` : '',
      reportsResult.status === 'rejected' ? `Reports: ${adminErrorMessage(reportsResult.reason)}` : '',
      missingResult.status === 'rejected' ? `Requests: ${adminErrorMessage(missingResult.reason)}` : '',
      leavesResult.status === 'rejected' ? `Leaves: ${adminErrorMessage(leavesResult.reason)}` : '',
    ].filter(Boolean);
    setError(failures.join(' | '));
  };

  useEffect(() => { load(); }, []);

  const taskers = useMemo(() => users.filter((user) => user.role === 'MEMBER'), [users]);
  const warningKey = (report, reason = report.flagReason || '') => `${date}:${report.tasker.id}:${reason}`;
  const currentFlagReason = (report) => {
    const reasons = report.flagReasons?.length ? report.flagReasons : (report.flagReason ? [report.flagReason] : []);
    return reasons.find((reason) => !draftedWarnings.includes(warningKey(report, reason))) || '';
  };
  const sortedReports = useMemo(() => {
    const needle = query.toLowerCase();
    return reports
      .filter((report) => report.tasker.name.toLowerCase().includes(needle) || report.tasker.email.toLowerCase().includes(needle))
      .sort((a, b) => {
        if (sortBy === 'completedTasks') return b.completedTasks - a.completedTasks;
        if (sortBy === 'loginSeconds') return b.loginSeconds - a.loginSeconds;
        if (sortBy === 'averageRating') return b.averageRating - a.averageRating;
        if (sortBy === 'flagged') return Number(b.flagged) - Number(a.flagged);
        return b.taskingSeconds - a.taskingSeconds;
      });
  }, [reports, query, sortBy]);

  const flaggedCount = reports.filter((report) => currentFlagReason(report)).length;

  const reloadForDate = async (value) => {
    setDate(value);
    await load(value);
  };

  const prepareWarning = (report) => {
    const reason = currentFlagReason(report) || 'AHT exceeded. Please review tasking pace and quality.';
    setFeedbackForm({
      userId: String(report.tasker.id),
      rating: 1,
      message: reason,
    });
    const key = warningKey(report, reason);
    setDraftedWarnings((current) => current.includes(key) ? current : [...current, key]);
    setMessage('Flag copied into warning form. Review and send when ready.');
    setError('');
  };

  const grantRepunch = async (event) => {
    event.preventDefault();
    await action(async () => {
      await taskingApi.allowRepunch(selectedUserId);
      setSelectedUserId('');
      return 'Repunch access granted.';
    });
  };

  const addProject = async (event) => {
    event.preventDefault();
    await action(async () => {
      await taskingApi.addProject({ ...projectForm, minutesPerTask: Number(projectForm.minutesPerTask) });
      setProjectForm({ name: '', minutesPerTask: '', domain: 'Generalist', justificationExpected: false });
      await load();
      return 'Project added to every tasker catalog.';
    });
  };

  const sendFeedback = async (event) => {
    event.preventDefault();
    await action(async () => {
      await taskingApi.sendFeedback(feedbackForm.userId, {
        message: feedbackForm.message,
        rating: Number(feedbackForm.rating),
        workDate: date,
      });
      setFeedbackForm({ userId: '', message: '', rating: 2 });
      await load();
      return 'Warning sent and flag cleared for this date.';
    });
  };

  const updateLeave = async (leaveId, status) => {
    await action(async () => {
      await taskingApi.updateLeaveStatus(leaveId, status);
      await load();
      return `Leave ${status.toLowerCase()}.`;
    });
  };

  const action = async (fn) => {
    setMessage('');
    setError('');
    try {
      setMessage(await fn());
    } catch (err) {
      setError(err.response?.data?.message || 'Admin action failed');
    }
  };

  return (
    <section className="admin-grid">
      <div className="admin-hero glass-panel">
        <div>
          <span className="eyebrow">Admin control</span>
          <h2>Tasker performance</h2>
          <p className="muted">Sort taskers by tasking time, login time, task count, flags, or rating. Add catalog tasks and send warning feedback.</p>
        </div>
        <div className="admin-kpis">
          <span><strong>{reports.length}</strong>Taskers</span>
          <span><strong>{flaggedCount}</strong>Flagged</span>
          <span><strong>{missing.length}</strong>Requests</span>
          <span><strong>{leaves.length}</strong>Leaves</span>
        </div>
      </div>

      <div className="admin-card admin-wide glass-panel">
        <div className="section-heading">
          <div>
            <span className="eyebrow">All taskers</span>
            <h2>Sortable tasker data</h2>
          </div>
          <input className="date-input" type="date" value={date} max={todayKey()} onChange={(event) => reloadForDate(event.target.value)} />
        </div>
        <div className="admin-toolbar">
          <label className="search-box">
            <Search size={17} />
            <input placeholder="Search tasker" value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
          <GlassSelect
            value={sortBy}
            onChange={setSortBy}
            options={[
              { value: 'taskingSeconds', label: 'Sort by tasking time' },
              { value: 'loginSeconds', label: 'Sort by login time' },
              { value: 'completedTasks', label: 'Sort by task count' },
              { value: 'flagged', label: 'Sort by flagged' },
              { value: 'averageRating', label: 'Sort by rating' },
            ]}
          />
        </div>
        <div className="admin-list">
          {sortedReports.length === 0 && <p className="muted">No tasker records found for this date.</p>}
          {sortedReports.map((report) => (
            <div
              className={`admin-report-row clickable ${currentFlagReason(report) ? 'flagged' : ''}`}
              key={report.tasker.id}
              role="button"
              tabIndex={0}
              onClick={() => navigate(`/admin/taskers/${report.tasker.id}?date=${date}`)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') navigate(`/admin/taskers/${report.tasker.id}?date=${date}`);
              }}
            >
              <div>
                <strong>{report.tasker.name}</strong>
                <span>{report.tasker.email}</span>
              </div>
              <span>Tasking <strong>{fmt(report.taskingSeconds)}</strong></span>
              <span>Login <strong>{fmt(report.loginSeconds)}</strong></span>
              <span>Tasks <strong>{report.completedTasks}</strong></span>
              <span>Rating <strong>{report.averageRating || '--'}</strong></span>
              <div className="flag-action">
                <em>{currentFlagReason(report) || attendance(report.attendanceStatus)}</em>
                {currentFlagReason(report) && (
                  <button
                    type="button"
                    className="admin-warn-chip"
                    onClick={(event) => {
                      event.stopPropagation();
                      prepareWarning(report);
                    }}
                  >
                    <MessageSquare size={15} /> Warn
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <form className="admin-card glass-panel" onSubmit={addProject}>
        <div className="section-heading">
          <div>
            <span className="eyebrow">Catalog admin</span>
            <h2>Add requested task</h2>
          </div>
          <Plus size={20} />
        </div>
        <input placeholder="Project/task name" value={projectForm.name} onChange={(event) => setProjectForm({ ...projectForm, name: event.target.value })} required />
        <input type="number" min="0.1" step="0.1" placeholder="AHT minutes" value={projectForm.minutesPerTask} onChange={(event) => setProjectForm({ ...projectForm, minutesPerTask: event.target.value })} required />
        <GlassSelect
          value={projectForm.domain}
          onChange={(domain) => setProjectForm({ ...projectForm, domain })}
          options={[{ value: 'Generalist', label: 'Generalist' }, { value: 'Evals', label: 'Evals' }]}
        />
        <label className="check-line"><input type="checkbox" checked={projectForm.justificationExpected} onChange={(event) => setProjectForm({ ...projectForm, justificationExpected: event.target.checked })} /> Requires justification</label>
        <button className="primary-button"><Plus size={17} /> Add to catalog</button>
      </form>

      <form className="admin-card glass-panel" onSubmit={sendFeedback}>
        <div className="section-heading">
          <div>
            <span className="eyebrow">Warnings</span>
            <h2>Send feedback</h2>
          </div>
          <MessageSquare size={20} />
        </div>
        <GlassSelect
          value={feedbackForm.userId}
          placeholder="Choose tasker"
          onChange={(userId) => setFeedbackForm({ ...feedbackForm, userId })}
          options={taskers.map((tasker) => ({ value: String(tasker.id), label: tasker.name }))}
        />
        <GlassSelect
          value={feedbackForm.rating}
          onChange={(rating) => setFeedbackForm({ ...feedbackForm, rating })}
          options={[
            { value: '3', label: '3 - Strong' },
            { value: '2', label: '2 - Average' },
            { value: '1', label: '1 - Needs improvement' },
          ]}
        />
        <textarea placeholder="Warning or feedback message" value={feedbackForm.message} onChange={(event) => setFeedbackForm({ ...feedbackForm, message: event.target.value })} required />
        <button className="primary-button"><MessageSquare size={17} /> Send warning</button>
      </form>

      <form className="admin-card glass-panel" onSubmit={grantRepunch}>
        <div className="section-heading">
          <div>
            <span className="eyebrow">One-time access</span>
            <h2>Allow repunch</h2>
          </div>
          <RotateCcw size={20} />
        </div>
        <GlassSelect
          value={selectedUserId}
          placeholder="Choose tasker"
          onChange={setSelectedUserId}
          options={taskers.map((tasker) => ({ value: String(tasker.id), label: tasker.name }))}
        />
        <button className="primary-button"><UserCog size={17} /> Grant repunch</button>
      </form>

      <div className="admin-card leave-review-card glass-panel">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Leave</span>
            <h2>Leave requests</h2>
          </div>
          <span>{leaves.length}</span>
        </div>
        <div className="admin-list compact">
          {leaves.length === 0 && <p className="muted">No leave requests yet.</p>}
          {leaves.map((leave) => (
            <div className="admin-row" key={leave.id}>
              <div>
                <strong>{leave.tasker.name}</strong>
                <span>{leave.startDate} to {leave.endDate} · {leave.status}</span>
              </div>
              <em>{leave.reason}</em>
              {leave.status === 'PENDING' && (
                <div className="leave-actions">
                  <button type="button" className="mini-button approve" onClick={() => updateLeave(leave.id, 'APPROVED')}>Approve</button>
                  <button type="button" className="mini-button reject" onClick={() => updateLeave(leave.id, 'REJECTED')}>Reject</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="admin-card glass-panel">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Catalog gaps</span>
            <h2>Missing requests</h2>
          </div>
          <span>{missing.length}</span>
        </div>
        <div className="admin-list compact">
          {missing.length === 0 && <p className="muted">No open missing-project requests.</p>}
          {missing.map((request) => (
            <div className="admin-row" key={request.id}>
              <AlertTriangle size={18} />
              <div>
                <strong>{request.projectName}</strong>
                <span>{request.requestedBy.name} · {request.requestedAt?.slice(0, 10)}</span>
              </div>
              {request.note && <em>{request.note}</em>}
            </div>
          ))}
        </div>
      </div>

      {(message || error) && (
        <div className="admin-toast glass-panel">
          {message && <p className="success-text">{message}</p>}
          {error && <p className="error-text">{error}</p>}
          <button type="button" className="toast-close" onClick={() => { setMessage(''); setError(''); }}>Close</button>
        </div>
      )}
    </section>
  );
}
