import React, { useState } from "react";
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
    // When navigating to another tab/route, collapse all nested menus.
    setExpandedMenus({});
    closeSidebarOnMobile();
  };

  const [expandedMenus, setExpandedMenus] = useState({
    "School Inventory": true,
  });

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
          label: "School Inventory",
          children: [
            {
              icon: "fas fa-box-open",
              label: "All Inventory",
              href: "/custodian/inventory",
            },
            {
              icon: "fas fa-layer-group",
              label: "Inventory Categories",
              href: "/custodian/inventory/categories",
            },
          ],
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
    {
      heading: "Programs",
      items: [
        {
          icon: "fas fa-desktop",
          label: "DCP Management",
          children: [
            {
              icon: "fas fa-boxes-stacked",
              label: "DCP Package",
              href: "/custodian/dcp-packages",
            },
            {
              icon: "fas fa-clipboard-list",
              label: "DCP Inventory",
              href: "/custodian/dcp-inventory",
            },
          ],
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
    {
      heading: "Programs",
      items: [
        {
          icon: "fas fa-boxes-stacked",
          label: "DCP Package",
          href: "/dashboard/ict/dcp-packages",
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

  const toggleMenuExpansion = (label) => {
    setExpandedMenus((prev) => {
      const willExpand = !prev[label];
      // Only one parent expanded at a time; closing others automatically.
      return willExpand ? { [label]: true } : {};
    });
  };

  const renderMenuSection = (section, index) => (
    <React.Fragment key={index}>
      <div className="sb-sidenav-menu-heading">{section.heading}</div>
      {section.items.map((item, itemIndex) => {
        const key = `${section.heading}-${item.label}-${itemIndex}`;
        if (item.children && item.children.length > 0) {
          const childIsActive = item.children.some((child) =>
            isActiveLink(child.href)
          );
          const activeChildLabel =
            item.children.find((child) => isActiveLink(child.href))?.label ||
            null;
          const isExpanded =
            expandedMenus[item.label] !== undefined
              ? expandedMenus[item.label]
              : childIsActive;

          const parentLinkStyle = {
            borderRadius: "0.35rem",
            fontWeight: 600,
            transition: "all 0.2s ease",
            minHeight: "48px",
          };

          const childWrapperStyle = {
            maxHeight: isExpanded ? `${item.children.length * 48 + 12}px` : 0,
            opacity: isExpanded ? 1 : 0,
            transform: isExpanded ? "translateY(0)" : "translateY(-6px)",
            overflow: "hidden",
            transition: "all 0.25s ease",
            pointerEvents: isExpanded ? "auto" : "none",
          };

          return (
            <div key={key} className="w-100">
              <div
                className={`nav-link d-flex align-items-center justify-content-between ${
                  childIsActive ? "child-active" : ""
                }`}
                role="button"
                tabIndex={0}
                style={parentLinkStyle}
                onClick={() => toggleMenuExpansion(item.label)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggleMenuExpansion(item.label);
                  }
                }}
              >
                <div className="d-flex align-items-center gap-2">
                  <div className="sb-nav-link-icon">
                    <i className={item.icon}></i>
                  </div>
                  <span>{item.label}</span>
                </div>
                <i
                  className={`fas fa-chevron-${
                    isExpanded ? "down" : "right"
                  } small`}
                  style={{ color: "rgba(255,255,255,0.65)" }}
                ></i>
              </div>
              <div
                className="ms-4 ps-3 border-start border-secondary border-opacity-25"
                style={childWrapperStyle}
              >
                {item.children.map((child, childIndex) => {
                  const childActive = isActiveLink(child.href);
                  const childLinkStyle = {
                    fontSize: "0.9rem",
                    marginLeft: "0.25rem",
                    borderRadius: "0.45rem",
                    paddingLeft: "2.75rem",
                    paddingRight: "1rem",
                    transition: "all 0.2s ease",
                    width: "100%",
                    minHeight: "44px",
                    display: "flex",
                    alignItems: "center",
                  };
                  return (
                    <Link
                      key={`${key}-child-${childIndex}`}
                      className={`nav-link py-1 ${childActive ? "active" : ""}`}
                      style={childLinkStyle}
                      to={child.href}
                      onClick={handleLinkClick}
                    >
                      <div className="sb-nav-link-icon">
                        <i className={child.icon}></i>
                      </div>
                      {child.label}
                      {childActive && (
                        <span className="position-absolute top-50 end-0 translate-middle-y me-3">
                          <i className="fas fa-chevron-right small"></i>
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        }

        const isActive = isActiveLink(item.href);
        return (
          <Link
            key={key}
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

          {/* Profile - ICT, Accounting, Teacher use /profile. Property Custodian uses /custodian/profile */}
          <Link
            className={`nav-link ${
              isPropertyCustodian
                ? isActiveLink("/custodian/profile")
                  ? "active"
                  : ""
                : isActiveLink("/profile")
                ? "active"
                : ""
            }`}
            to={isPropertyCustodian ? "/custodian/profile" : "/profile"}
            onClick={handleLinkClick}
          >
            <div className="sb-nav-link-icon">
              <i className="fas fa-user"></i>
            </div>
            {isPropertyCustodian ? "School Profile" : "Profile"}
            {(isPropertyCustodian
              ? isActiveLink("/custodian/profile")
              : isActiveLink("/profile")) && (
              <span className="position-absolute top-50 end-0 translate-middle-y me-3">
                <i className="fas fa-chevron-right small"></i>
              </span>
            )}
          </Link>

          {/* Settings - Show for ALL roles, but route differs for Property Custodian */}
          <Link
            className={`nav-link ${
              isPropertyCustodian
                ? isActiveLink("/custodian/settings")
                  ? "active"
                  : ""
                : isActiveLink("/settings")
                ? "active"
                : ""
            }`}
            to={isPropertyCustodian ? "/custodian/settings" : "/settings"}
            onClick={handleLinkClick}
          >
            <div className="sb-nav-link-icon">
              <i className="fas fa-cog"></i>
            </div>
            {isPropertyCustodian ? "Account Settings" : "Settings"}
            {(isPropertyCustodian
              ? isActiveLink("/custodian/settings")
              : isActiveLink("/settings")) && (
              <span className="position-absolute top-50 end-0 translate-middle-y me-3">
                <i className="fas fa-chevron-right small"></i>
              </span>
            )}
          </Link>
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
