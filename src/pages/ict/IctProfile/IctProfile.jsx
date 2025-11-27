import React from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { showAlert } from "../../../services/notificationService";
import {
  FaShieldAlt,
  FaUser,
  FaEnvelope,
  FaCalendarAlt,
  FaKey,
  FaCog,
  FaUserShield,
  FaIdCard,
  FaBuilding,
} from "react-icons/fa";

const BRAND = {
  primary: "#0E254B",
  accent: "#1B5F9D",
  highlight: "#0DA9D6",
  surface: "#ffffff",
  muted: "#6c7b8a",
};

const formatDate = (value) => {
  if (!value) return "Not specified";
  try {
    return new Date(value).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "Invalid date";
  }
};

const IctProfile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const displayName =
    user?.full_name ||
    `${user?.first_name || ""} ${user?.last_name || ""}`.trim() ||
    "ICT Administrator";

  const handleSettingsNavigation = () => {
    showAlert
      .confirm(
        "Administrator Settings",
        "You can manage your security preferences inside the Settings page.",
        "Go to Settings",
        "Cancel"
      )
      .then((result) => {
        if (result.isConfirmed) {
          navigate("/settings");
        }
      });
  };

  const handlePasswordChange = () => {
    showAlert
      .confirm(
        "Change Password",
        "Please open Settings to update your ICT administrator password securely.",
        "Go to Settings",
        "Cancel"
      )
      .then((result) => {
        if (result.isConfirmed) {
          navigate("/settings");
        }
      });
  };

  const infoTiles = [
    {
      icon: FaUser,
      label: "Full Name",
      value: displayName,
      description: "Registered ICT administrator name",
    },
    {
      icon: FaEnvelope,
      label: "Email Address",
      value: user?.email || "Not specified",
      description: "Primary contact email",
    },
    {
      icon: FaBuilding,
      label: "Position",
      value: user?.position || "ICT Administrator",
      description: "Administrative role",
    },
    {
      icon: FaCalendarAlt,
      label: "Account Created",
      value: formatDate(user?.created_at),
      description: "Date the account was provisioned",
    },
  ];

  const privileges = [
    "Manage ICT infrastructure preferences",
    "Coordinate backup and recovery processes",
    "Oversee system access of property custodians",
    "Audit platform-wide security alerts",
    "Escalate incidents to system administrators",
  ];

  return (
    <div className="container-fluid px-1 px-md-3 py-4 fadeIn">
      <div className="text-center mb-4">
        <div className="d-flex flex-column flex-md-row justify-content-center align-items-center mb-3">
          <div
            className="rounded-circle d-flex align-items-center justify-content-center mb-3 mb-md-0 me-md-3 flex-shrink-0"
            style={{
              width: "60px",
              height: "60px",
              background: "linear-gradient(135deg, #0E254B 0%, #1B5F9D 100%)",
              boxShadow: "0 12px 30px rgba(15, 61, 95, 0.35)",
              transition: "all 0.3s ease",
            }}
          >
            <FaShieldAlt className="text-white" size={26} />
          </div>
          <div className="text-center text-md-start">
            <h1 className="h3 mb-1 fw-bold" style={{ color: BRAND.primary }}>
              ICT Administrator Overview
            </h1>
            <p className="text-muted mb-0">
              {displayName} • Full Infrastructure Access
            </p>
            <small className="text-muted">
              Department of Education | Systems & Infrastructure
            </small>
          </div>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-12 col-lg-6">
          <div
            className="card border-0 h-100"
            style={{
              borderRadius: "14px",
              background: BRAND.surface,
              boxShadow: "0 12px 32px rgba(14, 37, 75, 0.18)",
              transition: "all 0.3s ease",
            }}
          >
            <div
              className="card-header bg-transparent border-0 py-3 px-4"
              style={{
                background: "rgba(14,37,75,0.04)",
                borderBottom: "2px solid rgba(14,37,75,0.08)",
                borderRadius: "14px 14px 0 0",
              }}
            >
              <div className="d-flex align-items-center">
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center me-3 flex-shrink-0"
                  style={{
                    width: "44px",
                    height: "44px",
                    background: BRAND.highlight,
                    color: "#fff",
                    boxShadow: "0 6px 16px rgba(13,169,214,0.4)",
                  }}
                >
                  <FaUser />
                </div>
                <div>
                  <h6 className="mb-0 fw-bold" style={{ color: BRAND.primary }}>
                    Administrator Information
                  </h6>
                  <small className="text-muted">
                    ICT administrator account details
                  </small>
                </div>
              </div>
            </div>
            <div className="card-body p-4">
              <div className="row g-3">
                {infoTiles.map((tile, index) => (
                  <div key={index} className="col-12">
                    <div
                      className="d-flex align-items-start p-3 rounded-3 position-relative"
                      style={{
                        background: "#ffffff",
                        border: "1px solid rgba(14,37,75,0.12)",
                        boxShadow: "0 4px 18px rgba(14,37,75,0.08)",
                        transition: "all 0.3s ease",
                      }}
                    >
                      <div
                        className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 mt-1"
                        style={{
                          width: "36px",
                          height: "36px",
                          background: "rgba(14,37,75,0.08)",
                          color: BRAND.primary,
                        }}
                      >
                        <tile.icon size={16} />
                      </div>
                      <div className="flex-grow-1 ms-3">
                        <small
                          className="text-uppercase fw-semibold mb-1 d-block"
                          style={{ color: BRAND.muted, fontSize: "0.75rem" }}
                        >
                          {tile.label}
                        </small>
                        <span
                          className="fw-semibold d-block"
                          style={{ color: BRAND.primary }}
                        >
                          {tile.value}
                        </span>
                        <small className="text-muted">{tile.description}</small>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-6">
          <div
            className="card border-0 h-100"
            style={{
              borderRadius: "14px",
              background: BRAND.surface,
              boxShadow: "0 12px 32px rgba(14, 37, 75, 0.18)",
              transition: "all 0.3s ease",
            }}
          >
            <div
              className="card-header bg-transparent border-0 py-3 px-4"
              style={{
                background: "rgba(14,37,75,0.04)",
                borderBottom: "2px solid rgba(14,37,75,0.08)",
                borderRadius: "14px 14px 0 0",
              }}
            >
              <div className="d-flex align-items-center">
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center me-3 flex-shrink-0"
                  style={{
                    width: "44px",
                    height: "44px",
                    background: "#FF8A4C",
                    color: "#fff",
                    boxShadow: "0 6px 16px rgba(255,138,76,0.45)",
                  }}
                >
                  <FaUserShield />
                </div>
                <div>
                  <h6 className="mb-0 fw-bold" style={{ color: BRAND.primary }}>
                    System Access & Security
                  </h6>
                  <small className="text-muted">
                    Administrative privileges and security notices
                  </small>
                </div>
              </div>
            </div>
            <div className="card-body p-4">
              <div
                className="rounded-3 p-3 mb-4"
                style={{
                  background: "rgba(14,37,75,0.05)",
                  border: "1px solid rgba(14,37,75,0.12)",
                }}
              >
                <strong
                  className="d-block mb-2"
                  style={{ color: BRAND.primary }}
                >
                  ICT Administrator Privileges:
                </strong>
                <ul className="mb-0 small" style={{ color: BRAND.muted }}>
                  {privileges.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className="row g-2">
                <div className="col-12">
                  <button
                    type="button"
                    className="btn ict-gradient-btn w-100 d-flex align-items-center justify-content-center py-2 position-relative overflow-hidden"
                    onClick={handlePasswordChange}
                  >
                    <FaKey className="me-2 flex-shrink-0" />
                    Change Administrator Password
                  </button>
                </div>
              </div>

              <div
                className="mt-4 p-3 rounded-3 text-center"
                style={{
                  background: "rgba(255,138,76,0.08)",
                  border: "1px solid rgba(255,138,76,0.25)",
                }}
              >
                <small className="text-muted d-block">
                  <FaShieldAlt className="me-1" />
                  For security reasons, profile edits are restricted. Contact
                  the system administrator for major account changes.
                </small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IctProfile;
