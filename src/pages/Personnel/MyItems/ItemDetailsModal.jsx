import React, { useState, useEffect, useCallback, useMemo } from "react";
import Portal from "../../../components/Portal/Portal";

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

const formatDate = (value) => {
  if (!value) return "N/A";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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

const AssetThumbnail = ({ item, size = 110 }) => {
  const imageUrl = getAssetImageUrl(item);

  if (imageUrl) {
    return (
      <div
        className="rounded overflow-hidden border shadow-sm"
        style={{
          width: size,
          height: size,
          borderColor: "#e1e6ef",
          backgroundColor: "#f4f6fb",
          flexShrink: 0,
        }}
      >
        <img
          src={imageUrl}
          alt={item?.name || item?.description || "Asset image"}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          onError={(e) => {
            e.target.style.display = "none";
          }}
        />
      </div>
    );
  }

  return (
    <div
      className="rounded d-flex align-items-center justify-content-center text-muted border shadow-sm"
      style={{
        width: size,
        height: size,
        borderColor: "#e1e6ef",
        backgroundColor: "#f4f6fb",
        flexShrink: 0,
      }}
    >
      <i className="fas fa-image fa-3x"></i>
    </div>
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

const ItemDetailsModal = ({ item, onClose }) => {
  const [isClosing, setIsClosing] = useState(false);

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
        event.preventDefault();
        closeModal();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [closeModal]);

  if (!item) return null;

  // Handle both School Inventory and DCP Inventory structures
  const itemName = item.name || item.description || "Inventory Item";
  const itemCategory = item.category || "Uncategorized";
  const serialNumber = item.serial_number || "N/A";
  const status = item.status || item.condition_status || "N/A";
  const brand = item.brand || item.manufacturer || "N/A";
  const model = item.model || "N/A";

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
                Item Details
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
                      {itemName}
                    </h4>
                    <p className="text-muted mb-2">
                      Category: {itemCategory} · Serial: {serialNumber}
                    </p>
                    <div className="d-flex flex-wrap gap-2 justify-content-center justify-content-sm-start">
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
                        <i className="fas fa-circle me-1" />
                        {status}
                      </span>
                      <span
                        className={`badge ${
                          item.type === "school" ? "bg-primary" : "bg-info"
                        }`}
                      >
                        {item.source}
                      </span>
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
                      {infoRow("Category", itemCategory)}
                      {infoRow("Manufacturer", brand)}
                      {infoRow("Model", model)}
                      {infoRow("Serial Number", serialNumber)}
                      {infoRow("Property Number", item.property_no || "N/A")}
                      {infoRow("Unit of Measure", item.unit_of_measure || "N/A")}
                      {infoRow("Location", item.location || "N/A")}
                    </div>
                  </div>
                </div>

                <div className="col-12 col-md-6">
                  <div className="card border-0 shadow-sm h-100">
                    <div className="card-header bg-transparent border-bottom-0">
                      <h6 className="mb-0 fw-semibold" style={{ color: "#0E254B" }}>
                        <i className="fas fa-chart-bar me-2 text-success" />
                        Inventory Details
                      </h6>
                    </div>
                    <div className="card-body">
                      {infoRow(
                        "Quantity",
                        `${item.quantity || 1} ${item.unit_of_measure || "pcs"}`
                      )}
                      {item.available_quantity !== undefined && (
                        infoRow("Available Quantity", item.available_quantity || 0)
                      )}
                      {item.unit_price && (
                        infoRow(
                          "Unit Price",
                          `₱${Number(item.unit_price).toLocaleString("en-PH", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}`
                        )
                      )}
                      {item.unit_value && (
                        infoRow(
                          "Unit Value",
                          `₱${Number(item.unit_value).toLocaleString("en-PH", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}`
                        )
                      )}
                      {infoRow("Status", status)}
                      {infoRow("Condition Status", item.condition_status || "N/A")}
                      {infoRow("Validation Status", item.validation_status || "N/A")}
                    </div>
                  </div>
                </div>

                {(item.description || item.notes || item.remarks) && (
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
                          <div className="mb-3">
                            <label className="form-label small fw-semibold text-muted mb-1">
                              Notes / Remarks
                            </label>
                            <p className="mb-0 text-muted">{item.notes}</p>
                          </div>
                        )}
                        {item.remarks && (
                          <div>
                            <label className="form-label small fw-semibold text-muted mb-1">
                              Remarks
                            </label>
                            <p className="mb-0 text-muted">{item.remarks}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {(item.purchase_date ||
                  item.warranty_expiry ||
                  item.last_checked_at ||
                  item.assigned_at ||
                  item.created_at) && (
                  <div className="col-12">
                    <div className="card border-0 shadow-sm">
                      <div className="card-header bg-transparent border-bottom-0">
                        <h6 className="mb-0 fw-semibold" style={{ color: "#0E254B" }}>
                          <i className="fas fa-history me-2 text-warning" />
                          Timeline
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
                        {item.last_checked_at && (
                          <div className="col-12 col-md-6">
                            {infoRow("Last Checked", formatDate(item.last_checked_at))}
                          </div>
                        )}
                        {item.assigned_at && (
                          <div className="col-12 col-md-6">
                            {infoRow("Assigned Date", formatDateTime(item.assigned_at))}
                          </div>
                        )}
                        {item.created_at && (
                          <div className="col-12 col-md-6">
                            {infoRow("Created On", formatDateTime(item.created_at))}
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

export default ItemDetailsModal;

