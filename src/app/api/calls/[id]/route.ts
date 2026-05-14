import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const callLog = await prisma.callLog.findUnique({
      where: { id },
      include: {
        lead: true,
        user: true,
      },
    });

    if (!callLog) {
      return NextResponse.json({ success: false, error: "Call log not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: callLog });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    const existingCall = await prisma.callLog.findUnique({ where: { id } });
    if (!existingCall) {
      return NextResponse.json({ success: false, error: "Call log not found" }, { status: 404 });
    }

    const updated = await prisma.callLog.update({
      where: { id },
      data: body,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const existingCall = await prisma.callLog.findUnique({ where: { id } });
    if (!existingCall) {
      return NextResponse.json({ success: false, error: "Call log not found" }, { status: 404 });
    }

    await prisma.callLog.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Call log deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
