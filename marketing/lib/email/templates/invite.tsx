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

interface InviteEmailProps {
  name: string
  inviteUrl: string
}

export function InviteEmail({ name, inviteUrl }: InviteEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>You&apos;re invited to Circular — set your password to get started</Preview>
      <Body style={{ backgroundColor: '#f9fafb', fontFamily: 'sans-serif' }}>
        <Container style={{ maxWidth: '560px', margin: '40px auto', padding: '40px', backgroundColor: '#ffffff', borderRadius: '8px' }}>
          <Heading style={{ fontSize: '24px', color: '#111827', marginBottom: '8px' }}>
            You&apos;re invited to Circular
          </Heading>
          <Text style={{ color: '#6b7280', marginBottom: '32px' }}>
            Hi {name}, your account has been created on the Circular private investment platform. Click the button below to set your password and get started. This link expires in 7 days.
          </Text>
          <Section style={{ textAlign: 'center', marginBottom: '32px' }}>
            <Button
              href={inviteUrl}
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
              Set your password
            </Button>
          </Section>
          <Text style={{ color: '#9ca3af', fontSize: '14px' }}>
            If you did not expect this invitation, you can safely ignore this email.
          </Text>
          <Text style={{ color: '#9ca3af', fontSize: '12px', marginTop: '24px' }}>
            circular.enterprises
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default InviteEmail
