import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../App'; // Imports global auth state

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Do not render navbar if user is not authenticated
  if (!user) return null;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const links = [{ to: '/dashboard', label: 'Dashboard' }];
  if (['APPLICANT', 'RECOMMENDER', 'ADMIN'].includes(user.role)) {
    links.push(
      { to: '/create-request', label: 'New Transport Request' },
      { to: '/create-authority', label: 'Authority to Travel' }
    );
  }
  if (user.role === 'ADMIN') links.push({ to: '/admin/users', label: 'Staff Accounts' });

  const roleColor = {
    ADMIN: '#6d45a6',
    RECOMMENDER: '#147d70',
    APPROVER: '#2468a5',
    APPLICANT: '#34765c'
  }[user.role] || '#52657a';

  return (
    <header style={styles.header}>
      <div style={styles.container}>
        <Link to="/dashboard" style={styles.brandLink}>
          PDHO Transport &Travel Authority management System
        </Link>
        <div style={styles.navigationRow}>
          <nav aria-label="Main navigation" style={styles.nav}>
            {links.map(({ to, label }) => {
              const active = location.pathname === to;
              return (
                <Link
                  key={to}
                  to={to}
                  aria-current={active ? 'page' : undefined}
                  style={{
                    ...styles.navLink,
                    ...(active ? styles.activeNavLink : {})
                  }}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
          <div style={styles.accountActions}>
            <div style={styles.userInfo}>
              <span style={styles.userName}>{user.full_name}</span>
              <span style={{ ...styles.roleBadge, backgroundColor: roleColor }}>
                {user.role}
              </span>
            </div>
            <button onClick={handleLogout} style={styles.logoutBtn}>
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

// Basic inline styling for instant presentation
const styles = {
  header: { backgroundColor: '#eaf3fc', padding: '18px 22px 14px', borderBottom: '1px solid #cfe0f2', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
  container: { maxWidth: '1240px', margin: '0 auto' },
  brandLink: { display: 'block', color: '#17164f', fontSize: '26px', fontWeight: 750, textAlign: 'center', textDecoration: 'none', marginBottom: '16px' },
  navigationRow: { display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: '12px' },
  nav: { display: 'flex', flex: '1 1 650px', flexWrap: 'wrap', justifyContent: 'center', gap: '9px' },
  navLink: { flex: '1 1 145px', maxWidth: '200px', boxSizing: 'border-box', padding: '8px 16px', border: '1px solid #168bf4', borderRadius: '999px', backgroundColor: '#ffffff', color: '#17164f', textAlign: 'center', textDecoration: 'none', fontSize: '14px', fontWeight: 500, whiteSpace: 'nowrap' },
  activeNavLink: { backgroundColor: '#168bf4', color: '#ffffff', fontWeight: 700 },
  accountActions: { display: 'flex', flex: '0 1 auto', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: '12px' },
  userInfo: { display: 'flex', alignItems: 'center', gap: '8px' },
  userName: { color: '#25264a', fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap' },
  roleBadge: { padding: '4px 9px', borderRadius: '999px', color: '#ffffff', fontSize: '10px', fontWeight: 700, whiteSpace: 'nowrap' },
  logoutBtn: { padding: '7px 12px', border: '1px solid #d56b6b', borderRadius: '999px', backgroundColor: '#ffffff', color: '#a33a46', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }
};