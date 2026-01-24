import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

/**
 * GET - Proxy image from adbot app's public/uploads directory
 * This allows admin app to access images stored in adbot app
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const imagePath = searchParams.get('path')

    if (!imagePath) {
      return NextResponse.json(
        { error: 'Path parameter required' },
        { status: 400 }
      )
    }

    // Security: Only allow paths starting with /uploads
    if (!imagePath.startsWith('/uploads/')) {
      return NextResponse.json(
        { error: 'Invalid path' },
        { status: 400 }
      )
    }

    // Construct full file path
    // Admin app is in local_pc/admin, adbot app is in local_pc/adbot
    // Try multiple path strategies
    const basePath = process.cwd()
    let adbotPublicPath: string
    
    // Strategy 1: If running from admin directory, go up one level then to adbot
    if (basePath.includes('admin')) {
      adbotPublicPath = join(basePath, '..', 'adbot', 'public', imagePath)
    } 
    // Strategy 2: If running from root (local_pc), go to adbot directly
    else if (basePath.includes('local_pc')) {
      adbotPublicPath = join(basePath, 'adbot', 'public', imagePath)
    }
    // Strategy 3: Fallback - try relative path
    else {
      adbotPublicPath = join(basePath, '..', 'adbot', 'public', imagePath)
    }

    // Check if file exists
    if (!existsSync(adbotPublicPath)) {
      console.error('Image not found:', adbotPublicPath)
      return NextResponse.json(
        { error: 'Image not found' },
        { status: 404 }
      )
    }

    // Read file
    const fileBuffer = await readFile(adbotPublicPath)
    
    // Determine content type based on file extension
    const ext = imagePath.split('.').pop()?.toLowerCase()
    let contentType = 'image/jpeg'
    
    switch (ext) {
      case 'png':
        contentType = 'image/png'
        break
      case 'gif':
        contentType = 'image/gif'
        break
      case 'webp':
        contentType = 'image/webp'
        break
      case 'jpg':
      case 'jpeg':
      default:
        contentType = 'image/jpeg'
    }

    // Return image with proper headers
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (error: any) {
    console.error('Proxy image error:', error)
    return NextResponse.json(
      { error: 'Failed to load image' },
      { status: 500 }
    )
  }
}

