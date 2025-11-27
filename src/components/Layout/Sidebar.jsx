import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Sidebar.css';

const Sidebar = ({ menuItems, userType, user }) => {
  const location = useLocation();

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h4 className="sidebar-logo">DBEST</h4>
        <p className="sidebar-subtitle">Dynamic Back-End School Tracker</p>
      </div>
      <nav className="sidebar-nav">
        <ul className="sidebar-menu">
          {menuItems.map((item, index) => {
            const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
            return (
              <li key={index} className={`sidebar-menu-item ${isActive ? 'active' : ''}`}>
                <Link to={item.path} className="sidebar-menu-link">
                  <i className={`fas ${item.icon}`}></i>
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="sidebar-footer">
        <div className="sidebar-user-info">
          <i className="fas fa-user-circle"></i>
          <div>
            <div className="user-name">{user?.first_name} {user?.last_name}</div>
            <div className="user-role">{userType?.replace('_', ' ').toUpperCase()}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;

