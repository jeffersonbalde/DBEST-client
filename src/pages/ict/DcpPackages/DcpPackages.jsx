import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { showAlert, showToast } from "../../../services/notificationService";
import Portal from "../../../components/Portal/Portal";

const API_BASE =
  import.meta.env.VITE_LARAVEL_API || "http://localhost:8000/api";

const getDcpDocumentUrl = (pkg, type) => {
  if (!pkg) return null;
  const filenameKey = `${type}_filename`;
  if (!pkg[filenameKey]) return null;

  const base =
    import.meta.env.VITE_LARAVEL_API || "http://localhost:8000/api";

  // This will resolve to e.g. http://host/api/dcp-package-file/{id}/{type}
  return `${base}/dcp-package-file/${pkg.id}/${type}`;
};

const DEFAULT_PACKAGE = {
  id: null,
  school_id: "",
  batch_name: "",
  quantity: 1,
  package_count: 1,
  delivery_date: "",
  delivery_status: "",
  installation_status: "",
  details: "",
  remarks: "",
  dr_number: "",
  dr_filename: "",
  ptr_number: "",
  ptr_filename: "",
  iar_number: "",
  iar_filename: "",
};

const deliveryStatusOptions = [
  "Pending",
  "In Transit",
  "Delivered",
  "Partially Delivered",
  "Cancelled",
];

const installationStatusOptions = [
  "Not Started",
  "Ongoing",
  "Completed",
  "On Hold",
];

const statusFilterOptions = [
  "all",
  ...new Set([
    ...deliveryStatusOptions.map((status) => status.toLowerCase()),
    ...installationStatusOptions.map((status) => status.toLowerCase()),
  ]),
];

const TableRowSkeleton = () => (
  <tr className="align-middle" style={{ height: "70px" }}>
    <td className="text-center">
      <div className="placeholder-wave">
        <span className="placeholder col-4" style={{ height: "20px" }}></span>
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
      <div className="placeholder-wave mb-1">
        <span className="placeholder col-9" style={{ height: "16px" }}></span>
      </div>
      <div className="placeholder-wave">
        <span className="placeholder col-7" style={{ height: "14px" }}></span>
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
      <div className="placeholder-wave mb-1">
        <span className="placeholder col-10" style={{ height: "16px" }}></span>
      </div>
      <div className="placeholder-wave">
        <span className="placeholder col-8" style={{ height: "14px" }}></span>
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

const StatsCardSkeleton = () => (
  <div className="card stats-card h-100">
    <div className="card-body p-3">
      <div className="d-flex align-items-center">
        <div className="flex-grow-1">
          <div className="placeholder-wave mb-2">
            <span className="placeholder col-6" style={{ height: "14px" }} />
          </div>
          <div className="placeholder-wave">
            <span className="placeholder col-4" style={{ height: "24px" }} />
          </div>
        </div>
        <div className="col-auto">
          <div className="placeholder-wave">
            <span
              className="placeholder rounded-circle"
              style={{ width: "44px", height: "44px" }}
            />
          </div>
        </div>
      </div>
    </div>
  </div>
);

const formatDate = (value, fallback = "N/A") => {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatDateTime = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const statusBadgeClass = (status) => {
  if (!status) return "badge bg-secondary-subtle text-secondary";
  const lowered = status.toLowerCase();
  if (lowered.includes("deliver") || lowered.includes("transit")) {
    return "badge bg-primary-subtle text-primary";
  }
  if (lowered.includes("complete")) {
    return "badge bg-success-subtle text-success";
  }
  if (lowered.includes("hold") || lowered.includes("cancel")) {
    return "badge bg-danger-subtle text-danger";
  }
  return "badge bg-secondary-subtle text-secondary";
};

const DcpPackages = () => {
  const { token } = useAuth();
  const [packages, setPackages] = useState([]);
  const [filteredPackages, setFilteredPackages] = useState([]);
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [schoolsLoading, setSchoolsLoading] = useState(false);
  const [actionLock, setActionLock] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  const [showFormModal, setShowFormModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [editingPackage, setEditingPackage] = useState(null);
  const [selectedPackage, setSelectedPackage] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState("delivery_date");
  const [sortDirection, setSortDirection] = useState("desc");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchPackages = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/ict/dcp-packages`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to load DCP packages");
      }

      const data = await response.json();
      setPackages(data.packages || data.data || []);
    } catch (error) {
      console.error(error);
      showAlert.error("Error", error.message || "Unable to load DCP packages");
      setPackages([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchSchools = useCallback(async () => {
    setSchoolsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/ict/schools`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to load schools");
      }

      const data = await response.json();
      setSchools(data.schools || data.data || []);
    } catch (error) {
      console.error(error);
      showToast.error(error.message || "Unable to fetch schools list");
      setSchools([]);
    } finally {
      setSchoolsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchPackages();
    fetchSchools();
  }, [fetchPackages, fetchSchools]);

  const applyFilters = useCallback(() => {
    let result = [...packages];

    if (searchTerm.trim()) {
      const lowered = searchTerm.toLowerCase();
      result = result.filter((pkg) => {
        const fields = [
          pkg.batch_name,
          pkg.details,
          pkg.remarks,
          pkg.school?.name,
          pkg.dr_number,
          pkg.ptr_number,
          pkg.iar_number,
        ].filter(Boolean);

        return fields.some((value) => value.toLowerCase().includes(lowered));
      });
    }

    if (statusFilter !== "all") {
      result = result.filter(
        (pkg) =>
          pkg.delivery_status?.toLowerCase() === statusFilter ||
          pkg.installation_status?.toLowerCase() === statusFilter
      );
    }

    result.sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      if (sortField === "delivery_date") {
        aValue = aValue ? new Date(aValue).getTime() : 0;
        bValue = bValue ? new Date(bValue).getTime() : 0;
      } else {
        aValue = (aValue || "").toString().toLowerCase();
        bValue = (bValue || "").toString().toLowerCase();
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    setFilteredPackages(result);
    setCurrentPage(1);
  }, [packages, searchTerm, statusFilter, sortField, sortDirection]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredPackages.length / itemsPerPage) || 1
  );
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentPackages = filteredPackages.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  const stats = useMemo(() => {
    const delivered = packages.filter(
      (pkg) => pkg.delivery_status?.toLowerCase() === "delivered"
    ).length;
    const inTransit = packages.filter((pkg) =>
      (pkg.delivery_status || "").toLowerCase().includes("transit")
    ).length;
    const pending = packages.filter(
      (pkg) =>
        !pkg.delivery_status || pkg.delivery_status.toLowerCase() === "pending"
    ).length;

    return {
      total: packages.length,
      delivered,
      inTransit,
      pending,
    };
  }, [packages]);

  const getSortIcon = (field) => {
    if (sortField !== field) return "fas fa-sort text-muted";
    return sortDirection === "asc" ? "fas fa-sort-up" : "fas fa-sort-down";
  };

  const isActionDisabled = (id = null) =>
    actionLock || (actionLoading && actionLoading !== id);

  const handleAdd = () => {
    setEditingPackage(null);
    setShowFormModal(true);
  };

  const handleEdit = (pkg) => {
    setEditingPackage(pkg);
    setShowFormModal(true);
  };

  const handleViewDetails = (pkg) => {
    setSelectedPackage(pkg);
    setShowDetailsModal(true);
  };

  const handleDelete = async (pkg) => {
    if (isActionDisabled(pkg.id)) {
      showToast.warning("Please wait for the current action to finish.");
      return;
    }

    const confirmation = await showAlert.confirm(
      "Delete DCP Package",
      `Are you sure you want to delete "${pkg.batch_name}" for ${
        pkg.school?.name || "Unassigned School"
      }?`,
      "Yes, delete",
      "Cancel"
    );

    if (!confirmation.isConfirmed) return;

    setActionLock(true);
    setActionLoading(pkg.id);
    showAlert.processing("Deleting Package", "Removing DCP package...");

    try {
      const response = await fetch(`${API_BASE}/ict/dcp-packages/${pkg.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to delete DCP package");
      }

      setPackages((prev) => prev.filter((item) => item.id !== pkg.id));
      showAlert.close();
      showToast.success("DCP package deleted successfully!");
    } catch (error) {
      console.error(error);
      showAlert.error("Error", error.message || "Failed to delete DCP package");
    } finally {
      setActionLock(false);
      setActionLoading(null);
    }
  };

  const handlePackageSaved = (savedPackage, isEdit) => {
    setPackages((prev) => {
      if (isEdit) {
        return prev.map((pkg) =>
          pkg.id === savedPackage.id ? savedPackage : pkg
        );
      }
      return [savedPackage, ...prev];
    });
    setShowFormModal(false);
    setEditingPackage(null);
  };

  const handleRefresh = async () => {
    if (actionLock) {
      showToast.warning("Please wait until the current action completes");
      return;
    }
    await fetchPackages();
    showToast.info("Package list refreshed");
  };

  return (
    <div className="container-fluid px-3 py-2 fadeIn">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-3">
        <div className="flex-grow-1 mb-2 mb-md-0">
          <h1
            className="h4 mb-1 fw-bold"
            style={{ color: "var(--text-primary)" }}
          >
            DCP Package Management
          </h1>
          <p className="mb-0 small" style={{ color: "var(--text-muted)" }}>
            Maintain DCP batches, monitor delivery/installation progress, and
            keep documents aligned with each school.
          </p>
        </div>
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <button
            className="btn btn-sm btn-primary text-white"
            onClick={handleAdd}
            disabled={isActionDisabled()}
            style={{ transition: "all 0.2s ease-in-out", borderWidth: "2px" }}
          >
            <i className="fas fa-plus me-1"></i>
            New DCP Package
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
                      Total Packages
                    </div>
                    <div
                      className="h4 mb-0 fw-bold"
                      style={{ color: "var(--primary-color)" }}
                    >
                      {stats.total}
                    </div>
                  </div>
                  <div className="col-auto">
                    <i
                      className="fas fa-boxes-stacked fa-2x"
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
                      Delivered
                    </div>
                    <div
                      className="h4 mb-0 fw-bold"
                      style={{ color: "var(--accent-color)" }}
                    >
                      {stats.delivered}
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
                      In Transit
                    </div>
                    <div
                      className="h4 mb-0 fw-bold"
                      style={{ color: "var(--primary-dark)" }}
                    >
                      {stats.inTransit}
                    </div>
                  </div>
                  <div className="col-auto">
                    <i
                      className="fas fa-truck fa-2x"
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
                      style={{ color: "var(--text-muted)" }}
                    >
                      Pending
                    </div>
                    <div
                      className="h4 mb-0 fw-bold"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {stats.pending}
                    </div>
                  </div>
                  <div className="col-auto">
                    <i
                      className="fas fa-clock fa-2x"
                      style={{ color: "var(--text-muted)", opacity: 0.7 }}
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
          <div className="row g-2 align-items-end">
            <div className="col-md-6">
              <label
                className="form-label small fw-semibold mb-1"
                style={{ color: "var(--text-muted)" }}
              >
                Search DCP Packages
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
                  placeholder="Search by batch, school, document reference..."
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
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                disabled={loading || isActionDisabled()}
                style={{
                  backgroundColor: "var(--input-bg)",
                  borderColor: "var(--input-border)",
                  color: "var(--input-text)",
                }}
              >
                {statusFilterOptions.map((option) => (
                  <option key={option} value={option}>
                    {option === "all"
                      ? "All Status"
                      : option.replace(/\b\w/g, (l) => l.toUpperCase())}
                  </option>
                ))}
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
                {[5, 10, 20, 50].map((size) => (
                  <option key={size} value={size}>
                    {size} per page
                  </option>
                ))}
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
          <div className="d-flex justify-content-between alignments-center">
            <h5 className="card-title mb-0 fw-semibold text-white">
              <i className="fas fa-list-check me-2"></i>
              DCP Packages Registry
              {!loading && (
                <small className="opacity-75 ms-2 text-white">
                  ({filteredPackages.length} found
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
                    {Array.from({ length: 7 }).map((_, index) => (
                      <th key={index} className="small fw-semibold">
                        &nbsp;
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
                ></div>
                <span className="small" style={{ color: "var(--text-muted)" }}>
                  Fetching DCP packages...
                </span>
              </div>
            </div>
          ) : currentPackages.length === 0 ? (
            <div className="text-center py-5">
              <div className="mb-3">
                <i
                  className="fas fa-box-open fa-3x"
                  style={{ color: "var(--text-muted)", opacity: 0.5 }}
                ></i>
              </div>
              <h5 className="mb-2" style={{ color: "var(--text-muted)" }}>
                {packages.length === 0
                  ? "No DCP Packages Registered"
                  : "No Matching Results"}
              </h5>
              <p className="mb-0 small" style={{ color: "var(--text-muted)" }}>
                {packages.length === 0
                  ? "Use the New DCP Package button to start recording batches."
                  : "Try adjusting your search or filters."}
              </p>
            </div>
          ) : (
            <>
              <div className="table-responsive">
                <table className="table table-striped table-hover mb-0">
                  <thead style={{ backgroundColor: "var(--background-light)" }}>
                    <tr>
                      <th
                        className="text-center small fw-semibold"
                        style={{ width: "5%" }}
                      >
                        #
                      </th>
                      <th
                        className="text-center small fw-semibold"
                        style={{ width: "14%" }}
                      >
                        Actions
                      </th>
                      <th
                        className="small fw-semibold"
                        style={{ width: "24%" }}
                      >
                        <button
                          className="btn btn-link p-0 border-0 text-decoration-none fw-semibold text-start text-white"
                          onClick={() => {
                            if (sortField === "batch_name") {
                              setSortDirection((prev) =>
                                prev === "asc" ? "desc" : "asc"
                              );
                            } else {
                              setSortField("batch_name");
                              setSortDirection("asc");
                            }
                          }}
                          disabled={isActionDisabled()}
                          style={{ color: "white" }}
                        >
                          Batch Information
                          <i
                            className={`ms-1 ${getSortIcon("batch_name")}`}
                          ></i>
                        </button>
                      </th>
                      <th
                        className="small fw-semibold"
                        style={{ width: "18%" }}
                      >
                        School Assignment
                      </th>
                      <th
                        className="small fw-semibold"
                        style={{ width: "20%" }}
                      >
                        Delivery & Installation
                      </th>
                      <th
                        className="small fw-semibold"
                        style={{ width: "24%" }}
                      >
                        Documents (DR / PTR / IAR)
                      </th>
                      <th
                        className="small fw-semibold text-white"
                        style={{ width: "14%" }}
                      >
                        <button
                          className="btn btn-link p-0 border-0 text-decoration-none fw-semibold text-start text-white"
                          onClick={() => {
                            if (sortField === "delivery_date") {
                              setSortDirection((prev) =>
                                prev === "asc" ? "desc" : "asc"
                              );
                            } else {
                              setSortField("delivery_date");
                              setSortDirection("desc");
                            }
                          }}
                          disabled={isActionDisabled()}
                          style={{ color: "white" }}
                        >
                          Delivery Date
                          <i
                            className={`ms-1 ${getSortIcon("delivery_date")}`}
                          ></i>
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentPackages.map((pkg, index) => (
                      <tr key={pkg.id} className="align-middle">
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
                              onClick={() => handleViewDetails(pkg)}
                              disabled={isActionDisabled(pkg.id)}
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
                              {actionLoading === pkg.id ? (
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
                              onClick={() => handleEdit(pkg)}
                              disabled={isActionDisabled(pkg.id)}
                              title="Edit Package"
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
                              {actionLoading === pkg.id ? (
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
                              onClick={() => handleDelete(pkg)}
                              disabled={isActionDisabled(pkg.id)}
                              title="Delete Package"
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
                              {actionLoading === pkg.id ? (
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
                        <td style={{ maxWidth: "260px" }}>
                          <div
                            className="fw-semibold text-truncate"
                            title={pkg.batch_name}
                          >
                            {pkg.batch_name || "Unnamed Batch"}
                          </div>
                          <div className="small text-muted">
                            Qty: {pkg.quantity || 0} • Packages:{" "}
                            {pkg.package_count ?? pkg.quantity ?? 0}
                          </div>
                          <div
                            className="small text-muted text-truncate"
                            title={pkg.details}
                          >
                            {pkg.details || "No details provided"}
                          </div>
                        </td>
                        <td style={{ maxWidth: "200px" }}>
                          <div
                            className="fw-medium text-truncate"
                            title={pkg.school?.name}
                          >
                            {pkg.school?.name || "Unassigned"}
                          </div>
                          <div className="small text-muted text-truncate">
                            {pkg.school?.division || pkg.school?.region || "—"}
                          </div>
                        </td>
                        <td>
                          <div className="mb-1">
                            <span
                              className={statusBadgeClass(pkg.delivery_status)}
                            >
                              {pkg.delivery_status || "Delivery status not set"}
                            </span>
                          </div>
                          <div>
                            <span
                              className={statusBadgeClass(
                                pkg.installation_status
                              )}
                            >
                              {pkg.installation_status ||
                                "Installation status not set"}
                            </span>
                          </div>
                        </td>
                        <td style={{ maxWidth: "260px" }}>
                          <div
                            className="small text-truncate"
                            title={
                              pkg.dr_number || pkg.dr_filename
                                ? `DR: ${pkg.dr_number || "—"}${
                                    pkg.dr_filename
                                      ? ` (${pkg.dr_filename})`
                                      : ""
                                  }`
                                : "DR: —"
                            }
                            style={{
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            <strong>DR:</strong> {pkg.dr_number || "—"}
                            {pkg.dr_filename ? ` (${pkg.dr_filename})` : ""}
                          </div>
                          <div
                            className="small text-truncate"
                            title={
                              pkg.ptr_number || pkg.ptr_filename
                                ? `PTR: ${pkg.ptr_number || "—"}${
                                    pkg.ptr_filename
                                      ? ` (${pkg.ptr_filename})`
                                      : ""
                                  }`
                                : "PTR: —"
                            }
                            style={{
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            <strong>PTR:</strong> {pkg.ptr_number || "—"}
                            {pkg.ptr_filename ? ` (${pkg.ptr_filename})` : ""}
                          </div>
                          <div
                            className="small text-truncate"
                            title={
                              pkg.iar_number || pkg.iar_filename
                                ? `IAR: ${pkg.iar_number || "—"}${
                                    pkg.iar_filename
                                      ? ` (${pkg.iar_filename})`
                                      : ""
                                  }`
                                : "IAR: —"
                            }
                            style={{
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            <strong>IAR:</strong> {pkg.iar_number || "—"}
                            {pkg.iar_filename ? ` (${pkg.iar_filename})` : ""}
                          </div>
                        </td>
                        <td>
                          <div
                            className="fw-semibold"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {formatDate(pkg.delivery_date)}
                          </div>
                          <div
                            className="small text-muted text-truncate"
                            title={pkg.remarks}
                          >
                            {pkg.remarks || "No remarks yet"}
                          </div>
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
                          {Math.min(
                            startIndex + itemsPerPage,
                            filteredPackages.length
                          )}
                        </span>{" "}
                        of{" "}
                        <span
                          className="fw-semibold"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {filteredPackages.length}
                        </span>{" "}
                        packages
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
                          const pages = [];
                          const maxVisible = 5;
                          if (totalPages <= maxVisible) {
                            for (let i = 1; i <= totalPages; i++) {
                              pages.push(i);
                            }
                          } else {
                            pages.push(1);
                            let start = Math.max(2, currentPage - 1);
                            let end = Math.min(totalPages - 1, currentPage + 1);

                            if (currentPage <= 2) {
                              end = 4;
                            } else if (currentPage >= totalPages - 1) {
                              start = totalPages - 3;
                            }

                            if (start > 2) pages.push("...");
                            for (let i = start; i <= end; i++) {
                              pages.push(i);
                            }
                            if (end < totalPages - 1) pages.push("...");
                            pages.push(totalPages);
                          }

                          return pages.map((page, index) => (
                            <button
                              key={`${page}-${index}`}
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
                                  currentPage !== page &&
                                  page !== "..."
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
                                  currentPage !== page &&
                                  page !== "..."
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
        <DcpPackageFormModal
          token={token}
          pkg={editingPackage}
          schools={schools}
          loadingSchools={schoolsLoading}
          onClose={() => {
            setShowFormModal(false);
            setEditingPackage(null);
          }}
          onSaved={handlePackageSaved}
        />
      )}

      {showDetailsModal && selectedPackage && (
        <DcpPackageDetailsModal
          pkg={selectedPackage}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedPackage(null);
          }}
        />
      )}
    </div>
  );
};

const DcpPackageFormModal = ({
  token,
  pkg,
  schools,
  loadingSchools,
  onClose,
  onSaved,
}) => {
  const [formData, setFormData] = useState(DEFAULT_PACKAGE);
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [drFile, setDrFile] = useState(null);
  const [ptrFile, setPtrFile] = useState(null);
  const [iarFile, setIarFile] = useState(null);

  useEffect(() => {
    if (pkg) {
      setFormData({
        ...DEFAULT_PACKAGE,
        ...pkg,
        school_id: pkg.school_id ? String(pkg.school_id) : "",
        delivery_date: pkg.delivery_date
          ? new Date(pkg.delivery_date).toISOString().split("T")[0]
          : "",
      });
      setErrors({});
      setDrFile(null);
      setPtrFile(null);
      setIarFile(null);
    } else {
      setFormData(DEFAULT_PACKAGE);
      setErrors({});
      setDrFile(null);
      setPtrFile(null);
      setIarFile(null);
    }
  }, [pkg]);

  const validate = () => {
    const nextErrors = {};
    if (!formData.school_id)
      nextErrors.school_id = "School assignment is required";
    if (!formData.batch_name.trim())
      nextErrors.batch_name = "Batch name is required";
    if (!formData.details.trim())
      nextErrors.details = "Provide package details";
    if ((Number(formData.quantity) || 0) < 1)
      nextErrors.quantity = "Minimum of 1 item";
    if ((Number(formData.package_count) || 0) < 1)
      nextErrors.package_count = "Minimum of 1 package";

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleFileChange = (e, type) => {
    const file = e.target.files?.[0] || null;
    if (!file) {
      if (type === "dr") setDrFile(null);
      if (type === "ptr") setPtrFile(null);
      if (type === "iar") setIarFile(null);
      return;
    }

    // Limit to common document/image types but generally allow most docs
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "text/plain",
      "text/csv",
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/gif",
      "image/webp",
      "application/zip",
      "application/x-zip-compressed",
    ];

    if (!allowedTypes.includes(file.type)) {
      showToast.error(
        "Unsupported file type. Please upload a valid document or image."
      );
      e.target.value = "";
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showToast.error("File is too large. Maximum size is 10 MB.");
      e.target.value = "";
      return;
    }

    if (type === "dr") {
      setDrFile(file);
      setFormData((prev) => ({
        ...prev,
        dr_filename: file.name,
      }));
    }
    if (type === "ptr") {
      setPtrFile(file);
      setFormData((prev) => ({
        ...prev,
        ptr_filename: file.name,
      }));
    }
    if (type === "iar") {
      setIarFile(file);
      setFormData((prev) => ({
        ...prev,
        iar_filename: file.name,
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSaving) return;

    if (!validate()) {
      showToast.error("Please fix the highlighted fields before saving.");
      return;
    }

    setIsSaving(true);

    const payload = {
      ...formData,
      school_id: Number(formData.school_id),
      quantity: Math.max(1, Number(formData.quantity) || 1),
      package_count: Math.max(1, Number(formData.package_count) || 1),
      delivery_date: formData.delivery_date || null,
    };

    const formPayload = new FormData();
    Object.entries(payload).forEach(([key, value]) => {
      if (value === undefined) return;
      formPayload.append(key, value ?? "");
    });

    if (drFile) formPayload.append("dr_file", drFile);
    if (ptrFile) formPayload.append("ptr_file", ptrFile);
    if (iarFile) formPayload.append("iar_file", iarFile);

    try {
      showAlert.processing(
        pkg ? "Updating Package" : "Creating Package",
        pkg ? "Saving changes..." : "Registering new DCP package..."
      );

      if (pkg) {
        formPayload.append("_method", "PUT");
      }

      const response = await fetch(
        pkg
          ? `${API_BASE}/ict/dcp-packages/${pkg.id}`
          : `${API_BASE}/ict/dcp-packages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
          body: formPayload,
        }
      );

      const data = await response.json();
      showAlert.close();

      if (!response.ok) {
        if (data.errors) {
          setErrors((prev) => ({ ...prev, ...data.errors }));
        }
        throw new Error(data.message || "Failed to save DCP package");
      }

      showToast.success(
        `DCP package ${pkg ? "updated" : "created"} successfully!`
      );
      onSaved(data.package || data.data || payload, Boolean(pkg));
    } catch (error) {
      console.error(error);
      showAlert.error("Error", error.message || "Failed to save DCP package");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (isSaving) return;
    onClose();
  };

  return (
    <Portal>
      <div
        className="modal fade show d-block modal-backdrop-animation"
        tabIndex="-1"
        role="dialog"
        style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
      >
        <div className="modal-dialog modal-dialog-centered modal-xl">
          <div
            className="modal-content border-0 modal-content-animation"
            style={{
              borderRadius: "12px",
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
            }}
          >
            <div
              className="modal-header border-0 text-white"
              style={{ backgroundColor: "#0E254B" }}
            >
              <h5 className="modal-title fw-bold mb-0">
                <i className={`fas ${pkg ? "fa-edit" : "fa-plus"} me-2`}></i>
                {pkg ? "Update DCP Package" : "Register DCP Package"}
              </h5>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={handleClose}
                aria-label="Close"
                disabled={isSaving}
              ></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div
                className="modal-body bg-light"
                style={{ maxHeight: "75vh", overflowY: "auto" }}
              >
                <div className="container-fluid px-1">
                  <div className="row gy-3">
                    <div className="col-12">
                      <div className="card border-0 shadow-sm">
                        <div className="card-body">
                          <div className="row g-3">
                            <div className="col-lg-6">
                              <label className="form-label small fw-semibold text-dark">
                                Assign to School{" "}
                                <span className="text-danger">*</span>
                              </label>
                              <select
                                className={`form-select ${
                                  errors.school_id ? "is-invalid" : ""
                                }`}
                                name="school_id"
                                value={formData.school_id}
                                onChange={handleChange}
                                disabled={loadingSchools || isSaving}
                              >
                                <option value="">
                                  {loadingSchools
                                    ? "Loading schools..."
                                    : "Select a school"}
                                </option>
                                {schools.map((school) => (
                                  <option key={school.id} value={school.id}>
                                    {school.name}
                                  </option>
                                ))}
                              </select>
                              {errors.school_id && (
                                <div className="invalid-feedback">
                                  {errors.school_id}
                                </div>
                              )}
                            </div>
                            <div className="col-lg-6">
                              <label className="form-label small fw-semibold text-dark">
                                Batch Name{" "}
                                <span className="text-danger">*</span>
                              </label>
                              <input
                                type="text"
                                className={`form-control ${
                                  errors.batch_name ? "is-invalid" : ""
                                }`}
                                name="batch_name"
                                value={formData.batch_name}
                                onChange={handleChange}
                                placeholder="e.g., Batch 40 - K to G3"
                              />
                              {errors.batch_name && (
                                <div className="invalid-feedback">
                                  {errors.batch_name}
                                </div>
                              )}
                            </div>
                            <div className="col-md-6 col-lg-3">
                              <label className="form-label small fw-semibold text-dark">
                                Quantity
                              </label>
                              <input
                                type="number"
                                min="1"
                                className={`form-control ${
                                  errors.quantity ? "is-invalid" : ""
                                }`}
                                name="quantity"
                                value={formData.quantity}
                                onChange={handleChange}
                              />
                              {errors.quantity && (
                                <div className="invalid-feedback">
                                  {errors.quantity}
                                </div>
                              )}
                            </div>
                            <div className="col-md-6 col-lg-3">
                              <label className="form-label small fw-semibold text-dark">
                                Package Count
                              </label>
                              <input
                                type="number"
                                min="1"
                                className={`form-control ${
                                  errors.package_count ? "is-invalid" : ""
                                }`}
                                name="package_count"
                                value={formData.package_count}
                                onChange={handleChange}
                              />
                              {errors.package_count && (
                                <div className="invalid-feedback">
                                  {errors.package_count}
                                </div>
                              )}
                            </div>
                            <div className="col-md-6 col-lg-3">
                              <label className="form-label small fw-semibold text-dark">
                                Delivery Date
                              </label>
                              <input
                                type="date"
                                className="form-control"
                                name="delivery_date"
                                value={formData.delivery_date || ""}
                                onChange={handleChange}
                              />
                            </div>
                            <div className="col-md-6 col-lg-3">
                              <label className="form-label small fw-semibold text-dark">
                                Delivery Status
                              </label>
                              <select
                                className="form-select"
                                name="delivery_status"
                                value={formData.delivery_status}
                                onChange={handleChange}
                              >
                                <option value="">Select status</option>
                                {deliveryStatusOptions.map((status) => (
                                  <option key={status} value={status}>
                                    {status}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="col-md-6 col-lg-3">
                              <label className="form-label small fw-semibold text-dark">
                                Installation Status
                              </label>
                              <select
                                className="form-select"
                                name="installation_status"
                                value={formData.installation_status}
                                onChange={handleChange}
                              >
                                <option value="">Select status</option>
                                {installationStatusOptions.map((status) => (
                                  <option key={status} value={status}>
                                    {status}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="col-12">
                              <label className="form-label small fw-semibold text-dark">
                                Package Details{" "}
                                <span className="text-danger">*</span>
                              </label>
                              <textarea
                                className={`form-control ${
                                  errors.details ? "is-invalid" : ""
                                }`}
                                name="details"
                                rows="3"
                                value={formData.details}
                                onChange={handleChange}
                                placeholder='e.g., Laptop 14" (5), Projector (1), Multimedia Speaker (1)'
                              ></textarea>
                              {errors.details && (
                                <div className="invalid-feedback">
                                  {errors.details}
                                </div>
                              )}
                            </div>
                            <div className="col-12">
                              <label className="form-label small fw-semibold text-dark">
                                Remarks
                              </label>
                              <textarea
                                className="form-control"
                                name="remarks"
                                rows="2"
                                value={formData.remarks}
                                onChange={handleChange}
                                placeholder="Optional notes about delivery or installation"
                              ></textarea>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="col-12">
                      <div className="card border-0 shadow-sm">
                        <div className="card-body">
                          <div className="row g-3">
                            {[
                              {
                                label: "Delivery Receipt (DR)",
                                numberKey: "dr_number",
                                fileKey: "dr_filename",
                                fileType: "dr",
                              },
                              {
                                label: "Property Transfer Report (PTR/ITR)",
                                numberKey: "ptr_number",
                                fileKey: "ptr_filename",
                                fileType: "ptr",
                              },
                              {
                                label: "Inspection Acceptance Report (IAR)",
                                numberKey: "iar_number",
                                fileKey: "iar_filename",
                                fileType: "iar",
                              },
                            ].map((doc) => (
                              <div className="col-md-4" key={doc.label}>
                                <h6 className="fw-bold text-uppercase small text-muted mb-3">
                                  {doc.label}
                                </h6>
                                <div className="mb-3">
                                  <label className="form-label small fw-semibold text-dark">
                                    Document Number
                                  </label>
                                  <input
                                    type="text"
                                    className="form-control"
                                    name={doc.numberKey}
                                    value={formData[doc.numberKey]}
                                    onChange={handleChange}
                                  />
                                </div>
                                <div className="mb-2">
                                  <label className="form-label small fw-semibold text-dark">
                                    Upload File
                                  </label>
                                  <input
                                    type="file"
                                    className="form-control form-control-sm"
                                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.png,.jpg,.jpeg,.gif,.webp"
                                    onChange={(e) =>
                                      handleFileChange(e, doc.fileType)
                                    }
                                  />
                                  <small className="text-muted d-block mt-1">
                                    Accepted: PDF, Word, Excel, PowerPoint,
                                    images, ZIP (max 10 MB)
                                  </small>
                                </div>
                                {formData[doc.fileKey] && (
                                  <div className="small text-muted text-truncate">
                                    Current: {formData[doc.fileKey]}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer border-top bg-white modal-smooth">
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-smooth"
                  onClick={handleClose}
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-smooth"
                  style={{ backgroundColor: "#0E254B", borderColor: "#0E254B" }}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Saving...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-save me-1"></i>
                      {pkg ? "Update Package" : "Register Package"}
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

const DcpPackageDetailsModal = ({ pkg, onClose }) => {
  if (!pkg) return null;

  return (
    <Portal>
      <div
        className="modal fade show d-block modal-backdrop-animation"
        tabIndex="-1"
        role="dialog"
        style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
      >
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div
            className="modal-content border-0 modal-content-animation"
            style={{ borderRadius: "12px" }}
          >
            <div
              className="modal-header border-0 text-white"
              style={{ backgroundColor: "#0E254B" }}
            >
              <h5 className="modal-title fw-bold mb-0">
                <i className="fas fa-eye me-2"></i>
                DCP Package Details
              </h5>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={onClose}
                aria-label="Close"
              ></button>
            </div>
            <div
              className="modal-body bg-light"
              style={{ maxHeight: "70vh", overflowY: "auto" }}
            >
              <div className="container-fluid px-1">
                <div className="row gy-3">
                  <div className="col-12">
                    <div className="card border-0 shadow-sm">
                      <div className="card-body">
                        <h6 className="fw-bold text-uppercase small text-muted mb-3">
                          Package Snapshot
                        </h6>
                        <div className="row g-3">
                          <div className="col-md-6">
                            <div className="mb-2">
                              <span className="text-muted small">
                                Batch Name
                              </span>
                              <div className="fw-semibold">
                                {pkg.batch_name || "N/A"}
                              </div>
                            </div>
                            <div className="mb-2">
                              <span className="text-muted small">
                                Quantity / Packages
                              </span>
                              <div className="fw-semibold">
                                {pkg.quantity || 0} items /{" "}
                                {pkg.package_count ?? pkg.quantity ?? 0}{" "}
                                packages
                              </div>
                            </div>
                            <div>
                              <span className="text-muted small">
                                Delivery Date
                              </span>
                              <div className="fw-semibold">
                                {formatDate(pkg.delivery_date)}
                              </div>
                            </div>
                          </div>
                          <div className="col-md-6">
                            <div className="mb-2">
                              <span className="text-muted small">
                                Assigned School
                              </span>
                              <div className="fw-semibold">
                                {pkg.school?.name || "Unassigned"}
                              </div>
                              <div className="small text-muted">
                                {pkg.school?.division ||
                                  pkg.school?.region ||
                                  "—"}
                              </div>
                            </div>
                            <div className="mb-2">
                              <span className="text-muted small">
                                Delivery Status
                              </span>
                              <div>
                                <span
                                  className={statusBadgeClass(
                                    pkg.delivery_status
                                  )}
                                >
                                  {pkg.delivery_status || "Not set"}
                                </span>
                              </div>
                            </div>
                            <div>
                              <span className="text-muted small">
                                Installation Status
                              </span>
                              <div>
                                <span
                                  className={statusBadgeClass(
                                    pkg.installation_status
                                  )}
                                >
                                  {pkg.installation_status || "Not set"}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="mt-3">
                          <span className="text-muted small">Details</span>
                          <p className="mb-0">
                            {pkg.details || "No details provided"}
                          </p>
                        </div>
                        <div className="mt-2">
                          <span className="text-muted small">Remarks</span>
                          <p className="mb-0">
                            {pkg.remarks || "No remarks yet"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="col-12">
                    <div className="card border-0 shadow-sm">
                      <div className="card-body">
                        <h6 className="fw-bold text-uppercase small text-muted mb-3">
                          Supporting Documents
                        </h6>
                        <div className="row g-3">
                          {[
                            {
                              label: "Delivery Receipt (DR)",
                              number: pkg.dr_number,
                              file: pkg.dr_filename,
                              type: "dr",
                            },
                            {
                              label: "Property Transfer Report (PTR/ITR)",
                              number: pkg.ptr_number,
                              file: pkg.ptr_filename,
                              type: "ptr",
                            },
                            {
                              label: "Inspection Acceptance Report (IAR)",
                              number: pkg.iar_number,
                              file: pkg.iar_filename,
                              type: "iar",
                            },
                          ].map((doc) => (
                            <div className="col-md-4" key={doc.label}>
                              <div className="border rounded p-3 h-100">
                                <div className="small text-muted mb-1">
                                  {doc.label}
                                </div>
                                <div className="fw-semibold">
                                  {doc.number || "No reference"}
                                </div>
                                <div className="text-muted small">
                                  {doc.file || "No filename stored"}
                                </div>
                                {doc.file ? (
                                  <a
                                    href={getDcpDocumentUrl(pkg, doc.type)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="btn btn-sm btn-outline-primary w-100 mt-2"
                                  >
                                    <i className="fas fa-download me-1"></i>
                                    Download
                                  </a>
                                ) : (
                                  <small className="text-muted d-block mt-2">
                                    No file available
                                  </small>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="col-12">
                    <div className="card border-0 shadow-sm">
                      <div className="card-body">
                        <h6 className="fw-bold text-uppercase small text-muted mb-3">
                          Metadata
                        </h6>
                        <div className="row">
                          <div className="col-md-6">
                            <div className="text-muted small">Created At</div>
                            <div className="fw-semibold">
                              {formatDateTime(pkg.created_at)}
                            </div>
                          </div>
                          <div className="col-md-6">
                            <div className="text-muted small">Last Updated</div>
                            <div className="fw-semibold">
                              {formatDateTime(pkg.updated_at)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer border-top bg-white">
              <button className="btn btn-outline-secondary" onClick={onClose}>
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
};

export default DcpPackages;
