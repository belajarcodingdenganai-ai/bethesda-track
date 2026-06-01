import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';

export function getPrismaErrorMessage(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P1001') {
      return 'Tidak bisa terhubung ke database. Periksa DATABASE_URL, status Supabase, dan koneksi internet.';
    }

    if (error.code === 'P2021') {
      return 'Tabel database belum dibuat. Jalankan sinkronisasi Prisma terlebih dahulu.';
    }

    if (error.code === 'P2002') {
      return 'Data dengan identitas yang sama sudah terdaftar.';
    }
  }

  return error instanceof Error ? error.message : 'Terjadi kesalahan pada database.';
}

export function prismaErrorResponse(error: unknown, fallback = 'Database request failed') {
  const message = getPrismaErrorMessage(error);
  return NextResponse.json({ error: message || fallback }, { status: 500 });
}
