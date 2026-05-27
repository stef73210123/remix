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

interface InvestorUpdateEmailProps {
  name: string
  assetName: string
  title: string
  body: string
  portalUrl: string
}

export function InvestorUpdateEmail({ name, assetName, title, body, portalUrl }: InvestorUpdateEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{assetName}: {title}</Preview>
      <Body style={{ backgroundColor: '#f9fafb', fontFamily: 'sans-serif' }}>
        <Container style={{ maxWidth: '560px', margin: '40px auto', padding: '40px', backgroundColor: '#ffffff', borderRadius: '8px' }}>
          <Text style={{ color: '#6B7A58', fontSize: '12px', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' }}>
            {assetName} — Investor Update
          </Text>
          <Heading style={{ fontSize: '22px', color: '#111827', marginBottom: '8px' }}>
            {title}
          </Heading>
          <Text style={{ color: '#6b7280', marginBottom: '16px' }}>Hi {name},</Text>
          <Text style={{ color: '#374151', marginBottom: '32px', lineHeight: '1.6', whiteSpace: 'pre-line' }}>
            {body}
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
                fontSize: '15px',
                textDecoration: 'none',
                display: 'inline-block',
              }}
            >
              View in Portal
            </Button>
          </Section>
          <Text style={{ color: '#9ca3af', fontSize: '12px' }}>circular.enterprises</Text>
        </Container>
      </Body>
    </Html>
  )
}

export default InvestorUpdateEmail
