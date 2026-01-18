import React from 'react';
import styles from '../styles/Sidebar.module.css';
import { Link, useLocation } from 'react-router-dom';

const Sidebar: React.FC = () => {
  const location = useLocation();
  return (
    <aside className={styles.sidebar}>
      <nav>
        <ul>
          <li>
            <Link to="/" className={location.pathname === '/' ? styles.active : ''}>Dashboard</Link>
          </li>
          <li>
            <Link to="/projects" className={location.pathname.startsWith('/projects') ? styles.active : ''}>Projects</Link>
          </li>
          <li>
            <Link to="/settings" className={location.pathname === '/settings' ? styles.active : ''}>Settings</Link>
          </li>
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;
