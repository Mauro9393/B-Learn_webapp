import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './assets/css/headerMenu.css';
import { useBreadcrumbContext } from './BreadcrumbContext';

const HeaderMenu: React.FC = () => {
  const [profileDropdown, setProfileDropdown] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { addBreadcrumb } = useBreadcrumbContext();
  const userRole = localStorage.getItem('userRole');
  const userEmail = localStorage.getItem('userEmail') || '';

  // Funzione logout
  const handleLogout = () => {
    // Pulisci tutti i dati di autenticazione
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userRole');
    localStorage.removeItem('loginAttempts');
    localStorage.removeItem('failedLoginEmail');
    localStorage.removeItem('lastLoginAttemptTime');
    
    // Chiudi i dropdown
    setProfileDropdown(false);
    setIsMenuOpen(false);
    
    // Reindirizza alla home
    navigate('/');
  };

  // Funzione per cambiare password
  const handleChangePassword = () => {
    navigate('/forgot-password');
    setProfileDropdown(false);
    setIsMenuOpen(false);
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

  // Handler per le voci di menu
  const handleMenuClick = (label: string, path: string) => {
    addBreadcrumb({ label, path });
    navigate(path);
    setIsMenuOpen(false);
  };

  return (
    <>
      <header className="header-menu">
        <div className="header-menu-container">
          <div className="logo">
            <span style={{cursor:'pointer'}} onClick={() => handleMenuClick('Dashboard', '/dashboard')}>
              <img src="./assets/logo-blearn.png" alt="B-Learn Logo" className="logo-image logo-desktop" />
              <img src="./assets/logo-blearn-notxt.PNG" alt="B-Learn Logo Mobile" className="logo-image logo-mobile" />
            </span>
          </div>
          {/* Logo scritta solo mobile */}
          <div className="logo-mobile-center">
            <img src="./assets/logo-blearn - txt.PNG" alt="B-Learn Logo Testo Mobile" />
          </div>
          <nav className={`nav-menu ${isMenuOpen ? 'nav-menu-open' : ''}`}> 
            <span className="nav-link" onClick={() => handleMenuClick('Dashboard', '/dashboard')}>🏠 Dashboard</span>
            {isSuperAdmin && (
              <span className="nav-link" onClick={() => handleMenuClick('Ajouter un chatbot', '/create-chatbot')}>🤖 Ajouter un chatbot</span>
            )}
            {isSuperAdmin && (
              <span className="nav-link" onClick={() => handleMenuClick('Utilisateurs', '/all-student-list')}>👥 Utilisateurs</span>
            )}
            {isSuperAdmin &&(
              <span className="nav-link" onClick={() => handleMenuClick('Ajouter un Client', '/admin')}>➕ Ajouter un Client</span>
            )}
            {isAdmin &&(
              <span className="nav-link" onClick={() => handleMenuClick('Ajouter un Manager', '/add-partner')}>➕ Ajouter un Manager</span>
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
                  <span className="mobile-nav-link" onClick={() => handleMenuClick('Dashboard', '/dashboard')}>🏠 Dashboard</span>
                  {isSuperAdmin && (
                    <span className="mobile-nav-link" onClick={() => handleMenuClick('Ajouter un chatbot', '/create-chatbot')}>🤖 Ajouter un chatbot</span>
                  )}
                  {isSuperAdmin && (
                    <span className="mobile-nav-link" onClick={() => handleMenuClick('Utilisateurs', '/all-student-list')}>👥 Utilisateurs</span>
                  )}
                  {isSuperAdmin && (
                    <span className="mobile-nav-link" onClick={() => handleMenuClick('Ajouter un Client', '/admin')}>➕ Ajouter un Client</span>
                  )}
                  {isAdmin && (
                    <span className="mobile-nav-link" onClick={() => handleMenuClick('Ajouter un Manager', '/add-partner')}>➕ Ajouter un Manager</span>
                  )}
                </nav>
                <button className="mobile-logout-btn" onClick={handleLogout}>Déconnexion</button>
                <button className="mobile-change-password-btn" onClick={handleChangePassword}>Changer mot de passe</button>
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
                  <button className="profile-change-password-btn" onClick={handleChangePassword}>Changer mot de passe</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
      {/* Banner Breadcrumbs solo desktop */}
      {/* <Breadcrumbs /> */}
    </>
  );
};

export default HeaderMenu; 