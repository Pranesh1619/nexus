"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const menuItems = [
    { title: "Dashboard", icon: "bi-grid", path: "/admin" },
    { title: "Leads", icon: "bi-person-badge", path: "/admin/leads" },
    { title: "Users", icon: "bi-people", path: "/admin/users" },
    { title: "Calls", icon: "bi-telephone-outbound", path: "/admin/calls" },
    { title: "Sales", icon: "bi-graph-up-arrow", path: "/admin/sales" },
  ];

  return (
    <div className="dashboard-wrapper">
      {/* Sidebar */}
      <aside className="sidebar">
        <Link href="/admin" className="sidebar-logo">
          <i className="bi bi-intersect text-success fs-2"></i>
          <span>Virpa</span>
        </Link>

        <div className="nav-section">
          <div className="nav-section-title">Main Menu</div>
          {menuItems.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              className={`nav-link ${pathname === item.path ? "active" : ""}`}
            >
              <i className={`bi ${item.icon}`}></i>
              {item.title}
            </Link>
          ))}
        </div>

        <div className="nav-section">
          <div className="nav-section-title">General</div>
          <Link href="/admin/settings" className={`nav-link ${pathname === "/admin/settings" ? "active" : ""}`}>
            <i className="bi bi-gear"></i>
            Settings
          </Link>
          <Link href="/login" className="nav-link text-danger mt-2">
            <i className="bi bi-box-arrow-right"></i>
            Log out
          </Link>
        </div>

        <div className="upgrade-card mt-auto">
          <h6>Upgrade Pro! 🚀</h6>
          <p>Higher productivity with better organization</p>
          <button className="btn btn-sm w-100">Upgrade</button>
        </div>
      </aside>

      {/* Header */}
      <header className="header">
        <div className="d-flex align-items-center gap-3">
          <div className="search-box">
            <i className="bi bi-search text-secondary"></i>
            <input type="text" placeholder="Search..." />
            <span className="badge bg-white text-dark border ms-auto">⌘ K</span>
          </div>
        </div>

        <div className="header-actions">
          <i className="bi bi-question-circle fs-5 text-secondary cursor-pointer"></i>
          <i className="bi bi-chat-dots fs-5 text-secondary cursor-pointer"></i>
          <i className="bi bi-bell fs-5 text-secondary cursor-pointer"></i>
          <div className="dropdown ms-3">
            <div 
              className="d-flex align-items-center gap-2 cursor-pointer dropdown-toggle" 
              id="profileDropdown" 
              data-bs-toggle="dropdown" 
              aria-expanded="false"
            >
              <div className="rounded-circle bg-secondary d-flex align-items-center justify-content-center text-white" style={{ width: 40, height: 40 }}>
                <i className="bi bi-person"></i>
              </div>
            </div>
            <ul className="dropdown-menu dropdown-menu-end shadow border-0" aria-labelledby="profileDropdown">
              <li><Link className="dropdown-item py-2" href="/admin/settings"><i className="bi bi-person me-2"></i> Profile</Link></li>
              <li><Link className="dropdown-item py-2" href="/admin/settings"><i className="bi bi-gear me-2"></i> Settings</Link></li>
              <li><hr className="dropdown-divider" /></li>
              <li><Link className="dropdown-item py-2 text-danger" href="/login"><i className="bi bi-box-arrow-right me-2"></i> Logout</Link></li>
            </ul>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
