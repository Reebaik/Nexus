

import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import styles from '../styles/Navbar.module.css';

const isLoggedIn = () => {
  return !!localStorage.getItem('nexus_jwt');
};

const Navbar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('nexus_jwt');
    navigate('/login');
  };

  return (
    <nav className={styles.navbar}>
      <div className={styles.logo}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '8px', verticalAlign: 'middle' }}>
          <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="url(#paint0_linear)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M2 17L12 22L22 17" stroke="url(#paint1_linear)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M2 12L12 17L22 12" stroke="url(#paint2_linear)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <defs>
            <linearGradient id="paint0_linear" x1="2" y1="2" x2="22" y2="12" gradientUnits="userSpaceOnUse">
              <stop stopColor="#0072ff"/>
              <stop offset="1" stopColor="#ff0080"/>
            </linearGradient>
            <linearGradient id="paint1_linear" x1="2" y1="17" x2="22" y2="22" gradientUnits="userSpaceOnUse">
              <stop stopColor="#0072ff"/>
              <stop offset="1" stopColor="#ff0080"/>
            </linearGradient>
            <linearGradient id="paint2_linear" x1="2" y1="12" x2="22" y2="17" gradientUnits="userSpaceOnUse">
              <stop stopColor="#0072ff"/>
              <stop offset="1" stopColor="#ff0080"/>
            </linearGradient>
          </defs>
        </svg>
        Nexus
      </div>
      <div className={styles.links}>
        {/* Home link: hide on home page */}
        {location.pathname !== '/' && (
          <Link to="/" className={location.pathname === '/' ? styles.active : ''}>Home</Link>
        )}
        {/* Projects link: show only if logged in */}
        {isLoggedIn() && (
          <Link to="/projects" className={location.pathname.startsWith('/projects') ? styles.active : ''}>My Projects</Link>
        )}
        {/* Login/Logout logic */}
        {!isLoggedIn() && location.pathname !== '/login' && (
          <Link to="/login" className={location.pathname === '/login' ? styles.active : ''}>Login</Link>
        )}
        {isLoggedIn() && (
          <button onClick={handleLogout} className={styles.logoutBtn}>
            Logout
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '8px' }}>
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
          </button>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
