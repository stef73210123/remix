import type { Metadata } from 'next'
import './globals.css'
import './opennorthcastle.css'
import TopoBackground from './TopoBackground'
import { FLAVOR, isOpen } from '@/lib/flavor'

export const metadata: Metadata = isOpen
  ? {
      title: 'OpenNorthCastle',
      description:
        'A free, nonpartisan dashboard tracking North Castle town meetings, officials, budgets, and land-use applications.',
    }
  : {
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

// OpenNorthCastle uses IBM Plex Sans/Mono (UI) + Newsreader (display); the dark
// Remix flavor uses the system stack and doesn't load these.
const ONC_FONTS =
  'https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400;6..72,500;6..72,600;6..72,700&family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-flavor={FLAVOR}>
      {isOpen && (
        <head>
          <link rel="stylesheet" href={ONC_FONTS} />
        </head>
      )}
      <body>
        {!isOpen && <TopoBackground />}
        {children}
      </body>
    </html>
  )
}
