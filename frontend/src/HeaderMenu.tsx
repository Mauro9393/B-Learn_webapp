import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './assets/css/headerMenu.css';

const HeaderMenu: React.FC = () => {
  const [chatbotDropdown, setChatbotDropdown] = useState(false);
  const [userDropdownMenu, setUserDropdownMenu] = useState(false);
  const [utilisateursDropdown, setUtilisateursDropdown] = useState(false);
  const navigate = useNavigate();

  const userRole = localStorage.getItem('userRole');
  const userEmail = localStorage.getItem('userEmail') || '';

  // Funzione logout
  const handleLogout = () => {
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userRole');
    navigate('/login');
  };

  // Visibilità menu
  const isSuperAdmin = userRole === '1';
  const isAdmin = userRole === '2';

  return (
    <header className="header-menu">
      <div className="header-menu-container">
        <div className="logo">
          <Link to="/dashboard">
            <img src="/assets/logo-blearn.png" alt="B-Learn Logo" className="logo-image" />
          </Link>
        </div>
        <nav className="nav-menu">
          <Link to="/dashboard" className="nav-item">🏠 Dashboard</Link>

          {/* Chatbots solo per super admin */}
          {isSuperAdmin && (
            <div
              className="nav-item dropdown"
              onMouseEnter={() => setChatbotDropdown(true)}
              onMouseLeave={() => setChatbotDropdown(false)}
            >
              <span className="nav-link">🤖 Chatbots <span className="dropdown-arrow">▼</span></span>
              {chatbotDropdown && (
                <div className="nav-dropdown-menu">
                  <Link to="/create-chatbot" className="dropdown-item">Créer un Chatbot</Link>
                </div>
              )}
            </div>
          )}

          {/* Utilisateurs */}
          <div
            className="nav-item dropdown"
            onMouseEnter={() => setUtilisateursDropdown(true)}
            onMouseLeave={() => setUtilisateursDropdown(false)}
          >
            <span className="nav-link">👥 Utilisateurs <span className="dropdown-arrow">▼</span></span>
            {utilisateursDropdown && (
              <div className="nav-dropdown-menu">
                <Link to="/student-list" className="dropdown-item">Liste des Apprenants</Link>
                {isSuperAdmin && (
                  <Link to="/admin" className="dropdown-item">Ajouter un Admin</Link>
                )}
                {(isSuperAdmin || isAdmin) && (
                  <Link to="/add-partner" className="dropdown-item">Ajouter un Manager</Link>
                )}
              </div>
            )}
          </div>
        </nav>
        {/* User info dropdown */}
        <div className="user-info">
          <div
            className="user-initials-container"
            onMouseEnter={() => setUserDropdownMenu(true)}
            onMouseLeave={() => setUserDropdownMenu(false)}
            onClick={() => setUserDropdownMenu(v => !v)}
            style={{ position: 'relative', cursor: 'pointer' }}
          >
            <div className="user-initials" id="user-initials">
              {userEmail ? userEmail.slice(0, 2).toUpperCase() : 'US'}
            </div>
            {userDropdownMenu && (
              <div className="dropdown-menu" id="dropdown-menu" style={{ display: 'block' }}>
                <span className="dropdown-item" onClick={handleLogout} style={{ cursor: 'pointer' }}>Déconnexion</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default HeaderMenu; 