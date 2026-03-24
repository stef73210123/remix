import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import {
  listPipelineLeads,
  appendPipelineLead,
  updatePipelineLead,
  deletePipelineLead,
} from '@/lib/sheets/pipeline'
import { getUser } from '@/lib/sheets/users'
import { upsertInvestorPosition } from '@/lib/sheets/investors'
import { appendDocumentRow } from '@/lib/sheets/documents'
import { appendSheetRow } from '@/lib/sheets/client'
import type { PipelineStage } from '@/lib/sheets/pipeline'

export const dynamic = 'force-dynamic'

async function requireAdmin(): Promise<{ email: string } | NextResponse> {
  const headersList = await headers()
  const email = headersList.get('x-user-email')
  const role = headersList.get('x-user-role')
  if (!email || role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const user = await getUser(email)
  if (!user || !user.active || user.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  return { email }
}

async function logActivity(adminEmail: string, action: string, target: string, details: object) {
  try {
    await appendSheetRow('Admin_Activity', [
      new Date().toISOString(),
      adminEmail,
      action,
      target,
      JSON.stringify(details),
    ])
  } catch (e) {
    console.error('[admin/pipeline] Failed to log activity:', e)
  }
}

function getLeadTier(lead: { stage: string; priority_tier?: string }): string {
  if (lead.stage !== 'backlog') return 'active'
  const pt = (lead.priority_tier || '').toLowerCase()
  if (pt === 'high') return 'high'
  if (pt === 'medium') return 'medium'
  if (pt === 'low') return 'low'
  return 'none'
}

export async function GET(req: NextRequest) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth
  try {
    const { searchParams } = new URL(req.url)
    // tiers param: comma-separated list of 'active','high','medium','low','none'
    // Default: active only (fast load — excludes all backlog)
    const tiersParam = searchParams.get('tiers')
    const tiers = new Set(tiersParam ? tiersParam.split(',') : ['active'])
    const leads = await listPipelineLeads()
    const filtered = leads.filter((l) => tiers.has(getLeadTier(l)))
    return NextResponse.json(filtered)
  } catch (error) {
    console.error('[admin/pipeline GET]', error)
    return NextResponse.json({ error: 'Failed to load pipeline' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth
  try {
    const body = await req.json()
    if (!body.name || !body.asset) {
      return NextResponse.json({ error: 'name and asset are required' }, { status: 400 })
    }
    const lead = await appendPipelineLead({
      name: body.name,
      email: body.email || '',
      phone: body.phone || '',
      asset: body.asset,
      target_amount: parseFloat(body.target_amount || '0'),
      actual_amount: parseFloat(body.actual_amount || '0'),
      stage: (body.stage || 'backlog') as PipelineStage,
      close_date: body.close_date || '',
      probability: parseFloat(body.probability || '0'),
      notes: body.notes || '',
      category: body.category || '',
      investor_type: body.investor_type || '',
      point_of_contact: body.point_of_contact || '',
      firm: body.firm || '',
      title: body.title || '',
      linkedin_url: body.linkedin_url || '',
      website: body.website || '',
      priority_tier: body.priority_tier || '',
      source: body.source || '',
      investment_rationale: body.investment_rationale || '',
      lifecycle_stage: body.lifecycle_stage || '',
      record_id: body.record_id || '',
      parent_id: body.parent_id || '',
      is_company: body.is_company || false,
    })
    await logActivity(auth.email, 'pipeline.create', lead.id, { name: body.name })
    return NextResponse.json({ message: 'Lead created', lead }, { status: 201 })
  } catch (error) {
    console.error('[admin/pipeline POST]', error)
    return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth
  try {
    const body = await req.json()
    if (!body.id) return NextResponse.json({ error: 'id is required' }, { status: 400 })
    const { id, ...updates } = body
    if (updates.target_amount !== undefined) updates.target_amount = parseFloat(updates.target_amount)
    if (updates.actual_amount !== undefined) updates.actual_amount = parseFloat(updates.actual_amount)
    if (updates.probability !== undefined) updates.probability = parseFloat(updates.probability)
    await updatePipelineLead(id, updates)
    await logActivity(auth.email, 'pipeline.update', id, updates)

    // Auto-create investor position when stage is closed
    if (updates.stage === 'closed') {
      try {
        const leads = await listPipelineLeads()
        const lead = leads.find((l) => l.id === id)
        if (lead) {
          await upsertInvestorPosition({
            investor_id: `pipeline-${lead.id}`,
            email: lead.email,
            name: lead.name,
            asset: lead.asset,
            equity_invested: updates.actual_amount ?? lead.actual_amount,
            ownership_pct: 0,
            capital_account_balance: updates.actual_amount ?? lead.actual_amount,
            nav_estimate: 0,
            irr_estimate: 0,
            equity_multiple: 0,
            distributions_total: 0,
            last_updated: new Date().toISOString().split('T')[0],
          })
          await logActivity(auth.email, 'investors.auto_create', lead.email, { asset: lead.asset, amount: updates.actual_amount ?? lead.actual_amount })

          // Carry over pipeline attachments to the investor Documents tab
          if (lead.documents && lead.email) {
            try {
              const docs: Array<{ name: string; url: string; uploaded_at: string }> = JSON.parse(lead.documents)
              for (const doc of docs) {
                // Extract R2 key from URL like /api/media?key=media/...
                let r2Key = doc.url
                const keyMatch = doc.url.match(/[?&]key=([^&]+)/)
                if (keyMatch) r2Key = decodeURIComponent(keyMatch[1])
                await appendDocumentRow({
                  email: lead.email,
                  asset: lead.asset,
                  doc_name: doc.name || doc.url.split('/').pop()?.split('?')[0] || 'attachment',
                  doc_type: 'other',
                  r2_key: r2Key,
                  date: doc.uploaded_at || new Date().toISOString().split('T')[0],
                  visible_to: 'lp',
                })
              }
              if (docs.length > 0) {
                await logActivity(auth.email, 'documents.carry_over', lead.email, { count: docs.length, asset: lead.asset })
              }
            } catch (docErr) {
              console.error('[admin/pipeline PATCH] Failed to carry over documents:', docErr)
            }
          }
        }
      } catch (e) {
        console.error('[admin/pipeline PATCH] Failed to auto-create investor position:', e)
      }
    }

    return NextResponse.json({ message: 'Lead updated' })
  } catch (error) {
    console.error('[admin/pipeline PATCH]', error)
    return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth
  try {
    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })
    await deletePipelineLead(id)
    await logActivity(auth.email, 'pipeline.delete', id, {})
    return NextResponse.json({ message: 'Lead deleted' })
  } catch (error) {
    console.error('[admin/pipeline DELETE]', error)
    return NextResponse.json({ error: 'Failed to delete lead' }, { status: 500 })
  }
}
