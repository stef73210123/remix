# Marketing scripts

One-off and scheduled maintenance scripts for the `remix.properties`
marketing site. Each script is standalone — run with `node` from the
`marketing/` directory.

## `refresh-substack-feed.mjs`

Pulls the latest posts from the Ground Truth Substack
(`https://groundtruthcre.substack.com/feed`) and updates the "Latest from
Ground Truth" section on the marketing landing page.

The section on `index.html` is delimited by two HTML-comment sentinels
so the script can edit it without touching anything else:

```html
<!-- SUBSTACK_FEED_START -->
    ... generated cards ...
<!-- SUBSTACK_FEED_END -->
```

The script:

1. Fetches the RSS feed, parses the last 4–6 posts, and pulls each
   post's title, publish date, canonical URL, ~45-word excerpt, and
   hero image URL.
2. Downloads any new thumbnails to `marketing/img/substack/{slug}.jpg`.
   Thumbnails are content-addressed by post slug — if the file already
   exists locally it is not re-fetched.
3. Rewrites the block between the sentinels in `marketing/index.html`
   with the freshly rendered cards. If the rendered HTML matches what
   is already there, the file is left alone and the script logs
   `no changes`.

No external NPM dependencies — pure Node 20+ using native `fetch` and
a small hand-rolled RSS parser.

### Run manually

```bash
cd marketing
node scripts/refresh-substack-feed.mjs
```

### Automated

The script runs on a weekly cron via GitHub Actions:
`.github/workflows/refresh-substack-feed.yml`. Cron is `0 13 * * 1`
(every Monday at 08:00 America/New_York), and the workflow also
supports manual `workflow_dispatch` from the Actions tab. When the
workflow detects a change it commits the updated `index.html` and any
new thumbnails to `main` with the message
`chore(marketing): refresh Substack feed [skip ci]`, and Vercel
auto-deploys.

### Adding or removing posts

- The number of posts shown is controlled by `MAX_POSTS` at the top of
  `refresh-substack-feed.mjs` (default `6`; Substack often returns
  fewer than that).
- The excerpt length is controlled by `EXCERPT_WORDS` (default `45`).
- Everything else (card styling, container, grid breakpoints) lives
  in the CSS block above the section in `marketing/index.html`.

### Troubleshooting

- **`Sentinel markers not found`** — someone edited the section
  between the sentinels without preserving the comments. Re-add
  `<!-- SUBSTACK_FEED_START -->` and `<!-- SUBSTACK_FEED_END -->`
  around the block and rerun.
- **`Substack RSS returned HTTP 4xx/5xx`** — the feed URL is
  unreachable. Check `https://groundtruthcre.substack.com/feed` in a
  browser and try again.
- **A thumbnail didn't download** — the script logs
  `[thumb] FAILED {slug}` and falls back to the CSS gradient card
  thumbnail. Delete the entry from `marketing/img/substack/` and rerun
  to retry.
