import { NextRequest, NextResponse } from 'next/server'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { sendDealRoomRequestEmail } from '@/lib/email/send'

function getRatelimit() {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null

  const redis = new Redis({ url, token })
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(3, '1 h'),
    prefix: 'circular:request-access',
  })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, email, asset, message } = body

    if (!name || !email || !email.includes('@')) {
      return NextResponse.json({ error: 'Name and valid email are required' }, { status: 400 })
    }

    // Rate limit by IP
    const ratelimit = getRatelimit()
    if (ratelimit) {
      const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
      const { success } = await ratelimit.limit(ip)
      if (!success) {
        return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
      }
    }

    await sendDealRoomRequestEmail(
      name.trim(),
      email.trim().toLowerCase(),
      asset || 'Not specified',
      (message || '').trim()
    )

    return NextResponse.json({ message: "Thanks, we'll be in touch shortly." })
  } catch (error) {
    console.error('[contact/request-access] Error:', error)
    return NextResponse.json({ error: 'Failed to submit request' }, { status: 500 })
  }
}
