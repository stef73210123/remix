import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Remix Admin',
  description: 'Remix Properties admin',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
