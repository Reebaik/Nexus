import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import styles from '../styles/HomePage.module.css';
import { useUser } from '../contexts/UserContext';
import { 
  RocketLaunch, 
  ViewKanban, 
  Timeline, 
  Group, 
  Insights, 
  Psychology,
  ArrowForward 
} from '@mui/icons-material';

const HomePage: React.FC = () => {
  const { user } = useUser();
  
  return (
    <div className={styles.root}>
      {/* Background Elements */}
      <div className={styles.bgWrapper}>
        <div className={styles.bgGradient} />
        <div className={styles.gridOverlay} />
      </div>

      {/* Hero Section */}
      <section className={styles.heroSection}>
        <motion.div 
          className={styles.heroContent}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <h1 className={styles.heroTitle}>
            Manage Projects with <br />
            <span className={styles.gradientText}>Intelligent Precision</span>
          </h1>
          <p className={styles.heroSubtitle}>
            The all-in-one workspace that bridges the gap between planning and execution. 
            Streamline workflows, track progress, and deliver results with Nexus.
          </p>
          
          <div className={styles.ctaGroup}>
            <Link to={user ? "/projects" : "/register"} className={styles.primaryBtn}>
              Get Started Free <ArrowForward style={{ marginLeft: 8, fontSize: 20 }} />
            </Link>
          </div>
        </motion.div>

        {/* 3D Dashboard Mockup */}
        <motion.div 
          className={styles.heroMockup}
          initial={{ opacity: 0, rotateX: 20, y: 50 }}
          animate={{ opacity: 1, rotateX: 10, y: 0 }}
          transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
        >
          <div className={styles.mockupContainer}>
            <div className={styles.mockHeader}>
              <div className={styles.mockDot} style={{ background: '#ff5f56' }} />
              <div className={styles.mockDot} style={{ background: '#ffbd2e' }} />
              <div className={styles.mockDot} style={{ background: '#27c93f' }} />
            </div>
            <div className={styles.mockBody}>
              <div className={styles.mockSidebar}>
                {/* Sidebar mock content */}
                <div style={{ padding: 20 }}>
                  <div style={{ height: 8, width: '60%', background: 'rgba(255,255,255,0.1)', borderRadius: 4, marginBottom: 20 }} />
                  <div style={{ height: 8, width: '80%', background: 'rgba(255,255,255,0.05)', borderRadius: 4, marginBottom: 12 }} />
                  <div style={{ height: 8, width: '80%', background: 'rgba(255,255,255,0.05)', borderRadius: 4, marginBottom: 12 }} />
                  <div style={{ height: 8, width: '80%', background: 'rgba(255,255,255,0.05)', borderRadius: 4, marginBottom: 12 }} />
                </div>
              </div>
              <div className={styles.mockContent}>
                <div className={styles.mockChart} />
                <div className={styles.mockGrid}>
                  <div className={styles.mockCard} />
                  <div className={styles.mockCard} />
                  <div className={styles.mockCard} />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className={styles.featuresSection}>
        <div className={styles.sectionHeader}>
          <motion.h2 
            className={styles.sectionTitle}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            Everything you need to succeed
          </motion.h2>
          <motion.p 
            className={styles.sectionSubtitle}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            Powerful tools integrated into a seamless workflow.
          </motion.p>
        </div>

        <div className={styles.featuresGrid}>
          <FeatureCard 
            icon={<RocketLaunch sx={{ fontSize: 32 }} />}
            title="Project Inception"
            desc="Define clear goals, scope, and success criteria before you start building. Align your team from day one."
            delay={0}
          />
          <FeatureCard 
            icon={<ViewKanban sx={{ fontSize: 32 }} />}
            title="Kanban Boards"
            desc="Visualize your workflow with flexible boards. Drag and drop tasks to keep momentum going."
            delay={0.1}
          />
          <FeatureCard 
            icon={<Timeline sx={{ fontSize: 32 }} />}
            title="Gantt Timelines"
            desc="Master your schedule with interactive Gantt charts. Manage dependencies and hit your milestones."
            delay={0.2}
          />
          <FeatureCard 
            icon={<Group sx={{ fontSize: 32 }} />}
            title="Team Collaboration"
            desc="Work together in real-time. Assign roles, share updates, and keep everyone on the same page."
            delay={0.3}
          />
          <FeatureCard 
            icon={<Insights sx={{ fontSize: 32 }} />}
            title="Real-time Analytics"
            desc="Track velocity, burn-down rates, and project health with automatic data visualization."
            delay={0.4}
          />
          <FeatureCard 
            icon={<Psychology sx={{ fontSize: 32 }} />}
            title="AI Insights"
            desc="Leverage machine learning to detect risks early and get smart suggestions for optimization."
            delay={0.5}
          />
        </div>
      </section>

      {/* Final CTA */}
      <section className={styles.finalCta}>
        <motion.div 
          className={styles.ctaCard}
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
        >
          <h2 className={styles.ctaTitle}>Ready to transform your workflow?</h2>
          <p className={styles.ctaText}>Join thousands of teams using Nexus to deliver better software, faster.</p>
          <Link to={user ? "/projects" : "/register"} className={styles.primaryBtn} style={{ fontSize: '1.2rem', padding: '18px 48px' }}>
            Create your project now
          </Link>
        </motion.div>
      </section>
    </div>
  );
};

const FeatureCard: React.FC<{ icon: React.ReactNode, title: string, desc: string, delay: number }> = ({ icon, title, desc, delay }) => {
  return (
    <motion.div 
      className={styles.featureCard}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.5 }}
    >
      <div className={styles.featureIcon}>{icon}</div>
      <h3 className={styles.featureTitle}>{title}</h3>
      <p className={styles.featureDesc}>{desc}</p>
    </motion.div>
  );
};

export default HomePage;
