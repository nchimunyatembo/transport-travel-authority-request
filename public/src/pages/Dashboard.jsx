import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import RequestCard from '../components/RequestCard';
import { useAuth } from '../App';
import api from '../utils/api';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch transport requests from backend
  useEffect(() => {
    const fetchRequests = async () => {
      try {
        setLoading(true);
        const response = await api.get('/requests');
        setRequests(response.data.requests || []);
      } catch (err) {
        setError('Failed to fetch requests. Please check your connection or login status.');
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, []);

  // Filter requests based on tab selection & search input
  const filteredRequests = requests.filter((req) => {
    const matchesTab = activeTab === 'ALL' || req.status === activeTab;
    const matchesSearch =
      req.destination?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.purpose?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.applicant_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (req.reference_number && req.reference_number.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesTab && matchesSearch;
  });

  // Calculate summary metrics
  const totalCount = requests.length;
  const pendingCount = requests.filter((r) => r.status === 'PENDING').length;
  const approvedCount = requests.filter((r) => r.status === 'APPROVED').length;
  const rejectedCount = requests.filter((r) => r.status === 'REJECTED').length;

  return (
    <div style={styles.container}>
      {/* Top Banner & Header */}
      <div style={styles.headerRow}>
        <div>
          <h1 style={styles.heading}>
            Welcome, {user?.full_name || 'User'}
          </h1>
          <p style={styles.subheading}>
            {user?.role === 'RECOMMENDER'
              ? 'Review and recommend pending transport applications.'
              : user?.role === 'APPROVER'
              ? 'Review, track, and authorize transport & travel requests.'
              : user?.role === 'ADMIN'
              ? 'Manage district-wide transport requests, fleet routing, and authorizations.'
              : 'Submit and track your transport & duty travel applications.'}
          </p>
        </div>

        {(['APPLICANT', 'RECOMMENDER', 'ADMIN'].includes(user?.role)) && (
          <div style={styles.actionButtons}>
            <button onClick={() => navigate('/create-request')} style={styles.newRequestBtn}>
              + Transport Request
            </button>
            <button onClick={() => navigate('/create-authority')} style={styles.authorityBtn}>
              + Authority to Travel
            </button>
          </div>
        )}
      </div>

      {/* Summary Metrics Grid */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <span style={styles.statLabel}>Total Requests</span>
          <span style={styles.statValue}>{totalCount}</span>
        </div>
        <div style={{ ...styles.statCard, borderLeft: '4px solid #f59e0b' }}>
          <span style={styles.statLabel}>Pending Review</span>
          <span style={{ ...styles.statValue, color: '#d97706' }}>{pendingCount}</span>
        </div>
        <div style={{ ...styles.statCard, borderLeft: '4px solid #10b981' }}>
          <span style={styles.statLabel}>Approved</span>
          <span style={{ ...styles.statValue, color: '#059669' }}>{approvedCount}</span>
        </div>
        <div style={{ ...styles.statCard, borderLeft: '4px solid #ef4444' }}>
          <span style={styles.statLabel}>Rejected</span>
          <span style={{ ...styles.statValue, color: '#dc2626' }}>{rejectedCount}</span>
        </div>
      </div>

      {/* Filter Tabs & Search Bar Row */}
      <div style={styles.controlsRow}>
        {/* Status Filter Tabs */}
        <div style={styles.tabsGroup}>
          {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                ...styles.tabBtn,
                backgroundColor: activeTab === tab ? '#2563eb' : '#f1f5f9',
                color: activeTab === tab ? '#ffffff' : '#475569',
                fontWeight: activeTab === tab ? 'bold' : '500'
              }}
            >
              {tab.charAt(0) + tab.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <input
          type="text"
          placeholder="Search by destination, purpose, applicant..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={styles.searchInput}
        />
      </div>

      {/* Main Request Feed */}
      {loading ? (
        <div style={styles.centerMessage}>Loading transport requests...</div>
      ) : error ? (
        <div style={styles.errorAlert}>{error}</div>
      ) : filteredRequests.length === 0 ? (
        <div style={styles.emptyBox}>
          <p style={styles.emptyText}>No transport requests found matching criteria.</p>
          {(user?.role === 'APPLICANT' || user?.role === 'ADMIN') && (
            <button
              onClick={() => navigate('/create-request')}
              style={styles.emptyBtn}
            >
              Create New Request
            </button>
          )}
        </div>
      ) : (
        <div style={styles.requestsGrid}>
          {filteredRequests.map((request) => (
            <RequestCard
              key={request.id}
              request={request}
              currentUserRole={user?.role}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Inline Styles
const styles = {
  container: {
    maxWidth: '1100px',
    margin: '30px auto',
    padding: '0 20px',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px'
  },
  heading: {
    margin: '0 0 4px 0',
    fontSize: '24px',
    color: '#0f172a'
  },
  subheading: {
    margin: 0,
    fontSize: '14px',
    color: '#64748b'
  },
  newRequestBtn: {
    backgroundColor: '#2563eb',
    color: '#ffffff',
    border: 'none',
    padding: '10px 18px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)'
  },
  actionButtons: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    justifyContent: 'flex-end'
  },
  authorityBtn: {
    backgroundColor: '#146356',
    color: '#ffffff',
    border: 'none',
    padding: '10px 18px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '28px'
  },
  statCard: {
    backgroundColor: '#ffffff',
    padding: '18px 20px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
  },
  statLabel: {
    fontSize: '13px',
    color: '#64748b',
    fontWeight: '500',
    marginBottom: '6px'
  },
  statValue: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#0f172a'
  },
  controlsRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '12px',
    marginBottom: '20px'
  },
  tabsGroup: {
    display: 'flex',
    gap: '8px'
  },
  tabBtn: {
    border: 'none',
    padding: '8px 16px',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  searchInput: {
    padding: '8px 14px',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    fontSize: '13px',
    minWidth: '280px',
    outline: 'none'
  },
  requestsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '16px'
  },
  centerMessage: {
    textAlign: 'center',
    padding: '40px',
    color: '#64748b',
    fontSize: '15px'
  },
  errorAlert: {
    backgroundColor: '#fef2f2',
    color: '#991b1b',
    padding: '12px 16px',
    borderRadius: '6px',
    border: '1px solid #fecaca',
    fontSize: '14px'
  },
  emptyBox: {
    backgroundColor: '#ffffff',
    padding: '40px',
    textAlign: 'center',
    borderRadius: '8px',
    border: '1px solid #e2e8f0'
  },
  emptyText: {
    color: '#64748b',
    marginBottom: '16px',
    fontSize: '15px'
  },
  emptyBtn: {
    backgroundColor: '#2563eb',
    color: '#ffffff',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 'bold',
    cursor: 'pointer'
  }
};