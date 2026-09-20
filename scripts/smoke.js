const fs = require('fs');
const { capturePage } = require('./capture_page');

async function main() {
  console.log('Running headless smoke capture for https://example.com/');
  const result = await capturePage({
    url: 'https://example.com/',
    headless: true,
    timeoutMs: 60000
  });

  const required = [
    ['raw Markdown', result.rawMarkdownPath],
    ['cleaned Markdown', result.cleanMarkdownPath],
    ['PNG screenshot', result.screenshotPath],
    ['sources.csv', result.sourcesCsvPath]
  ];
  const missing = required.filter(([, filePath]) => {
    try {
      const stat = fs.statSync(filePath);
      return !stat.isFile() || stat.size === 0;
    } catch {
      return true;
    }
  });

  if (missing.length > 0) {
    throw new Error(`Missing required artifact(s): ${missing.map(([label]) => label).join(', ')}`);
  }

  const csv = fs.readFileSync(result.sourcesCsvPath, 'utf8');
  if (!csv.includes(result.rawMarkdownRelativePath) ||
      !csv.includes(result.cleanMarkdownRelativePath) ||
      !csv.includes(result.screenshotRelativePath)) {
    throw new Error('sources.csv does not reference every smoke-test artifact.');
  }

  console.log('Smoke test passed.');
  for (const [label, filePath] of required) console.log(`${label}: ${filePath}`);
}

main().catch(error => {
  console.error(`Smoke test failed: ${error.message}`);
  process.exitCode = 1;
});
