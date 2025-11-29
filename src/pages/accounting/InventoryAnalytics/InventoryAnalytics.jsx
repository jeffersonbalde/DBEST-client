import React, { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { showAlert, showToast } from "../../../services/notificationService";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Bar, Line, Pie, Doughnut } from "react-chartjs-2";

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const StatsCardSkeleton = () => (
  <div className="card stats-card h-100">
    <div className="card-body p-3">
      <div className="d-flex align-items-center">
        <div className="flex-grow-1">
          <div className="text-xs fw-semibold text-uppercase mb-1 placeholder-wave">
            <span className="placeholder col-7" style={{ height: 14 }}></span>
          </div>
          <div className="h4 mb-0 fw-bold placeholder-wave">
            <span className="placeholder col-4" style={{ height: 28 }}></span>
          </div>
        </div>
        <div className="col-auto">
          <div className="placeholder-wave">
            <span
              className="placeholder rounded-circle"
              style={{ width: 48, height: 48, borderRadius: "50% !important" }}
            ></span>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const ChartSkeleton = () => (
  <div className="card shadow border-0 h-100">
    <div
      className="card-header py-3"
      style={{
        backgroundColor: "var(--primary-color)",
        background:
          "linear-gradient(135deg, var(--primary-color) 0%, var(--primary-light) 100%)",
      }}
    >
      <h6 className="card-title mb-0 text-white">
        <i className="fas fa-chart-bar me-2"></i>
        Loading Chart...
      </h6>
    </div>
    <div className="card-body">
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ height: "300px" }}
      >
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    </div>
  </div>
);

const InventoryAnalytics = () => {
  const { token } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLock, setActionLock] = useState(false);

  const apiBaseRef = useRef(
    (import.meta.env.VITE_LARAVEL_API || "http://localhost:8000/api").replace(
      /\/$/,
      ""
    )
  );

  const fetchAnalytics = useCallback(async () => {
    if (!token) {
      console.warn("No token available for analytics fetch");
      return;
    }
    setLoading(true);
    try {
      const apiUrl = `${apiBaseRef.current}/accounting/analytics`;
      console.log("Fetching analytics from:", apiUrl);

      const response = await fetch(apiUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        let errorMessage = "Failed to load analytics";
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (e) {
          errorMessage = response.statusText || errorMessage;
        }

        console.error("Analytics API Error:", {
          status: response.status,
          statusText: response.statusText,
          url: `${apiBaseRef.current}/accounting/analytics`,
        });

        throw new Error(errorMessage);
      }

      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
      console.error("Analytics fetch error:", error);
      showAlert.error(
        "Analytics",
        error.message ||
          "Unable to load inventory analytics. Please check your connection and try again."
      );
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchAnalytics();
    }
  }, [token, fetchAnalytics]);

  const handleRefresh = useCallback(async () => {
    if (actionLock) {
      showToast.warning("Please wait until the current action completes");
      return;
    }
    setActionLock(true);
    await fetchAnalytics();
    showToast.info("Analytics refreshed successfully");
    setActionLock(false);
  }, [fetchAnalytics, actionLock]);

  const formatCurrency = (value) =>
    `₱${Number(value || 0).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const formatNumber = (num) => {
    if (num === null || num === undefined || isNaN(num)) return 0;
    return num;
  };

  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
      },
      tooltip: {
        mode: "index",
        intersect: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
        },
      },
    },
  };

  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
      },
    },
  };

  // Chart data preparation functions
  const getInventoryBySourceChartData = () => {
    const schoolVsDcp = analytics?.school_vs_dcp || {};
    return {
      labels: ["School Inventory", "DCP Inventory"],
      datasets: [
        {
          label: "Inventory Count",
          data: [
            formatNumber(schoolVsDcp.school_inventory),
            formatNumber(schoolVsDcp.dcp_inventory),
          ],
          backgroundColor: ["#0E254B", "#3b82f6"],
          borderColor: ["#0E254B", "#3b82f6"],
          borderWidth: 2,
        },
      ],
    };
  };

  const getCategoryValueChartData = () => {
    const byCategory = analytics?.by_category || [];
    const topCategories = byCategory.slice(0, 10); // Top 10 categories by value

    return {
      labels: topCategories.map((cat) => cat.category || "Unknown"),
      datasets: [
        {
          label: "Total Value (₱)",
          data: topCategories.map((cat) => formatNumber(cat.value || 0)),
          backgroundColor: "rgba(255, 159, 64, 0.8)",
          borderColor: "rgba(255, 159, 64, 1)",
          borderWidth: 1,
        },
      ],
    };
  };

  const getInventoryBySchoolChartData = () => {
    const bySchool = analytics?.by_school || [];
    const topSchools = bySchool.slice(0, 10); // Top 10 schools

    return {
      labels: topSchools.map((school) => school.school_name || "Unknown"),
      datasets: [
        {
          label: "Total Items",
          data: topSchools.map((school) => formatNumber(school.total_items)),
          backgroundColor: "rgba(14, 37, 75, 0.8)",
          borderColor: "rgba(14, 37, 75, 1)",
          borderWidth: 1,
        },
      ],
    };
  };

  const getInventoryByCategoryChartData = () => {
    const byCategory = analytics?.by_category || [];
    const topCategories = byCategory.slice(0, 10); // Top 10 categories

    return {
      labels: topCategories.map((cat) => cat.category || "Unknown"),
      datasets: [
        {
          label: "Item Count",
          data: topCategories.map((cat) => formatNumber(cat.count)),
          backgroundColor: "rgba(59, 130, 246, 0.8)",
          borderColor: "rgba(59, 130, 246, 1)",
          borderWidth: 1,
        },
      ],
    };
  };

  const getInventoryValueBySchoolChartData = () => {
    const bySchool = analytics?.by_school || [];
    const topSchools = bySchool.slice(0, 10); // Top 10 schools

    return {
      labels: topSchools.map((school) => school.school_name || "Unknown"),
      datasets: [
        {
          label: "Total Value (₱)",
          data: topSchools.map((school) => formatNumber(school.total_value)),
          backgroundColor: "rgba(16, 185, 129, 0.8)",
          borderColor: "rgba(16, 185, 129, 1)",
          borderWidth: 1,
        },
      ],
    };
  };

  const getStatusDistributionChartData = () => {
    const byStatus = analytics?.by_status || [];
    const statusColors = {
      SERVICEABLE: "#28a745",
      "NEEDS REPAIR": "#ffc107",
      UNSERVICEABLE: "#dc3545",
      "MISSING/LOST": "#6c757d",
      Working: "#28a745",
      "For Repair": "#ffc107",
      Unrepairable: "#dc3545",
      Lost: "#6c757d",
    };

    return {
      labels: byStatus.map((status) => status.status || "Unknown"),
      datasets: [
        {
          label: "Status Distribution",
          data: byStatus.map((status) => formatNumber(status.count)),
          backgroundColor: byStatus.map(
            (status) =>
              statusColors[status.status] || "rgba(108, 117, 125, 0.8)"
          ),
          borderColor: byStatus.map(
            (status) => statusColors[status.status] || "rgba(108, 117, 125, 1)"
          ),
          borderWidth: 2,
        },
      ],
    };
  };

  const hasChartData = (dataKey) => {
    const data = analytics?.[dataKey];
    if (Array.isArray(data)) return data.length > 0;
    if (data && typeof data === "object") {
      return Object.values(data).some((val) => val > 0);
    }
    return false;
  };

  if (!analytics && !loading) {
    return (
      <div className="container-fluid px-3 py-2 inventory-analytics-container fadeIn">
        <div className="card shadow border-0">
          <div className="card-body text-center py-5">
            <i className="fas fa-chart-bar fa-3x text-muted mb-3"></i>
            <h5 className="text-muted mb-3">No Analytics Data Available</h5>
            <p className="text-muted mb-4">
              Analytics data will appear here once inventory items are added to
              the system.
            </p>
            <button
              className="btn btn-primary"
              onClick={fetchAnalytics}
              style={{
                backgroundColor: "var(--btn-primary-bg)",
                borderColor: "var(--btn-primary-bg)",
              }}
            >
              <i className="fas fa-redo me-2"></i>
              Refresh Data
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid px-3 py-2 inventory-analytics-container fadeIn">
      {/* Page Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-3">
        <div className="flex-grow-1 mb-2 mb-md-0">
          <h1
            className="h4 mb-1 fw-bold"
            style={{ color: "var(--text-primary)" }}
          >
            Inventory Analytics
          </h1>
          <p className="mb-0 small" style={{ color: "var(--text-muted)" }}>
            Comprehensive analytics and insights across all schools, inventory
            types, and assignments
          </p>
        </div>
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <button
            className="btn btn-sm"
            onClick={handleRefresh}
            disabled={loading || actionLock}
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
                      Total Items
                    </div>
                    <div
                      className="h4 mb-0 fw-bold"
                      style={{ color: "var(--primary-color)" }}
                    >
                      {formatNumber(analytics?.summary?.total_items)}
                    </div>
                  </div>
                  <div className="col-auto">
                    <i
                      className="fas fa-box fa-2x"
                      style={{
                        color: "var(--primary-light)",
                        opacity: 0.7,
                      }}
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
                      style={{ color: "var(--info-color)" }}
                    >
                      Total Value
                    </div>
                    <div
                      className="h4 mb-0 fw-bold"
                      style={{ color: "var(--info-color)" }}
                    >
                      {analytics?.summary?.total_value
                        ? formatCurrency(analytics.summary.total_value)
                        : "₱0.00"}
                    </div>
                  </div>
                  <div className="col-auto">
                    <i
                      className="fas fa-peso-sign fa-2x"
                      style={{
                        color: "var(--info-light)",
                        opacity: 0.7,
                      }}
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
                      Total Quantity
                    </div>
                    <div
                      className="h4 mb-0 fw-bold"
                      style={{ color: "var(--success-color)" }}
                    >
                      {formatNumber(
                        analytics?.summary?.total_quantity || 0
                      ).toLocaleString("en-PH")}
                    </div>
                  </div>
                  <div className="col-auto">
                    <i
                      className="fas fa-layer-group fa-2x"
                      style={{
                        color: "var(--success-light)",
                        opacity: 0.7,
                      }}
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
                      style={{ color: "#17a2b8" }}
                    >
                      Total Schools
                    </div>
                    <div
                      className="h4 mb-0 fw-bold"
                      style={{ color: "#17a2b8" }}
                    >
                      {formatNumber(analytics?.by_school?.length || 0)}
                    </div>
                  </div>
                  <div className="col-auto">
                    <i
                      className="fas fa-school fa-2x"
                      style={{
                        color: "#17a2b8",
                        opacity: 0.7,
                      }}
                    ></i>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Charts Row 1 - Pie Charts */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-lg-6">
          {loading ? (
            <ChartSkeleton />
          ) : !hasChartData("school_vs_dcp") ? (
            <div className="card shadow border-0 h-100">
              <div
                className="card-header py-3"
                style={{
                  backgroundColor: "var(--primary-color)",
                  background:
                    "linear-gradient(135deg, var(--primary-color) 0%, var(--primary-light) 100%)",
                }}
              >
                <h6 className="card-title mb-0 text-white">
                  <i className="fas fa-chart-pie me-2"></i>
                  Inventory by Source
                </h6>
              </div>
              <div className="card-body text-center py-5">
                <i className="fas fa-chart-pie fa-2x text-muted mb-3"></i>
                <p className="text-muted">No source data available</p>
              </div>
            </div>
          ) : (
            <div className="card shadow border-0 h-100">
              <div
                className="card-header py-3"
                style={{
                  backgroundColor: "var(--primary-color)",
                  background:
                    "linear-gradient(135deg, var(--primary-color) 0%, var(--primary-light) 100%)",
                }}
              >
                <h6 className="card-title mb-0 text-white">
                  <i className="fas fa-chart-pie me-2"></i>
                  Inventory by Source
                </h6>
              </div>
              <div className="card-body">
                <div style={{ height: "300px" }}>
                  <Doughnut
                    data={getInventoryBySourceChartData()}
                    options={pieChartOptions}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="col-12 col-lg-6">
          {loading ? (
            <ChartSkeleton />
          ) : !hasChartData("by_category") ? (
            <div className="card shadow border-0 h-100">
              <div
                className="card-header py-3"
                style={{
                  backgroundColor: "var(--primary-color)",
                  background:
                    "linear-gradient(135deg, var(--primary-color) 0%, var(--primary-light) 100%)",
                }}
              >
                <h6 className="card-title mb-0 text-white">
                  <i className="fas fa-chart-line me-2"></i>
                  Category Value Distribution
                </h6>
              </div>
              <div className="card-body text-center py-5">
                <i className="fas fa-chart-line fa-2x text-muted mb-3"></i>
                <p className="text-muted">No category value data available</p>
              </div>
            </div>
          ) : (
            <div className="card shadow border-0 h-100">
              <div
                className="card-header py-3"
                style={{
                  backgroundColor: "var(--primary-color)",
                  background:
                    "linear-gradient(135deg, var(--primary-color) 0%, var(--primary-light) 100%)",
                }}
              >
                <h6 className="card-title mb-0 text-white">
                  <i className="fas fa-chart-line me-2"></i>
                  Category Value Distribution
                </h6>
              </div>
              <div className="card-body">
                <div style={{ height: "300px" }}>
                  <Bar
                    data={getCategoryValueChartData()}
                    options={{
                      ...chartOptions,
                      scales: {
                        ...chartOptions.scales,
                        x: {
                          ticks: {
                            maxRotation: 45,
                            minRotation: 45,
                          },
                        },
                        y: {
                          ticks: {
                            callback: function (value) {
                              return "₱" + value.toLocaleString("en-PH");
                            },
                          },
                        },
                      },
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Charts Row 2 - Bar Charts */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-lg-6">
          {loading ? (
            <ChartSkeleton />
          ) : !hasChartData("by_school") ? (
            <div className="card shadow border-0 h-100">
              <div
                className="card-header py-3"
                style={{
                  backgroundColor: "var(--primary-color)",
                  background:
                    "linear-gradient(135deg, var(--primary-color) 0%, var(--primary-light) 100%)",
                }}
              >
                <h6 className="card-title mb-0 text-white">
                  <i className="fas fa-chart-bar me-2"></i>
                  Inventory by School
                </h6>
              </div>
              <div className="card-body text-center py-5">
                <i className="fas fa-chart-bar fa-2x text-muted mb-3"></i>
                <p className="text-muted">No school data available</p>
              </div>
            </div>
          ) : (
            <div className="card shadow border-0 h-100">
              <div
                className="card-header py-3"
                style={{
                  backgroundColor: "var(--primary-color)",
                  background:
                    "linear-gradient(135deg, var(--primary-color) 0%, var(--primary-light) 100%)",
                }}
              >
                <h6 className="card-title mb-0 text-white">
                  <i className="fas fa-chart-bar me-2"></i>
                  Inventory by School
                </h6>
              </div>
              <div className="card-body">
                <div style={{ height: "300px" }}>
                  <Bar
                    data={getInventoryBySchoolChartData()}
                    options={{
                      ...chartOptions,
                      scales: {
                        ...chartOptions.scales,
                        x: {
                          ticks: {
                            maxRotation: 45,
                            minRotation: 45,
                          },
                        },
                      },
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="col-12 col-lg-6">
          {loading ? (
            <ChartSkeleton />
          ) : !hasChartData("by_category") ? (
            <div className="card shadow border-0 h-100">
              <div
                className="card-header py-3"
                style={{
                  backgroundColor: "var(--primary-color)",
                  background:
                    "linear-gradient(135deg, var(--primary-color) 0%, var(--primary-light) 100%)",
                }}
              >
                <h6 className="card-title mb-0 text-white">
                  <i className="fas fa-tags me-2"></i>
                  Inventory by Category
                </h6>
              </div>
              <div className="card-body text-center py-5">
                <i className="fas fa-tags fa-2x text-muted mb-3"></i>
                <p className="text-muted">No category data available</p>
              </div>
            </div>
          ) : (
            <div className="card shadow border-0 h-100">
              <div
                className="card-header py-3"
                style={{
                  backgroundColor: "var(--primary-color)",
                  background:
                    "linear-gradient(135deg, var(--primary-color) 0%, var(--primary-light) 100%)",
                }}
              >
                <h6 className="card-title mb-0 text-white">
                  <i className="fas fa-tags me-2"></i>
                  Inventory by Category
                </h6>
              </div>
              <div className="card-body">
                <div style={{ height: "300px" }}>
                  <Bar
                    data={getInventoryByCategoryChartData()}
                    options={{
                      ...chartOptions,
                      scales: {
                        ...chartOptions.scales,
                        x: {
                          ticks: {
                            maxRotation: 45,
                            minRotation: 45,
                          },
                        },
                      },
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Charts Row 3 - Status and Value Charts */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-lg-6">
          {loading ? (
            <ChartSkeleton />
          ) : !hasChartData("by_status") ? (
            <div className="card shadow border-0 h-100">
              <div
                className="card-header py-3"
                style={{
                  backgroundColor: "var(--primary-color)",
                  background:
                    "linear-gradient(135deg, var(--primary-color) 0%, var(--primary-light) 100%)",
                }}
              >
                <h6 className="card-title mb-0 text-white">
                  <i className="fas fa-info-circle me-2"></i>
                  Status Distribution
                </h6>
              </div>
              <div className="card-body text-center py-5">
                <i className="fas fa-info-circle fa-2x text-muted mb-3"></i>
                <p className="text-muted">No status data available</p>
              </div>
            </div>
          ) : (
            <div className="card shadow border-0 h-100">
              <div
                className="card-header py-3"
                style={{
                  backgroundColor: "var(--primary-color)",
                  background:
                    "linear-gradient(135deg, var(--primary-color) 0%, var(--primary-light) 100%)",
                }}
              >
                <h6 className="card-title mb-0 text-white">
                  <i className="fas fa-info-circle me-2"></i>
                  Status Distribution
                </h6>
              </div>
              <div className="card-body">
                <div style={{ height: "300px" }}>
                  <Pie
                    data={getStatusDistributionChartData()}
                    options={pieChartOptions}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="col-12 col-lg-6">
          {loading ? (
            <ChartSkeleton />
          ) : !hasChartData("by_school") ? (
            <div className="card shadow border-0 h-100">
              <div
                className="card-header py-3"
                style={{
                  backgroundColor: "var(--primary-color)",
                  background:
                    "linear-gradient(135deg, var(--primary-color) 0%, var(--primary-light) 100%)",
                }}
              >
                <h6 className="card-title mb-0 text-white">
                  <i className="fas fa-peso-sign me-2"></i>
                  Inventory Value by School
                </h6>
              </div>
              <div className="card-body text-center py-5">
                <i className="fas fa-peso-sign fa-2x text-muted mb-3"></i>
                <p className="text-muted">No value data available</p>
              </div>
            </div>
          ) : (
            <div className="card shadow border-0 h-100">
              <div
                className="card-header py-3"
                style={{
                  backgroundColor: "var(--primary-color)",
                  background:
                    "linear-gradient(135deg, var(--primary-color) 0%, var(--primary-light) 100%)",
                }}
              >
                <h6 className="card-title mb-0 text-white">
                  <i className="fas fa-peso-sign me-2"></i>
                  Inventory Value by School
                </h6>
              </div>
              <div className="card-body">
                <div style={{ height: "300px" }}>
                  <Bar
                    data={getInventoryValueBySchoolChartData()}
                    options={{
                      ...chartOptions,
                      scales: {
                        ...chartOptions.scales,
                        x: {
                          ticks: {
                            maxRotation: 45,
                            minRotation: 45,
                          },
                        },
                        y: {
                          ticks: {
                            callback: function (value) {
                              return "₱" + value.toLocaleString("en-PH");
                            },
                          },
                        },
                      },
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InventoryAnalytics;
