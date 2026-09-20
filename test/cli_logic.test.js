const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { parseArguments: parsePageArguments } = require('../scripts/capture_page');
const { parseArguments: parseBatchArguments, readUrls } = require('../scripts/capture_batch');

test('page CLI preserves headed local default and supports headless CI mode', () => {
  assert.deepEqual(parsePageArguments(['https://example.com']), {
    headless: false,
    timeoutMs: 60000,
    url: 'https://example.com/'
  });
  assert.equal(parsePageArguments(['--headless', 'https://example.com']).headless, true);
  assert.equal(parsePageArguments(['https://example.com', '--timeout=5000']).timeoutMs, 5000);
});

test('batch CLI forwards browser options', () => {
  assert.deepEqual(parseBatchArguments(['urls.txt', '--headless']), {
    inputFile: 'urls.txt',
    captureArguments: ['--headless']
  });
});

test('readUrls ignores comments and validates every URL', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'browser-research-agent-'));
  const input = path.join(directory, 'urls.txt');
  try {
    fs.writeFileSync(input, '# comment\nhttps://example.com\n\nhttp://example.org/path\n');
    assert.deepEqual(readUrls(input), ['https://example.com/', 'http://example.org/path']);
    assert.throws(() => readUrls(path.join(directory, 'missing.txt')), /Input file not found/);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
