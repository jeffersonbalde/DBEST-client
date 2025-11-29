import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Portal from "../../../components/Portal/Portal";
import { useAuth } from "../../../contexts/AuthContext";
import { showAlert, showToast } from "../../../services/notificationService";

const DEFAULT_CATEGORY_FORM = {
  name: "",
  description: "",
};

const InventoryCategories = () => {
  const { token } = useAuth();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [actionLock, setActionLock] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [paginationMeta, setPaginationMeta] = useState({
    current_page: 1,
    last_page: 1,
    total: 0,
    from: 0,
    to: 0,
  });
  const [stats, setStats] = useState({
    totalCategories: 0,
    totalItems: 0,
  });
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [savingCategory, setSavingCategory] = useState(false);

  const apiBaseRef = useRef(
    (import.meta.env.VITE_LARAVEL_API || "http://localhost:8000/api").replace(
      /\/$/,
      ""
    )
  );

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("page", currentPage);
      params.append("per_page", itemsPerPage);
      if (searchTerm.trim()) {
        params.append("search", searchTerm.trim());
      }

      const response = await fetch(
        `${
          apiBaseRef.current
        }/property-custodian/inventory-categories?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        console.error("Failed to parse JSON response:", jsonError);
        const text = await response.text();
        console.error("Response text:", text);
        throw new Error(
          `Invalid response from server: ${response.status} ${response.statusText}`
        );
      }

      if (!response.ok) {
        console.error("API Error Response:", data);
        const errorMessage =
          data.message ||
          data.error ||
          `Server error: ${response.status} ${response.statusText}`;
        throw new Error(errorMessage);
      }

      console.log("Categories API Response:", data);
      const paginator = data.categories ?? {};

      setCategories(paginator.data ?? []);
      setPaginationMeta({
        current_page: paginator.current_page ?? 1,
        last_page: paginator.last_page ?? 1,
        total: paginator.total ?? paginator.data?.length ?? 0,
        from: paginator.from ?? 0,
        to: paginator.to ?? paginator.data?.length ?? 0,
      });
      setStats({
        totalCategories: data.stats?.total_categories ?? paginator.total ?? 0,
        totalItems: data.stats?.total_items ?? 0,
      });
    } catch (error) {
      console.error("Error fetching categories:", error);
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
      showAlert.error(
        "Categories Error",
        error.message || "Unable to load inventory categories"
      );
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, [token, currentPage, itemsPerPage, searchTerm]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
    setCurrentPage(1);
  };

  const handleAddCategory = () => {
    setEditingCategory(null);
    setShowFormModal(true);
  };

  const handleEditCategory = (category) => {
    setEditingCategory(category);
    setShowFormModal(true);
  };

  const handleDeleteCategory = async (category) => {
    if (actionLock) {
      showToast.warning("Please wait until the current action completes");
      return;
    }

    const confirmation = await showAlert.confirm(
      "Delete Category",
      `Deleting "${category.name}" will remove it from the combobox. Continue?`,
      "Delete",
      "Cancel"
    );

    if (!confirmation.isConfirmed) return;

    setActionLock(true);
    setActionLoading(category.id);
    showAlert.processing("Deleting Category", "Removing category...");

    try {
      const response = await fetch(
        `${apiBaseRef.current}/property-custodian/inventory-categories/${category.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete category");
      }

      showAlert.close();
      showToast.success("Category deleted successfully");
      fetchCategories();
    } catch (error) {
      console.error("Delete category error:", error);
      showAlert.error("Error", error.message || "Unable to delete category");
    } finally {
      setActionLock(false);
      setActionLoading(null);
    }
  };

  const isActionDisabled = (id = null) =>
    actionLock || (actionLoading && actionLoading !== id);

  const handleSaveCategory = () => {
    setShowFormModal(false);
    setEditingCategory(null);
    fetchCategories();
  };

  const startIndex = useMemo(() => {
    return (paginationMeta.current_page - 1) * itemsPerPage;
  }, [paginationMeta, itemsPerPage]);

  return (
    <div className="container-fluid px-3 py-2 inventory-categories-container fadeIn">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-3">
        <div className="flex-grow-1 mb-2 mb-md-0">
          <h1
            className="h4 mb-1 fw-bold"
            style={{ color: "var(--text-primary)" }}
          >
            Inventory Categories
          </h1>
          <p className="mb-0 small" style={{ color: "var(--text-muted)" }}>
            Keep the combobox in sync with campus-wide asset groupings.
          </p>
        </div>
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <button
            className="btn btn-sm btn-primary text-white"
            onClick={handleAddCategory}
            disabled={isActionDisabled()}
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
            <i className="fas fa-plus me-1" />
            Add Category
          </button>
          <button
            className="btn btn-sm"
            onClick={fetchCategories}
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

      <div className="row g-3 mb-4">
        {[stats.totalCategories, stats.totalItems].map((value, idx) => (
          <div className="col-6 col-md-3" key={idx}>
            {loading ? (
              <StatsCardSkeleton />
            ) : (
              <div className="card stats-card h-100">
                <div className="card-body p-3">
                  <div className="d-flex align-items-center">
                    <div className="flex-grow-1">
                      <div
                        className="text-xs fw-semibold text-uppercase mb-1"
                        style={{
                          color:
                            idx === 0
                              ? "var(--primary-color)"
                              : "var(--accent-color)",
                        }}
                      >
                        {idx === 0 ? "Total Categories" : "Items Tagged"}
                      </div>
                      <div
                        className="h4 mb-0 fw-bold"
                        style={{
                          color:
                            idx === 0
                              ? "var(--primary-color)"
                              : "var(--accent-color)",
                        }}
                      >
                        {value}
                      </div>
                    </div>
                    <div className="col-auto">
                      <i
                        className={`fas ${
                          idx === 0 ? "fa-layer-group" : "fa-boxes-stacked"
                        } fa-2x`}
                        style={{
                          color:
                            idx === 0
                              ? "var(--primary-light)"
                              : "var(--accent-light)",
                          opacity: 0.7,
                        }}
                      ></i>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
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
                Search Categories
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
                  placeholder="Search by name or description..."
                  value={searchTerm}
                  onChange={handleSearchChange}
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
            <div className="col-md-6 text-md-end">
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
                style={{
                  maxWidth: 200,
                  display: "inline-block",
                  backgroundColor: "var(--input-bg)",
                  borderColor: "var(--input-border)",
                  color: "var(--input-text)",
                }}
              >
                {[5, 10, 20, 50].map((size) => (
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
              <i className="fas fa-tags me-2"></i>
              Category Catalog
              {!loading && (
                <small className="opacity-75 ms-2 text-white">
                  ({paginationMeta.total} total)
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
                    <th
                      className="text-center small fw-semibold"
                      style={{ width: "4%" }}
                    >
                      #
                    </th>
                    <th
                      className="text-center small fw-semibold"
                      style={{ width: "10%" }}
                    >
                      Actions
                    </th>
                    <th className="small fw-semibold" style={{ width: "30%" }}>
                      Category
                    </th>
                    <th className="small fw-semibold">Description</th>
                    <th
                      className="small fw-semibold text-center"
                      style={{ width: "14%" }}
                    >
                      Items Tagged
                    </th>
                    <th
                      className="small fw-semibold text-center"
                      style={{ width: "14%" }}
                    >
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[...Array(5)].map((_, idx) => (
                    <TableRowSkeleton key={idx} />
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
                  Fetching categories data...
                </span>
              </div>
            </div>
          ) : categories.length === 0 ? (
            <EmptyState
              onAddCategory={handleAddCategory}
              isActionDisabled={isActionDisabled}
            />
          ) : (
            <div className="table-responsive">
              <table className="table table-striped table-hover mb-0">
                <thead style={{ backgroundColor: "var(--background-light)" }}>
                  <tr>
                    <th
                      className="text-center small fw-semibold"
                      style={{ width: "4%" }}
                    >
                      #
                    </th>
                    <th
                      className="text-center small fw-semibold"
                      style={{ width: "10%" }}
                    >
                      Actions
                    </th>
                    <th className="small fw-semibold" style={{ width: "30%" }}>
                      Category
                    </th>
                    <th className="small fw-semibold">Description</th>
                    <th
                      className="small fw-semibold text-center"
                      style={{ width: "14%" }}
                    >
                      Items Tagged
                    </th>
                    <th
                      className="small fw-semibold text-center"
                      style={{ width: "14%" }}
                    >
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((category, index) => (
                    <tr key={category.id} className="align-middle">
                      <td
                        className="text-center fw-bold"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {startIndex + index + 1}
                      </td>
                      <td className="text-center">
                        <div className="d-flex justify-content-center gap-1">
                          <button
                            className="btn btn-success btn-sm text-white"
                            onClick={() => handleEditCategory(category)}
                            disabled={isActionDisabled(category.id)}
                            title="Edit category"
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
                            {actionLoading === category.id ? (
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
                            onClick={() => handleDeleteCategory(category)}
                            disabled={isActionDisabled(category.id)}
                            title="Delete category"
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
                            {actionLoading === category.id ? (
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
                        </div>
                      </td>
                      <td style={{ maxWidth: "250px", overflow: "hidden" }}>
                        <div
                          className="fw-medium"
                          style={{
                            color: "var(--text-primary)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                          title={category.name}
                        >
                          {category.name}
                        </div>
                      </td>
                      <td style={{ maxWidth: "300px", overflow: "hidden" }}>
                        <div
                          className="small"
                          style={{
                            color: "var(--text-muted)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                          title={
                            category.description || "No description provided"
                          }
                        >
                          {category.description || "No description provided"}
                        </div>
                      </td>
                      <td
                        className="text-center fw-semibold"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {category.items_count ?? 0}
                      </td>
                      <td className="text-center text-muted small">
                        {category.created_at
                          ? new Date(category.created_at).toLocaleDateString(
                              "en-US",
                              {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              }
                            )
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {!loading && categories.length > 0 && (
          <div className="card-footer bg-white border-top px-3 py-2">
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-center gap-2">
              <div className="text-center text-md-start">
                <small style={{ color: "var(--text-muted)" }}>
                  Showing{" "}
                  <span
                    className="fw-semibold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {paginationMeta.from || startIndex + 1}-
                    {paginationMeta.to ||
                      Math.min(
                        startIndex + categories.length,
                        paginationMeta.total
                      )}
                  </span>{" "}
                  of{" "}
                  <span
                    className="fw-semibold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {paginationMeta.total}
                  </span>{" "}
                  categories
                </small>
              </div>

              <div className="d-flex align-items-center gap-2">
                <button
                  className="btn btn-sm"
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(prev - 1, 1))
                  }
                  disabled={
                    paginationMeta.current_page === 1 || isActionDisabled()
                  }
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
                    const totalPages = paginationMeta.last_page;

                    if (totalPages <= maxVisiblePages) {
                      pages = Array.from(
                        { length: totalPages },
                        (_, i) => i + 1
                      );
                    } else {
                      pages.push(1);
                      let start = Math.max(2, paginationMeta.current_page - 1);
                      let end = Math.min(
                        totalPages - 1,
                        paginationMeta.current_page + 1
                      );

                      if (paginationMeta.current_page <= 2) {
                        end = 4;
                      } else if (
                        paginationMeta.current_page >=
                        totalPages - 1
                      ) {
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
                        onClick={() => page !== "..." && setCurrentPage(page)}
                        disabled={page === "..." || isActionDisabled()}
                        style={{
                          transition: "all 0.2s ease-in-out",
                          border: `2px solid ${
                            paginationMeta.current_page === page
                              ? "var(--primary-color)"
                              : "var(--input-border)"
                          }`,
                          color:
                            paginationMeta.current_page === page
                              ? "white"
                              : "var(--text-primary)",
                          backgroundColor:
                            paginationMeta.current_page === page
                              ? "var(--primary-color)"
                              : "transparent",
                          minWidth: "40px",
                        }}
                        onMouseEnter={(e) => {
                          if (
                            !e.target.disabled &&
                            paginationMeta.current_page !== page
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
                          if (
                            !e.target.disabled &&
                            paginationMeta.current_page !== page
                          ) {
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
                    Page {paginationMeta.current_page} of{" "}
                    {paginationMeta.last_page}
                  </small>
                </div>

                <button
                  className="btn btn-sm"
                  onClick={() =>
                    setCurrentPage((prev) =>
                      Math.min(prev + 1, paginationMeta.last_page)
                    )
                  }
                  disabled={
                    paginationMeta.current_page === paginationMeta.last_page ||
                    isActionDisabled()
                  }
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
      </div>

      {showFormModal && (
        <CategoryFormModal
          token={token}
          category={editingCategory}
          onClose={() => {
            setShowFormModal(false);
            setEditingCategory(null);
          }}
          onSave={handleSaveCategory}
          saving={savingCategory}
          setSaving={setSavingCategory}
        />
      )}
    </div>
  );
};

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

const TableRowSkeleton = () => (
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
            <span
              className="placeholder col-8"
              style={{ height: "16px" }}
            ></span>
          </div>
          <div className="placeholder-wave">
            <span
              className="placeholder col-6"
              style={{ height: "14px" }}
            ></span>
          </div>
        </div>
      </div>
    </td>
    <td>
      <div className="placeholder-wave mb-1">
        <span className="placeholder col-10" style={{ height: "16px" }}></span>
      </div>
      <div className="placeholder-wave">
        <span className="placeholder col-8" style={{ height: "14px" }}></span>
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
  </tr>
);

const EmptyState = ({ onAddCategory, isActionDisabled }) => (
  <div className="text-center py-5">
    <div className="mb-3">
      <i
        className="fas fa-layer-group fa-3x"
        style={{ color: "var(--text-muted)", opacity: 0.5 }}
      ></i>
    </div>
    <h5 className="mb-2" style={{ color: "var(--text-muted)" }}>
      No Categories Found
    </h5>
    <p className="mb-3 small" style={{ color: "var(--text-muted)" }}>
      Start by adding your first inventory category to organize your assets.
    </p>
    {onAddCategory && (
      <button
        className="btn btn-sm btn-primary text-white"
        onClick={onAddCategory}
        disabled={isActionDisabled?.()}
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
        Add Category
      </button>
    )}
  </div>
);

const CategoryFormModal = ({
  category,
  onClose,
  onSave,
  token,
  saving,
  setSaving,
}) => {
  const isEdit = !!category;
  const [formData, setFormData] = useState(DEFAULT_CATEGORY_FORM);
  const [errors, setErrors] = useState({});
  const [isClosing, setIsClosing] = useState(false);
  const apiBaseRef = useRef(
    (import.meta.env.VITE_LARAVEL_API || "http://localhost:8000/api").replace(
      /\/$/,
      ""
    )
  );

  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name || "",
        description: category.description || "",
      });
    } else {
      setFormData(DEFAULT_CATEGORY_FORM);
    }
    setErrors({});
  }, [category]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 200);
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = "Category name is required";
    }
    if (formData.description && formData.description.length > 500) {
      newErrors.description = "Description must be 500 characters or less";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving) return;
    if (!validateForm()) return;

    setSaving(true);
    showAlert.processing(
      isEdit ? "Updating Category" : "Creating Category",
      isEdit ? "Saving category updates..." : "Registering new category..."
    );

    try {
      const response = await fetch(
        `${apiBaseRef.current}/property-custodian/inventory-categories${
          isEdit ? `/${category.id}` : ""
        }`,
        {
          method: isEdit ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(formData),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Unable to save category right now");
      }

      showAlert.close();
      showToast.success(
        isEdit
          ? "Category updated successfully!"
          : "Category created successfully!"
      );
      onSave();
      handleClose();
    } catch (error) {
      console.error("Save category error:", error);
      showAlert.error("Error", error.message || "Failed to save category");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Portal>
      <div
        className={`modal fade show d-block modal-backdrop-animation ${
          isClosing ? "exit" : ""
        }`}
        style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
        onClick={(e) => {
          if (e.target === e.currentTarget) handleClose();
        }}
        tabIndex="-1"
      >
        <div className="modal-dialog modal-dialog-centered modal-md mx-3 mx-sm-auto">
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
                <i className={`fas ${isEdit ? "fa-edit" : "fa-plus"} me-2`}></i>
                {isEdit ? "Edit Category" : "New Category"}
              </h5>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={handleClose}
              ></button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body bg-light">
                <div className="mb-3">
                  <label className="form-label small fw-semibold text-dark mb-1">
                    Category Name <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className={`form-control ${
                      errors.name ? "is-invalid" : ""
                    }`}
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="e.g., ICT Equipment"
                    disabled={saving}
                  />
                  {errors.name && (
                    <div className="invalid-feedback">{errors.name}</div>
                  )}
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-semibold text-dark mb-1">
                    Description
                  </label>
                  <textarea
                    className={`form-control ${
                      errors.description ? "is-invalid" : ""
                    }`}
                    rows="3"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    placeholder="Optional short description"
                    disabled={saving}
                  ></textarea>
                  {errors.description && (
                    <div className="invalid-feedback">{errors.description}</div>
                  )}
                </div>
              </div>
              <div className="modal-footer border-top bg-white modal-smooth">
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-smooth"
                  onClick={handleClose}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-smooth"
                  style={{ backgroundColor: "#0E254B", borderColor: "#0E254B" }}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Saving...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-save me-1"></i>
                      {isEdit ? "Save Changes" : "Save Category"}
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

export default InventoryCategories;
 