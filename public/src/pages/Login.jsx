import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../App';
import api from '../utils/api';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth(); // Global auth handler if using context

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Handle field changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  // Submit login credentials
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/auth/login', formData);

      const { token, user } = response.data;

      // Persist auth data in localStorage
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      // Update global application context if available
      if (login) {
        login(user, token);
      }

      // Redirect user to dashboard
      navigate('/dashboard');
    } catch (err) {
      setError(
        err.response?.data?.message || 'Invalid email or password. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.logoIcon}>🚀</div>
          <h1 style={styles.title}>Travel Authority System</h1>
          <p style={styles.subtitle}>Sign in to access your duty travel dashboard</p>
        </div>

        {error && <div style={styles.errorAlert}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          {/* Email Input */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Email Address</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="e.g. nchimunya@example.com"
              required
              style={styles.input}
            />
          </div>

          {/* Password Input */}
          <div style={styles.formGroup}>
            <div style={styles.passwordHeader}>
              <label style={styles.label}>Password</label>
              <a href="#forgot" style={styles.forgotLink}>Forgot password?</a>
            </div>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              required
              style={styles.input}
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.submitBtn,
              opacity: loading ? 0.7 : 1,
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={styles.footer}>
          <p style={styles.footerText}>
            Need an account? Contact system administration to provision credentials.
          </p>
        </div>
      </div>
    </div>
  );
}

// Inline Styles
const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    padding: '20px',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  },
  card: {
    width: '100%',
    maxWidth: '420px',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '36px 32px',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    border: '1px solid #e2e8f0'
  },
  header: {
    textAlign: 'center',
    marginBottom: '28px'
  },
  logoIcon: {
    fontSize: '36px',
    marginBottom: '8px'
  },
  title: {
    fontSize: '22px',
    fontWeight: 'bold',
    color: '#0f172a',
    margin: '0 0 6px 0'
  },
  subtitle: {
    fontSize: '13px',
    color: '#64748b',
    margin: 0
  },
  errorAlert: {
    backgroundColor: '#fef2f2',
    color: '#991b1b',
    padding: '10px 14px',
    borderRadius: '6px',
    border: '1px solid #fecaca',
    fontSize: '13px',
    marginBottom: '20px'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  passwordHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  label: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#334155'
  },
  forgotLink: {
    fontSize: '12px',
    color: '#2563eb',
    textDecoration: 'none'
  },
  input: {
    padding: '10px 14px',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
    width: '100%',
    transition: 'border-color 0.2s'
  },
  submitBtn: {
    backgroundColor: '#2563eb',
    color: '#ffffff',
    border: 'none',
    padding: '12px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 'bold',
    marginTop: '6px',
    boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)'
  },
  footer: {
    marginTop: '28px',
    paddingTop: '20px',
    borderTop: '1px solid #f1f5f9',
    textAlign: 'center'
  },
  footerText: {
    fontSize: '12px',
    color: '#94a3b8',
    margin: 0,
    lineHeight: '1.5'
  }
};