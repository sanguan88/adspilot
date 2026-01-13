import { NextRequest, NextResponse } from 'next/server'
import { getDatabaseConnection } from '@/lib/db'

// GET - Get plan by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { planId: string } }
) {
  let connection = null

  try {
    const { planId } = params
    connection = await getDatabaseConnection()

    const result = await connection.query(
      `SELECT 
        id,
        plan_id,
        name,
        description,
        price,
        original_price,
        discount_percentage,
        billing_cycle,
        duration_months,
        max_accounts,
        max_automation_rules,
        max_campaigns,
        support_level,
        features,
        is_active,
        display_order,
        duration_days,
        created_at,
        updated_at
      FROM subscription_plans
      WHERE plan_id = $1`,
      [planId]
    )

    if (result.rows.length === 0) {
      connection.release()
      return NextResponse.json(
        { success: false, error: 'Plan tidak ditemukan' },
        { status: 404 }
      )
    }

    const row = result.rows[0]
    const plan = {
      id: row.plan_id,
      planId: row.plan_id,
      name: row.name,
      description: row.description,
      price: parseFloat(row.price),
      originalPrice: row.original_price ? parseFloat(row.original_price) : null,
      discountPercentage: row.discount_percentage ? parseFloat(row.discount_percentage) : null,
      billingCycle: row.billing_cycle,
      durationMonths: row.duration_months,
      durationDays: row.duration_days,
      features: {
        maxAccounts: row.max_accounts,
        maxAutomationRules: row.max_automation_rules,
        maxCampaigns: row.max_campaigns,
        support: row.support_level,
      },
      featuresList: row.features ? (Array.isArray(row.features) ? row.features : JSON.parse(row.features)) : [],
      isActive: row.is_active,
      displayOrder: row.display_order,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }

    connection.release()

    return NextResponse.json({
      success: true,
      data: plan,
    })
  } catch (error: any) {
    if (connection) {
      connection.release()
    }
    console.error('Get plan error:', error)
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan' },
      { status: 500 }
    )
  }
}

// PUT - Update plan
export async function PUT(
  request: NextRequest,
  { params }: { params: { planId: string } }
) {
  let connection = null

  try {
    const { planId } = params
    const body = await request.json()
    const { name, price, billingCycle, features, description, isActive, originalPrice, discountPercentage, durationMonths, durationDays } = body

    connection = await getDatabaseConnection()

    // Check if plan exists
    const checkResult = await connection.query(
      'SELECT * FROM subscription_plans WHERE plan_id = $1',
      [planId]
    )

    if (checkResult.rows.length === 0) {
      connection.release()
      return NextResponse.json(
        { success: false, error: 'Plan tidak ditemukan' },
        { status: 404 }
      )
    }

    const existingPlan = checkResult.rows[0]

    // Update plan
    const updateResult = await connection.query(
      `UPDATE subscription_plans SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        price = COALESCE($3, price),
        original_price = COALESCE($4, original_price),
        discount_percentage = COALESCE($5, discount_percentage),
        billing_cycle = COALESCE($6, billing_cycle),
        duration_months = COALESCE($7, duration_months),
        max_accounts = COALESCE($8, max_accounts),
        max_automation_rules = COALESCE($9, max_automation_rules),
        max_campaigns = COALESCE($10, max_campaigns),
        support_level = COALESCE($11, support_level),
        features = COALESCE($12, features),
        is_active = COALESCE($13, is_active),
        duration_days = COALESCE($14, duration_days),
        updated_at = CURRENT_TIMESTAMP
      WHERE plan_id = $15
      RETURNING *`,
      [
        name || null,
        description !== undefined ? description : null,
        price !== undefined ? parseFloat(price) : null,
        originalPrice !== undefined ? (originalPrice ? parseFloat(originalPrice) : null) : null,
        discountPercentage !== undefined ? (discountPercentage ? parseFloat(discountPercentage) : null) : null,
        billingCycle || null,
        durationMonths !== undefined ? durationMonths : null,
        features && features.maxAccounts !== undefined
          ? (features.maxAccounts === '' || features.maxAccounts === 'unlimited' ? -1 : parseInt(features.maxAccounts))
          : null,
        features && features.maxAutomationRules !== undefined
          ? (features.maxAutomationRules === '' || features.maxAutomationRules === 'unlimited' ? -1 : parseInt(features.maxAutomationRules))
          : null,
        features && features.maxCampaigns !== undefined
          ? (features.maxCampaigns === '' || features.maxCampaigns === 'unlimited' ? -1 : parseInt(features.maxCampaigns))
          : null,
        features && features.support ? features.support : null,
        features && features.featuresList ? JSON.stringify(features.featuresList) : null,
        isActive !== undefined ? isActive : null,
        durationDays !== undefined ? durationDays : null,
        planId,
      ]
    )

    const updatedRow = updateResult.rows[0]
    const updatedPlan = {
      id: updatedRow.plan_id,
      planId: updatedRow.plan_id,
      name: updatedRow.name,
      description: updatedRow.description,
      price: parseFloat(updatedRow.price),
      originalPrice: updatedRow.original_price ? parseFloat(updatedRow.original_price) : null,
      discountPercentage: updatedRow.discount_percentage ? parseFloat(updatedRow.discount_percentage) : null,
      billingCycle: updatedRow.billing_cycle,
      durationMonths: updatedRow.duration_months,
      durationDays: updatedRow.duration_days,
      features: {
        maxAccounts: updatedRow.max_accounts,
        maxAutomationRules: updatedRow.max_automation_rules,
        maxCampaigns: updatedRow.max_campaigns,
        support: updatedRow.support_level,
      },
      featuresList: updatedRow.features ? (Array.isArray(updatedRow.features) ? updatedRow.features : JSON.parse(updatedRow.features)) : [],
      isActive: updatedRow.is_active,
      displayOrder: updatedRow.display_order,
    }

    connection.release()

    return NextResponse.json({
      success: true,
      message: 'Plan berhasil diupdate',
      data: updatedPlan,
    })
  } catch (error: any) {
    if (connection) {
      connection.release()
    }
    console.error('Update plan error:', error)
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan saat mengupdate plan' },
      { status: 500 }
    )
  }
}

// DELETE - Delete plan
export async function DELETE(
  request: NextRequest,
  { params }: { params: { planId: string } }
) {
  let connection = null

  try {
    const { planId } = params
    connection = await getDatabaseConnection()

    // Check if plan exists
    const checkResult = await connection.query(
      'SELECT plan_id FROM subscription_plans WHERE plan_id = $1',
      [planId]
    )

    if (checkResult.rows.length === 0) {
      connection.release()
      return NextResponse.json(
        { success: false, error: 'Plan tidak ditemukan' },
        { status: 404 }
      )
    }

    // Check if plan is being used in subscriptions
    const subscriptionCheck = await connection.query(
      'SELECT COUNT(*) as count FROM subscriptions WHERE plan_id = $1',
      [planId]
    )

    if (parseInt(subscriptionCheck.rows[0].count) > 0) {
      connection.release()
      return NextResponse.json(
        { success: false, error: 'Plan tidak dapat dihapus karena masih digunakan oleh subscription aktif' },
        { status: 400 }
      )
    }

    // Delete plan
    await connection.query(
      'DELETE FROM subscription_plans WHERE plan_id = $1',
      [planId]
    )

    connection.release()

    return NextResponse.json({
      success: true,
      message: 'Plan berhasil dihapus',
    })
  } catch (error: any) {
    if (connection) {
      connection.release()
    }
    console.error('Delete plan error:', error)
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan saat menghapus plan' },
      { status: 500 }
    )
  }
}

