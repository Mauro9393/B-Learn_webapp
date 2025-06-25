import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './assets/css/headerMenu.css';

const HeaderMenu: React.FC = () => {
  const [profileDropdown, setProfileDropdown] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const userRole = localStorage.getItem('userRole');
  const userEmail = localStorage.getItem('userEmail') || '';

  // Funzione logout
  const handleLogout = () => {
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userRole');
    navigate('/Home');
  };

  const isSuperAdmin = userRole === '1';
  const isAdmin = userRole === '2';

  // Ruolo testuale
  let roleLabel = 'User';
  if (isSuperAdmin) roleLabel = 'Super Admin';
  else if (isAdmin) roleLabel = 'Admin';

  // Iniziali
  const initials = userEmail ? userEmail.slice(0, 2).toUpperCase() : 'US';

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <header className="header-menu">
      <div className="header-menu-container">
        <div className="logo">
          <Link to="/dashboard">
            <img src="./assets/logo-blearn.png" alt="B-Learn Logo" className="logo-image" />
          </Link>
        </div>
        <nav className={`nav-menu ${isMenuOpen ? 'nav-menu-open' : ''}`}>
          <Link to="/dashboard" className="nav-link">🏠 Dashboard</Link>
          {/* Chatbots solo per super admin */}
          {isSuperAdmin && (
            <Link to="/create-chatbot" className="nav-link">🤖 Chatbots</Link>
          )}
          {/* Utilisateurs */}
          {isSuperAdmin && (
            <Link to="/all-student-list" className="nav-link">👥 Utilisateurs</Link>
          )}
          {/* Ajouter un Admin solo per super admin */}
          {isSuperAdmin &&(
            <Link to="/admin" className="nav-link">➕ Ajouter un Admin</Link>
          )}
          {isAdmin &&(
            <Link to="/add-partner" className="nav-link">➕ Ajouter un Manager</Link>
          )}
        </nav>
        <div className="mobile-menu-container">
          <div className="burger-menu" onClick={toggleMenu}>
            <div className={`burger-line ${isMenuOpen ? 'open' : ''}`}></div>
            <div className={`burger-line ${isMenuOpen ? 'open' : ''}`}></div>
            <div className={`burger-line ${isMenuOpen ? 'open' : ''}`}></div>
          </div>
          {isMenuOpen && (
            <div className="mobile-menu">
              <div className="mobile-profile">
                <div className="profile-avatar-circle">{initials}</div>
                <div className="profile-info">
                  <div className="profile-role">{roleLabel}</div>
                  <div className="profile-email">{userEmail}</div>
                </div>
              </div>
              <nav className="mobile-nav">
                <Link to="/dashboard" className="mobile-nav-link" onClick={toggleMenu}>🏠 Dashboard</Link>
                {isSuperAdmin && (
                  <Link to="/create-chatbot" className="mobile-nav-link" onClick={toggleMenu}>🤖 Chatbots</Link>
                )}
                {isSuperAdmin && (
                  <Link to="/all-student-list" className="mobile-nav-link" onClick={toggleMenu}>👥 Utilisateurs</Link>
                )}
                {isSuperAdmin && (
                  <Link to="/admin" className="mobile-nav-link" onClick={toggleMenu}>➕ Ajouter un Admin</Link>
                )}
                {isAdmin && (
                  <Link to="/add-partner" className="mobile-nav-link" onClick={toggleMenu}>➕ Ajouter un Manager</Link>
                )}
              </nav>
              <button className="mobile-logout-btn" onClick={handleLogout}>Déconnexion</button>
            </div>
          )}
        </div>
        <div className="desktop-profile">
          <div
            className="user-initials-container"
            style={{ position: 'relative', cursor: 'pointer' }}
            onMouseEnter={() => setProfileDropdown(true)}
            onMouseLeave={() => setProfileDropdown(false)}
          >
            <div className="user-initials" id="user-initials">
              {initials}
            </div>
            {profileDropdown && (
              <div className="profile-dropdown-menu">
                <div className="profile-dropdown-header">
                  <div className="profile-avatar-circle">{initials}</div>
                  <div className="profile-info">
                    <div className="profile-role">{roleLabel}</div>
                    <div className="profile-email">{userEmail}</div>
                  </div>
                </div>
                <button className="profile-logout-btn" onClick={handleLogout}>Déconnexion</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default HeaderMenu; 