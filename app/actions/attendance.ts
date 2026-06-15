'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getSchoolProgramChecklistWithSummary } from '@/lib/school-program-checklists';
import { getStudentProgramChecklistWithSummary } from '@/lib/student-program-checklists';

function getPackageStatus(usedSessions: number, totalSessions: number): 'ACTIVE' | 'WARNING' | 'COMPLETED' {
  if (usedSessions >= totalSessions) return 'COMPLETED';
  if (totalSessions - usedSessions <= 2) return 'WARNING';
  return 'ACTIVE';
}

function parseDateTimeLocal(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error('Tanggal dan jam tidak valid.');
  return date;
}

async function findTeacherByName(tx: any, teacherName?: string) {
  const normalizedName = teacherName?.trim();

  if (normalizedName) {
    const teacher = await tx.teacher.findFirst({
      where: {
        user: {
          name: {
            equals: normalizedName,
            mode: 'insensitive',
          },
        },
      },
      include: { user: true },
    });

    if (teacher) return teacher;
  }

  const fallbackTeacher = await tx.teacher.findFirst({
    include: { user: true },
    orderBy: { createdAt: 'asc' },
  });

  if (!fallbackTeacher) throw new Error('Tidak ada data guru untuk riwayat sesi.');
  return fallbackTeacher;
}

async function recalculatePackageUsage(tx: any, packageId: string) {
  const usedSessions = await tx.attendance.count({ where: { packageId } });
  const pkg = await tx.therapyPackage.findUnique({ where: { id: packageId } });
  if (!pkg) throw new Error('Paket terapi tidak ditemukan.');

  return tx.therapyPackage.update({
    where: { id: packageId },
    data: {
      usedSessions,
      status: getPackageStatus(usedSessions, pkg.totalSessions),
    },
  });
}

/**
 * Helper untuk mengirim notifikasi WhatsApp
 * Di tahap produksi, integrasikan dengan provider seperti Fonnte, Twilio, atau WoWa.
 */
async function sendWhatsAppNotification(phone: string, message: string) {
  // Contoh implementasi menggunakan fetch ke API Gateway (misal Fonnte/WoWa)
  try {
    console.log(`[WhatsApp API] Mengirim ke ${phone}: ${message}`);
    /* 
    await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: { 'Authorization': 'TOKEN_ANDA_DI_SINI', 'Content-Type': 'application/json' },
      body: JSON.stringify({ target: phone, message: message })
    });
    */
  } catch (error) {
    console.error('Gagal mengirim WhatsApp:', error);
  }
}

export async function processAttendance(rawQrCode: string, teacherId: string, programId?: string) {
  const qrCode = rawQrCode.trim(); // Membersihkan karakter \n atau spasi dari scanner

  return await prisma.$transaction(async (tx) => {
    const now = new Date();

    // 1. Cek apakah ini QR Siswa
    const student = await tx.student.findFirst({
      where: { qrCode },
      include: {
        packages: {
          where: { 
            status: { in: ['ACTIVE', 'WARNING'] },
            OR: [
              { endDate: null },
              { endDate: { gte: now } }
            ],
            ...(programId ? { programId } : {})
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!student) {
      // 2. Cek apakah ini QR Guru (Jika bukan siswa)
      const teacher = await tx.teacher.findUnique({
        where: { qrCode },
        include: { user: true },
      });

      if (!teacher) throw new Error('QR Code tidak dikenali.');

      // LOGIKA KEHADIRAN GURU
      const today = new Date(now);
      today.setHours(0, 0, 0, 0);

      const limit = new Date(now);
      limit.setHours(8, 0, 0, 0); // Batas jam masuk: 08:00
      const attendanceDate = new Date(now);
      attendanceDate.setHours(0, 0, 0, 0);

      const isLate = now > limit;
      const minutesLate = Math.max(0, Math.floor((now.getTime() - limit.getTime()) / 60000));

      // Simpan ke tabel kehadiran guru (Asumsi model TeacherAttendance ada)
      const record = await tx.teacherAttendance.create({
        data: {
          teacher: { connect: { id: teacher.id } },
          attendanceDate,
          scheduledStart: limit,
          checkIn: now,
          isLate,
          minutesLate,
          notes: isLate ? `Terlambat ${minutesLate} menit` : 'Tepat waktu'
        }
      });

      // Notifikasi WhatsApp Guru (Opsional)
      const teacherName = teacher.user?.name || teacher.teacherId;
      const waMessage = `Halo ${teacherName}, Anda telah berhasil absen masuk pada pukul ${now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}. ${isLate ? 'Status: Terlambat.' : 'Status: Tepat Waktu.'}`;
      
      // Pastikan field phone tersedia di model Teacher
      if (teacher.phone) {
        await sendWhatsAppNotification(teacher.phone, waMessage);
      }

      revalidatePath('/');
      return {
        success: true,
        name: teacherName,
        role: 'TEACHER',
        type: 'CHECK_IN',
        time: now,
        isLate,
        notes: record.notes
      };
    }

    // 3. JIKA SISWA
    const activePkg = student.packages[0];
    if (!activePkg) {
      const lastPackage = await tx.therapyPackage.findFirst({
        where: { studentId: student.id },
        orderBy: { createdAt: 'desc' }
      });
      
      if (!lastPackage) throw new Error('Siswa belum memiliki paket terapi.');
      if (lastPackage.status === 'COMPLETED') throw new Error('Paket terapi sudah habis (0 sesi). Mohon perbarui paket.');
      throw new Error('Paket terapi sudah kadaluwarsa atau tidak aktif.');
    }

    // Resolusi Teacher ID: Gunakan placeholder jika ID tidak valid atau sesuai string placeholder
    let finalTeacherId = (teacherId && teacherId !== "teacher-id-placeholder") ? teacherId : null;

    // Jika tidak ada teacherId yang valid, cari guru pertama sebagai fallback (untuk testing/development)
    if (!finalTeacherId) {
      const firstTeacher = await tx.teacher.findFirst();
      if (!firstTeacher) throw new Error('Tidak ada data guru untuk mendampingi.');
      finalTeacherId = firstTeacher.id;
    }

    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    // 2. Cek apakah sudah check-in hari ini (untuk proses check-out)
    const existingAttendance = await tx.attendance.findFirst({
      where: {
        studentId: student.id,
        checkIn: { gte: today },
        checkOut: null,
      },
    });

    if (existingAttendance) {
      // PROSES CHECK-OUT
      // Guard: Jangan izinkan check-out jika baru saja check-in (kurang dari 1 menit)
      const diffMs = now.getTime() - existingAttendance.checkIn.getTime();
      const diffSecs = Math.floor(diffMs / 1000);
      
      if (diffSecs < 60) {
        throw new Error(`Siswa ${student.name} baru saja melakukan check-in. Tunggu 1 menit untuk check-out.`);
      }

      await tx.attendance.update({
        where: { id: existingAttendance.id },
        data: { checkOut: now },
      });

      // Notifikasi Check-out (Opsional)
      // Pastikan field parentPhone atau contactNo tersedia di model Student
      if (student.parentPhone) {
        const message = `${student.name} telah selesai sesi terapi pada pukul ${now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}.`;
        await sendWhatsAppNotification(student.parentPhone, message);
      }

      revalidatePath('/');
      return {
        success: true,
        name: student.name,
        type: 'CHECK_OUT',
        time: now,
        used: activePkg.usedSessions,
        total: activePkg.totalSessions,
      };
    }

    // 3. PROSES CHECK-IN (Kurangi Sesi)
    const newUsedSessions = activePkg.usedSessions + 1;
    let newStatus: 'ACTIVE' | 'WARNING' | 'COMPLETED' = 'ACTIVE';

    if (newUsedSessions >= activePkg.totalSessions) {
      newStatus = 'COMPLETED';
    } else if (activePkg.totalSessions - newUsedSessions <= 2) {
      newStatus = 'WARNING';
    }

    await tx.attendance.create({
      data: {
        studentId: student.id,
        teacherId: finalTeacherId,
        programId: activePkg.programId,
        packageId: activePkg.id,
      },
    });

    await tx.therapyPackage.update({
      where: { id: activePkg.id },
      data: { usedSessions: newUsedSessions, status: newStatus },
    });

    // WHATSAPP INTEGRATION
    // Format: "Nathan hadir pukul 13:05. Sesi: 6 dari 8. Sisa: 2 sesi."
    const remaining = activePkg.totalSessions - newUsedSessions;
    const waMessage = `*Notifikasi Kehadiran*\n\n${student.name} hadir pukul ${now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}.\n\n*Sesi:*\n${newUsedSessions} dari ${activePkg.totalSessions}\n\n*Sisa:*\n${remaining} sesi.`;
    
    // Panggil helper
    if (student.parentPhone) {
      await sendWhatsAppNotification(student.parentPhone, waMessage);
    }

    // Create notification if needed
    if (newStatus === 'WARNING') {
      await tx.notification.create({
        data: {
          type: 'SESSION_ALERT',
          title: '⚠️ Paket Hampir Habis',
          message: `Paket terapi ${student.name} tinggal ${activePkg.totalSessions - newUsedSessions} sesi`,
          studentId: student.id,
          packageId: activePkg.id,
        },
      });
    }

    if (newStatus === 'COMPLETED') {
      await tx.notification.create({
        data: {
          type: 'SESSION_ALERT',
          title: '✅ Paket Selesai',
          message: `Seluruh sesi terapi ${student.name} telah selesai digunakan.`,
          studentId: student.id,
          packageId: activePkg.id,
        },
      });
    }

    revalidatePath('/');
    return {
      success: true,
      name: student.name,
      type: 'CHECK_IN',
      time: now,
      used: newUsedSessions,
      total: activePkg.totalSessions,
    };
  });
}

export async function getDashboardStats() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Pengecekan aman: Jika model tidak ada di prisma client, kembalikan array kosong agar dashboard tidak crash
    const [totalStudents, totalTeachers, lowCreditPackages, recentAttendance, teacherAttendance, totalTherapyToday] = await Promise.all([
      (prisma as any).student ? prisma.student.count({ where: { status: 'ACTIVE' } }) : Promise.resolve(0),
      (prisma as any).teacher ? prisma.teacher.count() : Promise.resolve(0),

      (prisma as any).therapyPackage ? prisma.therapyPackage.findMany({
        where: { status: { in: ['ACTIVE', 'WARNING'] } },
        include: { student: true },
        orderBy: { usedSessions: 'desc' }
      }).then((pkgs) => pkgs.filter(p => p.totalSessions - p.usedSessions <= 2)) : Promise.resolve([]),

      (prisma as any).attendance ? prisma.attendance.findMany({
        where: { checkIn: { gte: today } },
        include: { student: true, program: true },
        orderBy: { checkIn: 'desc' },
        take: 10
      }) : Promise.resolve([]),

      (prisma as any).teacherAttendance ? prisma.teacherAttendance.findMany({
        where: {
          checkIn: { gte: today }
        },
        include: { 
          teacher: {
            include: { user: { select: { name: true } } }
          } 
        },
        orderBy: { checkIn: 'desc' }
      }) : Promise.resolve([]),

      // Hitung khusus total terapi (Check-in siswa) hari ini
      (prisma as any).attendance ? prisma.attendance.count({
        where: { checkIn: { gte: today } }
      }) : Promise.resolve(0)
    ]);

    return {
      success: true,
      data: { totalStudents, totalTeachers, lowCreditPackages, recentAttendance, teacherAttendance, totalTherapyToday }
    };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function getAttendanceHistory(packageId: string) {
  try {
    const attendances = await prisma.attendance.findMany({
      where: { packageId },
      include: {
        teacher: {
          include: {
            user: { select: { name: true } }
          }
        },
      },
      orderBy: { checkIn: 'desc' },
    });
    return { success: true, data: attendances };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function processTeacherAttendance(rawQrCode: string) {
  const qrCode = rawQrCode.trim();
  const now = new Date();

  const teacher = await prisma.teacher.findUnique({
    where: { qrCode },
    include: { user: true },
  });

  if (!teacher) throw new Error('QR Code guru tidak dikenali.');

  const limit = new Date(now);
  limit.setHours(8, 0, 0, 0);
  const attendanceDate = new Date(now);
  attendanceDate.setHours(0, 0, 0, 0);
  const isLate = now > limit;
  const minutesLate = Math.max(0, Math.floor((now.getTime() - limit.getTime()) / 60000));

  if ((prisma as any).teacherAttendance) {
    await (prisma as any).teacherAttendance.create({
      data: {
        teacherId: teacher.id,
        attendanceDate,
        scheduledStart: limit,
        checkIn: now,
        isLate,
        minutesLate,
        notes: isLate ? `Terlambat ${minutesLate} menit` : 'Tepat waktu',
      },
    });
  } else {
    await prisma.teacher.update({
      where: { id: teacher.id },
      data: { checkInTime: now },
    });
  }

  revalidatePath('/');
  revalidatePath('/teacher-scanner');

  return {
    success: true,
    name: teacher.user?.name || teacher.teacherId,
    role: 'TEACHER',
    type: 'CHECK_IN',
    time: now,
    isLate,
    minutesLate,
    notes: isLate ? `Terlambat ${minutesLate} menit` : 'Tepat waktu',
  };
}

export async function createManualMissingScan(packageId: string, checkInValue: string, teacherName?: string) {
  try {
    const checkIn = parseDateTimeLocal(checkInValue);

    await prisma.$transaction(async (tx) => {
      const pkg = await tx.therapyPackage.findUnique({
        where: { id: packageId },
        include: { student: true, program: true },
      });

      if (!pkg) throw new Error('Paket terapi tidak ditemukan.');

      const teacher = await findTeacherByName(tx, teacherName);

      await tx.attendance.create({
        data: {
          studentId: pkg.studentId,
          teacherId: teacher.id,
          programId: pkg.programId,
          packageId: pkg.id,
          checkIn,
          status: 'PRESENT',
        },
      });

      await recalculatePackageUsage(tx, pkg.id);
    });

    revalidatePath('/');
    revalidatePath('/sessions');

    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function updateAttendanceRecord(attendanceId: string, checkInValue: string, teacherName?: string) {
  try {
    const checkIn = parseDateTimeLocal(checkInValue);

    await prisma.$transaction(async (tx) => {
      const attendance = await tx.attendance.findUnique({ where: { id: attendanceId } });
      if (!attendance) throw new Error('Riwayat sesi tidak ditemukan.');

      const teacher = await findTeacherByName(tx, teacherName);

      await tx.attendance.update({
        where: { id: attendanceId },
        data: {
          checkIn,
          teacherId: teacher.id,
        },
      });
    });

    revalidatePath('/sessions');

    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function deleteAttendanceRecord(attendanceId: string) {
  try {
    await prisma.$transaction(async (tx) => {
      const attendance = await tx.attendance.findUnique({ where: { id: attendanceId } });
      if (!attendance) throw new Error('Riwayat sesi tidak ditemukan.');

      await tx.attendance.delete({ where: { id: attendanceId } });
      await recalculatePackageUsage(tx, attendance.packageId);
    });

    revalidatePath('/');
    revalidatePath('/sessions');

    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function getNotifications() {
  try {
    const data = await prisma.notification.findMany({
      include: {
        student: { select: { id: true, name: true, registrationNo: true } },
        teacher: { include: { user: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 25,
    });

    return { success: true, data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error), data: [] };
  }
}

export async function markNotificationRead(notificationId: string) {
  try {
    await prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    revalidatePath('/');
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function getReportData() {
  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const [attendances, packages, students] = await Promise.all([
      prisma.attendance.findMany({
        where: { checkIn: { gte: sevenDaysAgo } },
        include: {
          program: true,
          student: true,
        },
        orderBy: { checkIn: 'asc' },
      }),
      prisma.therapyPackage.findMany({
        include: {
          student: true,
          program: true,
          attendances: true,
        },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.student.findMany({
        where: { status: 'ACTIVE' },
        orderBy: { name: 'asc' },
      }),
    ]);

    const dailyAttendance = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(sevenDaysAgo);
      date.setDate(sevenDaysAgo.getDate() + index);
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      return {
        date: dayStart.toISOString(),
        count: attendances.filter((attendance) => {
          const checkIn = new Date(attendance.checkIn);
          return checkIn >= dayStart && checkIn <= dayEnd;
        }).length,
      };
    });

    const programDistribution = Array.from(
      attendances.reduce((map, attendance) => {
        const name = String(attendance.program?.name || 'Program');
        map.set(name, (map.get(name) || 0) + 1);
        return map;
      }, new Map<string, number>()),
      ([name, count]) => ({ name, count }),
    );

    const studentProgramCards = packages.slice(0, 20).map((pkg) => {
      const checklist = getStudentProgramChecklistWithSummary(pkg.student.name);
      return {
        studentName: pkg.student.name,
        registrationNo: pkg.student.registrationNo,
        programName: String(pkg.program.name),
        usedSessions: pkg.usedSessions,
        totalSessions: pkg.totalSessions,
        remainingSessions: Math.max(pkg.totalSessions - pkg.usedSessions, 0),
        totalAttendances: pkg.attendances.length,
        checklist,
      };
    });

    const schoolProgramCards = await Promise.all(
      students.slice(0, 20).map(async (student) => {
        const checklist = await getSchoolProgramChecklistWithSummary(student.name);
        return {
          studentName: student.name,
          registrationNo: student.registrationNo,
          programName: student.school || 'Program Sekolah',
          teacherName: '-',
          scheduleTime: checklist?.sections?.[0]?.scheduleTime || '08:00-12:00',
          checklist,
        };
      }),
    );

    return {
      success: true,
      data: {
        dailyAttendance,
        programDistribution,
        studentProgramCards,
        schoolProgramCards,
      },
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}
