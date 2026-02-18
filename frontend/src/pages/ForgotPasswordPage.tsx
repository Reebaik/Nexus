import React, { useState } from "react";
import { Link } from "react-router-dom";
import { TextField } from "@mui/material";
import Tilt from "react-parallax-tilt";
import { motion } from "framer-motion";
import styles from "../styles/LoginPage.module.css";

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  /* Staggered animation variants */
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 300, damping: 24 },
    },
  } as const;

  const handleSubmit = async () => {
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Failed to send reset link");
      } else {
        setMessage(data.message);
      }
    } catch (err) {
      console.error("Forgot password error:", err);
      setError("Server error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.pageWrapper}>
      {/* background (visual only) */}
      <div className={styles.animatedBg} />

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      >
        <Tilt
          tiltMaxAngleX={4}
          tiltMaxAngleY={4}
          perspective={1000}
          scale={1.02}
          transitionSpeed={1000}
          glareEnable
          glareColor="rgba(255,255,255,0.1)"
          glarePosition="all"
          trackOnWindow={false}
          gyroscope={false}
        >
          <motion.div 
            className={styles.loginContainer}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.h2 className={styles.title} variants={itemVariants}>
              Forgot Password
            </motion.h2>

            <motion.p style={{ color: "rgba(255,255,255,0.7)", marginBottom: 20, textAlign: "center" }} variants={itemVariants}>
              Enter your email address and we'll send you a link to reset your password.
            </motion.p>

            <motion.div className={styles.inputField} variants={itemVariants}>
              <TextField
                fullWidth
                label="Email Address"
                variant="outlined"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                InputProps={{ 
                  style: { color: "#fff" },
                  autoComplete: "email"
                }}
                InputLabelProps={{ style: { color: "rgba(255,255,255,0.7)" } }}
              />
            </motion.div>

            {message && (
              <motion.div style={{ color: "#4ade80", marginBottom: 15, textAlign: "center" }} variants={itemVariants}>
                {message}
              </motion.div>
            )}

            {error && (
              <motion.div className={styles.error} variants={itemVariants}>
                {error}
              </motion.div>
            )}

            <motion.button
              className={styles.loginButton}
              variants={itemVariants}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSubmit}
              disabled={loading}
              style={{ opacity: loading ? 0.7 : 1 }}
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </motion.button>

            <motion.div className={styles.registerLink} variants={itemVariants}>
              Remember your password? <Link to="/login">Login</Link>
            </motion.div>
          </motion.div>
        </Tilt>
      </motion.div>
    </div>
  );
};

export default ForgotPasswordPage;
