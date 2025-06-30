import React from "react";
import { useNavigate } from "react-router-dom";
import "./assets/css/breadcrumbs.css";
import { useBreadcrumbContext } from "./BreadcrumbContext";
import type { BreadcrumbItem } from "./BreadcrumbContext";

const Breadcrumbs: React.FC = () => {
  const navigate = useNavigate();
  const { breadcrumb, goToBreadcrumb, resetBreadcrumb } = useBreadcrumbContext();

  return (
    <nav className="breadcrumbs-container">
      <ul className="breadcrumbs-list">
        <li
          className={`breadcrumbs-item home${breadcrumb.length === 1 ? ' active' : ''}`}
          onClick={() => {
            resetBreadcrumb();
            navigate('/dashboard');
          }}
          style={{ cursor: breadcrumb.length === 1 ? 'default' : 'pointer' }}
        >
          <span className="breadcrumbs-icon">
            {/* SVG Home Icon */}
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="12" fill="#6C63FF" fillOpacity="0.2"/>
              <path d="M8 14V18H16V14" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M3 11L12 4L21 11" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M5 11V20H19V11" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
        </li>
        {breadcrumb.map((item: BreadcrumbItem, idx: number) => (
          <React.Fragment key={item.path}>
            <li className="breadcrumbs-separator">&gt;</li>
            <li
              className={`breadcrumbs-item${idx === breadcrumb.length - 1 ? " active" : ""}`}
              onClick={() => {
                if (idx !== breadcrumb.length - 1) {
                  goToBreadcrumb(item.path);
                  navigate(item.path);
                }
              }}
              style={{ cursor: idx !== breadcrumb.length - 1 ? "pointer" : "default" }}
            >
              {item.label}
            </li>
          </React.Fragment>
        ))}
      </ul>
    </nav>
  );
};

export default Breadcrumbs; 