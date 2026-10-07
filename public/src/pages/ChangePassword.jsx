import React, { useState } from 'react';
import api from '../utils/api';

export default function ChangePassword() {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');

    if (form.newPassword.length < 8 || new TextEncoder().encode(form.newPassword).length > 72) {
      setError('New password must be 8 to 72 bytes long.');
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setError('The new passwords do not match.');
      return;
    }

    setSaving(true);
    try {
      await api.patch('/auth/me/password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword
      });
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setNotice('Password changed successfully.');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not change password.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.container}>
      <section style={styles.panel}>
        <h1 style={styles.title}>Change Password</h1>
        <p style={styles.subtitle}>Choose a password you will use the next time you sign in.</p>
        {error && <div role="alert" style={styles.error}>{error}</div>}
        {notice && <div role="status" style={styles.notice}>{notice}</div>}
        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.field}>
            Current password
            <input
              required
              type="password"
              autoComplete="current-password"
              value={form.currentPassword}
              onChange={(event) => setForm({ ...form, currentPassword: event.target.value })}
              style={styles.input}
            />
          </label>
          <label style={styles.field}>
            New password
            <input
              required
              type="password"
              minLength="8"
              autoComplete="new-password"
              value={form.newPassword}
              onChange={(event) => setForm({ ...form, newPassword: event.target.value })}
              style={styles.input}
            />
          </label>
          <label style={styles.field}>
            Confirm new password
            <input
              required
              type="password"
              minLength="8"
              autoComplete="new-password"
              value={form.confirmPassword}
              onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })}
              style={styles.input}
            />
          </label>
          <button type="submit" disabled={saving} style={styles.button}>
            {saving ? 'Saving...' : 'Update Password'}
          </button>
        </form>
      </section>
    </div>
  );
}

const styles = {
  container: { maxWidth: '720px', margin: '30px auto', padding: '0 20px' },
  panel: { background: '#ffffff', border: '1px solid #d7e1e9', borderRadius: '8px', padding: '28px' },
  title: { margin: '0 0 8px', color: '#17324d', fontSize: '24px' },
  subtitle: { margin: '0 0 24px', color: '#52657a', fontSize: '14px' },
  form: { display: 'grid', gap: '16px', maxWidth: '460px' },
  field: { display: 'grid', gap: '7px', color: '#283b4d', fontSize: '14px', fontWeight: 600 },
  input: { boxSizing: 'border-box', width: '100%', padding: '10px 12px', border: '1px solid #b9c7d3', borderRadius: '4px', font: 'inherit' },
  button: { justifySelf: 'start', padding: '10px 16px', border: '0', borderRadius: '4px', background: '#176b63', color: '#ffffff', fontSize: '14px', fontWeight: 700, cursor: 'pointer' },
  error: { marginBottom: '16px', padding: '10px 12px', background: '#fff0f0', color: '#a12a2a', borderRadius: '4px' },
  notice: { marginBottom: '16px', padding: '10px 12px', background: '#edf8f2', color: '#24633e', borderRadius: '4px' }
};