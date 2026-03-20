import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { getUserPortfolioSummary } from '@/lib/sheets/portfolio'

export async function GET() {
  try {
    const headersList = await headers()
    const email = headersList.get('x-user-email')
    const role = headersList.get('x-user-role')

    if (!email || !role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const summary = await getUserPortfolioSummary(email)
    return NextResponse.json(summary)
  } catch (error) {
    console.error('[sheets/portfolio] Error:', error)
    return NextResponse.json({ error: 'Failed to load portfolio' }, { status: 500 })
  }
}
