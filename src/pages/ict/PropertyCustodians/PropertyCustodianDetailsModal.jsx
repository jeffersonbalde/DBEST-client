import React, { useState, useEffect, useCallback } from "react";
import Portal from "../../../components/Portal/Portal";

const PropertyCustodianDetailsModal = ({ custodian, onClose }) => {
  const [isClosing, setIsClosing] = useState(false);

  const getCustodianAvatarUrl = useCallback((entity) => {
    if (!entity) return "";

    // IGNORE the existing avatar_url and always use our custom endpoint
    if (entity.avatar_path) {
      const baseUrl = import.meta.env.VITE_LARAVEL_API;

      // Extract just the filename from the path
      let cleanFilename = entity.avatar_path;

      // Remove 'avatars/' prefix if present
      if (entity.avatar_path.includes("avatars/")) {
        cleanFilename = entity.avatar_path.replace("avatars/", "");
      }

      // Remove any path prefixes and get just the filename
      cleanFilename = cleanFilename.split("/").pop();

      // Use the custodian-avatar endpoint
      return `${baseUrl}/custodian-avatar/${cleanFilename}`;
    }

    return "";
  }, []);

  const getInitials = (firstName, lastName) => {
    const first = firstName ? firstName.charAt(0) : "";
    const last = lastName ? lastName.charAt(0) : "";
    return (first + last).toUpperCase() || "PC";
  };

  const handleBackdropClick = async (e) => {
    if (e.target === e.currentTarget) {
      await closeModal();
    }
  };

  const handleEscapeKey = async (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      await closeModal();
    }
  };

  React.useEffect(() => {
    document.addEventListener("keydown", handleEscapeKey);

    return () => {
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, []);

  const closeModal = async () => {
    setIsClosing(true);
    await new Promise((resolve) => setTimeout(resolve, 200));
    onClose();
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      return "Invalid Date";
    }
  };

  const getStatusInfo = (isActive) => {
    if (isActive) {
      return { label: "Active", color: "success", icon: "fa-check-circle" };
    }
    return { label: "Inactive", color: "danger", icon: "fa-times-circle" };
  };

  const statusInfo = getStatusInfo(custodian.is_active);

  const CustodianAvatar = () => {
    if (custodian.avatar_path) {
      const avatarUrl = getCustodianAvatarUrl(custodian);
      return (
        <div
          className="rounded-circle overflow-hidden border"
          style={{
            width: "80px",
            height: "80px",
            borderColor: "#e1e6ef",
            backgroundColor: "#f4f6fb",
          }}
        >
          <img
            src={avatarUrl}
            alt={`${custodian.first_name}'s avatar`}
            className="rounded-circle border"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
            onError={(e) => {
              e.target.style.display = "none";
            }}
          />
        </div>
      );
    }

    return (
      <div
        className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold"
        style={{
          width: "80px",
          height: "80px",
          backgroundColor: "#0E254B",
          fontSize: "24px",
        }}
      >
        {getInitials(custodian.first_name, custodian.last_name)}
      </div>
    );
  };

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
            style={{
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
            }}
          >
            {/* Header */}
            <div
              className="modal-header border-0 text-white modal-smooth"
              style={{ backgroundColor: "#0E254B" }}
            >
              <h5 className="modal-title fw-bold">
                <i className="fas fa-user me-2"></i>
                Property Custodian Details
              </h5>
              <button
                type="button"
                className="btn-close btn-close-white btn-smooth"
                onClick={closeModal}
                aria-label="Close"
              ></button>
            </div>

            <div
              className="modal-body bg-light modal-smooth"
              style={{ maxHeight: "70vh", overflowY: "auto" }}
            >
              {/* Custodian Summary Card */}
              <div className="card border-0 bg-white mb-4">
                <div className="card-body">
                  <div className="row align-items-center">
                    <div className="col-auto">
                      <CustodianAvatar />
                    </div>
                    <div className="col">
                      <h4 className="mb-1 text-dark">
                        {custodian.first_name} {custodian.last_name}
                      </h4>
                      {custodian.email && (
                        <p className="text-muted mb-2">{custodian.email}</p>
                      )}
                      <div className="d-flex flex-wrap gap-2 mt-2">
                        <span className={`badge bg-${statusInfo.color} fs-6`}>
                          <i className={`fas ${statusInfo.icon} me-1`}></i>
                          {statusInfo.label}
                        </span>
                        <span className="badge bg-light text-dark border border-1 fs-6">
                          <i className="fas fa-at me-1 text-primary"></i>
                          {custodian.username}
                        </span>
                        <span className="badge bg-info fs-6">
                          <i className="fas fa-user-tie me-1"></i>
                          Property Custodian
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="row g-3">
                {/* Basic Information */}
                <div className="col-12 col-md-6">
                  <div className="card border-0 bg-white h-100">
                    <div className="card-header bg-transparent border-bottom-0">
                      <h6 className="mb-0 fw-semibold text-dark">
                        <i className="fas fa-info-circle me-2 text-primary"></i>
                        Basic Information
                      </h6>
                    </div>
                    <div className="card-body">
                      <div className="mb-3">
                        <label className="form-label small fw-semibold text-muted mb-1">
                          Username
                        </label>
                        <p className="mb-0 fw-semibold text-dark">
                          @{custodian.username}
                        </p>
                      </div>
                      <div className="mb-3">
                        <label className="form-label small fw-semibold text-muted mb-1">
                          First Name
                        </label>
                        <p className="mb-0 fw-semibold text-dark">
                          {custodian.first_name}
                        </p>
                      </div>
                      <div className="mb-3">
                        <label className="form-label small fw-semibold text-muted mb-1">
                          Last Name
                        </label>
                        <p className="mb-0 fw-semibold text-dark">
                          {custodian.last_name}
                        </p>
                      </div>
                      {custodian.email && (
                        <div className="mb-3">
                          <label className="form-label small fw-semibold text-muted mb-1">
                            Email Address
                          </label>
                          <p className="mb-0 fw-semibold text-dark">
                            {custodian.email}
                          </p>
                        </div>
                      )}
                      <div>
                        <label className="form-label small fw-semibold text-muted mb-1">
                          Assigned School
                        </label>
                        <p className="mb-0 fw-semibold text-dark">
                          {custodian.school?.name || "No school assigned"}
                        </p>
                        {custodian.school?.deped_code && (
                          <small className="text-muted">
                            DepEd Code: {custodian.school.deped_code}
                          </small>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="col-12 col-md-6">
                  <div className="card border-0 bg-white h-100">
                    <div className="card-header bg-transparent border-bottom-0">
                      <h6 className="mb-0 fw-semibold text-dark">
                        <i className="fas fa-user-shield me-2 text-success"></i>
                        Contact & Account Information
                      </h6>
                    </div>
                    <div className="card-body">
                      <div className="mb-3">
                        <label className="form-label small fw-semibold text-muted mb-1">
                          Contact Number
                        </label>
                        <p className="mb-0 fw-semibold text-dark">
                          {custodian.phone || "Not provided"}
                        </p>
                      </div>
                      {custodian.school && (
                        <div className="mb-3">
                          <label className="form-label small fw-semibold text-muted mb-1">
                            School Details
                          </label>
                          <p className="mb-0 fw-semibold text-dark">
                            {custodian.school.address || "Address not set"}
                          </p>
                          <small className="text-muted">
                            {[
                              custodian.school.region,
                              custodian.school.division,
                              custodian.school.district,
                            ]
                              .filter(Boolean)
                              .join(" • ") || "No region/division info"}
                          </small>
                        </div>
                      )}
                      <div className="mb-3">
                        <label className="form-label small fw-semibold text-muted mb-1">
                          Account Status
                        </label>
                        <div>
                          <span className={`badge bg-${statusInfo.color}`}>
                            <i className={`fas ${statusInfo.icon} me-1`}></i>
                            {statusInfo.label}
                          </span>
                        </div>
                      </div>
                      <div className="mb-3">
                        <label className="form-label small fw-semibold text-muted mb-1">
                          Role
                        </label>
                        <div>
                          <span className="badge bg-info">
                            <i className="fas fa-user-tie me-1"></i>
                            Property Custodian
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Account Timeline */}
                <div className="col-12">
                  <div className="card border-0 bg-white">
                    <div className="card-header bg-transparent border-bottom-0">
                      <h6 className="mb-0 fw-semibold text-dark">
                        <i className="fas fa-history me-2 text-info"></i>
                        Account Timeline
                      </h6>
                    </div>
                    <div className="card-body">
                      <div className="row">
                        <div className="col-12 col-md-6 mb-3">
                          <label className="form-label small fw-semibold text-muted mb-1">
                            Registration Date
                          </label>
                          <p className="mb-0 fw-semibold text-dark">
                            {formatDate(custodian.created_at)}
                          </p>
                        </div>
                        <div className="col-12 col-md-6 mb-3">
                          <label className="form-label small fw-semibold text-muted mb-1">
                            Last Updated
                          </label>
                          <p className="mb-0 fw-semibold text-dark">
                            {formatDate(custodian.updated_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="modal-footer border-top bg-white modal-smooth">
              <button
                type="button"
                className="btn btn-outline-secondary btn-smooth"
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

export default PropertyCustodianDetailsModal;
