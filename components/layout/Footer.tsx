import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="border-t border-border/40 bg-background mt-auto">
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex flex-col items-center gap-1 sm:items-start">
            <span className="text-sm font-semibold tracking-tight">Circular</span>
            <span className="text-xs text-muted-foreground">circular.enterprises</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <Link href="/request-access" className="hover:text-foreground transition-colors">
              Request Access
            </Link>
            <a href="mailto:info@circular.enterprises" className="hover:text-foreground transition-colors">
              Contact
            </a>
          </div>
        </div>
        <div className="mt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Circular. All rights reserved. For accredited investors only.
        </div>
      </div>
    </footer>
  )
}
