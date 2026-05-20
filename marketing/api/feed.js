// Vercel serverless function — fetches the Ground Truth Substack RSS feed,
// parses it, and returns a compact JSON payload for the /blog page.
// No dependencies: uses the global fetch available in the Vercel Node runtime.

const FEED_URL = 'https://groundtruthcre.substack.com/feed';

// Resolve CDATA wrappers and the handful of XML/HTML entities Substack emits.
function decodeEntities(input) {
  if (!input) return '';
  return String(input)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#x([0-9a-fA-F]+);/g, function (_m, hex) {
      try { return String.fromCodePoint(parseInt(hex, 16)); } catch (e) { return ''; }
    })
    .replace(/&#(\d+);/g, function (_m, dec) {
      try { return String.fromCodePoint(parseInt(dec, 10)); } catch (e) { return ''; }
    })
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}

// First inner text of <tag>...</tag> within a block (case-insensitive).
function firstTag(block, tag) {
  const re = new RegExp('<' + tag + '(?:\\s[^>]*)?>([\\s\\S]*?)<\\/' + tag + '>', 'i');
  const m = block.match(re);
  return m ? m[1] : '';
}

// Value of an attribute on a (possibly self-closing) tag within a block.
function tagAttr(block, tag, attr) {
  const re = new RegExp('<' + tag + '\\b[^>]*?\\b' + attr + '\\s*=\\s*"([^"]*)"', 'i');
  const m = block.match(re);
  return m ? m[1] : '';
}

function stripHtml(html) {
  return String(html).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function truncate(text, max) {
  if (text.length <= max) return text;
  return text.slice(0, max).replace(/\s+\S*$/, '').trim() + '…';
}

module.exports = async function handler(req, res) {
  try {
    const response = await fetch(FEED_URL, {
      headers: { 'User-Agent': 'RemixPropertiesBlog/1.0 (+https://remixproperties.com)' }
    });
    if (!response.ok) {
      throw new Error('Substack feed returned HTTP ' + response.status);
    }
    const xml = await response.text();
    const itemBlocks = xml.match(/<item[\s\S]*?<\/item>/gi) || [];

    const posts = itemBlocks.map(function (item) {
      const title = decodeEntities(firstTag(item, 'title')).trim();
      const link = decodeEntities(firstTag(item, 'link')).trim();
      const date = decodeEntities(firstTag(item, 'pubDate')).trim();
      const excerpt = truncate(stripHtml(decodeEntities(firstTag(item, 'description'))), 150);

      // Cover image: prefer <enclosure>, else the first <img> in the post body.
      let image = tagAttr(item, 'enclosure', 'url');
      if (!image) {
        const body = decodeEntities(firstTag(item, 'content:encoded') || firstTag(item, 'description'));
        const imgMatch = body.match(/<img[^>]+src\s*=\s*"([^"]+)"/i);
        if (imgMatch) image = imgMatch[1];
      }

      return {
        title: title,
        link: link,
        date: date,
        excerpt: excerpt,
        image: image || null
      };
    }).filter(function (post) {
      return post.title && post.link;
    });

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    // Cache on Vercel's edge for 1 hour; serve stale up to a day while revalidating.
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).json({ posts: posts });
  } catch (err) {
    // Graceful failure: 200 with an empty list so the page can show an empty state.
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=300');
    return res.status(200).json({
      posts: [],
      error: String((err && err.message) || err)
    });
  }
};
