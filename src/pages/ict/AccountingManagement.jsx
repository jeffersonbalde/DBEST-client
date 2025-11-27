import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { showAlert, showToast } from "../../services/notificationService";
import AccountingFormModal from "./AccountingFormModal";
import AccountingDetailsModal from "./AccountingDetailsModal";
import DeactivateModal from "./DeactivateModal";

const AccountingManagement = () => {
  const { user: currentUser, token } = useAuth();
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
      const response = await fetch(
        `${import.meta.env.VITE_LARAVEL_API}/ict/accountings`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

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
        const fieldsToSearch = [
          accounting.name || `${accounting.first_name} ${accounting.last_name}`,
          accounting.first_name,
          accounting.last_name,
          accounting.employee_id,
          accounting.email,
          accounting.phone,
          accounting.position,
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
      filtered = filtered.filter((accounting) => accounting.status === filterStatus);
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
        prev.map((accounting) => (accounting.id === savedAccounting.id ? savedAccounting : accounting))
      );
    } else {
      setAccountingUsers((prev) => [...prev, savedAccounting]);
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
    showProcessingAlert("Deactivating Accounting", "Please wait while we update the account status.");

    try {
      const response = await fetch(
        `${import.meta.env.VITE_LARAVEL_API}/ict/accountings/${selectedAccounting.id}/deactivate`,
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
        showToast.success("Accounting deactivated successfully!");
        setAccountingUsers((prev) =>
          prev.map((a) =>
            a.id === selectedAccounting.id ? { ...a, status: "inactive", is_active: false } : a
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
      `Are you sure you want to activate ${accounting.name || `${accounting.first_name} ${accounting.last_name}`}?`,
      "Yes, Activate",
      "Cancel"
    );

    if (!result.isConfirmed) return;

    setActionLock(true);
    setActionLoading(accounting.id);
    showProcessingAlert("Activating Accounting", "Please wait while we update the account status.");

    try {
      const response = await fetch(
        `${import.meta.env.VITE_LARAVEL_API}/ict/accountings/${accounting.id}/activate`,
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
        showToast.success("Accounting activated successfully!");
        setAccountingUsers((prev) =>
          prev.map((a) => (a.id === accounting.id ? { ...a, status: "active", is_active: true } : a))
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
      `Are you sure you want to permanently delete ${accounting.name || `${accounting.first_name} ${accounting.last_name}`}'s account?`,
      "Yes, Delete",
      "Cancel",
      "warning"
    );

    if (!confirmation.isConfirmed) return;

    setActionLock(true);
    setActionLoading(accounting.id);
    showProcessingAlert("Deleting Accounting Account", "Please wait while we remove this user.");

    try {
      const response = await fetch(
        `${import.meta.env.VITE_LARAVEL_API}/ict/accountings/${accounting.id}`,
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
        setAccountingUsers((prev) => prev.filter((a) => a.id !== accounting.id));
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

  const getStatusBadge = (status) => {
    switch (status) {
      case "active":
        return <span className="badge bg-success">Active</span>;
      case "inactive":
        return <span className="badge bg-danger">Inactive</span>;
      default:
        return <span className="badge bg-secondary">{status}</span>;
    }
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
  const totalPages = Math.ceil(filteredAccounting.length / itemsPerPage);
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
              style={{ width: "32px", height: "32px", borderRadius: "6px" }}
            ></div>
          ))}
        </div>
      </td>
      <td>
        <div className="d-flex align-items-center">
          <div className="flex-grow-1">
            <div className="placeholder-wave mb-1">
              <span className="placeholder col-8" style={{ height: "16px" }}></span>
            </div>
            <div className="placeholder-wave">
              <span className="placeholder col-6" style={{ height: "14px" }}></span>
            </div>
          </div>
        </div>
      </td>
      <td>
        <div className="placeholder-wave mb-1">
          <span className="placeholder col-10" style={{ height: "16px" }}></span>
        </div>
        <div className="placeholder-wave">
          <span className="placeholder col-8" style={{ height: "14px" }}></span>
        </div>
      </td>
      <td>
        <div className="placeholder-wave">
          <span className="placeholder col-6" style={{ height: "24px", borderRadius: "12px" }}></span>
        </div>
      </td>
      <td>
        <div className="placeholder-wave mb-1">
          <span className="placeholder col-9" style={{ height: "16px" }}></span>
        </div>
        <div className="placeholder-wave">
          <span className="placeholder col-7" style={{ height: "14px" }}></span>
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
            <div className="placeholder-wave mb-2">
              <span className="placeholder col-9" style={{ height: "14px" }}></span>
            </div>
            <div className="placeholder-wave">
              <span className="placeholder col-5" style={{ height: "28px" }}></span>
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
          <div
            className="badge px-3 py-2 text-white"
            style={{ backgroundColor: "#336C35" }}
          >
            <i className="fas fa-users me-2"></i>
            Total Accounting: {loading ? "..." : accountingUsers.length}
          </div>
          <button
            className="btn btn-sm btn-success text-white"
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
                      style={{ color: "var(--success-color)" }}
                    >
                      Active
                    </div>
                    <div
                      className="h4 mb-0 fw-bold"
                      style={{ color: "var(--success-color)" }}
                    >
                      {accountingUsers.filter((a) => a.status === "active").length}
                    </div>
                  </div>
                  <div className="col-auto">
                    <i
                      className="fas fa-user-check fa-2x"
                      style={{ color: "var(--success-light)", opacity: 0.7 }}
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
                      style={{ color: "var(--danger-color)" }}
                    >
                      Inactive
                    </div>
                    <div
                      className="h4 mb-0 fw-bold"
                      style={{ color: "var(--danger-color)" }}
                    >
                      {accountingUsers.filter((a) => a.status === "inactive").length}
                    </div>
                  </div>
                  <div className="col-auto">
                    <i
                      className="fas fa-user-slash fa-2x"
                      style={{ color: "var(--danger-light)", opacity: 0.7 }}
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
            <div className="col-md-8">
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
                  placeholder="Search by name, email, employee ID, position, or phone..."
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
                  >
                    <i className="fas fa-times"></i>
                  </button>
                )}
              </div>
            </div>
            <div className="col-md-2">
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
            <div className="col-md-2">
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
            <h5 className="card-title mb-0 fw-semibold">
              <i className="fas fa-users-cog me-2"></i>
              Accounting Members
              {!loading && (
                <small className="opacity-75 ms-2">
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
                    <th style={{ width: "25%" }} className="small fw-semibold">
                      Accounting Information
                    </th>
                    <th style={{ width: "20%" }} className="small fw-semibold">
                      Position & Contact
                    </th>
                    <th style={{ width: "10%" }} className="small fw-semibold">
                      Status
                    </th>
                    <th style={{ width: "15%" }} className="small fw-semibold">
                      Employee ID
                    </th>
                    <th style={{ width: "10%" }} className="small fw-semibold">
                      Registered
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
                ></div>
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
                >
                  <i className="fas fa-times me-1"></i>
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
                        className="small fw-semibold"
                      >
                        <button
                          className="btn btn-link p-0 border-0 text-decoration-none fw-semibold text-start"
                          onClick={() => handleSort("name")}
                          disabled={isActionDisabled()}
                          style={{ color: "var(--text-primary)" }}
                        >
                          Accounting Information
                          <i className={`ms-1 ${getSortIcon("name")}`}></i>
                        </button>
                      </th>
                      <th
                        style={{ width: "20%" }}
                        className="small fw-semibold"
                      >
                        Position & Contact
                      </th>
                      <th
                        style={{ width: "10%" }}
                        className="small fw-semibold"
                      >
                        Status
                      </th>
                      <th
                        style={{ width: "15%" }}
                        className="small fw-semibold"
                      >
                        Employee ID
                      </th>
                      <th
                        style={{ width: "10%" }}
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
                          ></i>
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentAccounting.map((accounting, index) => (
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
                                width: "36px",
                                height: "36px",
                                borderRadius: "6px",
                                transition: "all 0.2s ease-in-out",
                              }}
                              onMouseEnter={(e) => {
                                if (!e.target.disabled) {
                                  e.target.style.transform = "translateY(-1px)";
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
                                <i className="fas fa-eye"></i>
                              )}
                            </button>

                            <button
                              className="btn btn-warning btn-sm text-white"
                              onClick={() => handleEditAccounting(accounting)}
                              disabled={isActionDisabled(accounting.id)}
                              title="Edit Accounting"
                              style={{
                                width: "36px",
                                height: "36px",
                                borderRadius: "6px",
                                transition: "all 0.2s ease-in-out",
                              }}
                              onMouseEnter={(e) => {
                                if (!e.target.disabled) {
                                  e.target.style.transform = "translateY(-1px)";
                                  e.target.style.boxShadow =
                                    "0 4px 8px rgba(0,0,0,0.2)";
                                }
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.transform = "translateY(0)";
                                e.target.style.boxShadow = "none";
                              }}
                            >
                              <i className="fas fa-edit"></i>
                            </button>

                            {accounting.status === "active" ? (
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
                                  width: "36px",
                                  height: "36px",
                                  borderRadius: "6px",
                                  transition: "all 0.2s ease-in-out",
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
                                  <i className="fas fa-user-slash"></i>
                                )}
                              </button>
                            ) : (
                              <button
                                className="btn btn-success btn-sm text-white"
                                onClick={() => handleActivate(accounting)}
                                disabled={isActionDisabled(accounting.id)}
                                title="Activate Accounting"
                                style={{
                                  width: "36px",
                                  height: "36px",
                                  borderRadius: "6px",
                                  transition: "all 0.2s ease-in-out",
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
                                  <i className="fas fa-user-check"></i>
                                )}
                              </button>
                            )}

                            <button
                              className="btn btn-danger btn-sm text-white"
                              onClick={() => handleDeleteAccounting(accounting)}
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
                                width: "36px",
                                height: "36px",
                                borderRadius: "6px",
                                transition: "all 0.2s ease-in-out",
                              }}
                              onMouseEnter={(e) => {
                                if (!e.target.disabled) {
                                  e.target.style.transform = "translateY(-1px)";
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
                                <i className="fas fa-trash"></i>
                              )}
                            </button>
                          </div>
                        </td>
                        <td>
                          <div className="flex-grow-1 min-w-0">
                            <div
                              className="fw-medium mb-1"
                              style={{ color: "var(--text-primary)" }}
                            >
                              {accounting.name || `${accounting.first_name} ${accounting.last_name}`}
                            </div>
                            <div
                              className="small text-break"
                              style={{ color: "var(--text-muted)" }}
                            >
                              {accounting.email}
                            </div>
                          </div>
                        </td>
                        <td>
                          <div style={{ color: "var(--text-primary)" }}>
                            <div className="fw-medium">
                              {accounting.position || "Not specified"}
                            </div>
                            <div
                              className="small"
                              style={{ color: "var(--text-muted)" }}
                            >
                              {accounting.phone || "Not provided"}
                            </div>
                          </div>
                        </td>
                        <td>{getStatusBadge(accounting.status)}</td>
                        <td>
                          <div style={{ color: "var(--text-primary)" }}>
                            {accounting.employee_id || "N/A"}
                          </div>
                        </td>
                        <td>
                          <small style={{ color: "var(--text-muted)" }}>
                            {new Date(accounting.created_at).toLocaleDateString()}
                          </small>
                        </td>
                      </tr>
                    ))}
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
                        accounting members
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
                                    "var(--primary-light)";
                                  e.target.style.color = "var(--text-primary)";
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

