import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const studentId = id;

    // Get detailed attendance records
    const attendances = await prisma.attendance.findMany({
      where: {
        studentId: studentId,
      },
      include: {
        teacher: {
          include: {
            user: true,
          },
        },
        program: true,
        package: true,
      },
      orderBy: {
        checkIn: "desc",
      },
    });

    return NextResponse.json(attendances);
  } catch (error) {
    console.error("Error fetching session history:", error);
    return NextResponse.json(
      { error: "Failed to fetch session history" },
      { status: 500 }
    );
  }
}
