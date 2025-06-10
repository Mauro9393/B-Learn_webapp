import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './assets/css/headerMenu.css';

const HeaderMenu: React.FC = () => {
  const navigate = useNavigate();
  const userRole = localStorage.getItem('userRole');
  const userEmail = localStorage.getItem('userEmail') || '';

  // Funzione logout
  const handleLogout = () => {
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userRole');
    navigate('/login');
  };

  const isSuperAdmin = userRole === '1';
  const isAdmin = userRole === '2';

  return (
    <header className="header-menu">
      <div className="header-menu-container">
        <div className="logo">
          <Link to="/dashboard">
            <img src="./assets/logo-blearn.png" alt="B-Learn Logo" className="logo-image" />
          </Link>
        </div>
        <nav className="nav-menu">
          <Link to="/dashboard" className="nav-link">🏠 Dashboard</Link>
          {/* Chatbots solo per super admin */}
          {isSuperAdmin && (
            <Link to="/create-chatbot" className="nav-link">🤖 Chatbots</Link>
          )}
          {/* Utilisateurs */}
          <Link to="/student-list" className="nav-link">👥 Utilisateurs</Link>
          {/* Ajouter un Admin solo per super admin */}
          {isSuperAdmin &&(
            <Link to="/admin" className="nav-link">➕ Ajouter un Admin</Link>
          )}
          {isAdmin &&(
            <Link to="/add-partner" className="nav-link">➕ Ajouter un Manager</Link>
          )}
        </nav>
        {/* User info dropdown */}
        <div className="user-info">
          <div
            className="user-initials-container"
            style={{ position: 'relative', cursor: 'pointer' }}
          >
            <div className="user-initials" id="user-initials">
              {userEmail ? userEmail.slice(0, 2).toUpperCase() : 'US'}
            </div>
            <div className="dropdown-menu" id="dropdown-menu" style={{ display: 'block' }}>
              <span className="dropdown-item" onClick={handleLogout} style={{ cursor: 'pointer' }}>Déconnexion</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default HeaderMenu; 