"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { checkCrmConnectionStatus } from "@/app/admin/leads/actions";

export default function DashboardLayout({ children, userRole = "ADMIN", userName = "Administrator" }: { children: React.ReactNode; userRole?: string; userName?: string }) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isCrmConnected, setIsCrmConnected] = useState<boolean | null>(null);

  useEffect(() => {
    async function fetchCrmStatus() {
      try {
        const res = await checkCrmConnectionStatus();
        setIsCrmConnected(!!res.connected);
      } catch (err) {
        console.error("Failed to check CRM connection status:", err);
        setIsCrmConnected(false);
      }
    }
    fetchCrmStatus();
  }, [pathname]); // Refresh when page changes to keep status fresh


  const sections = [
    {
      title: "MAIN MENU",
      items: [
        { title: "Dashboard", icon: "bi-grid", path: "/admin" },
        { title: "Agents", icon: "bi-headset", path: "/admin/agents" },
        { title: "Leads", icon: "bi-person-badge", path: "/admin/leads" },
        { title: "Calls", icon: "bi-telephone-outbound", path: "/admin/calls" },
        ...(userRole === "ADMIN" ? [
          { title: "Sales", icon: "bi-graph-up-arrow", path: "/admin/sales" }
        ] : []),
        { title: "Deals", icon: "bi-kanban", path: "/admin/deals" },
        ...(userRole === "ADMIN" ? [
          { title: "Users", icon: "bi-people", path: "/admin/users" }
        ] : []),
        { title: "CRM Sync", icon: "bi-cloud-arrow-up", path: "/admin/migration" }
      ]
    }
  ];

  return (
    <div className="dashboard-wrapper">
      {/* Sidebar */}
      <aside className={`sidebar ${isCollapsed ? "collapsed" : ""}`}>
        {/* Mobile Close Icon (visible only on mobile) */}
        <button 
          onClick={() => setIsCollapsed(false)}
          className="btn border-0 p-1 position-absolute d-md-none text-secondary"
          style={{ 
            top: "20px", 
            right: "20px", 
            zIndex: 1020, 
            backgroundColor: "transparent",
            outline: "none",
            cursor: "pointer",
            width: "auto",
            height: "auto",
            borderRadius: "0px"
          }}
          title="Close Menu"
        >
          <i className="bi bi-x-lg" style={{ fontSize: "18px" }}></i>
        </button>

        <Link href="/admin" className="sidebar-logo">
          <i className="bi bi-intersect text-success fs-2"></i>
          <span>Virpa</span>
        </Link>

        {sections.map((section, idx) => (
          section.items.length > 0 && (
            <div className="nav-section" key={idx}>
              <div className="nav-section-title">{section.title}</div>
              {section.items.map((item) => (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`nav-link ${pathname === item.path ? "active" : ""}`}
                >
                  <i className={`bi ${item.icon}`}></i>
                  <span>{item.title}</span>
                </Link>
              ))}
            </div>
          )
        ))}

        <div className="nav-section">
          <div className="nav-section-title">General</div>
          <Link href="/admin/settings" className={`nav-link ${pathname === "/admin/settings" ? "active" : ""}`}>
            <i className="bi bi-gear"></i>
            <span>Settings</span>
          </Link>
          <Link href="/login" className="nav-link text-danger mt-2">
            <i className="bi bi-box-arrow-right"></i>
            <span>Log out</span>
          </Link>
        </div>
      </aside>

      {/* Header */}
      <header className={`header ${isCollapsed ? "collapsed" : ""}`}>
        <div className="d-flex align-items-center gap-3">
          {/* Hamburger Menu Toggle Button */}
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)} 
            className="btn btn-light d-flex align-items-center justify-content-center p-0 border shadow-sm"
            style={{ 
              width: "40px", 
              height: "40px", 
              borderRadius: "10px", 
              backgroundColor: "#ffffff",
              transition: "transform 0.2s ease"
            }}
            title="Toggle Sidebar"
          >
            <i className="bi bi-list fs-4 text-dark"></i>
          </button>

          {isCrmConnected !== null && (
            <div className="d-flex align-items-center gap-2 px-3 py-1.5 rounded-pill border" style={{ 
              backgroundColor: isCrmConnected ? "rgba(0, 167, 111, 0.08)" : "rgba(108, 117, 125, 0.08)",
              borderColor: isCrmConnected ? "rgba(0, 167, 111, 0.2)" : "rgba(108, 117, 125, 0.2)"
            }}>
              <span className={`rounded-circle ${isCrmConnected ? "animate-pulse" : ""}`} style={{ 
                width: "8px", 
                height: "8px", 
                backgroundColor: isCrmConnected ? "#00A76F" : "#6c757d",
                display: "inline-block"
              }} />
              <span className="fw-bold" style={{ 
                fontSize: "12px", 
                color: isCrmConnected ? "#00A76F" : "#6c757d" 
              }}>
                {isCrmConnected ? "Bigin Connected" : "Bigin Disconnected"}
              </span>
            </div>
          )}
        </div>

        <div className="header-actions">
          <div className="dropdown ms-3">
            <div 
              className="d-flex align-items-center gap-2 cursor-pointer dropdown-toggle" 
              id="profileDropdown" 
              data-bs-toggle="dropdown" 
              aria-expanded="false"
            >
              <span className="small text-secondary fw-semibold d-none d-md-inline">{userName} ({userRole})</span>
              <div className="rounded-circle bg-secondary d-flex align-items-center justify-content-center text-white fw-bold" style={{ width: 40, height: 40 }}>
                {userName.charAt(0).toUpperCase()}
              </div>
            </div>
            <ul className="dropdown-menu dropdown-menu-end shadow border-0" aria-labelledby="profileDropdown">
              <li><div className="dropdown-header small text-muted border-bottom pb-2 mb-1">Signed in as <strong>{userName}</strong></div></li>
              <li><Link className="dropdown-item py-2" href="/admin/settings"><i className="bi bi-person me-2"></i> Profile</Link></li>
              <li><Link className="dropdown-item py-2" href="/admin/settings"><i className="bi bi-gear me-2"></i> Settings</Link></li>
              <li><hr className="dropdown-divider" /></li>
              <li><Link className="dropdown-item py-2 text-danger" href="/login"><i className="bi bi-box-arrow-right me-2"></i> Logout</Link></li>
            </ul>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className={`main-content ${isCollapsed ? "collapsed" : ""}`}>
        {children}
      </main>

      {/* Mobile Backdrop Overlay Drawer */}
      {isCollapsed && (
        <div 
          className="d-md-none position-fixed top-0 start-0 w-100 h-100" 
          style={{ 
            zIndex: 999, 
            backgroundColor: "rgba(15, 23, 42, 0.45)", 
            backdropFilter: "blur(3px)",
            WebkitBackdropFilter: "blur(3px)",
            transition: "all 0.3s ease" 
          }}
          onClick={() => setIsCollapsed(false)}
        />
      )}
    </div>
  );
}
