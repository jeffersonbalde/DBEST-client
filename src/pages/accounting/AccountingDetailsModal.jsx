import React, { useEffect, useState, useCallback } from "react";
import Portal from "../../components/Portal/Portal";

const getAccountingAvatarUrl = (accounting) => {
  if (!accounting) return null;

  // IGNORE the existing avatar_url and always use our custom endpoint
  if (accounting.avatar_path) {
    const baseUrl = import.meta.env.VITE_LARAVEL_API;

    // Extract just the filename from the path
    let cleanFilename = accounting.avatar_path;

    // Remove 'avatars/' prefix if present
    if (accounting.avatar_path.includes("avatars/")) {
      cleanFilename = accounting.avatar_path.replace("avatars/", "");
    }

    // Remove any path prefixes and get just the filename
    cleanFilename = cleanFilename.split("/").pop();

    // Use the accounting-avatar endpoint
    return `${baseUrl}/accounting-avatar/${cleanFilename}`;
  }

  return null;
};

const AccountingAvatar = ({ accounting, size = 96 }) => {
  const avatarUrl = getAccountingAvatarUrl(accounting);

  if (avatarUrl) {
    return (
      <div
        className="rounded-circle overflow-hidden border shadow-sm"
        style={{
          width: size,
          height: size,
          borderColor: "#e1e6ef",
          backgroundColor: "#f4f6fb",
          flexShrink: 0,
        }}
      >
        <img
          src={avatarUrl}
          alt={`${
            accounting?.name || accounting?.first_name || "Accounting"
          } avatar`}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>
    );
  }

  const initials = accounting
    ? `${accounting.first_name?.charAt(0) || ""}${
        accounting.last_name?.charAt(0) || ""
      }`.toUpperCase() || "AC"
    : "AC";

  return (
    <div
      className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold shadow-sm"
      style={{
        width: size,
        height: size,
        backgroundColor: "#0E254B",
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
};

const formatDateTime = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Invalid date";
  return date.toLocaleString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const AccountingDetailsModal = ({ accounting, onClose }) => {
  const [isClosing, setIsClosing] = useState(false);

  const closeModal = useCallback(async () => {
    setIsClosing(true);
    await new Promise((resolve) => setTimeout(resolve, 200));
    onClose();
  }, [onClose]);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      closeModal();
    }
  };

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") closeModal();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [closeModal]);

  const infoRow = (label, value) => (
    <div className="mb-3">
      <label className="form-label small fw-semibold text-muted mb-1">
        {label}
      </label>
      <p className="mb-0 fw-semibold text-dark">{value || "N/A"}</p>
    </div>
  );

  const fullName = accounting
    ? accounting.name ||
      `${accounting.first_name || ""} ${accounting.last_name || ""}`.trim()
    : "N/A";

  return (
    <Portal>
      <div
        className={`modal fade show d-block modal-backdrop-animation ${
          isClosing ? "exit" : ""
        }`}
        style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
        onClick={handleBackdropClick}
        tabIndex="-1"
      >
        <div className="modal-dialog modal-dialog-centered modal-lg mx-3 mx-sm-auto">
          <div
            className={`modal-content border-0 modal-content-animation ${
              isClosing ? "exit" : ""
            }`}
            style={{ boxShadow: "0 25px 80px rgba(0,0,0,0.35)" }}
          >
            <div
              className="modal-header border-0 text-white"
              style={{ backgroundColor: "#0E254B" }}
            >
              <h5 className="modal-title fw-bold">
                <i className="fas fa-user me-2" />
                Accounting Account Details
              </h5>
              <button
                type="button"
                className="btn-close btn-close-white"
                aria-label="Close"
                onClick={closeModal}
              ></button>
            </div>

            <div
              className="modal-body bg-light"
              style={{ maxHeight: "75vh", overflowY: "auto" }}
            >
              <div className="card border-0 shadow-sm mb-4">
                <div className="card-body d-flex flex-column flex-sm-row align-items-center gap-3">
                  <AccountingAvatar accounting={accounting} size={110} />
                  <div className="text-center text-sm-start">
                    <h4 className="fw-bold mb-1" style={{ color: "#0E254B" }}>
                      {fullName}
                    </h4>
                    <p className="text-muted mb-2">
                      {accounting?.username || "No username"}
                    </p>
                    <div className="d-flex flex-wrap gap-2 justify-content-center justify-content-sm-start">
                      <span
                        className={`badge ${
                          accounting?.is_active ? "bg-success" : "bg-secondary"
                        }`}
                      >
                        <i className="fas fa-circle me-1" />
                        {accounting?.is_active ? "Active" : "Inactive"}
                      </span>
                      {accounting?.email && (
                        <span className="badge bg-primary">
                          <i className="fas fa-envelope me-1" />
                          {accounting.email}
                        </span>
                      )}
                      <span className="badge bg-info">
                        <i className="fas fa-calculator me-1" />
                        Accounting
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="row g-3">
                <div className="col-12 col-md-6">
                  <div className="card border-0 shadow-sm h-100">
                    <div className="card-header bg-transparent border-bottom-0">
                      <h6
                        className="mb-0 fw-semibold"
                        style={{ color: "#0E254B" }}
                      >
                        <i className="fas fa-user-circle me-2 text-primary" />
                        Basic Information
                      </h6>
                    </div>
                    <div className="card-body">
                      {infoRow(
                        "Username",
                        accounting?.username ? `@${accounting.username}` : "N/A"
                      )}
                      {infoRow("First Name", accounting?.first_name || "N/A")}
                      {infoRow("Last Name", accounting?.last_name || "N/A")}
                      {infoRow("Email Address", accounting?.email || "N/A")}
                    </div>
                  </div>
                </div>

                <div className="col-12 col-md-6">
                  <div className="card border-0 shadow-sm h-100">
                    <div className="card-header bg-transparent border-bottom-0">
                      <h6
                        className="mb-0 fw-semibold"
                        style={{ color: "#0E254B" }}
                      >
                        <i className="fas fa-address-book me-2 text-success" />
                        Contact & Status
                      </h6>
                    </div>
                    <div className="card-body">
                      {infoRow("Contact Number", accounting?.phone || "N/A")}
                      {infoRow(
                        "Account Status",
                        accounting?.is_active ? (
                          <span className="badge bg-success">
                            <i className="fas fa-check-circle me-1" />
                            Active
                          </span>
                        ) : (
                          <span className="badge bg-secondary">
                            <i className="fas fa-times-circle me-1" />
                            Inactive
                          </span>
                        )
                      )}
                      {infoRow(
                        "Role",
                        <span className="badge bg-info">
                          <i className="fas fa-calculator me-1" />
                          Accounting
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="col-12">
                  <div className="card border-0 shadow-sm">
                    <div className="card-header bg-transparent border-bottom-0">
                      <h6
                        className="mb-0 fw-semibold"
                        style={{ color: "#0E254B" }}
                      >
                        <i className="fas fa-history me-2 text-info" />
                        Account Timeline
                      </h6>
                    </div>
                    <div className="card-body row">
                      <div className="col-12 col-md-6">
                        {infoRow(
                          "Registered On",
                          formatDateTime(accounting?.created_at)
                        )}
                      </div>
                      <div className="col-12 col-md-6">
                        {infoRow(
                          "Last Updated",
                          formatDateTime(accounting?.updated_at)
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer border-top bg-white">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={closeModal}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
};

export default AccountingDetailsModal;
