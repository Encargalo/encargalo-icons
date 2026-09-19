#!/usr/bin/env node
/**
 * Pruebas de los cuatro artefactos que se publican: {ESM, CommonJS} × {web, nativo}.
 *
 * Node decide si un .js es ESM o CJS por el `"type"` del package.json más
 * cercano, y el nuestro no lo declara a propósito (para no forzar a Jest a modo
 * ESM). Por eso las pruebas montan dos areneros efímeros, cada uno con su marca
 * de tipo, y un doble de `react-native-svg` que renderiza a elementos del DOM;
 * así se comprueba el renderer nativo sin arrancar React Native.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement as h } from 'react'
import { parseSvg } from './svg-parse.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const TMP = path.join(ROOT, '.tmp-test')

/** Doble de react-native-svg: cada figura se convierte en su equivalente del DOM. */
const stubBody = (exportSyntax) => `
${exportSyntax === 'esm' ? "import { createElement } from 'react'" : "const { createElement } = require('react')"}

// Props que sólo existen en React Native: se descartan para que react-dom no
// avise de atributos desconocidos.
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
const Path = shape('path'), Circle = shape('circle'), Rect = shape('rect')
const Ellipse = shape('ellipse'), Line = shape('line')
const Polygon = shape('polygon'), Polyline = shape('polyline')
const Svg = shape('svg')
${exportSyntax === 'esm'
  ? 'export { Path, Circle, Rect, Ellipse, Line, Polygon, Polyline }\nexport default Svg'
  : 'module.exports = { Path, Circle, Rect, Ellipse, Line, Polygon, Polyline, default: Svg, __esModule: true }'}
`

fs.rmSync(TMP, { recursive: true, force: true })

// Arenero ESM: copia de src/ marcada como módulo.
fs.cpSync(path.join(ROOT, 'src'), path.join(TMP, 'esm'), { recursive: true })
fs.writeFileSync(path.join(TMP, 'package.json'), '{ "type": "module" }')
const esmStub = path.join(TMP, 'node_modules', 'react-native-svg')
fs.mkdirSync(esmStub, { recursive: true })
fs.writeFileSync(path.join(esmStub, 'package.json'), '{ "type": "module", "main": "index.js" }')
fs.writeFileSync(path.join(esmStub, 'index.js'), stubBody('esm'))

// Arenero CommonJS: copia de cjs/ con su propia marca, que gana por cercanía.
fs.cpSync(path.join(ROOT, 'cjs'), path.join(TMP, 'cjs'), { recursive: true })
fs.writeFileSync(path.join(TMP, 'cjs', 'package.json'), '{ "type": "commonjs" }')
const cjsStub = path.join(TMP, 'cjs', 'node_modules', 'react-native-svg')
fs.mkdirSync(cjsStub, { recursive: true })
fs.writeFileSync(path.join(cjsStub, 'package.json'), '{ "type": "commonjs", "main": "index.js" }')
fs.writeFileSync(path.join(cjsStub, 'index.js'), stubBody('cjs'))

const requireCjs = createRequire(path.join(TMP, 'cjs', 'probe.js'))
const builds = {
  'esm/web': await import(pathToFileURL(path.join(TMP, 'esm', 'web', 'index.js')).href),
  'esm/native': await import(pathToFileURL(path.join(TMP, 'esm', 'native', 'index.js')).href),
  'cjs/web': requireCjs('./web/index.js'),
  'cjs/native': requireCjs('./native/index.js'),
}
const dynamicBuilds = {
  'esm/native': await import(pathToFileURL(path.join(TMP, 'esm', 'native', 'dynamic.js')).href),
  'cjs/native': requireCjs('./native/dynamic.js'),
}

let passed = 0
const failures = []
const test = (name, fn) => {
  try { fn(); passed++ } catch (error) { failures.push(`${name}\n      ${error.message.split('\n')[0]}`) }
}

for (const [build, lib] of Object.entries(builds)) {
  const { Home, Search, Helmet, TickCircle, CheckCircle } = lib
  const render = (Component, props) => renderToStaticMarkup(h(Component, props))
  const it = (name, fn) => test(`[${build}] ${name}`, fn)

  it('el barril exporta todos los iconos', () => {
    assert.ok(Home && Search && Helmet, 'faltan exports en el barril')
  })

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

  it('el alias apunta al mismo componente', () => {
    assert.equal(CheckCircle, TickCircle)
  })

  it('todos los iconos renderizan al menos una figura', () => {
    for (const [name, Component] of Object.entries(lib)) {
      if (name === 'DEFAULTS' || name === 'createIcon' || name === 'default') continue
      if (typeof Component !== 'object' && typeof Component !== 'function') continue
      assert.match(render(Component), /<(path|circle|rect|ellipse|line|polygon|polyline)/, `${name} no dibujó nada`)
    }
  })
}

test('[svg-parse] respeta viewBox no estándar', () => {
  const svg = '<svg viewBox="0 0 512 512"><path d="M0 0h512v512H0z"/></svg>'
  const parsed = parseSvg(svg, { name: 'fixture' })
  assert.equal(parsed.viewBox, '0 0 512 512')
})

// Los dos formatos deben producir exactamente el mismo SVG.
test('[paridad] ESM y CommonJS renderizan idéntico', () => {
  for (const platform of ['web', 'native']) {
    const esm = builds[`esm/${platform}`]
    const cjs = builds[`cjs/${platform}`]
    const names = Object.keys(esm).filter((n) => !['DEFAULTS', 'createIcon', 'default'].includes(n))
    assert.equal(names.length, Object.keys(cjs).filter((n) => !['DEFAULTS', 'createIcon', 'default'].includes(n)).length,
      `${platform}: distinto número de exports`)
    for (const name of names) {
      for (const props of [undefined, { size: 40, color: '#123456', variant: 'solid' }]) {
        assert.equal(
          renderToStaticMarkup(h(esm[name], props)),
          renderToStaticMarkup(h(cjs[name], props)),
          `${platform}/${name} difiere entre ESM y CommonJS`,
        )
      }
    }
  }
})

for (const [build, dyn] of Object.entries(dynamicBuilds)) {
  test(`[${build}] Icon resuelve por nombre y admite fallback`, () => {
    assert.match(renderToStaticMarkup(h(dyn.Icon, { name: 'home' })), /<svg/)
    assert.equal(renderToStaticMarkup(h(dyn.Icon, { name: 'no-existe' })), '')
    assert.equal(dyn.iconNames.length, Object.keys(dyn.iconRegistry).length)
  })
}

test('[web] sin color no se emite el atributo (lo hereda de CSS)', () => {
  assert.doesNotMatch(renderToStaticMarkup(h(builds['esm/web'].Home)), /color="/)
})

test('[web] decorativo por defecto, accesible con accessibilityLabel', () => {
  assert.match(renderToStaticMarkup(h(builds['esm/web'].Home)), /aria-hidden="true"/)
  const labelled = renderToStaticMarkup(h(builds['esm/web'].Home, { accessibilityLabel: 'Inicio' }))
  assert.match(labelled, /role="img"/)
  assert.match(labelled, /aria-label="Inicio"/)
})

test('[metadata] coincide con los iconos publicados', () => {
  const meta = JSON.parse(fs.readFileSync(path.join(ROOT, 'metadata.json'), 'utf8'))
  assert.equal(meta.icons.length, dynamicBuilds['esm/native'].iconNames.length)
  for (const icon of meta.icons) assert.ok(icon.variants.length > 0, `${icon.name} sin variantes`)
})

test('[package] las rutas declaradas en exports existen', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'))
  const paths = new Set()
  const walk = (node) => {
    if (typeof node === 'string') { paths.add(node); return }
    if (node && typeof node === 'object') Object.values(node).forEach(walk)
  }
  walk(pkg.exports)
  for (const field of ['main', 'module', 'react-native', 'types']) if (pkg[field]) paths.add(pkg[field])
  for (const rel of paths) {
    assert.ok(fs.existsSync(path.join(ROOT, rel)), `${rel} no existe pero está declarado en package.json`)
  }
})

fs.rmSync(TMP, { recursive: true, force: true })

for (const failure of failures) console.error(`  FALLA  ${failure}`)
console.log(`\n${passed}/${passed + failures.length} pruebas`)
process.exit(failures.length ? 1 : 0)
