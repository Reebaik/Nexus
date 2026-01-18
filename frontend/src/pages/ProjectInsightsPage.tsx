import React from 'react';
import styles from '../styles/ProjectOverviewPage.module.css';

const ProjectInsightsPage: React.FC = () => {
  return (
    <section>
      <h1>Insights & Assistance</h1>
      <p className={styles.lead}>
        Understand what's happening — and what to do next.
      </p>

      <div className={styles.block}>
        <h3>AI Summary</h3>
        <p>
          Automatic project summaries, planning suggestions, and execution
          insights will appear here.
        </p>
      </div>
    </section>
  );
};

export default ProjectInsightsPage;
