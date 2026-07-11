/**
 * remix-admin ships plain, hand-authored CSS (globals.css / opennorthcastle.css)
 * and uses no Tailwind. Without a PostCSS config of its own, Next.js/Turbopack
 * walks up the directory tree and picks up the monorepo root's
 * postcss.config.mjs, which requires `@tailwindcss/postcss` — a dependency of
 * the unrelated root app that is NOT installed in this project's node_modules.
 * When Vercel builds this app without "include files outside root directory",
 * that lookup fails with "Cannot find module '@tailwindcss/postcss'".
 *
 * Declaring an empty config here stops the walk-up and keeps this app
 * self-contained.
 */
const config = {
  plugins: {},
}

export default config
