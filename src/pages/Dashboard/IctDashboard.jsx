import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { showToast } from '../../services/notificationService';
import Loading from '../../components/Loading/Loading';
import Modal from '../../components/Modal/Modal';
import Tabs, { Tab, TabPanel } from '../../components/Tabs/Tabs';
import './Dashboard.css';

const IctDashboard = () => {
  const [settings, setSettings] = useState([]);
  const [backups, setBackups] = useState([]);
  const [propertyCustodians, setPropertyCustodians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSettingModal, setShowSettingModal] = useState(false);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [settingsRes, backupsRes, custodiansRes] = await Promise.all([
        api.get('/ict/settings'),
        api.get('/ict/backups'),
        api.get('/ict/property-custodians'),
      ]);

      setSettings(settingsRes.data?.data || settingsRes.data || []);
      setBackups(backupsRes.data?.data || backupsRes.data || []);
      setPropertyCustodians(custodiansRes.data?.data || custodiansRes.data || []);
    } catch (error) {
      showToast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBackup = async (e) => {
    e.preventDefault();
    try {
      await api.post('/ict/backups', formData);
      showToast.success('Backup created successfully');
      setShowBackupModal(false);
      setFormData({});
      loadData();
    } catch (error) {
      showToast.error('Failed to create backup');
    }
  };

  const handleRestoreBackup = async (id) => {
    if (window.confirm('Are you sure you want to restore this backup?')) {
      try {
        await api.post(`/ict/backups/${id}/restore`);
        showToast.success('Backup restored successfully');
        loadData();
      } catch (error) {
        showToast.error('Failed to restore backup');
      }
    }
  };

  if (loading) return <Loading fullScreen />;

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <h2>ICT Dashboard</h2>
      </div>

      <Tabs defaultTab={0}>
        <Tab label="System Settings" />
        <Tab label="Backups" />
        <Tab label="Property Custodians" />

        <TabPanel>
          <div className="table-responsive">
            <table className="table table-striped">
              <thead>
                <tr>
                  <th>Key</th>
                  <th>Value</th>
                  <th>Type</th>
                  <th>Description</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {settings.map((setting) => (
                  <tr key={setting.id}>
                    <td>{setting.key}</td>
                    <td>{setting.value}</td>
                    <td>{setting.type}</td>
                    <td>{setting.description}</td>
                    <td>
                      <button className="btn btn-sm btn-primary">Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabPanel>

        <TabPanel>
          <div className="mb-3">
            <button
              className="btn btn-primary"
              onClick={() => setShowBackupModal(true)}
            >
              <i className="fas fa-plus"></i> Create Backup
            </button>
          </div>
          <div className="table-responsive">
            <table className="table table-striped">
              <thead>
                <tr>
                  <th>Filename</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Created At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {backups.map((backup) => (
                  <tr key={backup.id}>
                    <td>{backup.filename}</td>
                    <td>{backup.type}</td>
                    <td>
                      <span className={`badge bg-${getStatusColor(backup.status)}`}>
                        {backup.status}
                      </span>
                    </td>
                    <td>{new Date(backup.created_at).toLocaleString()}</td>
                    <td>
                      {backup.status === 'completed' && (
                        <button
                          className="btn btn-sm btn-success"
                          onClick={() => handleRestoreBackup(backup.id)}
                        >
                          Restore
                        </button>
                      )}
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
                  <th>Position</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {propertyCustodians.map((custodian) => (
                  <tr key={custodian.id}>
                    <td>{custodian.employee_id}</td>
                    <td>{custodian.full_name}</td>
                    <td>{custodian.email}</td>
                    <td>{custodian.position}</td>
                    <td>
                      <span className={`badge bg-${custodian.is_active ? 'success' : 'danger'}`}>
                        {custodian.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabPanel>
      </Tabs>

      <Modal
        isOpen={showBackupModal}
        onClose={() => setShowBackupModal(false)}
        title="Create Backup"
      >
        <form onSubmit={handleCreateBackup}>
          <div className="mb-3">
            <label className="form-label">Backup Type</label>
            <select
              className="form-control"
              value={formData.type || ''}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              required
            >
              <option value="">Select Type</option>
              <option value="database">Database</option>
              <option value="full">Full</option>
            </select>
          </div>
          <div className="mb-3">
            <label className="form-label">Notes</label>
            <textarea
              className="form-control"
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>
          <button type="submit" className="btn btn-primary">Create Backup</button>
        </form>
      </Modal>
    </div>
  );
};

const getStatusColor = (status) => {
  const colors = {
    pending: 'warning',
    completed: 'success',
    failed: 'danger',
  };
  return colors[status] || 'secondary';
};

export default IctDashboard;

