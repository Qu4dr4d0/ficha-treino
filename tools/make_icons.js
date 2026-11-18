// Gera os ícones do PWA em docs/icons usando o Chromium do Playwright.
// Uso: node tools/make_icons.js   (precisa de internet para a fonte Nunito)
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT = path.join(__dirname, '..', 'docs', 'icons');
const BG = '#202124';
const FG = '#ffffff';

// any: quadrado arredondado; maskable: fundo inteiro com a letra na área segura.
const page = (size, maskable) => `<!doctype html><html><head>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Nunito:wght@900&display=block">
<style>html,body{margin:0;background:transparent}
.i{width:${size}px;height:${size}px;display:grid;place-items:center;background:${BG};border-radius:${maskable ? 0 : size * 0.22}px}
.f{font-family:Nunito,sans-serif;font-weight:900;color:${FG};font-size:${size * (maskable ? 0.5 : 0.66)}px;line-height:1;text-box:trim-both cap alphabetic}
</style></head><body><div class="i"><span class="f">f</span></div></body></html>`;

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const jobs = [
    ['icon-192.png', 192, false],
    ['icon-512.png', 512, false],
    ['icon-maskable-512.png', 512, true],
    ['apple-touch-icon.png', 180, true],
  ];
  for (const [name, size, maskable] of jobs) {
    const p = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
    await p.setContent(page(size, maskable));
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(300);
    await p.locator('.i').screenshot({ path: path.join(OUT, name), omitBackground: true });
    await p.close();
  }
  await browser.close();
  console.log('ícones gerados em', OUT);
})();
