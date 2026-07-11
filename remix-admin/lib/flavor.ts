/**
 * App "flavor" — the same codebase serves two branded deployments:
 *
 *   - 'remix'          (default): the dark Remix Admin, behind the login paywall.
 *   - 'opennorthcastle': a light, un-paywalled public civic dashboard skinned
 *                        with the OpenNorthCastle design system, deployed to
 *                        opennorthcastle.com (its own Vercel project sets the
 *                        env var below).
 *
 * Both flavors ride the same commits — only the theme, branding, and the public
 * (read-only) access differ. Set via NEXT_PUBLIC_APP_FLAVOR so both server and
 * client bundles can read it (it is not secret).
 */
export type Flavor = 'remix' | 'opennorthcastle'

export const FLAVOR: Flavor =
  process.env.NEXT_PUBLIC_APP_FLAVOR === 'opennorthcastle' ? 'opennorthcastle' : 'remix'

/** True on the public, un-paywalled OpenNorthCastle deployment. */
export const isOpen = FLAVOR === 'opennorthcastle'

export const BRAND = isOpen
  ? { name: 'OpenNorthCastle', wordmark: '/opennorthcastle.svg', wordmarkHeight: 52 }
  : { name: 'Remix', wordmark: 'https://remix-admin-omega.vercel.app/remix-wordmark.png', wordmarkHeight: 34 }
