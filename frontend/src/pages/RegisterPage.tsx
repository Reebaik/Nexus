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
        window.location.href = "/";
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

  return (
    <div className={styles.pageWrapper}>
      {/* Visual-only background */}
      <div className={styles.animatedBg} />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
      >
        <Tilt
          tiltMaxAngleX={3}
          tiltMaxAngleY={3}
          perspective={1200}
          scale={1.01}
          transitionSpeed={800}
          glareEnable
          glareColor="rgba(255,255,255,0.08)"
          glarePosition="bottom"
          trackOnWindow={false}
          gyroscope={false}
        >
          <div className={styles.registerContainer}>
            <h2 className={styles.title}>Register for Nexus</h2>

            <form onSubmit={handleRegister} className={styles.form}>
              <div className={styles.inputField}>
                <TextField
                  fullWidth
                  label="Username"
                  variant="outlined"
                  size="small"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  InputProps={{ style: { color: "#fff" } }}
                  InputLabelProps={{ style: { color: "#aaa" } }}
                />
              </div>

              <div className={styles.inputField}>
                <TextField
                  fullWidth
                  label="Email"
                  variant="outlined"
                  size="small"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  InputProps={{ style: { color: "#fff" } }}
                  InputLabelProps={{ style: { color: "#aaa" } }}
                />
              </div>

              <div className={styles.inputField}>
                <TextField
                  fullWidth
                  label="Password"
                  type="password"
                  variant="outlined"
                  size="small"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  InputProps={{ style: { color: "#fff" } }}
                  InputLabelProps={{ style: { color: "#aaa" } }}
                />
              </div>

              <div className={styles.inputField}>
                <TextField
                  fullWidth
                  label="Confirm Password"
                  type="password"
                  variant="outlined"
                  size="small"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  InputProps={{ style: { color: "#fff" } }}
                  InputLabelProps={{ style: { color: "#aaa" } }}
                />
              </div>

              {error && <div className={styles.error}>{error}</div>}
              {success && <div className={styles.success}>{success}</div>}

              <motion.button
                className={styles.registerButton}
                whileHover={{ scale: 1.04 }}
                transition={{ type: "spring", stiffness: 250 }}
                type="submit"
              >
                Register
              </motion.button>

              {/* Google Sign-Up */}
              <div className={styles.googleSection}>
                <div className={styles.divider}>
                  <span>OR</span>
                </div>
                <div
                  className={styles.googleWrapper}
                  ref={googleBtnRef}
                />
              </div>
            </form>

            <div className={styles.footer}>
              <span>Already have an account?</span>
              <Link to="/login">Login</Link>
            </div>
          </div>
        </Tilt>
      </motion.div>
    </div>
  );
};

export default RegisterPage;
