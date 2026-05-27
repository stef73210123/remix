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

interface WelcomeInvestorEmailProps {
  name: string
  assets: string[]
  loginUrl: string
}

const ASSET_NAMES: Record<string, string> = {
  livingstonfarm: 'Livingston Farm',
  wrenofthewoods: 'Wren of the Woods',
}

export function WelcomeInvestorEmail({ name, assets, loginUrl }: WelcomeInvestorEmailProps) {
  const assetNames = assets.map((a) => ASSET_NAMES[a] || a).join(', ')

  return (
    <Html>
      <Head />
      <Preview>Welcome to Circular — your investor portal is ready</Preview>
      <Body style={{ backgroundColor: '#f9fafb', fontFamily: 'sans-serif' }}>
        <Container style={{ maxWidth: '560px', margin: '40px auto', padding: '40px', backgroundColor: '#ffffff', borderRadius: '8px' }}>
          <Heading style={{ fontSize: '24px', color: '#111827', marginBottom: '8px' }}>
            Welcome to Circular
          </Heading>
          <Text style={{ color: '#6b7280', marginBottom: '16px' }}>
            Hi {name},
          </Text>
          <Text style={{ color: '#374151', marginBottom: '32px' }}>
            Your investor account has been created. You now have access to the investor portal for <strong>{assetNames}</strong>.
          </Text>
          <Text style={{ color: '#374151', marginBottom: '16px' }}>
            Use the button below to sign in. You&apos;ll receive a secure login link each time — no password needed.
          </Text>
          <Section style={{ textAlign: 'center', marginBottom: '32px' }}>
            <Button
              href={loginUrl}
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
              Access Your Portal
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

export default WelcomeInvestorEmail
