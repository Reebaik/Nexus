import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { TextField } from "@mui/material";
import Tilt from "react-parallax-tilt";
import { motion } from "framer-motion";
import styles from "../styles/RegisterPage.module.css";

/* Google typing fix */
declare global {
  interface Window {
    google?: any;
  }
}

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const googleBtnRef = useRef<HTMLDivElement>(null);

  /* ============================
     Google Sign-Up Integration
     ============================ */
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    script.onload = () => {
      if (window.google && googleBtnRef.current) {
        window.google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
          callback: handleGoogleResponse,
        });

        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: "filled_blue",
          size: "large",
          width: 260,
        });
      }
    };

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handleGoogleResponse = async (response: any) => {
    setError("");
    setSuccess("");

    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/auth/google`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: response.credential }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Google sign-up failed");
      } else {
        localStorage.setItem("nexus_jwt", data.token);
        window.location.href = "/projects";
      }
    } catch {
      setError("Google sign-up error");
    }
  };

  /* ============================
     Manual Registration
     ============================ */
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!username || !email || !password || !confirmPassword) {
      setError("All fields are required");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/auth/register`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, email, password, confirmPassword }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Registration failed");
      } else {
        setSuccess("Registration successful! Redirecting to login page...");
        // Redirect to login page after 2 seconds
        setTimeout(() => {
          navigate("/login");
        }, 2000);
      }
    } catch {
      setError("Server error");
    }
  };

  /* Staggered animation variants */
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
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
  };

  return (
    <div className={styles.pageWrapper}>
      {/* Visual-only background */}
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
            className={styles.registerContainer}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.h2 className={styles.title} variants={itemVariants}>
              Register for Nexus
            </motion.h2>

            <form onSubmit={handleRegister} className={styles.form}>
              <motion.div className={styles.inputField} variants={itemVariants}>
                <TextField
                  fullWidth
                  label="Username"
                  variant="outlined"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  InputProps={{ 
                    style: { color: "#fff" },
                    autoComplete: "off"
                  }}
                  InputLabelProps={{ style: { color: "rgba(255,255,255,0.7)" } }}
                />
              </motion.div>

              <motion.div className={styles.inputField} variants={itemVariants}>
                <TextField
                  fullWidth
                  label="Email"
                  variant="outlined"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  InputProps={{ style: { color: "#fff" } }}
                  InputLabelProps={{ style: { color: "rgba(255,255,255,0.7)" } }}
                />
              </motion.div>

              <motion.div className={styles.inputField} variants={itemVariants}>
                <TextField
                  fullWidth
                  label="Password"
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
                  label="Confirm Password"
                  type="password"
                  variant="outlined"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  InputProps={{ style: { color: "#fff" } }}
                  InputLabelProps={{ style: { color: "rgba(255,255,255,0.7)" } }}
                />
              </motion.div>

              {error && (
                <motion.div className={styles.error} variants={itemVariants}>
                  {error}
                </motion.div>
              )}
              {success && (
                <motion.div className={styles.success} variants={itemVariants}>
                  {success}
                </motion.div>
              )}

              <motion.button
                className={styles.registerButton}
                variants={itemVariants}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
              >
                Create Account
              </motion.button>

              {/* Google Sign-Up */}
              <motion.div className={styles.googleSection} variants={itemVariants}>
                <div className={styles.divider}>
                  <span>OR CONTINUE WITH</span>
                </div>
                <div
                  className={styles.googleWrapper}
                  ref={googleBtnRef}
                />
              </motion.div>
            </form>

            <motion.div className={styles.footer} variants={itemVariants}>
              <span>Already have an account?</span>
              <Link to="/login">Sign In</Link>
            </motion.div>
          </motion.div>
        </Tilt>
      </motion.div>
    </div>
  );
};

export default RegisterPage;
