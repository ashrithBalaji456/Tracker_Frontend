import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '../state/AuthContext.jsx';
import GlassSelect from '../ui/GlassSelect.jsx';

export default function AuthPage({ mode }) {
  const isSignup = mode === 'signup';
  const navigate = useNavigate();
  const { login, signup } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'MEMBER' });
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    try {
      if (isSignup) await signup(form);
      else await login({ email: form.email, password: form.password });
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Authentication failed');
    }
  };

  return (
    <main className="auth-screen">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <section className="auth-card glass-panel">
        <div className="auth-copy">
          <ShieldCheck size={36} />
          <span className="eyebrow">Secure tasking console</span>
          <h1>{isSignup ? 'Create your tasker account.' : 'Welcome back.'}</h1>
          <p>Track MultiMango task IDs, project AHT, prompts, justifications, punch time, and daily tasking progress.</p>
        </div>
        <form onSubmit={submit} className="auth-form">
          {isSignup && (
            <input placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          )}
          <input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <input placeholder="Password" type="password" minLength="8" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          {isSignup && (
            <GlassSelect
              value={form.role}
              onChange={(role) => setForm({ ...form, role })}
              options={[{ value: 'MEMBER', label: 'Member' }, { value: 'ADMIN', label: 'Admin' }]}
            />
          )}
          {error && <p className="error-text">{error}</p>}
          <button className="primary-button">
            {isSignup ? 'Create account' : 'Login'} <ArrowRight size={18} />
          </button>
          <p className="switch-link">
            {isSignup ? 'Already have an account?' : 'Need an account?'}{' '}
            <Link to={isSignup ? '/login' : '/signup'}>{isSignup ? 'Login' : 'Sign up'}</Link>
          </p>
        </form>
      </section>
    </main>
  );
}
