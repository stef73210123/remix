import type { docs_v1 } from 'googleapis'
import type { ParsedDoc, DocSection } from '@/types'

type DocElement = docs_v1.Schema$StructuralElement
type Paragraph = docs_v1.Schema$Paragraph
type ParagraphElement = docs_v1.Schema$ParagraphElement
type TableRow = docs_v1.Schema$TableRow

function getHeadingLevel(style: string | null | undefined): 1 | 2 | 3 | null {
  if (style === 'HEADING_1') return 1
  if (style === 'HEADING_2') return 2
  if (style === 'HEADING_3') return 3
  return null
}

function renderTextRun(element: ParagraphElement): string {
  const textRun = element.textRun
  if (!textRun || !textRun.content) return ''

  let text = textRun.content.replace(/\n$/, '')
  if (!text) return ''

  // Escape HTML entities
  text = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  const style = textRun.textStyle || {}

  if (style.link?.url) {
    text = `<a href="${style.link.url}" target="_blank" rel="noopener noreferrer">${text}</a>`
  }
  if (style.bold) text = `<strong>${text}</strong>`
  if (style.italic) text = `<em>${text}</em>`
  if (style.underline && !style.link) text = `<u>${text}</u>`

  return text
}

function renderParagraphContent(paragraph: Paragraph): string {
  return (paragraph.elements || []).map(renderTextRun).join('')
}

function renderTable(table: docs_v1.Schema$Table): string {
  const rows = table.tableRows || []
  let html = '<table><tbody>'
  rows.forEach((row: TableRow, rowIdx: number) => {
    html += '<tr>'
    ;(row.tableCells || []).forEach((cell) => {
      const tag = rowIdx === 0 ? 'th' : 'td'
      const cellContent = (cell.content || [])
        .map((el: DocElement) => {
          if (el.paragraph) return renderParagraphContent(el.paragraph)
          return ''
        })
        .join(' ')
      html += `<${tag}>${cellContent}</${tag}>`
    })
    html += '</tr>'
  })
  html += '</tbody></table>'
  return html
}

function renderList(
  elements: DocElement[],
  startIdx: number,
  listId: string,
  nestingLevel: number
): { html: string; endIdx: number } {
  const items: string[] = []
  let i = startIdx

  while (i < elements.length) {
    const el = elements[i]
    const para = el.paragraph
    if (!para) break

    const bullet = para.bullet
    if (!bullet || bullet.listId !== listId || (bullet.nestingLevel || 0) < nestingLevel) break
    if ((bullet.nestingLevel || 0) > nestingLevel) break

    const content = renderParagraphContent(para)
    items.push(`<li>${content}</li>`)
    i++
  }

  return { html: `<ul>${items.join('')}</ul>`, endIdx: i }
}

/**
 * Converts a Google Doc JSON body into structured HTML.
 */
export function parseDocToHtml(doc: docs_v1.Schema$Document): ParsedDoc {
  const body = doc.body
  if (!body || !body.content) return { sections: [], fullHtml: '' }

  const elements = body.content
  const sections: DocSection[] = []
  const htmlParts: string[] = []

  let currentSection: DocSection | null = null
  let currentSectionParts: string[] = []

  function flushSection() {
    if (currentSection) {
      currentSection.html = currentSectionParts.join('')
      sections.push(currentSection)
      currentSectionParts = []
      currentSection = null
    }
  }

  let i = 0
  while (i < elements.length) {
    const el = elements[i]

    if (el.paragraph) {
      const para = el.paragraph
      const styleType = para.paragraphStyle?.namedStyleType
      const level = getHeadingLevel(styleType)
      const content = renderParagraphContent(para)

      if (level !== null) {
        flushSection()
        const headingHtml = `<h${level}>${content}</h${level}>`
        htmlParts.push(headingHtml)
        currentSection = { heading: content, level, html: '' }
        currentSectionParts = []
        i++
        continue
      }

      // Check for list
      if (para.bullet) {
        const listId = para.bullet.listId!
        const nestingLevel = para.bullet.nestingLevel || 0
        const { html, endIdx } = renderList(elements, i, listId, nestingLevel)
        htmlParts.push(html)
        currentSectionParts.push(html)
        i = endIdx
        continue
      }

      if (content.trim()) {
        const paraHtml = `<p>${content}</p>`
        htmlParts.push(paraHtml)
        currentSectionParts.push(paraHtml)
      }
      i++
    } else if (el.table) {
      const tableHtml = renderTable(el.table)
      htmlParts.push(tableHtml)
      currentSectionParts.push(tableHtml)
      i++
    } else {
      i++
    }
  }

  flushSection()

  return {
    sections,
    fullHtml: htmlParts.join('\n'),
  }
}

/**
 * Extracts a named section (by H1 heading text) from a ParsedDoc.
 */
export function getSectionHtml(
  parsed: ParsedDoc,
  heading: string,
  level: 1 | 2 | 3 = 1
): string {
  const section = parsed.sections.find(
    (s) => s.level === level && s.heading.toLowerCase() === heading.toLowerCase()
  )
  return section?.html || ''
}
