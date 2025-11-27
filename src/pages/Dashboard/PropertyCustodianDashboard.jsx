import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { showAlert, showToast } from '../../services/notificationService';
import Loading from '../../components/Loading/Loading';
import Modal from '../../components/Modal/Modal';
import Tabs, { Tab, TabPanel } from '../../components/Tabs/Tabs';
import './Dashboard.css';

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
        api.get('/property-custodian/inventory'),
        api.get('/property-custodian/assigned-items'),
        api.get('/property-custodian/personnel'),
      ]);

      setInventory(invRes.data?.data || invRes.data || []);
      setAssignedItems(assignedRes.data?.data || assignedRes.data || []);
      setPersonnel(personnelRes.data?.data || personnelRes.data || []);
    } catch (error) {
      showToast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddInventory = async (e) => {
    e.preventDefault();
    try {
      await api.post('/property-custodian/inventory', formData);
      showToast.success('Inventory item added successfully');
      setShowInventoryModal(false);
      setFormData({});
      loadData();
    } catch (error) {
      showToast.error('Failed to add inventory item');
    }
  };

  const handleAssignItem = async (e) => {
    e.preventDefault();
    try {
      await api.post('/property-custodian/assigned-items', {
        ...formData,
        inventory_item_id: selectedItem.id,
      });
      showToast.success('Item assigned successfully');
      setShowAssignModal(false);
      setFormData({});
      setSelectedItem(null);
      loadData();
    } catch (error) {
      showToast.error('Failed to assign item');
    }
  };

  if (loading) return <Loading fullScreen />;

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
                      <span className={`badge bg-${getStatusColor(item.status)}`}>
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
                      <span className={`badge bg-${getStatusColor(item.status)}`}>
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

      <Modal
        isOpen={showInventoryModal}
        onClose={() => setShowInventoryModal(false)}
        title="Add Inventory Item"
      >
        <form onSubmit={handleAddInventory}>
          <div className="mb-3">
            <label className="form-label">Item Code</label>
            <input
              type="text"
              className="form-control"
              value={formData.item_code || ''}
              onChange={(e) => setFormData({ ...formData, item_code: e.target.value })}
              required
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Name</label>
            <input
              type="text"
              className="form-control"
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Category</label>
            <input
              type="text"
              className="form-control"
              value={formData.category || ''}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Quantity</label>
            <input
              type="number"
              className="form-control"
              value={formData.quantity || ''}
              onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value), available_quantity: parseInt(e.target.value) })}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary">Add Item</button>
        </form>
      </Modal>

      <Modal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        title="Assign Item"
      >
        {selectedItem && (
          <form onSubmit={handleAssignItem}>
            <div className="mb-3">
              <label className="form-label">Item</label>
              <input
                type="text"
                className="form-control"
                value={selectedItem.name}
                disabled
              />
            </div>
            <div className="mb-3">
              <label className="form-label">Personnel</label>
              <select
                className="form-control"
                value={formData.personnel_id || ''}
                onChange={(e) => setFormData({ ...formData, personnel_id: parseInt(e.target.value) })}
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
            <div className="mb-3">
              <label className="form-label">Quantity</label>
              <input
                type="number"
                className="form-control"
                max={selectedItem.available_quantity}
                value={formData.quantity || ''}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                required
              />
            </div>
            <div className="mb-3">
              <label className="form-label">Assigned Date</label>
              <input
                type="date"
                className="form-control"
                value={formData.assigned_date || new Date().toISOString().split('T')[0]}
                onChange={(e) => setFormData({ ...formData, assigned_date: e.target.value })}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary">Assign Item</button>
          </form>
        )}
      </Modal>
    </div>
  );
};

const getStatusColor = (status) => {
  const colors = {
    available: 'success',
    assigned: 'warning',
    maintenance: 'info',
    disposed: 'danger',
    active: 'success',
    returned: 'secondary',
    lost: 'danger',
    damaged: 'warning',
  };
  return colors[status] || 'secondary';
};

export default PropertyCustodianDashboard;

