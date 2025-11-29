import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { showAlert, showToast } from "../../../services/notificationService";
import SchoolFormModal from "./SchoolFormModal";
import SchoolDetailsModal from "./SchoolDetailsModal";

const SchoolsManagement = () => {
  const { token } = useAuth();
  const [schools, setSchools] = useState([]);
  const [filteredSchools, setFilteredSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [actionLock, setActionLock] = useState(false);

  const [showFormModal, setShowFormModal] = useState(false);
  const [editingSchool, setEditingSchool] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState("created_at");
  const [sortDirection, setSortDirection] = useState("desc");

  const fetchSchools = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${
          import.meta.env.VITE_LARAVEL_API || "http://localhost:8000/api"
        }/ict/schools`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSchools(data.schools || []);
      } else {
        throw new Error("Failed to load schools");
      }
    } catch (error) {
      console.error(error);
      showAlert.error("Error", "Unable to load DepEd schools");
      setSchools([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchSchools();
  }, [fetchSchools]);

  const filterAndSortSchools = useCallback(() => {
    let filtered = [...schools];

    if (searchTerm.trim()) {
      const lowered = searchTerm.toLowerCase();
      filtered = filtered.filter((school) => {
        const values = [
          school.name,
          school.deped_code,
          school.region,
          school.division,
          school.district,
          school.contact_person,
          school.contact_phone,
          school.contact_email,
        ];
        return values.some(
          (value) =>
            typeof value === "string" && value.toLowerCase().includes(lowered)
        );
      });
    }

    if (filterStatus !== "all") {
      filtered = filtered.filter((school) =>
        filterStatus === "active" ? school.is_active : !school.is_active
      );
    }

    filtered.sort((a, b) => {
      if (!sortField) return 0;

      if (sortField === "created_at" || sortField === "updated_at") {
        const aDate = a[sortField] ? new Date(a[sortField]) : new Date(0);
        const bDate = b[sortField] ? new Date(b[sortField]) : new Date(0);
        if (aDate < bDate) return sortDirection === "asc" ? -1 : 1;
        if (aDate > bDate) return sortDirection === "asc" ? 1 : -1;
        return 0;
      }

      const aValue = String(a[sortField] || "").toLowerCase();
      const bValue = String(b[sortField] || "").toLowerCase();
      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    setFilteredSchools(filtered);
    setCurrentPage(1);
  }, [schools, searchTerm, filterStatus, sortField, sortDirection]);

  useEffect(() => {
    filterAndSortSchools();
  }, [filterAndSortSchools]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredSchools.length / itemsPerPage) || 1
  );
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentSchools = filteredSchools.slice(startIndex, endIndex);

  const handleSort = (field) => {
    if (actionLock) return;
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleAddSchool = () => {
    setEditingSchool(null);
    setShowFormModal(true);
  };

  const handleEditSchool = (school) => {
    setEditingSchool(school);
    setShowFormModal(true);
  };

  const handleSaveSchool = (savedSchool) => {
    setSchools((prev) => {
      const exists = prev.some((school) => school.id === savedSchool.id);
      if (exists) {
        return prev.map((school) =>
          school.id === savedSchool.id ? savedSchool : school
        );
      }
      return [savedSchool, ...prev];
    });
    setShowFormModal(false);
    setEditingSchool(null);
    showToast.success(
      editingSchool
        ? "School updated successfully!"
        : "School registered successfully!"
    );
  };

  const handleDeleteSchool = async (school) => {
    if (actionLock) {
      showToast.warning("Please wait until the current action completes");
      return;
    }

    const confirmation = await showAlert.confirm(
      "Delete School",
      `Are you sure you want to delete ${school.name}?`,
      "Yes, Delete",
      "Cancel"
    );

    if (!confirmation.isConfirmed) return;

    setActionLock(true);
    setActionLoading(school.id);
    showAlert.processing("Deleting School", "Removing school from registry...");

    try {
      const response = await fetch(
        `${
          import.meta.env.VITE_LARAVEL_API || "http://localhost:8000/api"
        }/ict/schools/${school.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      if (response.ok) {
        setSchools((prev) => prev.filter((item) => item.id !== school.id));
        showToast.success("School deleted successfully!");
      } else {
        const data = await response.json();
        throw new Error(data.message || "Failed to delete school");
      }
    } catch (error) {
      console.error("Error deleting school:", error);
      showAlert.error("Error", error.message || "Failed to delete school");
    } finally {
      showAlert.close();
      setActionLoading(null);
      setActionLock(false);
    }
  };

  const handleRefresh = async () => {
    if (actionLock) {
      showToast.warning("Please wait until current action completes");
      return;
    }
    await fetchSchools();
    showToast.info("Data refreshed successfully");
  };

  const isActionDisabled = (id = null) =>
    actionLock || (actionLoading && actionLoading !== id);

  const getSortIcon = (field) => {
    if (sortField !== field) return "fas fa-sort text-muted";
    return sortDirection === "asc" ? "fas fa-sort-up" : "fas fa-sort-down";
  };

  const getApiBase = useCallback(() => {
    const fallback = window.location.origin + "/api";
    return (import.meta.env.VITE_LARAVEL_API || fallback).replace(
      /\/api\/?$/,
      ""
    );
  }, []);

  const getSchoolAvatarUrl = useCallback((school) => {
    if (!school) return null;
      if (school.avatar_path) {
        const baseUrl = import.meta.env.VITE_LARAVEL_API;
        let cleanFilename = school.avatar_path;
      if (school.avatar_path.includes("school-avatars/")) {
        cleanFilename = school.avatar_path.replace("school-avatars/", "");
      }
      cleanFilename = cleanFilename.split("/").pop();
      return `${baseUrl}/school-avatar/${cleanFilename}`;
    }
      return null;
  }, []);

const AvatarBadge = ({ school, size = 44 }) => {
  const getInitials = (name) => {
    if (!name) return "S";
    return name
      .split(" ")
      .map((part) => part.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (school.avatar_path) {
    const avatarUrl = getSchoolAvatarUrl(school);
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
          alt={`${school.name}'s avatar`}
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
        width: size,
        height: size,
        backgroundColor: "#0E254B",
        flexShrink: 0,
      }}
    >
      {getInitials(school.name)}
    </div>
  );
};

  const handleViewDetails = (school) => {
    setSelectedSchool(school);
    setShowDetailsModal(true);
  };

  const formatDateTime = (value, includeTime = true) => {
    if (!value) return "N/A";
    const options = includeTime
      ? {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
    }
      : { year: "numeric", month: "short", day: "numeric" };
    return new Date(value).toLocaleString("en-US", options);
  };

  // Skeleton loader for table rows with action button skeletons
  const TableRowSkeleton = () => {
    return (
    <tr className="align-middle" style={{ height: "70px" }}>
      <td className="text-center">
        <div className="placeholder-wave">
            <span
              className="placeholder col-4"
              style={{ height: "20px" }}
            ></span>
        </div>
      </td>
      <td className="text-center">
        <div className="d-flex justify-content-center gap-1">
            {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="placeholder action-placeholder"
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "6px",
                }}
            ></div>
          ))}
        </div>
      </td>
      <td>
          <div className="d-flex align-items-center">
            <div className="flex-grow-1">
        <div className="placeholder-wave mb-1">
                <span
                  className="placeholder col-8"
                  style={{ height: "16px" }}
                ></span>
        </div>
        <div className="placeholder-wave">
                <span
                  className="placeholder col-6"
                  style={{ height: "14px" }}
                ></span>
              </div>
            </div>
        </div>
      </td>
      <td>
        <div className="placeholder-wave mb-1">
            <span
              className="placeholder col-10"
              style={{ height: "16px" }}
            ></span>
        </div>
        <div className="placeholder-wave">
            <span
              className="placeholder col-8"
              style={{ height: "14px" }}
            ></span>
        </div>
      </td>
      <td>
        <div className="placeholder-wave mb-1">
            <span
              className="placeholder col-8"
              style={{ height: "16px" }}
            ></span>
        </div>
        <div className="placeholder-wave">
            <span
              className="placeholder col-6"
              style={{ height: "14px" }}
            ></span>
        </div>
      </td>
        <td>
          <div className="placeholder-wave">
          <span
            className="placeholder col-6"
              style={{ height: "16px" }}
          ></span>
        </div>
      </td>
      <td>
        <div className="placeholder-wave">
            <span
              className="placeholder col-8"
              style={{ height: "16px" }}
            ></span>
        </div>
      </td>
    </tr>
  );
  };

  // Skeleton loader for stats cards
  const StatsCardSkeleton = () => {
    return (
      <div className="card stats-card h-100">
        <div className="card-body p-3">
          <div className="d-flex align-items-center">
        <div className="flex-grow-1">
              <div className="text-xs fw-semibold text-uppercase mb-1 placeholder-wave">
            <span
                  className="placeholder col-7"
              style={{ height: "14px" }}
            ></span>
          </div>
              <div className="h4 mb-0 fw-bold placeholder-wave">
            <span
                  className="placeholder col-4"
              style={{ height: "28px" }}
            ></span>
              </div>
            </div>
            <div className="col-auto">
              <div className="placeholder-wave">
                <span
                  className="placeholder rounded-circle"
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "50% !important",
                  }}
                ></span>
              </div>
          </div>
        </div>
      </div>
    </div>
  );
  };

  const totalActive = schools.filter((s) => s.is_active).length;
  const totalInactive = schools.filter((s) => !s.is_active).length;

  return (
    <div className="container-fluid px-3 py-2 schools-management-container fadeIn">
      {/* Page Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-3">
        <div className="flex-grow-1 mb-2 mb-md-0">
          <h1
            className="h4 mb-1 fw-bold"
            style={{ color: "var(--text-primary)" }}
          >
            DepEd Schools Management
          </h1>
          <p className="mb-0 small" style={{ color: "var(--text-muted)" }}>
            Maintain the official list of DepEd schools for assignment and
            reporting
          </p>
        </div>
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <button
            className="btn btn-sm btn-primary text-white"
            onClick={handleAddSchool}
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
            <i className="fas fa-plus me-1"></i>
            Add School
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

      {/* Stats Cards at the Top */}
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
                      Total Schools
                  </div>
                    <div
                      className="h4 mb-0 fw-bold"
                      style={{ color: "var(--primary-color)" }}
                    >
                      {schools.length}
                    </div>
                  </div>
                  <div className="col-auto">
                    <i
                      className="fas fa-school fa-2x"
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
                      Active Schools
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
                      {filteredSchools.length}
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

      {/* Search and Filter Controls */}
      <div
        className="card border-0 shadow-sm mb-3"
        style={{ backgroundColor: "var(--background-white)" }}
      >
        <div className="card-body p-3">
          <div className="row g-2 align-items-end">
            <div className="col-md-6">
              <label
                className="form-label small fw-semibold mb-1"
                style={{ color: "var(--text-muted)" }}
              >
                Search Schools
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
                  placeholder="Search by name, DepEd ID, region, division, or contact..."
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
                    }}
                    onMouseEnter={(e) => {
                      if (!e.target.disabled) {
                        const icon = e.target.querySelector("i");
                        if (icon) icon.style.color = "white";
                        e.target.style.color = "white";
                        e.target.style.backgroundColor = "#dc3545";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!e.target.disabled) {
                        const icon = e.target.querySelector("i");
                        if (icon) icon.style.color = "#6c757d";
                        e.target.style.color = "#6c757d";
                        e.target.style.backgroundColor = "transparent";
                      }
                    }}
                  >
                    <i
                      className="fas fa-times"
                      style={{ color: "inherit" }}
                    ></i>
                  </button>
                )}
            </div>
            </div>
            <div className="col-md-3">
              <label
                className="form-label small fw-semibold mb-1"
                style={{ color: "var(--text-muted)" }}
              >
                Status
              </label>
              <select
                className="form-select form-select-sm"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
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
            <div className="col-md-3">
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

      {/* Main Content Card */}
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
              <i className="fas fa-list-check me-2"></i>
              DepEd Schools Registry
              {!loading && (
                <small className="opacity-75 ms-2 text-white">
                  ({filteredSchools.length} found
                  {searchTerm || filterStatus !== "all"
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
            // Loading state with action button skeletons
          <div className="table-responsive">
              <table className="table table-striped table-hover mb-0">
                <thead style={{ backgroundColor: "var(--background-light)" }}>
                  <tr>
                    <th className="text-center small fw-semibold">#</th>
                    <th className="text-center small fw-semibold">Actions</th>
                    <th className="small fw-semibold">
                      <button
                        className="btn btn-link p-0 border-0 text-decoration-none fw-semibold text-start text-white"
                        onClick={() => handleSort("name")}
                        disabled={isActionDisabled()}
                        style={{ color: "white" }}
                      >
                        School Information
                        <i
                          className={`ms-1 ${getSortIcon("name")}`}
                          style={{ color: "white" }}
                        ></i>
                      </button>
                    </th>
                    <th className="small fw-semibold text-white">
                      Region & Division
                    </th>
                    <th className="small fw-semibold text-white">
                      Contact Person
                    </th>
                    <th className="text-center small fw-semibold text-white">
                      Status
                    </th>
                    <th className="small fw-semibold">
                      <button
                        className="btn btn-link p-0 border-0 text-decoration-none fw-semibold text-start text-white"
                        onClick={() => handleSort("created_at")}
                        disabled={isActionDisabled()}
                        style={{ color: "white" }}
                      >
                        Registered
                        <i
                          className={`ms-1 ${getSortIcon("created_at")}`}
                          style={{ color: "white" }}
                        ></i>
                      </button>
                    </th>
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
                  Fetching schools data...
                </span>
              </div>
            </div>
          ) : currentSchools.length === 0 ? (
            // Empty state
            <div className="text-center py-5">
              <div className="mb-3">
                <i
                  className="fas fa-school fa-3x"
                  style={{ color: "var(--text-muted)", opacity: 0.5 }}
                ></i>
              </div>
              <h5 className="mb-2" style={{ color: "var(--text-muted)" }}>
                {schools.length === 0
                  ? "No Schools Registered"
                  : "No Matching Results"}
              </h5>
              <p className="mb-3 small" style={{ color: "var(--text-muted)" }}>
                {schools.length === 0
                  ? "No DepEd schools have been registered yet. Add the first school to get started."
                  : "Try adjusting your search criteria or filters."}
              </p>
              {searchTerm && (
                <button
                  className="btn btn-sm clear-search-main-btn"
                  onClick={() => setSearchTerm("")}
                  disabled={loading || isActionDisabled()}
                  style={{
                    color: "var(--primary-color)",
                    backgroundColor: "transparent",
                    border: "2px solid var(--primary-color)",
                    transition: "all 0.2s ease-in-out",
                  }}
                  onMouseEnter={(e) => {
                    if (!e.target.disabled) {
                      e.target.style.backgroundColor = "var(--primary-color)";
                      e.target.style.color = "white";
                      e.target.style.setProperty("color", "white", "important");
                      const icon = e.target.querySelector("i");
                      if (icon) {
                        icon.style.color = "white";
                        icon.style.setProperty("color", "white", "important");
                      }
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!e.target.disabled) {
                      e.target.style.backgroundColor = "transparent";
                      e.target.style.color = "var(--primary-color)";
                      e.target.style.setProperty(
                        "color",
                        "var(--primary-color)",
                        "important"
                      );
                      const icon = e.target.querySelector("i");
                      if (icon) {
                        icon.style.color = "var(--primary-color)";
                        icon.style.setProperty(
                          "color",
                          "var(--primary-color)",
                          "important"
                        );
                      }
                    }
                  }}
                >
                  <i
                    className="fas fa-times me-1"
                    style={{ color: "inherit" }}
                  ></i>
                  Clear Search
                </button>
              )}
            </div>
          ) : (
            // Loaded state with data
            <>
              <div className="table-responsive">
                <table className="table table-striped table-hover mb-0">
              <thead style={{ backgroundColor: "var(--background-light)" }}>
                <tr>
                  <th
                    style={{ width: "5%" }}
                    className="text-center small fw-semibold"
                  >
                    #
                  </th>
                  <th
                    style={{ width: "15%" }}
                    className="text-center small fw-semibold"
                  >
                    Actions
                  </th>
                      <th
                        style={{ width: "30%" }}
                        className="small fw-semibold text-white"
                      >
                    <button
                          className="btn btn-link p-0 border-0 text-decoration-none fw-semibold text-start text-white"
                      onClick={() => handleSort("name")}
                      disabled={isActionDisabled()}
                          style={{ color: "white" }}
                        >
                          School Information
                          <i
                            className={`ms-1 ${getSortIcon("name")}`}
                            style={{ color: "white" }}
                          ></i>
                    </button>
                  </th>
                      <th
                        style={{ width: "20%" }}
                        className="small fw-semibold text-white"
                      >
                    Region & Division
                  </th>
                      <th
                        style={{ width: "15%" }}
                        className="small fw-semibold text-white"
                      >
                    Contact Person
                  </th>
                  <th
                    style={{ width: "10%" }}
                        className="text-center small fw-semibold text-white"
                  >
                    Status
                  </th>
                      <th
                        style={{ width: "5%" }}
                        className="small fw-semibold text-white"
                      >
                    <button
                          className="btn btn-link p-0 border-0 text-decoration-none fw-semibold text-start text-white"
                      onClick={() => handleSort("created_at")}
                      disabled={isActionDisabled()}
                          style={{ color: "white" }}
                    >
                      Registered
                          <i
                            className={`ms-1 ${getSortIcon("created_at")}`}
                            style={{ color: "white" }}
                          ></i>
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                    {currentSchools.map((school, index) => {
                      const createdInfo = formatDateTime(school.created_at);
                    return (
                      <tr key={school.id} className="align-middle">
                        <td
                          className="text-center fw-bold"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {startIndex + index + 1}
                        </td>
                        <td className="text-center">
                            <div className="d-flex justify-content-center gap-1">
                            <button
                                className="btn btn-info btn-sm text-white"
                              onClick={() => handleViewDetails(school)}
                              disabled={isActionDisabled(school.id)}
                              title="View Details"
                                style={{
                                  width: "32px",
                                  height: "32px",
                                  borderRadius: "6px",
                                  transition: "all 0.2s ease-in-out",
                                  padding: 0,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                                onMouseEnter={(e) => {
                                  if (!e.target.disabled) {
                                    e.target.style.transform =
                                      "translateY(-1px)";
                                    e.target.style.boxShadow =
                                      "0 4px 8px rgba(0,0,0,0.2)";
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  e.target.style.transform = "translateY(0)";
                                  e.target.style.boxShadow = "none";
                                }}
                              >
                                {actionLoading === school.id ? (
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
                              onClick={() => handleEditSchool(school)}
                              disabled={isActionDisabled(school.id)}
                              title="Edit School"
                                style={{
                                  width: "32px",
                                  height: "32px",
                                  borderRadius: "6px",
                                  transition: "all 0.2s ease-in-out",
                                  padding: 0,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                                onMouseEnter={(e) => {
                                  if (!e.target.disabled) {
                                    e.target.style.transform =
                                      "translateY(-1px)";
                                    e.target.style.boxShadow =
                                      "0 4px 8px rgba(0,0,0,0.2)";
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  e.target.style.transform = "translateY(0)";
                                  e.target.style.boxShadow = "none";
                                }}
                              >
                                {actionLoading === school.id ? (
                                  <span
                                    className="spinner-border spinner-border-sm"
                                    role="status"
                                  ></span>
                                ) : (
                                  <i
                                    className="fas fa-edit"
                                    style={{ fontSize: "0.875rem" }}
                                  ></i>
                                )}
                            </button>

                            <button
                                className="btn btn-danger btn-sm text-white"
                              onClick={() => handleDeleteSchool(school)}
                              disabled={isActionDisabled(school.id)}
                              title="Delete School"
                                style={{
                                  width: "32px",
                                  height: "32px",
                                  borderRadius: "6px",
                                  transition: "all 0.2s ease-in-out",
                                  padding: 0,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                                onMouseEnter={(e) => {
                                  if (!e.target.disabled) {
                                    e.target.style.transform =
                                      "translateY(-1px)";
                                    e.target.style.boxShadow =
                                      "0 4px 8px rgba(0,0,0,0.2)";
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  e.target.style.transform = "translateY(0)";
                                  e.target.style.boxShadow = "none";
                                }}
                            >
                              {actionLoading === school.id ? (
                                <span
                                  className="spinner-border spinner-border-sm"
                                  role="status"
                                ></span>
                              ) : (
                                  <i
                                    className="fas fa-trash"
                                    style={{ fontSize: "0.875rem" }}
                                  ></i>
                              )}
                            </button>
                          </div>
                        </td>
                          <td style={{ maxWidth: "300px", overflow: "hidden" }}>
                          <div className="d-flex align-items-center gap-3">
                            <AvatarBadge school={school} />
                            <div
                                className="flex-grow-1"
                                style={{ minWidth: 0, overflow: "hidden" }}
                            >
                              <div
                                  className="fw-medium mb-1"
                                  style={{
                                    color: "var(--text-primary)",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                title={school.name}
                              >
                                {school.name}
                              </div>
                              <div
                                  className="small"
                                  style={{
                                    color: "var(--text-muted)",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                  title={`DepEd ID: ${
                                    school.deped_code || "N/A"
                                  }`}
                              >
                                DepEd ID: {school.deped_code || "N/A"}
                              </div>
                            </div>
                          </div>
                        </td>
                          <td style={{ maxWidth: "200px", overflow: "hidden" }}>
                          <div
                            style={{
                              color: "var(--text-primary)",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                            }}
                            title={school.region || "Region not set"}
                          >
                            {school.region || "Region not set"}
                          </div>
                          <div
                              className="small"
                              style={{
                                color: "var(--text-muted)",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            title={school.division || "Division not set"}
                          >
                            {school.division || "Division not set"}
                          </div>
                        </td>
                          <td style={{ maxWidth: "150px", overflow: "hidden" }}>
                          <div
                            style={{
                              color: "var(--text-primary)",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                            }}
                              title={
                                school.contact_person || "No contact person"
                              }
                          >
                            {school.contact_person || "No contact person"}
                          </div>
                          <div
                              className="small"
                              style={{
                                color: "var(--text-muted)",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            title={
                              school.contact_phone ||
                              school.contact_email ||
                              "No contact details"
                            }
                          >
                            {school.contact_phone ||
                              school.contact_email ||
                              "No contact details"}
                          </div>
                        </td>
                        <td className="text-center">
                          <span
                            className={`badge ${
                              school.is_active ? "bg-success" : "bg-secondary"
                            }`}
                          >
                            {school.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td>
                            <small style={{ color: "var(--text-muted)" }}>
                              {createdInfo}
                            </small>
                        </td>
                      </tr>
                    );
                    })}
              </tbody>
            </table>
          </div>

              {/* Pagination */}
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
                      {Math.min(endIndex, filteredSchools.length)}
                        </span>{" "}
                        of{" "}
                    <span
                      className="fw-semibold"
                          style={{ color: "var(--text-primary)" }}
                    >
                      {filteredSchools.length}
                        </span>{" "}
                    schools
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
                          if (!e.target.disabled) {
                            e.target.style.transform = "translateY(-1px)";
                            e.target.style.boxShadow =
                              "0 2px 4px rgba(0,0,0,0.1)";
                            e.target.style.backgroundColor =
                              "var(--primary-color)";
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

                          return pages.map((page, index) => (
                            <button
                              key={index}
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
                                minWidth: "40px",
                              }}
                              onMouseEnter={(e) => {
                                if (
                                  !e.target.disabled &&
                                  currentPage !== page
                                ) {
                                  e.target.style.transform = "translateY(-1px)";
                                  e.target.style.boxShadow =
                                    "0 2px 4px rgba(0,0,0,0.1)";
                                  e.target.style.backgroundColor =
                                    "var(--primary-color)";
                                  e.target.style.color = "white";
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (
                                  !e.target.disabled &&
                                  currentPage !== page
                                ) {
                                  e.target.style.transform = "translateY(0)";
                                  e.target.style.boxShadow = "none";
                                  e.target.style.backgroundColor =
                                    "transparent";
                                  e.target.style.color = "var(--text-primary)";
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
                          if (!e.target.disabled) {
                            e.target.style.transform = "translateY(-1px)";
                            e.target.style.boxShadow =
                              "0 2px 4px rgba(0,0,0,0.1)";
                            e.target.style.backgroundColor =
                              "var(--primary-color)";
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
          <SchoolFormModal
            school={editingSchool}
            onClose={() => {
              setShowFormModal(false);
              setEditingSchool(null);
            }}
            onSave={handleSaveSchool}
            token={token}
          />
        )}

        {showDetailsModal && selectedSchool && (
          <SchoolDetailsModal
            school={selectedSchool}
            onClose={() => {
              setShowDetailsModal(false);
              setSelectedSchool(null);
            }}
          />
        )}
    </div>
  );
};

export default SchoolsManagement;
