import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const port = Number.parseInt(process.env.COMPARE_HARNESS_PORT || '41735', 10);

const read = (relativePath) => readFile(resolve(repoRoot, relativePath), 'utf8');

function compileLiteralSnippet(source, name) {
  const compiled = source.replace(
    /\{%-?\s*comment\s*-?%\}[\s\S]*?\{%-?\s*endcomment\s*-?%\}/g,
    ''
  );
  const unresolved = compiled.match(/\{[{%][\s\S]*?[}%]\}/);
  if (unresolved) {
    throw new Error(`${name} contains an unsupported Liquid expression: ${unresolved[0]}`);
  }
  return compiled.replace(
    /\b(src|srcset)="https:\/\/[^\"]+"/g,
    '$1="/placeholder.svg"'
  );
}

const [rawThemeCss, compareCss, compareLiquid, editorLiquid] = await Promise.all([
  read('theme-draft/assets/theme-r2.css'),
  read('theme-draft/assets/voltical-pdp-bold.css'),
  read('theme-draft/snippets/pdp-compare-inline.liquid'),
  read('theme-draft/snippets/pdp-canva-editor.liquid')
]);

// The live stylesheet imports Google Fonts. A regression run must not wait on
// or vary with the network, so the harness uses the stylesheet's fallback
// stack while retaining the bundled Voltical display font.
const themeCss = rawThemeCss.replace(/^@import\s+url\([^\n]+\);?\s*/m, '');
const compare = compileLiteralSnippet(compareLiquid, 'pdp-compare-inline.liquid');
const editor = compileLiteralSnippet(editorLiquid, 'pdp-canva-editor.liquid');

const pageHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Voltical comparison harness</title>
  <script>
    if (new URLSearchParams(location.search).has('frame')) {
      document.documentElement.classList.add('harness-framed');
    }
  </script>
  <style>${themeCss}</style>
  <style>${compareCss}</style>
  <style>
    html, body { margin: 0; min-height: 100%; }
    body { background: #f5f5f7; }
    .harness-capacity { position: fixed; left: -10000px; }
    .harness-stage { min-height: 100vh; }
    @media (min-width: 900px) {
      html.harness-framed .pinfo {
        width: 100% !important;
        max-width: none !important;
        transform: none !important;
      }
      html.harness-framed .pdp-cmp-wrap,
      html.harness-framed .pdp-cmp,
      html.harness-framed .pdp-cmp__select-group,
      html.harness-framed .pdp-cmp__grid {
        transform: none !important;
      }
      html.harness-framed .pdp-cmp-wrap { width: 700px; min-height: 340px; margin: 0 !important; }
      html.harness-framed .pdp-cmp__select-group { visibility: hidden !important; }
      html.harness-framed .pdp-cmp { margin: 28px auto; }
    }
  </style>
</head>
<body class="template-product">
  <fieldset class="harness-capacity" aria-label="Harness capacity">
    <label><input type="radio" name="capacity" value="5000 mAh">5K</label>
    <label><input type="radio" name="capacity" value="10000 mAh" checked>10K</label>
  </fieldset>
  <main class="harness-stage">
    <section class="section pdp--bold pdp--core">
      <div class="wrap wrap--wide">
        <div class="pinfo">
          <div class="pinfo__below is-in" data-reveal>
            ${compare}
            ${editor}
          </div>
        </div>
      </div>
    </section>
  </main>
</body>
</html>`;

const placeholderSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1000" viewBox="0 0 1000 1000">
  <rect width="1000" height="1000" fill="#e8ebef"/>
  <path d="M0 0 1000 1000M1000 0 0 1000" stroke="#cbd1d8" stroke-width="8"/>
</svg>`;

const server = http.createServer((request, response) => {
  const pathname = new URL(request.url || '/', `http://${request.headers.host}`).pathname;
  response.setHeader('Cache-Control', 'no-store');
  if (pathname === '/health') {
    response.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('ok');
    return;
  }
  if (pathname === '/placeholder.svg') {
    response.writeHead(200, { 'Content-Type': 'image/svg+xml; charset=utf-8' });
    response.end(placeholderSvg);
    return;
  }
  response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  response.end(pageHtml);
});

export function startCompareHarnessServer() {
  return new Promise((fulfill, reject) => {
    if (server.listening) {
      fulfill(server);
      return;
    }
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => {
      server.off('error', reject);
      fulfill(server);
    });
  });
}

export function stopCompareHarnessServer() {
  return new Promise((fulfill) => {
    if (!server.listening) {
      fulfill();
      return;
    }
    server.closeAllConnections?.();
    server.close(() => fulfill());
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await startCompareHarnessServer();
  process.stdout.write(`Voltical comparison harness: http://127.0.0.1:${port}\n`);
}
