import { NextRequest } from 'next/server'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { getUser } from '@/lib/sheets/users'
import { generateMagicLinkToken, buildMagicLinkUrl } from '@/lib/auth/magic-link'
import { sendMagicLinkEmail } from '@/lib/email/send'

const GENERIC_MESSAGE = "If that email is in our system, you'll receive a link shortly."

function getRatelimit() {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null

  const redis = new Redis({ url, token })
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '1 h'),
    prefix: 'circular:magic-link',
  })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const email = (body.email || '').trim().toLowerCase()

    if (!email || !email.includes('@')) {
      return Response.json({ message: GENERIC_MESSAGE })
    }

    // Rate limit by email address
    const ratelimit = getRatelimit()
    if (ratelimit) {
      const { success } = await ratelimit.limit(email)
      if (!success) {
        return Response.json({ message: GENERIC_MESSAGE })
      }
    }

    // Look up user — always return generic message regardless of outcome
    const user = await getUser(email)
    if (!user || !user.active) {
      return Response.json({ message: GENERIC_MESSAGE })
    }

    // Generate token and send email
    const token = await generateMagicLinkToken(email)
    const magicLinkUrl = buildMagicLinkUrl(token)
    console.log('[DEV] Magic link:', magicLinkUrl)
    await sendMagicLinkEmail(email, user.name, magicLinkUrl)

    return Response.json({ message: GENERIC_MESSAGE })
  } catch (error) {
    console.error('[auth/request-link] Error:', error)
    // Still return generic message — do not reveal error details
    return Response.json({ message: GENERIC_MESSAGE })
  }
}
