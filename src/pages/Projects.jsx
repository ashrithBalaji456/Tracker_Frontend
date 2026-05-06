import React, { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { projectApi } from '../api/client';
import { useAuth } from '../state/AuthContext.jsx';

export default function Projects() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [form, setForm] = useState({ name: '', description: '' });

  const load = () => projectApi.list().then(setProjects);
  useEffect(() => { load(); }, []);

  const createProject = async (event) => {
    event.preventDefault();
    await projectApi.create(form);
    setForm({ name: '', description: '' });
    load();
  };

  const remove = async (id) => {
    await projectApi.remove(id);
    load();
  };

  return (
    <section className="workspace">
      {user?.role === 'ADMIN' && (
        <form className="quick-form glass-panel" onSubmit={createProject}>
          <input placeholder="Project name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <input placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <button className="primary-button"><Plus size={17} /> New project</button>
        </form>
      )}
      <div className="card-grid">
        {projects.map((project) => (
          <article className="project-card glass-panel" key={project.id}>
            <div>
              <span className="eyebrow">{project.taskCount} tasks</span>
              <h2>{project.name}</h2>
              <p>{project.description || 'No description yet.'}</p>
            </div>
            <div className="member-stack">
              {project.members.slice(0, 5).map((member) => <span key={member.id}>{member.name.slice(0, 1)}</span>)}
            </div>
            {user?.role === 'ADMIN' && <button className="ghost danger-button" onClick={() => remove(project.id)}><Trash2 size={16} /> Delete</button>}
          </article>
        ))}
      </div>
    </section>
  );
}
