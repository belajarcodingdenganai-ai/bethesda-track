'use server';

import prisma from '@/lib/prisma';
import { getPrismaErrorMessage } from '@/lib/prisma-errors';
import { revalidatePath } from 'next/cache';

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

function getJakartaAttendanceTime(now: Date) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const parts = formatter.formatToParts(now).reduce<Record<string, string>>((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {});

  const year = Number(parts.year);
  const month = Number(parts.month);
  const day = Number(parts.day);
  const dateText = `${parts.year}-${parts.month}-${parts.day}`;
  const dayName = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jakarta',
    weekday: 'short',
  }).format(now);

  return {
    attendanceDate: new Date(Date.UTC(year, month - 1, day)),
    dayStart: new Date(`${dateText}T00:00:00.000+07:00`),
    dayEnd: new Date(`${dateText}T23:59:59.999+07:00`),
    scheduledStart: new Date(Date.UTC(year, month - 1, day, 1, 0, 0, 0)),
    isWeekday: !['Sat', 'Sun'].includes(dayName),
  };
}

function parseJakartaDateTime(value: string) {
  const normalized = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(normalized)) {
    throw new Error('Tanggal dan jam masuk tidak valid.');
  }

  const parsed = new Date(`${normalized}:00.000+07:00`);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Tanggal dan jam masuk tidak valid.');
  }

  return parsed;
}

function getPackageStatusFromUsage(usedSessions: number, totalSessions: number): 'ACTIVE' | 'WARNING' | 'COMPLETED' {
  if (usedSessions >= totalSessions) return 'COMPLETED';
  if (totalSessions - usedSessions <= 2) return 'WARNING';
  return 'ACTIVE';
}

async function revalidateAttendanceViews(studentId?: string) {
  revalidatePath('/');
  revalidatePath('/sessions');
  revalidatePath('/students');
  if (studentId) revalidatePath(`/students/${studentId}`);
  revalidatePath('/reports');
}

export async function createManualMissingScan(packageId: string, checkInLocal: string, therapistName: string) {
  try {
    return await prisma.$transaction(async (tx) => {
      const checkIn = parseJakartaDateTime(checkInLocal);
      const selectedTherapistName = therapistName.trim();
      if (!selectedTherapistName) {
        throw new Error('Nama terapis wajib dipilih.');
      }

      const dayStart = new Date(checkIn);
      dayStart.setUTCHours(17, 0, 0, 0);
      if (dayStart.getTime() > checkIn.getTime()) {
        dayStart.setUTCDate(dayStart.getUTCDate() - 1);
      }
      const dayEnd = new Date(dayStart);
      dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);
      dayEnd.setUTCMilliseconds(dayEnd.getUTCMilliseconds() - 1);

      const activePkg = await tx.therapyPackage.findUnique({
        where: { id: packageId },
        include: {
          student: true,
          program: true,
        },
      });

      if (!activePkg) throw new Error('Paket sesi tidak ditemukan.');
      if (activePkg.status === 'COMPLETED' || activePkg.usedSessions >= activePkg.totalSessions) {
        throw new Error('Paket sesi sudah selesai. Tambahkan paket baru sebelum koreksi sesi.');
      }

      const existingAttendance = await tx.attendance.findFirst({
        where: {
          studentId: activePkg.studentId,
          packageId: activePkg.id,
          checkIn: {
            gte: dayStart,
            lte: dayEnd,
          },
        },
      });

      if (existingAttendance) {
        throw new Error('Siswa sudah memiliki sesi tercatat pada tanggal tersebut.');
      }

      const teacher = await tx.teacher.findFirst({
        where: {
          user: {
            name: selectedTherapistName,
          },
        },
      });

      if (!teacher) throw new Error('Terapis tidak ditemukan. Pastikan nama terapis sudah terdaftar.');

      const newUsedSessions = activePkg.usedSessions + 1;
      const newStatus = getPackageStatusFromUsage(newUsedSessions, activePkg.totalSessions);

      await tx.attendance.create({
        data: {
          studentId: activePkg.studentId,
          teacherId: teacher.id,
          programId: activePkg.programId,
          packageId: activePkg.id,
          checkIn,
          status: 'PRESENT',
          qrCodeScanned: 'MANUAL_MISSING_SCAN',
        },
      });

      await tx.therapyPackage.update({
        where: { id: activePkg.id },
        data: {
          usedSessions: newUsedSessions,
          status: newStatus,
        },
      });

      if (newStatus === 'WARNING') {
        await tx.notification.create({
          data: {
            type: 'SESSION_ALERT',
            title: 'Paket Hampir Habis',
            message: `Koreksi sesi manual: paket terapi ${activePkg.student.name} tinggal ${activePkg.totalSessions - newUsedSessions} sesi.`,
            studentId: activePkg.studentId,
            packageId: activePkg.id,
          },
        });
      }

      if (newStatus === 'COMPLETED') {
        await tx.notification.create({
          data: {
            type: 'SESSION_ALERT',
            title: 'Paket Selesai',
            message: `Koreksi sesi manual: seluruh sesi terapi ${activePkg.student.name} telah selesai digunakan.`,
            studentId: activePkg.studentId,
            packageId: activePkg.id,
          },
        });
      }

      revalidatePath('/');
      revalidatePath('/sessions');
      revalidatePath('/students');
      revalidatePath(`/students/${activePkg.studentId}`);
      revalidatePath('/reports');

      return {
        success: true as const,
        data: {
          studentName: activePkg.student.name,
          usedSessions: newUsedSessions,
          totalSessions: activePkg.totalSessions,
          checkIn,
        },
      };
    });
  } catch (error) {
    console.error('Error creating manual missing scan:', error);
    return {
      success: false as const,
      error: getPrismaErrorMessage(error),
    };
  }
}

export async function updateAttendanceRecord(attendanceId: string, checkInLocal: string, therapistName?: string) {
  try {
    return await prisma.$transaction(async (tx) => {
      const checkIn = parseJakartaDateTime(checkInLocal);
      const attendance = await tx.attendance.findUnique({
        where: { id: attendanceId },
        include: { teacher: { include: { user: true } } },
      });

      if (!attendance) throw new Error('Riwayat scan tidak ditemukan.');

      let teacherId = attendance.teacherId;
      const selectedTherapistName = therapistName?.trim();
      if (selectedTherapistName) {
        const teacher = await tx.teacher.findFirst({
          where: { user: { name: selectedTherapistName } },
        });
        if (!teacher) throw new Error('Terapis tidak ditemukan.');
        teacherId = teacher.id;
      }

      const checkOut =
        attendance.duration && attendance.duration > 0
          ? new Date(checkIn.getTime() + attendance.duration * 60000)
          : null;

      const updated = await tx.attendance.update({
        where: { id: attendanceId },
        data: {
          checkIn,
          checkOut,
          teacherId,
        },
      });

      await revalidateAttendanceViews(attendance.studentId);
      return { success: true as const, data: updated };
    });
  } catch (error) {
    console.error('Error updating attendance:', error);
    return { success: false as const, error: getPrismaErrorMessage(error) };
  }
}

export async function deleteAttendanceRecord(attendanceId: string) {
  try {
    return await prisma.$transaction(async (tx) => {
      const attendance = await tx.attendance.findUnique({
        where: { id: attendanceId },
        include: { package: true },
      });

      if (!attendance) throw new Error('Riwayat scan tidak ditemukan.');

      await tx.attendance.delete({
        where: { id: attendanceId },
      });

      const newUsedSessions = Math.max((attendance.package?.usedSessions || 0) - 1, 0);
      if (attendance.packageId && attendance.package) {
        await tx.therapyPackage.update({
          where: { id: attendance.packageId },
          data: {
            usedSessions: newUsedSessions,
            status: getPackageStatusFromUsage(newUsedSessions, attendance.package.totalSessions),
          },
        });
      }

      await revalidateAttendanceViews(attendance.studentId);
      return { success: true as const };
    });
  } catch (error) {
    console.error('Error deleting attendance:', error);
    return { success: false as const, error: getPrismaErrorMessage(error) };
  }
}

export async function processAttendance(rawQrCode: string, teacherId: string, programId?: string) {
  const qrCode = rawQrCode.trim(); // Membersihkan karakter \n atau spasi dari scanner

  try {
    return await prisma.$transaction(async (tx) => {
      const now = new Date();
      const jakartaTime = getJakartaAttendanceTime(now);

      if (!jakartaTime.isWeekday) {
        throw new Error('Absensi hanya tersedia hari Senin sampai Jumat.');
      }

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
          include: { user: { select: { name: true } } },
        });

        if (!teacher) throw new Error('QR Code tidak dikenali.');

        const { attendanceDate, scheduledStart } = jakartaTime;
        const isLate = now.getTime() > scheduledStart.getTime();
        const minutesLate = Math.max(0, Math.floor((now.getTime() - scheduledStart.getTime()) / 60000));
        const notes = isLate ? `Anda terlambat ${minutesLate} menit.` : 'Tepat waktu.';
        const existingTeacherAttendance = await tx.teacherAttendance.findUnique({
          where: {
            teacherId_attendanceDate: {
              teacherId: teacher.id,
              attendanceDate,
            },
          },
        });

        if (existingTeacherAttendance) {
          throw new Error(`${teacher.user?.name || teacher.teacherId} sudah tercatat hadir hari ini.`);
        }

        await tx.teacher.update({
          where: { id: teacher.id },
          data: {
            checkInTime: now,
            checkOutTime: null,
          },
        });

        await tx.teacherAttendance.create({
          data: {
            teacherId: teacher.id,
            attendanceDate,
            scheduledStart,
            checkIn: now,
            isLate,
            minutesLate,
            notes,
          },
        });

        // Notifikasi WhatsApp Guru (Opsional)
        const teacherName = teacher.user?.name || teacher.teacherId;
        const waMessage = `Halo ${teacherName}, Anda telah berhasil absen masuk pada pukul ${now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })}. ${notes}`;

        // Pastikan field phone tersedia di model Teacher
        if (teacher.phone) {
          await sendWhatsAppNotification(teacher.phone, waMessage);
        }

        revalidatePath('/');
        revalidatePath('/teachers');
        revalidatePath('/teacher-scanner');
        revalidatePath('/reports');
        return {
          success: true,
          name: teacherName,
          role: 'TEACHER',
          type: 'CHECK_IN',
          time: now,
          date: attendanceDate,
          scheduledStart,
          isLate,
          minutesLate,
          notes
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

      // Cek apakah siswa sudah tercatat hadir hari ini. Tidak ada checkout/kepulangan.
      const existingAttendance = await tx.attendance.findFirst({
        where: {
          studentId: student.id,
          checkIn: {
            gte: jakartaTime.dayStart,
            lte: jakartaTime.dayEnd,
          },
        },
      });

      if (existingAttendance) {
        await tx.attendance.create({
          data: {
            studentId: student.id,
            teacherId: finalTeacherId,
            programId: activePkg.programId,
            packageId: activePkg.id,
            qrCodeScanned: qrCode,
          },
        });

        revalidatePath('/');
        revalidatePath('/sessions');
        revalidatePath('/students');
        revalidatePath(`/students/${student.id}`);
        revalidatePath('/reports');
        return {
          success: true,
          name: student.name,
          role: 'STUDENT',
          type: 'CHECK_IN',
          time: now,
          used: activePkg.usedSessions,
          total: activePkg.totalSessions,
          duplicateScan: true,
          notes: `Siswa ${student.name} sudah pernah scan hari ini. Scan tambahan dicatat tanpa mengurangi sesi.`,
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
          qrCodeScanned: qrCode,
        },
      });

      await tx.therapyPackage.update({
        where: { id: activePkg.id },
        data: { usedSessions: newUsedSessions, status: newStatus },
      });

      // WHATSAPP INTEGRATION
      // Format: "Nathan hadir pukul 13:05. Sesi: 6 dari 8. Sisa: 2 sesi."
      const remaining = activePkg.totalSessions - newUsedSessions;

      // Mengambil URL dasar aplikasi dari environment variable
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bethesdatrack.org';
      
      const waMessage = `*Notifikasi Kehadiran*\n\n${student.name} hadir pukul ${now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}.\n\n*Sesi:*\n${newUsedSessions} dari ${activePkg.totalSessions}\n\n*Sisa:*\n${remaining} sesi.\n\nCek detail: ${baseUrl}/students/${student.id}`;

      // Panggil helper
      if (student.parentPhone) {
        await sendWhatsAppNotification(student.parentPhone, waMessage);
      }

      // Create notification if needed
      if (newStatus === 'WARNING') {
        await tx.notification.create({
          data: {
            type: 'SESSION_ALERT',
            title: 'Paket Hampir Habis',
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
            title: 'Paket Selesai',
            message: `Seluruh sesi terapi ${student.name} telah selesai digunakan.`,
            studentId: student.id,
            packageId: activePkg.id,
          },
        });
      }

      revalidatePath('/');
      revalidatePath('/sessions');
      revalidatePath('/students');
      revalidatePath(`/students/${student.id}`);
      revalidatePath('/reports');
      return {
        success: true,
        name: student.name,
        role: 'STUDENT',
        type: 'CHECK_IN',
        time: now,
        used: newUsedSessions,
        total: activePkg.totalSessions,
      };
    });
  } catch (error) {
    console.error('Error processing attendance:', error);
    return {
      success: false,
      error: getPrismaErrorMessage(error),
    };
  }
}

export async function processTeacherAttendance(rawQrCode: string) {
  const qrCode = rawQrCode.trim();

  try {
    return await prisma.$transaction(async (tx) => {
      const now = new Date();
      const jakartaTime = getJakartaAttendanceTime(now);

      if (!jakartaTime.isWeekday) {
        throw new Error('Absensi guru hanya tersedia hari Senin sampai Jumat.');
      }

      const teacher = await tx.teacher.findUnique({
        where: { qrCode },
        include: { user: { select: { name: true } } },
      });

      if (!teacher) {
        throw new Error('QR guru tidak dikenali. Pastikan menggunakan QR guru, bukan QR siswa.');
      }

      const { attendanceDate, scheduledStart } = jakartaTime;
      const existingTeacherAttendance = await tx.teacherAttendance.findUnique({
        where: {
          teacherId_attendanceDate: {
            teacherId: teacher.id,
            attendanceDate,
          },
        },
      });

      const teacherName = teacher.user?.name || teacher.teacherId;

      if (existingTeacherAttendance) {
        throw new Error(`${teacherName} sudah tercatat hadir hari ini.`);
      }

      const isLate = now.getTime() > scheduledStart.getTime();
      const minutesLate = Math.max(0, Math.floor((now.getTime() - scheduledStart.getTime()) / 60000));
      const notes = isLate ? `Anda terlambat ${minutesLate} menit.` : 'Tepat waktu.';

      await tx.teacher.update({
        where: { id: teacher.id },
        data: {
          checkInTime: now,
          checkOutTime: null,
        },
      });

      await tx.teacherAttendance.create({
        data: {
          teacherId: teacher.id,
          attendanceDate,
          scheduledStart,
          checkIn: now,
          isLate,
          minutesLate,
          notes,
        },
      });

      if (teacher.phone) {
        const waMessage = `Halo ${teacherName}, Anda telah berhasil absen masuk pada pukul ${now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })}. ${notes}`;
        await sendWhatsAppNotification(teacher.phone, waMessage);
      }

      revalidatePath('/');
      revalidatePath('/teachers');
      revalidatePath('/teacher-scanner');
      revalidatePath('/reports');

      return {
        success: true,
        name: teacherName,
        role: 'TEACHER',
        type: 'CHECK_IN',
        time: now,
        date: attendanceDate,
        scheduledStart,
        isLate,
        minutesLate,
        notes,
      };
    });
  } catch (error) {
    console.error('Error processing teacher attendance:', error);
    return {
      success: false,
      error: getPrismaErrorMessage(error),
    };
  }
}

export async function getDashboardStats() {
  try {
    const now = new Date();
    const jakartaTime = getJakartaAttendanceTime(now);

    // Pengecekan aman: Jika model tidak ada di prisma client, kembalikan array kosong agar dashboard tidak crash
    const [totalStudents, totalTeachers, lowCreditPackages, recentAttendance, teacherAttendance, totalTherapyToday, todayStudentAttendance] = await Promise.all([
      (prisma as any).student ? prisma.student.count({ where: { status: 'ACTIVE' } }) : Promise.resolve(0),
      (prisma as any).teacher ? prisma.teacher.count() : Promise.resolve(0),

      (prisma as any).therapyPackage ? prisma.therapyPackage.findMany({
        where: { status: { in: ['ACTIVE', 'WARNING'] } },
        include: { student: true },
        orderBy: { usedSessions: 'desc' }
      }).then((pkgs) => pkgs.filter(p => p.totalSessions - p.usedSessions <= 2)) : Promise.resolve([]),

      (prisma as any).attendance ? prisma.attendance.findMany({
        where: { checkIn: { gte: jakartaTime.dayStart, lte: jakartaTime.dayEnd } },
        include: { student: true, program: true },
        orderBy: { checkIn: 'desc' },
        take: 10
      }) : Promise.resolve([]),

      (prisma as any).teacher ? prisma.teacher.findMany({
        where: {
          checkInTime: { gte: jakartaTime.dayStart, lte: jakartaTime.dayEnd }
        },
        include: { 
          user: { select: { name: true } }
        },
        orderBy: { checkInTime: 'desc' }
      }) : Promise.resolve([]),

      // Hitung khusus total terapi (Check-in siswa) hari ini
      (prisma as any).attendance ? prisma.attendance.count({
        where: { checkIn: { gte: jakartaTime.dayStart, lte: jakartaTime.dayEnd } }
      }) : Promise.resolve(0),

      (prisma as any).attendance ? prisma.attendance.findMany({
        where: { checkIn: { gte: jakartaTime.dayStart, lte: jakartaTime.dayEnd } },
        select: {
          studentId: true,
          student: {
            select: {
              id: true,
              name: true,
              registrationNo: true,
            },
          },
          checkIn: true,
        },
      }) : Promise.resolve([])
    ]);

    const duplicateStudentScans = Object.values(
      todayStudentAttendance.reduce((acc: Record<string, any>, attendance: any) => {
        if (!acc[attendance.studentId]) {
          acc[attendance.studentId] = {
            studentId: attendance.studentId,
            count: 0,
            student: attendance.student,
            scans: [],
          };
        }

        acc[attendance.studentId].count += 1;
        acc[attendance.studentId].scans.push(attendance.checkIn);
        return acc;
      }, {})
    ).filter((item: any) => item.count > 1);

    return {
      success: true,
      data: { totalStudents, totalTeachers, lowCreditPackages, recentAttendance, teacherAttendance, totalTherapyToday, duplicateStudentScans }
    };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function getReportData() {
  try {
    const now = new Date();
    // Get last 7 days of attendance
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);

    const attendances = await prisma.attendance.findMany({
      where: {
        checkIn: {
          gte: sevenDaysAgo
        }
      },
      select: {
        checkIn: true,
        program: { select: { name: true } }
      }
    });

    // Group by day
    const statsByDay = attendances.reduce((acc: any, curr) => {
      const date = curr.checkIn.toISOString().split('T')[0];
      if (!acc[date]) acc[date] = 0;
      acc[date]++;
      return acc;
    }, {});

    // Group by program
    const statsByProgram = attendances.reduce((acc: any, curr) => {
      const name = curr.program.name;
      if (!acc[name]) acc[name] = 0;
      acc[name]++;
      return acc;
    }, {});

    return {
      success: true,
      data: {
        dailyAttendance: Object.entries(statsByDay).map(([date, count]) => ({ date, count })),
        programDistribution: Object.entries(statsByProgram).map(([name, count]) => ({ name, count }))
      }
    };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function getNotifications() {
  try {
    const notifications = await prisma.notification.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    return { success: true, data: notifications };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function markNotificationRead(id: string) {
  try {
    await prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function getAttendanceHistory(packageId: string) {
  try {
    const therapyPackage = await prisma.therapyPackage.findUnique({
      where: { id: packageId },
      select: { studentId: true },
    });

    const attendances = await prisma.attendance.findMany({
      where: therapyPackage ? { studentId: therapyPackage.studentId } : { packageId },
      include: {
        program: true,
        package: true,
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
