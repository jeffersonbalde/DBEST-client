import React, { useEffect, useState, useCallback } from "react";
import Portal from "../../../components/Portal/Portal";

const getLaravelBase = () => {
  const fallback = window.location.origin + "/api";
  return (import.meta.env.VITE_LARAVEL_API || fallback).replace(
    /\/api\/?$/,
    ""
  );
};

const buildStorageUrl = (path = "") => {
  if (!path) return "";
  const cleaned = path
    .replace(/\\/g, "/")
    .replace(/^https?:\/\/[^/]+/i, "")
    .replace(/^\/?storage\//i, "")
    .replace(/^school-avatars\//i, "")
    .replace(/^\/+/, "");
  return `${getLaravelBase()}/storage/${cleaned}`;
};

const getSchoolAvatarUrl = (school) => {
  if (!school) return null;

  // IGNORE the existing avatar_url and always use our custom endpoint
  if (school.avatar_path) {
    const baseUrl = import.meta.env.VITE_LARAVEL_API;
    
    // Extract just the filename from the path
    let cleanFilename = school.avatar_path;
    
    // Remove 'school-avatars/' prefix if present
    if (school.avatar_path.includes('school-avatars/')) {
      cleanFilename = school.avatar_path.replace('school-avatars/', '');
    }
    
    // Remove any path prefixes and get just the filename
    cleanFilename = cleanFilename.split('/').pop();

    // Use the school-avatar endpoint
    return `${baseUrl}/school-avatar/${cleanFilename}`;
  }

  return null;
};

const SchoolAvatar = ({ school, size = 96 }) => {
  const avatarUrl = getSchoolAvatarUrl(school);

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
          alt={`${school?.name || "School"} avatar`}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>
    );
  }

  const initials = (school?.name || "S")
    .split(" ")
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();

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

const SchoolDetailsModal = ({ school, onClose }) => {
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
                <i className="fas fa-school me-2" />
                School Details
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
                  <SchoolAvatar school={school} size={110} />
                  <div className="text-center text-sm-start">
                    <h4 className="fw-bold mb-1" style={{ color: "#0E254B" }}>
                      {school.name}
                    </h4>
                    <p className="text-muted mb-2">
                      {school.deped_code || "No DepEd ID"}
                    </p>
                    <div className="d-flex flex-wrap gap-2 justify-content-center justify-content-sm-start">
                      <span
                        className={`badge ${
                          school.is_active ? "bg-success" : "bg-secondary"
                        }`}
                      >
                        <i className="fas fa-circle me-1" />
                        {school.is_active ? "Active" : "Inactive"}
                      </span>
                      {school.website && (
                        <a
                          href={school.website}
                          target="_blank"
                          rel="noreferrer"
                          className="badge bg-primary text-decoration-none"
                        >
                          <i className="fas fa-globe me-1" />
                          Visit Portal
                        </a>
                      )}
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
                        <i className="fas fa-map-marker-alt me-2 text-primary" />
                        Location Details
                      </h6>
                    </div>
                    <div className="card-body">
                      {infoRow("Region", school.region)}
                      {infoRow("Division", school.division)}
                      {infoRow("District", school.district)}
                      {infoRow("Address", school.address)}
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
                        Contact Information
                      </h6>
                    </div>
                    <div className="card-body">
                      {infoRow("Contact Person", school.contact_person)}
                      {infoRow("Contact Number", school.contact_phone)}
                      {infoRow("Contact Email", school.contact_email)}
                      {infoRow("Website/Portal", school.website)}
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
                        Registry Timeline
                      </h6>
                    </div>
                    <div className="card-body row">
                      <div className="col-12 col-md-6">
                        {infoRow(
                          "Registered On",
                          formatDateTime(school.created_at)
                        )}
                      </div>
                      <div className="col-12 col-md-6">
                        {infoRow(
                          "Last Updated",
                          formatDateTime(school.updated_at)
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

export default SchoolDetailsModal;
