import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import './opennorthcastle.css'
import TopoBackground from './TopoBackground'
import SiteFooter from './SiteFooter'
import ScrollToTop from './ScrollToTop'
import PreventOverscrollBounce from './PreventOverscrollBounce'
import PinBottomBar from './PinBottomBar'
import { FLAVOR, isOpen } from '@/lib/flavor'

export const metadata: Metadata = isOpen
  ? {
      title: 'OpenNorthCastle',
      description:
        'A free, nonpartisan dashboard tracking North Castle town meetings, officials, budgets, and land-use applications.',
      // The town-seal eagle from the wordmark, cropped onto a white square.
      icons: {
        icon: [
          { url: '/onc-icon-32.png', type: 'image/png', sizes: '32x32' },
          { url: '/onc-icon-16.png', type: 'image/png', sizes: '16x16' },
          { url: '/onc-icon-192.png', type: 'image/png', sizes: '192x192' },
        ],
        apple: '/onc-icon-180.png',
      },
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

// Pin the scale so mobile Safari doesn't auto-zoom when a text field is
// focused — that zoom was cropping the embedded "report an issue" / contact
// forms (whose inputs live in a cross-origin iframe we can't restyle, so the
// viewport is the only lever).
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
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
        {isOpen ? (
          <div className="onc-shell">
            <div className="onc-shell-content">{children}</div>
            <SiteFooter />
          </div>
        ) : (
          children
        )}
        {isOpen && <PreventOverscrollBounce />}
        {isOpen && <PinBottomBar />}
        <ScrollToTop />
        <Analytics />
      </body>
    </html>
  )
}
