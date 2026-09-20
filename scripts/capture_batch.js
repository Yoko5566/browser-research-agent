const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { validateUrl } = require('./capture_utils');

function parseArguments(args) {
  const options = { inputFile: null, captureArguments: [] };
  for (const argument of args) {
    if (argument === '--headless' || argument === '--headed' || argument.startsWith('--timeout=')) {
      options.captureArguments.push(argument);
    } else if (!options.inputFile) options.inputFile = argument;
    else throw new Error(`Unexpected argument: ${argument}`);
  }
  if (!options.inputFile) {
    throw new Error('Usage: node scripts/capture_batch.js <urls.txt> [--headless] [--timeout=<ms>]');
  }
  return options;
}

function readUrls(inputFile) {
  if (!fs.existsSync(inputFile)) throw new Error(`Input file not found: ${inputFile}`);
  const urls = fs.readFileSync(inputFile, 'utf8')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .filter(line => !line.startsWith('#'));
  if (urls.length === 0) throw new Error(`Input file contains no URLs: ${inputFile}`);
  return urls.map(validateUrl);
}

function main() {
  try {
    const options = parseArguments(process.argv.slice(2));
    const urls = readUrls(options.inputFile);
    const captureScript = path.join(__dirname, 'capture_page.js');
    let failures = 0;
    console.log(`Found ${urls.length} URL(s).`);

    for (const [index, url] of urls.entries()) {
      console.log(`\n[${index + 1}/${urls.length}] Capturing: ${url}`);
      const result = spawnSync(process.execPath, [captureScript, url, ...options.captureArguments], {
        stdio: 'inherit'
      });
      if (result.error || result.status !== 0) {
        failures += 1;
        console.error(`Failed: ${url}`);
      } else console.log(`Done: ${url}`);
    }

    if (failures > 0) throw new Error(`Batch completed with ${failures} failed capture(s).`);
    console.log('\nBatch capture completed successfully.');
  } catch (error) {
    console.error(`Batch capture failed: ${error.message}`);
    process.exitCode = 1;
  }
}

if (require.main === module) main();

module.exports = { parseArguments, readUrls };
