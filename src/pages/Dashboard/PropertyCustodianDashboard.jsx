import React, { useState, useEffect, useCallback } from "react";
import api from "../../utils/api";
import { showAlert, showToast } from "../../services/notificationService";
import Preloader from "../../components/Preloader";
import Portal from "../../components/Portal/Portal";
import Tabs, { Tab, TabPanel } from "../../components/Tabs/Tabs";
import "./Dashboard.css";

const PropertyCustodianDashboard = () => {
  const [inventory, setInventory] = useState([]);
  const [assignedItems, setAssignedItems] = useState([]);
  const [personnel, setPersonnel] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [invRes, assignedRes, personnelRes] = await Promise.all([
        api.get("/property-custodian/inventory"),
        api.get("/property-custodian/assigned-items"),
        api.get("/property-custodian/personnel"),
      ]);

      setInventory(invRes.data?.data || invRes.data || []);
      setAssignedItems(assignedRes.data?.data || assignedRes.data || []);
      setPersonnel(personnelRes.data?.data || personnelRes.data || []);
    } catch (error) {
      showToast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleAddInventory = async (e) => {
    e.preventDefault();
    try {
      await api.post("/property-custodian/inventory", formData);
      showToast.success("Inventory item added successfully");
      setShowInventoryModal(false);
      setFormData({});
      loadData();
    } catch (error) {
      showToast.error("Failed to add inventory item");
    }
  };

  const handleAssignItem = async (e) => {
    e.preventDefault();
    try {
      await api.post("/property-custodian/assigned-items", {
        ...formData,
        inventory_item_id: selectedItem.id,
      });
      showToast.success("Item assigned successfully");
      setShowAssignModal(false);
      setFormData({});
      setSelectedItem(null);
      loadData();
    } catch (error) {
      showToast.error("Failed to assign item");
    }
  };

  useEffect(() => {
    if (!showInventoryModal && !showAssignModal) return undefined;

    const handleEscape = (e) => {
      if (e.key === "Escape") {
        setShowInventoryModal(false);
        setShowAssignModal(false);
        setSelectedItem(null);
        setFormData({});
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [showInventoryModal, showAssignModal]);

  const closeInventoryModal = useCallback(() => {
    setShowInventoryModal(false);
    setFormData({});
  }, []);

  const closeAssignModal = useCallback(() => {
    setShowAssignModal(false);
    setSelectedItem(null);
    setFormData({});
  }, []);

  const renderInventoryModal = () => {
    if (!showInventoryModal) return null;

    const handleBackdropClick = (e) => {
      if (e.target === e.currentTarget) {
        closeInventoryModal();
      }
    };

    return (
      <Portal>
        <div
          className="modal fade show d-block modal-backdrop-animation"
          onClick={handleBackdropClick}
          tabIndex="-1"
        >
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 modal-content-animation">
              <div
                className="modal-header border-0 text-white"
                style={{ backgroundColor: "#2D5930" }}
              >
                <h5 className="modal-title fw-bold mb-0">
                  <i className="fas fa-box me-2"></i>
                  Add Inventory Item
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  aria-label="Close"
                  onClick={closeInventoryModal}
                ></button>
              </div>

              <form onSubmit={handleAddInventory}>
                <div className="modal-body bg-light">
                  <div className="mb-3">
                    <label className="form-label fw-semibold text-dark">
                      Item Code <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.item_code || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, item_code: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold text-dark">
                      Name <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.name || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold text-dark">
                      Category
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.category || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, category: e.target.value })
                      }
                    />
                  </div>

                  <div className="mb-0">
                    <label className="form-label fw-semibold text-dark">
                      Quantity <span className="text-danger">*</span>
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      value={formData.quantity || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          quantity: parseInt(e.target.value, 10),
                          available_quantity: parseInt(e.target.value, 10),
                        })
                      }
                      required
                    />
                  </div>
                </div>

                <div className="modal-footer bg-white border-top">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={closeInventoryModal}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Add Item
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </Portal>
    );
  };

  const renderAssignModal = () => {
    if (!showAssignModal || !selectedItem) return null;

    const handleBackdropClick = (e) => {
      if (e.target === e.currentTarget) {
        closeAssignModal();
      }
    };

    return (
      <Portal>
        <div
          className="modal fade show d-block modal-backdrop-animation"
          onClick={handleBackdropClick}
          tabIndex="-1"
        >
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 modal-content-animation">
              <div
                className="modal-header border-0 text-white"
                style={{ backgroundColor: "#2D5930" }}
              >
                <h5 className="modal-title fw-bold mb-0">
                  <i className="fas fa-share-square me-2"></i>
                  Assign Item
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  aria-label="Close"
                  onClick={closeAssignModal}
                ></button>
              </div>

              <form onSubmit={handleAssignItem}>
                <div className="modal-body bg-light">
                  <div className="mb-3">
                    <label className="form-label fw-semibold text-dark">
                      Item
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={selectedItem.name}
                      disabled
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold text-dark">
                      Personnel <span className="text-danger">*</span>
                    </label>
                    <select
                      className="form-select"
                      value={formData.personnel_id || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          personnel_id: parseInt(e.target.value, 10),
                        })
                      }
                      required
                    >
                      <option value="">Select Personnel</option>
                      {personnel.map((person) => (
                        <option key={person.id} value={person.id}>
                          {person.full_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold text-dark">
                        Quantity <span className="text-danger">*</span>
                      </label>
                      <input
                        type="number"
                        className="form-control"
                        max={selectedItem.available_quantity}
                        value={formData.quantity || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            quantity: parseInt(e.target.value, 10),
                          })
                        }
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold text-dark">
                        Assigned Date <span className="text-danger">*</span>
                      </label>
                      <input
                        type="date"
                        className="form-control"
                        value={
                          formData.assigned_date ||
                          new Date().toISOString().split("T")[0]
                        }
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            assigned_date: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="modal-footer bg-white border-top">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={closeAssignModal}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Assign Item
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </Portal>
    );
  };

  if (loading) return <Preloader />;

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <h2>Inventory Management</h2>
        <button
          className="btn btn-primary"
          onClick={() => setShowInventoryModal(true)}
        >
          <i className="fas fa-plus"></i> Add Inventory Item
        </button>
      </div>

      <Tabs defaultTab={0}>
        <Tab label="General Inventory" />
        <Tab label="Assigned Items" />
        <Tab label="Personnel" />

        <TabPanel>
          <div className="table-responsive">
            <table className="table table-striped">
              <thead>
                <tr>
                  <th>Item Code</th>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Quantity</th>
                  <th>Available</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {inventory.map((item) => (
                  <tr key={item.id}>
                    <td>{item.item_code}</td>
                    <td>{item.name}</td>
                    <td>{item.category}</td>
                    <td>{item.quantity}</td>
                    <td>{item.available_quantity}</td>
                    <td>
                      <span
                        className={`badge bg-${getStatusColor(item.status)}`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => {
                          setSelectedItem(item);
                          setShowAssignModal(true);
                        }}
                      >
                        Assign
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabPanel>

        <TabPanel>
          <div className="table-responsive">
            <table className="table table-striped">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Personnel</th>
                  <th>Quantity</th>
                  <th>Assigned Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {assignedItems.map((item) => (
                  <tr key={item.id}>
                    <td>{item.inventory_item?.name}</td>
                    <td>{item.personnel?.full_name}</td>
                    <td>{item.quantity}</td>
                    <td>{new Date(item.assigned_date).toLocaleDateString()}</td>
                    <td>
                      <span
                        className={`badge bg-${getStatusColor(item.status)}`}
                      >
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabPanel>

        <TabPanel>
          <div className="table-responsive">
            <table className="table table-striped">
              <thead>
                <tr>
                  <th>Employee ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Department</th>
                  <th>Position</th>
                </tr>
              </thead>
              <tbody>
                {personnel.map((person) => (
                  <tr key={person.id}>
                    <td>{person.employee_id}</td>
                    <td>{person.full_name}</td>
                    <td>{person.email}</td>
                    <td>{person.department}</td>
                    <td>{person.position}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabPanel>
      </Tabs>

      {renderInventoryModal()}
      {renderAssignModal()}
    </div>
  );
};

const getStatusColor = (status) => {
  const colors = {
    available: "success",
    assigned: "warning",
    maintenance: "info",
    disposed: "danger",
    active: "success",
    returned: "secondary",
    lost: "danger",
    damaged: "warning",
  };
  return colors[status] || "secondary";
};

export default PropertyCustodianDashboard;
