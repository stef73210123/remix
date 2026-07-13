export default function SiteFooter() {
  return (
    <footer
      style={{
        borderTop: '1px solid var(--border)',
        marginTop: 40,
        padding: '16px 20px calc(68px + env(safe-area-inset-bottom, 0px))',
        textAlign: 'center',
      }}
    >
      <p className="muted" style={{ fontSize: 12, lineHeight: 1.5, maxWidth: 640, margin: '0 auto' }}>
        OpenNorthCastle is not an official website of the Town of North Castle. It is an independently
        developed tool made available for the public benefit.
      </p>
    </footer>
  )
}
