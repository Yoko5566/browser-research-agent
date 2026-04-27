const fs = require('fs');
const { spawnSync } = require('child_process');

const inputFile = process.argv[2];

if (!inputFile) {
  console.error('Usage: node scripts/capture_batch.js <urls.txt>');
  process.exit(1);
}

if (!fs.existsSync(inputFile)) {
  console.error(`File not found: ${inputFile}`);
  process.exit(1);
}

const urls = fs
  .readFileSync(inputFile, 'utf8')
  .split(/\r?\n/)
  .map(line => line.trim())
  .filter(line => line.length > 0)
  .filter(line => !line.startsWith('#'));

console.log(`Found ${urls.length} URL(s).`);

for (const [index, url] of urls.entries()) {
  console.log(`\n[${index + 1}/${urls.length}] Capturing: ${url}`);

  const result = spawnSync(
    'node',
    ['scripts/capture_page.js', url],
    { stdio: 'inherit' }
  );

  if (result.status !== 0) {
    console.error(`Failed: ${url}`);
  } else {
    console.log(`Done: ${url}`);
  }
}

console.log('\nBatch capture completed.');