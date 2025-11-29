import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaBox,
  FaCheckCircle,
  FaExclamationTriangle,
  FaClock,
  FaSyncAlt,
  FaHistory,
  FaUser,
  FaEnvelope,
  FaPhone,
  FaBuilding,
  FaBriefcase,
  FaGraduationCap,
  FaEdit,
  FaChartLine,
} from "react-icons/fa";
import { useAuth } from "../../contexts/AuthContext";
import { showToast } from "../../services/notificationService";
import api from "../../utils/api";
import Preloader from "../../components/Preloader";
import "./Dashboard.css";

const formatNumber = (value = 0) =>
  Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });

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

const getStatusColor = (status) => {
  const colors = {
    active: "success",
    returned: "secondary",
    lost: "danger",
    damaged: "warning",
  };
  return colors[status] || "secondary";
};

const getStatusBadge = (status) => {
  if (!status) return "secondary";
  
  const statusLower = String(status).toLowerCase();
  const badges = {
    active: "success",
    working: "success", // DCP Package uses "Working"
    assigned: "success",
    returned: "secondary",
    lost: "danger",
    damaged: "warning",
    "for repair": "warning",
    "for part replacement": "warning",
    maintenance: "warning",
  };
  return badges[statusLower] || "secondary";
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

const buildDashboardData = ({ assignedItems, personnel }) => {
  const assignedItemsArray = Array.isArray(assignedItems) ? assignedItems : [];

  // Statistics - handle both School Inventory and DCP Package items
  const totalItems = assignedItemsArray.length;
  
  // For status, check both 'status' field and 'condition_status' (DCP uses condition_status)
  const activeItems = assignedItemsArray.filter((item) => {
    const status = item.status || item.condition_status || "";
    return status === "active" || status === "Working" || status === "assigned";
  }).length;
  
  const returnedItems = assignedItemsArray.filter((item) => {
    const status = item.status || item.condition_status || "";
    return status === "returned";
  }).length;
  
  const lostItems = assignedItemsArray.filter((item) => {
    const status = item.status || item.condition_status || "";
    return status === "lost" || status === "Lost";
  }).length;
  
  const damagedItems = assignedItemsArray.filter((item) => {
    const status = item.status || item.condition_status || "";
    return status === "damaged" || status === "For Repair" || status === "For Part Replacement";
  }).length;
  
  const totalQuantity = assignedItemsArray.reduce(
    (sum, item) => sum + (item.quantity || 1), // Default to 1 if quantity not specified
    0
  );
  
  const activeQuantity = assignedItemsArray
    .filter((item) => {
      const status = item.status || item.condition_status || "";
      return status === "active" || status === "Working" || status === "assigned";
    })
    .reduce((sum, item) => sum + (item.quantity || 1), 0);

  // Recent Activities
  const recentActivities = assignedItemsArray
    .sort(
      (a, b) =>
        new Date(b.assigned_date || b.assigned_at || b.created_at) -
        new Date(a.assigned_date || a.assigned_at || a.created_at)
    )
    .slice(0, 6)
    .map((item) => {
      // Handle both School Inventory and DCP Package item structures
      const inventoryItem = item.inventory_item || item.inventoryItem || item;
      const itemName = inventoryItem?.name || item.name || item.description || "Unknown Item";
      const status = item.status || item.condition_status || "active";
      const assignedDate = item.assigned_date || item.assigned_at || item.created_at;
      
      return {
        id: item.id,
        action: "Item assigned",
        entity: itemName,
        date: assignedDate,
        status: status,
        quantity: item.quantity || 1,
        time: formatRelativeTime(assignedDate),
        badgeVariant: getStatusBadge(status),
      };
    });

  // Priority Tasks
  const priorityTasks = [];
  if (damagedItems > 0) {
    priorityTasks.push({
      task: "Report damaged items",
      priority: "high",
      count: damagedItems,
    });
  }
  if (lostItems > 0) {
    priorityTasks.push({
      task: "Report lost items",
      priority: "high",
      count: lostItems,
    });
  }
  if (returnedItems > 0) {
    priorityTasks.push({
      task: "Review returned items",
      priority: "medium",
      count: returnedItems,
    });
  }
  if (activeItems === 0 && totalItems > 0) {
    priorityTasks.push({
      task: "No active items",
      priority: "low",
      count: 0,
    });
  }
  
  // Add task for items needing attention (maintenance status)
  const maintenanceItems = assignedItemsArray.filter((item) => {
    const status = item.status || item.condition_status || "";
    return status === "maintenance" || status === "For Repair" || status === "For Part Replacement";
  }).length;
  
  if (maintenanceItems > 0) {
    priorityTasks.push({
      task: "Items in maintenance",
      priority: "medium",
      count: maintenanceItems,
    });
  }

  // System Metrics
  const systemMetrics = [
    {
      parameter: "Total Items",
      value: `${totalItems}`,
      status: totalItems > 0 ? "optimal" : "monitor",
      range: `${activeItems} active`,
    },
    {
      parameter: "Total Quantity",
      value: `${totalQuantity}`,
      status: totalQuantity > 0 ? "good" : "warning",
      range: `${activeQuantity} active`,
    },
    {
      parameter: "Active Items",
      value: `${activeItems}`,
      status: activeItems > 0 ? "optimal" : "warning",
      range: `${((activeItems / totalItems) * 100 || 0).toFixed(0)}% of total`,
    },
    {
      parameter: "Returned Items",
      value: `${returnedItems}`,
      status: returnedItems > 0 ? "good" : "optimal",
      range: `${((returnedItems / totalItems) * 100 || 0).toFixed(0)}% of total`,
    },
  ];

  // System Alerts
  const systemAlerts = [];
  if (lostItems > 0) {
    systemAlerts.push({
      type: "danger",
      title: "Lost Items",
      message: `${lostItems} item(s) marked as lost. Please report immediately.`,
    });
  }
  if (damagedItems > 0) {
    systemAlerts.push({
      type: "warning",
      title: "Damaged Items",
      message: `${damagedItems} item(s) marked as damaged. Please report for repair.`,
    });
  }
  if (activeItems === 0 && totalItems > 0) {
    systemAlerts.push({
      type: "info",
      title: "No Active Items",
      message: "All your assigned items have been returned or marked.",
    });
  }
  if (!systemAlerts.length) {
    systemAlerts.push({
      type: "success",
      title: "All Items in Good Standing",
      message: "No outstanding issues with your assigned items.",
    });
  }

  let systemStatusTone = "success";
  let systemStatusMessage = "All items are in good standing.";

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
      totalItems,
      activeItems,
      returnedItems,
      lostItems,
      damagedItems,
      totalQuantity,
      activeQuantity,
    },
    recentActivities,
    priorityTasks,
    systemMetrics,
    systemAlerts,
    systemStatus: {
      tone: systemStatusTone,
      message: systemStatusMessage,
    },
    personnel,
  };
};

export default function TeacherDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState(null);

  const quickActions = useMemo(
    () => [
      {
        label: "My Items",
        icon: FaBox,
        route: "/faculty/my-items",
        variant: "primary",
        color: "#ffffff",
        background: "linear-gradient(135deg, #0E254B 0%, #1a3a5c 100%)",
      },
      {
        label: "My Profile",
        icon: FaUser,
        route: "/faculty/profile",
        variant: "outline",
        color: "var(--primary-color)",
      },
      {
        label: "Account Settings",
        icon: FaEdit,
        route: "/faculty/account-settings",
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

  const fetchDashboardData = async ({ silent = false } = {}) => {
    try {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const baseUrl = import.meta.env.VITE_LARAVEL_API || "http://localhost:8000/api";
      const token = localStorage.getItem("access_token");

      if (!token) {
        setError("Authentication required");
        setLoading(false);
        return;
      }

      // Step 1: Get personnel ID (same approach as MyItems.jsx)
      const personnelRes = await api.get("/teacher/personnel/me").catch(() => ({ 
        data: { personnel: null } 
      }));

      const personnel =
        personnelRes.data?.personnel || personnelRes.data || null;

      if (!personnel?.id) {
        setError("Could not get personnel information");
        setLoading(false);
        return;
      }

      const personnelId = personnel.id;

      // Step 2: Fetch School Inventory items filtered by personnel_id (same as MyItems.jsx)
      const schoolResponse = await fetch(
        `${baseUrl}/property-custodian/inventory?per_page=1000`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      let schoolItems = [];
      if (schoolResponse.ok) {
        const schoolData = await schoolResponse.json();
        let allSchoolItems = [];
        if (schoolData.data && Array.isArray(schoolData.data)) {
          allSchoolItems = schoolData.data;
        } else if (Array.isArray(schoolData)) {
          allSchoolItems = schoolData;
        } else if (schoolData.items && Array.isArray(schoolData.items)) {
          allSchoolItems = schoolData.items;
        }
        // Filter by personnel_id - same as MyItems.jsx
        const assignedSchoolItems = allSchoolItems.filter(
          (item) => item.personnel_id === personnelId
        );
        schoolItems = assignedSchoolItems.map((item) => ({
          ...item,
          type: "school",
          source: "School Inventory",
          assigned_at: item.assigned_at || item.created_at,
          // Map to match assigned_items structure
          inventory_item: item,
          inventoryItem: item,
          status: item.status || "active",
          quantity: item.quantity || 1,
          assigned_date: item.assigned_at || item.created_at,
        }));
      }

      // Step 3: Fetch DCP Inventory items filtered by personnel_id (same as MyItems.jsx)
      const dcpResponse = await fetch(
        `${baseUrl}/property-custodian/dcp-inventory?personnel_id=${personnelId}&per_page=1000`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      let dcpItems = [];
      if (dcpResponse.ok) {
        const dcpData = await dcpResponse.json();
        let allDcpItems = [];
        if (dcpData.data && Array.isArray(dcpData.data)) {
          allDcpItems = dcpData.data;
        } else if (Array.isArray(dcpData)) {
          allDcpItems = dcpData;
        } else if (dcpData.items && Array.isArray(dcpData.items)) {
          allDcpItems = dcpData.items;
        }
        // Filter by personnel_id - same as MyItems.jsx
        const assignedDcpItems = allDcpItems.filter(
          (item) => item.personnel_id === personnelId
        );
        // Map DCP items to match structure
        dcpItems = assignedDcpItems.map((item) => ({
          ...item,
          // Map DCP fields to match School Inventory structure
          name: item.description || item.name,
          brand: item.manufacturer || item.brand,
          category: item.category || "Uncategorized",
          serial_number: item.serial_number || "N/A",
          type: "dcp",
          source: "DCP Package Inventory",
          assigned_at: item.assigned_at || item.created_at,
          // Map to match assigned_items structure
          inventory_item: {
            name: item.description || item.name,
            category: item.category,
            serial_number: item.serial_number,
          },
          inventoryItem: {
            name: item.description || item.name,
            category: item.category,
            serial_number: item.serial_number,
          },
          status: item.condition_status === "Working" ? "active" : (item.condition_status?.toLowerCase() || "active"),
          quantity: item.quantity || 1,
          assigned_date: item.assigned_at || item.created_at,
        }));
      }

      // Step 4: Combine both types of items (same as MyItems.jsx)
      const allItems = [...schoolItems, ...dcpItems];

      if (personnel) {
        setProfileData({ ...personnel });
      }

      const dashboardPayload = buildDashboardData({
        assignedItems: allItems,
        personnel,
      });

      setDashboardData(dashboardPayload);
    } catch (err) {
      console.error("Failed to load personnel dashboard:", err);
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

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      await api.put("/teacher/personnel/me", profileData);
      showToast.success("Profile updated successfully");
      setEditingProfile(false);
      fetchDashboardData({ silent: true });
    } catch (error) {
      showToast.error("Failed to update profile");
    }
  };

  useEffect(() => {
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="container-fluid px-3 py-2 personnel-dashboard-container fadeIn">
        <div className="d-flex flex-column flex-lg-row justify-content-between align-items-start align-items-lg-center mb-4 gap-3">
          <div className="text-start w-100">
            <h1
              className="h4 mb-1 fw-bold"
              style={{ color: "var(--text-primary)" }}
            >
              Personnel Dashboard
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
                  <FaExclamationTriangle className="me-2 text-warning" />
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
          </div>
        </div>
      </div>
    );
  }

  if ((!dashboardData || !user) && error) {
    return (
      <div className="container-fluid px-3 py-2 personnel-dashboard-container fadeIn">
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
    return <Preloader />;
  }

  const {
    stats,
    recentActivities,
    priorityTasks,
    systemMetrics,
    systemAlerts,
    systemStatus,
    personnel,
  } = dashboardData;

  const systemStatusClass =
    systemStatus.tone === "danger"
      ? "bg-danger text-white"
      : systemStatus.tone === "warning"
      ? "bg-warning text-dark"
      : systemStatus.tone === "info"
      ? "bg-info text-dark"
      : "bg-success text-white";

  const systemStatusIcon =
    systemStatus.tone === "danger" || systemStatus.tone === "warning"
      ? FaExclamationTriangle
      : FaCheckCircle;

  return (
    <div className="container-fluid px-3 py-2 teacher-dashboard-container fadeIn">
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

      {/* Page Header */}
      <div className="d-flex flex-column flex-lg-row justify-content-between align-items-start align-items-lg-center mb-4 gap-3">
        <div className="text-start w-100">
          <h1
            className="h4 mb-1 fw-bold"
            style={{ color: "var(--text-primary)" }}
          >
            Personnel Dashboard
          </h1>
          <p className="mb-0 small" style={{ color: "var(--text-muted)" }}>
            {user?.name || personnel?.full_name
              ? `Welcome back, ${(user?.name || personnel?.full_name)?.split(" ")[0]}! `
              : "Welcome back! "}
            Here's your assigned items overview.
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
                  <div className="text-white-50 small">Total Assigned Items</div>
                  <div className="h4 fw-bold my-1">
                    {formatNumber(stats.totalItems)}
                  </div>
                  <div className="small d-flex align-items-center">
                    <FaChartLine className="me-1" />
                    {stats.activeItems} active
                  </div>
                </div>
                <div
                  className="bg-white rounded-circle d-flex align-items-center justify-content-center"
                  style={{ width: "50px", height: "50px" }}
                >
                  <FaBox size={20} className="text-primary" />
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
                  <div className="text-white-50 small">Active Items</div>
                  <div className="h4 fw-bold my-1">
                    {formatNumber(stats.activeItems)}
                  </div>
                  <div className="small">
                    {stats.activeQuantity} total quantity
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
                  <div className="text-white-50 small">Returned Items</div>
                  <div className="h4 fw-bold my-1">
                    {formatNumber(stats.returnedItems)}
                  </div>
                  <div className="small">Successfully returned</div>
                </div>
                <div
                  className="bg-white rounded-circle d-flex align-items-center justify-content-center"
                  style={{ width: "50px", height: "50px" }}
                >
                  <FaClock size={20} className="text-info" />
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
                  <div className="text-white-50 small">Issues</div>
                  <div className="h4 fw-bold my-1">
                    {formatNumber(stats.lostItems + stats.damagedItems)}
                  </div>
                  <div className="small">
                    {stats.lostItems} lost, {stats.damagedItems} damaged
                  </div>
                </div>
                <div
                  className="bg-white rounded-circle d-flex align-items-center justify-content-center"
                  style={{ width: "50px", height: "50px" }}
                >
                  <FaExclamationTriangle size={20} className="text-warning" />
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
                  <FaBox className="text-primary mb-2" size={24} />
                  <div className="fw-bold text-dark h5">
                    {formatNumber(stats.totalQuantity)}
                  </div>
                  <div className="text-muted small">Total Quantity</div>
                </div>
              </div>
            </div>
            <div className="col-md-3 col-6">
              <div
                className="card border-0 bg-light h-100"
                style={{ borderRadius: "10px" }}
              >
                <div className="card-body text-center p-3">
                  <FaCheckCircle className="text-success mb-2" size={24} />
                  <div className="fw-bold text-dark h5">
                    {formatNumber(stats.activeQuantity)}
                  </div>
                  <div className="text-muted small">Active Quantity</div>
                </div>
              </div>
            </div>
            <div className="col-md-3 col-6">
              <div
                className="card border-0 bg-light h-100"
                style={{ borderRadius: "10px" }}
              >
                <div className="card-body text-center p-3">
                  <FaClock className="text-info mb-2" size={24} />
                  <div className="fw-bold text-dark h5">
                    {formatNumber(stats.returnedItems)}
                  </div>
                  <div className="text-muted small">Returned</div>
                </div>
              </div>
            </div>
            <div className="col-md-3 col-6">
              <div
                className="card border-0 bg-light h-100"
                style={{ borderRadius: "10px" }}
              >
                <div className="card-body text-center p-3">
                  <FaExclamationTriangle className="text-warning mb-2" size={24} />
                  <div className="fw-bold text-dark h5">
                    {formatNumber(stats.lostItems + stats.damagedItems)}
                  </div>
                  <div className="text-muted small">Issues</div>
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
                  No assigned items yet.
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
                          className={`rounded-circle d-flex align-items-center justify-content-center bg-${activity.badgeVariant}`}
                          style={{ width: "40px", height: "40px" }}
                        >
                          <FaBox size={16} className="text-white" />
                        </div>
                      </div>
                      <div className="flex-grow-1">
                        <div className="fw-bold text-dark small">
                          {activity.action}
                        </div>
                        <div className="text-muted small">
                          {activity.entity} (Qty: {activity.quantity})
                        </div>
                      </div>
                      <div className="text-end">
                        <div className="text-muted small">{activity.time}</div>
                        <span
                          className={`badge bg-${activity.badgeVariant} small`}
                        >
                          {activity.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="card-footer bg-light border-0 py-3">
              <button
                className="btn btn-outline-primary btn-sm"
                onClick={() => navigate("/faculty/my-items")}
              >
                View All Items
              </button>
            </div>
          </div>

          {/* Personnel Profile Card */}
          {personnel && (
            <div className="card mb-4" style={{ borderRadius: "10px" }}>
              <div className="card-header bg-white border-bottom-0 py-3">
                <div className="d-flex justify-content-between align-items-center">
                  <h5 className="card-title mb-0 text-dark d-flex align-items-center">
                    <FaUser className="me-2 text-primary" />
                    My Profile
                  </h5>
                  {!editingProfile && (
                    <button
                      className="btn btn-sm btn-outline-primary"
                      onClick={() => {
                        setEditingProfile(true);
                        setProfileData({ ...personnel });
                      }}
                    >
                      <FaEdit className="me-1" />
                      Edit
                    </button>
                  )}
                </div>
              </div>
              <div className="card-body">
                {editingProfile ? (
                  <form onSubmit={handleUpdateProfile}>
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label small text-muted">
                          Employee ID
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          value={profileData?.employee_id || ""}
                          disabled
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small text-muted">
                          First Name
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          value={profileData?.first_name || ""}
                          onChange={(e) =>
                            setProfileData({
                              ...profileData,
                              first_name: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small text-muted">
                          Last Name
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          value={profileData?.last_name || ""}
                          onChange={(e) =>
                            setProfileData({
                              ...profileData,
                              last_name: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small text-muted">
                          Email
                        </label>
                        <input
                          type="email"
                          className="form-control"
                          value={profileData?.email || ""}
                          onChange={(e) =>
                            setProfileData({
                              ...profileData,
                              email: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small text-muted">
                          Phone
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          value={profileData?.phone || ""}
                          onChange={(e) =>
                            setProfileData({
                              ...profileData,
                              phone: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small text-muted">
                          Department
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          value={profileData?.department || ""}
                          onChange={(e) =>
                            setProfileData({
                              ...profileData,
                              department: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small text-muted">
                          Position
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          value={profileData?.position || ""}
                          onChange={(e) =>
                            setProfileData({
                              ...profileData,
                              position: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small text-muted">
                          Subject Area
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          value={profileData?.subject_area || ""}
                          onChange={(e) =>
                            setProfileData({
                              ...profileData,
                              subject_area: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                    <div className="d-flex gap-2 mt-3">
                      <button type="submit" className="btn btn-primary btn-sm">
                        Save Changes
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm"
                        onClick={() => {
                          setEditingProfile(false);
                          setProfileData({ ...personnel });
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="row g-3">
                    <div className="col-md-6">
                      <div className="d-flex align-items-center mb-2">
                        <FaUser className="me-2 text-muted" size={14} />
                        <span className="small text-muted">Employee ID</span>
                      </div>
                      <div className="fw-bold">{personnel.employee_id}</div>
                    </div>
                    <div className="col-md-6">
                      <div className="d-flex align-items-center mb-2">
                        <FaEnvelope className="me-2 text-muted" size={14} />
                        <span className="small text-muted">Email</span>
                      </div>
                      <div className="fw-bold">{personnel.email || "N/A"}</div>
                    </div>
                    <div className="col-md-6">
                      <div className="d-flex align-items-center mb-2">
                        <FaPhone className="me-2 text-muted" size={14} />
                        <span className="small text-muted">Phone</span>
                      </div>
                      <div className="fw-bold">{personnel.phone || "N/A"}</div>
                    </div>
                    <div className="col-md-6">
                      <div className="d-flex align-items-center mb-2">
                        <FaBuilding className="me-2 text-muted" size={14} />
                        <span className="small text-muted">Department</span>
                      </div>
                      <div className="fw-bold">
                        {personnel.department || "N/A"}
                      </div>
                    </div>
                    {personnel.position && (
                      <div className="col-md-6">
                        <div className="d-flex align-items-center mb-2">
                          <FaBriefcase className="me-2 text-muted" size={14} />
                          <span className="small text-muted">Position</span>
                        </div>
                        <div className="fw-bold">{personnel.position}</div>
                      </div>
                    )}
                    {personnel.subject_area && (
                      <div className="col-md-6">
                        <div className="d-flex align-items-center mb-2">
                          <FaGraduationCap className="me-2 text-muted" size={14} />
                          <span className="small text-muted">Subject Area</span>
                        </div>
                        <div className="fw-bold">{personnel.subject_area}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Content */}
        <div className="col-xl-4">
          {/* Priority Tasks */}
          <div className="card mb-4" style={{ borderRadius: "10px" }}>
            <div className="card-header bg-white border-bottom-0 py-3">
              <h5 className="card-title mb-0 text-dark d-flex align-items-center">
                <FaExclamationTriangle className="me-2 text-warning" />
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
                <FaChartLine className="me-2 text-info" />
                Item Metrics
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
                        <td className="text-muted small">
                          {metric.parameter}
                        </td>
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
              <h5 className="card-title mb-0">Item Alerts</h5>
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
