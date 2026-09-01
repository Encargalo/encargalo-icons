/**
 * Convierte a CommonJS los módulos ESM que genera este repo.
 *
 * No es un transpilador general: sólo entiende las formas concretas de import y
 * export que usamos aquí. Es a propósito — ante cualquier sintaxis que no
 * reconozca, **lanza un error** en vez de emitir algo silenciosamente roto.
 * Así el build falla en el momento, no el consumidor tres semanas después.
 *
 * El motivo de publicar también CJS: Jest, en modo CommonJS, hace `require()` de
 * las dependencias y no transpila `node_modules` por defecto. Con sólo ESM, cada
 * proyecto que instale el paquete tendría que tocar su `transformIgnorePatterns`.
 */

const INTEROP =
  'function _interop(m) { return m && m.__esModule ? m.default : m }\n'

export function toCjs(source) {
  const exported = new Set()
  let needsInterop = false
  let out = source

  // import Def, { a, b as c } from 'mod'   ·   import { a } from 'mod'   ·   import Def from 'mod'
  out = out.replace(
    /^import\s+(?:(\w+)\s*,\s*)?(?:\{([^}]*)\}\s+)?(?:(\w+)\s+)?from\s+'([^']+)'\s*$/gm,
    (match, defaultA, named, defaultB, moduleId) => {
      const defaultName = defaultA ?? defaultB
      if (!defaultName && !named) throw new Error(`import no reconocido: ${match}`)

      const lines = []
      const local = `_${moduleId.replace(/[^a-zA-Z0-9]/g, '_')}`
      lines.push(`const ${local} = require('${moduleId}')`)
      if (defaultName) {
        needsInterop = true
        lines.push(`const ${defaultName} = _interop(${local})`)
      }
      if (named && named.trim()) {
        const bindings = named.split(',').map((part) => {
          const [from, to] = part.split(/\s+as\s+/).map((s) => s.trim())
          return to ? `${from}: ${to}` : from
        }).filter(Boolean)
        lines.push(`const { ${bindings.join(', ')} } = ${local}`)
      }
      return lines.join('\n')
    },
  )

  // export { A as B, C } from './mod.js'
  out = out.replace(
    /^export\s+\{([^}]*)\}\s+from\s+'([^']+)'\s*$/gm,
    (match, names, moduleId) => {
      const local = `_${moduleId.replace(/[^a-zA-Z0-9]/g, '_')}`
      const assignments = names.split(',').map((part) => {
        const [from, to] = part.split(/\s+as\s+/).map((s) => s.trim())
        if (!from) return null
        exported.add(to ?? from)
        return `exports.${to ?? from} = ${local}.${from}`
      }).filter(Boolean)
      return [`const ${local} = require('${moduleId}')`, ...assignments].join('\n')
    },
  )

  // export { A as B }
  out = out.replace(/^export\s+\{([^}]*)\}\s*$/gm, (match, names) => {
    return names.split(',').map((part) => {
      const [from, to] = part.split(/\s+as\s+/).map((s) => s.trim())
      if (!from) return null
      exported.add(to ?? from)
      return `exports.${to ?? from} = ${from}`
    }).filter(Boolean).join('\n')
  })

  // export const X = …   ·   export function X(…)
  out = out.replace(/^export\s+(const|function)\s+(\w+)/gm, (match, kind, name) => {
    exported.add(name)
    return `${kind} ${name}`
  })

  const leftover = out.match(/^\s*(import|export)\s/m)
  if (leftover) {
    const line = out.split('\n').find((l) => /^\s*(import|export)\s/.test(l))
    throw new Error(`sintaxis ESM que to-cjs.mjs no reconoce: ${line.trim()}`)
  }

  const tail = [...exported]
    .filter((name) => new RegExp(`^(const|function)\\s+${name}\\b`, 'm').test(out))
    .map((name) => `exports.${name} = ${name}`)

  return (needsInterop ? INTEROP : '') + out + (tail.length ? '\n' + tail.join('\n') + '\n' : '')
}
