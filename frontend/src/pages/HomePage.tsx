import React from "react";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import styles from "../styles/HomePage.module.css";

/* ---------------- Motion ---------------- */

const fadeReveal: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.7,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.18,
    },
  },
};

/* ---------------- Component ---------------- */

const HomePage: React.FC = () => {
  return (
    <div className={styles.root}>
      {/* Background */}
      <div className={styles.bgGradient} />
      <div className={styles.bgGrid} />

      {/* HERO */}
      <section className={styles.hero}>
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeReveal}
        >
          <h1 className={styles.heroTitle}>Nexus</h1>

          <p className={styles.heroSubtitle}>
            A structured project management system for the entire project lifecycle.
          </p>

          <p className={styles.heroDescription}>
            Plan projects from inception, manage execution with visual boards and
            timelines, and track progress with real-time insights — all in one
            unified workspace.
          </p>
        </motion.div>
      </section>

      {/* PROBLEM */}
      <motion.section
        className={styles.section}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={fadeReveal}
      >
        <h2>Why Nexus exists</h2>

        <p>
          Teams are expected to manage complex projects using tools that focus
          only on individual tasks.
        </p>

        <p>
          This ignores project foundations, fractures timelines, and forces
          teams to constantly switch context between disconnected systems.
        </p>

        <p>
          As complexity grows, execution breaks down — not because teams lack
          discipline, but because their tools lack structure.
        </p>
      </motion.section>

      {/* APPROACH / LIFECYCLE */}
      <motion.section
        className={styles.section}
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
      >
        <motion.h2 variants={fadeReveal}>The Nexus approach</motion.h2>

        <div className={styles.lifecycle}>
          <motion.div variants={fadeReveal} className={styles.lifecycleStep}>
            <h3>Inception</h3>
            <p>
              Define objectives, scope, stakeholders, milestones, and timelines
              before execution begins.
            </p>
          </motion.div>

          <motion.div variants={fadeReveal} className={styles.lifecycleStep}>
            <h3>Planning</h3>
            <p>
              Plan work visually using Kanban boards, Gantt charts, and task
              dependencies to understand how work connects.
            </p>
          </motion.div>

          <motion.div variants={fadeReveal} className={styles.lifecycleStep}>
            <h3>Execution</h3>
            <p>
              Collaborate in real time with task-based discussions, updates,
              and shared project context.
            </p>
          </motion.div>

          <motion.div variants={fadeReveal} className={styles.lifecycleStep}>
            <h3>Tracking & Control</h3>
            <p>
              Monitor progress using burndown charts, milestone tracking,
              and workload distribution.
            </p>
          </motion.div>

          <motion.div variants={fadeReveal} className={styles.lifecycleStep}>
            <h3>Insight & Assistance</h3>
            <p>
              Gain clarity through AI-assisted summaries, planning suggestions,
              and execution insights.
            </p>
          </motion.div>
        </div>
      </motion.section>

      {/* FEATURES */}
      <motion.section
        className={styles.section}
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
      >
        <motion.h2 variants={fadeReveal}>Core capabilities</motion.h2>

        <div className={styles.features}>
          <motion.div variants={fadeReveal} className={styles.featureCard}>
            <h4>Project Inception</h4>
            <p>Structure goals, scope, milestones, and ownership from day one.</p>
          </motion.div>

          <motion.div variants={fadeReveal} className={styles.featureCard}>
            <h4>Kanban & Gantt Planning</h4>
            <p>Move seamlessly between visual boards and long-term timelines.</p>
          </motion.div>

          <motion.div variants={fadeReveal} className={styles.featureCard}>
            <h4>Milestone & Burndown Tracking</h4>
            <p>Measure progress, velocity, and delivery confidence in real time.</p>
          </motion.div>

          <motion.div variants={fadeReveal} className={styles.featureCard}>
            <h4>AI-Assisted Insights</h4>
            <p>Surface summaries, risks, and planning signals automatically.</p>
          </motion.div>
        </div>
      </motion.section>

      {/* WHO */}
      <motion.section
        className={styles.section}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={fadeReveal}
      >
        <h2>Who Nexus is for</h2>

        <div className={styles.personas}>
          <div>Academic & student teams</div>
          <div>Software development teams</div>
          <div>Startups & product teams</div>
          <div>Any team managing structured work</div>
        </div>
      </motion.section>

      {/* CTA */}
      <motion.section
        className={styles.cta}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={fadeReveal}
      >
        <h2>Ready to plan projects the right way?</h2>
        <p>
          Create your first project, define its foundation,
          and let Nexus guide execution.
        </p>

        <div className={styles.ctaActions}>
          <button className={styles.primaryBtn}>Create your first project</button>
          <button className={styles.secondaryBtn}>Login</button>
        </div>
      </motion.section>
    </div>
  );
};

export default HomePage;
