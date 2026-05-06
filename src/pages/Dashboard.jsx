import React, { useEffect, useMemo, useState } from 'react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { AlertTriangle, CheckCircle2, Clock3, ListChecks } from 'lucide-react';
import { dashboardApi } from '../api/client';
import StatusBadge from '../ui/StatusBadge.jsx';

export default function Dashboard() {
  const [dashboard, setDashboard] = useState(null);

  useEffect(() => {
    dashboardApi.get().then(setDashboard);
  }, []);

  const chartData = useMemo(() => {
    if (!dashboard) return [];
    return Object.entries(dashboard.tasksByStatus || {}).map(([name, value]) => ({ name: name.replace('_', ' '), value }));
  }, [dashboard]);

  if (!dashboard) return <div className="loading glass-panel">Loading dashboard...</div>;

  return (
    <section className="page-grid">
      <div className="metric glass-panel"><ListChecks /><span>Total Tasks</span><strong>{dashboard.totalTasks}</strong></div>
      <div className="metric glass-panel"><CheckCircle2 /><span>Completed</span><strong>{dashboard.completedTasks}</strong></div>
      <div className="metric danger glass-panel"><AlertTriangle /><span>Overdue</span><strong>{dashboard.overdueTasks}</strong></div>
      <div className="metric glass-panel"><Clock3 /><span>In Motion</span><strong>{dashboard.tasksByStatus?.IN_PROGRESS || 0}</strong></div>

      <div className="wide-card glass-panel">
        <div className="section-heading">
          <h2>Status breakdown</h2>
          <span>Live task distribution</span>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="statusFill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="10%" stopColor="#5eead4" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#5eead4" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <XAxis dataKey="name" tick={{ fill: '#dbeafe', fontSize: 12 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: 'rgba(15,23,42,.82)', border: '1px solid rgba(255,255,255,.18)', borderRadius: 16 }} />
            <Area type="monotone" dataKey="value" stroke="#5eead4" fill="url(#statusFill)" strokeWidth={3} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="list-panel glass-panel">
        <div className="section-heading"><h2>Overdue</h2><span>Needs attention</span></div>
        {dashboard.overdue.length === 0 && <p className="muted">No overdue tasks. Nice and tidy.</p>}
        {dashboard.overdue.map((task) => <TaskRow key={task.id} task={task} />)}
      </div>

      <div className="list-panel glass-panel">
        <div className="section-heading"><h2>Upcoming</h2><span>Next deadlines</span></div>
        {dashboard.upcoming.map((task) => <TaskRow key={task.id} task={task} />)}
      </div>
    </section>
  );
}

function TaskRow({ task }) {
  return (
    <div className="task-row">
      <div>
        <strong>{task.title}</strong>
        <span>{task.projectName} · due {task.dueDate}</span>
      </div>
      <StatusBadge status={task.status} />
    </div>
  );
}
