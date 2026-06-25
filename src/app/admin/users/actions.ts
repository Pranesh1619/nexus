"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getAllUsers() {
  return await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
  });
}

export async function createUser(formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = (formData.get("password") as string) || "123456";
  const role = formData.get("role") as string;
  const phone = formData.get("phone") as string;

  if (!name || !email || !role) {
    throw new Error("All fields (Name, Email, and Role) are mandatory.");
  }

  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const creatorCompanyId = cookieStore.get("user_company_id")?.value;

  const newUser = await prisma.user.create({
    data: {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      role,
      phone: phone ? phone.trim() : null,
    },
  });

  // Assign companyId: New Company Admin starts their own company,
  // whereas Sales agents belong to the creator's company.
  let assignedCompanyId: string;
  if (role === "COMPANY_ADMIN") {
    assignedCompanyId = newUser.id;
  } else {
    assignedCompanyId = creatorCompanyId || "nexus";
  }

  await prisma.user.update({
    where: { id: newUser.id },
    data: { companyId: assignedCompanyId },
  });

  revalidatePath("/admin/users");
}

export async function deleteUser(id: string) {
  await prisma.user.delete({
    where: { id },
  });

  revalidatePath("/admin/users");
}

export async function getUserById(id: string) {
  return await prisma.user.findUnique({
    where: { id },
  });
}

export async function updateUser(id: string, formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const role = formData.get("role") as string;
  const status = formData.get("status") as string;
  const phone = formData.get("phone") as string;

  await prisma.user.update({
    where: { id },
    data: {
      name,
      email,
      role,
      status,
      phone: phone ? phone.trim() : null,
    },
  });

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${id}`);
}
