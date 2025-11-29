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

const DEFAULT_PROGRESS = {
  delivery_date: "",
  delivery_status: "",
  installation_status: "",
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

const CustodianDcpPackages = () => {
  const { token } = useAuth();
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPackage, setSelectedPackage] = useState(null);

  const fetchPackages = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/property-custodian/dcp-packages`, {
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
      console.error("Error fetching DCP packages:", error);
      showAlert.error("Error", error.message || "Unable to load DCP packages");
      setPackages([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

  const filteredPackages = useMemo(() => {
    let filtered = [...packages];

    if (searchTerm.trim()) {
      const lowered = searchTerm.toLowerCase();
      filtered = filtered.filter((pkg) => {
        const batch = pkg.batch_name || "";
        const details = pkg.details || "";
        const remarks = pkg.remarks || "";
        return (
          batch.toLowerCase().includes(lowered) ||
          details.toLowerCase().includes(lowered) ||
          remarks.toLowerCase().includes(lowered)
        );
      });
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(
        (pkg) =>
          pkg.delivery_status?.toLowerCase() === statusFilter ||
          pkg.installation_status?.toLowerCase() === statusFilter
      );
    }

    return filtered;
  }, [packages, searchTerm, statusFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filteredPackages.length, itemsPerPage, searchTerm, statusFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredPackages.length / itemsPerPage) || 1
  );
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPackages = filteredPackages.slice(startIndex, endIndex);

  const openModal = (pkg) => {
    const progress = { ...DEFAULT_PROGRESS };
    Object.keys(DEFAULT_PROGRESS).forEach((key) => {
      if (key === "delivery_date") {
        progress[key] = pkg.delivery_date
          ? new Date(pkg.delivery_date).toISOString().split("T")[0]
          : "";
      } else {
        progress[key] = pkg[key] || "";
      }
    });

    setSelectedPackage({
      ...pkg,
      progress,
    });
  };

  const closeModal = () => {
    if (selectedPackage?.saving) return;
    setSelectedPackage(null);
  };

  const handleProgressChange = (e) => {
    const { name, value } = e.target;
    setSelectedPackage((prev) => ({
      ...prev,
      progress: {
        ...prev.progress,
        [name]: value,
      },
    }));
  };

  const handleProgressSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPackage) return;

    setSelectedPackage((prev) => ({ ...prev, saving: true }));

    const payload = {
      ...selectedPackage.progress,
      delivery_date: selectedPackage.progress.delivery_date || null,
    };

    try {
      showAlert.processing("Updating Package", "Saving your updates...");

      const response = await fetch(
        `${API_BASE}/property-custodian/dcp-packages/${selectedPackage.id}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to update DCP package");
      }

      showAlert.close();
      showToast.success("Package progress saved!");

      setPackages((prev) =>
        prev.map((pkg) => (pkg.id === data.package.id ? data.package : pkg))
      );
      setSelectedPackage(null);
    } catch (error) {
      console.error("Error updating DCP package:", error);
      showAlert.close();
      showAlert.error("Error", error.message || "Failed to update package");
      setSelectedPackage((prev) => ({ ...prev, saving: false }));
    }
  };

  const formatDate = (value) => {
    if (!value) return "N/A";
    const date = new Date(value);
    return isNaN(date.getTime())
      ? value
      : date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
  };

  return (
    <div className="container-fluid px-3 py-2 fadeIn">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-3">
        <div className="flex-grow-1 mb-2 mb-md-0">
          <h1 className="h4 mb-1 fw-bold" style={{ color: "var(--text-primary)" }}>
            DCP Package Tracking
          </h1>
          <p className="mb-0 small" style={{ color: "var(--text-muted)" }}>
            Review DCP deliveries assigned to your school and keep supporting documents up-to-date.
          </p>
        </div>
        <button
          className="btn btn-sm btn-outline-primary"
          disabled={loading}
          onClick={fetchPackages}
        >
          <i className="fas fa-sync-alt me-1"></i>
          Refresh
        </button>
      </div>

      <div className="card border-0 shadow-sm mb-3" style={{ backgroundColor: "var(--background-white)" }}>
        <div className="card-body p-3">
          <div className="row g-2 align-items-end">
            <div className="col-md-6">
              <label className="form-label small fw-semibold mb-1" style={{ color: "var(--text-muted)" }}>
                Search Package
              </label>
              <div className="input-group input-group-sm">
                <span className="input-group-text" style={{ backgroundColor: "var(--background-light)", borderColor: "var(--input-border)", color: "var(--text-muted)" }}>
                  <i className="fas fa-search"></i>
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search by batch, details, remarks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  disabled={loading}
                />
                {searchTerm && (
                  <button
                    className="btn btn-sm"
                    type="button"
                    onClick={() => setSearchTerm("")}
                    disabled={loading}
                    style={{
                      color: "#6c757d",
                      backgroundColor: "transparent",
                      border: "none",
                      padding: "0.25rem 0.5rem",
                    }}
                  >
                    <i className="fas fa-times"></i>
                  </button>
                )}
              </div>
            </div>
            <div className="col-md-3">
              <label className="form-label small fw-semibold mb-1" style={{ color: "var(--text-muted)" }}>
                Status Filter
              </label>
              <select
                className="form-select form-select-sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                disabled={loading}
              >
                <option value="all">All Status</option>
                {[
                  ...new Set([
                    ...deliveryStatusOptions.map((s) => s.toLowerCase()),
                    ...installationStatusOptions.map((s) => s.toLowerCase()),
                  ]),
                ].map((status) => (
                  <option key={status} value={status}>
                    {status.replace(/\b\w/g, (l) => l.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label small fw-semibold mb-1" style={{ color: "var(--text-muted)" }}>
                Items per page
              </label>
              <select
                className="form-select form-select-sm"
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                disabled={loading}
              >
                {[5, 10, 20].map((size) => (
                  <option key={size} value={size}>
                    {size} per page
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm" style={{ backgroundColor: "var(--background-white)" }}>
        <div
          className="card-header border-bottom-0 py-2"
          style={{
            background: "var(--topbar-bg)",
            color: "var(--topbar-text)",
          }}
        >
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="card-title mb-0 fw-semibold text-white">
              <i className="fas fa-boxes-stacked me-2"></i>
              Assigned Packages
              {!loading && (
                <small className="opacity-75 ms-2 text-white">
                  ({filteredPackages.length} total)
                </small>
              )}
            </h5>
          </div>
        </div>

        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5">
              <div
                className="spinner-border mb-2"
                style={{ color: "var(--primary-color)" }}
                role="status"
              >
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="small mb-0" style={{ color: "var(--text-muted)" }}>
                Fetching assigned DCP packages...
              </p>
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
                No Packages Yet
              </h5>
              <p className="mb-3 small" style={{ color: "var(--text-muted)" }}>
                ICT will assign DCP packages to your school when available.
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
                        style={{ width: "8%" }}
                      >
                        Action
                      </th>
                      <th className="small fw-semibold" style={{ width: "15%" }}>
                        Batch
                      </th>
                      <th className="small fw-semibold">Details</th>
                      <th className="small fw-semibold" style={{ width: "8%" }}>
                        Packages
                      </th>
                      <th className="small fw-semibold" style={{ width: "12%" }}>
                        Delivery Status
                      </th>
                      <th className="small fw-semibold" style={{ width: "12%" }}>
                        Installation Status
                      </th>
                      <th className="small fw-semibold" style={{ width: "10%" }}>
                        DR No.
                      </th>
                      <th className="small fw-semibold" style={{ width: "10%" }}>
                        PTR-ITR No.
                      </th>
                      <th className="small fw-semibold" style={{ width: "10%" }}>
                        IAR No.
                      </th>
                      <th className="small fw-semibold" style={{ width: "13%" }}>
                        Remarks
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentPackages.map((pkg, index) => (
                      <tr key={pkg.id}>
                        <td
                          className="text-center fw-bold"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {startIndex + index + 1}
                        </td>
                        <td className="text-center">
                          <button
                            className="btn btn-primary btn-sm text-white"
                            onClick={() => openModal(pkg)}
                          >
                            <i className="fas fa-pen me-1"></i>
                            Update
                          </button>
                        </td>
                        <td>
                          <div className="fw-semibold" style={{ color: "var(--text-primary)" }}>
                            {pkg.batch_name}
                          </div>
                          <div className="small" style={{ color: "var(--text-muted)" }}>
                            Qty: {pkg.quantity || 0}
                          </div>
                          <div className="small" style={{ color: "var(--text-muted)" }}>
                            Delivery: {formatDate(pkg.delivery_date)}
                          </div>
                        </td>
                        <td style={{ minWidth: "200px" }}>
                          <div
                            style={{
                              color: "var(--text-primary)",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {pkg.details || "No details provided"}
                          </div>
                        </td>
                        <td className="text-center fw-semibold">
                          {pkg.package_count ?? pkg.quantity ?? 0}
                        </td>
                        <td>
                          <span className="badge bg-primary-subtle text-primary-emphasis">
                            {pkg.delivery_status || "Not set"}
                          </span>
                        </td>
                        <td>
                          <span className="badge bg-success-subtle text-success-emphasis">
                            {pkg.installation_status || "Not set"}
                          </span>
                        </td>
                        <td>
                          <div className="fw-semibold" style={{ color: "var(--text-primary)" }}>
                            {pkg.dr_number || "—"}
                          </div>
                          <div className="small" style={{ color: "var(--text-muted)" }}>
                            {pkg.dr_filename || ""}
                          </div>
                          {pkg.dr_filename && (
                            <a
                              href={getDcpDocumentUrl(pkg, "dr")}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-link btn-sm p-0"
                            >
                              <i className="fas fa-download me-1"></i>
                              Download
                            </a>
                          )}
                        </td>
                        <td>
                          <div className="fw-semibold" style={{ color: "var(--text-primary)" }}>
                            {pkg.ptr_number || "—"}
                          </div>
                          <div className="small" style={{ color: "var(--text-muted)" }}>
                            {pkg.ptr_filename || ""}
                          </div>
                          {pkg.ptr_filename && (
                            <a
                              href={getDcpDocumentUrl(pkg, "ptr")}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-link btn-sm p-0"
                            >
                              <i className="fas fa-download me-1"></i>
                              Download
                            </a>
                          )}
                        </td>
                        <td>
                          <div className="fw-semibold" style={{ color: "var(--text-primary)" }}>
                            {pkg.iar_number || "—"}
                          </div>
                          <div className="small" style={{ color: "var(--text-muted)" }}>
                            {pkg.iar_filename || ""}
                          </div>
                          {pkg.iar_filename && (
                            <a
                              href={getDcpDocumentUrl(pkg, "iar")}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-link btn-sm p-0"
                            >
                              <i className="fas fa-download me-1"></i>
                              Download
                            </a>
                          )}
                        </td>
                        <td>
                          <div
                            className="small"
                            style={{
                              color: "var(--text-primary)",
                              maxWidth: "180px",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                            title={pkg.remarks || ""}
                          >
                            {pkg.remarks || "—"}
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
                        <span className="fw-semibold" style={{ color: "var(--text-primary)" }}>
                          {startIndex + 1}-{Math.min(endIndex, filteredPackages.length)}
                        </span>{" "}
                        of{" "}
                        <span className="fw-semibold" style={{ color: "var(--text-primary)" }}>
                          {filteredPackages.length}
                        </span>{" "}
                        packages
                      </small>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                      <button
                        className="btn btn-sm"
                        onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        style={{
                          border: "2px solid var(--primary-color)",
                          color: "var(--primary-color)",
                          backgroundColor: "transparent",
                        }}
                      >
                        <i className="fas fa-chevron-left me-1"></i>
                        Previous
                      </button>
                      <button
                        className="btn btn-sm"
                        onClick={() =>
                          setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                        }
                        disabled={currentPage === totalPages}
                        style={{
                          border: "2px solid var(--primary-color)",
                          color: "var(--primary-color)",
                          backgroundColor: "transparent",
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

      {selectedPackage && (
        <PackageProgressModal
          pkg={selectedPackage}
          onClose={closeModal}
          onSubmit={handleProgressSubmit}
          onChange={handleProgressChange}
        />
      )}
    </div>
  );
};

const PackageProgressModal = ({ pkg, onClose, onSubmit, onChange }) => {
  const [isClosing, setIsClosing] = useState(false);

  const performClose = useCallback(async () => {
    setIsClosing(true);
    await new Promise((resolve) => setTimeout(resolve, 300));
    onClose();
  }, [onClose]);

  const handleCloseAttempt = useCallback(async () => {
    if (pkg.saving) return;
    await performClose();
  }, [performClose, pkg.saving]);

  const handleBackdropClick = useCallback(
    async (e) => {
      if (e.target === e.currentTarget) {
        await handleCloseAttempt();
      }
    },
    [handleCloseAttempt]
  );

  const handleEscapeKey = useCallback(
    async (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        await handleCloseAttempt();
      }
    },
    [handleCloseAttempt]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleEscapeKey);
    return () => document.removeEventListener("keydown", handleEscapeKey);
  }, [handleEscapeKey]);

  return (
    <Portal>
      <div
        className={`modal fade show d-block modal-backdrop-animation ${
          isClosing ? "exit" : ""
        }`}
        tabIndex="-1"
        role="dialog"
        style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
        onClick={handleBackdropClick}
      >
        <div className="modal-dialog modal-dialog-centered modal-xl">
          <div
            className={`modal-content border-0 modal-content-animation ${
              isClosing ? "exit" : ""
            }`}
            style={{
              borderRadius: "12px",
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
            }}
          >
            <div className="modal-header border-0 text-white" style={{ backgroundColor: "#0E254B" }}>
              <h5 className="modal-title fw-bold">Update Package Progress</h5>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={handleCloseAttempt}
                aria-label="Close"
                disabled={pkg.saving}
              ></button>
            </div>
            <form onSubmit={onSubmit}>
              <div className="modal-body bg-light" style={{ maxHeight: "75vh", overflowY: "auto" }}>
                <div className="container-fluid px-1">
                  <div className="row gy-3">
                    <div className="col-12">
                      <div className="card border-0 shadow-sm">
                        <div className="card-body">
                          <div className="row g-3">
                            <div className="col-md-6">
                              <h6 className="fw-bold text-uppercase small text-muted mb-3">
                                Package Snapshot (View Only)
                              </h6>
                              <div className="mb-3">
                                <label className="form-label small fw-semibold">Batch Name</label>
                                <input
                                  type="text"
                                  className="form-control"
                                  value={pkg.batch_name || ""}
                                  disabled
                                />
                              </div>
                              <div className="row g-2">
                                <div className="col-md-6">
                                  <label className="form-label small fw-semibold">Quantity</label>
                                  <input
                                    type="text"
                                    className="form-control"
                                    value={pkg.quantity ?? 0}
                                    disabled
                                  />
                                </div>
                                <div className="col-md-6">
                                  <label className="form-label small fw-semibold">Package Count</label>
                                  <input
                                    type="text"
                                    className="form-control"
                                    value={pkg.package_count ?? pkg.quantity ?? 0}
                                    disabled
                                  />
                                </div>
                              </div>
                              <div className="mt-3">
                                <label className="form-label small fw-semibold">Details</label>
                                <textarea
                                  className="form-control"
                                  rows="4"
                                  value={pkg.details || "No details provided"}
                                  disabled
                                ></textarea>
                              </div>
                            </div>
                            <div className="col-md-6">
                              <h6 className="fw-bold text-uppercase small text-muted mb-3">
                                Update Progress
                              </h6>
                              <div className="row g-2">
                                <div className="col-md-6">
                                  <label className="form-label small fw-semibold">Delivery Status</label>
                                  <select
                                    className="form-select"
                                    name="delivery_status"
                                    value={pkg.progress.delivery_status}
                                    onChange={onChange}
                                  >
                                    <option value="">Select status</option>
                                    {deliveryStatusOptions.map((status) => (
                                      <option key={status} value={status}>
                                        {status}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div className="col-md-6">
                                  <label className="form-label small fw-semibold">
                                    Installation Status
                                  </label>
                                  <select
                                    className="form-select"
                                    name="installation_status"
                                    value={pkg.progress.installation_status}
                                    onChange={onChange}
                                  >
                                    <option value="">Select status</option>
                                    {installationStatusOptions.map((status) => (
                                      <option key={status} value={status}>
                                        {status}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                              <div className="mt-3">
                                <label className="form-label small fw-semibold">Delivery Date</label>
                                <input
                                  type="date"
                                  className="form-control"
                                  name="delivery_date"
                                  value={pkg.progress.delivery_date || ""}
                                  onChange={onChange}
                                />
                              </div>
                              <div className="mt-3">
                                <label className="form-label small fw-semibold">Remarks</label>
                                <textarea
                                  className="form-control"
                                  rows="2"
                                  name="remarks"
                                  value={pkg.progress.remarks}
                                  onChange={onChange}
                                ></textarea>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="col-12">
                      <div className="card border-0 shadow-sm">
                        <div className="card-body">
                          <div className="row g-3">
                            <div className="col-md-4">
                              <h6 className="fw-bold text-uppercase small text-muted mb-3">
                                Delivery Receipt (DR)
                              </h6>
                              <div className="mb-3">
                                <label className="form-label small fw-semibold">DR Number</label>
                                <input
                                  type="text"
                                  className="form-control"
                                  name="dr_number"
                                  value={pkg.progress.dr_number}
                                  onChange={onChange}
                                />
                              </div>
                              <div>
                                <label className="form-label small fw-semibold">DR Filename</label>
                                <input
                                  type="text"
                                  className="form-control"
                                  name="dr_filename"
                                  value={pkg.progress.dr_filename}
                                  onChange={onChange}
                                />
                                {pkg.dr_filename && (
                                  <a
                                    href={getDcpDocumentUrl(pkg, "dr")}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="btn btn-link btn-sm p-0 mt-1"
                                  >
                                    <i className="fas fa-download me-1"></i>
                                    Download current
                                  </a>
                                )}
                              </div>
                            </div>
                            <div className="col-md-4">
                              <h6 className="fw-bold text-uppercase small text-muted mb-3">
                                Property Transfer Report (PTR/ITR)
                              </h6>
                              <div className="mb-3">
                                <label className="form-label small fw-semibold">PTR/ITR Number</label>
                                <input
                                  type="text"
                                  className="form-control"
                                  name="ptr_number"
                                  value={pkg.progress.ptr_number}
                                  onChange={onChange}
                                />
                              </div>
                              <div>
                                <label className="form-label small fw-semibold">PTR/ITR Filename</label>
                                <input
                                  type="text"
                                  className="form-control"
                                  name="ptr_filename"
                                  value={pkg.progress.ptr_filename}
                                  onChange={onChange}
                                />
                                {pkg.ptr_filename && (
                                  <a
                                    href={getDcpDocumentUrl(pkg, "ptr")}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="btn btn-link btn-sm p-0 mt-1"
                                  >
                                    <i className="fas fa-download me-1"></i>
                                    Download current
                                  </a>
                                )}
                              </div>
                            </div>
                            <div className="col-md-4">
                              <h6 className="fw-bold text-uppercase small text-muted mb-3">
                                Inspection Acceptance Report (IAR)
                              </h6>
                              <div className="mb-3">
                                <label className="form-label small fw-semibold">IAR Number</label>
                                <input
                                  type="text"
                                  className="form-control"
                                  name="iar_number"
                                  value={pkg.progress.iar_number}
                                  onChange={onChange}
                                />
                              </div>
                              <div>
                                <label className="form-label small fw-semibold">IAR Filename</label>
                                <input
                                  type="text"
                                  className="form-control"
                                  name="iar_filename"
                                  value={pkg.progress.iar_filename}
                                  onChange={onChange}
                                />
                                {pkg.iar_filename && (
                                  <a
                                    href={getDcpDocumentUrl(pkg, "iar")}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="btn btn-link btn-sm p-0 mt-1"
                                  >
                                    <i className="fas fa-download me-1"></i>
                                    Download current
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer border-0 bg-white modal-smooth">
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-smooth"
                  onClick={handleCloseAttempt}
                  disabled={pkg.saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-smooth"
                  style={{ backgroundColor: "#0E254B", borderColor: "#0E254B" }}
                  disabled={pkg.saving}
                >
                  {pkg.saving ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Saving...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-save me-1"></i>
                      Save Updates
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

export default CustodianDcpPackages;

