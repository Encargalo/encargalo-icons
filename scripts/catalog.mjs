#!/usr/bin/env node
/**
 * Genera una página autónoma con todos los iconos, buscador y control de
 * tamaño/color. Sirve para revisar el set de un vistazo y para compartirlo con
 * diseño sin instalar nada.
 *
 *   node scripts/catalog.mjs                    # → catalog.html (local)
 *   node scripts/catalog.mjs public/index.html  # → lo que despliega Vercel
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const meta = JSON.parse(fs.readFileSync(path.join(ROOT, 'metadata.json'), 'utf8'))

const escape = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

const card = (icon) => {
  const search = [icon.name, icon.component, ...icon.aliases, ...icon.tags].join(' ').toLowerCase()
  const previews = ['outline', 'solid']
    .map((v) => icon.preview[v]
      ? `<div class="v" data-variant="${v}">${icon.preview[v]}</div>`
      : `<div class="v empty" data-variant="${v}" title="sin variante ${v}"></div>`)
    .join('')
  return `<article class="card" data-search="${escape(search)}" data-name="${escape(icon.component)}">
  <div class="glyphs">${previews}</div>
  <h3>${escape(icon.component)}</h3>
  <p class="slug">${escape(icon.name)}</p>
  ${icon.aliases.length ? `<p class="aliases">${icon.aliases.map(escape).join(' · ')}</p>` : ''}
</article>`
}

const html = `<!doctype html>
<html lang="es">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>encargalo-icons</title>
<style>
  :root {
    color-scheme: light dark;
    --bg: #fbfbfa; --panel: #fff; --line: #e6e4e0; --ink: #1c1b19; --muted: #78736c; --accent: #ff5a1f;
  }
  @media (prefers-color-scheme: dark) {
    :root { --bg: #131211; --panel: #1c1b19; --line: #2e2c29; --ink: #f2f0ed; --muted: #8f8a87; --accent: #ff7a45; }
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--ink); font: 15px/1.5 ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
  header { position: sticky; top: 0; z-index: 2; background: color-mix(in srgb, var(--bg) 88%, transparent); backdrop-filter: blur(8px); border-bottom: 1px solid var(--line); padding: 20px 24px; }
  .title { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; }
  h1 { font-size: 17px; margin: 0; letter-spacing: -0.01em; }
  .count { color: var(--muted); font-size: 13px; }
  .controls { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; }
  input[type=search] { flex: 1 1 240px; min-width: 0; padding: 9px 12px; border: 1px solid var(--line); border-radius: 9px; background: var(--panel); color: inherit; font: inherit; }
  input[type=search]:focus { outline: 2px solid var(--accent); outline-offset: -1px; }
  .seg { display: flex; border: 1px solid var(--line); border-radius: 9px; overflow: hidden; background: var(--panel); }
  .seg button { border: 0; background: none; color: var(--muted); font: inherit; padding: 8px 14px; cursor: pointer; }
  .seg button[aria-pressed=true] { background: var(--ink); color: var(--bg); }
  label.range { display: flex; align-items: center; gap: 8px; color: var(--muted); font-size: 13px; }
  input[type=color] { width: 34px; height: 34px; padding: 0; border: 1px solid var(--line); border-radius: 9px; background: var(--panel); cursor: pointer; }
  main { padding: 24px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(132px, 1fr)); gap: 10px; }
  .card { background: var(--panel); border: 1px solid var(--line); border-radius: 12px; padding: 18px 10px 12px; text-align: center; cursor: pointer; transition: border-color .12s; }
  .card:hover { border-color: var(--accent); }
  .card.copied { border-color: var(--accent); box-shadow: inset 0 0 0 1px var(--accent); }
  .glyphs { display: flex; justify-content: center; gap: 10px; margin-bottom: 14px; min-height: var(--size, 28px); align-items: center; }
  .v svg { width: var(--size, 28px); height: var(--size, 28px); color: var(--glyph, currentColor); display: block; }
  .v.empty { width: var(--size, 28px); height: var(--size, 28px); border: 1px dashed var(--line); border-radius: 6px; }
  body[data-variant=outline] .v[data-variant=solid], body[data-variant=solid] .v[data-variant=outline] { display: none; }
  h3 { font-size: 12px; margin: 0; font-weight: 550; word-break: break-word; }
  .slug, .aliases { margin: 2px 0 0; font-size: 10.5px; color: var(--muted); word-break: break-word; }
  .aliases { opacity: .75; }
  .empty-state { color: var(--muted); padding: 48px 0; text-align: center; }
</style>

<header>
  <div class="title">
    <h1>encargalo-icons</h1>
    <span class="count">v${escape(meta.version)} · ${meta.icons.length} iconos · generado el ${escape(meta.generatedAt)}</span>
  </div>
  <div class="controls">
    <input type="search" id="q" placeholder="Buscar por nombre, alias o etiqueta (carrito, pedido, perfil…)" autofocus>
    <div class="seg" role="group" aria-label="Variante">
      <button data-v="both" aria-pressed="true">Ambas</button>
      <button data-v="outline" aria-pressed="false">Outline</button>
      <button data-v="solid" aria-pressed="false">Solid</button>
    </div>
    <label class="range">Tamaño <input type="range" id="size" min="16" max="64" value="28"></label>
    <input type="color" id="color" value="#1c1b19" aria-label="Color">
  </div>
</header>

<main>
  <div class="grid" id="grid">
${meta.icons.map(card).join('\n')}
  </div>
  <p class="empty-state" id="empty" hidden>Ningún icono coincide.</p>
</main>

<script>
  const grid = document.getElementById('grid')
  const cards = [...grid.children]
  const empty = document.getElementById('empty')

  document.getElementById('q').addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase()
    let shown = 0
    for (const card of cards) {
      const match = !q || card.dataset.search.includes(q)
      card.hidden = !match
      if (match) shown++
    }
    empty.hidden = shown > 0
  })

  document.querySelectorAll('.seg button').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.seg button').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)))
      document.body.dataset.variant = btn.dataset.v === 'both' ? '' : btn.dataset.v
    })
  })

  document.getElementById('size').addEventListener('input', (e) => {
    document.documentElement.style.setProperty('--size', e.target.value + 'px')
  })

  document.getElementById('color').addEventListener('input', (e) => {
    document.documentElement.style.setProperty('--glyph', e.target.value)
  })

  // Clic en una tarjeta = copiar el import listo para pegar.
  grid.addEventListener('click', (e) => {
    const card = e.target.closest('.card')
    if (!card) return
    navigator.clipboard?.writeText(\`import { \${card.dataset.name} } from 'encargalo-icons'\`)
    card.classList.add('copied')
    setTimeout(() => card.classList.remove('copied'), 700)
  })
</script>
</html>
`

const target = path.resolve(ROOT, process.argv[2] ?? 'catalog.html')
fs.mkdirSync(path.dirname(target), { recursive: true })
fs.writeFileSync(target, html)
console.log(`${path.relative(ROOT, target)} · ${meta.icons.length} iconos · ${(html.length / 1024).toFixed(0)} KB`)
