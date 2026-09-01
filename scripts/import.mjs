#!/usr/bin/env node
/**
 * Trae los SVG nuevos desde la bandeja de entrada (la carpeta donde se exportan
 * los iconos desde Figma) hasta `src/svg/`, normalizando el nombre y validando
 * que cada archivo se pueda convertir en componente.
 *
 *   npm run icons:import -- --dry-run       # sólo dice qué haría
 *   npm run icons:import                    # copia
 *   npm run icons:import -- --force         # además sobreescribe los que ya existan
 *   npm run icons:import -- --from "/ruta"  # bandeja distinta, sólo por esta vez
 *
 * La ruta de la bandeja NO está fijada en el código: cambia por persona y por
 * equipo. Se resuelve en este orden:
 *
 *   1. --from "/ruta/a/la/bandeja"
 *   2. la variable de entorno ICONS_INBOX
 *   3. .iconsrc.json en la raíz del repo (no se versiona)
 *
 * Dentro de la bandeja se esperan las carpetas Outline/ y Solid/, tal cual las
 * exporta IconSax.
 */
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseSvg } from './svg-parse.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DEST = path.join(ROOT, 'src', 'svg')
const VARIANTS = { outline: 'outline', solid: 'solid' }

const args = process.argv.slice(2)
const has = (flag) => args.includes(flag)
const valueOf = (flag) => {
  const i = args.indexOf(flag)
  return i !== -1 ? args[i + 1] : undefined
}

const dryRun = has('--dry-run')
const force = has('--force')

/* ------------------------------------------------- resolver la bandeja */

function resolveInbox() {
  const fromArg = valueOf('--from')
  if (fromArg) return { dir: fromArg, source: '--from' }

  if (process.env.ICONS_INBOX) return { dir: process.env.ICONS_INBOX, source: 'ICONS_INBOX' }

  const rcPath = path.join(ROOT, '.iconsrc.json')
  if (fs.existsSync(rcPath)) {
    let rc
    try {
      rc = JSON.parse(fs.readFileSync(rcPath, 'utf8'))
    } catch (error) {
      fail(`.iconsrc.json no es JSON válido: ${error.message}`)
    }
    if (rc.inbox) return { dir: rc.inbox, source: '.iconsrc.json' }
  }

  fail(
    'No sé de dónde tomar los iconos nuevos.\n\n' +
    '  Configúralo de una de estas tres formas:\n\n' +
    '  1. Copia .iconsrc.example.json a .iconsrc.json y pon ahí tu ruta\n' +
    '     (es lo habitual; el archivo no se versiona, así cada persona tiene la suya).\n\n' +
    '  2. export ICONS_INBOX="/ruta/a/tus/iconos"\n\n' +
    '  3. npm run icons:import -- --from "/ruta/a/tus/iconos"\n\n' +
    '  La carpeta debe contener Outline/ y/o Solid/ con los .svg dentro.',
  )
}

function fail(message) {
  console.error(`\n  ${message}\n`)
  process.exit(1)
}

/* --------------------------------------------------------- normalizar */

/** `iconsax-bag-timer-da8091a57397-.svg` → `bag-timer` */
function normalizeName(file) {
  return path
    .basename(file, path.extname(file))
    .replace(/^iconsax[-_]/i, '')
    .replace(/[-_][0-9a-f]{12}[-_]?$/i, '')   // sufijo de hash de Figma
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-zA-Z0-9-]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
}

const hashOf = (text) => crypto.createHash('sha1').update(text.replace(/\s+/g, '')).digest('hex')

/* ------------------------------------------------------------ ejecutar */

const { dir: inboxRaw, source } = resolveInbox()
const inbox = path.resolve(inboxRaw.replace(/^~(?=$|\/)/, process.env.HOME ?? '~'))

if (!fs.existsSync(inbox)) {
  fail(`La bandeja no existe:\n\n    ${inbox}\n\n  (viene de ${source})\n\n  Créala, o apunta a otra ruta.`)
}
if (!fs.statSync(inbox).isDirectory()) fail(`La bandeja no es una carpeta:\n\n    ${inbox}`)

console.log(`\n  Bandeja: ${inbox}`)
console.log(`  Origen de la ruta: ${source}${dryRun ? '  ·  SIMULACRO, no se copia nada' : ''}\n`)

// Las subcarpetas se buscan sin distinguir mayúsculas (Outline, outline, OUTLINE).
const subdirs = fs.readdirSync(inbox, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .reduce((acc, entry) => {
    const variant = VARIANTS[entry.name.toLowerCase()]
    if (variant) acc[variant] = path.join(inbox, entry.name)
    return acc
  }, {})

if (Object.keys(subdirs).length === 0) {
  fail(
    `No encontré ninguna carpeta Outline/ ni Solid/ dentro de:\n\n    ${inbox}\n\n` +
    `  Contiene: ${fs.readdirSync(inbox).join(', ') || '(vacío)'}`,
  )
}

// Índice de lo que ya está en el repo, para detectar duplicados exactos.
const existing = new Map()
for (const variant of Object.keys(VARIANTS)) {
  const dir = path.join(DEST, variant)
  if (!fs.existsSync(dir)) continue
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.svg'))) {
    existing.set(`${variant}/${path.basename(file, '.svg')}`, hashOf(fs.readFileSync(path.join(dir, file), 'utf8')))
  }
}

const actions = { nuevos: [], sobreescritos: [], iguales: [], colisiones: [], invalidos: [], vacios: [] }
const seenInRun = new Map()

for (const [variant, variantDir] of Object.entries(subdirs)) {
  const files = fs.readdirSync(variantDir).filter((f) => f.toLowerCase().endsWith('.svg')).sort()
  if (files.length === 0) {
    actions.vacios.push(variant)
    continue
  }

  for (const file of files) {
    const svgPath = path.join(variantDir, file)
    const raw = fs.readFileSync(svgPath, 'utf8')
    const name = normalizeName(file)
    const key = `${variant}/${name}`

    if (!name) {
      actions.invalidos.push([`${variant}/${file}`, 'el nombre queda vacío al normalizarlo'])
      continue
    }

    // Validar antes de copiar: si el generador no puede con él, mejor saberlo ahora.
    try {
      const parsed = parseSvg(raw, { name: key, precision: 2, onWarn: () => {} })
      if (parsed.nodes.length === 0) throw new Error('no dibuja nada')
    } catch (error) {
      actions.invalidos.push([`${variant}/${file}`, error.message])
      continue
    }

    // Dos archivos distintos de la bandeja que se normalizan al mismo nombre.
    if (seenInRun.has(key)) {
      actions.colisiones.push([key, `${file} choca con ${seenInRun.get(key)} (mismo nombre tras normalizar)`])
      continue
    }
    seenInRun.set(key, file)

    const hash = hashOf(raw)
    if (existing.has(key)) {
      if (existing.get(key) === hash) {
        actions.iguales.push([key, file])
        continue
      }
      if (!force) {
        actions.colisiones.push([key, `ya existe y es distinto — usa --force para reemplazarlo`])
        continue
      }
      actions.sobreescritos.push([key, file])
    } else {
      actions.nuevos.push([key, file])
    }

    if (!dryRun) {
      const target = path.join(DEST, variant, `${name}.svg`)
      fs.mkdirSync(path.dirname(target), { recursive: true })
      fs.copyFileSync(svgPath, target)
      fs.chmodSync(target, 0o644)
    }
  }
}

/* ------------------------------------------------------------ informe */

const list = (title, entries, render) => {
  if (entries.length === 0) return
  console.log(`  ${title}`)
  for (const entry of entries) console.log(`    ${render(entry)}`)
  console.log()
}

list('Nuevos', actions.nuevos, ([key, file]) => `${key.padEnd(28)} ← ${file}`)
list('Reemplazados', actions.sobreescritos, ([key, file]) => `${key.padEnd(28)} ← ${file}`)
list('Sin cambios (ya estaban idénticos)', actions.iguales, ([key]) => key)
list('Sin resolver', actions.colisiones, ([key, why]) => `${key.padEnd(28)} ${why}`)
list('Descartados por inválidos', actions.invalidos, ([key, why]) => `${key.padEnd(28)} ${why}`)

for (const variant of actions.vacios) console.log(`  La carpeta ${variant}/ de la bandeja está vacía.\n`)

const copiados = actions.nuevos.length + actions.sobreescritos.length
const bloqueados = actions.colisiones.length + actions.invalidos.length

if (copiados === 0 && bloqueados === 0) {
  console.log('  Nada que importar: la bandeja no trae iconos nuevos.\n')
  process.exit(0)
}

if (dryRun) {
  console.log(`  Simulacro: se copiarían ${copiados} archivo(s). Repite sin --dry-run para hacerlo.\n`)
} else if (copiados > 0) {
  console.log(`  ${copiados} archivo(s) copiados a src/svg/. Los originales siguen en la bandeja.\n`)
  console.log('  Siguiente paso:\n')
  console.log('    npm run build     # regenera los componentes')
  console.log('    npm test          # comprueba que todo renderiza')
  console.log('    npm run catalog   # revisa el resultado en catalog.html\n')
}

process.exit(bloqueados > 0 ? 1 : 0)
