import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { showToast } from '../../services/notificationService';
import Loading from '../../components/Loading/Loading';
import './Dashboard.css';

const TeacherDashboard = () => {
  const [assignedItems, setAssignedItems] = useState([]);
  const [personnel, setPersonnel] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [assignedRes, personnelRes] = await Promise.all([
        api.get('/teacher/assigned-items'),
        api.get('/teacher/personnel/me'),
      ]);

      setAssignedItems(assignedRes.data?.data || assignedRes.data || []);
      setPersonnel(personnelRes.data);
    } catch (error) {
      showToast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePersonnel = async (e) => {
    e.preventDefault();
    try {
      await api.put('/teacher/personnel/me', personnel);
      showToast.success('Personnel details updated successfully');
      loadData();
    } catch (error) {
      showToast.error('Failed to update personnel details');
    }
  };

  if (loading) return <Loading fullScreen />;

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <h2>Teacher Dashboard</h2>
      </div>

      <div className="row">
        <div className="col-md-6">
          <div className="card">
            <div className="card-header">
              <h5>My Assigned Items</h5>
            </div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-striped">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Quantity</th>
                      <th>Assigned Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignedItems.map((item) => (
                      <tr key={item.id}>
                        <td>{item.inventory_item?.name}</td>
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
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card">
            <div className="card-header">
              <h5>My Personnel Details</h5>
            </div>
            <div className="card-body">
              {personnel && (
                <form onSubmit={handleUpdatePersonnel}>
                  <div className="mb-3">
                    <label className="form-label">Employee ID</label>
                    <input
                      type="text"
                      className="form-control"
                      value={personnel.employee_id}
                      disabled
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">First Name</label>
                    <input
                      type="text"
                      className="form-control"
                      value={personnel.first_name}
                      onChange={(e) => setPersonnel({ ...personnel, first_name: e.target.value })}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Last Name</label>
                    <input
                      type="text"
                      className="form-control"
                      value={personnel.last_name}
                      onChange={(e) => setPersonnel({ ...personnel, last_name: e.target.value })}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      className="form-control"
                      value={personnel.email}
                      onChange={(e) => setPersonnel({ ...personnel, email: e.target.value })}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Department</label>
                    <input
                      type="text"
                      className="form-control"
                      value={personnel.department || ''}
                      onChange={(e) => setPersonnel({ ...personnel, department: e.target.value })}
                    />
                  </div>
                  <button type="submit" className="btn btn-primary">Update Details</button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const getStatusColor = (status) => {
  const colors = {
    active: 'success',
    returned: 'secondary',
    lost: 'danger',
    damaged: 'warning',
  };
  return colors[status] || 'secondary';
};

export default TeacherDashboard;

