import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getProjectFlowStudentAssignment } from "@/lib/projectflow";
import { jsonCacheResponse } from "@/lib/api-cache";

export const dynamic = "force-dynamic";

const cacheHeaders = {
  "Cache-Control": "private, max-age=60, stale-while-revalidate=300",
};

function compactProjectFlowAssignment(assignment: any) {
  if (!assignment) return null;

  return {
    cardId: assignment.cardId,
    cardTitle: assignment.cardTitle,
    boardTitle: assignment.boardTitle,
    scheduleTime: assignment.scheduleTime,
    teacherNames: assignment.teacherNames || [],
    primaryTeacherName: assignment.primaryTeacherName || null,
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawAttendanceLimit = Number(searchParams.get("attendanceLimit") || 5);
    const attendanceLimit = Number.isFinite(rawAttendanceLimit)
      ? Math.min(Math.max(rawAttendanceLimit, 0), 20)
      : 5;

    // Build filter object
    const where: any = {
      status: "ACTIVE",
      studentTrack: "THERAPY",
    };

    // Get all students with their programs, packages and latest attendances
    const students = await prisma.student.findMany({
      where,
      select: {
        id: true,
        name: true,
        registrationNo: true,
        diagnosis: true,
        programs: {
          select: {
            program: {
              select: {
                name: true,
              },
            },
          },
        },
        packages: {
          select: {
            id: true,
            totalSessions: true,
            usedSessions: true,
            status: true,
            therapistName: true,
            scheduleTime: true,
            frequency: true,
            createdAt: true,
            updatedAt: true,
            _count: {
              select: { attendances: true },
            },
            program: {
              select: {
                id: true,
                name: true,
                description: true,
              },
            },
          },
          where: {
            status: { in: ["ACTIVE", "WARNING", "COMPLETED"] },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 3,
        },
        attendances: {
          select: {
            id: true,
            checkIn: true,
            checkOut: true,
            duration: true,
            status: true,
            room: true,
            teacher: {
              select: {
                user: {
                  select: {
                    name: true,
                  },
                },
              },
            },
            program: {
              select: {
                name: true,
              },
            },
          },
          orderBy: {
            checkIn: "desc",
          },
          take: attendanceLimit,
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    // Transform data
    const transformedStudents = await Promise.all(students.map(async (student) => {
      // Get active package
      const activePackage = student.packages.find(
        (pkg) => pkg.status === "ACTIVE" || pkg.status === "WARNING"
      );
      const projectFlowAssignment = await getProjectFlowStudentAssignment(student.name, "THERAPY");
      const compactAssignment = compactProjectFlowAssignment(projectFlowAssignment);

      // Calculate remaining sessions
      const totalSessions = activePackage?.totalSessions || 0;
      const usedSessions = activePackage?.usedSessions || 0;
      const remainingSessions = totalSessions - usedSessions;

      // Get therapist name from latest attendance
      const latestAttendance = student.attendances[0];
      const therapistName = compactAssignment?.teacherNames?.join(", ") || activePackage?.therapistName || latestAttendance?.teacher?.user?.name || "Belum ada terapis";

      // Get primary program
      const primaryProgram = activePackage?.program?.name || student.programs[0]?.program?.name || "Belum ada program";

      // Get schedule from latest attendance
      const schedule = activePackage?.scheduleTime || (latestAttendance?.checkIn
        ? new Date(latestAttendance.checkIn).toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "Belum ada jadwal");

      // Determine status
      let packageStatus = "belum-paket";
      if (activePackage?.status === "ACTIVE") {
        packageStatus = "aktif";
      }
      if (activePackage?.status === "WARNING" || (activePackage && remainingSessions <= 1)) {
        packageStatus = "hampir-habis";
      }
      if (activePackage?.status === "COMPLETED") {
        packageStatus = "selesai";
      }

      return {
        id: student.id,
        name: student.name,
        registrationNo: student.registrationNo,
        diagnosis: student.diagnosis,
        profileImage: null,
        program: primaryProgram,
        schedule: schedule,
        therapist: therapistName,
        progress: {
          used: usedSessions,
          total: totalSessions,
        },
        status: packageStatus,
        lastAttended: latestAttendance?.checkIn
          ? new Date(latestAttendance.checkIn).toISOString().split("T")[0]
          : null,
        package: activePackage
          ? {
              ...activePackage,
              therapistName: compactAssignment?.primaryTeacherName || activePackage.therapistName,
              projectFlowAssignment: compactAssignment,
            }
          : activePackage,
        attendances: student.attendances,
      };
    }));

    return jsonCacheResponse(request, transformedStudents, cacheHeaders);
  } catch (error) {
    console.error("Error fetching sessions:", error);
    return NextResponse.json(
      { error: "Failed to fetch sessions data" },
      { status: 500 }
    );
  }
}
