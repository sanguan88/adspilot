import { NextRequest, NextResponse } from 'next/server'
import { getDatabaseConnection } from '@/lib/db'
import { requireActiveStatus } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await requireActiveStatus(request)
    const { searchParams } = new URL(request.url)
    const id_toko = searchParams.get('id_toko')
    const start_date = searchParams.get('start_date')
    const end_date = searchParams.get('end_date')
    
    if (!id_toko || !start_date || !end_date) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters: id_toko, start_date, end_date' },
        { status: 400 }
      )
    }
    
    const connection = await getDatabaseConnection()
    
    try {
      // Get user_id from data_toko
      const tokoQuery = 'SELECT user_id FROM data_toko WHERE id_toko = $1'
      const tokoResult = await connection.query(tokoQuery, [id_toko])
      
      if (tokoResult.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Account not found' },
          { status: 404 }
        )
      }
      
      const user_id = tokoResult.rows[0].user_id
      
      if (!user_id) {
        return NextResponse.json(
          { success: false, error: 'No user_id found for this account' },
          { status: 400 }
        )
      }
      
      // Get report_aggregate data per date
      const query = `
        SELECT 
          tanggal,
          broad_cir,
          broad_gmv,
          broad_order,
          broad_order_amount,
          broad_roi,
          checkout,
          checkout_rate,
          click,
          cost,
          cpc,
          cpdc,
          cr,
          ctr,
          direct_cr,
          direct_cir,
          direct_gmv,
          direct_order,
          direct_order_amount,
          direct_roi,
          impression,
          avg_rank,
          product_click,
          product_impression,
          product_ctr,
          location_in_ads,
          reach,
          page_views,
          unique_visitors,
          view,
          cpm,
          unique_click_user
        FROM report_aggregate
        WHERE user_id = $1 
          AND id_toko = $2 
          AND tanggal >= $3 
          AND tanggal <= $4
        ORDER BY tanggal DESC
      `
      
      const result = await connection.query(query, [user_id, id_toko, start_date, end_date])
      
      return NextResponse.json({
        success: true,
        data: result.rows
      })
    } finally {
      connection.release()
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

