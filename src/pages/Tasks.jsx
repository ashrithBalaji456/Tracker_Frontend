import React, { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { projectApi, taskApi } from '../api/client';
import { useAuth } from '../state/AuthContext.jsx';
import StatusBadge from '../ui/StatusBadge.jsx';
import GlassSelect from '../ui/GlassSelect.jsx';

export default function Tasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [form, setForm] = useState({ title: '', description: '', dueDate: '', projectId: '', assignedToId: '' });

  const load = async () => {
    const [taskData, projectData] = await Promise.all([taskApi.list(), projectApi.list()]);
    setTasks(taskData);
    setProjects(projectData);
  };

  useEffect(() => { load(); }, []);

  const selectedProject = projects.find((project) => String(project.id) === String(form.projectId));

  const createTask = async (event) => {
    event.preventDefault();
    await taskApi.create({ ...form, projectId: Number(form.projectId), assignedToId: Number(form.assignedToId), status: 'TODO' });
    setForm({ title: '', description: '', dueDate: '', projectId: '', assignedToId: '' });
    load();
  };

  const updateStatus = async (task, status) => {
    await taskApi.update(task.id, { status });
    load();
  };

  const remove = async (id) => {
    await taskApi.remove(id);
    load();
  };

  return (
    <section className="workspace">
      {user?.role === 'ADMIN' && (
        <form className="quick-form task-form glass-panel" onSubmit={createTask}>
          <input placeholder="Task title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          <input placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} required />
          <GlassSelect value={form.projectId} placeholder="Project" onChange={(projectId) => setForm({ ...form, projectId, assignedToId: '' })} options={projects.map((project) => ({ value: String(project.id), label: project.name }))}>
            <option value="">Project</option>
            {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
          </GlassSelect>
          <GlassSelect value={form.assignedToId} placeholder="Assignee" disabled={!selectedProject} onChange={(assignedToId) => setForm({ ...form, assignedToId })} options={(selectedProject?.members || []).map((member) => ({ value: String(member.id), label: member.name }))}>
            <option value="">Assignee</option>
            {selectedProject?.members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
          </GlassSelect>
          <button className="primary-button"><Plus size={17} /> Assign</button>
        </form>
      )}
      <div className="task-board">
        {['TODO', 'IN_PROGRESS', 'DONE'].map((status) => (
          <div className="task-column glass-panel" key={status}>
            <div className="section-heading">
              <h2>{status.replace('_', ' ')}</h2>
              <span>{tasks.filter((task) => task.status === status).length} tasks</span>
            </div>
            {tasks.filter((task) => task.status === status).map((task) => (
              <article className={`task-card ${task.overdue ? 'is-overdue' : ''}`} key={task.id}>
                <div className="task-card-top">
                  <StatusBadge status={task.status} />
                  {user?.role === 'ADMIN' && <button className="mini-button" onClick={() => remove(task.id)}><Trash2 size={15} /></button>}
                </div>
                <h3>{task.title}</h3>
                <p>{task.description}</p>
                <span className="muted">{task.projectName} · {task.assignedTo.name} · {task.dueDate}</span>
                <div className="segmented">
                  {['TODO', 'IN_PROGRESS', 'DONE'].map((next) => (
                    <button key={next} className={next === task.status ? 'active' : ''} onClick={() => updateStatus(task, next)}>
                      {next === 'IN_PROGRESS' ? 'Doing' : next === 'TODO' ? 'To do' : 'Done'}
                    </button>
                  ))}
                </div>
              </article>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
