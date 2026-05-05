"use client";

import React from "react";
import DeleteButton from "@/components/DeleteButton";
import { deleteLead } from "../actions";
import { useRouter } from "next/navigation";

export default function LeadDeleteWrapper({ id }: { id: string }) {
  const router = useRouter();

  async function handleDelete() {
    await deleteLead(id);
    router.push("/admin/leads");
  }

  return (
    <DeleteButton 
      id={id} 
      onDelete={handleDelete} 
      title="Delete Lead?" 
      message="This will permanently remove this lead and all associated call logs."
    />
  );
}
