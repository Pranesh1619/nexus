import React from "react";

export default function Loader() {
  return (
    <div className="d-flex flex-column align-items-center justify-content-center p-5">
      <div className="spinner-border text-primary mb-3" role="status" style={{ width: '3rem', height: '3rem' }}>
        <span className="visually-hidden">Loading...</span>
      </div>
      <p className="text-secondary fw-medium">Loading data...</p>
      
      <style jsx>{`
        .spinner-border {
          border-width: 0.25em;
        }
      `}</style>
    </div>
  );
}

export function SkeletonRow({ columns }: { columns: number }) {
  return (
    <tr className="skeleton-row">
      {[...Array(columns)].map((_, i) => (
        <td key={i}>
          <div className="skeleton-box" style={{ height: '20px', width: '100%', backgroundColor: '#f0f0f0', borderRadius: '4px' }}></div>
        </td>
      ))}
      <style jsx>{`
        .skeleton-box {
          animation: skeleton-loading 1.5s infinite linear;
        }
        @keyframes skeleton-loading {
          0% { opacity: 0.5; }
          50% { opacity: 1; }
          100% { opacity: 0.5; }
        }
      `}</style>
    </tr>
  );
}
