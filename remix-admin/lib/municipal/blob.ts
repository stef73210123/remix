/**
 * Vercel Blob wrapper — stores meeting PDFs / MP4s / captions.
 *
 * Naming convention:
 *   municipal/{muniKey}/{bodyKey}/{scheduledDate}/{kind}-{sha256}.{ext}
 *
 * Content-addressed by sha256 so repeat fetches dedupe automatically.
 * MP4s can be large (300MB–1.5GB); use `putStream` to avoid buffering
 * whole payloads in memory when we run transcription in M1½.
 */
import { put, head } from '@vercel/blob'
import { createHash } from 'crypto'

export interface BlobPutResult {
  url: string
  sha256: string
  contentType: string
  size: number
}

function ensureToken(): void {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error('BLOB_READ_WRITE_TOKEN env var is not set')
  }
}

function sha256(buf: Buffer): string {
  return createHash('sha256').update(buf).digest('hex')
}

function extForContentType(ct: string): string {
  if (ct.includes('pdf')) return 'pdf'
  if (ct.includes('mp4')) return 'mp4'
  if (ct.includes('vtt')) return 'vtt'
  if (ct.includes('srt')) return 'srt'
  if (ct.includes('json')) return 'json'
  if (ct.includes('html')) return 'html'
  return 'bin'
}

function pathFor(
  muniKey: string,
  bodyKey: string,
  scheduledDate: string,   // 'YYYY-MM-DD'
  kind: string,
  digest: string,
  contentType: string,
): string {
  return `municipal/${muniKey}/${bodyKey}/${scheduledDate}/${kind}-${digest.slice(0, 12)}.${extForContentType(contentType)}`
}

export async function putAsset(opts: {
  muniKey: string
  bodyKey: string
  scheduledDate: string
  kind: string
  content: Buffer
  contentType: string
}): Promise<BlobPutResult> {
  ensureToken()
  const digest = sha256(opts.content)
  const path = pathFor(opts.muniKey, opts.bodyKey, opts.scheduledDate, opts.kind, digest, opts.contentType)

  // Dedup: if a blob already exists at this path, `head` returns it.
  try {
    const existing = await head(path)
    if (existing?.url) {
      return {
        url: existing.url,
        sha256: digest,
        contentType: opts.contentType,
        size: opts.content.byteLength,
      }
    }
  } catch {
    // 404 = not found, fall through to put
  }

  const res = await put(path, opts.content, {
    access: 'public',
    contentType: opts.contentType,
    addRandomSuffix: false,
  })

  return {
    url: res.url,
    sha256: digest,
    contentType: opts.contentType,
    size: opts.content.byteLength,
  }
}
