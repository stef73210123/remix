import { NextResponse } from 'next/server'
import { Resend } from 'resend'

export const runtime = 'nodejs'

const CONTACT_TO = 'sm@remix.properties'

export async function POST(req: Request) {
  let body: { recipient?: string; name?: string; email?: string; message?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const recipient = (body.recipient || '').trim()
  const name = (body.name || '').trim()
  const email = (body.email || '').trim()
  const message = (body.message || '').trim()

  if (!recipient || !name || !email || !message) {
    return NextResponse.json({ error: 'All fields are required.' }, { status: 400 })
  }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('RESEND_API_KEY not set; contact message dropped:', { recipient, name, email, message })
    return NextResponse.json({ error: 'Contact form is not configured.' }, { status: 503 })
  }

  try {
    const resend = new Resend(apiKey)
    await resend.emails.send({
      from: process.env.RESEND_FROM || 'OpenNorthCastle <onboarding@resend.dev>',
      to: CONTACT_TO,
      replyTo: email,
      subject: `OpenNorthCastle contact form — ${recipient}`,
      html: `<p><strong>Routed to:</strong> ${escapeHtml(recipient)}</p>
<p><strong>From:</strong> ${escapeHtml(name)} (${escapeHtml(email)})</p>
<p style="white-space: pre-wrap;">${escapeHtml(message)}</p>`,
    })
  } catch (e) {
    console.error('contact email failed', e)
    return NextResponse.json({ error: 'Failed to send message.' }, { status: 502 })
  }

  return NextResponse.json({ ok: true })
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string)
}
