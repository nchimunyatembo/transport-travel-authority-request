import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import FileUploader from '../components/FileUploader';
import SignaturePad from '../components/SignaturePad';
import api from '../utils/api';

const today = new Date().toISOString().slice(0, 10);

export default function CreateAuthority({ requestToEdit = null }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(() => ({
    file_number: requestToEdit?.file_number || '',
    officer_title: requestToEdit?.officer_title || '',
    application_date: requestToEdit?.application_date || today,
    leave_date: requestToEdit?.leave_date || '',
    reporting_date: requestToEdit?.reporting_date || '',
    reason: requestToEdit?.reason || '',
    acting_officer_name: requestToEdit?.acting_officer_name || '',
    acting_officer_title: requestToEdit?.acting_officer_title || '',
    acting_officer_contact: requestToEdit?.acting_officer_contact || ''
  }));
  const [files, setFiles] = useState([]);
  const [signature, setSignature] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const numberOfDays = form.leave_date && form.reporting_date
    ? Math.max(1, Math.ceil((new Date(`${form.reporting_date}T00:00:00`) - new Date(`${form.leave_date}T00:00:00`)) / 86400000) + 1)
    : '';

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (new Date(form.reporting_date) < new Date(form.leave_date)) {
      setError('Reporting date cannot be earlier than the leave date.');
      return;
    }
    if (!signature && !requestToEdit?.applicant_signature) {
      setError('Add and confirm your applicant signature before submitting.');
      return;
    }

    setLoading(true);
    try {
      const data = new FormData();
      const fields = {
        application_type: 'duty travel',
        officer_name: user.full_name,
        file_number: form.file_number,
        officer_title: form.officer_title,
        application_date: form.application_date,
        leave_date: form.leave_date,
        reporting_date: form.reporting_date,
        number_of_days: numberOfDays,
        reason: form.reason,
        purpose: form.reason,
        acting_officer_name: form.acting_officer_name,
        acting_officer_title: form.acting_officer_title,
        acting_officer_contact: form.acting_officer_contact
      };
      if (signature) fields.applicant_signature = signature;
      Object.entries(fields).forEach(([key, value]) => data.append(key, value));
      files.forEach((file) => data.append('attachments', file));
      if (requestToEdit) await api.put(`/requests/${requestToEdit.id}`, data);
      else await api.post('/requests', data);
      navigate(requestToEdit ? `/requests/${requestToEdit.id}` : '/dashboard');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not submit the Authority to Travel application.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <form onSubmit={handleSubmit} style={styles.form}>
        <header style={styles.header}>
          <div style={styles.council}>PETAUKE TOWN COUNCIL · DEPARTMENT OF HEALTH SERVICES</div>
          <h1 style={styles.title}>{requestToEdit ? 'Edit Authority to Travel' : 'Authority to Travel on Duty'}</h1>
          <p style={styles.subtitle}>To be completed by the applying officer</p>
        </header>

        {error && <div role="alert" style={styles.error}>{error}</div>}

        <div style={styles.grid}>
          <Field label="Name of officer" value={user?.full_name || ''} readOnly />
          <Field label="File number" name="file_number" value={form.file_number} onChange={handleChange} required />
          <Field label="Title of officer" name="officer_title" value={form.officer_title} onChange={handleChange} required />
          <Field label="Application date" name="application_date" type="date" value={form.application_date} onChange={handleChange} required />
          <Field label="Date to leave station" name="leave_date" type="date" value={form.leave_date} onChange={handleChange} required />
          <Field label="Date of reporting" name="reporting_date" type="date" value={form.reporting_date} onChange={handleChange} required />
          <Field label="Number of days" value={numberOfDays} readOnly />
        </div>

        <label style={styles.field}>
          Reason for travel (describe the activity to be taken) *
          <textarea name="reason" value={form.reason} onChange={handleChange} rows="4" required style={styles.input} />
        </label>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>IN MY ABSENCE, THE OFFICER MENTIONED BELOW WILL ACT FOR ADMININSTATIVE CONVENIENCE</h2>
          <div style={styles.grid}>
            <Field label="Name of officer" name="acting_officer_name" value={form.acting_officer_name} onChange={handleChange} />
            <Field label="Title of officer" name="acting_officer_title" value={form.acting_officer_title} onChange={handleChange} />
            <Field label="Contact number" name="acting_officer_contact" value={form.acting_officer_contact} onChange={handleChange} />
          </div>
        </section>

        {requestToEdit?.attachments?.length > 0 && (
          <div style={styles.existingFiles}>
            Existing documents are retained unless you add more: {requestToEdit.attachments.map((file) => file.file_name).join(', ')}
          </div>
        )}

        <SignaturePad
          label={requestToEdit ? 'Replace applicant signature (optional)' : 'Signature of applying officer *'}
          onSignatureSave={setSignature}
        />

        <div style={styles.actions}>
          <button
            type="button"
            onClick={() => navigate(requestToEdit ? `/requests/${requestToEdit.id}` : '/dashboard')}
            style={styles.cancel}
          >
            Cancel
          </button>
          <FileUploader onFilesSelected={setFiles} />
          <button type="submit" disabled={loading} style={styles.submit}>
            {loading ? 'Saving...' : requestToEdit ? 'Save Changes' : 'Submit Authority to Travel'}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, readOnly = false, ...inputProps }) {
  return (
    <label style={styles.field}>
      {label}{inputProps.required ? ' *' : ''}
      <input {...inputProps} readOnly={readOnly} style={styles.input} />
    </label>
  );
}

const styles = {
  container: { maxWidth: '850px', margin: '28px auto', padding: '0 16px', fontFamily: 'system-ui, sans-serif' },
  form: { display: 'grid', gap: '18px', background: '#fff', padding: '28px', border: '1px solid #dbe3e8', borderTop: '5px solid #146356' },
  header: { textAlign: 'center', paddingBottom: '16px', borderBottom: '1px solid #dbe3e8' },
  council: { color: '#146356', fontSize: '11px', fontWeight: 700 },
  title: { margin: '8px 0', color: '#102a27', fontSize: '23px', textTransform: 'uppercase' },
  subtitle: { margin: 0, color: '#64748b', fontSize: '13px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '14px' },
  field: { display: 'grid', gap: '6px', color: '#334155', fontSize: '13px', fontWeight: 600 },
  input: { boxSizing: 'border-box', width: '100%', minWidth: 0, padding: '10px 11px', border: '1px solid #cbd5e1', borderRadius: '5px', font: 'inherit', fontWeight: 400 },
  section: { paddingTop: '16px', borderTop: '1px solid #dbe3e8' },
  sectionTitle: { margin: '0 0 14px', color: '#1e293b', fontSize: '15px' },
  actions: { display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '12px', paddingTop: '14px', borderTop: '1px solid #dbe3e8' },
  cancel: { padding: '10px 16px', border: '1px solid #cbd5e1', borderRadius: '5px', background: '#f8fafc', color: '#334155', cursor: 'pointer' },
  submit: { padding: '10px 16px', border: 0, borderRadius: '5px', background: '#146356', color: '#fff', fontWeight: 700, cursor: 'pointer' },
  error: { padding: '10px 12px', border: '1px solid #fecaca', borderRadius: '5px', background: '#fef2f2', color: '#991b1b', fontSize: '13px' }
  ,existingFiles: { color: '#475569', fontSize: '13px', lineHeight: 1.5 }
};