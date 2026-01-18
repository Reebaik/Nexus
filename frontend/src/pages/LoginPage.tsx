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
        
        console.log('Redirecting to home page...');
        window.location.href = "/";
      }
    } catch (error) {
      console.error('Google login error:', error);
      setError("Google login error");
    }
  };

  return (
    <div className={styles.pageWrapper}>
      {/* background (visual only) */}
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
          <div className={styles.loginContainer}>
            <h2 className={styles.title}>Nexus Login</h2>

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

            {error && <div className={styles.error}>{error}</div>}

            <motion.button
              className={styles.loginButton}
              whileHover={{ scale: 1.04 }}
              transition={{ type: "spring", stiffness: 250 }}
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
                    localStorage.setItem("nexus_jwt", data.token);
                    console.log('JWT token saved:', data.token);
                    
                    // Store user information for permissions
                    if (data.user) {
                      const userInfo = {
                        id: data.user.id,
                        username: data.user.username || data.user.email,
                        email: data.user.email
                      };
                      console.log('Storing user info from regular login:', userInfo);
                      localStorage.setItem("nexus_user", JSON.stringify(userInfo));
                      console.log('User info stored in localStorage');
                      
                      // Verify it was stored
                      const verifyUser = localStorage.getItem("nexus_user");
                      console.log('Verification - stored user:', verifyUser);
                    } else {
                      console.error('No user data in regular login response:', data);
                      setError("Login successful but no user data received");
                    }
                    
                    console.log('Redirecting to home page...');
                    window.location.href = "/";
                  }
                } catch (error) {
                  console.error('Regular login error:', error);
                  setError("Server error");
                }
              }}
            >
              Login
            </motion.button>

            {/* Google button */}
            <div className={styles.googleSection}>
              <div className={styles.divider}>
                <span>OR</span>
              </div>

              <div className={styles.googleWrapper} ref={googleBtnRef} />
          </div>

            <div className={styles.footer}>
              <span>Don’t have an account?</span>
              <Link to="/register">Register</Link>
            </div>
          </div>
        </Tilt>
      </motion.div>
    </div>
  );
};

export default LoginPage;
