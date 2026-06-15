import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { jsonCacheResponse } from "@/lib/api-cache";

export const dynamic = "force-dynamic";

const historyCacheHeaders = {
  "Cache-Control": "private, max-age=60, stale-while-revalidate=300",
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const studentId = id;
    const { searchParams } = new URL(request.url);
    const rawLimit = Number(searchParams.get("limit") || 100);
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 200) : 100;

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
      take: limit,
    });

    return jsonCacheResponse(request, attendances, historyCacheHeaders);
  } catch (error) {
    console.error("Error fetching session history:", error);
    return NextResponse.json(
      { error: "Failed to fetch session history" },
      { status: 500 }
    );
  }
}
