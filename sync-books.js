const https = require('https');
const fs = require('fs');

const USER_ID = '152827522';

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    // Goodreads returns 403 to requests without a User-Agent
    const options = { headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' } };
    const req = https.get(url, options, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
      res.on('error', reject);
    }).on('error', reject);
    req.setTimeout(30000, () => req.destroy(new Error(`Timeout for ${url}`)));
  });
}

function decodeEntities(str) {
  // &amp; must decode last or doubly-encoded entities ("&amp;lt;") over-decode
  return str
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, '&');
}

function getTag(xml, tag) {
  const match = xml.match(new RegExp(`<${tag}>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`));
  return match ? decodeEntities(match[1].trim()) : '';
}

function parseItems(xml) {
  const items = [];
  const blocks = xml.match(/<item>[\s\S]*?<\/item>/g) || [];

  for (const block of blocks) {
    const title = getTag(block, 'title');
    const author = getTag(block, 'author_name');
    const bookId = getTag(block, 'book_id');
    const rating = parseInt(getTag(block, 'user_rating')) || 0;

    if (title && author && bookId) {
      items.push({
        title,
        author,
        url: `https://www.goodreads.com/book/show/${bookId}`,
        rating,
      });
    }
  }

  return items;
}

async function main() {
  console.log('Fetching Goodreads shelves...');

  const [readXml, currentlyReadingXml] = await Promise.all([
    fetchUrl(`https://www.goodreads.com/review/list_rss/${USER_ID}?shelf=read`),
    fetchUrl(`https://www.goodreads.com/review/list_rss/${USER_ID}?shelf=currently-reading`),
  ]);

  // A 200 with a non-RSS body (rate-limit interstitial, captcha, schema
  // change) parses to zero items and would wipe good data — refuse to write.
  if (!readXml.includes('<rss')) {
    throw new Error('Read-shelf response is not RSS — refusing to overwrite books.json');
  }

  const books = {
    currentlyReading: parseItems(currentlyReadingXml),
    read: parseItems(readXml),
  };

  let previous = { read: [] };
  try { previous = JSON.parse(fs.readFileSync('books.json', 'utf8')); } catch {}
  if (books.read.length === 0 && (previous.read || []).length > 0) {
    throw new Error(`Parsed 0 read books while books.json holds ${previous.read.length} — refusing to overwrite`);
  }

  fs.writeFileSync('books.json', JSON.stringify(books, null, 2));
  console.log(`Done. ${books.currentlyReading.length} currently reading, ${books.read.length} read.`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
