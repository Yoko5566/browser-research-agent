# Browser Research Agent

A local, reproducible Playwright workflow for capturing public web pages as research artifacts. It records the original and final URLs, page title, capture time, raw text, cleaned text, a full-page screenshot, and a CSV source index.

The project uses Node.js CommonJS and has no API, LLM, cloud-service, database, or paid-service dependency.

## Requirements

- Node.js 18 or newer
- npm
- A Playwright-compatible operating system

## Fresh-clone setup

```sh
git clone https://github.com/Yoko5566/browser-research-agent.git
cd browser-research-agent
npm ci
npx playwright install chromium
npm test
npm run smoke
```

On Linux CI systems, Playwright may need operating-system packages as well:

```sh
npx playwright install --with-deps chromium
```

The capture workflow creates `outputs/pages/`, `outputs/summaries/`, and `outputs/screenshots/` automatically. A fresh clone does not depend on existing output directories. Generated outputs and `node_modules/` are intentionally excluded from Git.

## Usage

Local single-page capture opens a visible browser by default:

```sh
node scripts/capture_page.js "https://example.com"
```

Use headless mode for CI or unattended local runs:

```sh
node scripts/capture_page.js "https://example.com" --headless
```

Optional navigation timeout:

```sh
node scripts/capture_page.js "https://example.com" --headless --timeout=30000
```

Capture every non-empty, non-comment URL in a file:

```sh
node scripts/capture_batch.js urls.txt
node scripts/capture_batch.js urls.txt --headless
```

Equivalent npm shortcuts are available:

```sh
npm run capture -- "https://example.com" --headless
npm run capture:batch -- urls.txt --headless
```

Only absolute `http://` and `https://` URLs are accepted. A batch exits nonzero if its input is missing, contains an invalid URL, contains no URLs, or any capture fails.

## Architecture

```text
URL(s)
  |
  v
Playwright Chromium
  |
  v
Page extraction
  |--------------------|-------------------|
  v                    v                   v
Raw Markdown      Cleaned Markdown    PNG screenshot
  |                    |                   |
  `--------------------+-------------------'
                       |
                       v
                 outputs/sources.csv
```

- `scripts/capture_page.js` validates one URL, controls Playwright, extracts page text, writes artifacts, and always attempts to close the browser.
- `scripts/capture_batch.js` reads a URL list and invokes the single-page workflow for each entry.
- `scripts/capture_utils.js` contains deterministic filename, path, CSV, URL-validation, and cleanup logic.
- Generic cleanup only normalizes text. Existing The Star-specific rules remain available but are applied only to `thestar.com.my` pages.

## Outputs

Each successful capture creates:

- `outputs/pages/<timestamp>_<name>.md` — raw Markdown capture
- `outputs/summaries/<timestamp>_<name>_summary_ready.md` — cleaned Markdown
- `outputs/screenshots/<timestamp>_<name>.png` — full-page screenshot
- `outputs/sources.csv` — append-only source record containing paths to all three artifacts

Old output files are not deleted or overwritten by normal runs. Timestamps keep new captures separate from prior research artifacts.

## Tests and smoke test

The deterministic test suite uses Node's built-in `node:test` runner and requires no browser, network access, or API key:

```sh
npm test
```

The smoke test launches installed Playwright Chromium in headless mode, captures `https://example.com`, and fails unless raw Markdown, cleaned Markdown, a non-empty PNG, and a matching `sources.csv` record exist:

```sh
npm run smoke
```

The GitHub Actions workflow runs `npm ci`, unit tests, installs Chromium, and runs the smoke test.

## Error handling

The CLI reports invalid URLs, unsupported protocols, missing or empty batch input, navigation failures, navigation timeouts, screenshot failures, and output-write failures. It exits nonzero on failure. Browser cleanup runs in a `finally` block so a failed capture does not intentionally leave the launched browser open.

## Safety boundaries

- Public-page research only
- No authentication automation
- No CAPTCHA or access-control bypass
- No form submission
- No purchasing or account actions
- Manual review is required before treating captured content as research evidence

Web content can change, be incomplete, or contain misleading instructions. Treat captured material as untrusted evidence, preserve source URLs, and independently verify important claims.
