import { NextRequest, NextResponse } from 'next/server'
import { withDatabaseConnection } from '@/lib/db'
import { randomUUID } from 'crypto'

// GET - List all licenses
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const status = searchParams.get('status') || ''
    const type = searchParams.get('type') || ''

    const offset = (page - 1) * limit

    // TODO: Query from license table when available
    // For now, return mock data or create license records
    const result = await withDatabaseConnection(async (connection) => {
      // Check if license table exists, if not return empty
      // For now, return mock data
      return {
        licenses: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
      }
    })

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error('Get licenses error:', error)
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan saat mengambil data licenses' },
      { status: 500 }
    )
  }
}

// POST - Create new license
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, licenseType, duration, maxUsers, maxAccounts } = body

    if (!userId || !licenseType) {
      return NextResponse.json(
        { success: false, error: 'User ID dan License Type harus diisi' },
        { status: 400 }
      )
    }

    // Generate license key
    const licenseKey = `LIC-${randomUUID().substring(0, 8).toUpperCase()}-${randomUUID().substring(0, 4).toUpperCase()}-${randomUUID().substring(0, 4).toUpperCase()}-${randomUUID().substring(0, 8).toUpperCase()}`

    // TODO: Save to license table when available
    return NextResponse.json({
      success: true,
      message: 'License created (not saved to database yet)',
      data: {
        id: randomUUID(),
        userId,
        licenseKey,
        licenseType,
        status: 'active',
        duration,
        maxUsers: maxUsers || -1, // -1 means unlimited
        maxAccounts: maxAccounts || -1,
        activatedAt: new Date().toISOString(),
        expiresAt: duration ? new Date(Date.now() + duration * 24 * 60 * 60 * 1000).toISOString() : null,
        createdAt: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('Create license error:', error)
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan saat membuat license' },
      { status: 500 }
    )
  }
}

