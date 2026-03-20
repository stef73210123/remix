'use client'

import DOMPurify from 'isomorphic-dompurify'
import { cn } from '@/lib/utils'

interface DocRendererProps {
  html: string
  className?: string
}

export default function DocRenderer({ html, className }: DocRendererProps) {
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'h1', 'h2', 'h3', 'h4', 'p', 'ul', 'ol', 'li',
      'strong', 'em', 'u', 'a', 'table', 'thead', 'tbody',
      'tr', 'th', 'td', 'br',
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  })

  return (
    <div
      className={cn(
        'prose prose-zinc prose-lg max-w-none',
        'prose-headings:font-semibold prose-headings:tracking-tight',
        'prose-a:text-primary prose-a:no-underline hover:prose-a:underline',
        'prose-table:text-sm',
        className
      )}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  )
}
