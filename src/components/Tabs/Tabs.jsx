import React, { useState, useEffect } from 'react';
import './Tabs.css';

const Tabs = ({ children, defaultTab = 0 }) => {
  const [activeTab, setActiveTab] = useState(defaultTab);

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  const tabs = React.Children.toArray(children).filter(child => child.type === Tab);
  const tabPanels = React.Children.toArray(children).filter(child => child.type === TabPanel);

  return (
    <div className="tabs-container">
      <div className="tabs-header">
        {tabs.map((tab, index) => (
          <button
            key={index}
            className={`tab-button ${activeTab === index ? 'active' : ''}`}
            onClick={() => setActiveTab(index)}
          >
            {tab.props.label}
            {tab.props.badge && (
              <span className="tab-badge">{tab.props.badge}</span>
            )}
          </button>
        ))}
      </div>
      <div className="tabs-content">
        {tabPanels.map((panel, index) => (
          <div
            key={index}
            className={`tab-panel ${activeTab === index ? 'active' : ''}`}
          >
            {panel}
          </div>
        ))}
      </div>
    </div>
  );
};

export const Tab = ({ children }) => children;
export const TabPanel = ({ children }) => children;

export default Tabs;

