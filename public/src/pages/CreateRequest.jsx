import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import api from '../utils/api';
import FileUploader from '../components/FileUploader';
import SignaturePad from '../components/SignaturePad';

export default function CreateRequest({ requestToEdit = null }) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [formData, setFormData] = useState(() => ({
    duty_station: requestToEdit?.duty_station || '',
    cell_number: requestToEdit?.cell_number || '',
    nature_of_duty: requestToEdit?.nature_of_duty || '',
    responsible_officer: requestToEdit?.responsible_officer || '',
    other_officers: [
      ...(Array.isArray(requestToEdit?.other_officers) ? requestToEdit.other_officers : []),
      '', '', '', '', ''
    ].slice(0, 5),
    destination: requestToEdit?.destination || '',
    departure_date: requestToEdit?.departure_date || '',
    return_date: requestToEdit?.return_date || '',
  }));

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [files, setFiles] = useState([]);
  const [signature, setSignature] = useState(null);

  // Handle form field changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleOtherOfficerChange = (index, value) => {
    setFormData((current) => ({
      ...current,
      other_officers: current.other_officers.map((officer, officerIndex) =>
        officerIndex === index ? value : officer
      )
    }));
  };

  const programDuration = (() => {
    if (!formData.departure_date || !formData.return_date) return '';
    const departure = new Date(`${formData.departure_date}T00:00:00`);
    const returnDate = new Date(`${formData.return_date}T00:00:00`);
    const days = Math.round((returnDate - departure) / 86400000) + 1;
    if (!Number.isFinite(days) || days < 1) return '';
    return `${days} day${days === 1 ? '' : 's'}`;
  })();

  // Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (new Date(formData.return_date) < new Date(formData.departure_date)) {
      setError('The end date cannot be earlier than the start date.');
      return;
    }
    if (!signature && !requestToEdit?.applicant_signature) {
      setError('Add and confirm the applicant signature before submitting.');
      return;
    }
    if (files.length === 0 && !requestToEdit?.attachments?.length) {
      setError('Attach at least one required supporting document before submitting.');
      return;
    }

    setLoading(true);

    try {
      const requestData = new FormData();
      const otherOfficers = formData.other_officers.map((officer) => officer.trim()).filter(Boolean);
      const fields = {
        application_type: 'transport',
        ...formData,
        program_duration: programDuration,
        other_officers: JSON.stringify(otherOfficers),
        purpose: formData.nature_of_duty,
        passenger_count: 1 + otherOfficers.filter(Boolean).length,
        vehicle_type: 'Not assigned'
      };
      if (signature) fields.applicant_signature = signature;
      Object.entries(fields).forEach(([key, value]) => requestData.append(key, value));
      files.forEach((file) => requestData.append('attachments', file));
      const response = requestToEdit
        ? await api.put(`/requests/${requestToEdit.id}`, requestData)
        : await api.post('/requests', requestData);

      if (response.status === 201 || response.status === 200) {
        alert(requestToEdit ? 'Transport application updated.' : 'Transport request created successfully!');
        navigate(requestToEdit ? `/requests/${requestToEdit.id}` : '/dashboard');
      }
    } catch (err) {
      setError(
        err.response?.data?.message || 'Failed to submit transport request. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h2 style={styles.title}>{requestToEdit ? 'Edit Transport Application' : 'Transport Application Form'}</h2>
          <p style={styles.subtitle}>Petauke Town Council · Department of Health Services</p>
        </div>

        {error && <div style={styles.errorAlert}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.row}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Name of applicant</label>
              <input value={user?.full_name || ''} readOnly style={styles.input} />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Duty station *</label>
              <input name="duty_station" value={formData.duty_station} onChange={handleChange} required style={styles.input} />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Cell number *</label>
              <input type="tel" name="cell_number" value={formData.cell_number} onChange={handleChange} required style={styles.input} />
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Nature of duty / request *</label>
            <textarea name="nature_of_duty" value={formData.nature_of_duty} onChange={handleChange} rows="3" required style={styles.textarea} />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Responsible officer during the journey *</label>
            <input name="responsible_officer" value={formData.responsible_officer} onChange={handleChange} required style={styles.input} />
          </div>

          <section style={styles.section}>
            <h3 style={styles.sectionTitle}>Other officers on the program</h3>
            <div style={styles.officersGrid}>
              {formData.other_officers.map((officer, index) => (
                <div style={styles.formGroup} key={index}>
                  <label style={styles.label}>Officer {index + 6}</label>
                  <input value={officer} onChange={(event) => handleOtherOfficerChange(index, event.target.value)} style={styles.input} />
                </div>
              ))}
            </div>
          </section>

          <div style={styles.row}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Required from · date *</label>
              <input type="date" name="departure_date" value={formData.departure_date} onChange={handleChange} required style={styles.input} />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>To · date *</label>
              <input type="date" name="return_date" value={formData.return_date} onChange={handleChange} required style={styles.input} />
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Route(s) to be taken / destination *</label>
            <textarea name="destination" value={formData.destination} onChange={handleChange} rows="2" required style={styles.textarea} />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Duration of the program(s) *</label>
            <input value={programDuration} readOnly required style={styles.input} />
          </div>

          {requestToEdit?.attachments?.length > 0 && (
            <div style={styles.existingFiles}>
              Existing documents are retained unless you add more: {requestToEdit.attachments.map((file) => file.file_name).join(', ')}
            </div>
          )}

          <SignaturePad
            label={requestToEdit ? 'Replace applicant signature (optional)' : 'Signature of applicant *'}
            onSignatureSave={setSignature}
          />

          {/* Action Buttons */}
          <div style={styles.buttonRow}>
            <button
              type="button"
              onClick={() => navigate(requestToEdit ? `/requests/${requestToEdit.id}` : '/dashboard')}
              style={styles.cancelBtn}
            >
              Cancel
            </button>
            <FileUploader
              onFilesSelected={setFiles}
              required={!requestToEdit?.attachments?.length}
            />
            <button
              type="submit"
              disabled={loading}
              style={{
                ...styles.submitBtn,
                opacity: loading ? 0.7 : 1,
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'Saving...' : requestToEdit ? 'Save Changes' : 'Submit Transport Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Inline styles for rapid setup
const styles = {
  container: {
    maxWidth: '700px',
    margin: '30px auto',
    padding: '0 16px'
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '10px',
    padding: '24px 32px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
  },
  header: {
    marginBottom: '20px',
    borderBottom: '1px solid #f1f5f9',
    paddingBottom: '12px'
  },
  title: {
    margin: '0 0 6px 0',
    color: '#0f172a',
    fontSize: '22px'
  },
  subtitle: {
    margin: 0,
    color: '#64748b',
    fontSize: '14px'
  },
  errorAlert: {
    backgroundColor: '#fef2f2',
    color: '#991b1b',
    border: '1px solid #fecaca',
    borderRadius: '6px',
    padding: '10px 14px',
    fontSize: '13px',
    marginBottom: '16px'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    flex: 1
  },
  row: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '16px'
  },
  section: {
    paddingTop: '14px',
    borderTop: '1px solid #e2e8f0'
  },
  sectionTitle: {
    margin: '0 0 12px',
    color: '#334155',
    fontSize: '14px'
  },
  existingFiles: {
    color: '#475569',
    fontSize: '13px',
    lineHeight: 1.5
  },
  officersGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '12px'
  },
  label: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#334155'
  },
  input: {
    padding: '10px 12px',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
    width: '100%'
  },
  select: {
    padding: '10px 12px',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    fontSize: '14px',
    backgroundColor: '#ffffff',
    outline: 'none',
    width: '100%'
  },
  textarea: {
    padding: '10px 12px',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    fontSize: '14px',
    fontFamily: 'inherit',
    outline: 'none',
    resize: 'vertical',
    width: '100%'
  },
  buttonRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '12px',
    marginTop: '12px',
    paddingTop: '16px',
    borderTop: '1px solid #f1f5f9'
  },
  cancelBtn: {
    backgroundColor: '#f1f5f9',
    color: '#475569',
    border: '1px solid #cbd5e1',
    padding: '10px 18px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  submitBtn: {
    backgroundColor: '#2563eb',
    color: '#ffffff',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600'
  }
};