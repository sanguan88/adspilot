import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);

    return NextResponse.json({
      success: true,
      data: {
        userId: user.userId,
        username: user.username,
        email: user.email,
        nama_lengkap: user.nama_lengkap,
        role: user.role,
        kode_site: user.kode_site,
        nama_site: user.nama_site,
        kode_tim: user.kode_tim,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unauthorized',
      },
      { status: 401 }
    );
  }
}

