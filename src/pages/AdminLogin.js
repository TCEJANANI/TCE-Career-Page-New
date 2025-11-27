// src/pages/AdminLogin.js
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "../firebase";
import "./AdminLogin.css";
import collegeBg from "../assets/college-bg.jpeg"; // reuse same background

export default function AdminLogin() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const provider = new GoogleAuthProvider();

  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);

    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const token = await user.getIdToken();
      localStorage.setItem("tce_admin_token", token);

      if (user.email.endsWith(".tce.edu")) {
        navigate("/admin-dashboard");
      } else {
        navigate("/form");
      }
    } catch (err) {
      console.error(err);
      setError("SSO login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <header
      className="hero"
      style={{ backgroundImage: `url(${collegeBg})` }}
    >
      <div className="overlay">
        <div className="hero-text">
          <h2>Admin Login (Google SSO)</h2>
          {error && <p className="error-text">{error}</p>}
          <button onClick={handleGoogleLogin} disabled={loading}>
            {loading ? "Signing in..." : "Login with Google"}
          </button>
        </div>
      </div>
    </header>
  );
}
