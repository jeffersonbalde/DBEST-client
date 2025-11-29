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

const getAssetImageUrl = (item) => {
  if (!item?.image_path) return null;
  const baseUrl = import.meta.env.VITE_LARAVEL_API || "http://localhost:8000/api";
  let cleanFilename = item.image_path;
  if (cleanFilename.includes("inventory-assets/")) {
    cleanFilename = cleanFilename.replace("inventory-assets/", "");
  }
  cleanFilename = cleanFilename.split("/").pop();
  return `${baseUrl.replace(/\/api$/, "")}/storage/inventory-assets/${cleanFilename}`;
};

const InventoryReports = () => {
  const { token } = useAuth();

  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [exportLoading, setExportLoading] = useState(null);

  const apiBaseRef = useRef(
    (import.meta.env.VITE_LARAVEL_API || "http://localhost:8000/api").replace(
      /\/$/,
      ""
    )
  );

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${apiBaseRef.current}/property-custodian/inventory?per_page=1000`,
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
      let list = [];
      if (Array.isArray(data?.data)) {
        list = data.data;
      } else if (Array.isArray(data)) {
        list = data;
      } else if (Array.isArray(data?.items)) {
        list = data.items;
      }

      setItems(list);
    } catch (error) {
      console.error("Error loading inventory:", error);
      showAlert.error(
        "Inventory Error",
        error.message || "Unable to load school inventory"
      );
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const categoryOptions = useMemo(() => {
    const set = new Set();
    items.forEach((item) => {
      if (item.category) {
        set.add(item.category);
      }
    });
    return Array.from(set).sort();
  }, [items]);

  const filterItems = useCallback(() => {
    let filtered = [...items];

    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase();
      filtered = filtered.filter((item) => {
        const fields = [
          item.name,
          item.category,
          item.brand,
          item.model,
          item.serial_number,
          item.location,
          item.supplier,
          item.notes,
        ];
        return fields.some(
          (field) => field && String(field).toLowerCase().includes(query)
        );
      });
    }

    if (selectedCategory !== "all") {
      filtered = filtered.filter((item) => item.category === selectedCategory);
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((item) => item.status === statusFilter);
    }

    setFilteredItems(filtered);
    setCurrentPage(1);
  }, [items, searchTerm, selectedCategory, statusFilter]);

  useEffect(() => {
    filterItems();
  }, [filterItems]);

  const totalPages = Math.max(
    1,
    Math.ceil((filteredItems.length || 1) / itemsPerPage)
  );
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = filteredItems.slice(startIndex, endIndex);

  const summary = useMemo(() => {
    const totals = filteredItems.reduce(
      (acc, item) => {
        acc.totalQuantity += Number(item.quantity || 0);
        acc.availableQuantity += Number(item.available_quantity || 0);
        acc.totalValue +=
          Number(item.quantity || 0) * Number(item.unit_price || 0);
        return acc;
      },
      { totalQuantity: 0, availableQuantity: 0, totalValue: 0 }
    );

    return {
      totalItems: filteredItems.length,
      totalQuantity: totals.totalQuantity,
      availableQuantity: totals.availableQuantity,
      totalValue: totals.totalValue,
    };
  }, [filteredItems]);

  const formatCurrency = (value = 0) =>
    `₱${Number(value || 0).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const TableRowSkeleton = () => (
    <tr className="align-middle" style={{ height: "70px" }}>
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((col) => (
        <td key={col}>
          <div className="placeholder-wave mb-1">
            <span
              className={`placeholder ${col === 0 ? "col-4" : "col-8"}`}
              style={{ height: 16 }}
            ></span>
          </div>
          <div className="placeholder-wave">
            <span
              className={`placeholder ${col >= 5 ? "col-4" : "col-6"}`}
              style={{ height: 14 }}
            ></span>
          </div>
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
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: "50% !important",
                }}
              ></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const exportInventoryToPdf = async () => {
    if (!filteredItems.length) {
      showToast.warning("No inventory data to export.");
      return;
    }

    setExportLoading("pdf");
    try {
      showAlert.loading(
        "Generating PDF",
        "Please wait while we generate your inventory report..."
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

      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text("SUMMARY", 14, 40);

      const summaryData = [
        ["Total Items (filtered)", summary.totalItems.toString()],
        ["Total Quantity", summary.totalQuantity.toString()],
        ["Available Quantity", summary.availableQuantity.toString()],
        ["Estimated Total Value", formatCurrency(summary.totalValue)],
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

      // Prepare body data
      const body = filteredItems.map((item) => [
        item.name || "-",
        item.category || "-",
        item.status || "SERVICEABLE",
        Number(item.quantity || 0),
        Number(item.available_quantity || 0),
        formatCurrency(Number(item.quantity || 0) * Number(item.unit_price || 0)),
        item.location || "-",
        `${item.brand || ""} ${item.model || ""}`.trim() || "-",
        (item.image_url || getAssetImageUrl(item)) ? "Yes" : "No",
      ]);

      autoTable(doc, {
        startY: tableStartY,
        head: [
          [
            "Name",
            "Category",
            "Status",
            "Qty",
            "Available",
            "Amount",
            "Location",
            "Brand / Model",
            "Image",
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
          0: { cellWidth: 50 },
          1: { cellWidth: 30 },
          2: { cellWidth: 25 },
          3: { cellWidth: 15, halign: "right" },
          4: { cellWidth: 20, halign: "right" },
          5: { cellWidth: 25, halign: "right" },
          6: { cellWidth: 35 },
          7: { cellWidth: 45 },
          8: { cellWidth: 20 },
        },
      });

      // Add images section after table (if space allows)
      let imageY = doc.lastAutoTable.finalY + 10;
      const itemsWithImages = filteredItems.filter(
        (item) => item.image_url || getAssetImageUrl(item)
      );
      
      if (itemsWithImages.length > 0 && imageY < 180) {
        doc.setFontSize(10);
        doc.text("Item Images", 14, imageY);
        imageY += 5;
        
        let xPos = 14;
        let yPos = imageY;
        const imgSize = 30;
        const spacing = 5;
        const maxImagesPerPage = 6;
        
        // Load and add images sequentially to avoid positioning issues
        for (let i = 0; i < Math.min(itemsWithImages.length, maxImagesPerPage); i++) {
          const item = itemsWithImages[i];
          const imgUrl = item.image_url || getAssetImageUrl(item);
          
          if (imgUrl && yPos + imgSize < 280) {
            try {
              // Create image element and load it
              const img = new Image();
              img.crossOrigin = "anonymous";
              
              await new Promise((resolve, reject) => {
                img.onload = () => {
                  try {
                    doc.addImage(img, "JPEG", xPos, yPos, imgSize, imgSize);
                    doc.setFontSize(6);
                    const itemName = item.name?.substring(0, 15) || "Item";
                    doc.text(itemName, xPos, yPos + imgSize + 3);
                    
                    xPos += imgSize + spacing;
                    if (xPos + imgSize > 280) {
                      xPos = 14;
                      yPos += imgSize + 15;
                    }
                    resolve();
                  } catch (e) {
                    console.warn("Could not add image to PDF:", e);
                    resolve(); // Continue even if image fails
                  }
                };
                img.onerror = () => {
                  resolve(); // Continue even if image fails to load
                };
                img.src = imgUrl;
                
                // Timeout after 3 seconds
                setTimeout(() => resolve(), 3000);
              });
            } catch (e) {
              console.warn("Error processing image:", e);
            }
          }
        }
      }

      showAlert.close();
      doc.save("inventory-report.pdf");
      showToast.success("Inventory exported as PDF");
    } catch (error) {
      console.error("Inventory PDF export error:", error);
      showAlert.close();
      showToast.error("Failed to export inventory as PDF");
    } finally {
      setExportLoading(null);
    }
  };

  const exportInventoryToCsv = async () => {
    if (!filteredItems.length) {
      showToast.warning("No inventory data to export.");
      return;
    }

    setExportLoading("csv");
    try {
      showAlert.loading(
        "Generating CSV",
        "Please wait while we generate your inventory report..."
      );

      const header = [
        "Name",
        "Category",
        "Status",
        "Quantity",
        "Available Quantity",
        "Amount",
        "Location",
        "Brand",
        "Model",
        "Serial Number",
        "Supplier",
        "Image URL",
      ];

      const rows = filteredItems.map((item) => [
        item.name || "",
        item.category || "",
        item.status || "SERVICEABLE",
        item.quantity ?? 0,
        item.available_quantity ?? 0,
        formatCurrency(Number(item.quantity || 0) * Number(item.unit_price || 0)),
        item.location || "",
        item.brand || "",
        item.model || "",
        item.serial_number || "",
        item.supplier || "",
        item.image_url || getAssetImageUrl(item) || "",
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
      a.download = "inventory-report.csv";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showAlert.close();
      showToast.success("Inventory exported as Excel/CSV");
    } catch (error) {
      console.error("Inventory CSV export error:", error);
      showAlert.close();
      showToast.error("Failed to export inventory as Excel/CSV");
    } finally {
      setExportLoading(null);
    }
  };

  return (
    <div className="container-fluid px-3 py-2 inventory-management-container fadeIn">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-3">
        <div className="flex-grow-1 mb-2 mb-md-0">
          <h1
            className="h4 mb-1 fw-bold"
            style={{ color: "var(--text-primary)" }}
          >
            Inventory Reports
          </h1>
          <p className="mb-0 small" style={{ color: "var(--text-muted)" }}>
            View all inventory items and export them to PDF or Excel.
          </p>
        </div>
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <button
            className="btn btn-sm btn-danger text-white"
            onClick={exportInventoryToPdf}
            disabled={loading || exportLoading === "pdf"}
            style={{ width: "140px" }}
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
            onClick={exportInventoryToCsv}
            disabled={loading || exportLoading === "csv"}
            style={{ width: "150px" }}
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
            onClick={fetchInventory}
            disabled={loading}
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
                      Filtered Items
                    </div>
                    <div
                      className="h4 mb-0 fw-bold"
                      style={{ color: "var(--primary-color)" }}
                    >
                      {summary.totalItems}
                    </div>
                  </div>
                  <div className="col-auto">
                    <i
                      className="fas fa-boxes fa-2x"
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
                      Total Quantity
                    </div>
                    <div
                      className="h4 mb-0 fw-bold"
                      style={{ color: "var(--accent-color)" }}
                    >
                      {summary.totalQuantity}
                    </div>
                  </div>
                  <div className="col-auto">
                    <i
                      className="fas fa-layer-group fa-2x"
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
                      Available Units
                    </div>
                    <div
                      className="h4 mb-0 fw-bold"
                      style={{ color: "var(--primary-dark)" }}
                    >
                      {summary.availableQuantity}
                    </div>
                  </div>
                  <div className="col-auto">
                    <i
                      className="fas fa-check-circle fa-2x"
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
                      style={{ color: "var(--success-color)" }}
                    >
                      Estimated Value
                    </div>
                    <div
                      className="h4 mb-0 fw-bold"
                      style={{ color: "var(--success-color)" }}
                    >
                      {formatCurrency(summary.totalValue)}
                    </div>
                  </div>
                  <div className="col-auto">
                    <i
                      className="fas fa-peso-sign fa-2x"
                      style={{ color: "var(--success-light)", opacity: 0.7 }}
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
            <div className="col-md-5">
              <label
                className="form-label small fw-semibold mb-1"
                style={{ color: "var(--text-muted)" }}
              >
                Search Inventory
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
                  placeholder="Search by name, category, serial number, supplier..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  disabled={loading}
                  style={{
                    backgroundColor: "var(--input-bg)",
                    borderColor: "var(--input-border)",
                    color: "var(--input-text)",
                  }}
                />
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
                disabled={loading}
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
            <div className="col-md-2">
              <label
                className="form-label small fw-semibold mb-1"
                style={{ color: "var(--text-muted)" }}
              >
                Category
              </label>
              <select
                className="form-select form-select-sm"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                disabled={loading}
                style={{
                  backgroundColor: "var(--input-bg)",
                  borderColor: "var(--input-border)",
                  color: "var(--input-text)",
                }}
              >
                <option value="all">All Categories</option>
                {categoryOptions.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
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
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                disabled={loading}
                style={{
                  backgroundColor: "var(--input-bg)",
                  borderColor: "var(--input-border)",
                  color: "var(--input-text)",
                }}
              >
                {[10, 20, 50, 100].map((size) => (
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
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="card-title mb-0 fw-semibold text-white">
              <i className="fas fa-clipboard-list me-2"></i>
              Inventory Items
              {!loading && (
                <small className="opacity-75 ms-2 text-white">
                  ({filteredItems.length} items)
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
                    <th className="small fw-semibold" style={{ width: "60px" }}>
                      #
                    </th>
                    <th className="small fw-semibold">Name</th>
                    <th className="small fw-semibold">Category</th>
                    <th className="small fw-semibold">Status</th>
                    <th className="small fw-semibold text-end">Qty</th>
                    <th className="small fw-semibold text-end">Available</th>
                    <th className="small fw-semibold text-end">Amount</th>
                    <th className="small fw-semibold">Location</th>
                    <th className="small fw-semibold">Brand / Model</th>
                    <th className="small fw-semibold">Image</th>
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
                <span
                  className="small"
                  style={{ color: "var(--text-muted)" }}
                >
                  Loading inventory items...
                </span>
              </div>
            </div>
          ) : currentItems.length === 0 ? (
            <div className="text-center py-5">
              <div className="mb-3">
                <i
                  className="fas fa-inbox fa-3x"
                  style={{ color: "var(--text-muted)", opacity: 0.5 }}
                ></i>
              </div>
              <h5 className="mb-2" style={{ color: "var(--text-muted)" }}>
                No Inventory Items Found
              </h5>
              <p className="mb-3 small" style={{ color: "var(--text-muted)" }}>
                Adjust your filters or add inventory items in the main Inventory
                page.
              </p>
            </div>
          ) : (
            <>
              <div className="table-responsive">
                <table className="table table-striped table-hover mb-0">
                  <thead style={{ backgroundColor: "var(--background-light)" }}>
                    <tr>
                      <th className="small fw-semibold" style={{ width: "60px" }}>
                        #
                      </th>
                      <th className="small fw-semibold">Name</th>
                      <th className="small fw-semibold">Category</th>
                      <th className="small fw-semibold">Status</th>
                      <th className="small fw-semibold text-end">Qty</th>
                      <th className="small fw-semibold text-end">Available</th>
                      <th className="small fw-semibold text-end">Amount</th>
                      <th className="small fw-semibold">Location</th>
                      <th className="small fw-semibold">Brand / Model</th>
                      <th className="small fw-semibold">Image</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentItems.map((item, idx) => (
                      <tr key={item.id} className="align-middle">
                        <td className="fw-semibold text-muted small">
                          {startIndex + idx + 1}
                        </td>
                        <td className="text-truncate" style={{ maxWidth: 200 }}>
                          {item.name || "Unnamed Item"}
                        </td>
                        <td className="text-truncate" style={{ maxWidth: 160 }}>
                          {item.category || "Uncategorized"}
                        </td>
                        <td>
                          <span
                            className={`badge ${
                              item.status === "SERVICEABLE"
                                ? "bg-success bg-opacity-10 text-success border border-success"
                                : item.status === "UNSERVICEABLE"
                                ? "bg-danger bg-opacity-10 text-danger border border-danger-subtle"
                                : item.status === "NEEDS REPAIR"
                                ? "bg-warning bg-opacity-10 text-warning border border-warning-subtle"
                                : item.status === "MISSING/LOST"
                                ? "bg-secondary bg-opacity-10 text-secondary border border-secondary-subtle"
                                : "bg-primary-subtle text-primary border border-primary-subtle"
                            }`}
                          >
                            {item.status || "SERVICEABLE"}
                          </span>
                        </td>
                        <td className="text-end">
                          {Number(item.quantity || 0).toLocaleString()}
                        </td>
                        <td className="text-end">
                          {Number(item.available_quantity || 0).toLocaleString()}
                        </td>
                        <td className="text-end">
                          <span className="fw-semibold" style={{ color: "var(--text-primary)" }}>
                            {formatCurrency(
                              Number(item.quantity || 0) * Number(item.unit_price || 0)
                            )}
                          </span>
                        </td>
                        <td className="text-truncate" style={{ maxWidth: 180 }}>
                          {item.location || "—"}
                        </td>
                        <td className="text-truncate" style={{ maxWidth: 220 }}>
                          {`${item.brand || ""} ${item.model || ""}`.trim() ||
                            "—"}
                        </td>
                        <td style={{ width: "80px" }}>
                          {item.image_url || item.image_path ? (
                            <img
                              src={item.image_url || getAssetImageUrl(item)}
                              alt={item.name}
                              style={{
                                width: "50px",
                                height: "50px",
                                objectFit: "cover",
                                borderRadius: "4px",
                                border: "1px solid #e1e6ef",
                              }}
                              onError={(e) => {
                                e.target.style.display = "none";
                              }}
                            />
                          ) : (
                            <span className="text-muted small">No image</span>
                          )}
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
                          {Math.min(endIndex, filteredItems.length)}
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
                        disabled={currentPage === 1}
                        style={{
                          transition: "all 0.2s ease-in-out",
                          border: "2px solid var(--primary-color)",
                          color: "var(--primary-color)",
                          backgroundColor: "transparent",
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
                            let end = Math.min(
                              totalPages - 1,
                              currentPage + 1
                            );

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
                              disabled={page === "..."}
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
                        disabled={currentPage === totalPages}
                        style={{
                          transition: "all 0.2s ease-in-out",
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
    </div>
  );
};

export default InventoryReports;


