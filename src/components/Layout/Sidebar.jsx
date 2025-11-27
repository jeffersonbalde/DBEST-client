import React from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useLocation, Link } from "react-router-dom";

const Sidebar = ({ onCloseSidebar }) => {
  const { user, isPropertyCustodian, isTeacher, isIct, isAccounting } =
    useAuth();

  const location = useLocation();

  const isActiveLink = (href) => {
    if (!href) return false;
    try {
      const linkUrl = new URL(href, window.location.origin);
      if (location.pathname !== linkUrl.pathname) {
        return false;
      }
      if (!linkUrl.search) {
        return true;
      }
      const targetParams = new URLSearchParams(linkUrl.search);
      const currentParams = new URLSearchParams(location.search);
      for (const [key, value] of targetParams.entries()) {
        if (currentParams.get(key) !== value) {
          return false;
        }
      }
      return true;
    } catch (error) {
      return location.pathname === href;
    }
  };

  const closeSidebarOnMobile = () => {
    if (window.innerWidth < 768 && onCloseSidebar) {
      onCloseSidebar();
    }
  };

  const handleLinkClick = () => {
    closeSidebarOnMobile();
  };

  // Property Custodian Menu Items
  const propertyCustodianMenuItems = [
    {
      heading: "Core",
      items: [
        {
          icon: "fas fa-tachometer-alt",
          label: "Dashboard",
          href: "/custodian",
        },
      ],
    },
    {
      heading: "Inventory Management",
      items: [
        {
          icon: "fas fa-box",
          label: "Inventory",
          href: "/custodian/inventory",
        },
        {
          icon: "fas fa-clipboard-list",
          label: "Assigned Items",
          href: "/custodian/assigned-items",
        },
      ],
    },
    {
      heading: "Personnel",
      items: [
        {
          icon: "fas fa-users",
          label: "Personnel Management",
          href: "/custodian/personnel",
        },
      ],
    },
    {
      heading: "Reports",
      items: [
        {
          icon: "fas fa-chart-bar",
          label: "Inventory Reports",
          href: "/custodian/reports",
        },
      ],
    },
  ];

  // Teacher Menu Items
  const teacherMenuItems = [
    {
      heading: "Dashboard",
      items: [
        { icon: "fas fa-tachometer-alt", label: "Overview", href: "/faculty" },
      ],
    },
    {
      heading: "My Account",
      items: [
        {
          icon: "fas fa-box",
          label: "My Items",
          href: "/faculty/assigned-items",
        },
        {
          icon: "fas fa-user",
          label: "My Profile",
          href: "/faculty/profile",
        },
      ],
    },
  ];

  // ICT Menu Items
  const ictMenuItems = [
    {
      heading: "Core",
      items: [
        {
          icon: "fas fa-tachometer-alt",
          label: "Dashboard",
          href: "/dashboard",
        },
      ],
    },
    {
      heading: "System Management",
      items: [
        {
          icon: "fas fa-database",
          label: "Backups",
          href: "/backups",
        },
      ],
    },
    {
      heading: "User Management",
      items: [
        {
          icon: "fas fa-school",
          label: "DepEd Schools",
          href: "/dashboard/ict/schools",
        },
        {
          icon: "fas fa-users",
          label: "Property Custodians",
          href: "/dashboard/ict/custodians",
        },
        {
          icon: "fas fa-user-plus",
          label: "Accounting",
          href: "/dashboard/ict/accounting",
        },
      ],
    },
  ];

  // Accounting Menu Items
  const accountingMenuItems = [
    {
      heading: "Dashboard",
      items: [
        { icon: "fas fa-tachometer-alt", label: "Overview", href: "/finance" },
      ],
    },
    {
      heading: "Analytics",
      items: [
        {
          icon: "fas fa-chart-line",
          label: "Inventory Analytics",
          href: "/finance/analytics",
        },
        {
          icon: "fas fa-list",
          label: "Inventory List",
          href: "/finance/inventory",
        },
      ],
    },
  ];

  // Determine menu items based on user type
  let menuItems = [];

  if (isPropertyCustodian) {
    menuItems = propertyCustodianMenuItems;
  } else if (isTeacher) {
    menuItems = teacherMenuItems;
  } else if (isIct) {
    menuItems = ictMenuItems;
  } else if (isAccounting) {
    menuItems = accountingMenuItems;
  } else {
    menuItems = [];
  }

  const renderMenuSection = (section, index) => (
    <React.Fragment key={index}>
      <div className="sb-sidenav-menu-heading">{section.heading}</div>
      {section.items.map((item, itemIndex) => {
        const isActive = isActiveLink(item.href);
        return (
          <Link
            key={itemIndex}
            className={`nav-link ${isActive ? "active" : ""}`}
            to={item.href}
            onClick={handleLinkClick}
          >
            <div className="sb-nav-link-icon">
              <i className={item.icon}></i>
            </div>
            {item.label}
            {isActive && (
              <span className="position-absolute top-50 end-0 translate-middle-y me-3">
                <i className="fas fa-chevron-right small"></i>
              </span>
            )}
          </Link>
        );
      })}
    </React.Fragment>
  );

  // Get role display text
  const getRoleDisplay = () => {
    if (isIct) return "ICT Administrator";
    if (isAccounting) return "Accounting";
    if (isPropertyCustodian) return "Property Custodian";
    if (isTeacher) return "Teacher";
    return "User";
  };

  // Get user display name
  const getUserDisplayName = () => {
    if (user?.first_name && user?.last_name) {
      return `${user.first_name} ${user.last_name}`;
    }
    if (user?.first_name) {
      return user.first_name;
    }
    return user?.employee_id || "User";
  };

  return (
    <nav className="sb-sidenav accordion sb-sidenav-dark" id="sidenavAccordion">
      <div className="sb-sidenav-menu">
        <div className="nav">
          {menuItems.map(renderMenuSection)}

          {/* Common Settings for All Users */}
          <div className="sb-sidenav-menu-heading">Settings</div>

          {/* Profile - Show for ALL users */}
          <Link
            className={`nav-link ${isActiveLink("/profile") ? "active" : ""}`}
            to="/profile"
            onClick={handleLinkClick}
          >
            <div className="sb-nav-link-icon">
              <i className="fas fa-user"></i>
            </div>
            Profile
            {isActiveLink("/profile") && (
              <span className="position-absolute top-50 end-0 translate-middle-y me-3">
                <i className="fas fa-chevron-right small"></i>
              </span>
            )}
          </Link>

          {/* Settings - Show for ICT and Accounting */}
          {(isIct || isAccounting) && (
            <Link
              className={`nav-link ${
                isActiveLink("/settings") ? "active" : ""
              }`}
              to="/settings"
              onClick={handleLinkClick}
            >
              <div className="sb-nav-link-icon">
                <i className="fas fa-cog"></i>
              </div>
              Settings
              {isActiveLink("/settings") && (
                <span className="position-absolute top-50 end-0 translate-middle-y me-3">
                  <i className="fas fa-chevron-right small"></i>
                </span>
              )}
            </Link>
          )}
        </div>
      </div>

      <div className="sb-sidenav-footer">
        <div className="small">Logged in as:</div>
        <span className="user-name">{getUserDisplayName()}</span>
        <div className="small text-muted">{getRoleDisplay()}</div>
      </div>
    </nav>
  );
};

export default Sidebar;
