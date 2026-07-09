import type { Metadata } from 'next'
import './globals.css'
import TopoBackground from './TopoBackground'

export const metadata: Metadata = {
  title: 'Remix Admin',
  description: 'Remix Properties admin',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-32.png', type: 'image/png', sizes: '32x32' },
      { url: '/favicon-16.png', type: 'image/png', sizes: '16x16' },
    ],
    apple: '/favicon-180.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <TopoBackground />
        {children}
      </body>
    </html>
  )
}
