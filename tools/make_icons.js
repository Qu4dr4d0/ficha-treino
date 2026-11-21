// Gera os ícones do PWA em docs/icons usando o Chromium do Playwright.
// Uso: node tools/make_icons.js
// Logo do Treinota: post-it amarelo com o canto dobrado e um halter.
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT = path.join(__dirname, '..', 'docs', 'icons');
const NOTE = '#fff8b8', FOLD = '#e8d96b', INK = '#202124';

// halter centrado em (50,45), na escala 100x100
const bell = (k = 1, cx = 50, cy = 45) => `<g transform="translate(${cx} ${cy}) scale(${k}) translate(-50 -45)" stroke="${INK}" stroke-width="7" stroke-linecap="round"><path d="M30 34v22M70 34v22M22 39v12M78 39v12M30 45h40"/></g>`;
// any: o post-it recortado (transparente fora dele)
const note = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M24 0h52a24 24 0 0 1 24 24v44L68 100H24A24 24 0 0 1 0 76V24A24 24 0 0 1 24 0z" fill="${NOTE}"/><path d="M100 68H80a12 12 0 0 0-12 12v20z" fill="${FOLD}"/>${bell(1, 50, 47)}</svg>`;
// maskable e apple: fundo inteiro (o sistema recorta), halter dentro da área segura
const full = (k) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="${NOTE}"/>${bell(k, 50, 50)}</svg>`;

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const jobs = [
    ['icon-192.png', 192, note],
    ['icon-512.png', 512, note],
    ['icon-maskable-512.png', 512, full(0.82)],
    ['apple-touch-icon.png', 180, full(1)],
  ];
  for (const [name, size, svg] of jobs) {
    const p = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
    await p.setContent(`<!doctype html><html><body style="margin:0;background:transparent"><div id="i" style="width:${size}px;height:${size}px">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</div></body></html>`);
    await p.locator('#i').screenshot({ path: path.join(OUT, name), omitBackground: true });
    await p.close();
  }
  fs.writeFileSync(path.join(OUT, 'logo.svg'), note);
  await browser.close();
  console.log('ícones gerados em', OUT);
})();
