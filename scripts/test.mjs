#!/usr/bin/env node
/**
 * Pruebas de los dos renderers.
 *
 * El paquete se publica como ESM sin `"type": "module"` (para que Jest de Expo lo
 * transpile con Babel sin pedir `--experimental-vm-modules`). Node, en cambio, sí
 * necesita esa marca, así que las pruebas montan una copia efímera de `src` con
 * ella y con un doble de `react-native-svg` que renderiza a elementos del DOM;
 * así se puede comprobar el renderer nativo sin arrancar React Native.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement as h } from 'react'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const TMP = path.join(ROOT, '.tmp-test')

fs.rmSync(TMP, { recursive: true, force: true })
fs.cpSync(path.join(ROOT, 'src'), path.join(TMP, 'src'), { recursive: true })
fs.writeFileSync(path.join(TMP, 'package.json'), '{ "type": "module" }')

const stub = path.join(TMP, 'node_modules', 'react-native-svg')
fs.mkdirSync(stub, { recursive: true })
fs.writeFileSync(path.join(stub, 'package.json'), '{ "type": "module", "main": "index.js" }')
fs.writeFileSync(path.join(stub, 'index.js'), `
import { createElement } from 'react'
// Props que sólo existen en React Native: el doble las descarta para que
// react-dom no avise de atributos desconocidos.
const RN_ONLY = ['accessible', 'importantForAccessibility', 'accessibilityRole', 'accessibilityLabel']
const shape = (tag) => {
  const C = (props) => {
    const clean = { ...props }
    for (const key of RN_ONLY) delete clean[key]
    return createElement(tag, clean)
  }
  C.displayName = tag
  return C
}
export const Path = shape('path')
export const Circle = shape('circle')
export const Rect = shape('rect')
export const Ellipse = shape('ellipse')
export const Line = shape('line')
export const Polygon = shape('polygon')
export const Polyline = shape('polyline')
export default shape('svg')
`)

const load = (target) => import(pathToFileURL(path.join(TMP, 'src', target, 'index.js')).href)
const native = await load('native')
const web = await load('web')
const dynamic = await import(pathToFileURL(path.join(TMP, 'src', 'native', 'dynamic.js')).href)

let passed = 0
const failures = []
const test = (name, fn) => {
  try { fn(); passed++ } catch (error) { failures.push(`${name}\n      ${error.message.split('\n')[0]}`) }
}

for (const [platform, lib] of [['web', web], ['native', native]]) {
  const { Home, Search, Helmet, TickCircle, CheckCircle } = lib
  const render = (Component, props) => renderToStaticMarkup(h(Component, props))
  const it = (name, fn) => test(`[${platform}] ${name}`, fn)

  it('tamaño por defecto 24', () => {
    assert.match(render(Home), /width="24"/)
    assert.match(render(Home), /height="24"/)
  })

  it('size cambia ancho y alto', () => {
    assert.match(render(Home, { size: 48 }), /width="48".*height="48"/s)
  })

  it('color llega al svg y los paths usan currentColor', () => {
    const out = render(Home, { color: '#FF5A1F' })
    assert.match(out, /color="#FF5A1F"/)
    assert.match(out, /fill="currentColor"/)
  })

  it('variant solid produce geometría distinta de outline', () => {
    assert.notEqual(render(Home, { variant: 'outline' }), render(Home, { variant: 'solid' }))
  })

  it('variant inexistente cae en la disponible', () => {
    assert.match(render(Search, { variant: 'solid' }), /stroke="currentColor"/)
  })

  it('strokeWidth sobreescribe el 1.5 de IconSax', () => {
    assert.match(render(Search), /stroke-width="1.5"/)
    assert.match(render(Search, { strokeWidth: 3 }), /stroke-width="3"/)
  })

  it('absoluteStrokeWidth compensa el escalado', () => {
    assert.match(render(Search, { size: 48, absoluteStrokeWidth: true }), /stroke-width="0.75"/)
  })

  it('respeta viewBox no estándar', () => {
    assert.match(render(Helmet), /viewBox="0 0 512 512"/)
  })

  it('el alias apunta al mismo componente', () => {
    assert.equal(CheckCircle, TickCircle)
  })

  it('todos los iconos renderizan al menos una figura', () => {
    for (const [name, Component] of Object.entries(lib)) {
      if (typeof Component !== 'object' && typeof Component !== 'function') continue
      if (name === 'DEFAULTS' || name === 'createIcon') continue
      const out = render(Component)
      assert.match(out, /<(path|circle|rect|ellipse|line|polygon|polyline)/, `${name} no dibujó nada`)
    }
  })
}

test('[web] sin color no se emite el atributo (lo hereda de CSS)', () => {
  assert.doesNotMatch(renderToStaticMarkup(h(web.Home)), /color="/)
})

test('[web] decorativo por defecto, accesible con accessibilityLabel', () => {
  assert.match(renderToStaticMarkup(h(web.Home)), /aria-hidden="true"/)
  const labelled = renderToStaticMarkup(h(web.Home, { accessibilityLabel: 'Inicio' }))
  assert.match(labelled, /role="img"/)
  assert.match(labelled, /aria-label="Inicio"/)
})

test('[dynamic] Icon resuelve por nombre y admite fallback', () => {
  assert.match(renderToStaticMarkup(h(dynamic.Icon, { name: 'home' })), /<svg/)
  assert.equal(renderToStaticMarkup(h(dynamic.Icon, { name: 'no-existe' })), '')
  assert.equal(dynamic.iconNames.length, Object.keys(dynamic.iconRegistry).length)
})

test('[metadata] coincide con los iconos publicados', () => {
  const meta = JSON.parse(fs.readFileSync(path.join(ROOT, 'metadata.json'), 'utf8'))
  assert.equal(meta.icons.length, dynamic.iconNames.length)
  for (const icon of meta.icons) assert.ok(icon.variants.length > 0, `${icon.name} sin variantes`)
})

fs.rmSync(TMP, { recursive: true, force: true })

for (const failure of failures) console.error(`  FALLA  ${failure}`)
console.log(`\n${passed}/${passed + failures.length} pruebas`)
process.exit(failures.length ? 1 : 0)
