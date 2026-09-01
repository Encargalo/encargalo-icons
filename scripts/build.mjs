#!/usr/bin/env node
/**
 * Genera el paquete a partir de los SVG de `src/svg/{outline,solid}`.
 *
 *   node scripts/build.mjs        # regenera src/icons, src/registry.js, metadata.json
 *
 * Añadir un icono nuevo = soltar el .svg en la carpeta de su variante y volver a
 * ejecutar esto. Todo lo que hay bajo src/icons es generado: no editarlo a mano.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseSvg } from './svg-parse.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SVG_DIR = path.join(ROOT, 'src', 'svg')
const SRC_DIR = path.join(ROOT, 'src')
const DATA_DIR = path.join(SRC_DIR, 'data')
/** Un directorio por renderer. Cada uno reexporta los mismos datos envueltos con su createIcon. */
const TARGETS = [
  { dir: 'native', factory: '../core/createIcon.native.js' },
  { dir: 'web', factory: '../core/createIcon.web.js' },
]
const VARIANTS = ['outline', 'solid']

const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'icons.config.json'), 'utf8'))
const warnings = []

/* ------------------------------------------------------------------ utils */

const toPascal = (kebab) =>
  kebab.split(/[-_]/).map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join('')

const toCamelAttr = (attr) =>
  attr.replace(/-([a-z])/g, (_, c) => c.toUpperCase())

const banner = '// Archivo generado por scripts/build.mjs. No editar a mano.\n'

/** Serializa un objeto de atributos como literal JS de una sola línea. */
function serializeAttrs(attrs) {
  const entries = Object.entries(attrs).map(([k, v]) => {
    const key = toCamelAttr(k)
    const safe = /^[A-Za-z_$][\w$]*$/.test(key) ? key : JSON.stringify(key)
    return `${safe}: ${JSON.stringify(v)}`
  })
  return `{ ${entries.join(', ')} }`
}

/**
 * Sube al <svg> raíz los atributos de pintura que comparten todas las figuras.
 * Es seguro porque en SVG esos atributos se heredan, y deja los `d` casi limpios.
 */
const HOISTABLE = [
  'fill', 'stroke', 'stroke-width', 'stroke-linecap',
  'stroke-linejoin', 'stroke-miterlimit', 'fill-rule', 'clip-rule',
]

function hoistCommonAttrs(nodes) {
  const root = {}
  for (const attr of HOISTABLE) {
    const values = nodes.map((n) => n.attrs[attr])
    if (values.some((v) => v == null)) continue
    if (!values.every((v) => v === values[0])) continue
    root[attr] = values[0]
    for (const node of nodes) delete node.attrs[attr]
  }
  return root
}

/* ------------------------------------------------------------------ lectura */

/** @type {Map<string, { variants: Record<string, any> }>} */
const icons = new Map()

for (const variant of VARIANTS) {
  const dir = path.join(SVG_DIR, variant)
  if (!fs.existsSync(dir)) continue
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.svg')).sort()) {
    const name = path.basename(file, '.svg')
    const source = fs.readFileSync(path.join(dir, file), 'utf8')
    const parsed = parseSvg(source, {
      name: `${variant}/${file}`,
      precision: config.precision,
      onWarn: (msg) => warnings.push(msg),
    })
    const root = hoistCommonAttrs(parsed.nodes)
    if (!icons.has(name)) icons.set(name, { variants: {} })
    icons.get(name).variants[variant] = { viewBox: parsed.viewBox, root, nodes: parsed.nodes }
  }
}

const names = [...icons.keys()].sort()

/* ------------------------------------------------------------- validaciones */

const aliasOwner = new Map()
for (const name of names) {
  const component = toPascal(name)
  aliasOwner.set(component, name)
}
for (const name of names) {
  for (const alias of config.icons?.[name]?.aliases ?? []) {
    if (aliasOwner.has(alias)) {
      throw new Error(`El alias "${alias}" (de ${name}) choca con ${aliasOwner.get(alias)}`)
    }
    aliasOwner.set(alias, name)
  }
}
for (const name of Object.keys(config.icons ?? {})) {
  if (!icons.has(name)) warnings.push(`icons.config.json describe "${name}", que no existe en src/svg`)
}


/* -------------------------------------------------------------- generación */

for (const dir of [DATA_DIR, ...TARGETS.map((t) => path.join(SRC_DIR, t.dir))]) {
  fs.rmSync(dir, { recursive: true, force: true })
  fs.mkdirSync(dir, { recursive: true })
}

const aliasesOf = (name) => config.icons?.[name]?.aliases ?? []

for (const name of names) {
  const component = toPascal(name)
  const { variants } = icons.get(name)

  // 1. Geometría, compartida por ambos renderers.
  const variantSrc = VARIANTS.filter((v) => variants[v]).map((v) => {
    const { viewBox, root, nodes } = variants[v]
    return [
      `  ${v}: {`,
      `    viewBox: ${JSON.stringify(viewBox)},`,
      `    root: ${serializeAttrs(root)},`,
      `    nodes: [`,
      nodes.map((n) => `      [${JSON.stringify(n.tag)}, ${serializeAttrs(n.attrs)}],`).join('\n'),
      `    ],`,
      `  },`,
    ].join('\n')
  }).join('\n')

  fs.writeFileSync(
    path.join(DATA_DIR, `${component}.js`),
    `${banner}export const ${component} = {\n${variantSrc}\n}\n`,
  )

  // 2. Un componente por renderer. La anotación /*#__PURE__*/ permite a los
  //    bundlers web descartar los iconos que no se usan.
  const aliases = aliasesOf(name)
  const aliasExports = aliases.length
    ? `export { ${component} as ${aliases.join(`, ${component} as `)} }\n`
    : ''

  for (const target of TARGETS) {
    fs.writeFileSync(
      path.join(SRC_DIR, target.dir, `${component}.js`),
      `${banner}import { createIcon } from '${target.factory}'\n` +
      `import { ${component} as shape } from '../data/${component}.js'\n\n` +
      `export const ${component} = /*#__PURE__*/ createIcon(${JSON.stringify(component)}, shape)\n` +
      aliasExports,
    )
    fs.writeFileSync(
      path.join(SRC_DIR, target.dir, `${component}.d.ts`),
      `${banner}import type { IconComponent } from '../core/types'\n\n` +
      [component, ...aliases].map((n) => `export declare const ${n}: IconComponent\n`).join(''),
    )
  }
}

/* ------------------------------------------------ barril, registro y tipos */

const exportLines = names.map((name) => {
  const component = toPascal(name)
  return `export { ${[component, ...aliasesOf(name)].join(', ')} } from './${component}.js'`
}).join('\n')

const componentList = names.map((n) => `  ${toPascal(n)},`).join('\n')
const registryEntries = names.map((n) => `  ${JSON.stringify(n)}: ${toPascal(n)},`).join('\n')
const nameList = names.map((n) => `  ${JSON.stringify(n)},`).join('\n')

for (const target of TARGETS) {
  const dir = path.join(SRC_DIR, target.dir)

  fs.writeFileSync(path.join(dir, 'index.js'),
    `${banner}${exportLines}\n` +
    `export { createIcon } from '${target.factory}'\n` +
    `export { DEFAULTS } from '../core/defaults.js'\n`)

  fs.writeFileSync(path.join(dir, 'index.d.ts'),
    `${banner}${exportLines}\n` +
    `export { createIcon } from '../core/types'\n` +
    `export type { IconComponent, IconProps, IconShape, IconVariant } from '../core/types'\n` +
    `export declare const DEFAULTS: { size: number; color: string; variant: import('../core/types').IconVariant }\n`)

  // Entrada aparte: importar el registro arrastra TODOS los iconos al bundle.
  fs.writeFileSync(path.join(dir, 'dynamic.js'),
    `${banner}import { createElement } from 'react'\n` +
    `import {\n${componentList}\n} from './index.js'\n\n` +
    `export const iconRegistry = {\n${registryEntries}\n}\n\n` +
    `export const iconNames = [\n${nameList}\n]\n\n` +
    `/** Renderiza un icono por nombre. Úsalo sólo cuando el nombre venga de datos. */\n` +
    `export function Icon({ name, fallback = null, ...props }) {\n` +
    `  const Component = iconRegistry[name]\n` +
    `  if (!Component) return fallback\n` +
    `  return createElement(Component, props)\n` +
    `}\n\n` +
    `Icon.displayName = 'Icon'\n`)

  fs.writeFileSync(path.join(dir, 'dynamic.d.ts'),
    `${banner}import type { ReactElement, ReactNode } from 'react'\n` +
    `import type { IconComponent, IconProps } from '../core/types'\n\n` +
    `export type IconName =\n${names.map((n) => `  | ${JSON.stringify(n)}`).join('\n')}\n\n` +
    `export declare const iconRegistry: Record<IconName, IconComponent>\n` +
    `export declare const iconNames: readonly IconName[]\n\n` +
    `export interface DynamicIconProps extends IconProps {\n` +
    `  name: IconName | (string & {})\n` +
    `  /** Qué renderizar si el nombre no existe en el set. Por defecto, nada. */\n` +
    `  fallback?: ReactNode\n` +
    `}\n\n` +
    `export declare function Icon(props: DynamicIconProps): ReactElement | null\n`)
}

/* ---------------------------------------------------------------- metadata */

const metadata = {
  version: JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version,
  generatedAt: new Date().toISOString().slice(0, 10),
  defaults: config.defaults,
  icons: names.map((name) => ({
    name,
    component: toPascal(name),
    aliases: aliasesOf(name),
    tags: config.icons?.[name]?.tags ?? [],
    variants: VARIANTS.filter((v) => icons.get(name).variants[v]),
    // Para el catálogo: el SVG ya normalizado, listo para inyectar en una web.
    preview: Object.fromEntries(
      VARIANTS.filter((v) => icons.get(name).variants[v]).map((v) => {
        const { viewBox, root, nodes } = icons.get(name).variants[v]
        const attrs = (o) => Object.entries(o).map(([k, x]) => ` ${k}="${x}"`).join('')
        return [v, `<svg viewBox="${viewBox}"${attrs(root)} xmlns="http://www.w3.org/2000/svg">` +
          nodes.map((n) => `<${n.tag}${attrs(n.attrs)}/>`).join('') + '</svg>']
      }),
    ),
  })),
}
fs.writeFileSync(path.join(ROOT, 'metadata.json'), JSON.stringify(metadata, null, 2) + '\n')

/* ----------------------------------------------------------------- informe */

const du = (dir) => fs.readdirSync(dir).reduce((s, f) => s + fs.statSync(path.join(dir, f)).size, 0)
const both = names.filter((n) => icons.get(n).variants.outline && icons.get(n).variants.solid).length
const totalNodes = names.reduce(
  (sum, n) => sum + VARIANTS.reduce((s, v) => s + (icons.get(n).variants[v]?.nodes.length ?? 0), 0), 0)

console.log(`${names.length} iconos · ${both} con las dos variantes · ${totalNodes} figuras`)
console.log(`  src/data   ${(du(DATA_DIR) / 1024).toFixed(1)} KB`)
for (const t of TARGETS) console.log(`  src/${t.dir.padEnd(7)}${(du(path.join(SRC_DIR, t.dir)) / 1024).toFixed(1)} KB`)
for (const w of warnings) console.warn(`  aviso: ${w}`)
