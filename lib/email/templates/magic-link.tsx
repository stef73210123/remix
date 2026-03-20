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

interface MagicLinkEmailProps {
  name: string
  magicLinkUrl: string
}

export function MagicLinkEmail({ name, magicLinkUrl }: MagicLinkEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Your Circular login link — expires in 15 minutes</Preview>
      <Body style={{ backgroundColor: '#f9fafb', fontFamily: 'sans-serif' }}>
        <Container style={{ maxWidth: '560px', margin: '40px auto', padding: '40px', backgroundColor: '#ffffff', borderRadius: '8px' }}>
          <Heading style={{ fontSize: '24px', color: '#111827', marginBottom: '8px' }}>
            Sign in to Circular
          </Heading>
          <Text style={{ color: '#6b7280', marginBottom: '32px' }}>
            Hi {name}, click the button below to sign in. This link expires in 15 minutes.
          </Text>
          <Section style={{ textAlign: 'center', marginBottom: '32px' }}>
            <Button
              href={magicLinkUrl}
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
              Sign in to Circular
            </Button>
          </Section>
          <Text style={{ color: '#9ca3af', fontSize: '14px' }}>
            If you did not request this link, you can safely ignore this email.
          </Text>
          <Text style={{ color: '#9ca3af', fontSize: '12px', marginTop: '24px' }}>
            circular.enterprises
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default MagicLinkEmail
