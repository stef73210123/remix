import { ImageResponse } from 'next/og'
import { readFileSync } from 'fs'
import { join } from 'path'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  const imgBuffer = readFileSync(join(process.cwd(), 'public', 'seed-of-life-white.png'))
  const base64 = imgBuffer.toString('base64')
  const src = `data:image/png;base64,${base64}`

  return new ImageResponse(
    (
      <div
        style={{
          backgroundColor: '#6B7A58',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          width={24}
          height={24}
          style={{ objectFit: 'contain' }}
          alt=""
        />
      </div>
    ),
    { ...size }
  )
}
