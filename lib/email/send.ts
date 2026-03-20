import { Resend } from 'resend'

function getResend(): Resend {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) throw new Error('RESEND_API_KEY env var is not set')
  return new Resend(apiKey)
}

function getAdminEmail(): string {
  const email = process.env.ADMIN_EMAIL
  if (!email) throw new Error('ADMIN_EMAIL env var is not set')
  return email
}

interface SendEmailOptions {
  to: string | string[]
  subject: string
  react: React.ReactElement
}

export async function sendEmail({ to, subject, react }: SendEmailOptions): Promise<void> {
  const resend = getResend()
  const { error } = await resend.emails.send({
    from: 'Circular <noreply@circular.enterprises>',
    to: Array.isArray(to) ? to : [to],
    subject,
    react,
  })
  if (error) {
    throw new Error(`Failed to send email: ${error.message}`)
  }
}

export async function sendMagicLinkEmail(
  to: string,
  name: string,
  magicLinkUrl: string
): Promise<void> {
  const { MagicLinkEmail } = await import('./templates/magic-link')
  await sendEmail({
    to,
    subject: 'Your Circular login link',
    react: MagicLinkEmail({ name, magicLinkUrl }),
  })
}

export async function sendDealRoomRequestEmail(
  name: string,
  email: string,
  asset: string,
  message: string
): Promise<void> {
  const { DealRoomRequestEmail } = await import('./templates/deal-room-request')
  await sendEmail({
    to: getAdminEmail(),
    subject: `Deal Room Access Request — ${name}`,
    react: DealRoomRequestEmail({ name, email, asset, message }),
  })
}

export async function sendWelcomeInvestorEmail(
  to: string,
  name: string,
  assets: string[]
): Promise<void> {
  const { WelcomeInvestorEmail } = await import('./templates/welcome-investor')
  const loginUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/login`
  await sendEmail({
    to,
    subject: 'Welcome to Circular — Your investor portal is ready',
    react: WelcomeInvestorEmail({ name, assets, loginUrl }),
  })
}

export async function sendInvestorUpdateEmail(
  to: string,
  name: string,
  assetName: string,
  title: string,
  body: string,
  asset: string
): Promise<void> {
  const { InvestorUpdateEmail } = await import('./templates/investor-update')
  const portalUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/portal/${asset}`
  await sendEmail({
    to,
    subject: `${assetName}: ${title}`,
    react: InvestorUpdateEmail({ name, assetName, title, body, portalUrl }),
  })
}

export async function sendDistributionNoticeEmail(
  to: string,
  name: string,
  asset: string,
  amount: number,
  date: string
): Promise<void> {
  const { DistributionNoticeEmail } = await import('./templates/distribution-notice')
  const portalUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/portal`
  await sendEmail({
    to,
    subject: `Distribution Notice — ${asset}`,
    react: DistributionNoticeEmail({ name, asset, amount, date, portalUrl }),
  })
}
