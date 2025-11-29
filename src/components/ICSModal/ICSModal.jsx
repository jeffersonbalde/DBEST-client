import React, { useState, useRef } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import Portal from "../Portal/Portal";
import { showAlert, showToast } from "../../services/notificationService";
import { useAuth } from "../../contexts/AuthContext";
import depedLogo from "../../assets/deped_logo.png";

const ICSModal = ({ isOpen, onClose, item, personnel, school, onGenerate }) => {
  const { token, user } = useAuth();
  const [formData, setFormData] = useState({
    fund_cluster: "",
    ics_number: "",
    estimated_useful_life: "",
    received_by_name:
      personnel?.full_name ||
      personnel?.first_name + " " + personnel?.last_name ||
      "",
    received_by_position: personnel?.position || "",
    received_by_signature: "",
    received_from_name:
      user?.full_name || user?.first_name + " " + user?.last_name || "",
    received_from_position: user?.position || "Property Custodian",
    date: new Date().toISOString().split("T")[0],
  });
  const [loading, setLoading] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const signatureCanvasRef = useRef(null);

  if (!isOpen || !item) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const generateICSNumber = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0");
    return `SPL-ICS-LV-${year}-${month}-${random}`;
  };

  const handleGenerate = async () => {
    if (!formData.fund_cluster || !formData.estimated_useful_life) {
      showAlert.error(
        "Validation Error",
        "Please fill in all required fields (Fund Cluster and Estimated Useful Life)"
      );
      return;
    }

    setLoading(true);
    try {
      const icsData = {
        ...formData,
        ics_number: formData.ics_number || generateICSNumber(),
        item: {
          id: item.id,
          item_code: item.item_code,
          name: item.name,
          description: item.description,
          quantity: item.quantity || 1,
          unit: item.unit_of_measure || "pcs",
          unit_cost: item.unit_price || 0,
          total_cost: (item.quantity || 1) * (item.unit_price || 0),
        },
        personnel: personnel
          ? {
              id: personnel.id,
              name: formData.received_by_name,
              position: formData.received_by_position,
            }
          : null,
        school: school
          ? {
              id: school.id,
              name: school.name,
            }
          : null,
      };

      if (onGenerate) {
        await onGenerate(icsData);
      } else {
        // Generate PDF using jspdf
        const doc = new jsPDF("p", "mm", "a4");
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        let yPos = 8;

        // Add DepEd logo at top LEFT - small size
        try {
          const logoWidth = 20; // mm - small size
          const logoHeight = 20; // mm - small size
          const logoX = 10; // 10mm from left edge
          const logoY = 8; // 8mm from top
          doc.addImage(depedLogo, "PNG", logoX, logoY, logoWidth, logoHeight);
          // Start content below the logo
          yPos = logoY + logoHeight + 5; // 5mm below logo
        } catch (error) {
          console.warn("Could not load logo:", error);
          yPos = 10;
        }

        // Title with underline
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "bold");
        const titleText = "INVENTORY AND CUSTODIAN SLIP";
        const titleWidth = doc.getTextWidth(titleText);
        const titleX = (pageWidth - titleWidth) / 2;
        doc.text(titleText, titleX, yPos);

        // Draw underline
        doc.setLineWidth(0.5);
        doc.line(titleX, yPos + 1, titleX + titleWidth, yPos + 1);

        yPos += 8;

        // Entity Name, Fund Cluster, ICS NO.
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        const entityName = school?.name || "N/A";
        const entityNameLabel = "Entity Name: ";
        const entityNameX = 20;
        doc.text(entityNameLabel, entityNameX, yPos);

        // Draw entity name with underline
        const entityNameStartX =
          entityNameX + doc.getTextWidth(entityNameLabel);
        doc.text(entityName, entityNameStartX, yPos);
        const entityNameWidth = doc.getTextWidth(entityName);
        doc.setLineWidth(0.3);
        doc.line(
          entityNameStartX,
          yPos + 1,
          entityNameStartX + entityNameWidth,
          yPos + 1
        );

        // Fund Cluster with underlined value
        const fundClusterLabel = "Fund Cluster: ";
        const fundClusterValue = formData.fund_cluster;
        doc.text(fundClusterLabel, 20, yPos + 5);
        const fundClusterStartX = 20 + doc.getTextWidth(fundClusterLabel);
        doc.text(fundClusterValue, fundClusterStartX, yPos + 5);
        const fundClusterWidth = doc.getTextWidth(fundClusterValue);
        doc.setLineWidth(0.3);
        doc.line(
          fundClusterStartX,
          yPos + 6,
          fundClusterStartX + fundClusterWidth,
          yPos + 6
        );

        // ICS NO. with underlined value
        const icsNoLabel = "ICS NO.: ";
        const icsNoValue = formData.ics_number || generateICSNumber();
        doc.text(icsNoLabel, 20, yPos + 10);
        const icsNoStartX = 20 + doc.getTextWidth(icsNoLabel);
        doc.text(icsNoValue, icsNoStartX, yPos + 10);
        const icsNoWidth = doc.getTextWidth(icsNoValue);
        doc.line(icsNoStartX, yPos + 11, icsNoStartX + icsNoWidth, yPos + 11);
        yPos += 18;

        // Item Details Table
        const tableData = [
          [
            icsData.item.quantity.toString(),
            icsData.item.unit,
            `₱${parseFloat(icsData.item.unit_cost || 0).toLocaleString(
              "en-PH",
              {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }
            )}`,
            `₱${parseFloat(icsData.item.total_cost || 0).toLocaleString(
              "en-PH",
              {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }
            )}`,
            icsData.item.description || icsData.item.name,
            icsData.item.item_code,
            formData.estimated_useful_life,
          ],
        ];

        // Prepare signature data with proper formatting
        const receivedByName = formData.received_by_name || "N/A";
        const receivedByPosition = formData.received_by_position || "N/A";
        const receivedFromName = formData.received_from_name || "N/A";
        const receivedFromPosition = formData.received_from_position || "N/A";
        const dateStr = new Date(formData.date).toLocaleDateString("en-PH");

        // Format signature section:
        // Received by: / Received from:
        // Name
        // Signature over Printed Name
        // (Position)
        // Signature line / Date
        const receivedByFormatted = `Received by:\n\n${receivedByName}\n\nSignature over Printed Name\n\n(${receivedByPosition})\n\n_________________`;
        const receivedFromFormatted = `Received from:\n\n${receivedFromName}\n\nSignature over Printed Name\n\n(${receivedFromPosition})\n\nDate: ${dateStr}`;

        // Item Details Table - shrink columns to have proper margins
        const availableWidth = pageWidth - 40; // Total width minus margins (20mm each side)
        autoTable(doc, {
          startY: yPos,
          head: [
            [
              "Quantity",
              "Unit",
              "Unit Cost",
              "Total Cost",
              "DESCRIPTION",
              "Inventory Item No.",
              "Estimated Useful Life",
            ],
          ],
          body: tableData,
          theme: "grid",
          headStyles: {
            fillColor: [255, 255, 0], // Yellow background
            textColor: [0, 0, 0], // Black text
            fontStyle: "bold",
            fontSize: 9,
            halign: "center",
            valign: "middle",
          },
          bodyStyles: {
            fontSize: 9,
            halign: "center",
            valign: "top",
          },
          columnStyles: {
            0: { cellWidth: availableWidth * 0.08, halign: "center" }, // Quantity
            1: { cellWidth: availableWidth * 0.08, halign: "center" }, // Unit
            2: { cellWidth: availableWidth * 0.12, halign: "center" }, // Unit Cost
            3: { cellWidth: availableWidth * 0.12, halign: "center" }, // Total Cost
            4: { cellWidth: availableWidth * 0.3, halign: "left" }, // DESCRIPTION
            5: { cellWidth: availableWidth * 0.15, halign: "center" }, // Inventory Item No.
            6: { cellWidth: availableWidth * 0.15, halign: "center" }, // Estimated Useful Life
          },
          margin: { left: 20, right: 20 },
          styles: {
            lineColor: [0, 0, 0],
            lineWidth: 0.5,
          },
        });

        yPos = doc.lastAutoTable.finalY + 5;

        // Signature Section - separate 2-column table only
        autoTable(doc, {
          startY: yPos,
          body: [[receivedByFormatted, receivedFromFormatted]],
          theme: "grid",
          bodyStyles: {
            fontSize: 9,
            halign: "left",
            valign: "top",
            cellPadding: { top: 8, right: 8, bottom: 8, left: 8 },
          },
          columnStyles: {
            0: { cellWidth: (pageWidth - 40) / 2, halign: "left" },
            1: { cellWidth: (pageWidth - 40) / 2, halign: "left" },
          },
          margin: { left: 20, right: 20 },
          styles: {
            lineColor: [0, 0, 0],
            lineWidth: 0.5,
          },
        });

        // Save PDF
        const filename = `ICS-${
          formData.ics_number || item.item_code || "INVENTORY"
        }.pdf`;
        doc.save(filename);
        showToast.success("ICS generated successfully!");
      }

      handleClose();
    } catch (error) {
      console.error("ICS generation error:", error);
      showAlert.error("Error", error.message || "Failed to generate ICS");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 200);
  };

  const totalCost = (item.quantity || 1) * (parseFloat(item.unit_price) || 0);

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
                <i className="fas fa-file-invoice me-2"></i>
                Inventory Custodian Slip (ICS)
              </h5>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={handleClose}
                aria-label="Close"
                disabled={loading}
              ></button>
            </div>

            <div
              className="modal-body bg-light"
              style={{ maxHeight: "80vh", overflowY: "auto" }}
            >
              <div className="container-fluid px-3">
                {/* Header Section */}
                <div className="text-center mb-4">
                  <h4 className="fw-bold mb-1">INVENTORY AND CUSTODIAN SLIP</h4>
                  <div className="row g-3 mt-3">
                    <div className="col-md-4">
                      <label className="form-label small fw-semibold">
                        Entity Name
                      </label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={school?.name || ""}
                        readOnly
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label small fw-semibold">
                        Fund Cluster <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        name="fund_cluster"
                        value={formData.fund_cluster}
                        onChange={handleChange}
                        placeholder="e.g., QUALCI 6"
                        required
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label small fw-semibold">
                        ICS NO.
                      </label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        name="ics_number"
                        value={formData.ics_number || generateICSNumber()}
                        onChange={handleChange}
                        placeholder="Auto-generated"
                      />
                    </div>
                  </div>
                </div>

                {/* Item Details Table */}
                <div className="card border shadow-sm mb-4">
                  <div className="card-body p-0">
                    <table className="table table-bordered mb-0">
                      <thead className="table-light">
                        <tr>
                          <th style={{ width: "8%" }}>Quantity</th>
                          <th style={{ width: "8%" }}>Unit</th>
                          <th style={{ width: "12%" }}>Unit Cost</th>
                          <th style={{ width: "12%" }}>Total Cost</th>
                          <th style={{ width: "30%" }}>DESCRIPTION</th>
                          <th style={{ width: "15%" }}>Inventory Item No.</th>
                          <th style={{ width: "15%" }}>
                            Estimated Useful Life
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>{item.quantity || 1}</td>
                          <td>{item.unit_of_measure || "pcs"}</td>
                          <td>
                            ₱
                            {parseFloat(item.unit_price || 0).toLocaleString(
                              "en-PH",
                              {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              }
                            )}
                          </td>
                          <td>
                            ₱
                            {totalCost.toLocaleString("en-PH", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </td>
                          <td>{item.description || item.name}</td>
                          <td>{item.item_code || "N/A"}</td>
                          <td>
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              name="estimated_useful_life"
                              value={formData.estimated_useful_life}
                              onChange={handleChange}
                              placeholder="e.g., 3 YEARS"
                              required
                            />
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Signatures Section */}
                <div className="row g-4">
                  <div className="col-md-6">
                    <div className="card border shadow-sm">
                      <div className="card-body">
                        <h6 className="fw-semibold mb-3">Received by:</h6>
                        <div className="mb-3">
                          <label className="form-label small fw-semibold">
                            Printed Name
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            name="received_by_name"
                            value={formData.received_by_name}
                            onChange={handleChange}
                            required
                          />
                        </div>
                        <div className="mb-3">
                          <label className="form-label small fw-semibold">
                            Position
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            name="received_by_position"
                            value={formData.received_by_position}
                            onChange={handleChange}
                          />
                        </div>
                        <div className="mb-3">
                          <label className="form-label small fw-semibold">
                            Signature
                          </label>
                          <div
                            className="border rounded p-2"
                            style={{
                              minHeight: "80px",
                              backgroundColor: "#fff",
                            }}
                          >
                            <small className="text-muted">
                              Signature will be added in PDF
                            </small>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="card border shadow-sm">
                      <div className="card-body">
                        <h6 className="fw-semibold mb-3">Received from:</h6>
                        <div className="mb-3">
                          <label className="form-label small fw-semibold">
                            Printed Name
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            name="received_from_name"
                            value={formData.received_from_name}
                            onChange={handleChange}
                            required
                          />
                        </div>
                        <div className="mb-3">
                          <label className="form-label small fw-semibold">
                            Position
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            name="received_from_position"
                            value={formData.received_from_position}
                            onChange={handleChange}
                            required
                          />
                        </div>
                        <div className="mb-3">
                          <label className="form-label small fw-semibold">
                            Date
                          </label>
                          <input
                            type="date"
                            className="form-control"
                            name="date"
                            value={formData.date}
                            onChange={handleChange}
                            required
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer border-top bg-white">
              <button
                type="button"
                className="btn btn-outline-secondary btn-smooth"
                onClick={handleClose}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary btn-smooth"
                style={{ backgroundColor: "#0E254B", borderColor: "#0E254B" }}
                onClick={handleGenerate}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2"></span>
                    Generating...
                  </>
                ) : (
                  <>
                    <i className="fas fa-file-pdf me-1"></i>
                    Generate ICS PDF
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
};

export default ICSModal;
