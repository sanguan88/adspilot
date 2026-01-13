import { NextRequest, NextResponse } from 'next/server'
import { getDatabaseConnection } from '@/lib/db'
import { requireActiveStatus } from '@/lib/auth'
import { PoolClient } from 'pg'

export async function GET(request: NextRequest) {
  let connection: PoolClient | null = null
  
  try {
    const user = await requireActiveStatus(request)
    const { searchParams } = new URL(request.url)
    const id_toko = searchParams.get('id_toko')
    
    if (!id_toko) {
      return NextResponse.json(
        { success: false, error: 'id_toko is required' },
        { status: 400 }
      )
    }
    
    connection = await getDatabaseConnection()
    
    const result = await connection.query(
      'SELECT cookies FROM data_toko WHERE id_toko = $1 AND cookies IS NOT NULL AND cookies != \'\'',
      [id_toko]
    )
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Cookies not found for this account' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      cookies: result.rows[0].cookies
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to get cookies' },
      { status: 500 }
    )
  } finally {
    if (connection) {
      connection.release()
    }
  }
}

