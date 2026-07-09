import type { Viewport } from "next";

export const dynamic = 'force-dynamic'

export const metadata = {
  title: "Atlas | Remix Properties",
  description: "CesiumJS 3D real estate map viewer",
};

// Render edge-to-edge and expose iOS safe-area insets, so the bottom news
// ticker and controls can lift clear of the iPad/iPhone home indicator instead
// of being clipped by it. On devices without insets these values are 0.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function MapLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/*
        Cesium's widget stylesheet. It provides the rules that make the WebGL
        canvas fill its container:
          .cesium-widget { width:100%; height:100% }
          .cesium-widget canvas { width:100%; height:100% }
        Without it the canvas falls back to its intrinsic 300×150 and the map
        renders in a small box regardless of container size. Loaded from the
        copied public assets so it resolves against CESIUM_BASE_URL (/cesium/).
      */}
      <link
        rel="stylesheet"
        href="/cesium/Widgets/widgets.css"
        precedence="default"
      />
      {children}
    </>
  );
}
