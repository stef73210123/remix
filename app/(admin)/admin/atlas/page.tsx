/**
 * Admin → Atlas
 *
 * Surfaces the CesiumJS 3D map (the `/map` route) inside the gated admin
 * area at /admin/atlas, embedded below the admin nav. Access is controlled
 * by the admin login (see middleware.ts → role: 'admin').
 */

export const metadata = {
  title: 'Atlas | Remix Admin',
  description: 'CesiumJS 3D real estate map viewer',
}

export default function AdminAtlasPage() {
  return (
    <div className="h-[calc(100vh-7.5rem)] w-full">
      <iframe
        src="/map"
        title="Atlas 3D Map"
        className="h-full w-full border-0"
        allow="geolocation; fullscreen"
      />
    </div>
  )
}
