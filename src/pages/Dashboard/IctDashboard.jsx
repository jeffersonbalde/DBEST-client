import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaSchool,
  FaUsers,
  FaUserTie,
  FaDatabase,
  FaExclamationTriangle,
  FaCheckCircle,
  FaClock,
  FaCog,
  FaSyncAlt,
  FaChartLine,
  FaHistory,
  FaBell,
  FaServer,
  FaShieldAlt,
} from "react-icons/fa";
import { useAuth } from "../../contexts/AuthContext";
import { showAlert, showToast } from "../../services/notificationService";

const API_BASE = import.meta.env.VITE_LARAVEL_API;

const safeNumber = (value) => {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatNumber = (value = 0) =>
  Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });

const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

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

const getActivityBadge = (type, status) => {
  if (type === "school") return "primary";
  if (type === "custodian") return status === "active" ? "success" : "secondary";
  if (type === "accounting") return status === "active" ? "info" : "secondary";
  if (type === "backup") return status === "completed" ? "success" : "warning";
  return "secondary";
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

const buildDashboardData = ({
  schools,
  custodians,
  accountings,
  backups,
  settings,
  backupInfo,
}) => {
  const now = new Date();

  const parseDate = (value) => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  // Ensure all inputs are arrays
  const schoolsArray = Array.isArray(schools) ? schools : [];
  const custodiansArray = Array.isArray(custodians) ? custodians : [];
  const accountingsArray = Array.isArray(accountings) ? accountings : [];
  const backupsArray = Array.isArray(backups) ? backups : [];
  const settingsArray = Array.isArray(settings) ? settings : [];

  // Schools Statistics
  const totalSchools = schoolsArray.length;
  const activeSchools = schoolsArray.filter((school) => school.is_active).length;
  const inactiveSchools = totalSchools - activeSchools;

  // Property Custodians Statistics
  const totalCustodians = custodiansArray.length;
  const activeCustodians = custodiansArray.filter(
    (custodian) => custodian.is_active
  ).length;
  const inactiveCustodians = totalCustodians - activeCustodians;
  const custodiansWithSchools = custodiansArray.filter(
    (custodian) => custodian.school_id
  ).length;

  // Accounting Statistics
  const totalAccountings = accountingsArray.length;
  const activeAccountings = accountingsArray.filter(
    (accounting) => accounting.is_active
  ).length;
  const inactiveAccountings = totalAccountings - activeAccountings;

  // Backups Statistics
  const totalBackups = backupsArray.length;
  const completedBackups = backupsArray.filter(
    (backup) => backup.status === "completed"
  ).length;
  const recentBackups = backupsArray
    .filter((backup) => backup.status === "completed")
    .slice(0, 5);

  // System Settings
  const totalSettings = settingsArray.length;

  // Backup Info
  const databaseSize = backupInfo?.database_size || 0;
  const lastBackupDate = backupInfo?.last_backup || null;

  // Calculate trends (comparing with previous period would require historical data)
  // For now, we'll use current data as baseline

  const systemUptime = totalBackups > 0 ? (completedBackups / totalBackups) * 100 : 100;

  const quickStats = [
    {
      label: "System Coverage",
      value: `${totalSchools}`,
      trend: `${activeSchools} active schools`,
      positive: true,
    },
    {
      label: "User Accounts",
      value: `${totalCustodians + totalAccountings}`,
      trend: `${activeCustodians + activeAccountings} active`,
      positive: activeCustodians + activeAccountings > 0,
    },
    {
      label: "Database Size",
      value: formatFileSize(databaseSize),
      trend: `${totalBackups} backups available`,
      positive: true,
    },
    {
      label: "System Health",
      value: `${systemUptime.toFixed(1)}%`,
      trend: `${completedBackups} successful backups`,
      positive: systemUptime >= 90,
    },
  ];

  const toActivity = ({ id, action, entity, date, status, type }) => {
    const timestamp = parseDate(date)?.getTime() ?? 0;
    return {
      id,
      action,
      entity,
      status,
      type,
      time: formatRelativeTime(date),
      badgeVariant: getActivityBadge(type, status),
      timestamp,
    };
  };

  // School Activities
  const schoolActivities = schoolsArray
    .sort(
      (a, b) =>
        (parseDate(b.created_at)?.getTime() || 0) -
        (parseDate(a.created_at)?.getTime() || 0)
    )
    .slice(0, 3)
    .map((school) =>
      toActivity({
        id: `school-${school.id}`,
        action: "School registered",
        entity: school.name,
        date: school.created_at,
        status: school.is_active ? "active" : "inactive",
        type: "school",
      })
    );

  // Custodian Activities
  const custodianActivities = custodiansArray
    .sort(
      (a, b) =>
        (parseDate(b.created_at)?.getTime() || 0) -
        (parseDate(a.created_at)?.getTime() || 0)
    )
    .slice(0, 3)
    .map((custodian) =>
      toActivity({
        id: `custodian-${custodian.id}`,
        action: "Property custodian account created",
        entity: `${custodian.first_name} ${custodian.last_name}`,
        date: custodian.created_at,
        status: custodian.is_active ? "active" : "inactive",
        type: "custodian",
      })
    );

  // Accounting Activities
  const accountingActivities = accountingsArray
    .sort(
      (a, b) =>
        (parseDate(b.created_at)?.getTime() || 0) -
        (parseDate(a.created_at)?.getTime() || 0)
    )
    .slice(0, 2)
    .map((accounting) =>
      toActivity({
        id: `accounting-${accounting.id}`,
        action: "Accounting account created",
        entity: `${accounting.first_name} ${accounting.last_name}`,
        date: accounting.created_at,
        status: accounting.is_active ? "active" : "inactive",
        type: "accounting",
      })
    );

  // Backup Activities
  const backupActivities = backupsArray
    .filter((backup) => backup.status === "completed")
    .sort(
      (a, b) =>
        (parseDate(b.created_at)?.getTime() || 0) -
        (parseDate(a.created_at)?.getTime() || 0)
    )
    .slice(0, 2)
    .map((backup) =>
      toActivity({
        id: `backup-${backup.id}`,
        action: "System backup completed",
        entity: backup.filename || backup.name || "Backup",
        date: backup.created_at,
        status: backup.status,
        type: "backup",
      })
    );

  const recentActivities = [
    ...schoolActivities,
    ...custodianActivities,
    ...accountingActivities,
    ...backupActivities,
  ]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 6)
    .map(({ timestamp, ...activity }) => activity);

  const priorityTasks = [
    {
      task: "Review inactive schools",
      priority: inactiveSchools > 0 ? "medium" : "low",
      count: inactiveSchools,
    },
    {
      task: "Activate property custodians",
      priority: inactiveCustodians > 0 ? "medium" : "low",
      count: inactiveCustodians,
    },
    {
      task: "Activate accounting accounts",
      priority: inactiveAccountings > 0 ? "low" : "low",
      count: inactiveAccountings,
    },
    {
      task: "Create system backup",
      priority: !lastBackupDate || (now - parseDate(lastBackupDate)?.getTime() > 7 * 24 * 60 * 60 * 1000) ? "high" : "low",
      count: lastBackupDate ? 0 : 1,
    },
    {
      task: "Review system settings",
      priority: totalSettings === 0 ? "medium" : "low",
      count: totalSettings === 0 ? 1 : 0,
    },
  ];

  const systemMetrics = [
    {
      parameter: "Total Schools",
      value: `${totalSchools}`,
      status: totalSchools > 0 ? "optimal" : "monitor",
      range: `${activeSchools} active`,
    },
    {
      parameter: "Property Custodians",
      value: `${totalCustodians}`,
      status: totalCustodians > 0 ? "good" : "warning",
      range: `${activeCustodians} active`,
    },
    {
      parameter: "Accounting Accounts",
      value: `${totalAccountings}`,
      status: totalAccountings > 0 ? "good" : "warning",
      range: `${activeAccountings} active`,
    },
    {
      parameter: "System Backups",
      value: `${totalBackups}`,
      status: totalBackups > 0 ? "optimal" : "warning",
      range: `${completedBackups} completed`,
    },
  ];

  const systemAlerts = [];

  if (inactiveSchools > 0) {
    systemAlerts.push({
      type: "warning",
      title: "Inactive Schools",
      message: `${inactiveSchools} school(s) are currently inactive.`,
    });
  }

  if (inactiveCustodians > 0) {
    systemAlerts.push({
      type: "info",
      title: "Inactive Custodians",
      message: `${inactiveCustodians} property custodian(s) are inactive.`,
    });
  }

  if (!lastBackupDate || (now - parseDate(lastBackupDate)?.getTime() > 7 * 24 * 60 * 60 * 1000)) {
    systemAlerts.push({
      type: "warning",
      title: "Backup Required",
      message: lastBackupDate
        ? "Last backup was more than 7 days ago."
        : "No backups have been created yet.",
    });
  }

  if (totalSettings === 0) {
    systemAlerts.push({
      type: "info",
      title: "System Settings",
      message: "No system settings configured yet.",
    });
  }

  if (!systemAlerts.length) {
    systemAlerts.push({
      type: "success",
      title: "All Systems Operational",
      message: "No outstanding alerts at this time.",
    });
  }

  let systemStatusTone = "success";
  let systemStatusMessage = "All systems are running normally.";

  if (systemAlerts.some((alert) => alert.type === "danger")) {
    systemStatusTone = "danger";
    systemStatusMessage = "Critical alerts detected. Immediate action required.";
  } else if (systemAlerts.some((alert) => alert.type === "warning")) {
    systemStatusTone = "warning";
    systemStatusMessage = "Active warnings require attention.";
  } else if (systemAlerts.some((alert) => alert.type === "info")) {
    systemStatusTone = "info";
    systemStatusMessage = "Monitoring informational alerts.";
  }

  return {
    stats: {
      totalSchools,
      activeSchools,
      inactiveSchools,
      totalCustodians,
      activeCustodians,
      inactiveCustodians,
      custodiansWithSchools,
      totalAccountings,
      activeAccountings,
      inactiveAccountings,
      totalBackups,
      completedBackups,
      totalSettings,
      databaseSize,
      systemUptime: Number(systemUptime.toFixed(1)),
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
    recentBackups,
  };
};

export default function IctDashboard() {
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
        label: "DepEd Schools",
        icon: FaSchool,
        route: "/dashboard/ict/schools",
        variant: "primary",
        color: "#ffffff",
        background: "linear-gradient(135deg, #0E254B 0%, #1a3a5c 100%)",
      },
      {
        label: "Property Custodians",
        icon: FaUsers,
        route: "/dashboard/ict/custodians",
        variant: "outline",
        color: "var(--primary-color)",
      },
      {
        label: "Accounting Accounts",
        icon: FaUserTie,
        route: "/dashboard/ict/accounting",
        variant: "outline",
        color: "var(--primary-color)",
      },
      {
        label: "System Backups",
        icon: FaDatabase,
        route: "/backups",
        variant: "accent",
        color: "#0dcaf0",
      },
      {
        label: "System Settings",
        icon: FaCog,
        route: "/dashboard?tab=settings",
        variant: "accent",
        color: "#f0ad4e",
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

      // Fetch all resources in parallel
      const [schoolsRes, custodiansRes, accountingsRes, backupsRes, settingsRes, backupInfoRes] = await Promise.all([
        fetchResource("/ict/schools", "schools"),
        fetchResource("/ict/property-custodians?per_page=1000", "property custodians"),
        fetchResource("/ict/accountings", "accounting accounts"),
        fetchResource("/ict/backups?per_page=100", "backups"),
        fetchResource("/ict/settings", "system settings"),
        fetchResource("/backup/info", "backup info").catch(() => ({ data: {} })),
      ]);

      // Extract data from responses - handle different response structures
      const schools = Array.isArray(schoolsRes?.schools) 
        ? schoolsRes.schools 
        : (Array.isArray(schoolsRes) ? schoolsRes : []);
      
      const custodians = Array.isArray(custodiansRes?.data) 
        ? custodiansRes.data 
        : (Array.isArray(custodiansRes) ? custodiansRes : []);
      
      // AccountingController returns { accountings: [...] }
      const accountings = Array.isArray(accountingsRes?.accountings) 
        ? accountingsRes.accountings 
        : (Array.isArray(accountingsRes?.data) 
          ? accountingsRes.data 
          : (Array.isArray(accountingsRes) ? accountingsRes : []));
      
      const backups = Array.isArray(backupsRes?.data) 
        ? backupsRes.data 
        : (Array.isArray(backupsRes) ? backupsRes : []);
      
      const settings = Array.isArray(settingsRes) 
        ? settingsRes 
        : (Array.isArray(settingsRes?.data) ? settingsRes.data : []);
      
      const backupInfo = backupInfoRes?.data || backupInfoRes || {};

      const dashboardPayload = buildDashboardData({
        schools,
        custodians,
        accountings,
        backups,
        settings,
        backupInfo,
      });

      setDashboardData(dashboardPayload);
    } catch (err) {
      console.error("Failed to load ICT dashboard:", err);
      setError(err.message || "Failed to load dashboard data.");
      if (!dashboardData) {
        setDashboardData(null);
      }
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
      setError("You must be authenticated to view the ICT dashboard.");
      return;
    }
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (loading) {
    return (
      <div className="container-fluid px-3 py-2 ict-dashboard-container fadeIn">
        {/* Page Header persists */}
        <div className="d-flex flex-column flex-lg-row justify-content-between align-items-start align-items-lg-center mb-4 gap-3">
          <div className="text-start w-100">
            <h1
              className="h4 mb-1 fw-bold"
              style={{ color: "var(--text-primary)" }}
            >
              ICT System Administration
            </h1>
            <p className="mb-0 small" style={{ color: "var(--text-muted)" }}>
              Loading the latest data, please wait...
            </p>
          </div>
          <div className="d-flex gap-2 w-100 w-lg-auto justify-content-start justify-content-lg-end flex-wrap">
            <button className="btn btn-sm" disabled>
              <span className="spinner-border spinner-border-sm me-2" />
              Refreshing
            </button>
          </div>
        </div>

        {/* Skeleton cards */}
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
                    System Status
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
                {[...Array(5)].map((_, idx) => (
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
  } = dashboardData;

  const systemStatusClass =
    systemStatus.tone === "danger"
      ? "bg-danger text-white"
      : systemStatus.tone === "warning"
      ? "bg-warning text-dark"
      : systemStatus.tone === "info"
      ? "bg-info text-dark"
      : "bg-primary text-white";

  const systemStatusIcon =
    systemStatus.tone === "danger" || systemStatus.tone === "warning"
      ? FaExclamationTriangle
      : FaCheckCircle;

  return (
    <div className="container-fluid px-3 py-2 ict-dashboard-container fadeIn">
      {/* Optional inline error message if data is stale but we have content */}
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

      {/* Page Header - Fully Responsive */}
      <div className="d-flex flex-column flex-lg-row justify-content-between align-items-start align-items-lg-center mb-4 gap-3">
        <div className="text-start w-100">
          <h1
            className="h4 mb-1 fw-bold"
            style={{ color: "var(--text-primary)" }}
          >
            ICT System Administration
          </h1>
          <p className="mb-0 small" style={{ color: "var(--text-muted)" }}>
            {user?.name
              ? `Welcome back, ${user.name.split(" ")[0]}! `
              : "Welcome back! "}
            Here's your live system overview.
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

      {/* Main Stats Overview */}
      <div className="row g-3 mb-4">
        <div className="col-xl-3 col-md-6">
          <div
            className="card bg-primary text-white mb-3"
            style={{ borderRadius: "10px" }}
          >
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="text-white-50 small">Total Schools</div>
                  <div className="h4 fw-bold my-1">
                    {formatNumber(stats.totalSchools)}
                  </div>
                  <div className="small d-flex align-items-center">
                    <FaChartLine className="me-1" />
                    {stats.activeSchools} active
                  </div>
                </div>
                <div
                  className="bg-white rounded-circle d-flex align-items-center justify-content-center"
                  style={{ width: "50px", height: "50px" }}
                >
                  <FaSchool size={20} className="text-primary" />
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
                  <div className="text-white-50 small">Property Custodians</div>
                  <div className="h4 fw-bold my-1">
                    {formatNumber(stats.totalCustodians)}
                  </div>
                  <div className="small">
                    {stats.activeCustodians} active accounts
                  </div>
                </div>
                <div
                  className="bg-white rounded-circle d-flex align-items-center justify-content-center"
                  style={{ width: "50px", height: "50px" }}
                >
                  <FaUsers size={20} className="text-success" />
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
                  <div className="text-white-50 small">Accounting Accounts</div>
                  <div className="h4 fw-bold my-1">
                    {formatNumber(stats.totalAccountings)}
                  </div>
                  <div className="small">
                    {stats.activeAccountings} active accounts
                  </div>
                </div>
                <div
                  className="bg-white rounded-circle d-flex align-items-center justify-content-center"
                  style={{ width: "50px", height: "50px" }}
                >
                  <FaUserTie size={20} className="text-info" />
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
                  <div className="text-white-50 small">System Backups</div>
                  <div className="h4 fw-bold my-1">
                    {formatNumber(stats.totalBackups)}
                  </div>
                  <div className="small">
                    {stats.completedBackups} completed
                  </div>
                </div>
                <div
                  className="bg-white rounded-circle d-flex align-items-center justify-content-center"
                  style={{ width: "50px", height: "50px" }}
                >
                  <FaDatabase size={20} className="text-warning" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Stats & System Status */}
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
                    {formatNumber(stats.activeSchools)}
                  </div>
                  <div className="text-muted small">Active Schools</div>
                </div>
              </div>
            </div>
            <div className="col-md-3 col-6">
              <div
                className="card border-0 bg-light h-100"
                style={{ borderRadius: "10px" }}
              >
                <div className="card-body text-center p-3">
                  <FaUsers className="text-primary mb-2" size={24} />
                  <div className="fw-bold text-dark h5">
                    {formatNumber(stats.custodiansWithSchools)}
                  </div>
                  <div className="text-muted small">Assigned Custodians</div>
                </div>
              </div>
            </div>
            <div className="col-md-3 col-6">
              <div
                className="card border-0 bg-light h-100"
                style={{ borderRadius: "10px" }}
              >
                <div className="card-body text-center p-3">
                  <FaCog className="text-primary mb-2" size={24} />
                  <div className="fw-bold text-dark h5">
                    {formatNumber(stats.totalSettings)}
                  </div>
                  <div className="text-muted small">System Settings</div>
                </div>
              </div>
            </div>
            <div className="col-md-3 col-6">
              <div
                className="card border-0 bg-light h-100"
                style={{ borderRadius: "10px" }}
              >
                <div className="card-body text-center p-3">
                  <FaServer className="text-primary mb-2" size={24} />
                  <div className="fw-bold text-dark h5">
                    {stats.systemUptime?.toFixed(1)}%
                  </div>
                  <div className="text-muted small">System Uptime</div>
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
                  System Status
                </div>
                <div className="h5 mb-0">{systemStatus.message}</div>
              </div>
              <systemStatusIcon size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="row g-4">
        {/* Recent Activities */}
        <div className="col-xl-8">
          <div className="card mb-4" style={{ borderRadius: "10px" }}>
            <div className="card-header bg-white border-bottom-0 py-3">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="card-title mb-0 text-dark d-flex align-items-center">
                  <FaHistory className="me-2 text-primary" />
                  Recent Activities
                </h5>
                <span className="badge bg-primary">
                  {recentActivities.length}
                </span>
              </div>
            </div>
            <div className="card-body p-0">
              {recentActivities.length === 0 ? (
                <div className="text-center py-4 text-muted">
                  No activity recorded yet.
                </div>
              ) : (
                <div className="list-group list-group-flush">
                  {recentActivities.map((activity) => (
                    <div
                      key={activity.id}
                      className="list-group-item d-flex align-items-center border-bottom py-3 px-3"
                    >
                      <div className="me-3">
                        {activity.type === "backup" &&
                        activity.status !== "completed" ? (
                          <div
                            className="bg-warning rounded-circle d-flex align-items-center justify-content-center"
                            style={{ width: "40px", height: "40px" }}
                          >
                            <FaClock size={16} className="text-white" />
                          </div>
                        ) : (
                          <div
                            className={`rounded-circle d-flex align-items-center justify-content-center ${
                              activity.type === "school"
                                ? "bg-primary"
                                : activity.type === "custodian"
                                ? "bg-success"
                                : activity.type === "accounting"
                                ? "bg-info"
                                : "bg-success"
                            }`}
                            style={{ width: "40px", height: "40px" }}
                          >
                            <FaCheckCircle size={16} className="text-white" />
                          </div>
                        )}
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
                        <span
                          className={`badge bg-${activity.badgeVariant} small`}
                        >
                          {activity.type}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="card-footer bg-light border-0 py-3">
              <button className="btn btn-outline-primary btn-sm">
                View All Activities
              </button>
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="card mb-4" style={{ borderRadius: "10px" }}>
            <div className="card-header bg-white border-bottom-0 py-3">
              <h5 className="card-title mb-0 text-dark d-flex align-items-center">
                <FaChartLine className="me-2 text-primary" />
                Performance Metrics
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
        </div>

        {/* Sidebar Content */}
        <div className="col-xl-4">
          {/* Priority Tasks */}
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

          {/* System Metrics */}
          <div className="card mb-4" style={{ borderRadius: "10px" }}>
            <div className="card-header bg-white border-bottom-0 py-3">
              <h5 className="card-title mb-0 text-dark d-flex align-items-center">
                <FaShieldAlt className="me-2 text-info" />
                System Metrics
              </h5>
            </div>
            <div className="card-body">
          <div className="table-responsive">
                <table className="table table-sm table-borderless">
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

          {/* Quick Actions */}
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

      {/* System Alerts Section */}
      <div className="row mt-4">
        <div className="col-12">
          <div className="card border-warning" style={{ borderRadius: "10px" }}>
            <div className="card-header bg-warning text-dark py-3 d-flex align-items-center">
              <FaExclamationTriangle className="me-2" />
              <h5 className="card-title mb-0">System Alerts</h5>
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
