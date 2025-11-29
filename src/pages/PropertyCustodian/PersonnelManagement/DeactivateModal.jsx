import React, { useState, useEffect } from "react";
import Portal from "../../../components/Portal/Portal";
import { showAlert } from "../../../services/notificationService";

const DeactivateModal = ({ user, onClose, onDeactivate, loading }) => {
  const [reason, setReason] = useState("");
  const [isClosing, setIsClosing] = useState(false);

  const fullName = user ? `${user.first_name} ${user.last_name}` : "";

  const predefinedReasons = [
    "On leave / sabbatical",
    "Transferred to another school",
    "Separation from service",
    "Security concern",
    "Other",
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      showAlert.error("Validation", "Please provide a reason for deactivation.");
      return;
    }
    await onDeactivate(reason.trim());
  };

  const closeModal = async () => {
    if (loading) return;
    setIsClosing(true);
    await new Promise((resolve) => setTimeout(resolve, 200));
    onClose();
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      closeModal();
    }
  };

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        closeModal();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

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
        <div className="modal-dialog modal-dialog-centered mx-3 mx-sm-auto">
          <div
            className={`modal-content border-0 modal-content-animation ${
              isClosing ? "exit" : ""
            }`}
            style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}
          >
            <div
              className="modal-header border-0 text-white"
              style={{ backgroundColor: "#0E254B" }}
            >
              <h5 className="modal-title fw-bold">
                <i className="fas fa-user-slash me-2"></i>
                Deactivate Personnel
              </h5>
              <button
                type="button"
                className="btn-close btn-close-white"
                aria-label="Close"
                onClick={closeModal}
                disabled={loading}
              ></button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ backgroundColor: "#f8f9fa" }}>
                <div className="alert alert-warning border-0">
                  <i className="fas fa-exclamation-triangle me-2"></i>
                  You are about to deactivate <strong>{fullName}</strong>'s
                  portal access.
                </div>

                <label className="form-label small fw-semibold text-dark mb-2">
                  Reason for deactivation <span className="text-danger">*</span>
                </label>
                <div className="mb-2">
                  {predefinedReasons.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      className="btn btn-outline-secondary btn-sm me-2 mb-2"
                      onClick={() => setReason(preset)}
                      disabled={loading}
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                <textarea
                  className="form-control"
                  rows="4"
                  placeholder="Provide additional context or instructions..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  disabled={loading}
                  style={{ backgroundColor: "#fff" }}
                ></textarea>
                <div className="form-text">
                  This note will be shown to ICT admins when the user attempts to
                  log in.
                </div>
              </div>

              <div className="modal-footer border-0 bg-white">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={closeModal}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-danger text-white"
                  disabled={loading}
                  style={{ minWidth: 160 }}
                >
                  {loading ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm me-2"
                        role="status"
                      ></span>
                      Saving...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-user-slash me-2"></i>
                      Deactivate Personnel
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Portal>
  );
};

export default DeactivateModal;

