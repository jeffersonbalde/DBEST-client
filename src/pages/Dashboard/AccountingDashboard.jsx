import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { showToast } from '../../services/notificationService';
import Loading from '../../components/Loading/Loading';
import Tabs, { Tab, TabPanel } from '../../components/Tabs/Tabs';
import './Dashboard.css';

const AccountingDashboard = () => {
  const [analytics, setAnalytics] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [financial, setFinancial] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [analyticsRes, inventoryRes, financialRes] = await Promise.all([
        api.get('/accounting/analytics'),
        api.get('/accounting/inventory'),
        api.get('/accounting/analytics/financial'),
      ]);

      setAnalytics(analyticsRes.data);
      setInventory(inventoryRes.data.data || []);
      setFinancial(financialRes.data);
    } catch (error) {
      showToast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loading fullScreen />;

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <h2>Accounting Dashboard</h2>
      </div>

      <Tabs defaultTab={0}>
        <Tab label="Inventory Analytics" />
        <Tab label="Detailed Inventory List" />
        <Tab label="Financial Analytics" />

        <TabPanel>
          {analytics && (
            <div className="row">
              <div className="col-md-3">
                <div className="card text-center">
                  <div className="card-body">
                    <h5 className="card-title">Total Items</h5>
                    <h3 className="text-primary">{analytics.total_items}</h3>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card text-center">
                  <div className="card-body">
                    <h5 className="card-title">Total Quantity</h5>
                    <h3 className="text-primary">{analytics.total_quantity}</h3>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card text-center">
                  <div className="card-body">
                    <h5 className="card-title">Total Value</h5>
                    <h3 className="text-success">₱{analytics.total_value?.toLocaleString()}</h3>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card text-center">
                  <div className="card-body">
                    <h5 className="card-title">Available</h5>
                    <h3 className="text-info">{analytics.available_quantity}</h3>
                  </div>
                </div>
              </div>

              <div className="col-md-12 mt-4">
                <div className="card">
                  <div className="card-header">
                    <h5>By Category</h5>
                  </div>
                  <div className="card-body">
                    <div className="table-responsive">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Category</th>
                            <th>Count</th>
                            <th>Quantity</th>
                            <th>Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(analytics.by_category || {}).map(([category, data]) => (
                            <tr key={category}>
                              <td>{category || 'Uncategorized'}</td>
                              <td>{data.count}</td>
                              <td>{data.quantity}</td>
                              <td>₱{data.value?.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </TabPanel>

        <TabPanel>
          <div className="table-responsive">
            <table className="table table-striped">
              <thead>
                <tr>
                  <th>Item Code</th>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Quantity</th>
                  <th>Unit Price</th>
                  <th>Total Value</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {inventory.map((item) => (
                  <tr key={item.id}>
                    <td>{item.item_code}</td>
                    <td>{item.name}</td>
                    <td>{item.category}</td>
                    <td>{item.quantity}</td>
                    <td>₱{item.unit_price?.toLocaleString()}</td>
                    <td>₱{(item.quantity * item.unit_price)?.toLocaleString()}</td>
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
          {financial && (
            <div className="row">
              <div className="col-md-4">
                <div className="card text-center">
                  <div className="card-body">
                    <h5 className="card-title">Total Inventory Value</h5>
                    <h3 className="text-primary">₱{financial.total_inventory_value?.toLocaleString()}</h3>
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="card text-center">
                  <div className="card-body">
                    <h5 className="card-title">Available Value</h5>
                    <h3 className="text-success">₱{financial.available_inventory_value?.toLocaleString()}</h3>
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="card text-center">
                  <div className="card-body">
                    <h5 className="card-title">Assigned Value</h5>
                    <h3 className="text-warning">₱{financial.assigned_inventory_value?.toLocaleString()}</h3>
                  </div>
                </div>
              </div>
            </div>
          )}
        </TabPanel>
      </Tabs>
    </div>
  );
};

const getStatusColor = (status) => {
  const colors = {
    available: 'success',
    assigned: 'warning',
    maintenance: 'info',
    disposed: 'danger',
  };
  return colors[status] || 'secondary';
};

export default AccountingDashboard;

