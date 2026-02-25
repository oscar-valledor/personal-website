const https = require('https');
const fs = require('fs');

const USER_ID = '152827522';

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
      res.on('error', reject);
    }).on('error', reject);
  });
}

function getTag(xml, tag) {
  const match = xml.match(new RegExp(`<${tag}>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`));
  return match ? match[1].trim() : '';
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

  const books = {
    lastUpdated: new Date().toISOString().split('T')[0],
    currentlyReading: parseItems(currentlyReadingXml),
    read: parseItems(readXml),
  };

  fs.writeFileSync('books.json', JSON.stringify(books, null, 2));
  console.log(`Done. ${books.currentlyReading.length} currently reading, ${books.read.length} read.`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
