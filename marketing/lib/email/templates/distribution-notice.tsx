import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import * as React from 'react'

interface DistributionNoticeEmailProps {
  name: string
  asset: string
  amount: number
  date: string
  portalUrl: string
}

const ASSET_NAMES: Record<string, string> = {
  livingstonfarm: 'Livingston Farm',
  wrenofthewoods: 'Wren of the Woods',
}

export function DistributionNoticeEmail({
  name,
  asset,
  amount,
  date,
  portalUrl,
}: DistributionNoticeEmailProps) {
  const assetName = ASSET_NAMES[asset] || asset
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)

  const formattedDate = new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <Html>
      <Head />
      <Preview>Distribution Notice — {assetName}: {formattedAmount}</Preview>
      <Body style={{ backgroundColor: '#f9fafb', fontFamily: 'sans-serif' }}>
        <Container style={{ maxWidth: '560px', margin: '40px auto', padding: '40px', backgroundColor: '#ffffff', borderRadius: '8px' }}>
          <Heading style={{ fontSize: '24px', color: '#111827', marginBottom: '8px' }}>
            Distribution Notice
          </Heading>
          <Text style={{ color: '#6b7280', marginBottom: '32px' }}>
            Hi {name},
          </Text>
          <Text style={{ color: '#374151', marginBottom: '24px' }}>
            A distribution has been processed for your investment in <strong>{assetName}</strong>.
          </Text>
          <Section style={{ backgroundColor: '#f3f4f6', padding: '24px', borderRadius: '6px', marginBottom: '32px' }}>
            <Text style={{ margin: '0 0 8px', color: '#374151' }}><strong>Asset:</strong> {assetName}</Text>
            <Text style={{ margin: '0 0 8px', color: '#374151' }}><strong>Amount:</strong> {formattedAmount}</Text>
            <Text style={{ margin: '0', color: '#374151' }}><strong>Date:</strong> {formattedDate}</Text>
          </Section>
          <Text style={{ color: '#374151', marginBottom: '24px' }}>
            You can view your complete distribution history in your investor portal.
          </Text>
          <Section style={{ textAlign: 'center', marginBottom: '32px' }}>
            <Button
              href={portalUrl}
              style={{
                backgroundColor: '#111827',
                color: '#ffffff',
                padding: '12px 32px',
                borderRadius: '6px',
                fontWeight: '600',
                fontSize: '16px',
                textDecoration: 'none',
                display: 'inline-block',
              }}
            >
              View Portal
            </Button>
          </Section>
          <Text style={{ color: '#9ca3af', fontSize: '12px' }}>
            circular.enterprises
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default DistributionNoticeEmail
