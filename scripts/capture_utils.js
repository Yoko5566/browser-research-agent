const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const DEFAULT_OUTPUT_ROOT = path.join(PROJECT_ROOT, 'outputs');

function safeFileName(text) {
  return String(text ?? '')
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'page';
}

function csvEscape(value) {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

function validateUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`Invalid URL: ${value}`);
  }
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error(`Unsupported URL protocol: ${url.protocol}`);
  }
  return url.toString();
}

function cleanGenericText(rawText) {
  return String(rawText ?? '')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .join('\n\n');
}

function cleanTheStarText(rawText, title) {
  let text = String(rawText ?? '');
  const shortTitle = String(title ?? '').split('|')[0].trim();
  const titleIndex = shortTitle ? text.indexOf(shortTitle) : -1;
  if (titleIndex !== -1) text = text.slice(titleIndex);

  const stopMarkers = [
    'TAGS / KEYWORDS:', 'IS THIS ARTICLE USEFUL?', 'REPORT A MISTAKE',
    'Others Also Read', 'Trending in News', 'Subscriptions', 'Copyright ©'
  ];
  for (const marker of stopMarkers) {
    const index = text.indexOf(marker);
    if (index !== -1) text = text.slice(0, index);
  }

  const noisyLines = new Set([
    'ePaper', 'Events', 'R.AGE', 'mStar', 'StarProperty', 'StarCherish',
    'StarCarsifu', 'StarSearch', 'myStarjob', 'Kuali', 'Kuntum', 'SuriaFM',
    '988FM', 'Subscriptions', 'Log In', 'Toggle navigation', 'StarPlus',
    'News', 'Asean+', 'ESG', 'Business', 'Sport', 'Metro', 'Lifestyle',
    'Food', 'Tech', 'Education', 'Opinion', 'Videos', 'Photos', 'share',
    'bookmark', 'STARPICKS'
  ]);

  const filtered = text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .filter(line => !noisyLines.has(line))
    .filter(line => !line.includes('WAN IFRA ASIA MEDIA AWARDS'))
    .filter(line => !line.includes('MPI-PETRONAS JOURNALISM AWARDS'))
    .join('\n');
  return cleanGenericText(filtered);
}

function isTheStarUrl(value) {
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return hostname === 'thestar.com.my' || hostname.endsWith('.thestar.com.my');
  } catch {
    return false;
  }
}

function cleanText(rawText, title, sourceUrl) {
  return isTheStarUrl(sourceUrl)
    ? cleanTheStarText(rawText, title)
    : cleanGenericText(rawText);
}

function toPortablePath(filePath) {
  return path.relative(PROJECT_ROOT, filePath).split(path.sep).join('/');
}

function buildOutputPaths(timestamp, titleOrUrl, outputRoot = DEFAULT_OUTPUT_ROOT) {
  const fileBase = `${timestamp}_${safeFileName(titleOrUrl)}`;
  const absolute = {
    rawMarkdownPath: path.join(outputRoot, 'pages', `${fileBase}.md`),
    cleanMarkdownPath: path.join(outputRoot, 'summaries', `${fileBase}_summary_ready.md`),
    screenshotPath: path.join(outputRoot, 'screenshots', `${fileBase}.png`),
    sourcesCsvPath: path.join(outputRoot, 'sources.csv')
  };
  return {
    ...absolute,
    rawMarkdownRelativePath: toPortablePath(absolute.rawMarkdownPath),
    cleanMarkdownRelativePath: toPortablePath(absolute.cleanMarkdownPath),
    screenshotRelativePath: toPortablePath(absolute.screenshotPath),
    sourcesCsvRelativePath: toPortablePath(absolute.sourcesCsvPath)
  };
}

function ensureOutputDirectories(outputRoot = DEFAULT_OUTPUT_ROOT) {
  for (const directory of ['pages', 'summaries', 'screenshots']) {
    fs.mkdirSync(path.join(outputRoot, directory), { recursive: true });
  }
}

function appendSourceRecord(record, csvPath = path.join(DEFAULT_OUTPUT_ROOT, 'sources.csv')) {
  const header = [
    'captured_at', 'title', 'original_url', 'final_url',
    'raw_markdown_path', 'clean_markdown_path', 'screenshot_path'
  ].join(',');
  const row = [
    record.capturedAt, record.title, record.originalUrl, record.finalUrl,
    record.rawMarkdownPath, record.cleanMarkdownPath, record.screenshotPath
  ].map(csvEscape).join(',');

  if (!fs.existsSync(csvPath)) fs.writeFileSync(csvPath, `${header}\n`, 'utf8');
  fs.appendFileSync(csvPath, `${row}\n`, 'utf8');
}

module.exports = {
  DEFAULT_OUTPUT_ROOT, PROJECT_ROOT, appendSourceRecord, buildOutputPaths,
  cleanGenericText, cleanText, cleanTheStarText, csvEscape,
  ensureOutputDirectories, isTheStarUrl, safeFileName, validateUrl
};
