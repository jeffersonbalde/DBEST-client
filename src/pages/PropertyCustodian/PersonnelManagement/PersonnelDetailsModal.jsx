import React, { useEffect, useState, useCallback, useMemo } from "react";
import Portal from "../../../components/Portal/Portal";
import { useAuth } from "../../../contexts/AuthContext";
import { showAlert, showToast } from "../../../services/notificationService";

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

const getPersonnelAvatarUrl = (personnel) => {
  if (!personnel?.avatar_path) return null;
  const baseUrl = import.meta.env.VITE_LARAVEL_API;
  let cleanFilename = personnel.avatar_path;
  if (cleanFilename.includes("personnel-avatars/")) {
    cleanFilename = cleanFilename.replace("personnel-avatars/", "");
  }
  cleanFilename = cleanFilename.split("/").pop();
  return `${baseUrl}/personnel-avatar/${cleanFilename}`;
};

const PersonnelAvatar = ({ personnel, size = 96 }) => {
  const avatarUrl = getPersonnelAvatarUrl(personnel);

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
          alt={personnel?.full_name || "Personnel avatar"}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>
    );
  }

  const initials = `${personnel?.first_name?.charAt(0) || ""}${
    personnel?.last_name?.charAt(0) || ""
  }`
    .trim()
    .toUpperCase()
    .slice(0, 2);

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
      {initials || "PC"}
    </div>
  );
};

const infoRow = (label, value) => (
  <div className="mb-3">
    <label className="form-label small fw-semibold text-muted mb-1">
      {label}
    </label>
    <p className="mb-0 fw-semibold text-dark">{value || "N/A"}</p>
  </div>
);

const PersonnelDetailsModal = ({ personnel, onClose, onUpdate }) => {
  const { token } = useAuth();
  const [isClosing, setIsClosing] = useState(false);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [schoolInventoryItems, setSchoolInventoryItems] = useState([]);
  const [dcpInventoryItems, setDcpInventoryItems] = useState([]);

  const assignedItems = useMemo(() => {
    // Combine both school inventory and DCP inventory items
    const allItems = [
      ...schoolInventoryItems.map(item => ({
        ...item,
        type: 'school',
        source: 'School Inventory'
      })),
      ...dcpInventoryItems.map(item => ({
        ...item,
        type: 'dcp',
        source: 'DCP Package Inventory'
      }))
    ];
    return allItems;
  }, [schoolInventoryItems, dcpInventoryItems]);

  const fetchAssignedItems = useCallback(async () => {
    if (!personnel?.id || !token) {
      setSchoolInventoryItems([]);
      setDcpInventoryItems([]);
      return;
    }
    try {
      setLoadingAssignments(true);
      const apiBase = import.meta.env.VITE_LARAVEL_API || "http://localhost:8000/api";
      const baseUrl = apiBase.replace(/\/$/, "");

      // Fetch all School Inventory items and filter by personnel_id
      const schoolResponse = await fetch(
        `${baseUrl}/property-custodian/inventory?per_page=1000`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      // Fetch all DCP Inventory items and filter by personnel_id
      const dcpResponse = await fetch(
        `${baseUrl}/property-custodian/dcp-inventory?per_page=1000`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      // Process School Inventory - filter items assigned to this personnel
      if (schoolResponse.ok) {
        const schoolData = await schoolResponse.json();
        let allSchoolItems = [];
        if (schoolData.data && Array.isArray(schoolData.data)) {
          allSchoolItems = schoolData.data;
        } else if (Array.isArray(schoolData)) {
          allSchoolItems = schoolData;
        } else if (schoolData.items && Array.isArray(schoolData.items)) {
          allSchoolItems = schoolData.items;
        }
        // Filter by personnel_id
        const assignedSchoolItems = allSchoolItems.filter(item => item.personnel_id === personnel.id);
        setSchoolInventoryItems(assignedSchoolItems);
      } else {
        setSchoolInventoryItems([]);
      }

      // Process DCP Inventory - filter items assigned to this personnel
      if (dcpResponse.ok) {
        const dcpData = await dcpResponse.json();
        let allDcpItems = [];
        if (dcpData.data && Array.isArray(dcpData.data)) {
          allDcpItems = dcpData.data;
        } else if (Array.isArray(dcpData)) {
          allDcpItems = dcpData;
        } else if (dcpData.items && Array.isArray(dcpData.items)) {
          allDcpItems = dcpData.items;
        }
        // Filter by personnel_id
        const assignedDcpItems = allDcpItems.filter(item => item.personnel_id === personnel.id);
        setDcpInventoryItems(assignedDcpItems);
      } else {
        setDcpInventoryItems([]);
      }
    } catch (error) {
      console.error("Error fetching assigned items:", error);
      setSchoolInventoryItems([]);
      setDcpInventoryItems([]);
    } finally {
      setLoadingAssignments(false);
    }
  }, [personnel?.id, token]);

  useEffect(() => {
    if (personnel?.id) {
      fetchAssignedItems();
    }
  }, [personnel?.id, fetchAssignedItems]);

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

  if (!personnel) return null;

  const fullName = `${personnel.first_name || ""} ${
    personnel.last_name || ""
  }`.trim();

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
                <i className="fas fa-id-badge me-2" />
                Personnel Details
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
                  <PersonnelAvatar personnel={personnel} size={110} />
                  <div className="text-center text-sm-start">
                    <h4 className="fw-bold mb-1" style={{ color: "#0E254B" }}>
                      {fullName || "Personnel"}
                    </h4>
                    <p className="text-muted mb-2">
                      Employee No.: {personnel.employee_id || "N/A"} · ID No.: {" "}
                      {personnel.id_number || "N/A"}
                    </p>
                    <div className="d-flex flex-wrap gap-2 justify-content-center justify-content-sm-start">
                      <span
                        className={`badge ${personnel.is_active ? "bg-success" : "bg-secondary"}`}
                      >
                        <i className="fas fa-circle me-1" />
                        {personnel.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="row g-3">
                <div className="col-12 col-md-6">
                  <div className="card border-0 shadow-sm h-100">
                    <div className="card-header bg-transparent border-bottom-0">
                      <h6 className="mb-0 fw-semibold" style={{ color: "#0E254B" }}>
                        <i className="fas fa-briefcase me-2 text-primary" />
                        Employment Details
                      </h6>
                    </div>
                    <div className="card-body">
                      {infoRow("Position", personnel.position || "Not set")}
                      {infoRow("Department", personnel.department || "Not set")}
                      {infoRow("Employment Status", personnel.employment_status)}
                      {infoRow("Employment Level", personnel.employment_level)}
                      {infoRow("Subject Area", personnel.subject_area)}
                      {infoRow("Rating", personnel.rating || "Not set")}
                    </div>
                  </div>
                </div>

                <div className="col-12 col-md-6">
                  <div className="card border-0 shadow-sm h-100">
                    <div className="card-header bg-transparent border-bottom-0">
                      <h6 className="mb-0 fw-semibold" style={{ color: "#0E254B" }}>
                        <i className="fas fa-address-book me-2 text-success" />
                        Contact Information
                      </h6>
                    </div>
                    <div className="card-body">
                      {infoRow("Username", personnel.username)}
                      {infoRow("Phone", personnel.phone)}
                    </div>
                  </div>
                </div>

                <div className="col-12">
                  <div className="card border-0 shadow-sm">
                    <div className="card-header bg-transparent border-bottom-0">
                      <h6 className="mb-0 fw-semibold" style={{ color: "#0E254B" }}>
                        <i className="fas fa-laptop-house me-2 text-info" />
                        Assigned Items
                      </h6>
                    </div>
                    <div className="card-body">
                      {loadingAssignments ? (
                        <div className="text-center py-4">
                          <div className="spinner-border spinner-border-sm text-primary me-2" role="status">
                            <span className="visually-hidden">Loading...</span>
                          </div>
                          <span className="text-muted small">Loading assignments...</span>
                        </div>
                      ) : assignedItems.length === 0 ? (
                        <div className="text-center py-4">
                          <div className="text-muted small">
                            <i className="fas fa-box-open me-2"></i>
                            No assignments recorded
                          </div>
                        </div>
                      ) : (
                        <div className="table-responsive">
                          <table className="table table-sm align-middle">
                            <thead>
                              <tr className="text-muted small text-uppercase">
                                <th>Source</th>
                                <th>Item Name</th>
                                <th>Category</th>
                                <th>Serial Number</th>
                                <th>Quantity</th>
                                <th>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {assignedItems.map((item) => {
                                // Handle both School Inventory and DCP Inventory structures
                                const itemName = item.name || item.description || "Inventory Item";
                                const itemCategory = item.category || "Uncategorized";
                                const serialNumber = item.serial_number || "N/A";
                                const quantity = item.quantity || 1;
                                const status = item.status || item.condition_status || "N/A";
                                
                                return (
                                  <tr key={`${item.type}-${item.id}`}>
                                    <td>
                                      <span className={`badge ${
                                        item.type === 'school' ? 'bg-primary' : 'bg-info'
                                      }`}>
                                        {item.source}
                                      </span>
                                    </td>
                                    <td>
                                      <div className="fw-semibold">
                                        {itemName}
                                      </div>
                                    </td>
                                    <td className="text-muted small">
                                      {itemCategory}
                                    </td>
                                    <td className="text-muted small">
                                      {serialNumber}
                                    </td>
                                    <td className="text-muted small">
                                      {quantity} {item.unit_of_measure || 'pcs'}
                                    </td>
                                    <td>
                                      <span className={`badge ${
                                        status === 'SERVICEABLE' || status === 'Working' ? 'bg-success' :
                                        status === 'UNSERVICEABLE' || status === 'Unrepairable' ? 'bg-danger' :
                                        status === 'NEEDS REPAIR' || status === 'For Repair' || status === 'For Part Replacement' ? 'bg-warning' :
                                        status === 'MISSING/LOST' || status === 'Lost' ? 'bg-secondary' :
                                        'bg-secondary'
                                      }`}>
                                        {status}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {(personnel.notes || personnel.created_at || personnel.updated_at) && (
                  <div className="col-12">
                    <div className="card border-0 shadow-sm">
                      <div className="card-header bg-transparent border-bottom-0">
                        <h6 className="mb-0 fw-semibold" style={{ color: "#0E254B" }}>
                          <i className="fas fa-history me-2 text-warning" />
                          Timeline & Notes
                        </h6>
                      </div>
                      <div className="card-body row">
                        <div className="col-12 col-md-6">
                          {infoRow("Registered On", formatDateTime(personnel.created_at))}
                        </div>
                        <div className="col-12 col-md-6">
                          {infoRow("Last Updated", formatDateTime(personnel.updated_at))}
                        </div>
                        {personnel.notes && (
                          <div className="col-12">
                            <label className="form-label small fw-semibold text-muted mb-1">
                              Notes / Remarks
                            </label>
                            <p className="mb-0 text-muted">{personnel.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
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

export default PersonnelDetailsModal;
