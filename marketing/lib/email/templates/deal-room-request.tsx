import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import * as React from 'react'

interface DealRoomRequestEmailProps {
  name: string
  email: string
  asset: string
  message: string
}

export function DealRoomRequestEmail({ name, email, asset, message }: DealRoomRequestEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Deal Room Access Request from {name}</Preview>
      <Body style={{ backgroundColor: '#f9fafb', fontFamily: 'sans-serif' }}>
        <Container style={{ maxWidth: '560px', margin: '40px auto', padding: '40px', backgroundColor: '#ffffff', borderRadius: '8px' }}>
          <Heading style={{ fontSize: '22px', color: '#111827', marginBottom: '24px' }}>
            Deal Room Access Request
          </Heading>
          <Section style={{ backgroundColor: '#f3f4f6', padding: '24px', borderRadius: '6px', marginBottom: '24px' }}>
            <Text style={{ margin: '0 0 8px', color: '#374151' }}><strong>Name:</strong> {name}</Text>
            <Text style={{ margin: '0 0 8px', color: '#374151' }}><strong>Email:</strong> {email}</Text>
            <Text style={{ margin: '0 0 8px', color: '#374151' }}><strong>Asset:</strong> {asset}</Text>
          </Section>
          {message && (
            <>
              <Text style={{ fontWeight: '600', color: '#374151', marginBottom: '8px' }}>Message:</Text>
              <Text style={{ color: '#6b7280', whiteSpace: 'pre-wrap' }}>{message}</Text>
            </>
          )}
          <Text style={{ color: '#9ca3af', fontSize: '12px', marginTop: '32px' }}>
            circular.enterprises
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default DealRoomRequestEmail
