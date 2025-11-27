import React from 'react';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="py-4 bg-light mt-auto">
      <div className="container-fluid px-4">
        <div className="d-flex align-items-center justify-content-between small">
          <div className="text-muted">
            &copy; {currentYear} DBEST. All rights reserved.
          </div>
          <div className="text-muted">
            <span className="mx-1">v1.0.0</span>
            <span className="mx-1">•</span>
            <span>Dynamic Back-End School Tracker</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

