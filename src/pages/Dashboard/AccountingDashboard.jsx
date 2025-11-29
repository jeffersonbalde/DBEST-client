import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaBoxOpen,
  FaBoxes,
  FaChartLine,
  FaClipboardList,
  FaExclamationTriangle,
  FaCheckCircle,
  FaHistory,
  FaBell,
  FaDollarSign,
  FaWarehouse,
  FaSyncAlt,
  FaSchool,
  FaTag,
} from "react-icons/fa";
import { useAuth } from "../../contexts/AuthContext";
import { showToast } from "../../services/notificationService";
import "./Dashboard.css";

const API_BASE = import.meta.env.VITE_LARAVEL_API;

const formatNumber = (value = 0) =>
  Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });

const formatCurrency = (value = 0) =>
  `₱${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

const formatRelativeTime = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60)
    return `${diffMinutes} min${diffMinutes === 1 ? "" : "s"} ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24)
    return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
};

const getStatusBadge = (status) => {
  const statusMap = {
    SERVICEABLE: "success",
    "Working": "success",
    available: "success",
    assigned: "warning",
    maintenance: "info",
    disposed: "danger",
    "For Repair": "warning",
    "For Disposal": "danger",
  };
  return statusMap[status] || "secondary";
};

const StatsCardSkeleton = () => (
  <div className="card stats-card h-100">
    <div className="card-body p-3">
      <div className="d-flex align-items-center">
        <div className="flex-grow-1">
          <div className="placeholder-wave mb-2">
            <span className="placeholder col-8" style={{ height: "14px" }} />
          </div>
          <div className="placeholder-wave">
            <span className="placeholder col-6" style={{ height: "28px" }} />
          </div>
        </div>
        <div className="col-auto">
          <div className="placeholder-wave">
            <span
              className="placeholder rounded-circle"
              style={{ width: "48px", height: "48px" }}
            />
          </div>
        </div>
      </div>
    </div>
  </div>
);

const ActivitySkeleton = () => (
  <div className="list-group-item d-flex align-items-center border-bottom py-3 px-3">
    <div className="me-3">
      <div
        className="placeholder rounded-circle"
        style={{ width: "40px", height: "40px" }}
      />
    </div>
    <div className="flex-grow-1">
      <div className="placeholder-wave mb-2">
        <span className="placeholder col-10" style={{ height: "14px" }} />
      </div>
      <div className="placeholder-wave">
        <span className="placeholder col-6" style={{ height: "12px" }} />
      </div>
    </div>
    <div className="text-end">
      <div className="placeholder-wave mb-2">
        <span className="placeholder col-6" style={{ height: "12px" }} />
      </div>
      <div
        className="placeholder rounded-pill"
        style={{ width: "60px", height: "20px" }}
      />
    </div>
  </div>
);

const QuickActionSkeleton = () => (
  <div className="placeholder-wave mb-2">
    <span
      className="placeholder col-12"
      style={{ height: "40px", borderRadius: "8px" }}
    />
  </div>
);

const buildDashboardData = ({ analytics, inventory, financial }) => {
  const analyticsData = analytics || {};
  const summary = analyticsData.summary || {};
  const inventoryArray = Array.isArray(inventory?.data) ? inventory.data : [];
  const financialData = financial || {};

  const totalItems = summary.total_items || 0;
  const totalQuantity = summary.total_quantity || 0;
  const totalValue = summary.total_value || 0;
  const totalAssigned = summary.total_assigned || 0;
  const totalUnassigned = summary.total_unassigned || 0;
  const totalSchoolInventory = summary.total_school_inventory || 0;
  const totalDcpInventory = summary.total_dcp_inventory || 0;

  const totalInventoryValue = financialData.total_inventory_value || 0;
  const availableInventoryValue =
    financialData.available_inventory_value || 0;
  const assignedInventoryValue = financialData.assigned_inventory_value || 0;

  const byCategory = analyticsData.by_category || [];
  const bySchool = analyticsData.by_school || [];
  const byStatus = analyticsData.by_status || [];

  const topCategories = byCategory
    .slice()
    .sort((a, b) => (b.value || 0) - (a.value || 0))
    .slice(0, 5);

  const topSchools = bySchool
    .slice()
    .sort((a, b) => (b.total_value || 0) - (a.total_value || 0))
    .slice(0, 5);

  const quickStats = [
    {
      label: "Total Inventory Value",
      value: formatCurrency(totalInventoryValue),
      trend: `${formatNumber(totalItems)} items`,
      positive: totalInventoryValue > 0,
    },
    {
      label: "Available Stock Value",
      value: formatCurrency(availableInventoryValue),
      trend: `${formatCurrency(totalInventoryValue - availableInventoryValue)} assigned`,
      positive: availableInventoryValue > 0,
    },
    {
      label: "Assigned Value",
      value: formatCurrency(assignedInventoryValue),
      trend: `${formatNumber(totalAssigned)} items`,
      positive: assignedInventoryValue > 0,
    },
    {
      label: "Total Items",
      value: formatNumber(totalItems),
      trend: `${formatNumber(totalQuantity)} total quantity`,
      positive: totalItems > 0,
    },
  ];

  const toActivity = ({ id, action, entity, date, type, value }) => ({
    id,
    action,
    entity,
    type,
    value,
    time: formatRelativeTime(date),
    timestamp: date ? new Date(date).getTime() : 0,
  });

  const recentInventory = inventoryArray
    .slice()
    .sort(
      (a, b) =>
        new Date(b.created_at || 0).getTime() -
        new Date(a.created_at || 0).getTime()
    )
    .slice(0, 6)
    .map((item) =>
      toActivity({
        id: item.id,
        action: "Inventory item",
        entity: item.name || item.item_code || "Unknown Item",
        date: item.created_at,
        type: item.type || "inventory",
        value: item.total_value || 0,
      })
    );

  const recentActivities = recentInventory
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 6)
    .map(({ timestamp, ...activity }) => activity);

  const priorityTasks = [];

  if (totalUnassigned > 0) {
    priorityTasks.push({
      task: "Review unassigned inventory",
      priority: totalUnassigned > 50 ? "high" : "medium",
      count: totalUnassigned,
    });
  }

  if (byCategory.length === 0) {
    priorityTasks.push({
      task: "Categorize inventory items",
      priority: "medium",
      count: totalItems,
    });
  }

  if (topSchools.length === 0) {
    priorityTasks.push({
      task: "Review school inventory distribution",
      priority: "low",
      count: 0,
    });
  }

  if (priorityTasks.length === 0) {
    priorityTasks.push({
      task: "All systems operational",
      priority: "low",
      count: 0,
    });
  }

  const systemMetrics = [
    {
      parameter: "Total Inventory Value",
      value: formatCurrency(totalInventoryValue),
      status: totalInventoryValue > 0 ? "optimal" : "warning",
    },
    {
      parameter: "Available Value",
      value: formatCurrency(availableInventoryValue),
      status: availableInventoryValue > 0 ? "good" : "warning",
    },
    {
      parameter: "Assigned Value",
      value: formatCurrency(assignedInventoryValue),
      status: assignedInventoryValue > 0 ? "good" : "monitor",
    },
    {
      parameter: "Total Items",
      value: formatNumber(totalItems),
      status: totalItems > 0 ? "good" : "warning",
    },
  ];

  const systemAlerts = [];

  if (totalItems === 0) {
    systemAlerts.push({
      type: "warning",
      title: "No inventory items",
      message: "No inventory items found in the system.",
    });
  }

  if (totalUnassigned > totalAssigned * 2 && totalAssigned > 0) {
    systemAlerts.push({
      type: "info",
      title: "High unassigned inventory",
      message: `${totalUnassigned} items are currently unassigned.`,
    });
  }

  if (!systemAlerts.length) {
    systemAlerts.push({
      type: "success",
      title: "Inventory Healthy",
      message: "No critical inventory alerts at this time.",
    });
  }

  let systemStatusTone = "success";
  let systemStatusMessage = "Inventory looks healthy.";

  if (systemAlerts.some((alert) => alert.type === "danger")) {
    systemStatusTone = "danger";
    systemStatusMessage = "Critical inventory issues detected.";
  } else if (systemAlerts.some((alert) => alert.type === "warning")) {
    systemStatusTone = "warning";
    systemStatusMessage = "Some inventory warnings need attention.";
  } else if (systemAlerts.some((alert) => alert.type === "info")) {
    systemStatusTone = "info";
    systemStatusMessage = "Monitoring informational updates.";
  }

  return {
    stats: {
      totalItems,
      totalQuantity,
      totalValue,
      totalAssigned,
      totalUnassigned,
      totalSchoolInventory,
      totalDcpInventory,
      totalInventoryValue,
      availableInventoryValue,
      assignedInventoryValue,
    },
    quickStats,
    recentActivities,
    priorityTasks,
    systemMetrics,
    systemAlerts,
    systemStatus: {
      tone: systemStatusTone,
      message: systemStatusMessage,
    },
    topCategories,
    topSchools,
    byCategory,
    byStatus,
  };
};

export default function AccountingDashboard() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const headers = useMemo(
    () => ({
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    }),
    [token]
  );

  const quickActions = useMemo(
    () => [
      {
        label: "Inventory Analytics",
        icon: FaChartLine,
        route: "/finance/analytics",
        variant: "primary",
        color: "#ffffff",
        background: "linear-gradient(135deg, #0E254B 0%, #1B5F9D 100%)",
      },
      {
        label: "Inventory List",
        icon: FaClipboardList,
        route: "/finance/inventory",
        variant: "outline",
        color: "var(--primary-color)",
      },
    ],
    []
  );

  const handleQuickActionNavigate = (route) => {
    if (!route) return;
    navigate(route);
  };

  const getQuickActionStyle = (action) => ({
    borderRadius: "8px",
    border:
      action.variant === "primary"
        ? "none"
        : `2px solid ${action.color || "var(--primary-color)"}`,
    background:
      action.variant === "primary"
        ? action.background || action.color || "var(--primary-color)"
        : "transparent",
    color:
      action.variant === "primary"
        ? "#fff"
        : action.color || "var(--primary-color)",
    transition: "all 0.2s ease-in-out",
  });

  const handleQuickActionHover = (event, action, entering) => {
    const element = event.currentTarget;
    if (entering) {
      element.style.transform = "translateY(-1px)";
      element.style.boxShadow = "0 4px 8px rgba(0,0,0,0.1)";
      element.style.background =
        action.background || action.color || "var(--primary-color)";
      element.style.color = "#fff";
    } else {
      element.style.transform = "translateY(0)";
      element.style.boxShadow = "none";
      element.style.background =
        action.variant === "primary"
          ? action.background || action.color || "var(--primary-color)"
          : "transparent";
      element.style.color =
        action.variant === "primary"
          ? "#fff"
          : action.color || "var(--primary-color)";
    }
  };

  const fetchResource = async (endpoint, label) => {
    const response = await fetch(`${API_BASE}${endpoint}`, { headers });
    if (!response.ok) {
      let message = `Failed to fetch ${label}`;
      try {
        const errorBody = await response.json();
        message = errorBody.message || message;
      } catch (_) {
        message = `${message} (${response.status})`;
      }
      throw new Error(message);
    }
    return response.json();
  };

  const fetchDashboardData = async ({ silent = false } = {}) => {
    if (!token) return;
    try {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const [analyticsRes, inventoryRes, financialRes] = await Promise.all([
        fetchResource("/accounting/analytics", "analytics"),
        fetchResource("/accounting/inventory?per_page=100", "inventory"),
        fetchResource("/accounting/analytics/financial", "financial"),
      ]);

      const analytics = analyticsRes || {};
      const inventory = inventoryRes || {};
      const financial = financialRes || {};

      const dashboardPayload = buildDashboardData({
        analytics,
        inventory,
        financial,
      });

      setDashboardData(dashboardPayload);
    } catch (err) {
      console.error("Failed to load Accounting dashboard:", err);
      setError(err.message || "Failed to load dashboard data.");
      if (!dashboardData) {
        setDashboardData(null);
      }
      showToast.error(err.message || "Failed to load dashboard data.");
    } finally {
      if (silent) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setDashboardData(null);
      setError("You must be authenticated to view this dashboard.");
      return;
    }
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (loading) {
    return (
      <div className="container-fluid px-3 py-2 ict-dashboard-container fadeIn">
        <div className="d-flex flex-column flex-lg-row justify-content-between align-items-start align-items-lg-center mb-4 gap-3">
          <div className="text-start w-100">
            <h1
              className="h4 mb-1 fw-bold"
              style={{ color: "var(--text-primary)" }}
            >
              Accounting Dashboard
            </h1>
            <p className="mb-0 small" style={{ color: "var(--text-muted)" }}>
              Loading the latest inventory data, please wait...
            </p>
          </div>
          <div className="d-flex gap-2 w-100 w-lg-auto justify-content-start justify-content-lg-end flex-wrap">
            <button className="btn btn-sm" disabled>
              <span className="spinner-border spinner-border-sm me-2" />
              Refreshing
            </button>
          </div>
        </div>

        <div className="row g-3 mb-4">
          {[...Array(4)].map((_, idx) => (
            <div key={idx} className="col-xl-3 col-md-6">
              <StatsCardSkeleton />
            </div>
          ))}
        </div>

        <div className="row g-3 mb-4">
          <div className="col-xl-8">
            <div className="row g-3">
              {[...Array(4)].map((_, idx) => (
                <div key={idx} className="col-md-3 col-6">
                  <StatsCardSkeleton />
                </div>
              ))}
            </div>
          </div>
          <div className="col-xl-4">
            <div className="card h-100" style={{ borderRadius: "10px" }}>
              <div className="card-body d-flex justify-content-between align-items-center p-3">
                <div>
                  <div className="small text-muted text-uppercase">
                    Inventory Status
                  </div>
                  <div className="text-muted">Fetching metrics...</div>
                </div>
                <div
                  className="placeholder rounded-circle"
                  style={{ width: "32px", height: "32px" }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="row g-4">
          <div className="col-xl-8">
            <div className="card mb-4" style={{ borderRadius: "10px" }}>
              <div className="card-header bg-white border-bottom-0 py-3">
                <h5 className="card-title mb-0 text-dark d-flex align-items-center">
                  <FaHistory className="me-2 text-primary" />
                  Recent Activities
                </h5>
              </div>
              <div className="card-body p-0">
                <div className="list-group list-group-flush">
                  {[...Array(4)].map((_, idx) => (
                    <ActivitySkeleton key={idx} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="col-xl-4">
            <div className="card mb-4" style={{ borderRadius: "10px" }}>
              <div className="card-header bg-white border-bottom-0 py-3">
                <h5 className="card-title mb-0 text-dark d-flex align-items-center">
                  <FaBell className="me-2 text-warning" />
                  Priority Tasks
                </h5>
              </div>
              <div className="card-body">
                {[...Array(4)].map((_, idx) => (
                  <div key={idx} className="list-group-item px-0 border-0 py-2">
                    <ActivitySkeleton />
                  </div>
                ))}
              </div>
            </div>

            <div className="card" style={{ borderRadius: "10px" }}>
              <div className="card-header bg-white border-bottom-0 py-3">
                <h5 className="card-title mb-0 text-dark">Quick Actions</h5>
              </div>
              <div className="card-body">
                {[...Array(2)].map((_, idx) => (
                  <QuickActionSkeleton key={idx} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if ((!dashboardData || !token) && error) {
    return (
      <div className="container-fluid px-3 py-2 ict-dashboard-container fadeIn">
        <div className="alert alert-danger">
          <h5 className="mb-2">Unable to load dashboard data</h5>
          <p className="mb-3">{error}</p>
          <button
            className="btn btn-primary"
            onClick={() => fetchDashboardData()}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return null;
  }

  const {
    stats,
    quickStats,
    recentActivities,
    priorityTasks,
    systemMetrics,
    systemAlerts,
    systemStatus,
    topCategories,
    topSchools,
  } = dashboardData;

  const systemStatusClass =
    systemStatus.tone === "danger"
      ? "bg-danger text-white"
      : systemStatus.tone === "warning"
      ? "bg-warning text-dark"
      : systemStatus.tone === "info"
      ? "bg-info text-dark"
      : "bg-primary text-white";

  const SystemStatusIcon =
    systemStatus.tone === "danger" || systemStatus.tone === "warning"
      ? FaExclamationTriangle
      : FaCheckCircle;

  return (
    <div className="container-fluid px-3 py-2 ict-dashboard-container fadeIn">
      {error && (
        <div className="alert alert-warning d-flex align-items-center gap-2">
          <FaExclamationTriangle />
          <span>{error}</span>
          <button
            className="btn btn-sm btn-outline-secondary ms-auto"
            onClick={() => fetchDashboardData({ silent: true })}
            disabled={refreshing}
          >
            Retry now
          </button>
        </div>
      )}

      <div className="d-flex flex-column flex-lg-row justify-content-between align-items-start align-items-lg-center mb-4 gap-3">
        <div className="text-start w-100">
          <h1
            className="h4 mb-1 fw-bold"
            style={{ color: "var(--text-primary)" }}
          >
            Accounting Dashboard
          </h1>
          <p className="mb-0 small" style={{ color: "var(--text-muted)" }}>
            {user?.name
              ? `Welcome back, ${user.name.split(" ")[0]}! `
              : "Welcome back! "}
            Here's your live inventory financial overview.
          </p>
        </div>
        <div className="d-flex gap-2 w-100 w-lg-auto justify-content-start justify-content-lg-end flex-wrap">
          <button
            className="btn btn-sm d-flex align-items-center"
            onClick={() => fetchDashboardData({ silent: true })}
            disabled={refreshing}
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
            {refreshing ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" />
                Refreshing
              </>
            ) : (
              <>
                <FaSyncAlt className="me-2" />
                Refresh Data
              </>
            )}
          </button>
        </div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-xl-3 col-md-6">
          <div
            className="card bg-primary text-white mb-3"
            style={{ borderRadius: "10px" }}
          >
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="text-white-50 small">Total Inventory Value</div>
                  <div className="h4 fw-bold my-1">
                    {formatCurrency(stats.totalInventoryValue)}
                  </div>
                  <div className="small d-flex align-items-center">
                    <FaBoxes className="me-1" />
                    {formatNumber(stats.totalItems)} items
                  </div>
                </div>
                <div
                  className="bg-white rounded-circle d-flex align-items-center justify-content-center"
                  style={{ width: "50px", height: "50px" }}
                >
                  <FaDollarSign size={20} className="text-primary" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6">
          <div
            className="card bg-success text-white mb-3"
            style={{ borderRadius: "10px" }}
          >
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="text-white-50 small">Available Value</div>
                  <div className="h4 fw-bold my-1">
                    {formatCurrency(stats.availableInventoryValue)}
                  </div>
                  <div className="small">
                    {formatCurrency(
                      stats.totalInventoryValue - stats.availableInventoryValue
                    )}{" "}
                    assigned
                  </div>
                </div>
                <div
                  className="bg-white rounded-circle d-flex align-items-center justify-content-center"
                  style={{ width: "50px", height: "50px" }}
                >
                  <FaCheckCircle size={20} className="text-success" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6">
          <div
            className="card bg-info text-white mb-3"
            style={{ borderRadius: "10px" }}
          >
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="text-white-50 small">Assigned Value</div>
                  <div className="h4 fw-bold my-1">
                    {formatCurrency(stats.assignedInventoryValue)}
                  </div>
                  <div className="small">
                    {formatNumber(stats.totalAssigned)} items
                  </div>
                </div>
                <div
                  className="bg-white rounded-circle d-flex align-items-center justify-content-center"
                  style={{ width: "50px", height: "50px" }}
                >
                  <FaClipboardList size={20} className="text-info" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6">
          <div
            className="card bg-warning text-white mb-3"
            style={{ borderRadius: "10px" }}
          >
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="text-white-50 small">Total Items</div>
                  <div className="h4 fw-bold my-1">
                    {formatNumber(stats.totalItems)}
                  </div>
                  <div className="small">
                    {formatNumber(stats.totalQuantity)} total qty
                  </div>
                </div>
                <div
                  className="bg-white rounded-circle d-flex align-items-center justify-content-center"
                  style={{ width: "50px", height: "50px" }}
                >
                  <FaBoxOpen size={20} className="text-warning" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-xl-8">
          <div className="row g-3">
            <div className="col-md-3 col-6">
              <div
                className="card border-0 bg-light h-100"
                style={{ borderRadius: "10px" }}
              >
                <div className="card-body text-center p-3">
                  <FaSchool className="text-primary mb-2" size={24} />
                  <div className="fw-bold text-dark h5">
                    {formatNumber(stats.totalSchoolInventory)}
                  </div>
                  <div className="text-muted small">School Inventory</div>
                </div>
              </div>
            </div>
            <div className="col-md-3 col-6">
              <div
                className="card border-0 bg-light h-100"
                style={{ borderRadius: "10px" }}
              >
                <div className="card-body text-center p-3">
                  <FaWarehouse className="text-primary mb-2" size={24} />
                  <div className="fw-bold text-dark h5">
                    {formatNumber(stats.totalDcpInventory)}
                  </div>
                  <div className="text-muted small">DCP Inventory</div>
                </div>
              </div>
            </div>
            <div className="col-md-3 col-6">
              <div
                className="card border-0 bg-light h-100"
                style={{ borderRadius: "10px" }}
              >
                <div className="card-body text-center p-3">
                  <FaClipboardList className="text-primary mb-2" size={24} />
                  <div className="fw-bold text-dark h5">
                    {formatNumber(stats.totalAssigned)}
                  </div>
                  <div className="text-muted small">Assigned Items</div>
                </div>
              </div>
            </div>
            <div className="col-md-3 col-6">
              <div
                className="card border-0 bg-light h-100"
                style={{ borderRadius: "10px" }}
              >
                <div className="card-body text-center p-3">
                  <FaBoxOpen className="text-primary mb-2" size={24} />
                  <div className="fw-bold text-dark h5">
                    {formatNumber(stats.totalUnassigned)}
                  </div>
                  <div className="text-muted small">Unassigned Items</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-4">
          <div
            className={`card ${systemStatusClass} h-100`}
            style={{ borderRadius: "10px" }}
          >
            <div className="card-body d-flex justify-content-between align-items-center p-3">
              <div>
                <div className="small opacity-85 text-uppercase">
                  Inventory Status
                </div>
                <div className="h5 mb-0">{systemStatus.message}</div>
              </div>
              <SystemStatusIcon size={24} />
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-xl-8">
          <div className="card mb-4" style={{ borderRadius: "10px" }}>
            <div className="card-header bg-white border-bottom-0 py-3">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="card-title mb-0 text-dark d-flex align-items-center">
                  <FaHistory className="me-2 text-primary" />
                  Recent Inventory Items
                </h5>
                <span className="badge bg-primary">
                  {recentActivities.length}
                </span>
              </div>
            </div>
            <div className="card-body p-0">
              {recentActivities.length === 0 ? (
                <div className="text-center py-4 text-muted">
                  No recent inventory items recorded yet.
                </div>
              ) : (
                <div className="list-group list-group-flush">
                  {recentActivities.map((activity) => (
                    <div
                      key={activity.id}
                      className="list-group-item d-flex align-items-center border-bottom py-3 px-3"
                    >
                      <div className="me-3">
                        <div
                          className="rounded-circle d-flex align-items-center justify-content-center bg-primary"
                          style={{ width: "40px", height: "40px" }}
                        >
                          <FaBoxOpen size={16} className="text-white" />
                        </div>
                      </div>
                      <div className="flex-grow-1">
                        <div className="fw-bold text-dark small">
                          {activity.action}
                        </div>
                        <div className="text-muted small">
                          {activity.entity}
                        </div>
                      </div>
                      <div className="text-end">
                        <div className="text-muted small">{activity.time}</div>
                        <div className="text-primary small fw-bold">
                          {formatCurrency(activity.value)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="card-footer bg-light border-0 py-3">
              <button
                className="btn btn-outline-primary btn-sm"
                onClick={() => navigate("/finance/inventory")}
              >
                Go to Inventory List
              </button>
            </div>
          </div>

          <div className="card mb-4" style={{ borderRadius: "10px" }}>
            <div className="card-header bg-white border-bottom-0 py-3">
              <h5 className="card-title mb-0 text-dark d-flex align-items-center">
                <FaChartLine className="me-2 text-primary" />
                Financial Metrics
              </h5>
            </div>
            <div className="card-body">
              <div className="row g-3">
                {quickStats.map((stat, index) => (
                  <div key={index} className="col-md-3 col-6">
                    <div
                      className="text-center p-3 border rounded"
                      style={{ borderRadius: "8px" }}
                    >
                      <div className="h4 fw-bold text-dark mb-1">
                        {stat.value}
                      </div>
                      <div className="text-muted small mb-2">{stat.label}</div>
                      <span
                        className={`badge bg-${
                          stat.positive ? "success" : "danger"
                        } small`}
                      >
                        {stat.trend}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {topCategories.length > 0 && (
            <div className="card mb-4" style={{ borderRadius: "10px" }}>
              <div className="card-header bg-white border-bottom-0 py-3">
                <h5 className="card-title mb-0 text-dark d-flex align-items-center">
                  <FaTag className="me-2 text-primary" />
                  Top Categories by Value
                </h5>
              </div>
              <div className="card-body">
                <div className="table-responsive">
                  <table className="table table-sm table-borderless mb-0">
                    <thead>
                      <tr>
                        <th className="text-dark small">Category</th>
                        <th className="text-dark small">Items</th>
                        <th className="text-dark small">Quantity</th>
                        <th className="text-dark small">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topCategories.map((cat, index) => (
                        <tr key={index}>
                          <td className="fw-bold text-dark">
                            {cat.category || "Uncategorized"}
                          </td>
                          <td className="text-muted">{cat.count || 0}</td>
                          <td className="text-muted">{cat.quantity || 0}</td>
                          <td className="fw-bold text-primary">
                            {formatCurrency(cat.value || 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="col-xl-4">
          <div className="card mb-4" style={{ borderRadius: "10px" }}>
            <div className="card-header bg-white border-bottom-0 py-3">
              <h5 className="card-title mb-0 text-dark d-flex align-items-center">
                <FaBell className="me-2 text-warning" />
                Priority Tasks
              </h5>
            </div>
            <div className="card-body">
              {priorityTasks.length === 0 ? (
                <div className="text-muted small">No outstanding tasks.</div>
              ) : (
                <div className="list-group list-group-flush">
                  {priorityTasks.map((task, index) => (
                    <div
                      key={index}
                      className="list-group-item px-0 border-0 py-2"
                    >
                      <div className="d-flex justify-content-between align-items-start">
                        <div className="flex-grow-1">
                          <div className="fw-bold text-dark small">
                            {task.task}
                          </div>
                          <div className="text-muted small">
                            {task.count} items
                          </div>
                        </div>
                        <span
                          className={`badge bg-${
                            task.priority === "high"
                              ? "danger"
                              : task.priority === "medium"
                              ? "warning"
                              : "secondary"
                          } small`}
                        >
                          {task.priority}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="card mb-4" style={{ borderRadius: "10px" }}>
            <div className="card-header bg-white border-bottom-0 py-3">
              <h5 className="card-title mb-0 text-dark d-flex align-items-center">
                <FaClipboardList className="me-2 text-info" />
                Financial Metrics
              </h5>
            </div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-sm table-borderless mb-0">
                  <thead>
                    <tr>
                      <th className="text-dark small">Parameter</th>
                      <th className="text-dark small">Value</th>
                      <th className="text-dark small">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {systemMetrics.map((metric, index) => (
                      <tr key={index}>
                        <td className="text-muted small">{metric.parameter}</td>
                        <td className="fw-bold text-dark">{metric.value}</td>
                        <td>
                          <span
                            className={`badge bg-${
                              metric.status === "optimal"
                                ? "success"
                                : metric.status === "good"
                                ? "info"
                                : "warning"
                            } small`}
                          >
                            {metric.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="card" style={{ borderRadius: "10px" }}>
            <div className="card-header bg-white border-bottom-0 py-3">
              <h5 className="card-title mb-0 text-dark">Quick Actions</h5>
            </div>
            <div className="card-body">
              <div className="d-grid gap-2">
                {quickActions.map((action) => (
                  <button
                    key={action.label}
                    className="btn btn-sm text-start py-2 d-flex align-items-center"
                    style={getQuickActionStyle(action)}
                    onMouseEnter={(e) =>
                      handleQuickActionHover(e, action, true)
                    }
                    onMouseLeave={(e) =>
                      handleQuickActionHover(e, action, false)
                    }
                    onClick={() => handleQuickActionNavigate(action.route)}
                  >
                    <action.icon className="me-2" />
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row mt-4">
        <div className="col-12">
          <div className="card border-warning" style={{ borderRadius: "10px" }}>
            <div className="card-header bg-warning text-dark py-3 d-flex align-items-center">
              <FaExclamationTriangle className="me-2" />
              <h5 className="card-title mb-0">Inventory Alerts</h5>
            </div>
            <div className="card-body py-3">
              <div className="row g-3">
                {systemAlerts.map((alert, index) => (
                  <div key={index} className="col-md-4">
                    <div className={`alert alert-${alert.type} mb-0 py-2`}>
                      <strong>{alert.title}</strong>
                      <div className="small">{alert.message}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
