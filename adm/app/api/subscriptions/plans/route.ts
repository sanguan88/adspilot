import { NextRequest, NextResponse } from 'next/server'
import { getDatabaseConnection } from '@/lib/db'

// GET - List all plans
export async function GET() {
  let connection = null

  try {
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
      ORDER BY display_order ASC, plan_id ASC`
    )

    const plans = result.rows.map((row: any) => ({
      id: row.plan_id, // Use plan_id as id for compatibility
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
    }))

    connection.release()

    return NextResponse.json({
      success: true,
      data: plans,
    })
  } catch (error: any) {
    if (connection) {
      connection.release()
    }
    console.error('Error fetching plans:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Gagal mengambil data plans',
      },
      { status: 500 }
    )
  }
}

// POST - Create new plan (admin only)
export async function POST(request: NextRequest) {
  let connection = null

  try {
    const body = await request.json()
    const { name, price, billingCycle, features, description, isActive, planId, originalPrice, discountPercentage, durationMonths, durationDays } = body

    // Validation
    if (!name || price === undefined || !billingCycle || !features) {
      return NextResponse.json(
        { success: false, error: 'Name, price, billingCycle, dan features harus diisi' },
        { status: 400 }
      )
    }

    // Generate plan_id if not provided
    const finalPlanId = planId || name.toLowerCase().replace(/\s+/g, '-')
    const finalDurationMonths = durationMonths || (billingCycle === 'monthly' ? 1 : billingCycle === '3-month' ? 3 : billingCycle === '6-month' ? 6 : 1)

    connection = await getDatabaseConnection()

    // Check if plan with same plan_id already exists
    const checkResult = await connection.query(
      'SELECT plan_id FROM subscription_plans WHERE plan_id = $1',
      [finalPlanId]
    )

    if (checkResult.rows.length > 0) {
      connection.release()
      return NextResponse.json(
        { success: false, error: 'Plan dengan ID tersebut sudah ada' },
        { status: 400 }
      )
    }

    // Get max display_order
    const maxOrderResult = await connection.query(
      'SELECT COALESCE(MAX(display_order), 0) as max_order FROM subscription_plans'
    )
    const nextDisplayOrder = (maxOrderResult.rows[0]?.max_order || 0) + 1

    // Insert new plan
    const insertResult = await connection.query(
      `INSERT INTO subscription_plans (
        plan_id, name, description, price, original_price, discount_percentage,
        billing_cycle, duration_months, duration_days,
        max_accounts, max_automation_rules, max_campaigns, support_level,
        features, is_active, display_order
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *`,
      [
        finalPlanId,
        name,
        description || '',
        parseFloat(price),
        originalPrice ? parseFloat(originalPrice) : null,
        discountPercentage ? parseFloat(discountPercentage) : null,
        billingCycle,
        finalDurationMonths,
        durationDays || null,
        features.maxAccounts === '' || features.maxAccounts === 'unlimited' ? -1 : parseInt(features.maxAccounts) || 0,
        features.maxAutomationRules === '' || features.maxAutomationRules === 'unlimited' ? -1 : parseInt(features.maxAutomationRules) || 0,
        features.maxCampaigns === '' || features.maxCampaigns === 'unlimited' ? -1 : parseInt(features.maxCampaigns) || 0,
        features.support || 'community',
        JSON.stringify(features.featuresList || []),
        isActive !== undefined ? isActive : true,
        nextDisplayOrder,
      ]
    )

    const newPlanRow = insertResult.rows[0]
    const newPlan = {
      id: newPlanRow.plan_id,
      planId: newPlanRow.plan_id,
      name: newPlanRow.name,
      description: newPlanRow.description,
      price: parseFloat(newPlanRow.price),
      originalPrice: newPlanRow.original_price ? parseFloat(newPlanRow.original_price) : null,
      discountPercentage: newPlanRow.discount_percentage ? parseFloat(newPlanRow.discount_percentage) : null,
      billingCycle: newPlanRow.billing_cycle,
      durationMonths: newPlanRow.duration_months,
      durationDays: newPlanRow.duration_days,
      features: {
        maxAccounts: newPlanRow.max_accounts,
        maxAutomationRules: newPlanRow.max_automation_rules,
        maxCampaigns: newPlanRow.max_campaigns,
        support: newPlanRow.support_level,
      },
      featuresList: newPlanRow.features ? (Array.isArray(newPlanRow.features) ? newPlanRow.features : JSON.parse(newPlanRow.features)) : [],
      isActive: newPlanRow.is_active,
      displayOrder: newPlanRow.display_order,
    }

    connection.release()

    return NextResponse.json({
      success: true,
      message: 'Plan berhasil dibuat',
      data: newPlan,
    })
  } catch (error: any) {
    if (connection) {
      connection.release()
    }
    console.error('Create plan error:', error)
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan saat membuat plan' },
      { status: 500 }
    )
  }
}

