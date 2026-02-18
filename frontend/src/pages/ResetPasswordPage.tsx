import React, { useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { TextField } from "@mui/material";
import Tilt from "react-parallax-tilt";
import { motion } from "framer-motion";
import styles from "../styles/LoginPage.module.css";

const ResetPasswordPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/reset-password/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, confirmPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Failed to reset password");
      } else {
        setMessage(data.message);
        setTimeout(() => {
          navigate("/login");
        }, 3000);
      }
    } catch (err) {
      console.error("Reset password error:", err);
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
              Reset Password
            </motion.h2>

            <motion.p style={{ color: "rgba(255,255,255,0.7)", marginBottom: 20, textAlign: "center" }} variants={itemVariants}>
              Enter your new password below.
            </motion.p>

            <motion.div className={styles.inputField} variants={itemVariants}>
              <TextField
                fullWidth
                label="New Password"
                type="password"
                variant="outlined"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                InputProps={{ style: { color: "#fff" } }}
                InputLabelProps={{ style: { color: "rgba(255,255,255,0.7)" } }}
              />
            </motion.div>

            <motion.div className={styles.inputField} variants={itemVariants}>
              <TextField
                fullWidth
                label="Confirm New Password"
                type="password"
                variant="outlined"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                InputProps={{ style: { color: "#fff" } }}
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
              {loading ? "Resetting..." : "Reset Password"}
            </motion.button>
          </motion.div>
        </Tilt>
      </motion.div>
    </div>
  );
};

export default ResetPasswordPage;
