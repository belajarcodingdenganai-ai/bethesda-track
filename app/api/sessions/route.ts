import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    // Build filter object
    const where: any = {
      status: "ACTIVE",
    };

    // Get all students with their programs, packages and latest attendances
    const students = await prisma.student.findMany({
      where,
      include: {
        programs: {
          include: {
            program: true,
          },
        },
        packages: {
          include: {
            program: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        attendances: {
          include: {
            teacher: {
              include: {
                user: true,
              },
            },
            program: true,
          },
          orderBy: {
            checkIn: "desc",
          },
          take: 100,
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    // Transform data
    const transformedStudents = students.map((student) => {
      // Get active package
      const activePackage = student.packages.find(
        (pkg) => pkg.status === "ACTIVE" || pkg.status === "WARNING"
      );

      // Calculate remaining sessions
      const totalSessions = activePackage?.totalSessions || 0;
      const usedSessions = activePackage?.usedSessions || 0;
      const remainingSessions = totalSessions - usedSessions;

      // Get therapist name from latest attendance
      const latestAttendance = student.attendances[0];
      const therapistName = latestAttendance?.teacher?.user?.name || "Belum ada terapis";

      // Get primary program
      const primaryProgram = activePackage?.program?.name || student.programs[0]?.program?.name || "Belum ada program";

      // Get schedule from latest attendance
      const schedule = latestAttendance?.checkIn
        ? new Date(latestAttendance.checkIn).toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "Belum ada jadwal";

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
        profileImage: student.profileImage,
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
        package: activePackage,
        attendances: student.attendances,
      };
    });

    return NextResponse.json(transformedStudents);
  } catch (error) {
    console.error("Error fetching sessions:", error);
    return NextResponse.json(
      { error: "Failed to fetch sessions data" },
      { status: 500 }
    );
  }
}
