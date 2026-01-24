import { NextRequest, NextResponse } from 'next/server'
import { requireActiveStatus } from '@/lib/auth'
import { getDatabaseConnection } from '@/lib/db'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

export async function POST(request: NextRequest) {
  let connection = null
  try {
    const user = await requireActiveStatus(request)

    const formData = await request.formData()
    const file = formData.get('photo') as File

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'File foto diperlukan' },
        { status: 400 }
      )
    }

    // Validate file type (only images)
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'File harus berupa gambar (JPG, PNG, atau WEBP)' },
        { status: 400 }
      )
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: 'Ukuran file maksimal 5MB' },
        { status: 400 }
      )
    }

    connection = await getDatabaseConnection()

    // Generate unique filename
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const fileExtension = file.name.split('.').pop() || 'jpg'
    const filename = `profile-${user.userId}-${timestamp}-${randomString}.${fileExtension}`

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'profiles')
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }

    // Save file
    const filePath = join(uploadsDir, filename)
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // Update database with relative path
    const relativePath = `uploads/profiles/${filename}`
    
    const updateResult = await connection.query(
      `UPDATE data_user 
       SET photo_profile = $1
       WHERE user_id = $2
       RETURNING photo_profile`,
      [relativePath, user.userId]
    )

    if (!updateResult.rows || updateResult.rows.length === 0) {
      connection.release()
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    connection.release()

    return NextResponse.json({
      success: true,
      data: {
        photo_profile: relativePath
      },
      message: 'Foto profil berhasil diupload'
    })
  } catch (error: any) {
    if (connection) {
      try {
        connection.release()
      } catch (releaseError) {
        // Ignore release error
      }
    }

    console.error('Upload photo error:', error)

    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to upload photo',
      },
      { status: 500 }
    )
  }
}

