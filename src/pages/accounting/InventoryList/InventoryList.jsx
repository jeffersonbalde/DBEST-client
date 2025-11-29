import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { useAuth } from "../../../contexts/AuthContext";
import { showAlert, showToast } from "../../../services/notificationService";

const formatDate = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }
  return date.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatCurrency = (value = 0) =>
  `₱${Number(value || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const TableRowSkeleton = () => (
  <tr className="align-middle" style={{ height: "70px" }}>
    <td className="text-center">
      <div className="placeholder-wave">
        <span className="placeholder col-4" style={{ height: 16 }}></span>
      </div>
    </td>
    {[...Array(8)].map((_, idx) => (
      <td key={idx}>
        <div className="placeholder-wave mb-1">
          <span className="placeholder col-8" style={{ height: 16 }}></span>
        </div>
        {idx < 2 && (
          <div className="placeholder-wave">
            <span className="placeholder col-6" style={{ height: 14 }}></span>
          </div>
        )}
      </td>
    ))}
  </tr>
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

const EmptyState = () => (
  <div className="text-center py-5">
    <div className="mb-3">
      <i
        className="fas fa-box-open fa-3x"
        style={{ color: "var(--text-muted)", opacity: 0.5 }}
      ></i>
    </div>
    <h5 className="mb-2" style={{ color: "var(--text-muted)" }}>
      No Inventory Items
    </h5>
    <p className="mb-3 small" style={{ color: "var(--text-muted)" }}>
      No inventory items found matching your filters.
    </p>
  </div>
);

const InventoryList = () => {
  const { token } = useAuth();
  const [items, setItems] = useState([]);
  const [allItems, setAllItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLock, setActionLock] = useState(false);
  const [exportLoading, setExportLoading] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [schoolFilter, setSchoolFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState("created_at");
  const [sortDirection, setSortDirection] = useState("desc");

  const [schools, setSchools] = useState([]);
  const [categories, setCategories] = useState([]);

  const apiBaseRef = useRef(
    (import.meta.env.VITE_LARAVEL_API || "http://localhost:8000/api").replace(
      /\/$/,
      ""
    )
  );

  const fetchInventory = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const baseUrl = apiBaseRef.current;
      let allFetchedItems = [];
      let page = 1;
      let hasMore = true;

      // Fetch all pages
      while (hasMore) {
        const response = await fetch(
          `${baseUrl}/accounting/inventory?per_page=100&page=${page}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to load inventory");
        }

        const data = await response.json();
        if (data.data && Array.isArray(data.data)) {
          allFetchedItems = [...allFetchedItems, ...data.data];
          hasMore = page < (data.last_page || 1);
          page++;
        } else {
          hasMore = false;
        }
      }

      setAllItems(allFetchedItems);
      setItems(allFetchedItems);

      // Extract unique schools and categories
      const uniqueSchools = [
        ...new Set(
          allFetchedItems.map((item) => item.school_name).filter(Boolean)
        ),
      ].sort();
      const uniqueCategories = [
        ...new Set(
          allFetchedItems.map((item) => item.category).filter(Boolean)
        ),
      ].sort();

      setSchools(uniqueSchools);
      setCategories(uniqueCategories);
    } catch (error) {
      console.error("Error fetching inventory:", error);
      showAlert.error(
        "Error",
        error.message || "Unable to load inventory items"
      );
      setItems([]);
      setAllItems([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchInventory();
    }
  }, [token, fetchInventory]);

  const filterAndSortItems = useCallback(() => {
    let list = [...items];

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter((item) => {
        const fields = [
          item.name,
          item.description,
          item.category,
          item.serial_number,
          item.item_code,
          item.brand,
          item.model,
          item.school_name,
          item.personnel?.full_name,
        ];
        return fields.some(
          (field) => field && String(field).toLowerCase().includes(term)
        );
      });
    }

    // School filter
    if (schoolFilter !== "all") {
      list = list.filter((item) => item.school_name === schoolFilter);
    }

    // Category filter
    if (categoryFilter !== "all") {
      list = list.filter((item) => item.category === categoryFilter);
    }

    // Status filter
    if (statusFilter !== "all") {
      list = list.filter((item) => {
        const status = item.status || item.condition_status || "";
        if (statusFilter === "SERVICEABLE" || statusFilter === "Working") {
          return status === "SERVICEABLE" || status === "Working";
        }
        if (statusFilter === "UNSERVICEABLE") {
          return status === "UNSERVICEABLE" || status === "Unrepairable";
        }
        if (statusFilter === "NEEDS REPAIR") {
          return (
            status === "NEEDS REPAIR" ||
            status === "For Repair" ||
            status === "For Part Replacement"
          );
        }
        if (statusFilter === "MISSING/LOST") {
          return status === "MISSING/LOST" || status === "Lost";
        }
        return status === statusFilter;
      });
    }

    // Source filter
    if (sourceFilter !== "all") {
      list = list.filter((item) => item.type === sourceFilter);
    }

    // Sorting
    list.sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      if (sortField === "created_at" || sortField === "updated_at") {
        aValue = aValue ? new Date(aValue) : new Date(0);
        bValue = bValue ? new Date(bValue) : new Date(0);
        if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
        if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
        return 0;
      }

      if (sortField === "name" || sortField === "description") {
        aValue = (aValue || "").toString().toLowerCase();
        bValue = (bValue || "").toString().toLowerCase();
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    setFilteredItems(list);
  }, [
    items,
    searchTerm,
    schoolFilter,
    categoryFilter,
    statusFilter,
    sourceFilter,
    sortField,
    sortDirection,
  ]);

  useEffect(() => {
    filterAndSortItems();
  }, [filterAndSortItems]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchTerm,
    schoolFilter,
    categoryFilter,
    statusFilter,
    sourceFilter,
    itemsPerPage,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil((filteredItems.length || 1) / itemsPerPage)
  );
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = filteredItems.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  const handleSort = (field) => {
    if (actionLock) return;
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (field) => {
    if (sortField !== field) return "fas fa-sort text-muted";
    return sortDirection === "asc" ? "fas fa-sort-up" : "fas fa-sort-down";
  };

  const refreshData = useCallback(async () => {
    await fetchInventory();
    showToast.info("Inventory refreshed successfully");
  }, [fetchInventory]);

  const exportToPdf = async () => {
    if (!filteredItems.length) {
      showToast.warning("No items to export.");
      return;
    }

    setExportLoading("pdf");
    try {
      showAlert.loading(
        "Generating PDF",
        "Please wait while we generate the inventory report..."
      );

      const doc = new jsPDF("l", "mm", "a4");
      const generatedDate = new Date().toLocaleString("en-PH", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      doc.setFontSize(16);
      doc.setTextColor(14, 37, 75);
      doc.text("INVENTORY REPORT", 148, 15, { align: "center" });

      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text("DBEST Inventory System", 148, 22, { align: "center" });
      doc.text(`Generated on: ${generatedDate}`, 14, 30);

      const body = filteredItems.map((item) => {
        const quantity = item.quantity || 1;
        const unitPrice = item.unit_price || item.unit_value || 0;
        const amount = quantity * unitPrice;

        return [
          item.name || item.description || "-",
          item.category || "-",
          item.status || item.condition_status || "-",
          quantity,
          item.available_quantity !== undefined
            ? item.available_quantity
            : quantity,
          item.location || "-",
          item.brand || item.manufacturer || "-",
          item.model || "-",
          item.serial_number || "-",
          formatCurrency(amount),
        ];
      });

      autoTable(doc, {
        startY: 40,
        head: [
          [
            "Name",
            "Category",
            "Status",
            "Quantity",
            "Available",
            "Location",
            "Brand",
            "Model",
            "Serial Number",
            "Amount",
          ],
        ],
        body,
        theme: "grid",
        headStyles: {
          fillColor: [14, 37, 75],
          textColor: [255, 255, 255],
          fontStyle: "bold",
        },
        styles: { fontSize: 7 },
        columnStyles: {
          0: { cellWidth: 45 },
          1: { cellWidth: 30 },
          2: { cellWidth: 25 },
          3: { cellWidth: 18, halign: "right" },
          4: { cellWidth: 18, halign: "right" },
          5: { cellWidth: 30 },
          6: { cellWidth: 30 },
          7: { cellWidth: 30 },
          8: { cellWidth: 30 },
          9: { cellWidth: 30, halign: "right" },
        },
      });

      showAlert.close();
      doc.save("inventory-report.pdf");
      showToast.success("Inventory exported as PDF");
    } catch (error) {
      console.error("PDF export error:", error);
      showAlert.close();
      showToast.error("Failed to export inventory as PDF");
    } finally {
      setExportLoading(null);
    }
  };

  const exportToCsv = async () => {
    if (!filteredItems.length) {
      showToast.warning("No items to export.");
      return;
    }

    setExportLoading("csv");
    try {
      showAlert.loading(
        "Generating CSV",
        "Please wait while we generate the inventory report..."
      );

      const header = [
        "Name",
        "Category",
        "Status",
        "Quantity",
        "Available",
        "Location",
        "Brand",
        "Model",
        "Serial Number",
        "Amount",
      ];

      const rows = filteredItems.map((item) => {
        const quantity = item.quantity || 1;
        const unitPrice = item.unit_price || item.unit_value || 0;
        const amount = quantity * unitPrice;

        return [
          item.name || item.description || "",
          item.category || "",
          item.status || item.condition_status || "",
          quantity,
          item.available_quantity !== undefined
            ? item.available_quantity
            : quantity,
          item.location || "",
          item.brand || item.manufacturer || "",
          item.model || "",
          item.serial_number || "",
          formatCurrency(amount),
        ];
      });

      const csvLines = [
        header.join(","),
        ...rows.map((row) =>
          row
            .map((value) => {
              const str = String(value ?? "");
              if (str.includes(",") || str.includes('"')) {
                return `"${str.replace(/"/g, '""')}"`;
              }
              return str;
            })
            .join(",")
        ),
      ];

      const csvContent = csvLines.join("\n");
      const blob = new Blob([csvContent], {
        type: "text/csv;charset=utf-8;",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "inventory-report.csv";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showAlert.close();
      showToast.success("Inventory exported as Excel/CSV");
    } catch (error) {
      console.error("CSV export error:", error);
      showAlert.close();
      showToast.error("Failed to export inventory as Excel/CSV");
    } finally {
      setExportLoading(null);
    }
  };

  // Calculate statistics
  const stats = useMemo(() => {
    const totalItems = items.length;
    const schoolItems = items.filter((item) => item.type === "school").length;
    const dcpItems = items.filter((item) => item.type === "dcp").length;
    const totalQuantity = items.reduce(
      (sum, item) => sum + (Number(item.quantity) || 1),
      0
    );
    const totalValue = items.reduce((sum, item) => {
      const quantity = Number(item.quantity) || 1;
      const unitPrice = Number(item.unit_price || item.unit_value || 0);
      const itemValue = quantity * unitPrice;
      return sum + itemValue;
    }, 0);

    return {
      totalItems,
      schoolItems,
      dcpItems,
      totalQuantity,
      totalValue,
    };
  }, [items]);

  return (
    <div className="container-fluid px-3 py-2 inventory-list-container fadeIn">
      {/* Page Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-3">
        <div className="flex-grow-1 mb-2 mb-md-0">
          <h1
            className="h4 mb-1 fw-bold"
            style={{ color: "var(--text-primary)" }}
          >
            Inventory List
          </h1>
          <p className="mb-0 small" style={{ color: "var(--text-muted)" }}>
            View and manage all inventory items across all schools
          </p>
        </div>
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <button
            className="btn btn-sm btn-danger text-white"
            onClick={exportToPdf}
            disabled={
              loading || exportLoading === "pdf" || filteredItems.length === 0
            }
            style={{
              transition: "all 0.2s ease-in-out",
              width: "140px",
            }}
            onMouseEnter={(e) => {
              if (!e.target.disabled) {
                e.target.style.transform = "translateY(-1px)";
                e.target.style.boxShadow = "0 4px 8px rgba(0,0,0,0.2)";
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "translateY(0)";
              e.target.style.boxShadow = "none";
            }}
          >
            {exportLoading === "pdf" ? (
              <>
                <span className="spinner-border spinner-border-sm me-1"></span>
                Exporting...
              </>
            ) : (
              <>
                <i className="fas fa-file-pdf me-1"></i>
                Export PDF
              </>
            )}
          </button>
          <button
            className="btn btn-sm btn-success text-white"
            onClick={exportToCsv}
            disabled={
              loading || exportLoading === "csv" || filteredItems.length === 0
            }
            style={{
              transition: "all 0.2s ease-in-out",
              width: "150px",
            }}
            onMouseEnter={(e) => {
              if (!e.target.disabled) {
                e.target.style.transform = "translateY(-1px)";
                e.target.style.boxShadow = "0 4px 8px rgba(0,0,0,0.2)";
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "translateY(0)";
              e.target.style.boxShadow = "none";
            }}
          >
            {exportLoading === "csv" ? (
              <>
                <span className="spinner-border spinner-border-sm me-1"></span>
                Exporting...
              </>
            ) : (
              <>
                <i className="fas fa-file-excel me-1"></i>
                Export Excel
              </>
            )}
          </button>
          <button
            className="btn btn-sm"
            onClick={refreshData}
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
                      {stats.totalItems}
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
                      {formatCurrency(stats.totalValue)}
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
                      {stats.totalQuantity.toLocaleString()}
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
                      style={{ color: "var(--warning-color)" }}
                    >
                      Filtered Results
                    </div>
                    <div
                      className="h4 mb-0 fw-bold"
                      style={{ color: "var(--warning-color)" }}
                    >
                      {filteredItems.length}
                    </div>
                  </div>
                  <div className="col-auto">
                    <i
                      className="fas fa-filter fa-2x"
                      style={{
                        color: "var(--warning-light)",
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

      {/* Filters */}
      <div
        className="card border-0 shadow-sm mb-3"
        style={{ backgroundColor: "var(--background-white)" }}
      >
        <div className="card-body p-3">
          <div className="row g-3 align-items-center flex-wrap">
            <div className="col-12 col-lg-4 d-flex flex-column">
              <label
                className="form-label small fw-semibold mb-1"
                style={{ color: "var(--text-muted)" }}
              >
                Search Items
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
                  placeholder="Search by name, category, serial number, school, or personnel"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  disabled={loading || actionLock}
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
                    disabled={loading || actionLock}
                    style={{
                      color: "#6c757d",
                      backgroundColor: "transparent",
                      border: "none",
                      padding: "0.25rem 0.5rem",
                      transition: "all 0.2s ease-in-out",
                    }}
                    onMouseEnter={(e) => {
                      if (!e.target.disabled) {
                        const icon = e.target.querySelector("i");
                        e.target.style.color = "#fff";
                        e.target.style.backgroundColor = "#dc3545";
                        if (icon) icon.style.color = "#fff";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!e.target.disabled) {
                        const icon = e.target.querySelector("i");
                        e.target.style.color = "#6c757d";
                        e.target.style.backgroundColor = "transparent";
                        if (icon) icon.style.color = "#6c757d";
                      }
                    }}
                  >
                    <i className="fas fa-times"></i>
                  </button>
                )}
              </div>
            </div>
            <div className="col-12 col-sm-6 col-md-3 col-lg-2 d-flex flex-column">
              <label
                className="form-label small fw-semibold mb-1"
                style={{ color: "var(--text-muted)" }}
              >
                School
              </label>
              <select
                className="form-select form-select-sm"
                value={schoolFilter}
                onChange={(e) => setSchoolFilter(e.target.value)}
                disabled={loading || actionLock}
                style={{
                  backgroundColor: "var(--input-bg)",
                  borderColor: "var(--input-border)",
                  color: "var(--input-text)",
                }}
              >
                <option value="all">All Schools</option>
                {schools.map((school) => (
                  <option key={school} value={school}>
                    {school}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-12 col-sm-6 col-md-3 col-lg-2 d-flex flex-column">
              <label
                className="form-label small fw-semibold mb-1"
                style={{ color: "var(--text-muted)" }}
              >
                Source
              </label>
              <select
                className="form-select form-select-sm"
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                disabled={loading || actionLock}
                style={{
                  backgroundColor: "var(--input-bg)",
                  borderColor: "var(--input-border)",
                  color: "var(--input-text)",
                }}
              >
                <option value="all">All Sources</option>
                <option value="school">School Inventory</option>
                <option value="dcp">DCP Package</option>
              </select>
            </div>
            <div className="col-12 col-sm-6 col-md-3 col-lg-2 d-flex flex-column">
              <label
                className="form-label small fw-semibold mb-1"
                style={{ color: "var(--text-muted)" }}
              >
                Category
              </label>
              <select
                className="form-select form-select-sm"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                disabled={loading || actionLock}
                style={{
                  backgroundColor: "var(--input-bg)",
                  borderColor: "var(--input-border)",
                  color: "var(--input-text)",
                }}
              >
                <option value="all">All Categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-12 col-sm-6 col-md-3 col-lg-2 d-flex flex-column">
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
                disabled={loading || actionLock}
                style={{
                  backgroundColor: "var(--input-bg)",
                  borderColor: "var(--input-border)",
                  color: "var(--input-text)",
                }}
              >
                <option value="all">All Status</option>
                <option value="SERVICEABLE">Serviceable</option>
                <option value="UNSERVICEABLE">Unserviceable</option>
                <option value="NEEDS REPAIR">Needs Repair</option>
                <option value="MISSING/LOST">Missing/Lost</option>
              </select>
            </div>
            <div className="col-12 col-sm-6 col-md-3 col-lg-2 d-flex flex-column">
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
                disabled={loading || actionLock}
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

      {/* Main Table */}
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
              <i className="fas fa-clipboard-list me-2"></i>
              Inventory Items
              {!loading && (
                <small className="opacity-75 ms-2 text-white">
                  ({filteredItems.length} found
                  {searchTerm ||
                  schoolFilter !== "all" ||
                  categoryFilter !== "all" ||
                  statusFilter !== "all" ||
                  sourceFilter !== "all"
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
                    {[
                      "#",
                      "School",
                      "Source",
                      "Item Name",
                      "Category",
                      "Serial Number",
                      "Quantity",
                      "Status",
                      "Assigned To",
                      "Value",
                    ].map((label) => (
                      <th
                        key={label}
                        className="small fw-semibold"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {label}
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
                >
                  <span className="visually-hidden">Loading...</span>
                </div>
                <span className="small" style={{ color: "var(--text-muted)" }}>
                  Fetching inventory items...
                </span>
              </div>
            </div>
          ) : currentItems.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              <div className="table-responsive">
                <table className="table table-striped table-hover mb-0">
                  <thead style={{ backgroundColor: "var(--background-light)" }}>
                    <tr>
                      <th
                        className="text-center small fw-semibold"
                        style={{ width: "5%", color: "var(--text-primary)" }}
                      >
                        #
                      </th>
                      <th
                        className="small fw-semibold"
                        style={{ width: "12%", color: "var(--text-primary)" }}
                      >
                        <button
                          className="btn btn-link p-0 border-0 text-decoration-none fw-semibold text-start"
                          onClick={() => handleSort("school_name")}
                          disabled={actionLock}
                          style={{ color: "var(--text-primary)" }}
                        >
                          School
                          <i
                            className={`ms-1 ${getSortIcon("school_name")}`}
                            style={{ color: "var(--text-primary)" }}
                          ></i>
                        </button>
                      </th>
                      <th
                        className="small fw-semibold"
                        style={{ width: "10%", color: "var(--text-primary)" }}
                      >
                        Source
                      </th>
                      <th
                        className="small fw-semibold"
                        style={{ width: "20%", color: "var(--text-primary)" }}
                      >
                        <button
                          className="btn btn-link p-0 border-0 text-decoration-none fw-semibold text-start"
                          onClick={() => handleSort("name")}
                          disabled={actionLock}
                          style={{ color: "var(--text-primary)" }}
                        >
                          Item Name
                          <i
                            className={`ms-1 ${getSortIcon("name")}`}
                            style={{ color: "var(--text-primary)" }}
                          ></i>
                        </button>
                      </th>
                      <th
                        className="small fw-semibold"
                        style={{ width: "12%", color: "var(--text-primary)" }}
                      >
                        Category
                      </th>
                      <th
                        className="small fw-semibold"
                        style={{ width: "12%", color: "var(--text-primary)" }}
                      >
                        Serial Number
                      </th>
                      <th
                        className="text-center small fw-semibold"
                        style={{ width: "8%", color: "var(--text-primary)" }}
                      >
                        Quantity
                      </th>
                      <th
                        className="text-center small fw-semibold"
                        style={{ width: "10%", color: "var(--text-primary)" }}
                      >
                        Status
                      </th>
                      <th
                        className="small fw-semibold"
                        style={{ width: "12%", color: "var(--text-primary)" }}
                      >
                        Assigned To
                      </th>
                      <th
                        className="text-end small fw-semibold"
                        style={{ width: "10%", color: "var(--text-primary)" }}
                      >
                        Value
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentItems.map((item, index) => {
                      const itemName =
                        item.name || item.description || "Inventory Item";
                      const status =
                        item.status || item.condition_status || "N/A";

                      return (
                        <tr
                          key={item.id}
                          className="align-middle"
                          style={{ height: "70px" }}
                        >
                          <td
                            className="text-center fw-bold"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {startIndex + index + 1}
                          </td>
                          <td style={{ maxWidth: "150px", overflow: "hidden" }}>
                            <div
                              className="fw-semibold small"
                              style={{
                                color: "var(--text-primary)",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                              title={item.school_name || "Unknown School"}
                            >
                              {item.school_name || "Unknown School"}
                            </div>
                          </td>
                          <td>
                            <span
                              className={`badge ${
                                item.type === "school"
                                  ? "bg-primary"
                                  : "bg-info"
                              }`}
                            >
                              {item.source}
                            </span>
                          </td>
                          <td style={{ maxWidth: "250px", overflow: "hidden" }}>
                            <div
                              className="fw-semibold"
                              style={{
                                color: "var(--text-primary)",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                              title={itemName}
                            >
                              {itemName}
                            </div>
                            {(item.brand || item.model) && (
                              <div
                                className="small text-muted"
                                style={{
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {[item.brand, item.model]
                                  .filter(Boolean)
                                  .join(" ")}
                              </div>
                            )}
                          </td>
                          <td style={{ maxWidth: "150px", overflow: "hidden" }}>
                            <div
                              style={{
                                color: "var(--text-primary)",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                              title={item.category}
                            >
                              {item.category || "N/A"}
                            </div>
                          </td>
                          <td style={{ maxWidth: "150px", overflow: "hidden" }}>
                            <div
                              className="text-muted small"
                              style={{
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                              title={item.serial_number}
                            >
                              {item.serial_number || "N/A"}
                            </div>
                          </td>
                          <td className="text-center">
                            <div style={{ color: "var(--text-primary)" }}>
                              {item.quantity || 1}
                            </div>
                          </td>
                          <td className="text-center">
                            <span
                              className={`badge ${
                                status === "SERVICEABLE" || status === "Working"
                                  ? "bg-success"
                                  : status === "UNSERVICEABLE" ||
                                    status === "Unrepairable"
                                  ? "bg-danger"
                                  : status === "NEEDS REPAIR" ||
                                    status === "For Repair" ||
                                    status === "For Part Replacement"
                                  ? "bg-warning"
                                  : status === "MISSING/LOST" ||
                                    status === "Lost"
                                  ? "bg-secondary"
                                  : "bg-secondary"
                              }`}
                            >
                              {status}
                            </span>
                          </td>
                          <td style={{ maxWidth: "150px", overflow: "hidden" }}>
                            <div
                              className="small"
                              style={{
                                color: item.personnel
                                  ? "var(--text-primary)"
                                  : "var(--text-muted)",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                              title={item.personnel?.full_name || "Unassigned"}
                            >
                              {item.personnel?.full_name || (
                                <span className="text-muted">Unassigned</span>
                              )}
                            </div>
                          </td>
                          <td className="text-end">
                            <div
                              className="fw-semibold"
                              style={{ color: "var(--text-primary)" }}
                            >
                              {formatCurrency(
                                item.total_value || item.unit_value || 0
                              )}
                            </div>
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
                          {Math.min(
                            startIndex + itemsPerPage,
                            filteredItems.length
                          )}
                        </span>{" "}
                        of{" "}
                        <span
                          className="fw-semibold"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {filteredItems.length}
                        </span>{" "}
                        items
                      </small>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                      <button
                        className="btn btn-sm"
                        onClick={() =>
                          setCurrentPage((prev) => Math.max(prev - 1, 1))
                        }
                        disabled={currentPage === 1 || actionLock}
                        style={{
                          transition: "all 0.2s ease-in-out",
                          border: "2px solid var(--primary-color)",
                          color: "var(--primary-color)",
                          backgroundColor: "transparent",
                        }}
                        onMouseEnter={(e) => {
                          if (!e.currentTarget.disabled) {
                            e.currentTarget.style.transform =
                              "translateY(-1px)";
                            e.currentTarget.style.boxShadow =
                              "0 2px 4px rgba(0,0,0,0.1)";
                            e.currentTarget.style.backgroundColor =
                              "var(--primary-color)";
                            e.currentTarget.style.color = "white";
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = "translateY(0)";
                          e.currentTarget.style.boxShadow = "none";
                          e.currentTarget.style.backgroundColor = "transparent";
                          e.currentTarget.style.color = "var(--primary-color)";
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

                          return pages.map((page, idx) => (
                            <button
                              key={idx}
                              className="btn btn-sm"
                              onClick={() =>
                                page !== "..." && setCurrentPage(page)
                              }
                              disabled={page === "..." || actionLock}
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
                                minWidth: 40,
                              }}
                              onMouseEnter={(e) => {
                                if (
                                  !e.currentTarget.disabled &&
                                  currentPage !== page
                                ) {
                                  e.currentTarget.style.transform =
                                    "translateY(-1px)";
                                  e.currentTarget.style.boxShadow =
                                    "0 2px 4px rgba(0,0,0,0.1)";
                                  e.currentTarget.style.backgroundColor =
                                    "var(--primary-color)";
                                  e.currentTarget.style.color = "white";
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (
                                  !e.currentTarget.disabled &&
                                  currentPage !== page
                                ) {
                                  e.currentTarget.style.transform =
                                    "translateY(0)";
                                  e.currentTarget.style.boxShadow = "none";
                                  e.currentTarget.style.backgroundColor =
                                    "transparent";
                                  e.currentTarget.style.color =
                                    "var(--text-primary)";
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
                        disabled={currentPage === totalPages || actionLock}
                        style={{
                          transition: "all 0.2s ease-in-out",
                          border: "2px solid var(--primary-color)",
                          color: "var(--primary-color)",
                          backgroundColor: "transparent",
                        }}
                        onMouseEnter={(e) => {
                          if (!e.currentTarget.disabled) {
                            e.currentTarget.style.transform =
                              "translateY(-1px)";
                            e.currentTarget.style.boxShadow =
                              "0 2px 4px rgba(0,0,0,0.1)";
                            e.currentTarget.style.backgroundColor =
                              "var(--primary-color)";
                            e.currentTarget.style.color = "white";
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = "translateY(0)";
                          e.currentTarget.style.boxShadow = "none";
                          e.currentTarget.style.backgroundColor = "transparent";
                          e.currentTarget.style.color = "var(--primary-color)";
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
    </div>
  );
};

export default InventoryList;
