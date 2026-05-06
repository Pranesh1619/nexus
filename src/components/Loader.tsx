import React from "react";

export default function Loader() {
  return (
    <div className="d-flex flex-column align-items-center justify-content-center p-5">
      <div 
        className="spinner-border mb-3" 
        role="status" 
        style={{ width: "3rem", height: "3rem", borderWidth: "0.25em", color: "var(--primary-color)" }}
      >
        <span className="visually-hidden">Loading...</span>
      </div>
      <p className="text-secondary fw-medium">Loading data...</p>
    </div>
  );
}

export function SkeletonRow({ columns }: { columns: number }) {
  return (
    <tr className="skeleton-row">
      {[...Array(columns)].map((_, i) => (
        <td key={i}>
          <div 
            className="skeleton-box" 
            style={{ 
              height: "20px", 
              width: "100%", 
              backgroundColor: "#f0f0f0", 
              borderRadius: "4px"
            }}
          ></div>
        </td>
      ))}
    </tr>
  );
}
