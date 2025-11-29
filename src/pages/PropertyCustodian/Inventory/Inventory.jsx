import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import Swal from "sweetalert2";
import { useAuth } from "../../../contexts/AuthContext";
import { showAlert, showToast } from "../../../services/notificationService";
import Portal from "../../../components/Portal/Portal";
import InventoryCategories from "./InventoryCategories";
import ICSModal from "../../../components/ICSModal/ICSModal";

const STATUS_OPTIONS = [
  { value: "available", label: "Available", color: "#22c55e" },
  { value: "assigned", label: "Assigned", color: "#0ea5e9" },
  { value: "maintenance", label: "Maintenance", color: "#f59e0b" },
  { value: "disposed", label: "Disposed", color: "#ef4444" },
];

const DEFAULT_FORM = {
  name: "",
  description: "",
  category_id: "",
  brand: "",
  model: "",
  serial_number: "",
  unit_of_measure: "",
  quantity: 0,
  available_quantity: 0,
  unit_price: "",
  location: "",
  status: "available",
  tracking_mode: "detailed",
  purchase_date: "",
  warranty_expiry: "",
  supplier: "",
  notes: "",
  personnel_id: "",
};

const statusMeta = {
  available: {
    label: "Available",
    className:
      "badge bg-success bg-opacity-10 text-success border border-success",
  },
  assigned: {
    label: "Assigned",
    className:
      "badge bg-info bg-opacity-10 text-info border border-info-subtle",
  },
  maintenance: {
    label: "Maintenance",
    className:
      "badge bg-warning bg-opacity-10 text-warning border border-warning-subtle",
  },
  disposed: {
    label: "Disposed",
    className:
      "badge bg-danger bg-opacity-10 text-danger border border-danger-subtle",
  },
};

const normalizeCategory = (category, index = 0) => {
  if (typeof category === "string") {
    return {
      id: `category-${index}`,
      name: category,
      description: "",
      total_items: 0,
      created_at: null,
    };
  }

  return {
    id:
      category.id ??
      category.category_id ??
      category.slug ??
      `category-${index}`,
    name:
      category.name ??
      category.category_name ??
      category.title ??
      "Unnamed Category",
    description: category.description ?? category.details ?? "",
    total_items:
      category.total_items ??
      category.items_count ??
      category.item_count ??
      category.count ??
      0,
    created_at: category.created_at ?? null,
  };
};

const getAssetImageUrl = (item) => {
  if (!item?.image_path) return null;
  const baseUrl = import.meta.env.VITE_LARAVEL_API;
  let cleanFilename = item.image_path;
  if (cleanFilename.includes("inventory-assets/")) {
    cleanFilename = cleanFilename.replace("inventory-assets/", "");
  }
  cleanFilename = cleanFilename.split("/").pop();
  return `${baseUrl}/inventory-asset/${cleanFilename}`;
};

const AssetThumbnail = ({ item, size = 48 }) => {
  const imageUrl = getAssetImageUrl(item);

  if (imageUrl) {
    return (
      <div
        className="rounded-circle overflow-hidden border"
        style={{
          width: size,
          height: size,
          borderColor: "#e1e6ef",
          flexShrink: 0,
          backgroundColor: "#f4f6fb",
        }}
      >
        <img
          src={imageUrl}
          alt={item?.name || "Asset image"}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          onError={(e) => {
            e.target.style.display = "none";
          }}
        />
      </div>
    );
  }

  const initials = (item?.name || "?")
    .split(" ")
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold"
      style={{
        width: size,
        height: size,
        backgroundColor: "#0E254B",
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
};

const Inventory = () => {
  const { token } = useAuth();
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [actionLock, setActionLock] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState("created_at");
  const [sortDirection, setSortDirection] = useState("desc");

  const [showFormModal, setShowFormModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [activeTab, setActiveTab] = useState("inventory");
  const [personnel, setPersonnel] = useState([]);
  const [school, setSchool] = useState(null);
  const [showICSModal, setShowICSModal] = useState(false);
  const [icsItem, setIcsItem] = useState(null);
  const [icsPersonnel, setIcsPersonnel] = useState(null);

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
        `${apiBaseRef.current}/property-custodian/inventory?per_page=500`,
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

  const fetchCategories = useCallback(async () => {
    try {
      const response = await fetch(
        `${apiBaseRef.current}/property-custodian/inventory-categories/list`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Categories API Error:", {
          status: response.status,
          statusText: response.statusText,
          data: errorData,
        });
        throw new Error(
          errorData.message || `Failed to load categories: ${response.status}`
        );
      }

      const data = await response.json();
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data?.categories)
        ? data.categories
        : [];
      setCategoryOptions(
        list.map((category, index) => normalizeCategory(category, index))
      );
    } catch (error) {
      console.error("Error loading categories:", error);
      setCategoryOptions([]);
    }
  }, [token]);

  const fetchPersonnel = useCallback(async () => {
    try {
      const response = await fetch(
        `${apiBaseRef.current}/property-custodian/personnel?per_page=200`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to load personnel");
      }

      const data = await response.json();
      const list = Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data)
        ? data
        : [];
      setPersonnel(list);
    } catch (error) {
      console.error("Error loading personnel:", error);
      setPersonnel([]);
    }
  }, [token]);

  const fetchSchool = useCallback(async () => {
    try {
      const response = await fetch(
        `${apiBaseRef.current}/property-custodian/school-profile`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSchool(data.school || data);
      }
    } catch (error) {
      console.error("Error loading school:", error);
    }
  }, [token]);

  useEffect(() => {
    fetchInventory();
    fetchCategories();
    fetchPersonnel();
    fetchSchool();
  }, [fetchInventory, fetchCategories, fetchPersonnel, fetchSchool]);

  const filterAndSortItems = useCallback(() => {
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
          (field) => field && String(field).toLowerCase().includes(query.trim())
        );
      });
    }

    if (selectedCategory !== "all") {
      filtered = filtered.filter((item) => item.category === selectedCategory);
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((item) => item.status === statusFilter);
    }

    filtered.sort((a, b) => {
      if (!sortField) return 0;

      const aValue = a[sortField];
      const bValue = b[sortField];

      if (
        sortField === "created_at" ||
        sortField === "updated_at" ||
        sortField === "purchase_date" ||
        sortField === "warranty_expiry"
      ) {
        const aDate = aValue ? new Date(aValue) : new Date(0);
        const bDate = bValue ? new Date(bValue) : new Date(0);
        if (aDate < bDate) return sortDirection === "asc" ? -1 : 1;
        if (aDate > bDate) return sortDirection === "asc" ? 1 : -1;
        return 0;
      }

      const aVal =
        typeof aValue === "number"
          ? aValue
          : String(aValue || "").toLowerCase();
      const bVal =
        typeof bValue === "number"
          ? bValue
          : String(bValue || "").toLowerCase();

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    setFilteredItems(filtered);
    setCurrentPage(1);
  }, [
    items,
    searchTerm,
    selectedCategory,
    statusFilter,
    sortField,
    sortDirection,
  ]);

  useEffect(() => {
    filterAndSortItems();
  }, [filterAndSortItems]);

  const totalPages = Math.max(
    1,
    Math.ceil((filteredItems.length || 1) / itemsPerPage)
  );
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = useMemo(
    () => filteredItems.slice(startIndex, startIndex + itemsPerPage),
    [filteredItems, startIndex, itemsPerPage]
  );

  const normalizedCategories = useMemo(() => {
    if (!Array.isArray(categoryOptions)) return [];
    return categoryOptions.map((category, index) => {
      if (typeof category === "string") {
        return {
          id: `category-${index}`,
          name: category,
          description: "",
          total_items: 0,
        };
      }
      return {
        id:
          category.id ??
          category.category_id ??
          category.slug ??
          `category-${index}`,
        name: category.name ?? category.category_name ?? "Unnamed Category",
        description: category.description ?? category.details ?? "",
        total_items:
          category.total_items ??
          category.items_count ??
          category.item_count ??
          0,
      };
    });
  }, [categoryOptions]);

  const quickStats = useMemo(() => {
    const statusCounts = filteredItems.reduce(
      (acc, item) => {
        const status = item.status || "available";
        acc[status] = (acc[status] || 0) + 1;
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
      categories: normalizedCategories.length,
      ...statusCounts,
    };
  }, [filteredItems, normalizedCategories]);

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

  const handleAddItem = () => {
    setEditingItem(null);
    setShowFormModal(true);
  };

  const handleEditItem = (item) => {
    setEditingItem(item);
    setShowFormModal(true);
  };

  const handleSaveItem = (savedItem, assignedPersonnelId = null) => {
    setItems((prev) => {
      const exists = prev.some((item) => item.id === savedItem.id);
      if (exists) {
        return prev.map((item) =>
          item.id === savedItem.id ? savedItem : item
        );
      }
      return [savedItem, ...prev];
    });
    setShowFormModal(false);
    setEditingItem(null);
    setSelectedCategory("all");
    setStatusFilter("all");
    showToast.success(
      editingItem ? "Inventory item updated!" : "Inventory item added!"
    );
    
    // Show ICS modal if personnel was assigned (for both new and edited items)
    if (assignedPersonnelId) {
      const assignedPersonnel = personnel.find(p => p.id === assignedPersonnelId);
      setIcsItem(savedItem);
      setIcsPersonnel(assignedPersonnel || null);
      setShowICSModal(true);
    }
  };

  const handleGenerateICS = (item) => {
    // Find assigned personnel if any
    const assignedPersonnel = personnel.find(p => p.id === item.personnel_id);
    setIcsItem(item);
    setIcsPersonnel(assignedPersonnel || null);
    setShowICSModal(true);
  };

  const handleDeleteItem = async (item) => {
    if (actionLock) {
      showToast.warning("Please wait until the current action completes");
      return;
    }

    const confirmation = await showAlert.confirm(
      "Remove Inventory Item",
      `Are you sure you want to remove ${item.name}?`,
      "Yes, Remove",
      "Cancel"
    );

    if (!confirmation.isConfirmed) return;

    try {
      setActionLock(true);
      setActionLoading(item.id);
      showAlert.processing("Deleting Item", "Removing item from inventory...");

      const response = await fetch(
        `${apiBaseRef.current}/property-custodian/inventory/${item.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to delete item");
      }

      setItems((prev) => prev.filter((entry) => entry.id !== item.id));
      showToast.success("Inventory item removed");
    } catch (error) {
      console.error("Delete error:", error);
      showAlert.error("Error", error.message || "Unable to delete item");
    } finally {
      showAlert.close();
      setActionLock(false);
      setActionLoading(null);
    }
  };

  const handleRefresh = async () => {
    if (actionLock) {
      showToast.warning("Please wait until current action completes");
      return;
    }
    await Promise.all([fetchInventory(), fetchCategories()]);
    showToast.info("Inventory refreshed");
  };

  const handleViewDetails = (item) => {
    setSelectedItem(item);
    setShowDetailsModal(true);
  };

  const isActionDisabled = (id = null) =>
    actionLock || (actionLoading && actionLoading !== id);

  const EmptyState = () => (
    <div className="text-center py-5">
      <div className="mb-3">
        <i
          className="fas fa-box-open fa-3x"
          style={{ color: "var(--text-muted)", opacity: 0.5 }}
        ></i>
      </div>
      <h5 className="fw-semibold mb-1" style={{ color: "var(--text-primary)" }}>
        {items.length === 0
          ? "No inventory records yet"
          : "No matching items found"}
      </h5>
      <p className="mb-3 small" style={{ color: "var(--text-muted)" }}>
        {items.length === 0
          ? "Document your classrooms, ICT equipment, and furnishings to start tracking availability."
          : "Try adjusting your search keywords, filters, or reset the list."}
      </p>
      {items.length === 0 ? (
        <button
          className="btn btn-sm btn-primary text-white"
          onClick={handleAddItem}
          disabled={isActionDisabled()}
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
          <i className="fas fa-plus me-1"></i>
          Add Inventory Item
        </button>
      ) : (
        <button
          className="btn btn-sm clear-search-main-btn"
          onClick={() => {
            setSearchTerm("");
            setSelectedCategory("all");
            setStatusFilter("all");
          }}
          disabled={loading || isActionDisabled()}
          style={{
            color: "var(--primary-color)",
            backgroundColor: "transparent",
            border: "2px solid var(--primary-color)",
            transition: "all 0.2s ease-in-out",
          }}
          onMouseEnter={(e) => {
            if (!e.target.disabled) {
              e.target.style.backgroundColor = "var(--primary-color)";
              e.target.style.color = "white";
              const icon = e.target.querySelector("i");
              if (icon) icon.style.color = "white";
            }
          }}
          onMouseLeave={(e) => {
            if (!e.target.disabled) {
              e.target.style.backgroundColor = "transparent";
              e.target.style.color = "var(--primary-color)";
              const icon = e.target.querySelector("i");
              if (icon) icon.style.color = "var(--primary-color)";
            }
          }}
        >
          <i className="fas fa-times me-1"></i>
          Reset Filters
        </button>
      )}
    </div>
  );

  const TableRowSkeleton = () => (
    <tr className="align-middle" style={{ height: "70px" }}>
      <td className="text-center">
        <div className="placeholder-wave">
          <span className="placeholder col-4" style={{ height: 20 }}></span>
        </div>
      </td>
      <td className="text-center">
        <div className="d-flex justify-content-center gap-1">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="placeholder action-placeholder"
              style={{ width: 32, height: 32, borderRadius: 6 }}
            ></div>
          ))}
        </div>
      </td>
      <td>
        <div className="d-flex align-items-center">
          <div className="flex-grow-1">
            <div className="placeholder-wave mb-1">
              <span className="placeholder col-8" style={{ height: 16 }}></span>
            </div>
            <div className="placeholder-wave">
              <span className="placeholder col-6" style={{ height: 14 }}></span>
            </div>
          </div>
        </div>
      </td>
      <td>
        <div className="placeholder-wave mb-1">
          <span className="placeholder col-10" style={{ height: 16 }}></span>
        </div>
        <div className="placeholder-wave">
          <span className="placeholder col-8" style={{ height: 14 }}></span>
        </div>
      </td>
      <td>
        <div className="placeholder-wave mb-1">
          <span className="placeholder col-8" style={{ height: 16 }}></span>
        </div>
        <div className="placeholder-wave">
          <span className="placeholder col-6" style={{ height: 14 }}></span>
        </div>
      </td>
      <td>
        <div className="placeholder-wave mb-1">
          <span className="placeholder col-6" style={{ height: 16 }}></span>
        </div>
        <div className="placeholder-wave">
          <span className="placeholder col-4" style={{ height: 14 }}></span>
        </div>
      </td>
      <td>
        <div className="placeholder-wave mb-1">
          <span className="placeholder col-6" style={{ height: 16 }}></span>
        </div>
        <div className="placeholder-wave">
          <span className="placeholder col-5" style={{ height: 14 }}></span>
        </div>
      </td>
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

  const formatNumber = (value) =>
    Number(value || 0).toLocaleString("en-US", {
      maximumFractionDigits: 0,
    });

  const formatDate = (value) => {
    if (!value) return "N/A";
    return new Date(value).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const tabConfig = [
    { id: "inventory", label: "Inventory List" },
    { id: "categories", label: "Inventory Categories" },
  ];

  const renderStatusBadge = (status) => {
    const meta = statusMeta[status] || statusMeta["available"];
    return (
      <span className={meta.className} style={{ fontSize: "0.8rem" }}>
        {meta.label}
      </span>
    );
  };

  return (
    <div className="container-fluid px-3 py-2 inventory-management-container fadeIn">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-3">
        <div className="flex-grow-1 mb-2 mb-md-0">
          <h1
            className="h4 mb-1 fw-bold"
            style={{ color: "var(--text-primary)" }}
          >
            School Inventory Management
          </h1>
          <p className="mb-0 small" style={{ color: "var(--text-muted)" }}>
            Mirror the ICT portal experience while documenting school assets,
            deployments, and stock levels.
          </p>
        </div>
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <button
            className="btn btn-sm btn-primary text-white"
            onClick={handleAddItem}
            disabled={isActionDisabled()}
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
            <i className="fas fa-plus me-1"></i>
            Add Inventory Item
          </button>
          <button
            className="btn btn-sm"
            onClick={handleRefresh}
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
            <i className="fas fa-sync-alt me-1"></i>
            Refresh
          </button>
        </div>
      </div>

      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body p-2">
          <div className="d-flex flex-wrap gap-2">
            {tabConfig.map((tab) => (
              <button
                key={tab.id}
                className={`btn btn-sm ${
                  activeTab === tab.id
                    ? "btn-primary text-white"
                    : "btn-outline-primary"
                }`}
                onClick={() => setActiveTab(tab.id)}
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {activeTab === "inventory" ? (
        <>
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
                          {items.length}
                        </div>
                      </div>
                      <div className="col-auto">
                        <i
                          className="fas fa-boxes fa-2x"
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
                          style={{ color: "var(--accent-color)" }}
                        >
                          Available Units
                        </div>
                        <div
                          className="h4 mb-0 fw-bold"
                          style={{ color: "var(--accent-color)" }}
                        >
                          {formatNumber(quickStats.availableQuantity || 0)}
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
                          Filtered Results
                        </div>
                        <div
                          className="h4 mb-0 fw-bold"
                          style={{ color: "var(--primary-dark)" }}
                        >
                          {filteredItems.length}
                        </div>
                      </div>
                      <div className="col-auto">
                        <i
                          className="fas fa-filter fa-2x"
                          style={{
                            color: "var(--primary-color)",
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
                          style={{ color: "var(--primary-dark)" }}
                        >
                          Categories Tracked
                        </div>
                        <div
                          className="h4 mb-0 fw-bold"
                          style={{ color: "var(--primary-dark)" }}
                        >
                          {normalizedCategories.length}
                        </div>
                      </div>
                      <div className="col-auto">
                        <i
                          className="fas fa-tags fa-2x"
                          style={{
                            color: "var(--primary-color)",
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
                      <i className="fas fa-search"></i>
                    </span>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Search by name, code, serial number, supplier..."
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
                    Category
                  </label>
                  <select
                    className="form-select form-select-sm"
                    value={selectedCategory}
                    onChange={(e) => {
                      setSelectedCategory(e.target.value);
                      setCurrentPage(1);
                    }}
                    disabled={loading || isActionDisabled()}
                    style={{
                      backgroundColor: "var(--input-bg)",
                      borderColor: "var(--input-border)",
                      color: "var(--input-text)",
                    }}
                  >
                    <option value="all">All Categories</option>
                    {normalizedCategories.map((category) => (
                      <option key={category.id} value={category.name}>
                        {category.name}
                      </option>
                    ))}
                  </select>
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
                    disabled={loading || isActionDisabled()}
                    style={{
                      backgroundColor: "var(--input-bg)",
                      borderColor: "var(--input-border)",
                      color: "var(--input-text)",
                    }}
                  >
                    <option value="all">All Status</option>
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
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
                    disabled={loading || isActionDisabled()}
                    style={{
                      backgroundColor: "var(--input-bg)",
                      borderColor: "var(--input-border)",
                      color: "var(--input-text)",
                    }}
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
                  <i className="fas fa-boxes-stacked me-2"></i>
                  Inventory Catalogue
                  {!loading && (
                    <small className="opacity-75 ms-2 text-white">
                      ({filteredItems.length} shown)
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
                        <th className="text-center small fw-semibold">#</th>
                        <th className="text-center small fw-semibold">
                          Actions
                        </th>
                        <th className="small fw-semibold">Item Information</th>
                        <th className="small fw-semibold">
                          Category & Location
                        </th>
                        <th className="small fw-semibold">
                          Inventory Snapshot
                        </th>
                        <th className="small fw-semibold">Financials</th>
                        <th className="small fw-semibold text-center">
                          Status & Timeline
                        </th>
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
                      Fetching inventory records...
                    </span>
                  </div>
                </div>
              ) : currentItems.length === 0 ? (
                <EmptyState />
              ) : (
                <>
                  <div className="table-responsive">
                    <table className="table table-striped table-hover mb-0">
                      <thead
                        style={{ backgroundColor: "var(--background-light)" }}
                      >
                        <tr>
                          <th
                            style={{ width: "4%" }}
                            className="text-center small fw-semibold"
                          >
                            #
                          </th>
                          <th
                            style={{ width: "10%" }}
                            className="text-center small fw-semibold"
                          >
                            Actions
                          </th>
                          <th
                            style={{ width: "26%" }}
                            className="small fw-semibold"
                          >
                            <button
                              className="btn btn-link p-0 border-0 text-decoration-none fw-semibold text-start"
                              onClick={() => handleSort("name")}
                              disabled={isActionDisabled()}
                              style={{ color: "inherit" }}
                            >
                              Item Information
                              <i className={`ms-1 ${getSortIcon("name")}`}></i>
                            </button>
                          </th>
                          <th
                            style={{ width: "18%" }}
                            className="small fw-semibold"
                          >
                            <button
                              className="btn btn-link p-0 border-0 text-decoration-none fw-semibold text-start"
                              onClick={() => handleSort("category")}
                              disabled={isActionDisabled()}
                              style={{ color: "inherit" }}
                            >
                              Category & Location
                              <i
                                className={`ms-1 ${getSortIcon("category")}`}
                              ></i>
                            </button>
                          </th>
                          <th
                            style={{ width: "14%" }}
                            className="small fw-semibold"
                          >
                            <button
                              className="btn btn-link p-0 border-0 text-decoration-none fw-semibold text-start"
                              onClick={() => handleSort("quantity")}
                              disabled={isActionDisabled()}
                              style={{ color: "inherit" }}
                            >
                              Inventory Snapshot
                              <i
                                className={`ms-1 ${getSortIcon("quantity")}`}
                              ></i>
                            </button>
                          </th>
                          <th
                            style={{ width: "14%" }}
                            className="small fw-semibold"
                          >
                            <button
                              className="btn btn-link p-0 border-0 text-decoration-none fw-semibold text-start"
                              onClick={() => handleSort("unit_price")}
                              disabled={isActionDisabled()}
                              style={{ color: "inherit" }}
                            >
                              Financials
                              <i
                                className={`ms-1 ${getSortIcon("unit_price")}`}
                              ></i>
                            </button>
                          </th>
                          <th
                            style={{ width: "14%" }}
                            className="small fw-semibold text-center"
                          >
                            <button
                              className="btn btn-link p-0 border-0 text-decoration-none fw-semibold"
                              onClick={() => handleSort("status")}
                              disabled={isActionDisabled()}
                              style={{ color: "inherit" }}
                            >
                              Status & Timeline
                              <i
                                className={`ms-1 ${getSortIcon("status")}`}
                              ></i>
                            </button>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentItems.map((item, index) => {
                          const totalValue =
                            Number(item.quantity || 0) *
                            Number(item.unit_price || 0);
                          return (
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
                                    onClick={() => handleViewDetails(item)}
                                    disabled={isActionDisabled(item.id)}
                                    title="View details"
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
                                      e.target.style.transform =
                                        "translateY(0)";
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
                                        className="fas fa-eye"
                                        style={{ fontSize: "0.875rem" }}
                                      ></i>
                                    )}
                                  </button>

                                  <button
                                    className="btn btn-success btn-sm text-white"
                                    onClick={() => handleEditItem(item)}
                                    disabled={isActionDisabled(item.id)}
                                    title="Edit item"
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
                                      e.target.style.transform =
                                        "translateY(0)";
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
                                        className="fas fa-edit"
                                        style={{ fontSize: "0.875rem" }}
                                      ></i>
                                    )}
                                  </button>

                                  <button
                                    className="btn btn-danger btn-sm text-white"
                                    onClick={() => handleDeleteItem(item)}
                                    disabled={isActionDisabled(item.id)}
                                    title="Delete item"
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
                                      e.target.style.transform =
                                        "translateY(0)";
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
                                      e.target.style.transform =
                                        "translateY(0)";
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
                              <td>
                                <div className="d-flex align-items-center gap-3">
                                  <AssetThumbnail item={item} size={48} />
                                  <div>
                                    <div
                                      className="fw-semibold mb-1 text-truncate"
                                      style={{
                                        color: "var(--text-primary)",
                                        maxWidth: 220,
                                      }}
                                      title={item.name}
                                    >
                                      {item.name || "Unnamed Item"}
                                    </div>
                                    <div className="text-muted small text-truncate">
                                      Serial: {item.serial_number || "N/A"}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <div className="fw-semibold text-primary small mb-1 text-truncate">
                                  {item.category || "Uncategorized"}
                                </div>
                                <div
                                  className="text-muted small text-truncate"
                                  title={
                                    item.location || "No location specified"
                                  }
                                >
                                  {item.location || "No location specified"}
                                </div>
                                <div className="text-muted small text-truncate">
                                  Supplier: {item.supplier || "N/A"}
                                </div>
                              </td>
                              <td>
                                <div className="d-flex align-items-center gap-3">
                                  <div>
                                    <div className="fw-bold">
                                      {formatNumber(item.quantity)}
                                      <span className="text-muted ms-1">
                                        {item.unit_of_measure || "units"}
                                      </span>
                                    </div>
                                    <div className="text-muted small">
                                      Total quantity
                                    </div>
                                  </div>
                                  <div>
                                    <div className="fw-bold text-success">
                                      {formatNumber(item.available_quantity)}
                                    </div>
                                    <div className="text-success small">
                                      Available
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <div className="fw-semibold">
                                  {item.unit_price
                                    ? `₱${Number(
                                        item.unit_price
                                      ).toLocaleString()}`
                                    : "N/A"}
                                </div>
                                <div className="text-muted small">
                                  Est. Value: ₱
                                  {Number(totalValue).toLocaleString()}
                                </div>
                              </td>
                              <td className="text-center">
                                {renderStatusBadge(item.status)}
                                <div className="text-muted small mt-1 text-truncate">
                                  {item.purchase_date
                                    ? `Purchased ${formatDate(
                                        item.purchase_date
                                      )}`
                                    : "Purchase date N/A"}
                                </div>
                                <div className="text-muted small text-truncate">
                                  {item.warranty_expiry
                                    ? `Warranty ${formatDate(
                                        item.warranty_expiry
                                      )}`
                                    : "No warranty info"}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>

            {!loading && currentItems.length > 0 && (
              <div className="card-footer bg-white border-0 p-4 d-flex flex-wrap align-items-center justify-content-between gap-3">
                <div className="text-muted small">
                  Showing{" "}
                  <strong>
                    {startIndex + 1}-
                    {Math.min(
                      startIndex + currentItems.length,
                      filteredItems.length
                    )}
                  </strong>{" "}
                  of <strong>{filteredItems.length}</strong> items
                </div>
                <div className="d-flex gap-2">
                  <button
                    className="btn btn-outline-secondary btn-sm"
                    disabled={currentPage === 1}
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(1, prev - 1))
                    }
                  >
                    <i className="fas fa-chevron-left me-1"></i>
                    Prev
                  </button>
                  <span className="align-self-center text-muted small">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    className="btn btn-outline-secondary btn-sm"
                    disabled={currentPage === totalPages}
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                    }
                  >
                    Next
                    <i className="fas fa-chevron-right ms-1"></i>
                  </button>
                </div>
              </div>
            )}
          </div>

          {showFormModal && (
            <ItemFormModal
              token={token}
              item={editingItem}
              categoryOptions={categoryOptions}
              personnel={personnel}
              onClose={() => {
                setShowFormModal(false);
                setEditingItem(null);
              }}
              onSave={handleSaveItem}
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

          {showDetailsModal && selectedItem && (
            <ItemDetailsModal
              item={selectedItem}
              personnel={personnel}
              onClose={() => {
                setShowDetailsModal(false);
                setSelectedItem(null);
              }}
            />
          )}
        </>
      ) : (
        <div className="mt-4">
          <InventoryCategories />
        </div>
      )}
    </div>
  );
};

const ItemFormModal = ({ token, item, onClose, onSave, categoryOptions, personnel = [] }) => {
  const [formData, setFormData] = useState(DEFAULT_FORM);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [imagePreview, setImagePreview] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imageRemoved, setImageRemoved] = useState(false);
  const isEdit = !!item;

  const fileInputRef = useRef(null);
  const previewUrlRef = useRef(null);

  const updateImagePreview = useCallback((source, isFile = false) => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }

    if (isFile && source) {
      const objectUrl = URL.createObjectURL(source);
      previewUrlRef.current = objectUrl;
      setImagePreview(objectUrl);
    } else {
      setImagePreview(source || "");
    }
  }, []);

  useEffect(() => {
    if (item) {
      const categoryId =
        item.category_id ??
        (item.categoryRelation ? item.categoryRelation.id : "") ??
        "";

      setFormData({
        ...DEFAULT_FORM,
        ...item,
        category_id: categoryId,
        quantity: Number(item.quantity || 0),
        available_quantity: Number(item.available_quantity || 0),
        unit_price: item.unit_price || "",
      });
      setErrors({});
      setImageFile(null);
      setImageRemoved(false);
      const existingImage = getAssetImageUrl(item);
      updateImagePreview(existingImage || "");
    } else {
      setFormData(DEFAULT_FORM);
      setErrors({});
      setImageFile(null);
      setImageRemoved(false);
      updateImagePreview("");
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [item, updateImagePreview]);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 200);
  }, [onClose]);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        handleClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [handleClose]);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const validators = {
    name: (value) => (!value ? "Item name is required" : ""),
    category_id: (value) => (!value ? "Category is required" : ""),
    personnel_id: (value) => (!value ? "Personnel assignment is required" : ""),
    quantity: (value) =>
      value === "" || value === null || Number(value) < 0
        ? "Quantity must be 0 or greater"
        : "",
    available_quantity: (value) =>
      value === "" || value === null || Number(value) < 0
        ? "Available quantity must be 0 or greater"
        : Number(value) > Number(formData.quantity)
        ? "Available quantity cannot exceed total quantity"
        : "",
    unit_price: (value) =>
      value && Number(value) < 0 ? "Unit price cannot be negative" : "",
    status: (value) => (!value ? "Status is required" : ""),
  };

  const validateForm = () => {
    const newErrors = {};
    Object.entries(validators).forEach(([field, validator]) => {
      const message = validator(formData[field]);
      if (message) newErrors[field] = message;
    });
    setErrors(newErrors);
    return newErrors;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Handle category selection to keep both category_id and category name in sync
    if (name === "category_id") {
      const selectedId = value ? Number(value) : "";
      const selectedCategory =
        Array.isArray(categoryOptions) &&
        categoryOptions.find(
          (category) =>
            String(
              typeof category === "string" ? category : category.id ?? ""
            ) === String(value)
        );

      setFormData((prev) => ({
        ...prev,
        category_id: selectedId,
        category:
          typeof selectedCategory === "string"
            ? selectedCategory
            : selectedCategory?.name ?? "",
      }));

      if (errors.category_id) {
        setErrors((prev) => ({ ...prev, category_id: "" }));
      }
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]:
        name === "quantity" ||
        name === "available_quantity" ||
        name === "unit_price"
          ? value === ""
            ? ""
            : Number(value)
          : value,
    }));

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setErrors((prev) => ({
        ...prev,
        asset_image: "Only image files (PNG, JPG, GIF, SVG, WebP) are allowed",
      }));
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setErrors((prev) => ({
        ...prev,
        asset_image: "Please upload an image no larger than 2MB",
      }));
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    setErrors((prev) => ({ ...prev, asset_image: "" }));
    setImageRemoved(false);
    setImageFile(file);
    updateImagePreview(file, true);
  };

  const handleImageClear = () => {
    setImageFile(null);
    setImageRemoved(true);
    updateImagePreview("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setErrors((prev) => ({ ...prev, asset_image: "" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      Swal.fire({
        title: "Validation Error",
        icon: "error",
        html: `<ul class="list-unstyled text-start mb-0">${Object.entries(
          validationErrors
        )
          .map(
            ([field, message]) =>
              `<li class="mb-1"><strong>${field}:</strong> ${message}</li>`
          )
          .join("")}</ul>`,
        confirmButtonText: "Go Back",
        confirmButtonColor: "#0E254B",
      });
      return;
    }

    setLoading(true);
    showAlert.processing(
      isEdit ? "Updating Item" : "Creating Item",
      isEdit
        ? "Saving item changes in the catalogue..."
        : "Registering a new inventory record..."
    );

    try {
      const normalized = {
        ...formData,
        quantity: Number(formData.quantity || 0),
        available_quantity: Number(formData.available_quantity || 0),
        unit_price:
          formData.unit_price === "" ? null : Number(formData.unit_price),
      };

      const payload = new FormData();

      Object.entries(normalized).forEach(([key, value]) => {
        if (value === undefined || value === null) {
          return;
        }

        if (key === "unit_price" && value === null) {
          return;
        }

        if (key === "categoryRelation") {
          return;
        }

        payload.append(key, value);
      });

      if (imageFile) {
        payload.append("asset_image", imageFile);
      }

      if (imageRemoved && !imageFile) {
        payload.append("remove_image", "1");
      }

      if (isEdit) {
        payload.append("_method", "PUT");
      }

      const apiBase = (
        import.meta.env.VITE_LARAVEL_API || "http://localhost:8000/api"
      ).replace(/\/$/, "");

      const response = await fetch(
        `${apiBase}/property-custodian/inventory${isEdit ? `/${item.id}` : ""}`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: payload,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        // Handle Laravel validation errors or friendly messages
        if (data && data.errors) {
          const fieldLabels = {
            name: "Item Name",
            description: "Description",
            category_id: "Category",
            brand: "Manufacturer",
            model: "Model",
            serial_number: "Serial Number",
            unit_price: "Unit Price",
            quantity: "Quantity",
            available_quantity: "Available Quantity",
            unit_of_measure: "Unit of Measure",
            location: "Location",
            status: "Status",
            tracking_mode: "Tracking Mode",
            purchase_date: "Purchase Date",
            warranty_expiry: "Warranty Expiry",
            supplier: "Supplier",
            notes: "Notes",
            asset_image: "Asset Image",
          };

          const errorList = Object.entries(data.errors)
            .map(([field, messages]) => {
              const messageText = Array.isArray(messages)
                ? messages[0]
                : messages;
              if (!messageText) return null;
              const label = fieldLabels[field] || field;
              return `<li class="mb-1"><strong>${label}:</strong> ${messageText}</li>`;
            })
            .filter(Boolean)
            .join("");

          Swal.fire({
            title: "Unable to save asset",
            icon: "error",
            html: `
              <div style="text-align: left; color: #0E254B;">
                <p style="margin-bottom: 15px;">Please review and fix the following fields:</p>
                <ul style="margin: 0; padding-left: 20px; list-style-type: disc;">
                  ${errorList}
                </ul>
              </div>
            `,
            confirmButtonText: "OK",
            confirmButtonColor: "#0E254B",
          });
        } else {
          // Fallback for DB / server errors (like integrity constraint violations)
          let message =
            data?.message || "Unable to save inventory record right now.";

          // Make common DB constraint messages friendlier
          if (
            typeof message === "string" &&
            message.includes("unit_of_measure")
          ) {
            message =
              "Unit of Measure is required. Please enter a value such as 'pcs', 'sets', or 'units'.";
          }

          showAlert.error("Error", message);
        }
      } else {
        onSave(data, formData.personnel_id || null);
        showAlert.close();
      }
    } catch (error) {
      console.error("Save inventory error:", error);
      showAlert.error("Error", error.message || "Failed to save inventory");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Portal>
      <div
        className={`modal fade show d-block modal-backdrop-animation ${
          isClosing ? "exit" : ""
        }`}
        style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
        onClick={handleBackdropClick}
        tabIndex="-1"
      >
        <div className="modal-dialog modal-dialog-centered modal-lg mx-3 mx-sm-auto">
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
              <div>
                <h4 className="modal-title fw-bold">
                  {isEdit ? "Edit Asset" : "Add New Asset"}
                </h4>
              </div>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={handleClose}
                aria-label="Close"
              ></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div
                className="modal-body bg-light"
                style={{ maxHeight: "75vh", overflowY: "auto" }}
              >
                <div className="container-fluid px-1">
                  <div className="row g-3">
                    <div className="col-12">
                      <div className="card border-0 shadow-sm">
                        <div className="card-body text-center p-4">
                          <div className="d-flex flex-column align-items-center">
                            <div
                              className="d-flex align-items-center justify-content-center mb-3"
                              style={{
                                width: 140,
                                height: 140,
                                borderRadius: "50%",
                                border: "4px solid #e4e7ef",
                                backgroundColor: "#f4f6fb",
                                overflow: "hidden",
                              }}
                            >
                              {imagePreview ? (
                                <img
                                  src={imagePreview}
                                  alt="Asset preview"
                                  style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                  }}
                                />
                              ) : (
                                <span className="text-muted">
                                  <i className="fas fa-image fa-3x" />
                                </span>
                              )}
                            </div>
                            <div className="d-flex flex-column flex-sm-row gap-2 justify-content-center align-items-center">
                              <label
                                htmlFor="asset-image-input"
                                className="btn btn-outline-primary btn-sm mb-0"
                              >
                                <i className="fas fa-upload me-2" />
                                {imagePreview ? "Change Photo" : "Upload Photo"}
                              </label>
                              <input
                                id="asset-image-input"
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="d-none"
                                onChange={handleImageChange}
                                disabled={loading}
                              />
                              {imagePreview && (
                                <button
                                  type="button"
                                  className="btn btn-outline-danger btn-sm"
                                  onClick={handleImageClear}
                                  disabled={loading}
                                >
                                  <i className="fas fa-trash me-2" />
                                  Remove Photo
                                </button>
                              )}
                            </div>
                            <small className="text-muted mt-2">
                              Recommended: clear photo of the asset, up to 2MB
                              (JPG, PNG, WebP)
                            </small>
                            {errors.asset_image && (
                              <div className="text-danger small mt-2">
                                {errors.asset_image}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="col-12">
                      <div className="card border-0 shadow-sm">
                        <div className="card-body">
                          <h6 className="text-uppercase text-muted fw-semibold mb-3">
                            Identification
                          </h6>
                          <div className="row g-3">
                            <div className="col-md-6">
                              <label className="form-label fw-semibold">
                                Item Name <span className="text-danger">*</span>
                              </label>
                              <input
                                type="text"
                                className={`form-control ${
                                  errors.name ? "is-invalid" : ""
                                }`}
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="e.g., 55'' Smart TV"
                              />
                              {errors.name && (
                                <div className="invalid-feedback">
                                  {errors.name}
                                </div>
                              )}
                            </div>
                            <div className="col-md-6">
                              <label className="form-label fw-semibold">
                                Category <span className="text-danger">*</span>
                              </label>
                              <select
                                className={`form-select ${
                                  errors.category_id ? "is-invalid" : ""
                                }`}
                                name="category_id"
                                value={formData.category_id || ""}
                                onChange={handleChange}
                              >
                                <option value="">Select category</option>
                                {Array.isArray(categoryOptions) &&
                                  categoryOptions.map((category, index) => {
                                    if (typeof category === "string") {
                                      return (
                                        <option
                                          key={`category-${index}`}
                                          value=""
                                        >
                                          {category}
                                        </option>
                                      );
                                    }
                                    return (
                                      <option key={category.id} value={category.id}>
                                        {category.name}
                                      </option>
                                    );
                                  })}
                              </select>
                              {errors.category_id && (
                                <div className="invalid-feedback">
                                  {errors.category_id}
                                </div>
                              )}
                            </div>
                            <div className="col-md-6">
                              <label className="form-label fw-semibold">
                                Location
                              </label>
                              <input
                                type="text"
                                className="form-control"
                                name="location"
                                value={formData.location}
                                onChange={handleChange}
                                placeholder="e.g., Grade 10 ICT Lab"
                              />
                            </div>
                            <div className="col-md-6">
                              <label className="form-label fw-semibold">
                                Status <span className="text-danger">*</span>
                              </label>
                              <select
                                className="form-select"
                                name="status"
                                value={formData.status}
                                onChange={handleChange}
                              >
                                {STATUS_OPTIONS.map((option) => (
                                  <option
                                    key={option.value}
                                    value={option.value}
                                  >
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="col-12">
                              <label className="form-label fw-semibold">
                                Description
                              </label>
                              <textarea
                                className="form-control"
                                rows="2"
                                name="description"
                                value={formData.description || ""}
                                onChange={handleChange}
                                placeholder="Key notes or custom configuration"
                              ></textarea>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="col-12">
                      <div className="card border-0 shadow-sm">
                        <div className="card-body">
                          <h6 className="text-uppercase text-muted fw-semibold mb-3">
                            Specifications
                          </h6>
                          <div className="row g-3">
                            <div className="col-md-6">
                              <label className="form-label fw-semibold">
                                Manufacturer
                              </label>
                              <input
                                type="text"
                                className="form-control"
                                name="brand"
                                value={formData.brand}
                                onChange={handleChange}
                                placeholder="e.g., Samsung"
                              />
                            </div>
                            <div className="col-md-6">
                              <label className="form-label fw-semibold">
                                Model
                              </label>
                              <input
                                type="text"
                                className="form-control"
                                name="model"
                                value={formData.model}
                                onChange={handleChange}
                                placeholder="Model no."
                              />
                            </div>
                            <div className="col-md-6">
                              <label className="form-label fw-semibold">
                                Serial Number
                              </label>
                              <input
                                type="text"
                                className="form-control"
                                name="serial_number"
                                value={formData.serial_number}
                                onChange={handleChange}
                                placeholder="Serial no."
                              />
                            </div>
                            <div className="col-md-6">
                              <label className="form-label fw-semibold">
                                Unit of Measure
                              </label>
                              <input
                                type="text"
                                className="form-control"
                                name="unit_of_measure"
                                value={formData.unit_of_measure}
                                onChange={handleChange}
                                placeholder="e.g., units, sets"
                              />
                            </div>
                            <div className="col-md-6">
                              <label className="form-label fw-semibold">
                                Quantity <span className="text-danger">*</span>
                              </label>
                              <input
                                type="number"
                                min="0"
                                className={`form-control ${
                                  errors.quantity ? "is-invalid" : ""
                                }`}
                                name="quantity"
                                value={formData.quantity}
                                onChange={handleChange}
                              />
                              {errors.quantity && (
                                <div className="invalid-feedback">
                                  {errors.quantity}
                                </div>
                              )}
                            </div>
                            <div className="col-md-6">
                              <label className="form-label fw-semibold">
                                Available Quantity{" "}
                                <span className="text-danger">*</span>
                              </label>
                              <input
                                type="number"
                                min="0"
                                className={`form-control ${
                                  errors.available_quantity ? "is-invalid" : ""
                                }`}
                                name="available_quantity"
                                value={formData.available_quantity}
                                onChange={handleChange}
                              />
                              {errors.available_quantity && (
                                <div className="invalid-feedback">
                                  {errors.available_quantity}
                                </div>
                              )}
                            </div>
                            <div className="col-md-6">
                              <label className="form-label fw-semibold">
                                Unit Price (₱)
                              </label>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                className={`form-control ${
                                  errors.unit_price ? "is-invalid" : ""
                                }`}
                                name="unit_price"
                                value={formData.unit_price}
                                onChange={handleChange}
                              />
                              {errors.unit_price && (
                                <div className="invalid-feedback">
                                  {errors.unit_price}
                                </div>
                              )}
                            </div>
                            <div className="col-md-6">
                              <label className="form-label fw-semibold">
                                Supplier
                              </label>
                              <input
                                type="text"
                                className="form-control"
                                name="supplier"
                                value={formData.supplier}
                                onChange={handleChange}
                              />
                            </div>
                            <div className="col-md-6">
                              <label className="form-label fw-semibold">
                                Purchase Date
                              </label>
                              <input
                                type="date"
                                className="form-control"
                                name="purchase_date"
                                value={formData.purchase_date || ""}
                                onChange={handleChange}
                              />
                            </div>
                            <div className="col-md-6">
                              <label className="form-label fw-semibold">
                                Warranty Expiry
                              </label>
                              <input
                                type="date"
                                className="form-control"
                                name="warranty_expiry"
                                value={formData.warranty_expiry || ""}
                                onChange={handleChange}
                              />
                            </div>
                            <div className="col-12">
                              <label className="form-label fw-semibold">
                                Notes
                              </label>
                              <textarea
                                className="form-control"
                                rows="2"
                                name="notes"
                                value={formData.notes || ""}
                                onChange={handleChange}
                              ></textarea>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="col-12">
                      <div className="card border-0 shadow-sm">
                        <div className="card-body">
                          <h6 className="text-uppercase text-muted fw-semibold mb-3">
                            Assignment
                          </h6>
                          <div className="mb-3">
                            <label className="form-label fw-semibold">
                              Assign to Personnel <span className="text-danger">*</span>
                            </label>
                            <select
                              className={`form-select ${
                                errors.personnel_id ? "is-invalid" : ""
                              }`}
                              name="personnel_id"
                              value={formData.personnel_id || ""}
                              onChange={handleChange}
                            >
                              <option value="">Select personnel</option>
                              {Array.isArray(personnel) &&
                                personnel
                                  .filter((p) => p.is_active)
                                  .map((p) => (
                                    <option key={p.id} value={p.id}>
                                      {p.first_name} {p.last_name}
                                      {p.position ? ` - ${p.position}` : ""}
                                    </option>
                                  ))}
                            </select>
                            {errors.personnel_id && (
                              <div className="invalid-feedback">
                                {errors.personnel_id}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer border-top bg-white modal-smooth">
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-smooth"
                  onClick={handleClose}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-smooth"
                  style={{ backgroundColor: "#0E254B", borderColor: "#0E254B" }}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Saving...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-save me-1"></i>
                      {isEdit ? "Update Item" : "Save Item"}
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

const infoRow = (label, value) => (
  <div className="mb-3">
    <label className="form-label small fw-semibold text-muted mb-1">
      {label}
    </label>
    <p className="mb-0 fw-semibold text-dark">{value || "N/A"}</p>
  </div>
);

const formatDateTime = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Invalid date";
  return date.toLocaleString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const ItemDetailsModal = ({ item, personnel = [], onClose }) => {
  const [isClosing, setIsClosing] = useState(false);

  const assignedPersonnel = useMemo(() => {
    if (!item?.personnel_id || !Array.isArray(personnel)) return null;
    return personnel.find((p) => p.id === item.personnel_id) || null;
  }, [item, personnel]);

  const closeModal = useCallback(async () => {
    setIsClosing(true);
    await new Promise((resolve) => setTimeout(resolve, 200));
    onClose();
  }, [onClose]);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      closeModal();
    }
  };

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        closeModal();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [closeModal]);

  const formatDate = (value) => {
    if (!value) return "N/A";
    return new Date(value).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <Portal>
      <div
        className={`modal fade show d-block modal-backdrop-animation ${
          isClosing ? "exit" : ""
        }`}
        style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
        onClick={handleBackdropClick}
        tabIndex="-1"
      >
        <div className="modal-dialog modal-dialog-centered modal-lg mx-3 mx-sm-auto">
          <div
            className={`modal-content border-0 modal-content-animation ${
              isClosing ? "exit" : ""
            }`}
            style={{ boxShadow: "0 25px 80px rgba(0,0,0,0.35)" }}
          >
            <div
              className="modal-header border-0 text-white"
              style={{ backgroundColor: "#0E254B" }}
            >
              <h5 className="modal-title fw-bold">
                <i className="fas fa-box me-2" />
                Inventory Details
              </h5>
              <button
                type="button"
                className="btn-close btn-close-white"
                aria-label="Close"
                onClick={closeModal}
              ></button>
            </div>

            <div
              className="modal-body bg-light"
              style={{ maxHeight: "75vh", overflowY: "auto" }}
            >
              <div className="card border-0 shadow-sm mb-4">
                <div className="card-body d-flex flex-column flex-sm-row align-items-center gap-3">
                  <AssetThumbnail item={item} size={110} />
                  <div className="text-center text-sm-start">
                    <h4 className="fw-bold mb-1" style={{ color: "#0E254B" }}>
                      {item.name || "Unnamed Item"}
                    </h4>
                    <p className="text-muted mb-2">
                      Category: {item.category || "Uncategorized"} · Serial:{" "}
                      {item.serial_number || "N/A"}
                    </p>
                    {assignedPersonnel && (
                      <p className="text-muted mb-2">
                        <i className="fas fa-user me-1" />
                        Assigned to: {assignedPersonnel.first_name || ""} {assignedPersonnel.last_name || ""}
                        {assignedPersonnel.position ? ` (${assignedPersonnel.position})` : ""}
                      </p>
                    )}
                    <div className="d-flex flex-wrap gap-2 justify-content-center justify-content-sm-start">
                      {statusMeta[item.status] ? (
                        <span className={statusMeta[item.status].className}>
                          <i className="fas fa-circle me-1" />
                          {statusMeta[item.status].label}
                        </span>
                      ) : (
                        <span className="badge bg-secondary">
                          <i className="fas fa-circle me-1" />
                          Unknown Status
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="row g-3">
                <div className="col-12 col-md-6">
                  <div className="card border-0 shadow-sm h-100">
                    <div className="card-header bg-transparent border-bottom-0">
                      <h6 className="mb-0 fw-semibold" style={{ color: "#0E254B" }}>
                        <i className="fas fa-info-circle me-2 text-primary" />
                        Item Information
                      </h6>
                    </div>
                    <div className="card-body">
                      {infoRow("Category", item.category || "Not set")}
                      {infoRow("Location", item.location || "Not set")}
                      {infoRow("Manufacturer", item.brand || "Not set")}
                      {infoRow("Model", item.model || "Not set")}
                      {infoRow("Serial Number", item.serial_number || "Not set")}
                      {infoRow("Unit of Measure", item.unit_of_measure || "Not set")}
                      {assignedPersonnel && (
                        infoRow(
                          "Assigned to Personnel",
                          `${assignedPersonnel.first_name || ""} ${assignedPersonnel.last_name || ""}`.trim() || "N/A"
                        )
                      )}
                    </div>
                  </div>
                </div>

                <div className="col-12 col-md-6">
                  <div className="card border-0 shadow-sm h-100">
                    <div className="card-header bg-transparent border-bottom-0">
                      <h6 className="mb-0 fw-semibold" style={{ color: "#0E254B" }}>
                        <i className="fas fa-chart-bar me-2 text-success" />
                        Inventory & Financials
                      </h6>
                    </div>
                    <div className="card-body">
                      {infoRow(
                        "Total Quantity",
                        `${item.quantity || 0} ${item.unit_of_measure || "units"}`
                      )}
                      {infoRow("Available Quantity", item.available_quantity || 0)}
                      {infoRow(
                        "Unit Price",
                        item.unit_price
                          ? `₱${Number(item.unit_price).toLocaleString()}`
                          : "Not set"
                      )}
                      {infoRow(
                        "Estimated Value",
                        item.quantity && item.unit_price
                          ? `₱${Number(
                              Number(item.quantity) * Number(item.unit_price)
                            ).toLocaleString()}`
                          : "Not set"
                      )}
                      {infoRow("Supplier", item.supplier || "Not set")}
                      {infoRow("Status", statusMeta[item.status]?.label || "Not set")}
                    </div>
                  </div>
                </div>

                {(item.description || item.notes) && (
                  <div className="col-12">
                    <div className="card border-0 shadow-sm">
                      <div className="card-header bg-transparent border-bottom-0">
                        <h6 className="mb-0 fw-semibold" style={{ color: "#0E254B" }}>
                          <i className="fas fa-file-alt me-2 text-info" />
                          Description & Notes
                        </h6>
                      </div>
                      <div className="card-body">
                        {item.description && (
                          <div className="mb-3">
                            <label className="form-label small fw-semibold text-muted mb-1">
                              Description
                            </label>
                            <p className="mb-0 text-dark">{item.description}</p>
                          </div>
                        )}
                        {item.notes && (
                          <div>
                            <label className="form-label small fw-semibold text-muted mb-1">
                              Notes / Remarks
                            </label>
                            <p className="mb-0 text-muted">{item.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {(item.purchase_date || item.warranty_expiry || item.created_at || item.updated_at) && (
                  <div className="col-12">
                    <div className="card border-0 shadow-sm">
                      <div className="card-header bg-transparent border-bottom-0">
                        <h6 className="mb-0 fw-semibold" style={{ color: "#0E254B" }}>
                          <i className="fas fa-history me-2 text-warning" />
                          Timeline & Procurement
                        </h6>
                      </div>
                      <div className="card-body row">
                        {item.purchase_date && (
                          <div className="col-12 col-md-6">
                            {infoRow("Purchase Date", formatDate(item.purchase_date))}
                          </div>
                        )}
                        {item.warranty_expiry && (
                          <div className="col-12 col-md-6">
                            {infoRow("Warranty Expiry", formatDate(item.warranty_expiry))}
                          </div>
                        )}
                        {item.created_at && (
                          <div className="col-12 col-md-6">
                            {infoRow(
                              "Registered On",
                              formatDateTime(item.created_at)
                            )}
                          </div>
                        )}
                        {item.updated_at && (
                          <div className="col-12 col-md-6">
                            {infoRow("Last Updated", formatDateTime(item.updated_at))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer border-top bg-white">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={closeModal}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
};

export default Inventory;
