import React from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * RequestCard Component
 * Displays a summary card for a single transport request.
 * 
 * @param {Object} request - The transport request object containing details
 * @param {string} currentUserRole - Role of logged-in user ('APPLICANT', 'APPROVER', 'ADMIN')
 */
export default function RequestCard({ request, currentUserRole }) {
  const navigate = useNavigate();

  // Helper function to format ISO date strings
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  // Status badge styling helper
  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case 'APPROVED':
        return { backgroundColor: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0' };
      case 'REJECTED':
        return { backgroundColor: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5' };
      case 'PENDING':
      default:
        return { backgroundColor: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' };
    }
  };

  return (
    <div style={styles.card}>
      {/* Header: Reference Number & Status Badge */}
      <div style={styles.header}>
        <span style={styles.referenceNumber}>
          {request.reference_number || `TR-#${request.id}`}
        </span>
        <span style={{ ...styles.badge, ...getStatusBadgeStyle(request.status) }}>
          {request.status}
        </span>
      </div>

      {/* Body: Applicant & Trip Details */}
      <div style={styles.body}>
        <p style={styles.detailRow}>
          <strong>Application:</strong>{' '}
          {request.application_type === 'duty travel' ? 'Authority to Travel' : 'Transport Request'}
        </p>

        {/* Show applicant info if manager/admin is viewing */}
        {request.applicant_name && (
          <p style={styles.detailRow}>
            <strong>Applicant:</strong> {request.applicant_name}
            {request.applicant_department ? ` (${request.applicant_department})` : ''}
          </p>
        )}

        <p style={styles.detailRow}>
          <strong>Destination:</strong> {request.destination}
        </p>

        <p style={styles.detailRow}>
          <strong>Travel Period:</strong> {formatDate(request.departure_date)} – {formatDate(request.return_date)}
        </p>

        <p style={styles.detailRow}>
          <strong>Vehicle Type:</strong> {request.vehicle_type || 'Standard'}
        </p>

        <p style={{ ...styles.detailRow, ...styles.purposeText }}>
          <strong>Purpose:</strong> {request.purpose}
        </p>
      </div>

      {/* Footer: Action Button */}
      <div style={styles.footer}>
        <button
          onClick={() => navigate(`/requests/${request.id}`)}
          style={{
            ...styles.actionBtn,
            backgroundColor: currentUserRole === 'RECOMMENDER' && request.status === 'PENDING' &&
              request.application_type === 'transport' && !request.recommended_by
              ? '#0f766e'
              : ['APPROVER', 'ADMIN'].includes(currentUserRole) && request.status === 'PENDING' &&
                (request.application_type !== 'transport' || request.recommended_by)
              ? '#2563eb'
              : '#475569'
          }}
        >
          {currentUserRole === 'RECOMMENDER' && request.status === 'PENDING' &&
          request.application_type === 'transport' && !request.recommended_by
            ? 'Recommend'
            : ['APPROVER', 'ADMIN'].includes(currentUserRole) && request.status === 'PENDING' &&
              (request.application_type !== 'transport' || request.recommended_by)
            ? 'Review & Decide'
            : 'View Details'}
        </button>
      </div>
    </div>
  );
}

// Inline styles for rapid implementation
const styles = {
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    padding: '16px',
    marginBottom: '16px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    transition: 'box-shadow 0.2s ease-in-out'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #f1f5f9',
    paddingBottom: '10px',
    marginBottom: '12px'
  },
  referenceNumber: {
    fontSize: '15px',
    fontWeight: 'bold',
    color: '#0f172a'
  },
  badge: {
    fontSize: '11px',
    fontWeight: 'bold',
    padding: '3px 10px',
    borderRadius: '12px',
    textTransform: 'uppercase'
  },
  body: {
    fontSize: '13px',
    color: '#334155',
    lineHeight: '1.6'
  },
  detailRow: {
    margin: '4px 0'
  },
  purposeText: {
    color: '#64748b',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  footer: {
    marginTop: '16px',
    borderTop: '1px solid #f1f5f9',
    paddingTop: '12px',
    display: 'flex',
    justifyContent: 'flex-end'
  },
  actionBtn: {
    color: '#ffffff',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'opacity 0.2s'
  }
};