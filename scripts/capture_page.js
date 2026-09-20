const { chromium } = require('playwright');
const fs = require('fs');
const {
  appendSourceRecord,
  buildOutputPaths,
  cleanText,
  ensureOutputDirectories,
  validateUrl
} = require('./capture_utils');

const DEFAULT_TIMEOUT_MS = 60000;

function parseArguments(args) {
  const options = { headless: false, timeoutMs: DEFAULT_TIMEOUT_MS, url: null };
  for (const argument of args) {
    if (argument === '--headless') options.headless = true;
    else if (argument === '--headed') options.headless = false;
    else if (argument.startsWith('--timeout=')) {
      const timeoutMs = Number(argument.slice('--timeout='.length));
      if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) {
        throw new Error(`Invalid timeout: ${argument}`);
      }
      options.timeoutMs = timeoutMs;
    } else if (!options.url) options.url = argument;
    else throw new Error(`Unexpected argument: ${argument}`);
  }
  if (!options.url) {
    throw new Error('Usage: node scripts/capture_page.js <url> [--headless] [--timeout=<ms>]');
  }
  options.url = validateUrl(options.url);
  return options;
}

function formatNavigationError(error, url, timeoutMs) {
  if (error && error.name === 'TimeoutError') {
    return new Error(`Navigation timed out after ${timeoutMs} ms: ${url}`);
  }
  return new Error(`Navigation failed for ${url}: ${error.message}`);
}

async function capturePage({ url, headless = false, timeoutMs = DEFAULT_TIMEOUT_MS }) {
  const originalUrl = validateUrl(url);
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-');
  let browser;

  ensureOutputDirectories();
  try {
    browser = await chromium.launch({ headless });
    const page = await browser.newPage();
    try {
      await page.goto(originalUrl, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
    } catch (error) {
      throw formatNavigationError(error, originalUrl, timeoutMs);
    }

    const title = await page.title();
    const finalUrl = page.url();
    const paths = buildOutputPaths(timestamp, title || finalUrl);
    const bodyText = await page.locator('body').innerText({ timeout: 10000 }).catch(() => '');
    const cleanedText = cleanText(bodyText, title, finalUrl);

    try {
      await page.screenshot({ path: paths.screenshotPath, fullPage: true });
    } catch (error) {
      throw new Error(`Could not write screenshot ${paths.screenshotRelativePath}: ${error.message}`);
    }

    const rawMarkdown = `# Page Capture Report

## Metadata

- Title: ${title}
- Original URL: ${originalUrl}
- Final URL: ${finalUrl}
- Captured At: ${now.toISOString()}
- Screenshot: ${paths.screenshotRelativePath}

## Main Text

${bodyText.slice(0, 12000)}

## Notes

- This is an automated raw capture.
- Review manually before using as research evidence.
`;
    const cleanMarkdown = `# Research Summary Input

## Source

- Title: ${title}
- Original URL: ${originalUrl}
- Final URL: ${finalUrl}
- Captured At: ${now.toISOString()}
- Screenshot: ${paths.screenshotRelativePath}

## Cleaned Article Text

${cleanedText.slice(0, 10000)}

## Manual Notes

- Key facts:
- Claims to verify:
- Useful for:
- Follow-up questions:
`;

    try {
      fs.writeFileSync(paths.rawMarkdownPath, rawMarkdown, 'utf8');
      fs.writeFileSync(paths.cleanMarkdownPath, cleanMarkdown, 'utf8');
      appendSourceRecord({
        capturedAt: now.toISOString(), title, originalUrl, finalUrl,
        rawMarkdownPath: paths.rawMarkdownRelativePath,
        cleanMarkdownPath: paths.cleanMarkdownRelativePath,
        screenshotPath: paths.screenshotRelativePath
      }, paths.sourcesCsvPath);
    } catch (error) {
      throw new Error(`Could not write capture output: ${error.message}`);
    }

    return {
      title, originalUrl, finalUrl,
      rawMarkdownPath: paths.rawMarkdownPath,
      cleanMarkdownPath: paths.cleanMarkdownPath,
      screenshotPath: paths.screenshotPath,
      sourcesCsvPath: paths.sourcesCsvPath,
      rawMarkdownRelativePath: paths.rawMarkdownRelativePath,
      cleanMarkdownRelativePath: paths.cleanMarkdownRelativePath,
      screenshotRelativePath: paths.screenshotRelativePath,
      sourcesCsvRelativePath: paths.sourcesCsvRelativePath
    };
  } finally {
    if (browser) {
      await browser.close().catch(error => {
        console.error(`Warning: browser cleanup failed: ${error.message}`);
      });
    }
  }
}

async function main() {
  try {
    const result = await capturePage(parseArguments(process.argv.slice(2)));
    console.log('Capture completed.');
    console.log(`Raw Markdown: ${result.rawMarkdownRelativePath}`);
    console.log(`Clean Markdown: ${result.cleanMarkdownRelativePath}`);
    console.log(`Screenshot: ${result.screenshotRelativePath}`);
    console.log(`Source record added: ${result.sourcesCsvRelativePath}`);
  } catch (error) {
    console.error(`Capture failed: ${error.message}`);
    process.exitCode = 1;
  }
}

if (require.main === module) main();

module.exports = { DEFAULT_TIMEOUT_MS, capturePage, parseArguments };
