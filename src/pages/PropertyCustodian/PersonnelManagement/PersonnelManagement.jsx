import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { showAlert, showToast } from "../../../services/notificationService";
import PersonnelFormModal from "./PersonnelFormModal";
import PersonnelDetailsModal from "./PersonnelDetailsModal";
import DeactivateModal from "./DeactivateModal";

const formatDateTime = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }
  return date.toLocaleString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getPersonnelAvatarUrl = (entry) => {
  if (!entry?.avatar_path) return null;
  const baseUrl = import.meta.env.VITE_LARAVEL_API;
  let cleanFilename = entry.avatar_path;
  if (cleanFilename.includes("personnel-avatars/")) {
    cleanFilename = cleanFilename.replace("personnel-avatars/", "");
  }
  cleanFilename = cleanFilename.split("/").pop();
  return `${baseUrl}/personnel-avatar/${cleanFilename}`;
};

const PersonnelAvatar = ({ entry, size = 44 }) => {
  const avatarUrl = getPersonnelAvatarUrl(entry);

  if (avatarUrl) {
    return (
      <div
        className="rounded-circle overflow-hidden border"
        style={{
          width: size,
          height: size,
          borderColor: "#e1e6ef",
          flexShrink: 0,
          backgroundColor: "#f4f6fb",
        }}
      >
        <img
          src={avatarUrl}
          alt={`${entry.first_name} ${entry.last_name}`}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          onError={(e) => {
            e.target.style.display = "none";
          }}
        />
      </div>
    );
  }

  const initials = `${entry.first_name?.charAt(0) || ""}${
    entry.last_name?.charAt(0) || ""
  }`
    .trim()
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold"
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

const StatsCardSkeleton = () => (
  <div className="card stats-card h-100">
    <div className="card-body p-3">
      <div className="d-flex align-items-center">
        <div className="flex-grow-1">
          <div className="text-xs fw-semibold text-uppercase mb-1 placeholder-wave">
            <span className="placeholder col-7" style={{ height: 14 }}></span>
          </div>
          <div className="h4 mb-0 fw-bold placeholder-wave">
            <span className="placeholder col-4" style={{ height: 28 }}></span>
          </div>
        </div>
        <div className="col-auto">
          <div className="placeholder-wave">
            <span
              className="placeholder rounded-circle"
              style={{ width: 48, height: 48, borderRadius: "50% !important" }}
            ></span>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const TableRowSkeleton = () => (
  <tr className="align-middle" style={{ height: "70px" }}>
    <td className="text-center">
      <div className="placeholder-wave">
        <span className="placeholder col-4" style={{ height: 16 }}></span>
      </div>
    </td>
    <td>
      <div className="d-flex justify-content-center gap-1">
        {[1, 2, 3, 4].map((item) => (
          <div
            key={item}
            className="placeholder action-placeholder"
            style={{ width: 32, height: 32, borderRadius: 6 }}
          ></div>
        ))}
      </div>
    </td>
    {[...Array(5)].map((_, idx) => (
      <td key={idx}>
        <div className="placeholder-wave mb-1">
          <span className="placeholder col-8" style={{ height: 16 }}></span>
        </div>
        <div className="placeholder-wave">
          <span className="placeholder col-6" style={{ height: 14 }}></span>
        </div>
      </td>
    ))}
  </tr>
);

const PersonnelManagement = () => {
  const { token } = useAuth();

  const [personnel, setPersonnel] = useState([]);
  const [filteredPersonnel, setFilteredPersonnel] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [actionLock, setActionLock] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState("last_name");
  const [sortDirection, setSortDirection] = useState("asc");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const [showFormModal, setShowFormModal] = useState(false);
  const [editingPersonnel, setEditingPersonnel] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedPersonnel, setSelectedPersonnel] = useState(null);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [targetPersonnel, setTargetPersonnel] = useState(null);

  const isActionDisabled = (id = null) =>
    actionLock || (actionLoading && actionLoading !== id);

  const fetchPersonnel = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const apiBase =
        import.meta.env.VITE_LARAVEL_API || "http://localhost:8000/api";
      const response = await fetch(
        `${apiBase.replace(
          /\/$/,
          ""
        )}/property-custodian/personnel?per_page=200`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to load personnel");
      }

      const data = await response.json();
      const list = Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data)
        ? data
        : [];
      setPersonnel(list);
    } catch (error) {
      console.error("Personnel fetch error:", error);
      showAlert.error(
        "Personnel Management",
        error.message || "Unable to load personnel records"
      );
      setPersonnel([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    fetchPersonnel();
  }, [fetchPersonnel, token]);

  const filterAndSortPersonnel = useCallback(() => {
    let list = [...personnel];

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter((entry) => {
        const values = [
          entry.first_name,
          entry.last_name,
          entry.employee_id,
          entry.id_number,
          entry.username,
          entry.position,
          entry.department,
          entry.employment_status,
          entry.employment_level,
        ];
        return values.some(
          (val) => val && String(val).toLowerCase().includes(term)
        );
      });
    }

    if (statusFilter !== "all") {
      list = list.filter((entry) =>
        statusFilter === "active" ? entry.is_active : !entry.is_active
      );
    }

    list.sort((a, b) => {
      const aValue = a[sortField] ?? "";
      const bValue = b[sortField] ?? "";

      if (sortField === "created_at" || sortField === "updated_at") {
        const aDate = aValue ? new Date(aValue) : new Date(0);
        const bDate = bValue ? new Date(bValue) : new Date(0);
        if (aDate < bDate) return sortDirection === "asc" ? -1 : 1;
        if (aDate > bDate) return sortDirection === "asc" ? 1 : -1;
        return 0;
      }

      const aString = String(aValue).toLowerCase();
      const bString = String(bValue).toLowerCase();
      if (aString < bString) return sortDirection === "asc" ? -1 : 1;
      if (aString > bString) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    setFilteredPersonnel(list);
    setCurrentPage(1);
  }, [personnel, searchTerm, statusFilter, sortField, sortDirection]);

  useEffect(() => {
    filterAndSortPersonnel();
  }, [filterAndSortPersonnel]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredPersonnel.length / itemsPerPage) || 1
  );
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentRecords = filteredPersonnel.slice(startIndex, endIndex);

  const handleSort = (field) => {
    if (actionLock) return;
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (field) => {
    if (sortField !== field) return "fas fa-sort text-muted";
    return sortDirection === "asc" ? "fas fa-sort-up" : "fas fa-sort-down";
  };

  const handleAddPersonnel = () => {
    setEditingPersonnel(null);
    setShowFormModal(true);
  };

  const handleEditPersonnel = (entry) => {
    setEditingPersonnel(entry);
    setShowFormModal(true);
  };

  const handleSavePersonnel = (entry) => {
    const wasEditing = Boolean(editingPersonnel);
    setPersonnel((prev) => {
      const exists = prev.some((item) => item.id === entry.id);
      if (exists) {
        return prev.map((item) => (item.id === entry.id ? entry : item));
      }
      return [entry, ...prev];
    });
    setShowFormModal(false);
    setEditingPersonnel(null);
    showToast.success(
      wasEditing ? "Personnel updated successfully" : "Personnel registered"
    );
  };

  const handleDeletePersonnel = async (entry) => {
    if (actionLock) {
      showToast.warning("Please wait until the current action completes");
      return;
    }

    const confirmation = await showAlert.confirm(
      "Remove Personnel",
      `Are you sure you want to remove ${entry.first_name} ${entry.last_name}?`,
      "Yes, remove",
      "Cancel"
    );

    if (!confirmation.isConfirmed) return;

    try {
      setActionLock(true);
      setActionLoading(entry.id);
      showAlert.processing("Deleting", "Removing personnel from roster...");

      const apiBase =
        import.meta.env.VITE_LARAVEL_API || "http://localhost:8000/api";
      const response = await fetch(
        `${apiBase.replace(/\/$/, "")}/property-custodian/personnel/${
          entry.id
        }`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to delete personnel");
      }

      setPersonnel((prev) => prev.filter((item) => item.id !== entry.id));
      showToast.success("Personnel removed successfully");
    } catch (error) {
      console.error("Delete personnel error:", error);
      showAlert.error(
        "Error removing personnel",
        error.message || "Please try again later"
      );
    } finally {
      showAlert.close();
      setActionLoading(null);
      setActionLock(false);
    }
  };

  const handleDeactivateClick = (entry) => {
    setTargetPersonnel(entry);
    setShowDeactivateModal(true);
  };

  const handleDeactivateConfirm = async (reason) => {
    if (!targetPersonnel) return;
    if (actionLock) {
      showToast.warning("Please wait until the current action completes");
      return;
    }

    try {
      setActionLock(true);
      setActionLoading(targetPersonnel.id);
      showAlert.processing(
        "Deactivating Personnel",
        "Saving the deactivation details..."
      );

      const apiBase =
        import.meta.env.VITE_LARAVEL_API || "http://localhost:8000/api";
      const response = await fetch(
        `${apiBase.replace(/\/$/, "")}/property-custodian/personnel/${
          targetPersonnel.id
        }/deactivate`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ deactivate_reason: reason }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to deactivate personnel");
      }

      setPersonnel((prev) =>
        prev.map((item) =>
          item.id === data.personnel.id ? data.personnel : item
        )
      );
      showToast.success("Personnel deactivated");
      setShowDeactivateModal(false);
      setTargetPersonnel(null);
    } catch (error) {
      console.error("Status toggle error:", error);
      showAlert.error(
        "Status update failed",
        error.message || "Unable to update personnel status"
      );
    } finally {
      showAlert.close();
      setActionLoading(null);
      setActionLock(false);
    }
  };

  const handleActivate = async (entry) => {
    if (actionLock) {
      showToast.warning("Please wait until the current action completes");
      return;
    }

    const confirmation = await showAlert.confirm(
      "Reactivate Personnel",
      `Allow ${entry.first_name} ${entry.last_name} to access the portal again?`,
      "Reactivate",
      "Cancel"
    );

    if (!confirmation.isConfirmed) return;

    try {
      setActionLock(true);
      setActionLoading(entry.id);
      showAlert.processing(
        "Reactivating Personnel",
        "Restoring personnel access..."
      );

      const apiBase =
        import.meta.env.VITE_LARAVEL_API || "http://localhost:8000/api";
      const response = await fetch(
        `${apiBase.replace(/\/$/, "")}/property-custodian/personnel/${
          entry.id
        }/activate`,
        {
          method: "PATCH",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to activate personnel");
      }

      setPersonnel((prev) =>
        prev.map((item) =>
          item.id === data.personnel.id ? data.personnel : item
        )
      );
      showToast.success("Personnel account reactivated");
    } catch (error) {
      console.error("Activate personnel error:", error);
      showAlert.error(
        "Status update failed",
        error.message || "Unable to update personnel status"
      );
    } finally {
      showAlert.close();
      setActionLoading(null);
      setActionLock(false);
    }
  };

  const handleViewDetails = (entry) => {
    setSelectedPersonnel(entry);
    setShowDetailsModal(true);
  };

  const handleRefresh = async () => {
    if (actionLock) {
      showToast.warning("Please wait until the current action completes");
      return;
    }
    await fetchPersonnel();
    showToast.info("Personnel data refreshed");
  };

  const totalActive = personnel.filter((entry) => entry.is_active).length;

  const EmptyState = () => (
    <div className="text-center py-5">
      <div className="mb-3">
        <i
          className="fas fa-users fa-3x"
          style={{ color: "var(--text-muted)", opacity: 0.5 }}
        ></i>
      </div>
      <h5 className="mb-2" style={{ color: "var(--text-muted)" }}>
        {personnel.length === 0
          ? "No personnel registered yet"
          : "No matching results"}
      </h5>
      <p className="mb-3 small" style={{ color: "var(--text-muted)" }}>
        {personnel.length === 0
          ? "Register your first accountable personnel to begin tracking assignments."
          : "Try adjusting your search or filters to see other profiles."}
      </p>
      <button
        className="btn btn-sm"
        onClick={handleAddPersonnel}
        style={{
          border: "2px solid var(--primary-color)",
          color: "var(--primary-color)",
          backgroundColor: "transparent",
          transition: "all 0.2s ease-in-out",
        }}
        onMouseEnter={(e) => {
          e.target.style.backgroundColor = "var(--primary-color)";
          e.target.style.color = "white";
        }}
        onMouseLeave={(e) => {
          e.target.style.backgroundColor = "transparent";
          e.target.style.color = "var(--primary-color)";
        }}
      >
        <i className="fas fa-user-plus me-1"></i>
        Add Personnel
      </button>
    </div>
  );

  const renderStatusBadge = (entry) => (
    <span
      className={`badge ${entry.is_active ? "bg-success" : "bg-secondary"}`}
    >
      {entry.is_active ? "Active" : "Inactive"}
    </span>
  );

  return (
    <div className="container-fluid px-3 py-2 schools-management-container fadeIn">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-3">
        <div className="flex-grow-1 mb-2 mb-md-0">
          <h1
            className="h4 mb-1 fw-bold"
            style={{ color: "var(--text-primary)" }}
          >
            Personnel Management
          </h1>
          <p className="mb-0 small" style={{ color: "var(--text-muted)" }}>
            Manage personnel across your schools for assignments,
            accountability, and quick updates.
          </p>
        </div>
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <button
            className="btn btn-sm btn-primary text-white"
            onClick={handleAddPersonnel}
            disabled={isActionDisabled()}
            style={{
              transition: "all 0.2s ease-in-out",
              borderWidth: "2px",
            }}
            onMouseEnter={(e) => {
              if (!e.target.disabled) {
                e.target.style.transform = "translateY(-1px)";
                e.target.style.boxShadow = "0 4px 8px rgba(0,0,0,0.1)";
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "translateY(0)";
              e.target.style.boxShadow = "none";
            }}
          >
            <i className="fas fa-user-plus me-1"></i>
            Add Personnel
          </button>
          <button
            className="btn btn-sm"
            onClick={handleRefresh}
            disabled={loading || isActionDisabled()}
            style={{
              transition: "all 0.2s ease-in-out",
              border: "2px solid var(--primary-color)",
              color: "var(--primary-color)",
              backgroundColor: "transparent",
            }}
            onMouseEnter={(e) => {
              if (!e.target.disabled) {
                e.target.style.transform = "translateY(-1px)";
                e.target.style.boxShadow = "0 4px 8px rgba(0,0,0,0.1)";
                e.target.style.backgroundColor = "var(--primary-color)";
                e.target.style.color = "white";
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "translateY(0)";
              e.target.style.boxShadow = "none";
              e.target.style.backgroundColor = "transparent";
              e.target.style.color = "var(--primary-color)";
            }}
          >
            <i className="fas fa-sync-alt me-1"></i>
            Refresh
          </button>
        </div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-6 col-md-3">
          {loading ? (
            <StatsCardSkeleton />
          ) : (
            <div className="card stats-card h-100">
              <div className="card-body p-3">
                <div className="d-flex align-items-center">
                  <div className="flex-grow-1">
                    <div
                      className="text-xs fw-semibold text-uppercase mb-1"
                      style={{ color: "var(--primary-color)" }}
                    >
                      Total Personnel
                    </div>
                    <div
                      className="h4 mb-0 fw-bold"
                      style={{ color: "var(--primary-color)" }}
                    >
                      {personnel.length}
                    </div>
                  </div>
                  <div className="col-auto">
                    <i
                      className="fas fa-users fa-2x"
                      style={{ color: "var(--primary-light)", opacity: 0.7 }}
                    ></i>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="col-6 col-md-3">
          {loading ? (
            <StatsCardSkeleton />
          ) : (
            <div className="card stats-card h-100">
              <div className="card-body p-3">
                <div className="d-flex align-items-center">
                  <div className="flex-grow-1">
                    <div
                      className="text-xs fw-semibold text-uppercase mb-1"
                      style={{ color: "var(--accent-color)" }}
                    >
                      Active Profiles
                    </div>
                    <div
                      className="h4 mb-0 fw-bold"
                      style={{ color: "var(--accent-color)" }}
                    >
                      {totalActive}
                    </div>
                  </div>
                  <div className="col-auto">
                    <i
                      className="fas fa-check-circle fa-2x"
                      style={{ color: "var(--accent-light)", opacity: 0.7 }}
                    ></i>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="col-6 col-md-3">
          {loading ? (
            <StatsCardSkeleton />
          ) : (
            <div className="card stats-card h-100">
              <div className="card-body p-3">
                <div className="d-flex align-items-center">
                  <div className="flex-grow-1">
                    <div
                      className="text-xs fw-semibold text-uppercase mb-1"
                      style={{ color: "var(--primary-dark)" }}
                    >
                      Filtered Results
                    </div>
                    <div
                      className="h4 mb-0 fw-bold"
                      style={{ color: "var(--primary-dark)" }}
                    >
                      {filteredPersonnel.length}
                    </div>
                  </div>
                  <div className="col-auto">
                    <i
                      className="fas fa-filter fa-2x"
                      style={{ color: "var(--primary-color)", opacity: 0.7 }}
                    ></i>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="col-6 col-md-3">
          {loading ? (
            <StatsCardSkeleton />
          ) : (
            <div className="card stats-card h-100">
              <div className="card-body p-3">
                <div className="d-flex align-items-center">
                  <div className="flex-grow-1">
                    <div
                      className="text-xs fw-semibold text-uppercase mb-1"
                      style={{ color: "var(--primary-dark)" }}
                    >
                      Current Page
                    </div>
                    <div
                      className="h4 mb-0 fw-bold"
                      style={{ color: "var(--primary-dark)" }}
                    >
                      {currentPage}/{totalPages}
                    </div>
                  </div>
                  <div className="col-auto">
                    <i
                      className="fas fa-file-alt fa-2x"
                      style={{ color: "var(--primary-color)", opacity: 0.7 }}
                    ></i>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div
        className="card border-0 shadow-sm mb-3"
        style={{ backgroundColor: "var(--background-white)" }}
      >
        <div className="card-body p-3">
          <div className="row g-3 align-items-center flex-wrap">
            <div className="col-12 col-lg-6 d-flex flex-column">
              <label
                className="form-label small fw-semibold mb-1"
                style={{ color: "var(--text-muted)" }}
              >
                Search Personnel
              </label>
              <div className="input-group input-group-sm">
                <span
                  className="input-group-text"
                  style={{
                    backgroundColor: "var(--background-light)",
                    borderColor: "var(--input-border)",
                    color: "var(--text-muted)",
                  }}
                >
                  <i className="fas fa-search"></i>
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search by name, employee no., department, or username"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  disabled={loading || isActionDisabled()}
                  style={{
                    backgroundColor: "var(--input-bg)",
                    borderColor: "var(--input-border)",
                    color: "var(--input-text)",
                  }}
                />
                {searchTerm && (
                  <button
                    className="btn btn-sm clear-search-btn"
                    type="button"
                    onClick={() => setSearchTerm("")}
                    disabled={loading || isActionDisabled()}
                    style={{
                      color: "#6c757d",
                      backgroundColor: "transparent",
                      border: "none",
                      padding: "0.25rem 0.5rem",
                      transition: "all 0.2s ease-in-out",
                    }}
                    onMouseEnter={(e) => {
                      if (!e.target.disabled) {
                        const icon = e.target.querySelector("i");
                        e.target.style.color = "#fff";
                        e.target.style.backgroundColor = "#dc3545";
                        if (icon) icon.style.color = "#fff";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!e.target.disabled) {
                        const icon = e.target.querySelector("i");
                        e.target.style.color = "#6c757d";
                        e.target.style.backgroundColor = "transparent";
                        if (icon) icon.style.color = "#6c757d";
                      }
                    }}
                  >
                    <i className="fas fa-times"></i>
                  </button>
                )}
              </div>
            </div>
            <div className="col-12 col-sm-6 col-md-3 col-lg-3 d-flex flex-column">
              <label
                className="form-label small fw-semibold mb-1"
                style={{ color: "var(--text-muted)" }}
              >
                Status
              </label>
              <select
                className="form-select form-select-sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                disabled={loading || isActionDisabled()}
                style={{
                  backgroundColor: "var(--input-bg)",
                  borderColor: "var(--input-border)",
                  color: "var(--input-text)",
                }}
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="col-12 col-sm-6 col-md-3 col-lg-3 d-flex flex-column">
              <label
                className="form-label small fw-semibold mb-1"
                style={{ color: "var(--text-muted)" }}
              >
                Items per page
              </label>
              <select
                className="form-select form-select-sm"
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                disabled={loading || isActionDisabled()}
                style={{
                  backgroundColor: "var(--input-bg)",
                  borderColor: "var(--input-border)",
                  color: "var(--input-text)",
                }}
              >
                <option value="5">5 per page</option>
                <option value="10">10 per page</option>
                <option value="20">20 per page</option>
                <option value="50">50 per page</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div
        className="card border-0 shadow-sm"
        style={{ backgroundColor: "var(--background-white)" }}
      >
        <div
          className="card-header border-bottom-0 py-2"
          style={{
            background: "var(--topbar-bg)",
            color: "var(--topbar-text)",
          }}
        >
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="card-title mb-0 fw-semibold text-white">
              <i className="fas fa-users me-2"></i>
              Personnel Registry
              {!loading && (
                <small className="opacity-75 ms-2 text-white">
                  ({filteredPersonnel.length} found
                  {searchTerm || statusFilter !== "all"
                    ? " after filtering"
                    : ""}
                  )
                </small>
              )}
            </h5>
          </div>
        </div>
        <div className="card-body p-0">
          {loading ? (
            <div className="table-responsive">
              <table className="table table-striped table-hover mb-0">
                <thead style={{ backgroundColor: "var(--background-light)" }}>
                  <tr>
                    {[
                      "#",
                      "Actions",
                      "Personnel Information",
                      "Role & Assignment",
                      "Contact",
                      "Status",
                      "Registered",
                    ].map((label, idx) => (
                      <th
                        key={label}
                        className={`${
                          idx === 0
                            ? "text-center"
                            : label === "Status"
                            ? "text-center"
                            : ""
                        } small fw-semibold`}
                        style={{ color: "var(--text-primary)" }}
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...Array(5)].map((_, index) => (
                    <TableRowSkeleton key={index} />
                  ))}
                </tbody>
              </table>
              <div className="text-center py-4">
                <div
                  className="spinner-border me-2"
                  style={{ color: "var(--primary-color)" }}
                  role="status"
                >
                  <span className="visually-hidden">Loading...</span>
                </div>
                <span className="small" style={{ color: "var(--text-muted)" }}>
                  Fetching personnel data...
                </span>
              </div>
            </div>
          ) : currentRecords.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              <div className="table-responsive">
                <table className="table table-striped table-hover mb-0">
                  <thead style={{ backgroundColor: "var(--background-light)" }}>
                    <tr>
                      <th
                        style={{
                          width: "5%",
                          color: "var(--text-primary)",
                        }}
                        className="text-center small fw-semibold"
                      >
                        #
                      </th>
                      <th
                        style={{
                          width: "18%",
                          minWidth: "220px",
                          color: "var(--text-primary)",
                        }}
                        className="text-center small fw-semibold"
                      >
                        Actions
                      </th>
                      <th
                        style={{
                          width: "30%",
                          color: "var(--text-primary)",
                        }}
                        className="small fw-semibold"
                      >
                        <button
                          className="btn btn-link p-0 border-0 text-decoration-none fw-semibold text-start"
                          onClick={() => handleSort("last_name")}
                          disabled={isActionDisabled()}
                          style={{ color: "var(--text-primary)" }}
                        >
                          Personnel Information
                          <i
                            className={`ms-1 ${getSortIcon("last_name")}`}
                            style={{ color: "var(--text-primary)" }}
                          ></i>
                        </button>
                      </th>
                      <th
                        style={{
                          width: "20%",
                          color: "var(--text-primary)",
                        }}
                        className="small fw-semibold"
                      >
                        Role & Assignment
                      </th>
                      <th
                        style={{
                          width: "17%",
                          color: "var(--text-primary)",
                        }}
                        className="small fw-semibold"
                      >
                        Contact
                      </th>
                      <th
                        style={{
                          width: "10%",
                          color: "var(--text-primary)",
                        }}
                        className="text-center small fw-semibold"
                      >
                        Status
                      </th>
                      <th
                        style={{
                          width: "8%",
                          color: "var(--text-primary)",
                        }}
                        className="small fw-semibold"
                      >
                        <button
                          className="btn btn-link p-0 border-0 text-decoration-none fw-semibold text-start"
                          onClick={() => handleSort("created_at")}
                          disabled={isActionDisabled()}
                          style={{ color: "var(--text-primary)" }}
                        >
                          Registered
                          <i
                            className={`ms-1 ${getSortIcon("created_at")}`}
                            style={{ color: "var(--text-primary)" }}
                          ></i>
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentRecords.map((entry, index) => (
                      <tr
                        key={entry.id}
                        className="align-middle"
                        style={{ height: "70px" }}
                      >
                        <td
                          className="text-center fw-bold"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {startIndex + index + 1}
                        </td>
                        <td className="text-center" style={{ minWidth: 220 }}>
                          <div className="d-flex justify-content-center gap-2 flex-wrap">
                            <button
                              className="btn btn-info btn-sm text-white"
                              onClick={() => handleViewDetails(entry)}
                              disabled={isActionDisabled(entry.id)}
                              title="View Details"
                              style={{
                                width: 32,
                                height: 32,
                                borderRadius: 6,
                                padding: 0,
                                transition: "all 0.2s ease-in-out",
                              }}
                              onMouseEnter={(e) => {
                                if (!e.currentTarget.disabled) {
                                  e.currentTarget.style.transform =
                                    "translateY(-1px)";
                                  e.currentTarget.style.boxShadow =
                                    "0 4px 8px rgba(0,0,0,0.2)";
                                }
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.transform =
                                  "translateY(0)";
                                e.currentTarget.style.boxShadow = "none";
                              }}
                            >
                              {actionLoading === entry.id ? (
                                <span
                                  className="spinner-border spinner-border-sm"
                                  role="status"
                                ></span>
                              ) : (
                                <i
                                  className="fas fa-eye"
                                  style={{ fontSize: "0.875rem" }}
                                ></i>
                              )}
                            </button>
                            <button
                              className="btn btn-success btn-sm text-white"
                              onClick={() => handleEditPersonnel(entry)}
                              disabled={isActionDisabled(entry.id)}
                              title="Edit Personnel"
                              style={{
                                width: 32,
                                height: 32,
                                borderRadius: 6,
                                padding: 0,
                                transition: "all 0.2s ease-in-out",
                              }}
                              onMouseEnter={(e) => {
                                if (!e.currentTarget.disabled) {
                                  e.currentTarget.style.transform =
                                    "translateY(-1px)";
                                  e.currentTarget.style.boxShadow =
                                    "0 4px 8px rgba(0,0,0,0.2)";
                                }
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.transform =
                                  "translateY(0)";
                                e.currentTarget.style.boxShadow = "none";
                              }}
                            >
                              <i
                                className="fas fa-edit"
                                style={{ fontSize: "0.875rem" }}
                              ></i>
                            </button>
                            {entry.is_active ? (
                              <button
                                className="btn btn-warning btn-sm text-white"
                                onClick={() => handleDeactivateClick(entry)}
                                disabled={isActionDisabled(entry.id)}
                                title="Deactivate"
                                style={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: 6,
                                  padding: 0,
                                  transition: "all 0.2s ease-in-out",
                                }}
                                onMouseEnter={(e) => {
                                  if (!e.currentTarget.disabled) {
                                    e.currentTarget.style.transform =
                                      "translateY(-1px)";
                                    e.currentTarget.style.boxShadow =
                                      "0 4px 8px rgba(0,0,0,0.2)";
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.transform =
                                    "translateY(0)";
                                  e.currentTarget.style.boxShadow = "none";
                                }}
                              >
                                <i
                                  className="fas fa-user-slash"
                                  style={{ fontSize: "0.875rem" }}
                                ></i>
                              </button>
                            ) : (
                              <button
                                className="btn btn-secondary btn-sm text-white"
                                onClick={() => handleActivate(entry)}
                                disabled={isActionDisabled(entry.id)}
                                title="Reactivate"
                                style={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: 6,
                                  padding: 0,
                                  transition: "all 0.2s ease-in-out",
                                }}
                                onMouseEnter={(e) => {
                                  if (!e.currentTarget.disabled) {
                                    e.currentTarget.style.transform =
                                      "translateY(-1px)";
                                    e.currentTarget.style.boxShadow =
                                      "0 4px 8px rgba(0,0,0,0.2)";
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.transform =
                                    "translateY(0)";
                                  e.currentTarget.style.boxShadow = "none";
                                }}
                              >
                                <i
                                  className="fas fa-user-check"
                                  style={{ fontSize: "0.875rem" }}
                                ></i>
                              </button>
                            )}
                            <button
                              className="btn btn-danger btn-sm text-white"
                              onClick={() => handleDeletePersonnel(entry)}
                              disabled={isActionDisabled(entry.id)}
                              title="Delete Personnel"
                              style={{
                                width: 32,
                                height: 32,
                                borderRadius: 6,
                                padding: 0,
                                transition: "all 0.2s ease-in-out",
                              }}
                              onMouseEnter={(e) => {
                                if (!e.currentTarget.disabled) {
                                  e.currentTarget.style.transform =
                                    "translateY(-1px)";
                                  e.currentTarget.style.boxShadow =
                                    "0 4px 8px rgba(0,0,0,0.2)";
                                }
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.transform =
                                  "translateY(0)";
                                e.currentTarget.style.boxShadow = "none";
                              }}
                            >
                              <i
                                className="fas fa-trash"
                                style={{ fontSize: "0.875rem" }}
                              ></i>
                            </button>
                          </div>
                        </td>
                        <td style={{ maxWidth: 320, overflow: "hidden" }}>
                          <div className="d-flex align-items-center gap-3">
                            <PersonnelAvatar entry={entry} />
                            <div
                              className="flex-grow-1"
                              style={{ minWidth: 0 }}
                            >
                              <div
                                className="fw-medium mb-1 text-truncate"
                                style={{ color: "var(--text-primary)" }}
                                title={`${entry.first_name} ${entry.last_name}`}
                              >
                                {entry.first_name} {entry.last_name}
                              </div>
                              <div
                                className="text-muted small text-truncate"
                                title={
                                  entry.employee_id || "Employee no. not set"
                                }
                              >
                                Employee No.: {entry.employee_id || "N/A"}
                              </div>
                              <div
                                className="text-muted small text-truncate"
                                title={entry.id_number || "ID no. not set"}
                              >
                                ID No.: {entry.id_number || "N/A"}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td style={{ maxWidth: 220, overflow: "hidden" }}>
                          <div
                            className="fw-semibold text-primary small mb-1 text-truncate"
                            title={entry.position || "No position set"}
                          >
                            {entry.position || "No position set"}
                          </div>
                          <div
                            className="text-muted small text-truncate"
                            title={entry.employment_status || "N/A"}
                          >
                            Status: {entry.employment_status || "N/A"}
                          </div>
                          <div
                            className="text-muted small text-truncate"
                            title={entry.employment_level || "Not specified"}
                          >
                            Level: {entry.employment_level || "Not specified"}
                          </div>
                        </td>
                        <td style={{ maxWidth: 220, overflow: "hidden" }}>
                          <div
                            className="text-muted small mb-1 text-truncate"
                            title={entry.username || "N/A"}
                          >
                            <i className="fas fa-user me-2 text-primary"></i>
                            {entry.username || "N/A"}
                          </div>
                          <div
                            className="text-muted small text-truncate"
                            title={entry.phone || "N/A"}
                          >
                            <i className="fas fa-phone me-2 text-success"></i>
                            {entry.phone || "N/A"}
                          </div>
                          {entry.rating && (
                            <div className="text-muted small">
                              <i className="fas fa-star me-2 text-warning"></i>
                              Rating: {entry.rating}
                            </div>
                          )}
                        </td>
                        <td className="text-center">
                          {renderStatusBadge(entry)}
                        </td>
                        <td>
                          <small style={{ color: "var(--text-muted)" }}>
                            {formatDateTime(entry.created_at)}
                          </small>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="card-footer bg-white border-top px-3 py-2">
                  <div className="d-flex flex-column flex-md-row justify-content-between align-items-center gap-2">
                    <div className="text-center text-md-start">
                      <small style={{ color: "var(--text-muted)" }}>
                        Showing{" "}
                        <span
                          className="fw-semibold"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {startIndex + 1}-
                          {Math.min(endIndex, filteredPersonnel.length)}
                        </span>{" "}
                        of{" "}
                        <span
                          className="fw-semibold"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {filteredPersonnel.length}
                        </span>{" "}
                        personnel
                      </small>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                      <button
                        className="btn btn-sm"
                        onClick={() =>
                          setCurrentPage((prev) => Math.max(prev - 1, 1))
                        }
                        disabled={currentPage === 1 || isActionDisabled()}
                        style={{
                          transition: "all 0.2s ease-in-out",
                          border: "2px solid var(--primary-color)",
                          color: "var(--primary-color)",
                          backgroundColor: "transparent",
                        }}
                        onMouseEnter={(e) => {
                          if (!e.currentTarget.disabled) {
                            e.currentTarget.style.transform =
                              "translateY(-1px)";
                            e.currentTarget.style.boxShadow =
                              "0 2px 4px rgba(0,0,0,0.1)";
                            e.currentTarget.style.backgroundColor =
                              "var(--primary-color)";
                            e.currentTarget.style.color = "white";
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = "translateY(0)";
                          e.currentTarget.style.boxShadow = "none";
                          e.currentTarget.style.backgroundColor = "transparent";
                          e.currentTarget.style.color = "var(--primary-color)";
                        }}
                      >
                        <i className="fas fa-chevron-left me-1"></i>
                        Previous
                      </button>
                      <div className="d-none d-md-flex gap-1">
                        {(() => {
                          let pages = [];
                          const maxVisiblePages = 5;

                          if (totalPages <= maxVisiblePages) {
                            pages = Array.from(
                              { length: totalPages },
                              (_, i) => i + 1
                            );
                          } else {
                            pages.push(1);
                            let start = Math.max(2, currentPage - 1);
                            let end = Math.min(totalPages - 1, currentPage + 1);

                            if (currentPage <= 2) {
                              end = 4;
                            } else if (currentPage >= totalPages - 1) {
                              start = totalPages - 3;
                            }

                            if (start > 2) {
                              pages.push("...");
                            }

                            for (let i = start; i <= end; i++) {
                              pages.push(i);
                            }

                            if (end < totalPages - 1) {
                              pages.push("...");
                            }

                            if (totalPages > 1) {
                              pages.push(totalPages);
                            }
                          }

                          return pages.map((page, idx) => (
                            <button
                              key={idx}
                              className="btn btn-sm"
                              onClick={() =>
                                page !== "..." && setCurrentPage(page)
                              }
                              disabled={page === "..." || isActionDisabled()}
                              style={{
                                transition: "all 0.2s ease-in-out",
                                border: `2px solid ${
                                  currentPage === page
                                    ? "var(--primary-color)"
                                    : "var(--input-border)"
                                }`,
                                color:
                                  currentPage === page
                                    ? "white"
                                    : "var(--text-primary)",
                                backgroundColor:
                                  currentPage === page
                                    ? "var(--primary-color)"
                                    : "transparent",
                                minWidth: 40,
                              }}
                              onMouseEnter={(e) => {
                                if (
                                  !e.currentTarget.disabled &&
                                  currentPage !== page
                                ) {
                                  e.currentTarget.style.transform =
                                    "translateY(-1px)";
                                  e.currentTarget.style.boxShadow =
                                    "0 2px 4px rgba(0,0,0,0.1)";
                                  e.currentTarget.style.backgroundColor =
                                    "var(--primary-color)";
                                  e.currentTarget.style.color = "white";
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (
                                  !e.currentTarget.disabled &&
                                  currentPage !== page
                                ) {
                                  e.currentTarget.style.transform =
                                    "translateY(0)";
                                  e.currentTarget.style.boxShadow = "none";
                                  e.currentTarget.style.backgroundColor =
                                    "transparent";
                                  e.currentTarget.style.color =
                                    "var(--text-primary)";
                                }
                              }}
                            >
                              {page}
                            </button>
                          ));
                        })()}
                      </div>
                      <div className="d-md-none">
                        <small style={{ color: "var(--text-muted)" }}>
                          Page {currentPage} of {totalPages}
                        </small>
                      </div>
                      <button
                        className="btn btn-sm"
                        onClick={() =>
                          setCurrentPage((prev) =>
                            Math.min(prev + 1, totalPages)
                          )
                        }
                        disabled={
                          currentPage === totalPages || isActionDisabled()
                        }
                        style={{
                          transition: "all 0.2s ease-in-out",
                          border: "2px solid var(--primary-color)",
                          color: "var(--primary-color)",
                          backgroundColor: "transparent",
                        }}
                        onMouseEnter={(e) => {
                          if (!e.currentTarget.disabled) {
                            e.currentTarget.style.transform =
                              "translateY(-1px)";
                            e.currentTarget.style.boxShadow =
                              "0 2px 4px rgba(0,0,0,0.1)";
                            e.currentTarget.style.backgroundColor =
                              "var(--primary-color)";
                            e.currentTarget.style.color = "white";
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = "translateY(0)";
                          e.currentTarget.style.boxShadow = "none";
                          e.currentTarget.style.backgroundColor = "transparent";
                          e.currentTarget.style.color = "var(--primary-color)";
                        }}
                      >
                        Next
                        <i className="fas fa-chevron-right ms-1"></i>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {showFormModal && (
        <PersonnelFormModal
          token={token}
          personnel={editingPersonnel}
          existingPersonnel={personnel}
          onClose={() => {
            setShowFormModal(false);
            setEditingPersonnel(null);
          }}
          onSave={handleSavePersonnel}
        />
      )}

      {showDetailsModal && selectedPersonnel && (
        <PersonnelDetailsModal
          personnel={selectedPersonnel}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedPersonnel(null);
          }}
        />
      )}
      {showDeactivateModal && targetPersonnel && (
        <DeactivateModal
          user={targetPersonnel}
          loading={actionLoading === targetPersonnel.id}
          onClose={() => {
            setShowDeactivateModal(false);
            setTargetPersonnel(null);
          }}
          onDeactivate={handleDeactivateConfirm}
        />
      )}
    </div>
  );
};

export default PersonnelManagement;
