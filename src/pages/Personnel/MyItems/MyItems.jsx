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
import ItemDetailsModal from "./ItemDetailsModal";

const formatDateTime = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }
  return date.toLocaleString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

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

const TableRowSkeleton = () => (
  <tr className="align-middle" style={{ height: "70px" }}>
    <td className="text-center">
      <div className="placeholder-wave">
        <span className="placeholder col-4" style={{ height: 16 }}></span>
      </div>
    </td>
    {[...Array(6)].map((_, idx) => (
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
      No Assigned Items
    </h5>
    <p className="mb-3 small" style={{ color: "var(--text-muted)" }}>
      You don't have any items assigned to you yet. Contact your Property
      Custodian for assignments.
    </p>
  </div>
);

const MyItems = () => {
  const { token, user } = useAuth();
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLock, setActionLock] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all"); // "all", "school", "dcp"
  const [statusFilter, setStatusFilter] = useState("all");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState("created_at");
  const [sortDirection, setSortDirection] = useState("desc");
  const [exportLoading, setExportLoading] = useState(null);

  const apiBaseRef = useRef(
    (import.meta.env.VITE_LARAVEL_API || "http://localhost:8000/api").replace(
      /\/$/,
      ""
    )
  );

  const fetchMyItems = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const baseUrl = apiBaseRef.current;

      // First, get the current personnel/teacher ID
      const personnelResponse = await fetch(`${baseUrl}/teacher/personnel/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      let personnelId = null;
      if (personnelResponse.ok) {
        const personnelData = await personnelResponse.json();
        const personnel = personnelData.personnel || personnelData;
        personnelId = personnel?.id;
      }

      if (!personnelId) {
        console.error("Could not get personnel ID");
        setItems([]);
        setLoading(false);
        return;
      }

      // Fetch all School Inventory items and filter by personnel_id
      // Following the exact same approach as PersonnelDetailsModal.jsx
      const schoolResponse = await fetch(
        `${baseUrl}/property-custodian/inventory?per_page=1000`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      // Fetch all DCP Inventory items and filter by personnel_id
      const dcpResponse = await fetch(
        `${baseUrl}/property-custodian/dcp-inventory?personnel_id=${personnelId}&per_page=1000`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      // Process School Inventory - filter items assigned to this personnel
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
        // Filter by personnel_id - same as PersonnelDetailsModal
        const assignedSchoolItems = allSchoolItems.filter(
          (item) => item.personnel_id === personnelId
        );
        schoolItems = assignedSchoolItems.map((item) => ({
          ...item,
          type: "school",
          source: "School Inventory",
          assigned_at: item.assigned_at || item.created_at,
        }));
      } else {
        console.log("Could not fetch School Inventory items");
      }

      // Process DCP Inventory - filter items assigned to this personnel
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
        // Filter by personnel_id - same as PersonnelDetailsModal
        const assignedDcpItems = allDcpItems.filter(
          (item) => item.personnel_id === personnelId
        );
        // Map DCP items - DCP uses 'description' for name and 'manufacturer' for brand
        dcpItems = assignedDcpItems.map((item) => ({
          ...item,
          // Map DCP fields to match School Inventory structure
          name: item.description || item.name, // DCP uses 'description' as the item name
          brand: item.manufacturer || item.brand, // DCP uses 'manufacturer' as brand
          category: item.category || "Uncategorized",
          serial_number: item.serial_number || "N/A",
          type: "dcp",
          source: "DCP Package Inventory",
          assigned_at: item.assigned_at || item.created_at,
        }));
      } else {
        console.log("Could not fetch DCP Inventory items");
      }

      // Combine all items - same structure as PersonnelDetailsModal
      const allItems = [...schoolItems, ...dcpItems];
      setItems(allItems);
    } catch (error) {
      console.error("Error fetching assigned items:", error);
      showAlert.error(
        "Error",
        error.message || "Unable to load your assigned items"
      );
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchMyItems();
    }
  }, [token, fetchMyItems]);

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
          item.property_no,
          item.brand,
          item.model,
        ];
        return fields.some(
          (field) => field && String(field).toLowerCase().includes(term)
        );
      });
    }

    // Source filter
    if (sourceFilter !== "all") {
      list = list.filter((item) => item.type === sourceFilter);
    }

    // Status filter
    if (statusFilter !== "all") {
      list = list.filter((item) => {
        const status = item.status || item.condition_status || "";
        if (statusFilter === "available" || statusFilter === "Working") {
          return status === "available" || status === "Working";
        }
        if (statusFilter === "assigned") {
          return status === "assigned";
        }
        if (statusFilter === "maintenance") {
          return (
            status === "maintenance" ||
            status === "For Repair" ||
            status === "For Part Replacement"
          );
        }
        return status === statusFilter;
      });
    }

    // Sorting
    list.sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      if (sortField === "created_at" || sortField === "assigned_at") {
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
  }, [items, searchTerm, sourceFilter, statusFilter, sortField, sortDirection]);

  useEffect(() => {
    filterAndSortItems();
  }, [filterAndSortItems]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sourceFilter, statusFilter, itemsPerPage]);

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
    await fetchMyItems();
    showToast.info("Items refreshed successfully");
  }, [fetchMyItems]);

  const formatCurrency = (value = 0) =>
    `₱${Number(value || 0).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const exportMyItemsToPdf = async () => {
    if (!filteredItems.length) {
      showToast.warning("No items to export.");
      return;
    }

    setExportLoading("pdf");
    try {
      showAlert.loading(
        "Generating PDF",
        "Please wait while we generate your assigned items report..."
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
      doc.text("MY ASSIGNED ITEMS REPORT", 148, 15, { align: "center" });

      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text("DBEST Inventory System", 148, 22, { align: "center" });
      doc.text(`Generated on: ${generatedDate}`, 14, 30);

      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text("SUMMARY", 14, 40);

      const summaryData = [
        ["Total Items", stats.totalItems.toString()],
        ["School Inventory", stats.schoolItems.toString()],
        ["DCP Packages", stats.dcpItems.toString()],
        ["Available Items", stats.availableItems.toString()],
      ];

      autoTable(doc, {
        startY: 44,
        head: [["Metric", "Value"]],
        body: summaryData,
        theme: "grid",
        headStyles: {
          fillColor: [14, 37, 75],
          textColor: [255, 255, 255],
          fontStyle: "bold",
        },
        styles: { fontSize: 9 },
      });

      const tableStartY = doc.lastAutoTable.finalY + 10;

      const body = filteredItems.map((item) => [
        item.source || "-",
        item.name || item.description || "-",
        item.category || "-",
        item.serial_number || "-",
        `${item.quantity || 1} ${item.unit_of_measure || "pcs"}`,
        item.status || item.condition_status || "-",
        item.assigned_at
          ? new Date(item.assigned_at).toLocaleDateString("en-PH")
          : "-",
      ]);

      autoTable(doc, {
        startY: tableStartY,
        head: [
          [
            "Source",
            "Item Name",
            "Category",
            "Serial Number",
            "Quantity",
            "Status",
            "Assigned Date",
          ],
        ],
        body,
        theme: "grid",
        headStyles: {
          fillColor: [14, 37, 75],
          textColor: [255, 255, 255],
          fontStyle: "bold",
        },
        styles: { fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 30 },
          1: { cellWidth: 50 },
          2: { cellWidth: 35 },
          3: { cellWidth: 35 },
          4: { cellWidth: 25 },
          5: { cellWidth: 25 },
          6: { cellWidth: 30 },
        },
      });

      showAlert.close();
      doc.save("my-assigned-items-report.pdf");
      showToast.success("Assigned items exported as PDF");
    } catch (error) {
      console.error("PDF export error:", error);
      showAlert.close();
      showToast.error("Failed to export items as PDF");
    } finally {
      setExportLoading(null);
    }
  };

  const exportMyItemsToCsv = async () => {
    if (!filteredItems.length) {
      showToast.warning("No items to export.");
      return;
    }

    setExportLoading("csv");
    try {
      showAlert.loading(
        "Generating CSV",
        "Please wait while we generate your assigned items report..."
      );

      const header = [
        "Source",
        "Item Name",
        "Category",
        "Serial Number",
        "Quantity",
        "Unit of Measure",
        "Status",
        "Brand",
        "Model",
        "Assigned Date",
      ];

      const rows = filteredItems.map((item) => [
        item.source || "",
        item.name || item.description || "",
        item.category || "",
        item.serial_number || "",
        item.quantity ?? 1,
        item.unit_of_measure || "pcs",
        item.status || item.condition_status || "",
        item.brand || item.manufacturer || "",
        item.model || "",
        item.assigned_at
          ? new Date(item.assigned_at).toLocaleDateString("en-PH")
          : "",
      ]);

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
      a.download = "my-assigned-items-report.csv";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showAlert.close();
      showToast.success("Assigned items exported as Excel/CSV");
    } catch (error) {
      console.error("CSV export error:", error);
      showAlert.close();
      showToast.error("Failed to export items as Excel/CSV");
    } finally {
      setExportLoading(null);
    }
  };

  // Calculate statistics
  const stats = useMemo(() => {
    const totalItems = items.length;
    const schoolItems = items.filter((item) => item.type === "school").length;
    const dcpItems = items.filter((item) => item.type === "dcp").length;
    const availableItems = items.filter(
      (item) =>
        (item.status === "available" || item.condition_status === "Working") &&
        item.type === "school"
    ).length;

    return {
      totalItems,
      schoolItems,
      dcpItems,
      availableItems,
    };
  }, [items]);

  return (
    <div className="container-fluid px-3 py-2 my-items-container fadeIn">
      {/* Page Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-3">
        <div className="flex-grow-1 mb-2 mb-md-0">
          <h1
            className="h4 mb-1 fw-bold"
            style={{ color: "var(--text-primary)" }}
          >
            My Assigned Items
          </h1>
          <p className="mb-0 small" style={{ color: "var(--text-muted)" }}>
            View and manage items assigned to you from School Inventory and DCP
            Packages
          </p>
        </div>
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <button
            className="btn btn-sm btn-danger text-white"
            onClick={exportMyItemsToPdf}
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
            onClick={exportMyItemsToCsv}
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
                      School Inventory
                    </div>
                    <div
                      className="h4 mb-0 fw-bold"
                      style={{ color: "var(--info-color)" }}
                    >
                      {stats.schoolItems}
                    </div>
                  </div>
                  <div className="col-auto">
                    <i
                      className="fas fa-school fa-2x"
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
                      DCP Packages
                    </div>
                    <div
                      className="h4 mb-0 fw-bold"
                      style={{ color: "var(--success-color)" }}
                    >
                      {stats.dcpItems}
                    </div>
                  </div>
                  <div className="col-auto">
                    <i
                      className="fas fa-laptop fa-2x"
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
                      Available
                    </div>
                    <div
                      className="h4 mb-0 fw-bold"
                      style={{ color: "var(--warning-color)" }}
                    >
                      {stats.availableItems}
                    </div>
                  </div>
                  <div className="col-auto">
                    <i
                      className="fas fa-check-circle fa-2x"
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
            <div className="col-12 col-lg-6 d-flex flex-column">
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
                  placeholder="Search by name, category, serial number, or description"
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
            <div className="col-12 col-sm-6 col-md-3 col-lg-3 d-flex flex-column">
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
            <div className="col-12 col-sm-6 col-md-3 col-lg-3 d-flex flex-column">
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
              Assigned Items
              {!loading && (
                <small className="opacity-75 ms-2 text-white">
                  ({filteredItems.length} found
                  {searchTerm || sourceFilter !== "all"
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
                      "Source",
                      "Item Name",
                      "Category",
                      "Serial Number",
                      "Quantity",
                      "Status",
                      "Assigned Date",
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
                  Fetching your assigned items...
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
                        className="text-center small fw-semibold"
                        style={{ width: "10%", color: "var(--text-primary)" }}
                      >
                        Actions
                      </th>
                      <th
                        className="small fw-semibold"
                        style={{ width: "12%", color: "var(--text-primary)" }}
                      >
                        <button
                          className="btn btn-link p-0 border-0 text-decoration-none fw-semibold text-start"
                          onClick={() => handleSort("type")}
                          disabled={actionLock}
                          style={{ color: "var(--text-primary)" }}
                        >
                          Source
                          <i
                            className={`ms-1 ${getSortIcon("type")}`}
                            style={{ color: "var(--text-primary)" }}
                          ></i>
                        </button>
                      </th>
                      <th
                        className="small fw-semibold"
                        style={{ width: "25%", color: "var(--text-primary)" }}
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
                        style={{ width: "15%", color: "var(--text-primary)" }}
                      >
                        Category
                      </th>
                      <th
                        className="small fw-semibold"
                        style={{ width: "15%", color: "var(--text-primary)" }}
                      >
                        Serial Number
                      </th>
                      <th
                        className="text-center small fw-semibold"
                        style={{ width: "10%", color: "var(--text-primary)" }}
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
                        style={{ width: "8%", color: "var(--text-primary)" }}
                      >
                        <button
                          className="btn btn-link p-0 border-0 text-decoration-none fw-semibold text-start"
                          onClick={() => handleSort("assigned_at")}
                          disabled={actionLock}
                          style={{ color: "var(--text-primary)" }}
                        >
                          Assigned
                          <i
                            className={`ms-1 ${getSortIcon("assigned_at")}`}
                            style={{ color: "var(--text-primary)" }}
                          ></i>
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentItems.map((item, index) => {
                      const itemName =
                        item.name || item.description || "Inventory Item";
                      const itemCategory = item.category || "Uncategorized";
                      const serialNumber = item.serial_number || "N/A";
                      const quantity = item.quantity || 1;
                      const status =
                        item.status || item.condition_status || "N/A";
                      const assignedDate = item.assigned_at || item.created_at;

                      return (
                        <tr
                          key={`${item.type}-${item.id}`}
                          className="align-middle"
                          style={{ height: "70px" }}
                        >
                          <td
                            className="text-center fw-bold"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {startIndex + index + 1}
                          </td>
                          <td className="text-center" style={{ minWidth: 100 }}>
                            <div className="d-flex justify-content-center gap-2">
                              <button
                                className="btn btn-info btn-sm text-white"
                                onClick={() => {
                                  setSelectedItem(item);
                                  setShowDetailsModal(true);
                                }}
                                disabled={actionLock}
                                title="View Details"
                                style={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: 6,
                                  padding: 0,
                                  transition: "all 0.2s ease-in-out",
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
                                <i
                                  className="fas fa-eye"
                                  style={{ fontSize: "0.875rem" }}
                                ></i>
                              </button>
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
                          <td style={{ maxWidth: "300px", overflow: "hidden" }}>
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
                          <td style={{ maxWidth: "180px", overflow: "hidden" }}>
                            <div
                              style={{
                                color: "var(--text-primary)",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                              title={itemCategory}
                            >
                              {itemCategory}
                            </div>
                          </td>
                          <td style={{ maxWidth: "180px", overflow: "hidden" }}>
                            <div
                              className="text-muted small"
                              style={{
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                              title={serialNumber}
                            >
                              {serialNumber}
                            </div>
                          </td>
                          <td className="text-center">
                            <div style={{ color: "var(--text-primary)" }}>
                              {quantity} {item.unit_of_measure || "pcs"}
                            </div>
                          </td>
                          <td className="text-center">
                            <span
                              className={`badge ${
                                status === "available" || status === "Working"
                                  ? "bg-success"
                                  : status === "assigned"
                                  ? "bg-warning"
                                  : status === "For Repair" ||
                                    status === "For Part Replacement"
                                  ? "bg-warning"
                                  : status === "maintenance"
                                  ? "bg-warning"
                                  : status === "disposed" ||
                                    status === "Unrepairable"
                                  ? "bg-danger"
                                  : status === "Lost"
                                  ? "bg-danger"
                                  : "bg-secondary"
                              }`}
                            >
                              {status}
                            </span>
                          </td>
                          <td>
                            <div
                              className="text-muted small"
                              style={{ color: "var(--text-muted)" }}
                            >
                              {formatDate(assignedDate)}
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

      {/* Item Details Modal */}
      {showDetailsModal && (
        <ItemDetailsModal
          item={selectedItem}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedItem(null);
          }}
        />
      )}
    </div>
  );
};

export default MyItems;
