import React from "react";
import Loader from "@/components/Loader";

export default function AdminLoading() {
  return (
    <div className="d-flex align-items-center justify-content-center" style={{ minHeight: "calc(100vh - 120px)" }}>
      <Loader />
    </div>
  );
}
