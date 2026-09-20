const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  PROJECT_ROOT,
  buildOutputPaths,
  cleanGenericText,
  cleanText,
  csvEscape,
  ensureOutputDirectories,
  safeFileName,
  validateUrl
} = require('../scripts/capture_utils');

test('safeFileName creates bounded filesystem-safe names', () => {
  assert.equal(safeFileName('https://Example.com/A Story?q=1'), 'example-com-a-story-q-1');
  assert.equal(safeFileName('  '), 'page');
  assert.equal(safeFileName('a'.repeat(100)).length, 80);
});

test('csvEscape quotes values and doubles embedded quotes', () => {
  assert.equal(csvEscape('plain'), '"plain"');
  assert.equal(csvEscape('a,"b"'), '"a,""b"""');
  assert.equal(csvEscape(null), '""');
});

test('validateUrl accepts HTTP URLs and rejects unsafe or malformed values', () => {
  assert.equal(validateUrl('https://example.com'), 'https://example.com/');
  assert.equal(validateUrl('http://example.com/path'), 'http://example.com/path');
  assert.throws(() => validateUrl('not a URL'), /Invalid URL/);
  assert.throws(() => validateUrl('file:///etc/passwd'), /Unsupported URL protocol/);
});

test('generic cleanup trims lines without applying site-specific removals', () => {
  assert.equal(cleanGenericText('  News  \n\n  Useful text \n'), 'News\n\nUseful text');
  assert.equal(cleanText('News\nUseful text', 'Title', 'https://example.com'), 'News\n\nUseful text');
});

test('The Star cleanup remains scoped to The Star URLs', () => {
  const raw = 'Navigation\nArticle title\nNews\nUseful paragraph\nTAGS / KEYWORDS:\nignored';
  assert.equal(
    cleanText(raw, 'Article title | The Star', 'https://www.thestar.com.my/story'),
    'Article title\n\nUseful paragraph'
  );
});

test('buildOutputPaths produces all required output locations', () => {
  const paths = buildOutputPaths('2026-01-02T03-04-05-000Z', 'Example Domain');
  assert.equal(paths.rawMarkdownPath, path.join(PROJECT_ROOT, 'outputs', 'pages', '2026-01-02T03-04-05-000Z_example-domain.md'));
  assert.match(paths.cleanMarkdownRelativePath, /^outputs\/summaries\/.+_summary_ready\.md$/);
  assert.match(paths.screenshotRelativePath, /^outputs\/screenshots\/.+\.png$/);
  assert.equal(paths.sourcesCsvRelativePath, 'outputs/sources.csv');
});

test('ensureOutputDirectories creates a fresh output tree', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'browser-research-outputs-'));
  const outputRoot = path.join(directory, 'new-outputs');
  try {
    ensureOutputDirectories(outputRoot);
    for (const child of ['pages', 'summaries', 'screenshots']) {
      assert.equal(fs.statSync(path.join(outputRoot, child)).isDirectory(), true);
    }
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
