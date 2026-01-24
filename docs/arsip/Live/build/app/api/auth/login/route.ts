import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { db } from '@/lib/database'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { 
      emailOrUsername, 
      password, 
      remember = false,
      device_identifier = '',
      device_name = '',
      user_agent = '',
      timezone = ''
    } = await request.json()

    // Validate input
    if (!emailOrUsername || !password) {
      return NextResponse.json(
        {
          success: false,
          error: 'Email/Username dan password harus diisi'
        },
        { status: 400 }
      )
    }

    // Find user in database - support both email and username
    let user
    let userExists = false
    let userStatus = null
    
    try {
      // First, try to find user by email (without status check to see if user exists)
      const checkResult = await db.query(
        `SELECT email, status_user, no FROM data_user 
         WHERE LOWER(email) = LOWER($1) OR LOWER(username) = LOWER($1)`,
        [emailOrUsername]
      )
      
      if (checkResult.length === 0) {
        console.warn('User not found in database with email/username:', emailOrUsername)
        return NextResponse.json(
          {
            success: false,
            error: 'Email/Username tidak ditemukan'
          },
          { status: 401 }
        )
      }
      
      userExists = true
      const foundUser = checkResult[0]
      userStatus = foundUser.status_user
      
      console.log('User found:', { 
        email: foundUser.email, 
        status: foundUser.status_user,
        id: foundUser.no 
      })
      
      if (foundUser.status_user !== 'aktif') {
        console.warn('User found but status is not aktif:', { 
          emailOrUsername, 
          status: foundUser.status_user 
        })
        return NextResponse.json(
          {
            success: false,
            error: 'Akun Anda tidak aktif. Silakan hubungi administrator.'
          },
          { status: 401 }
        )
      }
      
      // Now get full user data
      const result = await db.query(
        `SELECT * FROM data_user 
         WHERE (LOWER(email) = LOWER($1) OR LOWER(username) = LOWER($1)) 
         AND status_user = $2`,
        [emailOrUsername, 'aktif']
      )
      
      if (result.length === 0) {
        console.warn('User query returned no results after status check')
        return NextResponse.json(
          {
            success: false,
            error: 'Email/Username tidak ditemukan'
          },
          { status: 401 }
        )
      }
      
      user = result[0]
    } catch (dbError: any) {
      console.error('Database error during login:', {
        error: dbError.message,
        code: dbError.code,
        emailOrUsername
      })
      
      // Don't expose database details to user
      return NextResponse.json(
        {
          success: false,
          error: 'Terjadi kesalahan saat proses login. Silakan coba lagi nanti.'
        },
        { status: 500 }
      )
    }
    
    // Check if user exists first
    if (!userExists || !user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Email/Username tidak ditemukan'
        },
        { status: 401 }
      )
    }
    
    // Check if user is active
    if (userStatus && userStatus !== 'aktif') {
      return NextResponse.json(
        {
          success: false,
          error: 'Akun Anda tidak aktif. Silakan hubungi administrator.'
        },
        { status: 401 }
      )
    }
    
    console.log('User found in database:', { 
      id: user.no, 
      name: user.nama_lengkap, 
      email: user.email,
      role: user.role,
      hasPassword: !!user.password
    })
    
    // Check if password field exists
    if (!user.password) {
      console.error('User password field is missing for user:', { 
        emailOrUsername, 
        userId: user.no 
      })
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid credentials'
        },
        { status: 401 }
      )
    }
    
    console.log('Checking password for user:', { emailOrUsername, userId: user.no })
    
    // Verify password
    // Check if password is already hashed (starts with $2a$, $2b$, or $2y$)
    const isHashed = user.password.startsWith('$2a$') || 
                     user.password.startsWith('$2b$') || 
                     user.password.startsWith('$2y$')
    
    let isValidPassword = false
    
    try {
      if (isHashed) {
        // Password is hashed, use bcrypt.compare
        console.log('Comparing hashed password with bcrypt...')
        isValidPassword = await bcrypt.compare(password, user.password)
        console.log('Password comparison result (hashed):', { 
          emailOrUsername, 
          isValid: isValidPassword
        })
      } else {
        // Password is plain text (for development/testing only)
        // WARNING: This should not be used in production!
        console.warn('Password is not hashed for user:', { 
          emailOrUsername, 
          userId: user.no
        })
        isValidPassword = password === user.password
        console.log('Password comparison result (plain text):', { 
          emailOrUsername, 
          isValid: isValidPassword
        })
      }
    } catch (compareError: any) {
      console.error('Error comparing password:', { 
        emailOrUsername, 
        error: compareError.message 
      })
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid credentials'
        },
        { status: 401 }
      )
    }
    
    if (!isValidPassword) {
      console.warn('Invalid password for user:', { 
        emailOrUsername, 
        userId: user.no,
        isHashed 
      })
      return NextResponse.json(
        {
          success: false,
          error: 'Password salah'
        },
        { status: 401 }
      )
    }
    
    console.log('Password verified, checking license...')

    // ========== LICENSE VERIFICATION ==========
    const userNo = user.no
    console.log('Checking license for userNo:', userNo)

    // Check license with produk_id = 3
    let license
    try {
      console.log('Querying license from database...')
      const licenseResult = await db.query(
        `SELECT id, user_id, produk_id, device_count, max_devices, tanggal_expired, status_lisensi
         FROM data_lisense 
         WHERE user_id = $1 AND produk_id = 3
         LIMIT 1`,
        [userNo]
      )
      console.log('License query result:', licenseResult ? `Found ${licenseResult.length} license(s)` : 'No result')

      if (!licenseResult || licenseResult.length === 0) {
        console.log('No license found for user')
        return NextResponse.json(
          {
            success: false,
            error: 'Anda tidak memiliki lisensi. Silahkan hubungi admin'
          },
          { status: 403 }
        )
      }

      license = licenseResult[0]
      console.log('License found:', { id: license.id, status: license.status_lisensi })

      // Check if license is expired
      const today = new Date()
      today.setHours(0, 0, 0, 0) // Set to start of day
      
      let tanggalExpired: Date | null = null
      if (license.tanggal_expired) {
        tanggalExpired = new Date(license.tanggal_expired)
        tanggalExpired.setHours(0, 0, 0, 0)
      }

      // Update status_lisensi to 'expired' if tanggal_expired is passed
      if (tanggalExpired && today > tanggalExpired) {
        // Update status to expired
        await db.update(
          `UPDATE data_lisense 
           SET status_lisensi = 'expired' 
           WHERE id = $1`,
          [license.id]
        )
        
        return NextResponse.json(
          {
            success: false,
            error: 'Lisensi Anda telah expired. Silahkan hubungi admin untuk memperpanjang lisensi.'
          },
          { status: 403 }
        )
      }

      // Check if license status is not active
      if (license.status_lisensi && license.status_lisensi !== 'aktif' && license.status_lisensi !== 'active') {
        console.log('License status is not active:', license.status_lisensi)
        return NextResponse.json(
          {
            success: false,
            error: 'Lisensi Anda tidak aktif. Silahkan hubungi admin'
          },
          { status: 403 }
        )
      }

      console.log('License verification completed successfully')
    } catch (licenseError: any) {
      console.error('License verification error:', licenseError)
      console.error('License error stack:', licenseError.stack)
      // Don't expose database details
      return NextResponse.json(
        {
          success: false,
          error: 'Terjadi kesalahan saat proses login. Silakan coba lagi nanti.'
        },
        { status: 500 }
      )
    }

    console.log('Starting device fingerprinting...')
    // ========== DEVICE FINGERPRINTING ==========
    // Get IP address
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                     request.headers.get('x-real-ip') ||
                     request.ip ||
                     ''

    // Generate device fingerprint (similar to login.php)
    const deviceFingerprint = crypto
      .createHash('sha256')
      .update(
        ipAddress +
        (device_name || '') +
        (device_identifier || '') +
        (user_agent || request.headers.get('user-agent') || '') +
        (timezone || '') +
        userNo.toString()
      )
      .digest('hex')

    const finalDeviceIdentifier = 'device-' + deviceFingerprint.substring(0, 32)
    console.log('Device fingerprint generated:', finalDeviceIdentifier)

    // ========== DEVICE COUNT CHECK ==========
    const licenseId = license.id
    const maxDevices = parseInt(license.max_devices) || 0
    console.log('Checking device count for license:', licenseId, 'max devices:', maxDevices)

    // Check if this device already has an active session
    let isExistingActiveDevice = false
    try {
      const existingSessionResult = await db.query(
        `SELECT is_active 
         FROM data_device_sessions 
         WHERE device_identifier = $1 AND user_no = $2 AND license_id = $3
         LIMIT 1`,
        [finalDeviceIdentifier, userNo, licenseId]
      )

      if (existingSessionResult && existingSessionResult.length > 0) {
        const existingSession = existingSessionResult[0]
        isExistingActiveDevice = existingSession.is_active === true || 
                                 existingSession.is_active === 't' || 
                                 existingSession.is_active == 1
      }
    } catch (sessionError: any) {
      console.error('Error checking existing session:', sessionError)
      // If we can't check session, fail login for security
      return NextResponse.json(
        {
          success: false,
          error: 'Terjadi kesalahan saat proses login. Silakan coba lagi nanti.'
        },
        { status: 500 }
      )
    }

    // Only check max devices if this is a new device or inactive device
    if (!isExistingActiveDevice && maxDevices > 0) {
      try {
        const activeDevicesResult = await db.query(
          `SELECT COUNT(DISTINCT device_identifier) as active_count 
           FROM data_device_sessions 
           WHERE license_id = $1 AND is_active = true`,
          [licenseId]
        )

        const activeDeviceCount = parseInt(activeDevicesResult[0]?.active_count || '0')

        if (activeDeviceCount >= maxDevices) {
          return NextResponse.json(
            {
              success: false,
              error: 'MAX DEVICE! Hubungi admin'
            },
            { status: 403 }
          )
        }
      } catch (deviceCountError: any) {
        console.error('Error checking device count:', deviceCountError)
        // If we can't check device count, fail login for security
        return NextResponse.json(
          {
            success: false,
            error: 'Terjadi kesalahan saat proses login. Silakan coba lagi nanti.'
          },
          { status: 500 }
        )
      }
    }

    // ========== DEVICE SESSION MANAGEMENT ==========
    const now = new Date().toISOString()
    const deviceName = device_name || request.headers.get('user-agent') || 'Unknown Device'
    const userAgent = user_agent || request.headers.get('user-agent') || ''

    // Get kode_tim from user_team_assignments (non-critical, can fail silently)
    let kodeTim = ''
    try {
      const teamResult = await db.query(
        `SELECT kode_tim FROM user_team_assignments WHERE user_no = $1 LIMIT 1`,
        [userNo]
      )
      if (teamResult && teamResult.length > 0) {
        kodeTim = teamResult[0].kode_tim || ''
      }
    } catch (teamError: any) {
      console.error('Error getting kode_tim:', teamError)
      // Non-critical, continue
    }

    // ========== CRITICAL: DEVICE SESSION MANAGEMENT (MUST SUCCEED) ==========
    try {
      const existingSessionCheck = await db.query(
        `SELECT is_active FROM data_device_sessions 
         WHERE device_identifier = $1 AND user_no = $2 LIMIT 1`,
        [finalDeviceIdentifier, userNo]
      )

      if (existingSessionCheck && existingSessionCheck.length > 0) {
        // Update existing session
        const currentIsActive = existingSessionCheck[0].is_active
        const wasInactive = !(currentIsActive === true || currentIsActive === 't' || currentIsActive == 1)

        await db.update(
          `UPDATE data_device_sessions 
           SET license_id = $1,
               device_id = $2,
               device_name = $3,
               ip_address = $4,
               login_at = $5,
               last_active = $6,
               is_active = true,
               updated_at = $7,
               kode_tim = $8
           WHERE device_identifier = $9 AND user_no = $10`,
          [
            licenseId,
            finalDeviceIdentifier,
            deviceName,
            ipAddress,
            now,
            now,
            now,
            kodeTim,
            finalDeviceIdentifier,
            userNo
          ]
        )

        // Sync device_count if session was previously inactive
        if (wasInactive) {
          try {
            await db.update(
              `UPDATE data_lisense 
               SET device_count = (
                 SELECT COUNT(DISTINCT device_identifier) 
                 FROM data_device_sessions 
                 WHERE license_id = $1 AND is_active = true
               )
               WHERE id = $2`,
              [licenseId, licenseId]
            )
          } catch (syncError: any) {
            console.error('Error syncing device count:', syncError)
            // Non-critical, continue
          }
        }
      } else {
        // Insert new device session (use query directly to avoid RETURNING clause issues)
        await db.query(
          `INSERT INTO data_device_sessions 
           (device_identifier, user_no, license_id, device_id, device_name, ip_address, login_at, last_active, is_active, created_at, updated_at, kode_tim)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, $9, $10, $11)`,
          [
            finalDeviceIdentifier,
            userNo,
            licenseId,
            finalDeviceIdentifier,
            deviceName,
            ipAddress,
            now,
            now,
            now,
            now,
            kodeTim
          ]
        )

        // Sync device_count after insert
        try {
          await db.update(
            `UPDATE data_lisense 
             SET device_count = (
               SELECT COUNT(DISTINCT device_identifier) 
               FROM data_device_sessions 
               WHERE license_id = $1 AND is_active = true
             )
             WHERE id = $2`,
            [licenseId, licenseId]
          )
        } catch (syncError: any) {
          console.error('Error syncing device count:', syncError)
          // Non-critical, continue
        }
      }
    } catch (sessionError: any) {
      console.error('Error managing device session:', sessionError)
      // CRITICAL: If device session management fails, login must fail
      return NextResponse.json(
        {
          success: false,
          error: 'Terjadi kesalahan saat proses login. Silakan coba lagi nanti.'
        },
        { status: 500 }
      )
    }

    console.log('Device session management completed')
    console.log('License verified, generating token...')

    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET || 'sorobot-live-secret-key-change-in-production'
    // Extend token expiry if remember me is checked (30 days vs 24 hours)
    const jwtExpiresIn: string = remember 
      ? (process.env.JWT_REMEMBER_EXPIRES_IN || '30d')
      : (process.env.JWT_EXPIRES_IN || '24h')
    
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const token = jwt.sign(
      {
        id: user.no,
        email: user.email,
        name: user.nama_lengkap,
        role: user.role,
        status: user.status_user,
        kode_site: user.kode_site || null,
        photo: user.photo_profil || null,
        deviceId,
        sessionId,
        lastActivity: Date.now()
      },
      jwtSecret,
      { expiresIn: jwtExpiresIn } as jwt.SignOptions
    )
    
    console.log('JWT token generated')

    console.log('Login successful for user:', user.nama_lengkap)

    // Convert photo_profil from bytea to base64 if needed
    let photoBase64 = null
    if (user.photo_profil) {
      try {
        if (Buffer.isBuffer(user.photo_profil)) {
          photoBase64 = `data:image/png;base64,${user.photo_profil.toString('base64')}`
        } else if (typeof user.photo_profil === 'string') {
          // Check if it's already a data URL or path
          if (user.photo_profil.startsWith('data:') || user.photo_profil.startsWith('http')) {
            photoBase64 = user.photo_profil
          } else {
            // It's a path, use as is
            photoBase64 = user.photo_profil
          }
        }
      } catch (error) {
        console.error('Error converting photo_profil to base64:', error)
      }
    }

    // Get team logo if user has kode_tim
    let logoBase64 = null
    if (user.kode_tim) {
      try {
        const teamResult = await db.query(
          `SELECT logo_tim, nama_tim FROM data_tim WHERE kode_tim = $1 LIMIT 1`,
          [user.kode_tim]
        ) as any[]
        
        if (teamResult && teamResult.length > 0 && teamResult[0].logo_tim) {
          const logoTim = teamResult[0].logo_tim
          if (Buffer.isBuffer(logoTim)) {
            logoBase64 = `data:image/png;base64,${logoTim.toString('base64')}`
          } else if (typeof logoTim === 'string') {
            logoBase64 = logoTim
          }
        }
      } catch (error) {
        console.error('Error getting team logo:', error)
      }
    }

    // Return success response
    return NextResponse.json({
      success: true,
      data: {
        token,
        user: {
          id: user.no,
          email: user.email,
          name: user.nama_lengkap,
          role: user.role,
          status: user.status_user,
          createdAt: user.created_at,
          lastLogin: user.last_login,
          photo: photoBase64 || user.photo_profil,
          photo_profile: photoBase64 || user.photo_profil,
          siteName: user.nama_site,
          whatsapp: user.no_whatsapp,
          telegram: user.username_telegram,
          kode_site: user.kode_site,
          nama_site: user.nama_site,
          logo_tim: logoBase64,
          licenseCount: 0,
          deviceCount: 0
        }
      }
    })

  } catch (error: any) {
    console.error('Login error:', error)
    // Don't expose error details to user
    return NextResponse.json(
      {
        success: false,
        error: 'Terjadi kesalahan saat proses login. Silakan coba lagi nanti.'
      },
      { status: 500 }
    )
  }
}

