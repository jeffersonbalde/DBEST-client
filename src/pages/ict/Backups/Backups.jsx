import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { showAlert, showToast } from "../../../services/notificationService";

const API_BASE =
  import.meta.env.VITE_LARAVEL_API || "http://localhost:8000/api";

const Backups = () => {
  const { token } = useAuth();
  const [backupInfo, setBackupInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [actionProcessing, setActionProcessing] = useState(null);
  const [actionLock, setActionLock] = useState(false);

  const fetchBackupInfo = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/backup/info`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch backup information");
      }

      const data = await response.json();
      setBackupInfo(data.data);
    } catch (error) {
      console.error("Error fetching backup info:", error);
      showAlert.error("Error", "Failed to load backup information");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchBackupInfo();
  }, [fetchBackupInfo]);

  const createBackup = async (backupType = "database") => {
    if (creatingBackup || actionLock) return;
    setCreatingBackup(true);
    showAlert.processing(
      "Creating Backup",
      "Please wait while we prepare a fresh copy of your data."
    );

    try {
      const response = await fetch(`${API_BASE}/backup/create`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ type: backupType }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Backup creation failed");
      }

      showAlert.close();
      showToast.success("Backup created successfully!");
      fetchBackupInfo();
    } catch (error) {
      console.error("Error creating backup:", error);
      showAlert.close();
      showAlert.error("Error", error.message || "Failed to create backup");
    } finally {
      setCreatingBackup(false);
    }
  };

  const handleActionStart = (key, title, message) => {
    setActionProcessing(key);
    setActionLock(true);
    showAlert.processing(title, message);
  };

  const handleActionEnd = () => {
    showAlert.close();
    setActionProcessing(null);
    setActionLock(false);
  };

  const downloadBackup = async (filename) => {
    const key = `download-${filename}`;
    handleActionStart(
      key,
      "Preparing Backup",
      "Please wait while we prepare your download."
    );
    try {
      const response = await fetch(`${API_BASE}/backup/download/${filename}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Download failed");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(anchor);

      showToast.success("Backup download started!");
    } catch (error) {
      console.error("Error downloading backup:", error);
      showAlert.error("Error", error.message || "Failed to download backup");
    } finally {
      handleActionEnd();
    }
  };

  const deleteBackup = async (filename) => {
    const confirmation = await showAlert.confirm(
      "Delete Backup",
      `Are you sure you want to delete "${filename}"? This action cannot be undone.`,
      "Yes, delete",
      "Cancel"
    );

    if (!confirmation.isConfirmed) return;

    const key = `delete-${filename}`;
    handleActionStart(
      key,
      "Deleting Backup",
      "Removing backup from secure storage..."
    );

    try {
      const response = await fetch(`${API_BASE}/backup/delete/${filename}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Delete failed");
      }

      showToast.success("Backup deleted successfully!");
      fetchBackupInfo();
    } catch (error) {
      console.error("Error deleting backup:", error);
      showAlert.error("Error", error.message || "Failed to delete backup");
    } finally {
      handleActionEnd();
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const totalSize =
    backupInfo?.backups?.reduce((sum, backup) => sum + backup.size, 0) || 0;

  const isActionDisabled = (id = null) =>
    actionLock || (actionProcessing && actionProcessing !== id);

  return (
    <div className="container-fluid px-3 py-2 backups-container fadeIn">
      {/* Page Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-3">
        <div className="flex-grow-1 mb-2 mb-md-0">
          <h1 className="h4 mb-1 fw-bold" style={{ color: "var(--text-primary)" }}>
            Intelligent Backup Console
          </h1>
          <p className="mb-0 small" style={{ color: "var(--text-muted)" }}>
            Monitor backup health and safeguard database records.
          </p>
        </div>
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <button
            className="btn btn-sm btn-primary text-white"
            onClick={() => createBackup("database")}
            disabled={creatingBackup || isActionDisabled()}
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
            {creatingBackup ? (
              <span className="spinner-border spinner-border-sm me-1" />
            ) : (
              <i className="fas fa-shield-alt me-1" />
            )}
            {creatingBackup ? "Creating..." : "Create Backup"}
          </button>
          <button
            className="btn btn-sm"
            onClick={fetchBackupInfo}
            disabled={loading || creatingBackup || isActionDisabled()}
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
      <BackupInfo
        backupInfo={backupInfo}
        loading={loading}
        formatFileSize={formatFileSize}
        totalSize={totalSize}
      />

      {/* Main Content Card */}
      <BackupList
        backups={backupInfo?.backups || []}
        loading={loading}
        onDownloadBackup={downloadBackup}
        onDeleteBackup={deleteBackup}
        formatFileSize={formatFileSize}
        actionProcessing={actionProcessing}
        actionLock={actionLock}
        isActionDisabled={isActionDisabled}
      />
    </div>
  );
};

const BackupInfo = ({ backupInfo, loading, formatFileSize, totalSize }) => {
  // Skeleton loader for stats cards
  const StatsCardSkeleton = () => {
    return (
      <div className="card stats-card h-100">
        <div className="card-body p-3">
          <div className="d-flex align-items-center">
            <div className="flex-grow-1">
              <div className="text-xs fw-semibold text-uppercase mb-1 placeholder-wave">
                <span className="placeholder col-7" style={{ height: "14px" }}></span>
              </div>
              <div className="h4 mb-0 fw-bold placeholder-wave">
                <span className="placeholder col-4" style={{ height: "28px" }}></span>
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

  const stats = useMemo(
    () => [
      {
        label: "Database Size",
        value: formatFileSize(backupInfo?.database_size || 0),
        color: "var(--primary-color)",
        icon: "fas fa-database",
        iconColor: "var(--primary-light)",
      },
      {
        label: "Backups Stored",
        value: backupInfo?.backup_count || 0,
        color: "var(--accent-color)",
        icon: "fas fa-archive",
        iconColor: "var(--accent-light)",
      },
      {
        label: "Last Backup",
        value: backupInfo?.last_backup
          ? new Date(backupInfo.last_backup).toLocaleDateString()
          : "Never",
        color: "var(--primary-dark)",
        icon: "fas fa-clock",
        iconColor: "var(--primary-color)",
      },
      {
        label: "Total Backup Size",
        value: formatFileSize(totalSize),
        color: "var(--primary-dark)",
        icon: "fas fa-hdd",
        iconColor: "var(--primary-color)",
      },
    ],
    [backupInfo, formatFileSize, totalSize]
  );

  return (
    <div className="row g-3 mb-4">
      {stats.map((stat) => (
        <div className="col-6 col-md-3" key={stat.label}>
          {loading ? (
            <StatsCardSkeleton />
          ) : (
            <div className="card stats-card h-100">
              <div className="card-body p-3">
                <div className="d-flex align-items-center">
                  <div className="flex-grow-1">
                    <div
                      className="text-xs fw-semibold text-uppercase mb-1"
                      style={{ color: stat.color }}
                    >
                      {stat.label}
                    </div>
                    <div
                      className="h4 mb-0 fw-bold"
                      style={{ color: stat.color }}
                    >
                      {stat.value}
                    </div>
                  </div>
                  <div className="col-auto">
                    <i
                      className={`${stat.icon} fa-2x`}
                      style={{ color: stat.iconColor, opacity: 0.7 }}
                    ></i>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

const BackupList = ({
  backups,
  loading,
  onDownloadBackup,
  onDeleteBackup,
  formatFileSize,
  actionProcessing,
  actionLock,
  isActionDisabled,
}) => {
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(backups.length / itemsPerPage) || 1);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentBackups = backups.slice(startIndex, endIndex);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

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

  const getFileTypeIcon = (name) => {
    const ext = name.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "sql":
        return "fas fa-database text-primary";
      case "zip":
      case "gz":
        return "fas fa-file-archive text-warning";
      default:
        return "fas fa-file text-secondary";
    }
  };

  // Skeleton loader for table rows with action button skeletons
  const TableRowSkeleton = () => {
    return (
      <tr className="align-middle" style={{ height: "70px" }}>
        <td className="text-center">
          <div className="placeholder-wave">
            <span className="placeholder col-4" style={{ height: "20px" }}></span>
          </div>
        </td>
        <td className="text-center">
          <div className="d-flex justify-content-center gap-1">
            {[1, 2].map((item) => (
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
                <span className="placeholder col-8" style={{ height: "16px" }}></span>
              </div>
              <div className="placeholder-wave">
                <span className="placeholder col-6" style={{ height: "14px" }}></span>
              </div>
            </div>
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
        <td>
          <div className="placeholder-wave">
            <span className="placeholder col-6" style={{ height: "16px" }}></span>
          </div>
        </td>
      </tr>
    );
  };

  return (
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
            Backup Files
            {!loading && (
              <small className="opacity-75 ms-2 text-white">
                ({backups.length} found)
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
                  <th className="text-center small fw-semibold text-white">#</th>
                  <th className="text-center small fw-semibold text-white">Actions</th>
                  <th className="small fw-semibold text-white">File Name</th>
                  <th className="text-center small fw-semibold text-white">Type</th>
                  <th className="text-center small fw-semibold text-white">Created</th>
                  <th className="text-center small fw-semibold text-white">Size</th>
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
                Fetching backup data...
              </span>
            </div>
          </div>
        ) : currentBackups.length === 0 ? (
          // Empty state
          <div className="text-center py-5">
            <div className="mb-3">
              <i
                className="fas fa-cloud fa-3x"
                style={{ color: "var(--text-muted)", opacity: 0.5 }}
              ></i>
            </div>
            <h5 className="mb-2" style={{ color: "var(--text-muted)" }}>
              No Backups Found
            </h5>
            <p className="mb-3 small" style={{ color: "var(--text-muted)" }}>
              No backups have been created yet. Create a backup to see it listed here.
            </p>
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
                      className="text-center small fw-semibold text-white"
                    >
                      #
                    </th>
                    <th
                      style={{ width: "15%" }}
                      className="text-center small fw-semibold text-white"
                    >
                      Actions
                    </th>
                    <th style={{ width: "35%" }} className="small fw-semibold text-white">
                      File Name
                    </th>
                    <th
                      style={{ width: "15%" }}
                      className="text-center small fw-semibold text-white"
                    >
                      Type
                    </th>
                    <th
                      style={{ width: "15%" }}
                      className="text-center small fw-semibold text-white"
                    >
                      Created
                    </th>
                    <th
                      style={{ width: "15%" }}
                      className="text-center small fw-semibold text-white"
                    >
                      Size
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {currentBackups.map((backup, index) => {
                    const createdInfo = formatDateTime(backup.created_at);
                    const downloadKey = `download-${backup.name}`;
                    const deleteKey = `delete-${backup.name}`;
                    const isDownloading = actionProcessing === downloadKey;
                    const isDeleting = actionProcessing === deleteKey;

                    return (
                      <tr key={backup.name} className="align-middle">
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
                              onClick={() => onDownloadBackup(backup.name)}
                              disabled={isActionDisabled(downloadKey)}
                              title="Download Backup"
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
                              {isDownloading ? (
                                <span
                                  className="spinner-border spinner-border-sm"
                                  role="status"
                                ></span>
                              ) : (
                                <i className="fas fa-download" style={{ fontSize: "0.875rem" }}></i>
                              )}
                            </button>

                            <button
                              className="btn btn-danger btn-sm text-white"
                              onClick={() => onDeleteBackup(backup.name)}
                              disabled={isActionDisabled(deleteKey)}
                              title="Delete Backup"
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
                              {isDeleting ? (
                                <span
                                  className="spinner-border spinner-border-sm"
                                  role="status"
                                ></span>
                              ) : (
                                <i className="fas fa-trash" style={{ fontSize: "0.875rem" }}></i>
                              )}
                            </button>
                          </div>
                        </td>
                        <td style={{ maxWidth: "350px", overflow: "hidden" }}>
                          <div
                            className="d-flex align-items-center gap-3"
                            style={{ minWidth: 0 }}
                          >
                            <i className={`${getFileTypeIcon(backup.name)} fs-5`} />
                            <div className="flex-grow-1" style={{ minWidth: 0, overflow: "hidden" }}>
                              <div
                                className="fw-semibold"
                                style={{
                                  color: "var(--text-primary)",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                                title={backup.name}
                              >
                                {backup.name}
                              </div>
                              <div
                                className="small"
                                style={{
                                  color: "var(--text-muted)",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                                title={backup.status || "N/A"}
                              >
                                Status: {backup.status || "N/A"}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="text-center">
                          <span
                            className="badge"
                            style={{
                              backgroundColor: "rgba(14, 37, 75, 0.1)",
                              color: "var(--primary-color)",
                            }}
                          >
                            {backup.type?.toUpperCase()}
                          </span>
                        </td>
                        <td className="text-center">
                          <small style={{ color: "var(--text-muted)" }}>
                            {createdInfo}
                          </small>
                        </td>
                        <td
                          className="text-center fw-semibold"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {formatFileSize(backup.size)}
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
                        {startIndex + 1}-{Math.min(endIndex, backups.length)}
                      </span>{" "}
                      of{" "}
                      <span
                        className="fw-semibold"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {backups.length}
                      </span>{" "}
                      backups
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
                          e.target.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
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
                              if (!e.target.disabled && currentPage !== page) {
                                e.target.style.transform = "translateY(0)";
                                e.target.style.boxShadow = "none";
                                e.target.style.backgroundColor = "transparent";
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
                        setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                      }
                      disabled={currentPage === totalPages || isActionDisabled()}
                      style={{
                        transition: "all 0.2s ease-in-out",
                        border: "2px solid var(--primary-color)",
                        color: "var(--primary-color)",
                        backgroundColor: "transparent",
                      }}
                      onMouseEnter={(e) => {
                        if (!e.target.disabled) {
                          e.target.style.transform = "translateY(-1px)";
                          e.target.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
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
  );
};

export default Backups;
