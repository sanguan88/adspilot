import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { db } from '@/lib/database'
import { getUserFromToken } from '@/lib/auth'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// GET /api/files/[path] - Serve file from public/uploads or database
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string }> }
) {
  try {
    const { path: filePath } = await params
    
    if (!filePath) {
      return NextResponse.json(
        { success: false, error: 'File path is required' },
        { status: 400 }
      )
    }

    // Security: Only allow access to files in uploads directories
    const normalizedPath = filePath.replace(/^\/+/, '') // Remove leading slashes
    
    if (!normalizedPath.startsWith('uploads/')) {
      return NextResponse.json(
        { success: false, error: 'Invalid file path' },
        { status: 400 }
      )
    }

    // Construct full path to public directory
    const fullPath = path.join(process.cwd(), 'public', normalizedPath)

    // First, try to read from public folder
    if (existsSync(fullPath)) {
      try {
        const fileBuffer = await readFile(fullPath)
        
        // Determine content type based on file extension
        const ext = path.extname(fullPath).toLowerCase()
        const contentTypeMap: Record<string, string> = {
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.png': 'image/png',
          '.gif': 'image/gif',
          '.webp': 'image/webp',
          '.svg': 'image/svg+xml'
        }
        
        const contentType = contentTypeMap[ext] || 'application/octet-stream'

        // Return file with proper content type
        return new NextResponse(new Uint8Array(fileBuffer), {
          headers: {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=31536000, immutable'
          }
        })
      } catch (readError) {
        console.error('Error reading file from public folder:', readError)
        // Fall through to database check
      }
    }

    // If file not found in public folder, try to get from database
    // Try to get current user from token to find their photo
    try {
      const user = getUserFromToken(request)
      
      // Get user's photo_profil from database
      const userResult = await db.query(
        `SELECT photo_profil, kode_tim FROM data_user WHERE no = $1 LIMIT 1`,
        [user.id]
      ) as any[]

      if (userResult && userResult.length > 0) {
        const photoProfil = userResult[0].photo_profil
        
        // Check if this photo matches the requested path
        const fileName = normalizedPath.split('/').pop() || ''
        const isRequestedPhoto = photoProfil && (
          photoProfil === normalizedPath ||
          (typeof photoProfil === 'string' && photoProfil.includes(fileName))
        )

        if (isRequestedPhoto && photoProfil) {
          // If it's a Buffer (bytea), return as binary image
          if (Buffer.isBuffer(photoProfil)) {
            const ext = path.extname(fileName).toLowerCase()
            const mimeTypeMap: Record<string, string> = {
              '.jpg': 'image/jpeg',
              '.jpeg': 'image/jpeg',
              '.png': 'image/png',
              '.gif': 'image/gif',
              '.webp': 'image/webp',
              '.svg': 'image/svg+xml'
            }
            const mimeType = mimeTypeMap[ext] || 'image/png'
            
            // Return binary image
            return new NextResponse(new Uint8Array(photoProfil), {
              headers: {
                'Content-Type': mimeType,
                'Cache-Control': 'public, max-age=31536000, immutable'
              }
            })
          }
        }

        // Get team logo if user has kode_tim
        if (userResult[0].kode_tim) {
          const teamResult = await db.query(
            `SELECT logo_tim FROM data_tim WHERE kode_tim = $1 LIMIT 1`,
            [userResult[0].kode_tim]
          ) as any[]

          if (teamResult && teamResult.length > 0 && teamResult[0].logo_tim) {
            const logoTim = teamResult[0].logo_tim
            
            if (Buffer.isBuffer(logoTim)) {
              return new NextResponse(new Uint8Array(logoTim), {
                headers: {
                  'Content-Type': 'image/png',
                  'Cache-Control': 'public, max-age=31536000, immutable'
                }
              })
            }
          }
        }
      }
    } catch (authError) {
      // If auth fails, try to find by filename pattern (less secure but works for public files)
      const fileName = normalizedPath.split('/').pop()
      
      if (fileName) {
        try {
          // Try to find photo_profil in data_user table that matches filename
          const baseName = fileName.replace(/\.[^/.]+$/, '')
          const patternResult = await db.query(
            `SELECT photo_profil FROM data_user 
             WHERE (photo_profil::text LIKE $1 OR photo_profil::text LIKE $2)
             LIMIT 1`,
            [`%${fileName}%`, `%${baseName}%`]
          ) as any[]
          
          if (patternResult && patternResult.length > 0 && patternResult[0].photo_profil) {
            const photoProfil = patternResult[0].photo_profil
            
            if (Buffer.isBuffer(photoProfil)) {
              const ext = path.extname(fileName).toLowerCase()
              const mimeTypeMap: Record<string, string> = {
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.png': 'image/png',
                '.gif': 'image/gif',
                '.webp': 'image/webp',
                '.svg': 'image/svg+xml'
              }
              const mimeType = mimeTypeMap[ext] || 'image/png'
              
              return new NextResponse(new Uint8Array(photoProfil), {
                headers: {
                  'Content-Type': mimeType,
                  'Cache-Control': 'public, max-age=31536000, immutable'
                }
              })
            }
          }
        } catch (dbError) {
          console.error('Error querying database for file:', dbError)
        }
      }
    }

    // File not found in public folder or database
    return NextResponse.json(
      { success: false, error: 'File not found' },
      { status: 404 }
    )

  } catch (error: any) {
    console.error('Error serving file:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error'
      },
      { status: 500 }
    )
  }
}

