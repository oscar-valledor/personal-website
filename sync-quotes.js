const https = require('https');
const fs = require('fs');
const path = require('path');

const MONTHS = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};

function fetchUrl(url, redirects = 0) {
  if (redirects > 5) return Promise.reject(new Error('Too many redirects'));
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; personal-website-quotes-sync/1.0)' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const loc = res.headers.location;
        const next = loc.startsWith('http') ? loc : `https://fs.blog${loc}`;
        return fetchUrl(next, redirects + 1).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
      res.on('error', reject);
    }).on('error', reject);
  });
}

function stripHtml(str) {
  return str
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#8220;|&ldquo;/g, '\u201C')
    .replace(/&#8221;|&rdquo;/g, '\u201D')
    .replace(/&#8216;|&lsquo;/g, '\u2018')
    .replace(/&#8217;|&rsquo;/g, '\u2019')
    .replace(/&#8212;|&mdash;/g, '\u2014')
    .replace(/&#8211;|&ndash;/g, '\u2013')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#\d+;/g, '')
    .replace(/&[a-z]+;/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseDateFromSlug(slug) {
  // e.g. "february-22-2026" -> "2026-02-22"
  const parts = slug.split('-');
  if (parts.length < 3) return null;
  const year = parts[parts.length - 1];
  const day = parts[parts.length - 2];
  const monthName = parts.slice(0, parts.length - 2).join('-');
  const month = MONTHS[monthName];
  if (!month || !/^\d{4}$/.test(year) || !/^\d{1,2}$/.test(day)) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(parseInt(day)).padStart(2, '0')}`;
}

async function scrapeArticle(url, date, edition) {
  const html = await fetchUrl(url);

  // Find the Tiny Thoughts section by its id attribute
  const anchorIdx = html.indexOf('id="h-tiny-thoughts"');
  if (anchorIdx === -1) return [];

  // Find end of the h2 tag
  const h2EndIdx = html.indexOf('</h2>', anchorIdx) + 5;

  // Find next h2 to bound the section
  const nextH2Idx = html.indexOf('<h2', h2EndIdx);
  const section = nextH2Idx !== -1
    ? html.slice(h2EndIdx, nextH2Idx)
    : html.slice(h2EndIdx, h2EndIdx + 8000);

  // Each "thought" is a group of <p> tags separated by <hr> elements
  const groups = section.split(/<hr[^>]*\/?>/);

  const quotes = [];
  for (const group of groups) {
    if (quotes.length >= 3) break;
    const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/g;
    const parts = [];
    let m;
    while ((m = pRegex.exec(group)) !== null) {
      const text = stripHtml(m[1]);
      if (text.length > 5) parts.push(text);
    }
    if (parts.length > 0) {
      quotes.push({ text: parts.join(' '), edition, date });
    }
  }

  return quotes;
}

async function main() {
  const quotesFile = path.join(__dirname, 'quotes.json');

  let existing = { lastUpdated: '2025-12-01', quotes: [] };
  if (fs.existsSync(quotesFile)) {
    existing = JSON.parse(fs.readFileSync(quotesFile, 'utf8'));
  }

  console.log(`Current lastUpdated: ${existing.lastUpdated}`);
  console.log('Fetching Brain Food index...');

  const indexHtml = await fetchUrl('https://fs.blog/brain-food/');

  // Extract absolute article URLs (date-slug format: month-day-year)
  const urlSet = new Set();
  const linkRegex = /href="(https:\/\/fs\.blog\/brain-food\/[a-z][a-z0-9-]+-\d{4}\/)"/g;
  let lm;
  while ((lm = linkRegex.exec(indexHtml)) !== null) {
    urlSet.add(lm[1]);
  }

  console.log(`Found ${urlSet.size} article links`);

  const lastUpdatedDate = new Date(existing.lastUpdated);

  // Parse date from slug and filter to only newer articles
  const articles = [];
  for (const url of urlSet) {
    const slug = url.replace('https://fs.blog/brain-food/', '').replace(/\/$/, '');
    const date = parseDateFromSlug(slug);
    if (!date) continue;
    if (new Date(date) > lastUpdatedDate) {
      articles.push({ url, date, slug });
    }
  }

  // Process oldest-first
  articles.sort((a, b) => a.date.localeCompare(b.date));
  console.log(`${articles.length} articles newer than lastUpdated`);

  const newQuotes = [];

  for (const { url, date, slug } of articles) {
    console.log(`Fetching ${url}...`);

    const parts = slug.split('-');
    const year = parts[parts.length - 1];
    const day = parseInt(parts[parts.length - 2]);
    const monthName = parts.slice(0, parts.length - 2).join(' ');
    const edition = `Brain Food – ${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${day}, ${year}`;

    let quotes;
    try {
      quotes = await scrapeArticle(url, date, edition);
    } catch (e) {
      console.error(`  Failed: ${e.message}`);
      continue;
    }

    if (quotes.length === 0) {
      console.log('  No Tiny Thoughts section found, skipping');
      continue;
    }

    console.log(`  Found ${quotes.length} quotes`);
    newQuotes.push(...quotes);
  }

  const allQuotes = [...existing.quotes, ...newQuotes];

  // Keep only quotes from the 12 most recent editions
  const uniqueDates = [...new Set(allQuotes.map(q => q.date))].sort();
  const recentDates = new Set(uniqueDates.slice(-12));
  const trimmedQuotes = allQuotes.filter(q => recentDates.has(q.date));

  const latestDate = uniqueDates.length ? uniqueDates[uniqueDates.length - 1] : existing.lastUpdated;

  const output = { lastUpdated: latestDate, quotes: trimmedQuotes };
  fs.writeFileSync(quotesFile, JSON.stringify(output, null, 2));
  console.log(`Done. ${newQuotes.length} new quotes added. Total: ${allQuotes.length}.`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
