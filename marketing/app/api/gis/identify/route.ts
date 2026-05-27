import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const SERVERS: Record<string, string> = {
  sullivan: 'https://gis.sullivanny.us/arcgis/rest/services',
  westchester: 'https://giswww.westchestergov.com/arcgis/rest/services',
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const server = searchParams.get('server')
  const service = searchParams.get('service')
  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng')
  const mapExtent = searchParams.get('mapExtent') || '-180,-90,180,90'
  const imageDisplay = searchParams.get('imageDisplay') || '800,600,96'

  if (!server || !service || !lat || !lng || !SERVERS[server]) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }

  const baseUrl = SERVERS[server]
  const params = new URLSearchParams({
    geometry: `${lng},${lat}`,
    geometryType: 'esriGeometryPoint',
    sr: '4326',
    layers: 'all',
    tolerance: '6',
    mapExtent,
    imageDisplay,
    returnGeometry: 'false',
    f: 'json',
  })

  const url = `${baseUrl}/${service}/MapServer/identify?${params.toString()}`

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return NextResponse.json({ results: [] })
    const data = await res.json()
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch {
    return NextResponse.json({ results: [] })
  }
}
