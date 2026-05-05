"use client";

import React from "react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from "recharts";

const data = [
  { name: "Jan", earnings: 4000 },
  { name: "Feb", earnings: 3000 },
  { name: "Mar", earnings: 2000 },
  { name: "Apr", earnings: 2780 },
  { name: "May", earnings: 1890 },
  { name: "Jun", earnings: 2390 },
  { name: "Jul", earnings: 3490 },
  { name: "Aug", earnings: 4490 },
  { name: "Sep", earnings: 3000 },
  { name: "Oct", earnings: 2000 },
  { name: "Nov", earnings: 2780 },
  { name: "Dec", earnings: 1890 },
];

export default function AdminDashboard() {
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setIsMounted(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="container-fluid p-0">
      <div className="mb-4">
        <h2 className="fw-bold mb-1">Welcome back Pranesh</h2>
        <p className="text-secondary small">Monitor and control what happens with your money today for financial health.</p>
      </div>

      {/* Stats Cards */}
      <div className="row g-4 mb-4">
        <div className="col-md-4">
          <div className="card h-100 p-4">
            <div className="stats-card">
              <div className="d-flex justify-content-between align-items-center">
                <div className="stats-icon bg-success bg-opacity-10 text-success">
                  <i className="bi bi-wallet2"></i>
                </div>
                <div className="dropdown">
                  <button className="btn btn-sm btn-light border-0" type="button">
                    USD <i className="bi bi-chevron-down ms-1"></i>
                  </button>
                </div>
              </div>
              <div>
                <div className="stats-title">Account Balance</div>
                <div className="stats-value">$35,340.89</div>
                <div className="small mt-1">
                  <span className="text-success fw-bold">+5.2%</span> <span className="text-secondary">from last month</span>
                </div>
              </div>
              <div className="d-flex gap-2 mt-2">
                <button className="btn btn-primary btn-sm flex-grow-1">
                  <i className="bi bi-send me-2"></i> Send Money
                </button>
                <button className="btn btn-light btn-sm flex-grow-1 border">
                  <i className="bi bi-download me-2"></i> Request Money
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card h-100 p-4">
            <div className="stats-card">
              <div className="d-flex justify-content-between align-items-center">
                <div className="stats-icon bg-danger bg-opacity-10 text-danger">
                  <i className="bi bi-graph-down-arrow"></i>
                </div>
                <button className="btn btn-sm btn-light border-0">
                  <i className="bi bi-three-dots"></i>
                </button>
              </div>
              <div>
                <div className="stats-title">Total Expenses</div>
                <div className="stats-value">$9,845.20</div>
                <div className="small mt-1">
                  <span className="text-danger fw-bold">-2.1%</span> <span className="text-secondary">from last month</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card h-100 p-4">
            <div className="stats-card">
              <div className="d-flex justify-content-between align-items-center">
                <div className="stats-icon bg-info bg-opacity-10 text-info">
                  <i className="bi bi-piggy-bank"></i>
                </div>
                <button className="btn btn-sm btn-light border-0">
                  <i className="bi bi-three-dots"></i>
                </button>
              </div>
              <div>
                <div className="stats-title">Total Savings</div>
                <div className="stats-value">$18,420.75</div>
                <div className="small mt-1">
                  <span className="text-success fw-bold">+4.5%</span> <span className="text-secondary">from last month</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4">
        {/* Chart Column */}
        <div className="col-lg-8">
          <div className="card mb-4 p-4">
            <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
              <h5 className="fw-bold mb-0">Performance Overview</h5>
              <div className="d-flex gap-2 align-items-center">
                <select className="form-select form-select-sm bg-light border-0 w-auto">
                  <option>All Modules</option>
                  <option>Sales</option>
                  <option>Support</option>
                  <option>Leads</option>
                </select>
                <select className="form-select form-select-sm bg-light border-0 w-auto">
                  <option>All Leads</option>
                  <option>High Potential</option>
                  <option>Interested</option>
                </select>
                <select className="form-select form-select-sm bg-primary bg-opacity-10 text-primary border-0 w-auto">
                  <option>This Year</option>
                  <option>Last Year</option>
                </select>
              </div>
            </div>
            <div className="chart-container" style={{ height: 300, width: "100%", minHeight: 300 }}>
              {isMounted && (
                <ResponsiveContainer width="99.9%" height={300}>
                  <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: '#919EAB', fontSize: 12}} 
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: '#919EAB', fontSize: 12}}
                      tickFormatter={(value) => `$${value/1000}k`}
                    />
                    <Tooltip 
                      cursor={{fill: '#f4f6f8'}} 
                      contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 8px 16px 0 rgba(145, 158, 171, 0.24)'}}
                    />
                    <Bar dataKey="earnings" radius={[4, 4, 0, 0]} barSize={30}>
                      {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 7 ? '#00A76F' : '#00A76F22'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="card p-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h5 className="fw-bold mb-0">Recent Transaction</h5>
              <button className="btn btn-sm btn-light border">Filter <i className="bi bi-filter ms-1"></i></button>
            </div>
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="border-0 small text-secondary">Activity</th>
                    <th className="border-0 small text-secondary">Date</th>
                    <th className="border-0 small text-secondary">Price</th>
                    <th className="border-0 small text-secondary">Status</th>
                    <th className="border-0 small text-secondary"></th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <div className="d-flex align-items-center gap-3">
                        <div className="bg-primary bg-opacity-10 text-primary rounded-circle d-flex align-items-center justify-content-center" style={{width: 32, height: 32}}>
                          <i className="bi bi-phone small"></i>
                        </div>
                        <span className="fw-semibold small">Mobile App Purchase</span>
                      </div>
                    </td>
                    <td className="small text-secondary">Wed, 12 Jun 2026</td>
                    <td className="small fw-bold">$806.50</td>
                    <td><span className="badge bg-success bg-opacity-10 text-success rounded-pill px-3 py-2 small">Success</span></td>
                    <td className="text-end"><i className="bi bi-three-dots-vertical text-secondary"></i></td>
                  </tr>
                  <tr>
                    <td>
                      <div className="d-flex align-items-center gap-3">
                        <div className="bg-danger bg-opacity-10 text-danger rounded-circle d-flex align-items-center justify-content-center" style={{width: 32, height: 32}}>
                          <i className="bi bi-laptop small"></i>
                        </div>
                        <span className="fw-semibold small">Software License</span>
                      </div>
                    </td>
                    <td className="small text-secondary">Tue, 11 Jun 2026</td>
                    <td className="small fw-bold">$102.99</td>
                    <td><span className="badge bg-success bg-opacity-10 text-success rounded-pill px-3 py-2 small">Success</span></td>
                    <td className="text-end"><i className="bi bi-three-dots-vertical text-secondary"></i></td>
                  </tr>
                  <tr>
                    <td>
                      <div className="d-flex align-items-center gap-3">
                        <div className="bg-warning bg-opacity-10 text-warning rounded-circle d-flex align-items-center justify-content-center" style={{width: 32, height: 32}}>
                          <i className="bi bi-basket small"></i>
                        </div>
                        <span className="fw-semibold small">Grocery Purchase</span>
                      </div>
                    </td>
                    <td className="small text-secondary">Sun, 09 Jun 2026</td>
                    <td className="small fw-bold">$2,500.00</td>
                    <td><span className="badge bg-success bg-opacity-10 text-success rounded-pill px-3 py-2 small">Success</span></td>
                    <td className="text-end"><i className="bi bi-three-dots-vertical text-secondary"></i></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar Cards Column */}
        <div className="col-lg-4">
          <div className="card mb-4 p-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="fw-bold mb-0">My Wallet</h6>
              <button className="btn btn-sm btn-link text-success text-decoration-none p-0 fw-bold">+ Add New</button>
            </div>
            <div className="row g-3">
              <div className="col-6">
                <div className="p-3 border rounded-3 bg-light bg-opacity-50">
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <img src="https://flagcdn.com/w20/us.png" width="20" alt="US" />
                    <span className="small fw-bold text-secondary">USD</span>
                  </div>
                  <div className="fw-bold">$22,678.00</div>
                  <div className="text-success x-small fw-bold mt-1">Active</div>
                </div>
              </div>
              <div className="col-6">
                <div className="p-3 border rounded-3 bg-light bg-opacity-50">
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <img src="https://flagcdn.com/w20/eu.png" width="20" alt="EU" />
                    <span className="small fw-bold text-secondary">EUR</span>
                  </div>
                  <div className="fw-bold">€18,345.00</div>
                  <div className="text-success x-small fw-bold mt-1">Active</div>
                </div>
              </div>
            </div>
          </div>

          <div className="card p-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="fw-bold mb-0">My Savings Plan</h6>
              <button className="btn btn-sm btn-light border-0"><i className="bi bi-three-dots"></i></button>
            </div>
            
            <div className="mb-4">
              <div className="d-flex align-items-center gap-2 mb-3">
                <div className="bg-info bg-opacity-10 text-info rounded-circle p-2 d-flex align-items-center justify-content-center" style={{width: 32, height: 32}}>
                  <i className="bi bi-lightbulb small"></i>
                </div>
                <span className="small fw-bold">Investment Goal</span>
              </div>
              <div className="d-flex justify-content-between small mb-1">
                <span className="text-secondary">$15,600/$25,000</span>
                <span className="fw-bold">62%</span>
              </div>
              <div className="progress" style={{height: 6}}>
                <div className="progress-bar bg-info" role="progressbar" style={{width: '62%'}}></div>
              </div>
            </div>

            <div>
              <div className="d-flex align-items-center gap-2 mb-2">
                <div className="bg-warning bg-opacity-10 text-warning rounded-circle p-2 d-flex align-items-center justify-content-center" style={{width: 32, height: 32}}>
                  <i className="bi bi-chat-left-dots small"></i>
                </div>
                <span className="small fw-bold">Emergency Fund</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
