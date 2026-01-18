

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
      <div className={styles.logo}>Nexus</div>
      <div className={styles.links}>
        {/* Home link: hide on home page */}
        {location.pathname !== '/' && (
          <Link to="/" className={location.pathname === '/' ? styles.active : ''}>Home</Link>
        )}
        {/* Projects link: always show */}
        <Link to="/projects" className={location.pathname.startsWith('/projects') ? styles.active : ''}>My Projects</Link>
        {/* Login/Logout logic */}
        {!isLoggedIn() && location.pathname !== '/login' && (
          <Link to="/login" className={location.pathname === '/login' ? styles.active : ''}>Login</Link>
        )}
        {isLoggedIn() && (
          <button onClick={handleLogout} className={styles.logoutBtn}>Logout</button>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
