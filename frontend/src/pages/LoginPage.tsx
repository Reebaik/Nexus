import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { TextField } from "@mui/material";
import Tilt from "react-parallax-tilt";
import { motion } from "framer-motion";
import styles from "../styles/LoginPage.module.css";

/* Google typing fix */
declare global {
  interface Window {
    google?: any;
  }
}

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const googleBtnRef = useRef<HTMLDivElement>(null);

  // Add localStorage check for debugging
  React.useEffect(() => {
    console.log('LoginPage - Current localStorage state:');
    console.log('JWT token:', localStorage.getItem('nexus_jwt'));
    console.log('User data:', localStorage.getItem('nexus_user'));
    console.log('Google Client ID:', import.meta.env.VITE_GOOGLE_CLIENT_ID);
  }, []);

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
    try {
      console.log('Sending Google token to backend...');
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/auth/google`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: response.credential }),
        }
      );
      const data = await res.json();
      console.log('Backend response:', data);
      
      if (!res.ok) {
        console.error('Backend error:', data.message);
        setError(data.message || "Google login failed");
      } else {
        // Store JWT token
        localStorage.setItem("nexus_jwt", data.token);
        console.log('JWT token saved:', data.token);
        
        // Store user information for permissions
        if (data.user) {
          const userInfo = {
            id: data.user.id,
            username: data.user.username || data.user.email,
            email: data.user.email
          };
          console.log('Storing user info:', userInfo);
          localStorage.setItem("nexus_user", JSON.stringify(userInfo));
          console.log('User info stored in localStorage');
          
          // Verify it was stored
          const verifyUser = localStorage.getItem("nexus_user");
          console.log('Verification - stored user:', verifyUser);
        } else {
          console.error('No user data in backend response:', data);
          setError("Login successful but no user data received");
        }
        
        console.log('Redirecting to projects page...');
        window.location.href = "/projects";
      }
    } catch (error) {
      console.error('Google login error:', error);
      setError("Google login error");
    }
  };

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

  return (
    <div className={styles.pageWrapper}>
      {/* background (visual only) */}
      <div className={styles.animatedBg} />

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }} // Custom cubic-bezier for "professional" ease
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
              Nexus Login
            </motion.h2>

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
                label="Password"
                type="password"
                variant="outlined"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                InputProps={{ style: { color: "#fff" } }}
                InputLabelProps={{ style: { color: "rgba(255,255,255,0.7)" } }}
              />
            </motion.div>

            <motion.div style={{ textAlign: "right", marginTop: 8, marginBottom: 8 }} variants={itemVariants}>
              <Link to="/forgot-password" style={{ color: "#60a5fa", textDecoration: "none", fontSize: "0.9rem" }}>
                Forgot Password?
              </Link>
            </motion.div>

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
              onClick={async () => {
                setError("");
                if (!username || !password) {
                  setError("Username and password are required");
                  return;
                }
                try {
                  console.log('Attempting regular login with username:', username);
                  const res = await fetch(
                    `${import.meta.env.VITE_API_URL}/api/auth/login`,
                    {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ username, password }),
                    }
                  );
                  const data = await res.json();
                  console.log('Regular login response:', data);
                  
                  if (!res.ok) {
                    console.error('Regular login error:', data.message);
                    setError(data.message || "Invalid credentials");
                  } else {
                    // Store JWT token
                    if (data.token) {
                      localStorage.setItem("nexus_jwt", data.token);
                      console.log('JWT token stored in localStorage');
                      
                      // Also store user info if available
                      if (data.user) {
                        localStorage.setItem("nexus_user", JSON.stringify(data.user));
                        console.log('User info stored in localStorage:', data.user);
                      }
                      
                      // Force a small delay to ensure storage is updated before redirect
                      setTimeout(() => {
                        console.log('Redirecting to projects page...');
                        window.location.href = "/projects";
                      }, 100);
                    } else {
                      console.error('No token in response:', data);
                      setError("Login successful but no token received");
                    }
                  }
                } catch (err) {
                  console.error('Network error during login:', err);
                  setError("Network error. Please try again.");
                }
              }}
            >
              Sign In
            </motion.button>

            {/* Google button */}
            <motion.div className={styles.googleSection} variants={itemVariants}>
              <div className={styles.divider}>
                <span>OR CONTINUE WITH</span>
              </div>

              <div className={styles.googleWrapper} ref={googleBtnRef} />
            </motion.div>

            <motion.div className={styles.footer} variants={itemVariants}>
              <span>Don’t have an account?</span>
              <Link to="/register">Create Account</Link>
            </motion.div>
          </motion.div>
        </Tilt>
      </motion.div>
    </div>
  );
};

export default LoginPage;
