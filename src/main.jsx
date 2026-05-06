import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider, useAuth } from './state/AuthContext.jsx';
import AuthPage from './pages/AuthPage.jsx';
import './styles.css';

function ProtectedRoute() {
  const { token } = useAuth();
  return token ? <App /> : <Navigate to="/login" replace />;
}

function PublicAuthRoute({ mode }) {
  const { token } = useAuth();
  return token ? <Navigate to="/" replace /> : <AuthPage mode={mode} />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<PublicAuthRoute mode="login" />} />
          <Route path="/signup" element={<PublicAuthRoute mode="signup" />} />
          <Route path="/*" element={<ProtectedRoute />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
