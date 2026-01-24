import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { existsSync } from 'fs'

// Upload directory for tutorial images
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'tutorials')

// Ensure upload directory exists
async function ensureUploadDir() {
    if (!existsSync(UPLOAD_DIR)) {
        await mkdir(UPLOAD_DIR, { recursive: true })
    }
}

// Generate unique filename
function generateFilename(originalName: string): string {
    const timestamp = Date.now()
    const randomPart = Math.random().toString(36).substring(2, 8)
    const ext = path.extname(originalName).toLowerCase()
    return `tutorial-${timestamp}-${randomPart}${ext}`
}

// Validate file type
function isValidImageType(mimeType: string): boolean {
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
    return validTypes.includes(mimeType)
}

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData()
        const file = formData.get('file') as File

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
        }

        // Validate file type
        if (!isValidImageType(file.type)) {
            return NextResponse.json(
                { error: 'Invalid file type. Only JPEG, PNG, GIF, WebP, and SVG are allowed.' },
                { status: 400 }
            )
        }

        // Validate file size (max 5MB)
        const maxSize = 5 * 1024 * 1024 // 5MB
        if (file.size > maxSize) {
            return NextResponse.json(
                { error: 'File too large. Maximum size is 5MB.' },
                { status: 400 }
            )
        }

        // Ensure upload directory exists
        await ensureUploadDir()

        // Generate unique filename
        const filename = generateFilename(file.name)
        const filepath = path.join(UPLOAD_DIR, filename)

        // Convert file to buffer and save
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)
        await writeFile(filepath, buffer)

        // Return the public URL
        const publicUrl = `/uploads/tutorials/${filename}`

        return NextResponse.json({
            success: true,
            url: publicUrl,
            filename: filename,
            originalName: file.name,
            size: file.size,
            mimeType: file.type
        })

    } catch (error: any) {
        console.error('Upload error:', error)
        return NextResponse.json(
            { error: error.message || 'Upload failed' },
            { status: 500 }
        )
    }
}

// GET: List uploaded files (optional, for management)
export async function GET() {
    try {
        const { readdir, stat } = await import('fs/promises')

        await ensureUploadDir()

        const files = await readdir(UPLOAD_DIR)
        const fileInfos = await Promise.all(
            files.map(async (filename) => {
                const filepath = path.join(UPLOAD_DIR, filename)
                const stats = await stat(filepath)
                return {
                    filename,
                    url: `/uploads/tutorials/${filename}`,
                    size: stats.size,
                    createdAt: stats.birthtime
                }
            })
        )

        return NextResponse.json({ files: fileInfos })
    } catch (error: any) {
        console.error('Error listing files:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
