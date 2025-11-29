import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { showAlert, showToast } from "../../../services/notificationService";
import Portal from "../../../components/Portal/Portal";
import ICSModal from "../../../components/ICSModal/ICSModal";

const API_BASE =
  import.meta.env.VITE_LARAVEL_API || "http://localhost:8000/api";

const CATEGORY_OPTIONS = [
  "Laptop",
  "Desktop",
  "Host Mini PC",
  "Host PC",
  "UPS",
  "AVR",
  "Printer",
  "Wireless Router",
  "Network Switch",
  "TV",
  "Monitor",
  "Multimedia Speaker",
  "Projector",
  "External Hard Drive",
  "2 in 1 Tablet PC",
  "Charging Cart",
  "Photovoltaic Modules",
  "Inverter",
  "Solar Battery",
  "Solar Power Accessories",
  "Lapel",
  "Networking Peripherals",
  "Desktop Virtualization Device",
  "Others",
];

const CONDITION_OPTIONS = [
  "Working",
  "For Repair",
  "For Part Replacement",
  "Unrepairable",
  "Lost",
];

const VALIDATION_OPTIONS = ["Unverified", "Verified"];

const DEFAULT_FORM = {
  dcp_package_id: "",
  batch_name: "",
  school_id: "",
  category: "",
  description: "",
  manufacturer: "",
  model: "",
  serial_number: "",
  unit_of_measure: "",
  unit_value: "",
  quantity: 1,
  property_no: "",
  personnel_id: "",
  condition_status: "Working",
  last_checked_at: "",
  validation_status: "Unverified",
  remarks: "",
};

const DcpInventory = () => {
  const { token } = useAuth();
  const [items, setItems] = useState([]);
  const [packages, setPackages] = useState([]);
  const [personnel, setPersonnel] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [actionLock, setActionLock] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [school, setSchool] = useState(null);
  const [showICSModal, setShowICSModal] = useState(false);
  const [icsItem, setIcsItem] = useState(null);
  const [icsPersonnel, setIcsPersonnel] = useState(null);

  const apiBaseRef = useRef(API_BASE.replace(/\/$/, ""));

  const headers = useMemo(
    () => ({
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    }),
    [token]
  );

  const fetchPackages = useCallback(async () => {
    const response = await fetch(
      `${apiBaseRef.current}/property-custodian/dcp-packages`,
      {
        headers,
      }
    );
    if (!response.ok) {
      throw new Error("Failed to load DCP packages");
    }
    const data = await response.json();
    return data.packages || data.data || [];
  }, [headers]);

  const fetchPersonnel = useCallback(async () => {
    const response = await fetch(
      `${apiBaseRef.current}/property-custodian/personnel?per_page=1000`,
      {
        headers,
      }
    );
    if (!response.ok) {
      throw new Error("Failed to load personnel list");
    }
    const data = await response.json();
    return Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
  }, [headers]);

  const fetchInventory = useCallback(async () => {
    const response = await fetch(
      `${apiBaseRef.current}/property-custodian/dcp-inventory`,
      {
        headers,
      }
    );
    if (!response.ok) {
      throw new Error("Failed to load DCP inventory");
    }
    const data = await response.json();
    return data.items || data.data || [];
  }, [headers]);

  const fetchSchool = useCallback(async () => {
    try {
      const response = await fetch(
        `${apiBaseRef.current}/property-custodian/school-profile`,
        {
          headers,
        }
      );
      if (response.ok) {
        const data = await response.json();
        setSchool(data.school || null);
      }
    } catch (error) {
      console.error("Error loading school:", error);
    }
  }, [headers]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [pkgList, personnelList, invList] = await Promise.all([
        fetchPackages(),
        fetchPersonnel(),
        fetchInventory(),
      ]);
      setPackages(pkgList);
      setPersonnel(personnelList);
      setItems(invList);
      fetchSchool();
    } catch (error) {
      console.error("DCP Inventory load error:", error);
      showAlert.error(
        "DCP Inventory",
        error.message || "Unable to load DCP inventory data."
      );
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [fetchPackages, fetchPersonnel, fetchInventory, fetchSchool]);

  useEffect(() => {
    if (!token) return;
    loadAll();
  }, [token, loadAll]);

  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return items;
    const term = searchTerm.toLowerCase();
    return items.filter((item) => {
      const fields = [
        item.batch_name,
        item.category,
        item.description,
        item.manufacturer,
        item.model,
        item.serial_number,
        item.property_no,
        item.personnel?.first_name,
        item.personnel?.last_name,
      ];
      return fields.some(
        (field) => field && String(field).toLowerCase().includes(term)
      );
    });
  }, [items, searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, itemsPerPage, filteredItems.length]);

  const totalPages = Math.max(
    1,
    Math.ceil((filteredItems.length || 1) / itemsPerPage)
  );
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = filteredItems.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  const isActionDisabled = (id = null) =>
    actionLock || (actionLoading && actionLoading !== id);

  const openCreateModal = () => {
    setEditingItem(null);
    setShowFormModal(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setShowFormModal(true);
  };

  const handleSaved = (saved, wasNewItem = false) => {
    setItems((prev) => {
      const exists = prev.some((it) => it.id === saved.id);
      if (exists) {
        return prev.map((it) => (it.id === saved.id ? saved : it));
      }
      return [saved, ...prev];
    });
    setShowFormModal(false);
    setEditingItem(null);
    
    // Show ICS modal if it's a new item and personnel was assigned
    if (wasNewItem && saved.personnel_id) {
      const assignedPersonnel = personnel.find(p => p.id === saved.personnel_id);
      // Convert DCP inventory item to ICS format
      const icsItemData = {
        id: saved.id,
        item_code: saved.property_no || `DCP-${saved.id}`,
        name: saved.description || saved.category,
        description: saved.description || `${saved.category} - ${saved.manufacturer || ''} ${saved.model || ''}`.trim(),
        quantity: saved.quantity || 1,
        unit_of_measure: saved.unit_of_measure || "pcs",
        unit_price: parseFloat(saved.unit_value || 0),
      };
      setIcsItem(icsItemData);
      setIcsPersonnel(assignedPersonnel || null);
      // Small delay to allow form modal to close first
      setTimeout(() => {
        setShowICSModal(true);
      }, 300);
    }
  };

  const handleGenerateICS = (item) => {
    // Find assigned personnel if any
    const assignedPersonnel = item.personnel_id 
      ? personnel.find(p => p.id === item.personnel_id)
      : null;
    
    // Convert DCP inventory item to ICS format
    const icsItemData = {
      id: item.id,
      item_code: item.property_no || `DCP-${item.id}`,
      name: item.description || item.category,
      description: item.description || `${item.category} - ${item.manufacturer || ''} ${item.model || ''}`.trim(),
      quantity: item.quantity || 1,
      unit_of_measure: item.unit_of_measure || "pcs",
      unit_price: parseFloat(item.unit_value || 0),
    };
    
      setIcsItem(icsItemData);
      setIcsPersonnel(assignedPersonnel || null);
      // Small delay to allow form modal to close first
      setTimeout(() => {
        setShowICSModal(true);
      }, 300);
    };

  const handleDelete = async (item) => {
    if (actionLock) {
      showToast.warning("Please wait until the current action completes");
      return;
    }

    const confirmation = await showAlert.confirm(
      "Remove Inventory Entry",
      `Are you sure you want to remove this DCP inventory record (SN: ${item.serial_number})?`,
      "Yes, Remove",
      "Cancel"
    );
    if (!confirmation.isConfirmed) return;

    setActionLock(true);
    setActionLoading(item.id);

    try {
      showAlert.processing(
        "Deleting Record",
        "Removing DCP inventory record..."
      );
      const response = await fetch(
        `${apiBaseRef.current}/property-custodian/dcp-inventory/${item.id}`,
        {
          method: "DELETE",
          headers,
        }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || "Failed to delete inventory record");
      }
      setItems((prev) => prev.filter((it) => it.id !== item.id));
      showAlert.close();
      showToast.success("DCP inventory record removed");
    } catch (error) {
      console.error("Delete DCP inventory error:", error);
      showAlert.error("Error", error.message || "Unable to delete record");
    } finally {
      setActionLoading(null);
      setActionLock(false);
    }
  };

  const formatDate = (value) => {
    if (!value) return "N/A";
    return new Date(value).toLocaleDateString("en-PH", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Stats for top cards – mirror SchoolsManagement style
  const totalItems = items.length;
  const totalWorking = items.filter(
    (it) => it.condition_status === "Working"
  ).length;
  const filteredCount = filteredItems.length;

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

  const TableRowSkeleton = () => (
    <tr className="align-middle" style={{ height: "70px" }}>
      {/* # column */}
      <td className="text-center">
        <div className="placeholder-wave">
          <span className="placeholder col-4" style={{ height: 20 }}></span>
        </div>
      </td>
      {/* Action column */}
      <td className="text-center">
        <div className="d-flex justify-content-center gap-1">
          {[1, 2].map((item) => (
            <div
              key={item}
              className="placeholder action-placeholder"
              style={{ width: 32, height: 32, borderRadius: 6 }}
            ></div>
          ))}
        </div>
      </td>
      {/* Data columns */}
      {[1, 2, 3, 4, 5, 6, 7].map((col) => (
        <td key={col}>
          <div className="placeholder-wave mb-1">
            <span
              className="placeholder col-8"
              style={{ height: 16 }}
            ></span>
          </div>
          <div className="placeholder-wave">
            <span
              className="placeholder col-6"
              style={{ height: 14 }}
            ></span>
          </div>
        </td>
      ))}
    </tr>
  );

  return (
    <div className="container-fluid px-3 py-2 inventory-management-container fadeIn">
      {/* Page Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-3">
        <div className="flex-grow-1 mb-2 mb-md-0">
          <h1
            className="h4 mb-1 fw-bold"
            style={{ color: "var(--text-primary)" }}
          >
            DCP Inventory
          </h1>
          <p className="mb-0 small" style={{ color: "var(--text-muted)" }}>
            Track individual DCP devices, their condition, and assigned
            personnel.
          </p>
        </div>
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <button
            className="btn btn-sm btn-primary text-white"
            onClick={openCreateModal}
            disabled={loading || isActionDisabled()}
            style={{ transition: "all 0.2s ease-in-out", borderWidth: "2px" }}
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
            <i className="fas fa-plus me-1" />
            Add Inventory
          </button>
          <button
            className="btn btn-sm"
            onClick={loadAll}
            disabled={loading || isActionDisabled()}
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
            <i className="fas fa-sync-alt me-1" />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
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
                      {totalItems}
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
                      Working
                    </div>
                    <div
                      className="h4 mb-0 fw-bold"
                      style={{ color: "var(--accent-color)" }}
                    >
                      {totalWorking}
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
                      Filtered Results
                    </div>
                    <div
                      className="h4 mb-0 fw-bold"
                      style={{ color: "var(--primary-dark)" }}
                    >
                      {filteredCount}
                    </div>
                  </div>
                  <div className="col-auto">
                    <i
                      className="fas fa-filter fa-2x"
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
                      style={{ color: "var(--primary-dark)" }}
                    >
                      Current Page
                    </div>
                    <div
                      className="h4 mb-0 fw-bold"
                      style={{ color: "var(--primary-dark)" }}
                    >
                      {currentPage}/{totalPages}
                    </div>
                  </div>
                  <div className="col-auto">
                    <i
                      className="fas fa-file-alt fa-2x"
                      style={{ color: "var(--primary-color)", opacity: 0.7 }}
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
                  <i className="fas fa-search" />
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search by batch, category, serial, employee..."
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
                Items per page
              </label>
              <select
                className="form-select form-select-sm"
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                disabled={loading}
              >
                {[10, 15, 25, 50].map((size) => (
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
              <i className="fas fa-clipboard-list me-2" />
              DCP Inventory
              {!loading && (
                <small className="opacity-75 ms-2 text-white">
                  ({filteredItems.length} total)
                </small>
              )}
            </h5>
          </div>
        </div>

        <div className="card-body p-0">
          {loading ? (
            <div className="table-responsive">
              <table className="table table-striped table-hover mb-0">
                <thead
                  style={{ backgroundColor: "var(--background-light)" }}
                >
                  <tr>
                    <th
                      className="text-center small fw-semibold"
                      style={{ width: "5%" }}
                    >
                      #
                    </th>
                    <th
                      className="text-center small fw-semibold"
                      style={{ width: "10%" }}
                    >
                      Action
                    </th>
                    <th className="small fw-semibold">Batch</th>
                    <th className="small fw-semibold">Category</th>
                    <th className="small fw-semibold">Serial No.</th>
                    <th className="small fw-semibold">Condition</th>
                    <th className="small fw-semibold">Employee</th>
                    <th className="small fw-semibold">Last Checked</th>
                    <th className="small fw-semibold">Validated</th>
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
                  Fetching DCP inventory records...
                </span>
              </div>
            </div>
          ) : currentItems.length === 0 ? (
            <div className="text-center py-5">
              <div className="mb-3">
                <i
                  className="fas fa-box-open fa-3x"
                  style={{ color: "var(--text-muted)", opacity: 0.5 }}
                />
              </div>
              <h5 className="mb-2" style={{ color: "var(--text-muted)" }}>
                No DCP inventory records yet
              </h5>
              <p
                className="mb-3 small"
                style={{ color: "var(--text-muted)" }}
              >
                Start by adding DCP devices under the assigned packages.
              </p>
            </div>
          ) : (
            <>
              <div className="table-responsive">
                <table className="table table-striped table-hover mb-0">
                  <thead
                    style={{ backgroundColor: "var(--background-light)" }}
                  >
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
                      <th className="small fw-semibold">Batch</th>
                      <th className="small fw-semibold">Category</th>
                      <th className="small fw-semibold">Serial No.</th>
                      <th className="small fw-semibold">Condition</th>
                      <th className="small fw-semibold">Employee</th>
                      <th className="small fw-semibold">Last Checked</th>
                      <th className="small fw-semibold">Validated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentItems.map((item, index) => (
                      <tr key={item.id} className="align-middle">
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
                              onClick={() => openEditModal(item)}
                              disabled={isActionDisabled(item.id)}
                              title="Edit inventory"
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
                                  e.target.style.transform =
                                    "translateY(-1px)";
                                  e.target.style.boxShadow =
                                    "0 4px 8px rgba(0,0,0,0.2)";
                                }
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.transform = "translateY(0)";
                                e.target.style.boxShadow = "none";
                              }}
                            >
                              {actionLoading === item.id ? (
                                <span
                                  className="spinner-border spinner-border-sm"
                                  role="status"
                                ></span>
                              ) : (
                                <i
                                  className="fas fa-pen"
                                  style={{ fontSize: "0.875rem" }}
                                ></i>
                              )}
                            </button>
                            <button
                              className="btn btn-danger btn-sm text-white"
                              onClick={() => handleDelete(item)}
                              disabled={isActionDisabled(item.id)}
                              title="Delete inventory"
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
                                  e.target.style.transform =
                                    "translateY(-1px)";
                                  e.target.style.boxShadow =
                                    "0 4px 8px rgba(0,0,0,0.2)";
                                }
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.transform = "translateY(0)";
                                e.target.style.boxShadow = "none";
                              }}
                            >
                              {actionLoading === item.id ? (
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

                            <button
                              className="btn btn-warning btn-sm text-white"
                              onClick={() => handleGenerateICS(item)}
                              disabled={isActionDisabled(item.id)}
                              title="Generate ICS"
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
                                  e.target.style.transform =
                                    "translateY(-1px)";
                                  e.target.style.boxShadow =
                                    "0 4px 8px rgba(0,0,0,0.2)";
                                }
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.transform = "translateY(0)";
                                e.target.style.boxShadow = "none";
                              }}
                            >
                              {actionLoading === item.id ? (
                                <span
                                  className="spinner-border spinner-border-sm"
                                  role="status"
                                ></span>
                              ) : (
                                <i
                                  className="fas fa-file-invoice"
                                  style={{ fontSize: "0.875rem" }}
                                ></i>
                              )}
                            </button>
                          </div>
                        </td>
                        <td style={{ maxWidth: "260px", overflow: "hidden" }}>
                          <div
                            className="fw-semibold"
                            style={{
                              color: "var(--text-primary)",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                            title={item.batch_name}
                          >
                            {item.batch_name}
                          </div>
                          <div
                            className="small"
                            style={{ color: "var(--text-muted)" }}
                          >
                            Property No.: {item.property_no || "N/A"}
                          </div>
                        </td>
                        <td style={{ maxWidth: "180px", overflow: "hidden" }}>
                          <div
                            style={{
                              color: "var(--text-primary)",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                            title={item.category}
                          >
                            {item.category}
                          </div>
                        </td>
                        <td>{item.serial_number}</td>
                        <td>
                          <span className="text-success fw-semibold">
                            {item.condition_status}
                          </span>
                        </td>
                        <td style={{ maxWidth: "200px", overflow: "hidden" }}>
                          <div
                            style={{
                              color: "var(--text-primary)",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                            title={
                              item.personnel
                                ? `${item.personnel.first_name || ""} ${item.personnel.last_name || ""}`.trim()
                                : "Not assigned"
                            }
                          >
                            {item.personnel
                              ? `${item.personnel.first_name || ""} ${item.personnel.last_name || ""}`.trim()
                              : "Not assigned"}
                          </div>
                        </td>
                        <td>{formatDate(item.last_checked_at)}</td>
                        <td>{item.validation_status}</td>
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
                          {Math.min(startIndex + currentItems.length, filteredItems.length)}
                        </span>{" "}
                        of{" "}
                        <span
                          className="fw-semibold"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {filteredItems.length}
                        </span>{" "}
                        records
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
                          border: "2px solid var(--primary-color)",
                          color: "var(--primary-color)",
                          backgroundColor: "transparent",
                        }}
                      >
                        <i className="fas fa-chevron-left me-1" />
                        Previous
                      </button>
                      <button
                        className="btn btn-sm"
                        onClick={() =>
                          setCurrentPage((prev) =>
                            Math.min(prev + 1, totalPages)
                          )
                        }
                        disabled={currentPage === totalPages}
                        style={{
                          border: "2px solid var(--primary-color)",
                          color: "var(--primary-color)",
                          backgroundColor: "transparent",
                        }}
                      >
                        Next
                        <i className="fas fa-chevron-right ms-1" />
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
        <DcpInventoryFormModal
          token={token}
          item={editingItem}
          packages={packages}
          personnel={personnel}
          onClose={() => {
            setShowFormModal(false);
            setEditingItem(null);
          }}
          onSaved={handleSaved}
        />
      )}

      {showICSModal && icsItem && (
        <ICSModal
          isOpen={showICSModal}
          onClose={() => {
            setShowICSModal(false);
            setIcsItem(null);
            setIcsPersonnel(null);
          }}
          item={icsItem}
          personnel={icsPersonnel}
          school={school}
        />
      )}
    </div>
  );
};

const DcpInventoryFormModal = ({
  token,
  item,
  packages,
  personnel,
  onClose,
  onSaved,
}) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const apiBaseRef = useRef(API_BASE.replace(/\/$/, ""));
  const [isClosing, setIsClosing] = useState(false);

  const isEdit = !!item;

  useEffect(() => {
    if (item) {
      setFormData({
        ...DEFAULT_FORM,
        ...item,
        last_checked_at: item.last_checked_at
          ? new Date(item.last_checked_at).toISOString().split("T")[0]
          : "",
      });
    } else {
      setFormData(DEFAULT_FORM);
    }
    setStep(1);
    setErrors({});
  }, [item]);

  const validateStep = () => {
    const newErrors = {};
    if (step === 1) {
      if (!formData.dcp_package_id) newErrors.dcp_package_id = "Required";
      if (!formData.category) newErrors.category = "Required";
      if (!formData.description) newErrors.description = "Required";
      if (!formData.manufacturer) newErrors.manufacturer = "Required";
      if (!formData.model) newErrors.model = "Required";
      if (!formData.serial_number) newErrors.serial_number = "Required";
      if (!formData.unit_value) newErrors.unit_value = "Required";
      if (!formData.quantity || formData.quantity <= 0)
        newErrors.quantity = "Must be greater than zero";
      if (!formData.property_no) newErrors.property_no = "Required";
    } else if (step === 2) {
      if (!formData.personnel_id) newErrors.personnel_id = "Required";
      if (!formData.last_checked_at) newErrors.last_checked_at = "Required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validateStep()) return;
    setStep(2);
  };

  const handleBack = () => {
    if (step === 1) return;
    setStep(1);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "dcp_package_id") {
      const selected = packages.find((p) => String(p.id) === String(value));
      setFormData((prev) => ({
        ...prev,
        dcp_package_id: value ? Number(value) : "",
        batch_name: selected?.batch_name || "",
        school_id: selected?.school_id || "",
      }));
      setErrors((prev) => ({ ...prev, dcp_package_id: "" }));
      return;
    }

    if (name === "personnel_id") {
      // Only store personnel_id, not name or position
      // Name and position will be retrieved from the relationship
      setFormData((prev) => ({
        ...prev,
        personnel_id: value ? Number(value) : "",
      }));
      setErrors((prev) => ({ ...prev, personnel_id: "" }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]:
        name === "unit_value" || name === "quantity"
          ? value === ""
            ? ""
            : Number(value)
          : value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep()) return;

    setSaving(true);
    try {
      showAlert.processing(
        isEdit ? "Updating DCP Inventory" : "Creating DCP Inventory",
        "Please wait while we save the record..."
      );

      const payload = {
        ...formData,
      };

      const response = await fetch(
        `${apiBaseRef.current}/property-custodian/dcp-inventory${
          isEdit ? `/${item.id}` : ""
        }`,
        {
          method: isEdit ? "PUT" : "POST",
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
        const message =
          data?.message || "Unable to save DCP inventory record right now.";
        showAlert.error("DCP Inventory", message);
        setSaving(false);
        return;
      }

      showAlert.close();
      showToast.success(
        isEdit
          ? "DCP inventory record updated successfully!"
          : "DCP inventory record added successfully!"
      );
      onSaved(data.item || data, !isEdit);
    } catch (error) {
      console.error("Save DCP inventory error:", error);
      showAlert.error(
        "DCP Inventory",
        error.message || "Failed to save DCP inventory record."
      );
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (saving) return;
    onClose();
  };

  const performClose = async () => {
    setIsClosing(true);
    await new Promise((resolve) => setTimeout(resolve, 300));
    onClose();
  };

  const handleCloseAttempt = async () => {
    if (saving) return;
    await performClose();
  };

  const handleBackdropClick = async (e) => {
    if (e.target === e.currentTarget) {
      await handleCloseAttempt();
    }
  };

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
        style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
        tabIndex="-1"
        onClick={handleBackdropClick}
      >
        <div className="modal-dialog modal-dialog-centered modal-xl">
          <div
            className={`modal-content border-0 modal-content-animation ${
              isClosing ? "exit" : ""
            }`}
            style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}
          >
            <div
              className="modal-header border-0 text-white"
              style={{ backgroundColor: "#0E254B" }}
            >
              <h5 className="modal-title fw-bold">
                {isEdit ? "Edit Inventory" : "Add Inventory"}
              </h5>
              <button
                type="button"
                className="btn-close btn-close-white"
                aria-label="Close"
                onClick={handleCloseAttempt}
                disabled={saving}
              />
            </div>
            <form onSubmit={handleSubmit}>
              <div
                className="modal-body bg-light"
                style={{ maxHeight: "75vh", overflowY: "auto" }}
              >
                {step === 1 && (
                  <>
                    <h6 className="fw-bold mb-3">Package Details</h6>
                    <div className="row g-3 mb-3">
                      <div className="col-md-6">
                        <label className="form-label small fw-semibold">
                          Select DCP Package *
                        </label>
                        <select
                          className={`form-select ${
                            errors.dcp_package_id ? "is-invalid" : ""
                          }`}
                          name="dcp_package_id"
                          value={formData.dcp_package_id || ""}
                          onChange={handleChange}
                          disabled={saving}
                        >
                          <option value="">Select package</option>
                          {packages.map((pkg) => (
                            <option key={pkg.id} value={pkg.id}>
                              {pkg.batch_name}
                            </option>
                          ))}
                        </select>
                        {errors.dcp_package_id && (
                          <div className="invalid-feedback">
                            {errors.dcp_package_id}
                          </div>
                        )}
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small fw-semibold">
                          School ID
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          value={formData.school_id || ""}
                          disabled
                        />
                      </div>
                    </div>

                    <h6 className="fw-bold mb-3">Item Details</h6>
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label small fw-semibold">
                          Category *
                        </label>
                        <select
                          className={`form-select ${
                            errors.category ? "is-invalid" : ""
                          }`}
                          name="category"
                          value={formData.category}
                          onChange={handleChange}
                          disabled={saving}
                        >
                          <option value="">Select category</option>
                          {CATEGORY_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                        {errors.category && (
                          <div className="invalid-feedback">
                            {errors.category}
                          </div>
                        )}
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small fw-semibold">
                          Description/Specification *
                        </label>
                        <input
                          type="text"
                          className={`form-control ${
                            errors.description ? "is-invalid" : ""
                          }`}
                          name="description"
                          value={formData.description}
                          onChange={handleChange}
                          disabled={saving}
                        />
                        {errors.description && (
                          <div className="invalid-feedback">
                            {errors.description}
                          </div>
                        )}
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small fw-semibold">
                          Manufacturer *
                        </label>
                        <input
                          type="text"
                          className={`form-control ${
                            errors.manufacturer ? "is-invalid" : ""
                          }`}
                          name="manufacturer"
                          value={formData.manufacturer}
                          onChange={handleChange}
                          disabled={saving}
                        />
                        {errors.manufacturer && (
                          <div className="invalid-feedback">
                            {errors.manufacturer}
                          </div>
                        )}
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small fw-semibold">
                          Model *
                        </label>
                        <input
                          type="text"
                          className={`form-control ${
                            errors.model ? "is-invalid" : ""
                          }`}
                          name="model"
                          value={formData.model}
                          onChange={handleChange}
                          disabled={saving}
                        />
                        {errors.model && (
                          <div className="invalid-feedback">
                            {errors.model}
                          </div>
                        )}
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small fw-semibold">
                          Serial Number *
                        </label>
                        <input
                          type="text"
                          className={`form-control ${
                            errors.serial_number ? "is-invalid" : ""
                          }`}
                          name="serial_number"
                          value={formData.serial_number}
                          onChange={handleChange}
                          disabled={saving}
                        />
                        {errors.serial_number && (
                          <div className="invalid-feedback">
                            {errors.serial_number}
                          </div>
                        )}
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small fw-semibold">
                          Unit of Measure
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          name="unit_of_measure"
                          value={formData.unit_of_measure}
                          onChange={handleChange}
                          disabled={saving}
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label small fw-semibold">
                          Unit Value *
                        </label>
                        <input
                          type="number"
                          className={`form-control ${
                            errors.unit_value ? "is-invalid" : ""
                          }`}
                          name="unit_value"
                          value={formData.unit_value}
                          onChange={handleChange}
                          disabled={saving}
                        />
                        {errors.unit_value && (
                          <div className="invalid-feedback">
                            {errors.unit_value}
                          </div>
                        )}
                      </div>
                      <div className="col-md-4">
                        <label className="form-label small fw-semibold">
                          Quantity *
                        </label>
                        <input
                          type="number"
                          className={`form-control ${
                            errors.quantity ? "is-invalid" : ""
                          }`}
                          name="quantity"
                          value={formData.quantity}
                          onChange={handleChange}
                          disabled={saving}
                        />
                        {errors.quantity && (
                          <div className="invalid-feedback">
                            {errors.quantity}
                          </div>
                        )}
                      </div>
                      <div className="col-md-4">
                        <label className="form-label small fw-semibold">
                          Property No. *
                        </label>
                        <input
                          type="text"
                          className={`form-control ${
                            errors.property_no ? "is-invalid" : ""
                          }`}
                          name="property_no"
                          value={formData.property_no}
                          onChange={handleChange}
                          disabled={saving}
                        />
                        {errors.property_no && (
                          <div className="invalid-feedback">
                            {errors.property_no}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {step === 2 && (
                  <>
                    <h6 className="fw-bold mb-3">Responsible End-user</h6>
                    <div className="row g-3 mb-3">
                      <div className="col-md-6">
                        <label className="form-label small fw-semibold">
                          Select Employee *
                        </label>
                        <select
                          className={`form-select ${
                            errors.personnel_id ? "is-invalid" : ""
                          }`}
                          name="personnel_id"
                          value={formData.personnel_id || ""}
                          onChange={handleChange}
                          disabled={saving}
                        >
                          <option value="">Select personnel</option>
                          {personnel.map((p) => (
                            <option key={p.id} value={p.id}>
                              {`${p.first_name || ''} ${p.last_name || ''}`.trim()}
                            </option>
                          ))}
                        </select>
                        {errors.personnel_id && (
                          <div className="invalid-feedback">
                            {errors.personnel_id}
                          </div>
                        )}
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small fw-semibold">
                          Position
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          value={
                            personnel.find((p) => p.id === formData.personnel_id)
                              ?.position || "N/A"
                          }
                          disabled
                        />
                      </div>
                    </div>

                    <h6 className="fw-bold mb-3">Condition</h6>
                    <div className="mb-3">
                      <label className="form-label small fw-semibold d-block">
                        Status
                      </label>
                      {CONDITION_OPTIONS.map((opt) => (
                        <div
                          key={opt}
                          className="form-check form-check-inline small"
                        >
                          <input
                            className="form-check-input"
                            type="radio"
                            name="condition_status"
                            id={`cond-${opt}`}
                            value={opt}
                            checked={formData.condition_status === opt}
                            onChange={handleChange}
                            disabled={saving}
                          />
                          <label
                            className="form-check-label"
                            htmlFor={`cond-${opt}`}
                          >
                            {opt}
                          </label>
                        </div>
                      ))}
                    </div>

                    <div className="row g-3 mb-3">
                      <div className="col-md-6">
                        <label className="form-label small fw-semibold">
                          Last Day Checked *
                        </label>
                        <input
                          type="date"
                          className={`form-control ${
                            errors.last_checked_at ? "is-invalid" : ""
                          }`}
                          name="last_checked_at"
                          value={formData.last_checked_at || ""}
                          onChange={handleChange}
                          disabled={saving}
                        />
                        {errors.last_checked_at && (
                          <div className="invalid-feedback">
                            {errors.last_checked_at}
                          </div>
                        )}
                      </div>
                    </div>

                    <h6 className="fw-bold mb-3">SDO Validation</h6>
                    <div className="mb-3">
                      <label className="form-label small fw-semibold d-block">
                        Validation Status
                      </label>
                      {VALIDATION_OPTIONS.map((opt) => (
                        <div
                          key={opt}
                          className="form-check form-check-inline small"
                        >
                          <input
                            className="form-check-input"
                            type="radio"
                            name="validation_status"
                            id={`val-${opt}`}
                            value={opt}
                            checked={formData.validation_status === opt}
                            onChange={handleChange}
                            disabled={saving}
                          />
                          <label
                            className="form-check-label"
                            htmlFor={`val-${opt}`}
                          >
                            {opt}
                          </label>
                        </div>
                      ))}
                    </div>

                    <div className="mb-3">
                      <label className="form-label small fw-semibold">
                        Remarks
                      </label>
                      <textarea
                        className="form-control"
                        rows="3"
                        name="remarks"
                        value={formData.remarks}
                        onChange={handleChange}
                        disabled={saving}
                      />
                    </div>
                  </>
                )}
              </div>
              <div className="modal-footer border-0 bg-white modal-smooth">
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-smooth"
                  onClick={handleCloseAttempt}
                  disabled={saving}
                >
                  Cancel
                </button>
                {step === 2 && (
                  <button
                    type="button"
                    className="btn btn-outline-primary"
                    onClick={handleBack}
                    disabled={saving}
                  >
                    Back
                  </button>
                )}
                {step === 1 && (
                  <button
                    type="button"
                    className="btn btn-primary btn-smooth"
                    onClick={handleNext}
                    disabled={saving}
                  >
                    Next
                  </button>
                )}
                {step === 2 && (
                  <button
                    type="submit"
                    className="btn btn-primary btn-smooth"
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" />
                        Saving...
                      </>
                    ) : (
                      "Submit"
                    )}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </Portal>
  );
};

export default DcpInventory;


