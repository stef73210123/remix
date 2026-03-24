import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Convert tile z/x/y → WGS84 bounding box for ArcGIS export endpoint
function tileToBbox(x: number, y: number, z: number): string {
  const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, z)
  const north = (180 / Math.PI) * Math.atan(Math.sinh(n))
  const south = (180 / Math.PI) * Math.atan(Math.sinh(Math.PI - (2 * Math.PI * (y + 1)) / Math.pow(2, z)))
  const west = (x / Math.pow(2, z)) * 360 - 180
  const east = ((x + 1) / Math.pow(2, z)) * 360 - 180
  return `${west},${south},${east},${north}`
}

const SERVERS: Record<string, string> = {
  sullivan: 'https://gis.sullivanny.us/arcgis/rest/services',
  westchester: 'https://giswww.westchestergov.com/arcgis/rest/services',
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const server = searchParams.get('server')
  const service = searchParams.get('service')
  const z = parseInt(searchParams.get('z') || '0')
  const x = parseInt(searchParams.get('x') || '0')
  const y = parseInt(searchParams.get('y') || '0')

  if (!server || !service || !SERVERS[server]) {
    return new NextResponse('Bad request', { status: 400 })
  }

  const baseUrl = SERVERS[server]
  const bbox = tileToBbox(x, y, z)

  // Try tile cache first (fastest), fall back to export endpoint
  const tileUrl = `${baseUrl}/${service}/MapServer/tile/${z}/${y}/${x}`
  const exportUrl = `${baseUrl}/${service}/MapServer/export?bbox=${bbox}&bboxSR=4326&imageSR=4326&size=256,256&format=png32&transparent=true&f=image`

  try {
    // Attempt tile cache
    let resp = await fetch(tileUrl, { signal: AbortSignal.timeout(8000) })

    // If tile cache returns non-image (404 or HTML error), use export
    const ct = resp.headers.get('content-type') || ''
    if (!resp.ok || !ct.includes('image')) {
      resp = await fetch(exportUrl, { signal: AbortSignal.timeout(10000) })
    }

    if (!resp.ok) {
      return new NextResponse(null, { status: 204 }) // transparent tile
    }

    const buffer = await resp.arrayBuffer()
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch {
    // Return transparent 1×1 PNG on any error (don't break the map)
    const empty = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64')
    return new NextResponse(empty, {
      headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=60' },
    })
  }
}
