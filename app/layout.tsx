import type { Metadata } from 'next'
import { Josefin_Sans } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'

const josefin = Josefin_Sans({
  variable: '--font-josefin',
  subsets: ['latin'],
  weight: ['300', '400', '600', '700'],
})

export const metadata: Metadata = {
  title: 'Circular',
  description: 'Private real estate investment platform',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://circular.enterprises'),
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${josefin.variable} font-sans antialiased`}>
        {children}
        <Toaster />
      </body>
    </html>
  )
}
