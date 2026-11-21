#!/usr/bin/env python3
"""Monta o PWA em docs/ a partir de src/app.html.

src/app.html é a fonte única do app (é também o que vai para o Artifact do
Claude, que não aceita doctype/head próprios). Este script embrulha o app num
documento HTML completo, troca a biblioteca do CDN pela cópia local (para
funcionar offline), gera o manifesto e o service worker com versão nova.

Uso: python3 tools/build.py
Os ícones em docs/icons são gerados uma vez por tools/make_icons.js.
"""
import hashlib
import json
import pathlib
import shutil

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / 'src' / 'app.html'
OUT = ROOT / 'docs'
CDN = 'https://cdn.jsdelivr.net/npm/htm@3.1.1/preact/standalone.module.js'
LOCAL = './vendor/htm-preact-3.1.1.js'

HEAD = """<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#202124">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Treinota">
<meta name="application-name" content="Treinota">
<link rel="manifest" href="./manifest.webmanifest">
<link rel="icon" href="./icons/logo.svg" type="image/svg+xml">
<link rel="icon" href="./icons/icon-192.png" type="image/png">
<link rel="apple-touch-icon" href="./icons/apple-touch-icon.png">
<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}[hidden]{display:none!important}img{max-width:100%}</style>
</head>
<body>
"""

TAIL = """
<script>
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('./sw.js').catch(() => {}); });
}
</script>
</body>
</html>
"""

MANIFEST = {
    'name': 'Treinota',
    'short_name': 'Treinota',
    'description': 'Treino e dieta com progressão de carga e cronômetro de descanso.',
    'lang': 'pt-BR',
    'start_url': './',
    'scope': './',
    'display': 'standalone',
    'orientation': 'portrait',
    'background_color': '#202124',
    'theme_color': '#202124',
    'icons': [
        {'src': './icons/icon-192.png', 'sizes': '192x192', 'type': 'image/png', 'purpose': 'any'},
        {'src': './icons/icon-512.png', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'any'},
        {'src': './icons/icon-maskable-512.png', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'maskable'},
    ],
}


# Cabeçalhos para o Cloudflare Pages (arquivo docs/_headers).
# Página, service worker e manifest sempre conferem se há versão nova; ícones e a biblioteca ficam em cache.
HEADERS = """/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=(), microphone=(), payment=()
  X-Frame-Options: DENY
  Strict-Transport-Security: max-age=31536000

/
  Cache-Control: no-cache
/index.html
  Cache-Control: no-cache
/sw.js
  Cache-Control: no-cache
/manifest.webmanifest
  Cache-Control: no-cache
/icons/*
  Cache-Control: public, max-age=604800
/vendor/*
  Cache-Control: public, max-age=31536000, immutable
"""


def main():
    app = SRC.read_text(encoding='utf-8')
    assert CDN in app, 'import da biblioteca não encontrado em src/app.html'
    app = app.replace(CDN, LOCAL)
    (OUT / 'vendor').mkdir(parents=True, exist_ok=True)
    shutil.copy(ROOT / 'tools' / 'htm-preact-3.1.1.js', OUT / 'vendor' / 'htm-preact-3.1.1.js')

    html = HEAD + app + TAIL
    (OUT / 'index.html').write_text(html, encoding='utf-8')
    (OUT / 'manifest.webmanifest').write_text(json.dumps(MANIFEST, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

    version = hashlib.sha256(html.encode('utf-8')).hexdigest()[:10]
    sw = (ROOT / 'tools' / 'sw.template.js').read_text(encoding='utf-8').replace('__VERSION__', version)
    (OUT / 'sw.js').write_text(sw, encoding='utf-8')
    (OUT / '.nojekyll').write_text('', encoding='utf-8')
    (OUT / '_headers').write_text(HEADERS, encoding='utf-8')
    print(f'docs/ gerado (versão {version})')


if __name__ == '__main__':
    main()
