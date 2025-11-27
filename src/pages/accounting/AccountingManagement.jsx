import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { showAlert, showToast } from "../../services/notificationService";
import AccountingFormModal from "./AccountingFormModal";
import AccountingDetailsModal from "./AccountingDetailsModal";
import DeactivateModal from "./DeactivateModal";

const AccountingManagement = () => {
  const { user: currentUser, token } = useAuth();
  const API_BASE_URL =
    import.meta.env.VITE_LARAVEL_API || "http://localhost:8000/api";
  const [accountingUsers, setAccountingUsers] = useState([]);
  const [filteredAccounting, setFilteredAccounting] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [actionLock, setActionLock] = useState(false);

  // Modal states
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showAccountingForm, setShowAccountingForm] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [selectedAccounting, setSelectedAccounting] = useState(null);
  const [editingAccounting, setEditingAccounting] = useState(null);

  const showProcessingAlert = (
    title = "Processing Action",
    text = "Please wait while we complete this request..."
  ) => {
    showAlert.processing(title, text);
  };

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState("created_at");
  const [sortDirection, setSortDirection] = useState("desc");

  useEffect(() => {
    fetchAccountingUsers();
  }, []);

  useEffect(() => {
    filterAndSortAccounting();
  }, [accountingUsers, searchTerm, filterStatus, sortField, sortDirection]);

  const fetchAccountingUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/ict/accountings`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        const accountingList = data.accountings || data.data || [];
        setAccountingUsers(accountingList);
      } else {
        throw new Error("Failed to fetch accounting users");
      }
    } catch (error) {
      console.error("Error fetching accounting users:", error);
      showAlert.error("Error", "Failed to load accounting members");
      setAccountingUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const refreshAllData = async () => {
    if (actionLock) {
      showToast.warning("Please wait until current action completes");
      return;
    }
    await fetchAccountingUsers();
    showToast.info("Data refreshed successfully");
  };

  const filterAndSortAccounting = () => {
    let filtered = [...accountingUsers];

    // Search filter
    if (searchTerm.trim()) {
      const loweredSearch = searchTerm.toLowerCase();
      filtered = filtered.filter((accounting) => {
        const fullName =
          accounting.name ||
          `${accounting.first_name || ""} ${accounting.last_name || ""}`.trim();
        const fieldsToSearch = [
          fullName,
          accounting.username,
          accounting.employee_id,
          accounting.phone,
          accounting.email,
        ];
        return fieldsToSearch.some(
          (field) =>
            typeof field === "string" &&
            field.toLowerCase().includes(loweredSearch)
        );
      });
    }

    // Status filter
    if (filterStatus === "active") {
      filtered = filtered.filter((accounting) => accounting.is_active);
    } else if (filterStatus === "inactive") {
      filtered = filtered.filter((accounting) => !accounting.is_active);
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

      const aValue = String(a[sortField] || "").toLowerCase();
      const bValue = String(b[sortField] || "").toLowerCase();

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    setFilteredAccounting(filtered);
    setCurrentPage(1);
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

  const handleViewDetails = (accounting) => {
    if (actionLock) {
      showToast.warning("Please wait until the current action completes");
      return;
    }
    setSelectedAccounting(accounting);
    setShowDetailsModal(true);
  };

  const handleAddAccounting = () => {
    setEditingAccounting(null);
    setShowAccountingForm(true);
  };

  const handleEditAccounting = (accounting) => {
    setEditingAccounting(accounting);
    setShowAccountingForm(true);
  };

  const handleAccountingSave = (savedAccounting) => {
    if (editingAccounting) {
      setAccountingUsers((prev) =>
        prev.map((accounting) =>
          accounting.id === savedAccounting.id ? savedAccounting : accounting
        )
      );
    } else {
      setAccountingUsers((prev) => [savedAccounting, ...prev]);
    }
    setShowAccountingForm(false);
    setEditingAccounting(null);
  };

  const handleDeactivate = (accounting) => {
    if (actionLock) {
      showToast.warning("Please wait until the current action completes");
      return;
    }
    if (accounting.id === currentUser?.id) {
      showAlert.error("Error", "You cannot deactivate your own account");
      return;
    }
    setSelectedAccounting(accounting);
    setShowDeactivateModal(true);
  };

  const handleDeactivateConfirm = async (deactivateReason) => {
    if (!selectedAccounting) return;

    setActionLock(true);
    setActionLoading(selectedAccounting.id);
    showProcessingAlert(
      "Deactivating Accounting",
      "Please wait while we update the account status."
    );

    try {
      const response = await fetch(
        `${API_BASE_URL}/ict/accountings/${selectedAccounting.id}/deactivate`,
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
        const updatedAccounting = data.user || data;
        showToast.success("Accounting deactivated successfully!");
        setAccountingUsers((prev) =>
          prev.map((a) =>
            a.id === updatedAccounting.id ? updatedAccounting : a
          )
        );
        setShowDeactivateModal(false);
        setSelectedAccounting(null);
      } else {
        throw new Error(data.message || "Failed to deactivate accounting");
      }
    } catch (error) {
      showAlert.close();
      console.error("Error deactivating accounting:", error);
      showAlert.error(
        "Deactivation Failed",
        error.message || "Failed to deactivate accounting"
      );
    } finally {
      showAlert.close();
      setActionLoading(null);
      setActionLock(false);
    }
  };

  const handleActivate = async (accounting) => {
    if (actionLock) {
      showToast.warning("Please wait until the current action completes");
      return;
    }

    const result = await showAlert.confirm(
      "Activate Accounting",
      `Are you sure you want to activate ${
        accounting.name || `${accounting.first_name} ${accounting.last_name}`
      }?`,
      "Yes, Activate",
      "Cancel"
    );

    if (!result.isConfirmed) return;

    setActionLock(true);
    setActionLoading(accounting.id);
    showProcessingAlert(
      "Activating Accounting",
      "Please wait while we update the account status."
    );

    try {
      const response = await fetch(
        `${API_BASE_URL}/ict/accountings/${accounting.id}/activate`,
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
        const updatedAccounting = data.user || data;
        showToast.success("Accounting activated successfully!");
        setAccountingUsers((prev) =>
          prev.map((a) =>
            a.id === updatedAccounting.id ? updatedAccounting : a
          )
        );
      } else {
        throw new Error(data.message || "Failed to activate accounting");
      }
    } catch (error) {
      showAlert.close();
      console.error("Error activating accounting:", error);
      showAlert.error(
        "Activation Failed",
        error.message || "Failed to activate accounting"
      );
    } finally {
      showAlert.close();
      setActionLoading(null);
      setActionLock(false);
    }
  };

  const handleDeleteAccounting = async (accounting) => {
    if (actionLock) {
      showToast.warning("Please wait until the current action completes");
      return;
    }

    if (accounting.id === currentUser?.id) {
      showAlert.error("Error", "You cannot delete your own account");
      return;
    }

    const confirmation = await showAlert.confirm(
      "Delete Accounting Account",
      `Are you sure you want to permanently delete ${
        accounting.name || `${accounting.first_name} ${accounting.last_name}`
      }'s account?`,
      "Yes, Delete",
      "Cancel",
      "warning"
    );

    if (!confirmation.isConfirmed) return;

    setActionLock(true);
    setActionLoading(accounting.id);
    showProcessingAlert(
      "Deleting Accounting Account",
      "Please wait while we remove this user."
    );

    try {
      const response = await fetch(
        `${API_BASE_URL}/ict/accountings/${accounting.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      if (response.ok) {
        showToast.success("Accounting account deleted successfully!");
        setAccountingUsers((prev) =>
          prev.filter((a) => a.id !== accounting.id)
        );
      } else {
        const data = await response.json();
        throw new Error(data.message || "Failed to delete accounting account");
      }
    } catch (error) {
      showAlert.close();
      console.error("Error deleting accounting:", error);
      showAlert.error(
        "Deletion Failed",
        error.message || "Failed to delete accounting account"
      );
    } finally {
      showAlert.close();
      setActionLoading(null);
      setActionLock(false);
    }
  };

  const getAccountingAvatarUrl = useCallback((accounting) => {
    if (!accounting) return null;
    if (accounting.avatar_path) {
      const baseUrl = import.meta.env.VITE_LARAVEL_API;
      let cleanFilename = accounting.avatar_path;
      if (accounting.avatar_path.includes("avatars/")) {
        cleanFilename = accounting.avatar_path.replace("avatars/", "");
      }
      cleanFilename = cleanFilename.split("/").pop();
      return `${baseUrl}/accounting-avatar/${cleanFilename}`;
    }
    return null;
  }, []);

  const AccountingAvatar = ({ accounting, size = 44 }) => {
    const getInitials = (firstName, lastName) => {
      const first = firstName ? firstName.charAt(0) : "";
      const last = lastName ? lastName.charAt(0) : "";
      return (first + last).toUpperCase() || "AC";
    };

    if (accounting.avatar_path) {
      const avatarUrl = getAccountingAvatarUrl(accounting);
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
            alt={`${accounting.name}'s avatar`}
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
        {getInitials(accounting.first_name, accounting.last_name)}
      </div>
    );
  };

  const getSortIcon = (field) => {
    if (sortField !== field) return "fas fa-sort text-muted";
    return sortDirection === "asc" ? "fas fa-sort-up" : "fas fa-sort-down";
  };

  const isActionDisabled = (accountingId = null) => {
    return actionLock || (actionLoading && actionLoading !== accountingId);
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
  const totalPages = Math.max(
    1,
    Math.ceil(filteredAccounting.length / itemsPerPage) || 1
  );
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentAccounting = filteredAccounting.slice(startIndex, endIndex);

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
    <div className="container-fluid px-3 py-2 accounting-management-container fadeIn">
      {/* Page Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-3">
        <div className="flex-grow-1 mb-2 mb-md-0">
          <h1
            className="h4 mb-1 fw-bold"
            style={{ color: "var(--text-primary)" }}
          >
            Accounting Management
          </h1>
          <p className="mb-0 small" style={{ color: "var(--text-muted)" }}>
            Manage accounting member accounts and access permissions
          </p>
        </div>
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <button
            className="btn btn-sm btn-primary text-white"
            onClick={handleAddAccounting}
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
            Add Accounting
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
                      Total Accounting
                    </div>
                    <div
                      className="h4 mb-0 fw-bold"
                      style={{ color: "var(--primary-color)" }}
                    >
                      {accountingUsers.length}
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
                      Active Accounting
                    </div>
                    <div
                      className="h4 mb-0 fw-bold"
                      style={{ color: "var(--accent-color)" }}
                    >
                      {accountingUsers.filter((a) => a.is_active).length}
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
                      {filteredAccounting.length}
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
                Search Accounting
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
                  placeholder="Search by name, username, employee ID, or phone..."
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
              Accounting Members
              {!loading && (
                <small className="opacity-75 ms-2 text-white">
                  ({filteredAccounting.length} found
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
                    <th className="small fw-semibold">
                      <button
                        className="btn btn-link p-0 border-0 text-decoration-none fw-semibold text-start text-white"
                        onClick={() => handleSort("name")}
                        disabled={isActionDisabled()}
                        style={{ color: "white" }}
                      >
                        Accounting Member
                        <i
                          className={`ms-1 ${getSortIcon("name")}`}
                          style={{ color: "white" }}
                        ></i>
                      </button>
                    </th>
                    <th className="small fw-semibold">Contact</th>
                    <th className="text-center small fw-semibold">Status</th>
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
                  Fetching accounting data...
                </span>
              </div>
            </div>
          ) : currentAccounting.length === 0 ? (
            <div className="text-center py-5">
              <div className="mb-3">
                <i
                  className="fas fa-users fa-3x"
                  style={{ color: "var(--text-muted)", opacity: 0.5 }}
                ></i>
              </div>
              <h5 className="mb-2" style={{ color: "var(--text-muted)" }}>
                {accountingUsers.length === 0
                  ? "No Accounting Members"
                  : "No Matching Results"}
              </h5>
              <p className="mb-3 small" style={{ color: "var(--text-muted)" }}>
                {accountingUsers.length === 0
                  ? "No accounting members have been registered yet."
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
                        style={{ width: "25%" }}
                        className="small fw-semibold text-white"
                      >
                        <button
                          className="btn btn-link p-0 border-0 text-decoration-none fw-semibold text-start text-white"
                          onClick={() => handleSort("name")}
                          disabled={isActionDisabled()}
                          style={{ color: "white" }}
                        >
                          Accounting Member
                          <i
                            className={`ms-1 ${getSortIcon("name")}`}
                            style={{ color: "white" }}
                          ></i>
                        </button>
                      </th>
                      <th
                        style={{ width: "20%" }}
                        className="small fw-semibold"
                      >
                        Contact
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
                    {currentAccounting.map((accounting, index) => {
                      const createdInfo = formatLocalDateTime(
                        accounting.created_at
                      );
                      return (
                        <tr key={accounting.id} className="align-middle">
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
                                onClick={() => handleViewDetails(accounting)}
                                disabled={isActionDisabled(accounting.id)}
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
                                {actionLoading === accounting.id ? (
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
                                onClick={() => handleEditAccounting(accounting)}
                                disabled={isActionDisabled(accounting.id)}
                                title="Edit Accounting"
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
                                {actionLoading === accounting.id ? (
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

                              {accounting.is_active ? (
                                <button
                                  className="btn btn-danger btn-sm text-white"
                                  onClick={() => handleDeactivate(accounting)}
                                  disabled={
                                    isActionDisabled(accounting.id) ||
                                    accounting.id === currentUser?.id
                                  }
                                  title={
                                    accounting.id === currentUser?.id
                                      ? "Cannot deactivate your own account"
                                      : "Deactivate Accounting"
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
                                  {actionLoading === accounting.id ? (
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
                                  onClick={() => handleActivate(accounting)}
                                  disabled={isActionDisabled(accounting.id)}
                                  title="Activate Accounting"
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
                                  {actionLoading === accounting.id ? (
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
                                onClick={() =>
                                  handleDeleteAccounting(accounting)
                                }
                                disabled={
                                  isActionDisabled(accounting.id) ||
                                  accounting.id === currentUser?.id
                                }
                                title={
                                  accounting.id === currentUser?.id
                                    ? "Cannot delete your own account"
                                    : "Delete Accounting"
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
                                {actionLoading === accounting.id ? (
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
                              <AccountingAvatar accounting={accounting} />
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
                                  title={
                                    accounting.name ||
                                    `${accounting.first_name} ${accounting.last_name}`
                                  }
                                >
                                  {accounting.name ||
                                    `${accounting.first_name} ${accounting.last_name}`}
                                </div>
                                <div
                                  className="small"
                                  style={{
                                    color: "var(--text-muted)",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                  title={`@${accounting.username}`}
                                >
                                  @{accounting.username}
                                </div>
                                {accounting.email && (
                                  <div
                                    className="small"
                                    style={{
                                      color: "var(--text-muted)",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap",
                                    }}
                                    title={accounting.email}
                                  >
                                    {accounting.email}
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
                              title={accounting.phone || "Contact not provided"}
                            >
                              {accounting.phone || "Contact not provided"}
                            </div>
                          </td>
                          <td className="text-center">
                            <span
                              className={`badge ${
                                accounting.is_active
                                  ? "bg-success"
                                  : "bg-secondary"
                              }`}
                            >
                              {accounting.is_active ? "Active" : "Inactive"}
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
                          {Math.min(endIndex, filteredAccounting.length)}
                        </span>{" "}
                        of{" "}
                        <span
                          className="fw-semibold"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {filteredAccounting.length}
                        </span>{" "}
                        members
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
      {showDetailsModal && selectedAccounting && (
        <AccountingDetailsModal
          accounting={selectedAccounting}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedAccounting(null);
          }}
        />
      )}
      {showAccountingForm && (
        <AccountingFormModal
          accounting={editingAccounting}
          onClose={() => {
            setShowAccountingForm(false);
            setEditingAccounting(null);
          }}
          onSave={handleAccountingSave}
          token={token}
        />
      )}
      {showDeactivateModal && selectedAccounting && (
        <DeactivateModal
          user={selectedAccounting}
          onClose={() => {
            setShowDeactivateModal(false);
            setSelectedAccounting(null);
          }}
          onDeactivate={handleDeactivateConfirm}
          loading={actionLoading === selectedAccounting.id}
        />
      )}
    </div>
  );
};

export default AccountingManagement;
