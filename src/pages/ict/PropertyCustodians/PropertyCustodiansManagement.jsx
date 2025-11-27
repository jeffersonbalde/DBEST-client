import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { showAlert, showToast } from "../../../services/notificationService";
import PropertyCustodianFormModal from "./PropertyCustodianFormModal";
import PropertyCustodianDetailsModal from "./PropertyCustodianDetailsModal";
import DeactivateModal from "./DeactivateModal";

const PropertyCustodiansManagement = () => {
  const { user: currentUser, token } = useAuth();
  const [custodians, setCustodians] = useState([]);
  const [filteredCustodians, setFilteredCustodians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [actionLock, setActionLock] = useState(false);

  // Modal states
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showCustodianForm, setShowCustodianForm] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [selectedCustodian, setSelectedCustodian] = useState(null);
  const [editingCustodian, setEditingCustodian] = useState(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState("created_at");
  const [sortDirection, setSortDirection] = useState("desc");

  const filterAndSortCustodians = useCallback(() => {
    let filtered = [...custodians];

    // Search filter
    if (searchTerm.trim()) {
      const loweredSearch = searchTerm.toLowerCase();
      filtered = filtered.filter((custodian) => {
        const fullName = `${custodian.first_name} ${custodian.last_name}`;
        const schoolName = custodian.school?.name || "";
        const fieldsToSearch = [
          fullName,
          custodian.username,
          custodian.phone,
          schoolName,
        ];
        return fieldsToSearch.some(
          (field) =>
            typeof field === "string" &&
            field.toLowerCase().includes(loweredSearch)
        );
      });
    }

    // Status filter
    if (filterStatus !== "all") {
      if (filterStatus === "active") {
        filtered = filtered.filter((custodian) => custodian.is_active === true);
      } else if (filterStatus === "inactive") {
        filtered = filtered.filter(
          (custodian) => custodian.is_active === false
        );
      }
    }

    // Sorting
    filtered.sort((a, b) => {
      if (!sortField) return 0;

      if (sortField === "created_at" || sortField === "updated_at") {
        const aDate = a[sortField] ? new Date(a[sortField]) : new Date(0);
        const bDate = b[sortField] ? new Date(b[sortField]) : new Date(0);

        if (aDate < bDate) return sortDirection === "asc" ? -1 : 1;
        if (aDate > bDate) return sortDirection === "asc" ? 1 : -1;
        return 0;
      }

      if (sortField === "name") {
        const aName = `${a.first_name} ${a.last_name}`.toLowerCase();
        const bName = `${b.first_name} ${b.last_name}`.toLowerCase();
        if (aName < bName) return sortDirection === "asc" ? -1 : 1;
        if (aName > bName) return sortDirection === "asc" ? 1 : -1;
        return 0;
      }

      const aValue = String(a[sortField] || "").toLowerCase();
      const bValue = String(b[sortField] || "").toLowerCase();

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    setFilteredCustodians(filtered);
    setCurrentPage(1);
  }, [custodians, searchTerm, filterStatus, sortField, sortDirection]);

  useEffect(() => {
    fetchCustodians();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    filterAndSortCustodians();
  }, [filterAndSortCustodians]);

  const fetchCustodians = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${
          import.meta.env.VITE_LARAVEL_API || "http://localhost:8000/api"
        }/ict/property-custodians`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const custodiansList = data.data || data || [];
        setCustodians(custodiansList);
      } else {
        throw new Error("Failed to fetch property custodians");
      }
    } catch (error) {
      console.error("Error fetching property custodians:", error);
      showAlert.error("Error", "Failed to load property custodians");
      setCustodians([]);
    } finally {
      setLoading(false);
    }
  };

  const refreshAllData = async () => {
    if (actionLock) {
      showToast.warning("Please wait until current action completes");
      return;
    }
    await fetchCustodians();
    showToast.info("Data refreshed successfully");
  };

  const handleSort = (field) => {
    if (actionLock) return;
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getCustodianAvatarUrl = useCallback((custodian) => {
    if (!custodian) return null;
    if (custodian.avatar_path) {
      const baseUrl = import.meta.env.VITE_LARAVEL_API;
      let cleanFilename = custodian.avatar_path;
      if (custodian.avatar_path.includes("avatars/")) {
        cleanFilename = custodian.avatar_path.replace("avatars/", "");
      }
      cleanFilename = cleanFilename.split("/").pop();
      return `${baseUrl}/custodian-avatar/${cleanFilename}`;
    }
    return null;
  }, []);

  const CustodianAvatar = ({ custodian, size = 44 }) => {
    const getInitials = (firstName, lastName) => {
      const first = firstName ? firstName.charAt(0) : "";
      const last = lastName ? lastName.charAt(0) : "";
      return (first + last).toUpperCase() || "PC";
    };

    if (custodian.avatar_path) {
      const avatarUrl = getCustodianAvatarUrl(custodian);
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
            alt={`${custodian.full_name}'s avatar`}
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
        {getInitials(custodian.first_name, custodian.last_name)}
      </div>
    );
  };

  const handleViewDetails = (custodian) => {
    if (actionLock) {
      showToast.warning("Please wait until the current action completes");
      return;
    }
    setSelectedCustodian(custodian);
    setShowDetailsModal(true);
  };

  const handleAddCustodian = () => {
    setEditingCustodian(null);
    setShowCustodianForm(true);
  };

  const handleEditCustodian = (custodian) => {
    setEditingCustodian(custodian);
    setShowCustodianForm(true);
  };

  const handleCustodianSave = (savedCustodian) => {
    if (editingCustodian) {
      setCustodians((prev) =>
        prev.map((custodian) =>
          custodian.id === savedCustodian.id ? savedCustodian : custodian
        )
      );
    } else {
      setCustodians((prev) => [...prev, savedCustodian]);
    }
    setShowCustodianForm(false);
    setEditingCustodian(null);
  };

  const handleDeactivate = (custodian) => {
    if (actionLock) {
      showToast.warning("Please wait until the current action completes");
      return;
    }
    if (custodian.id === currentUser?.id) {
      showAlert.error("Error", "You cannot deactivate your own account");
      return;
    }
    setSelectedCustodian(custodian);
    setShowDeactivateModal(true);
  };

  const handleDeactivateConfirm = async (deactivateReason) => {
    if (!selectedCustodian) return;

    setActionLock(true);
    setActionLoading(selectedCustodian.id);
    showAlert.processing(
      "Deactivating Property Custodian",
      "Please wait while we update the account status."
    );

    try {
      const response = await fetch(
        `${
          import.meta.env.VITE_LARAVEL_API || "http://localhost:8000/api"
        }/ict/property-custodians/${selectedCustodian.id}/deactivate`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            deactivate_reason: deactivateReason,
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        const updatedCustodian = data.custodian || data;
        showToast.success("Property custodian deactivated successfully!");
        setCustodians((prev) =>
          prev.map((c) => (c.id === updatedCustodian.id ? updatedCustodian : c))
        );
        setShowDeactivateModal(false);
        setSelectedCustodian(null);
      } else {
        throw new Error(
          data.message || "Failed to deactivate property custodian"
        );
      }
    } catch (error) {
      showAlert.close();
      console.error("Error deactivating property custodian:", error);
      showAlert.error(
        "Deactivation Failed",
        error.message || "Failed to deactivate property custodian"
      );
    } finally {
      showAlert.close();
      setActionLoading(null);
      setActionLock(false);
    }
  };

  const handleActivate = async (custodian) => {
    if (actionLock) {
      showToast.warning("Please wait until the current action completes");
      return;
    }

    const result = await showAlert.confirm(
      "Activate Property Custodian",
      `Are you sure you want to activate ${custodian.first_name} ${custodian.last_name}?`,
      "Yes, Activate",
      "Cancel"
    );

    if (!result.isConfirmed) return;

    setActionLock(true);
    setActionLoading(custodian.id);
    showAlert.processing(
      "Activating Property Custodian",
      "Please wait while we update the account status."
    );

    try {
      const response = await fetch(
        `${
          import.meta.env.VITE_LARAVEL_API || "http://localhost:8000/api"
        }/ict/property-custodians/${custodian.id}/activate`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        }
      );

      const data = await response.json();

      if (response.ok) {
        const updatedCustodian = data.custodian || data;
        showToast.success("Property custodian activated successfully!");
        setCustodians((prev) =>
          prev.map((c) => (c.id === updatedCustodian.id ? updatedCustodian : c))
        );
      } else {
        throw new Error(
          data.message || "Failed to activate property custodian"
        );
      }
    } catch (error) {
      showAlert.close();
      console.error("Error activating property custodian:", error);
      showAlert.error(
        "Activation Failed",
        error.message || "Failed to activate property custodian"
      );
    } finally {
      showAlert.close();
      setActionLoading(null);
      setActionLock(false);
    }
  };

  const handleDeleteCustodian = async (custodian) => {
    if (actionLock) {
      showToast.warning("Please wait until the current action completes");
      return;
    }

    if (custodian.id === currentUser?.id) {
      showAlert.error("Error", "You cannot delete your own account");
      return;
    }

    const confirmation = await showAlert.confirm(
      "Delete Property Custodian Account",
      `Are you sure you want to permanently delete ${custodian.first_name} ${custodian.last_name}'s account?`,
      "Yes, Delete",
      "Cancel"
    );

    if (!confirmation.isConfirmed) return;

    setActionLock(true);
    setActionLoading(custodian.id);
    showAlert.processing(
      "Deleting Property Custodian Account",
      "Please wait while we remove this user."
    );

    try {
      const response = await fetch(
        `${
          import.meta.env.VITE_LARAVEL_API || "http://localhost:8000/api"
        }/ict/property-custodians/${custodian.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      if (response.ok) {
        showToast.success("Property custodian account deleted successfully!");
        setCustodians((prev) => prev.filter((c) => c.id !== custodian.id));
      } else {
        const data = await response.json();
        throw new Error(
          data.message || "Failed to delete property custodian account"
        );
      }
    } catch (error) {
      showAlert.close();
      console.error("Error deleting property custodian:", error);
      showAlert.error(
        "Deletion Failed",
        error.message || "Failed to delete property custodian account"
      );
    } finally {
      showAlert.close();
      setActionLoading(null);
      setActionLock(false);
    }
  };

  const getSortIcon = (field) => {
    if (sortField !== field) return "fas fa-sort text-muted";
    return sortDirection === "asc" ? "fas fa-sort-up" : "fas fa-sort-down";
  };

  const isActionDisabled = (custodianId = null) => {
    return actionLock || (actionLoading && actionLoading !== custodianId);
  };

  const formatLocalDateTime = (dateString) => {
    if (!dateString) return { date: "N/A", time: "" };
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return { date: "Invalid Date", time: "" };
      return {
        date: date.toLocaleDateString("en-US", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }),
        time: date.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
    } catch (error) {
      return { date: "Date Error", time: "" };
    }
  };

  // Pagination
  const totalPages = Math.ceil(filteredCustodians.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentCustodians = filteredCustodians.slice(startIndex, endIndex);

  // Skeleton Loader for Table Rows
  const TableRowSkeleton = () => (
    <tr className="align-middle" style={{ height: "70px" }}>
      <td className="text-center">
        <div className="placeholder-wave">
          <span className="placeholder col-4" style={{ height: "20px" }}></span>
        </div>
      </td>
      <td className="text-center">
        <div className="d-flex justify-content-center gap-1">
          {[1, 2, 3, 4].map((item) => (
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
          <span className="placeholder col-8" style={{ height: "14px" }}></span>
        </div>
      </td>
      <td>
        <div className="placeholder-wave mb-1">
          <span className="placeholder col-8" style={{ height: "16px" }}></span>
        </div>
        <div className="placeholder-wave">
          <span className="placeholder col-6" style={{ height: "14px" }}></span>
        </div>
      </td>
      <td>
        <div className="placeholder-wave">
          <span className="placeholder col-6" style={{ height: "16px" }}></span>
        </div>
      </td>
      <td>
        <div className="placeholder-wave">
          <span className="placeholder col-8" style={{ height: "16px" }}></span>
        </div>
      </td>
    </tr>
  );

  // Skeleton Loader for Statistics Cards
  const StatsCardSkeleton = () => (
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

  return (
    <div className="container-fluid px-3 py-2 property-custodians-management-container fadeIn">
      {/* Page Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-3">
        <div className="flex-grow-1 mb-2 mb-md-0">
          <h1
            className="h4 mb-1 fw-bold"
            style={{ color: "var(--text-primary)" }}
          >
            Property Custodians Management
          </h1>
          <p className="mb-0 small" style={{ color: "var(--text-muted)" }}>
            Manage property custodian accounts and access permissions
          </p>
        </div>
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <button
            className="btn btn-sm btn-primary text-white"
            onClick={handleAddCustodian}
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
            Add Custodian
          </button>
          <button
            className="btn btn-sm"
            onClick={refreshAllData}
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

      {/* Statistics Cards */}
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
                      Total Custodians
                    </div>
                    <div
                      className="h4 mb-0 fw-bold"
                      style={{ color: "var(--primary-color)" }}
                    >
                      {custodians.length}
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
                      Active Custodians
                    </div>
                    <div
                      className="h4 mb-0 fw-bold"
                      style={{ color: "var(--accent-color)" }}
                    >
                      {custodians.filter((c) => c.is_active === true).length}
                    </div>
                  </div>
                  <div className="col-auto">
                    <i
                      className="fas fa-user-check fa-2x"
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
                      {filteredCustodians.length}
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
                Search Property Custodians
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
                  placeholder="Search by name, employee ID, email, position, or contact..."
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
              <i className="fas fa-users-cog me-2"></i>
              Property Custodians
              {!loading && (
                <small className="opacity-75 ms-2 text-white">
                  ({filteredCustodians.length} found
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
            <div className="table-responsive">
              <table className="table table-striped table-hover mb-0">
                <thead style={{ backgroundColor: "var(--background-light)" }}>
                  <tr>
                    <th className="text-center small fw-semibold">#</th>
                    <th className="text-center small fw-semibold">Actions</th>
                    <th className="small fw-semibold text-white">
                      <button
                        className="btn btn-link p-0 border-0 text-decoration-none fw-semibold text-start text-white"
                        onClick={() => handleSort("name")}
                        disabled={isActionDisabled()}
                        style={{ color: "white" }}
                      >
                        Custodian
                        <i
                          className={`ms-1 ${getSortIcon("name")}`}
                          style={{ color: "white" }}
                        ></i>
                      </button>
                    </th>
                    <th className="small fw-semibold">School & Contact</th>
                    <th className="text-center small fw-semibold">Status</th>
                    <th className="small fw-semibold text-white">
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
                  Fetching property custodians data...
                </span>
              </div>
            </div>
          ) : currentCustodians.length === 0 ? (
            <div className="text-center py-5">
              <div className="mb-3">
                <i
                  className="fas fa-users fa-3x"
                  style={{ color: "var(--text-muted)", opacity: 0.5 }}
                ></i>
              </div>
              <h5 className="mb-2" style={{ color: "var(--text-muted)" }}>
                {custodians.length === 0
                  ? "No Property Custodians"
                  : "No Matching Results"}
              </h5>
              <p className="mb-3 small" style={{ color: "var(--text-muted)" }}>
                {custodians.length === 0
                  ? "No property custodians have been registered yet."
                  : "Try adjusting your search criteria."}
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
                          Custodian
                          <i
                            className={`ms-1 ${getSortIcon("name")}`}
                            style={{ color: "white" }}
                          ></i>
                        </button>
                      </th>
                      <th
                        style={{ width: "25%" }}
                        className="small fw-semibold"
                      >
                        School & Contact
                      </th>
                      <th
                        style={{ width: "10%" }}
                        className="text-center small fw-semibold"
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
                    {currentCustodians.map((custodian, index) => {
                      const createdInfo = formatLocalDateTime(
                        custodian.created_at
                      );
                      return (
                        <tr key={custodian.id} className="align-middle">
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
                                onClick={() => handleViewDetails(custodian)}
                                disabled={isActionDisabled(custodian.id)}
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
                                {actionLoading === custodian.id ? (
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
                                onClick={() => handleEditCustodian(custodian)}
                                disabled={isActionDisabled(custodian.id)}
                                title="Edit Custodian"
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
                                {actionLoading === custodian.id ? (
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

                              {custodian.is_active ? (
                                <button
                                  className="btn btn-danger btn-sm text-white"
                                  onClick={() => handleDeactivate(custodian)}
                                  disabled={
                                    isActionDisabled(custodian.id) ||
                                    custodian.id === currentUser?.id
                                  }
                                  title={
                                    custodian.id === currentUser?.id
                                      ? "Cannot deactivate your own account"
                                      : "Deactivate Custodian"
                                  }
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
                                  {actionLoading === custodian.id ? (
                                    <span
                                      className="spinner-border spinner-border-sm"
                                      role="status"
                                    ></span>
                                  ) : (
                                    <i
                                      className="fas fa-user-slash"
                                      style={{ fontSize: "0.875rem" }}
                                    ></i>
                                  )}
                                </button>
                              ) : (
                                <button
                                  className="btn btn-success btn-sm text-white"
                                  onClick={() => handleActivate(custodian)}
                                  disabled={isActionDisabled(custodian.id)}
                                  title="Activate Custodian"
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
                                  {actionLoading === custodian.id ? (
                                    <span
                                      className="spinner-border spinner-border-sm"
                                      role="status"
                                    ></span>
                                  ) : (
                                    <i
                                      className="fas fa-user-check"
                                      style={{ fontSize: "0.875rem" }}
                                    ></i>
                                  )}
                                </button>
                              )}

                              <button
                                className="btn btn-danger btn-sm text-white"
                                onClick={() => handleDeleteCustodian(custodian)}
                                disabled={
                                  isActionDisabled(custodian.id) ||
                                  custodian.id === currentUser?.id
                                }
                                title={
                                  custodian.id === currentUser?.id
                                    ? "Cannot delete your own account"
                                    : "Delete Custodian"
                                }
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
                                {actionLoading === custodian.id ? (
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
                              <CustodianAvatar custodian={custodian} />
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
                                  title={`${custodian.first_name} ${custodian.last_name}`}
                                >
                                  {custodian.first_name} {custodian.last_name}
                                </div>
                                <div
                                  className="small"
                                  style={{
                                    color: "var(--text-muted)",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                  title={`@${custodian.username}`}
                                >
                                  @{custodian.username}
                                </div>
                                {custodian.email && (
                                  <div
                                    className="small"
                                    style={{
                                      color: "var(--text-muted)",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap",
                                    }}
                                    title={custodian.email}
                                  >
                                    {custodian.email}
                                  </div>
                                )}
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
                              title={
                                custodian.school?.name || "No school assigned"
                              }
                            >
                              {custodian.school?.name || "No school assigned"}
                            </div>
                            <div
                              className="small"
                              style={{
                                color: "var(--text-muted)",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                              title={custodian.phone || "Contact not provided"}
                            >
                              {custodian.phone || "Contact not provided"}
                            </div>
                          </td>
                          <td className="text-center">
                            <span
                              className={`badge ${
                                custodian.is_active
                                  ? "bg-success"
                                  : "bg-secondary"
                              }`}
                            >
                              {custodian.is_active ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td>
                            <small style={{ color: "var(--text-muted)" }}>
                              {createdInfo.date} {createdInfo.time}
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
                          {Math.min(endIndex, filteredCustodians.length)}
                        </span>{" "}
                        of{" "}
                        <span
                          className="fw-semibold"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {filteredCustodians.length}
                        </span>{" "}
                        custodians
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

      {/* Modals */}
      {showDetailsModal && selectedCustodian && (
        <PropertyCustodianDetailsModal
          custodian={selectedCustodian}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedCustodian(null);
          }}
        />
      )}
      {showCustodianForm && (
        <PropertyCustodianFormModal
          custodian={editingCustodian}
          onClose={() => {
            setShowCustodianForm(false);
            setEditingCustodian(null);
          }}
          onSave={handleCustodianSave}
          token={token}
        />
      )}
      {showDeactivateModal && selectedCustodian && (
        <DeactivateModal
          user={selectedCustodian}
          onClose={() => {
            setShowDeactivateModal(false);
            setSelectedCustodian(null);
          }}
          onDeactivate={handleDeactivateConfirm}
          loading={actionLoading === selectedCustodian.id}
        />
      )}
    </div>
  );
};

export default PropertyCustodiansManagement;
