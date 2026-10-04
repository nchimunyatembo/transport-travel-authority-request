import React, { useEffect, useState } from 'react';
import api from '../utils/api';

const initialForm = {
  full_name: '',
  email: '',
  role: 'APPLICANT',
  password: ''
};

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [resetPasswords, setResetPasswords] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadUsers = async () => {
    try {
      const response = await api.get('/auth/users');
      setUsers(response.data.users || []);
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not load staff accounts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreate = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await api.post('/auth/register', form);
      setForm(initialForm);
      setNotice('Staff account created and approved for login.');
      await loadUsers();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not create staff account.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async (userId) => {
    const password = resetPasswords[userId] || '';
    if (password.length < 8) {
      setError('A new password must be at least 8 characters long.');
      return;
    }

    setSaving(true);
    setError('');
    setNotice('');
    try {
      await api.patch(`/auth/users/${userId}/password`, { password });
      setResetPasswords((current) => ({ ...current, [userId]: '' }));
      setNotice('Password reset successfully.');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not reset password.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Staff Accounts</h1>
          <p style={styles.subtitle}>Create staff logins and reset passwords.</p>
        </div>
      </header>

      {error && <div role="alert" style={styles.error}>{error}</div>}
      {notice && <div role="status" style={styles.notice}>{notice}</div>}

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Create Staff Login</h2>
        <form onSubmit={handleCreate} style={styles.form}>
          <label style={styles.field}>
            Full name
            <input
              required
              maxLength="50"
              value={form.full_name}
              onChange={(event) => setForm({ ...form, full_name: event.target.value })}
              style={styles.input}
            />
          </label>
          <label style={styles.field}>
            Email address
            <input
              required
              type="email"
              maxLength="50"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              style={styles.input}
            />
          </label>
          <label style={styles.field}>
            Role
            <select
              value={form.role}
              onChange={(event) => setForm({ ...form, role: event.target.value })}
              style={styles.input}
            >
              <option value="APPLICANT">Staff</option>
              <option value="RECOMMENDER">Recommender</option>
              <option value="APPROVER">Approver</option>
              <option value="ADMIN">Administrator</option>
            </select>
          </label>
          <label style={styles.field}>
            Temporary password
            <input
              required
              type="password"
              minLength="8"
              maxLength="72"
              autoComplete="new-password"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              style={styles.input}
            />
          </label>
          <button type="submit" disabled={saving} style={styles.primaryButton}>
            {saving ? 'Saving...' : 'Create Account'}
          </button>
        </form>
      </section>

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Existing Staff</h2>
        {loading ? (
          <p>Loading accounts...</p>
        ) : (
          <div style={styles.tableScroll}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.headingCell}>Name</th>
                  <th style={styles.headingCell}>Email</th>
                  <th style={styles.headingCell}>Role</th>
                  <th style={styles.headingCell}>Account</th>
                  <th style={styles.headingCell}>Reset password</th>
                </tr>
              </thead>
              <tbody>
                {users.map((staff) => (
                  <tr key={staff.id}>
                    <td style={styles.cell}>{staff.full_name}</td>
                    <td style={styles.cell}>{staff.email}</td>
                    <td style={styles.cell}>{staff.role}</td>
                    <td style={styles.cell}>{staff.approval_status}</td>
                    <td style={styles.cell}>
                      <div style={styles.resetForm}>
                        <input
                          type="password"
                          minLength="8"
                          maxLength="72"
                          autoComplete="new-password"
                          aria-label={`New password for ${staff.full_name}`}
                          value={resetPasswords[staff.id] || ''}
                          onChange={(event) => setResetPasswords({
                            ...resetPasswords,
                            [staff.id]: event.target.value
                          })}
                          style={styles.resetInput}
                        />
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => handleReset(staff.id)}
                          style={styles.secondaryButton}
                        >
                          Reset
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

const styles = {
  container: { maxWidth: '1100px', margin: '30px auto', padding: '0 20px', fontFamily: 'system-ui, sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
  title: { margin: 0, color: '#0f172a', fontSize: '24px' },
  subtitle: { margin: '6px 0 0', color: '#64748b', fontSize: '14px' },
  section: { marginTop: '28px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' },
  sectionTitle: { margin: '0 0 16px', fontSize: '17px', color: '#1e293b' },
  form: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', alignItems: 'end', gap: '14px' },
  field: { display: 'grid', gap: '6px', color: '#475569', fontSize: '13px', fontWeight: 600 },
  input: { boxSizing: 'border-box', width: '100%', minWidth: 0, padding: '9px 10px', border: '1px solid #cbd5e1', borderRadius: '5px', fontSize: '14px' },
  primaryButton: { padding: '10px 14px', border: 0, borderRadius: '5px', background: '#146356', color: 'white', fontWeight: 600, cursor: 'pointer' },
  secondaryButton: { padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '5px', background: 'white', color: '#334155', cursor: 'pointer' },
  error: { padding: '10px 12px', marginBottom: '12px', border: '1px solid #fecaca', borderRadius: '5px', background: '#fef2f2', color: '#991b1b' },
  notice: { padding: '10px 12px', marginBottom: '12px', border: '1px solid #a7f3d0', borderRadius: '5px', background: '#ecfdf5', color: '#065f46' },
  tableScroll: { width: '100%', overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' },
  headingCell: { padding: '10px 8px', borderBottom: '2px solid #cbd5e1', color: '#475569', whiteSpace: 'nowrap' },
  cell: { padding: '10px 8px', borderBottom: '1px solid #e2e8f0', color: '#334155' },
  resetForm: { display: 'flex', gap: '6px', minWidth: '230px' },
  resetInput: { boxSizing: 'border-box', width: '150px', padding: '7px 8px', border: '1px solid #cbd5e1', borderRadius: '5px' }
};