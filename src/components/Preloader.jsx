import { useState, useEffect } from "react";
import logo from "../assets/logo.png";

export default function Preloader() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
      <div className={`preloader-container ${isVisible ? 'visible' : ''}`}>
        <div className="logo-pulse">
          <img 
            src={logo} 
            alt="DBEST Logo" 
            className="logo-main"
          />
        </div>
      </div>

      <style>{`
        .preloader-container {
          opacity: 0;
          transition: opacity 0.6s ease-out;
        }

        .preloader-container.visible {
          opacity: 1;
        }

        .logo-pulse {
          position: relative;
          width: 100px;
          height: 100px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .logo-main {
          width: 80px;
          height: 80px;
          object-fit: contain;
          animation: softPulse 2s ease-in-out infinite;
          filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.1));
        }

        .logo-pulse::before {
          content: '';
          position: absolute;
          top: -10px;
          left: -10px;
          right: -10px;
          bottom: -10px;
          border: 2px solid #0E254B;
          border-radius: 50%;
          animation: ripple 2s ease-out infinite;
          opacity: 0;
        }

        .logo-pulse::after {
          content: '';
          position: absolute;
          top: -20px;
          left: -20px;
          right: -20px;
          bottom: -20px;
          border: 1px solid #0E254B;
          border-radius: 50%;
          animation: ripple 2s ease-out infinite;
          animation-delay: 0.5s;
          opacity: 0;
        }

        @keyframes softPulse {
          0%, 100% { 
            transform: scale(1);
            opacity: 1;
          }
          50% { 
            transform: scale(1.05);
            opacity: 0.9;
          }
        }

        @keyframes ripple {
          0% {
            transform: scale(0.8);
            opacity: 0.8;
          }
          100% {
            transform: scale(1.4);
            opacity: 0;
          }
        }

        @media (max-width: 768px) {
          .logo-pulse {
            width: 90px;
            height: 90px;
          }

          .logo-main {
            width: 70px;
            height: 70px;
          }
        }
      `}</style>
    </div>
  );
}

