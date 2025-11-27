// src/components/Navbar.js
import React from "react";
import "./Navbar.css";

function Navbar() {
  return (
    <nav className="navbar">
      <div className="nav-logo">
        <img src="/college-logo.png" alt="College Logo" className="logo" />
        <span>TCE Career Page</span>
      </div>

      <ul className="nav-links">
        <li><a href="/">Home</a></li>
        <li><a href="/form">Apply Now</a></li>

        {/* 🔥 Added Admin Login button */}
        <li>
          <a href="/admin-login" className="admin-login-btn">
            Admin Login
          </a>
        </li>
      </ul>
    </nav>
  );
}

export default Navbar;
