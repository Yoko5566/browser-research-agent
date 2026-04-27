const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

function safeFileName(text) {
  return text
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'page';
}

function cleanText(rawText, title) {
  let text = rawText || '';

  // 1. Try to start from the article title instead of the top navigation.
  const shortTitle = (title || '').split('|')[0].trim();
  const titleIndex = shortTitle ? text.indexOf(shortTitle) : -1;

  if (titleIndex !== -1) {
    text = text.slice(titleIndex);
  }

  // 2. Stop only when we reach real end-of-article markers.
  const stopMarkers = [
    'TAGS / KEYWORDS:',
    'IS THIS ARTICLE USEFUL?',
    'REPORT A MISTAKE',
    'Others Also Read',
    'Trending in News',
    'Subscriptions',
    'Copyright ©'
  ];

  for (const marker of stopMarkers) {
    const index = text.indexOf(marker);
    if (index !== -1) {
      text = text.slice(0, index);
    }
  }

  // 3. Remove common noisy lines but do not cut the whole article.
  const noisyLines = new Set([
    'ePaper',
    'Events',
    'R.AGE',
    'mStar',
    'StarProperty',
    'StarCherish',
    'StarCarsifu',
    'StarSearch',
    'myStarjob',
    'Kuali',
    'Kuntum',
    'SuriaFM',
    '988FM',
    'Subscriptions',
    'Log In',
    'Toggle navigation',
    'StarPlus',
    'News',
    'Asean+',
    'ESG',
    'Business',
    'Sport',
    'Metro',
    'Lifestyle',
    'Food',
    'Tech',
    'Education',
    'Opinion',
    'Videos',
    'Photos',
    'share',
    'bookmark',
    'STARPICKS'
  ]);

  const lines = text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .filter(line => !noisyLines.has(line))
    .filter(line => !line.includes('WAN IFRA ASIA MEDIA AWARDS'))
    .filter(line => !line.includes('MPI-PETRONAS JOURNALISM AWARDS'));

  return lines.join('\n\n');
}

(async () => {
  const url = process.argv[2];

  if (!url) {
    console.error('Usage: node scripts/capture_page.js <url>');
    process.exit(1);
  }

  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-');

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

  const title = await page.title();
  const finalUrl = page.url();
  const fileBase = `${timestamp}_${safeFileName(title || finalUrl)}`;

  const screenshotPath = path.join('outputs', 'screenshots', `${fileBase}.png`);
  const rawMarkdownPath = path.join('outputs', 'pages', `${fileBase}.md`);
  const cleanMarkdownPath = path.join('outputs', 'summaries', `${fileBase}_summary_ready.md`);

  const bodyText = await page.locator('body').innerText({ timeout: 10000 }).catch(() => '');
  const cleanedText = cleanText(bodyText, title);

  await page.screenshot({
    path: screenshotPath,
    fullPage: true
  });

  const rawMarkdown = `# Page Capture Report

## Metadata

- Title: ${title}
- Original URL: ${url}
- Final URL: ${finalUrl}
- Captured At: ${now.toISOString()}
- Screenshot: ${screenshotPath}

## Main Text

${bodyText.slice(0, 12000)}

## Notes

- This is an automated raw capture.
- Review manually before using as research evidence.
`;

  const cleanMarkdown = `# Research Summary Input

## Source

- Title: ${title}
- Original URL: ${url}
- Final URL: ${finalUrl}
- Captured At: ${now.toISOString()}
- Screenshot: ${screenshotPath}

## Cleaned Article Text

${cleanedText.slice(0, 10000)}

## Manual Notes

- Key facts:
- Claims to verify:
- Useful for:
- Follow-up questions:
`;

  fs.writeFileSync(rawMarkdownPath, rawMarkdown, 'utf8');
  fs.writeFileSync(cleanMarkdownPath, cleanMarkdown, 'utf8');

  console.log('Capture completed.');
  console.log(`Raw Markdown: ${rawMarkdownPath}`);
  console.log(`Clean Markdown: ${cleanMarkdownPath}`);
  console.log(`Screenshot: ${screenshotPath}`);

  await browser.close();
})();