import { NextResponse } from 'next/server'
import { getDatabaseConnection } from '@/lib/db'

export async function GET() {
    const connection = await getDatabaseConnection()
    try {
        // 1. Drop the constraint if exists
        await connection.query(`ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_payment_status_check`)

        // 2. Add new constraint including 'waiting_confirmation'
        await connection.query(`
      ALTER TABLE transactions 
      ADD CONSTRAINT transactions_payment_status_check 
      CHECK (payment_status IN ('pending', 'paid', 'rejected', 'expired', 'cancelled', 'waiting_confirmation'))
    `)

        return NextResponse.json({ success: true, message: 'Schema updated successfully' })
    } catch (error: any) {
        console.error(error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    } finally {
        connection.release()
    }
}
