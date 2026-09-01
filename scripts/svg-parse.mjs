/**
 * Parser mínimo de SVG orientado a iconos.
 *
 * No pretende ser un parser XML completo: los SVG de entrada son exports de
 * Figma/IconSax/Inkscape, con una estructura muy acotada (svg > g? > path|circle|…).
 * A cambio no arrastra ninguna dependencia.
 *
 * Qué hace:
 *  - Descarta ruido: declaración XML, comentarios, <defs>, <clipPath>, <metadata>,
 *    <title>, <desc> y los nodos propios de Inkscape (sodipodi:*, inkscape:*).
 *  - Resuelve la herencia de atributos de pintura desde <svg> y <g> hacia cada figura.
 *  - Convierte `style="fill:#000;stroke:none"` en atributos sueltos.
 *  - Mapea cualquier color concreto a `currentColor`, conservando `none`.
 */

const DRAWABLE = new Set([
  'path', 'circle', 'rect', 'ellipse', 'line', 'polygon', 'polyline',
])

/** Atributos de presentación que heredan de padre a hijo. */
const INHERITED = new Set([
  'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin',
  'stroke-miterlimit', 'stroke-dasharray', 'stroke-dashoffset',
  'fill-rule', 'clip-rule', 'opacity', 'fill-opacity', 'stroke-opacity',
])

/** Atributos que no aportan nada una vez el icono es un componente. */
const DROPPED = new Set([
  'id', 'class', 'clip-path', 'mask', 'filter', 'style',
  'xmlns', 'xmlns:xlink', 'version', 'xml:space', 'data-name',
])

const stripComments = (s) =>
  s.replace(/<\?xml[\s\S]*?\?>/g, '')
   .replace(/<!--[\s\S]*?-->/g, '')
   .replace(/<!DOCTYPE[\s\S]*?>/gi, '')

const stripBlocks = (s) =>
  ['defs', 'clipPath', 'mask', 'metadata', 'title', 'desc', 'style', 'sodipodi:namedview']
    .reduce(
      (acc, tag) =>
        acc
          .replace(new RegExp(`<${tag}\\b[\\s\\S]*?</${tag}>`, 'gi'), '')
          .replace(new RegExp(`<${tag}\\b[^>]*/>`, 'gi'), ''),
      s,
    )

/** Extrae los atributos de una etiqueta de apertura, tolerando saltos de línea. */
function parseAttrs(tagSource) {
  const attrs = {}
  for (const m of tagSource.matchAll(/([\w:-]+)\s*=\s*"([^"]*)"/g)) {
    attrs[m[1]] = m[2].trim()
  }
  // `style` gana sobre el atributo suelto equivalente, igual que en el navegador.
  if (attrs.style) {
    for (const decl of attrs.style.split(';')) {
      const i = decl.indexOf(':')
      if (i === -1) continue
      const prop = decl.slice(0, i).trim()
      const value = decl.slice(i + 1).trim()
      if (prop) attrs[prop] = value
    }
  }
  return attrs
}

/** Un color concreto pasa a `currentColor`; `none` y las referencias se conservan. */
function normalizePaint(value) {
  if (!value) return value
  const v = value.trim()
  if (v === 'none' || v === 'currentColor' || v === 'transparent') return v
  if (v.startsWith('url(')) return v
  return 'currentColor'
}

/** Redondea los números del path para recortar decimales inútiles (11.99999 → 12). */
function roundNumbers(d, precision) {
  if (precision == null) return d
  return d.replace(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi, (n) => {
    const num = Number(n)
    if (!Number.isFinite(num)) return n
    return String(Number(num.toFixed(precision)))
  })
}

/**
 * @param {string} source contenido del .svg
 * @param {{ name?: string, precision?: number|null, onWarn?: (msg: string) => void }} [options]
 */
export function parseSvg(source, options = {}) {
  const { name = 'icon', precision = 2, onWarn = () => {} } = options

  const clean = stripBlocks(stripComments(source))

  const rootMatch = clean.match(/<svg\b([\s\S]*?)>/i)
  if (!rootMatch) throw new Error(`${name}: no se encontró la etiqueta <svg>`)
  const rootAttrs = parseAttrs(rootMatch[0])

  const viewBox =
    rootAttrs.viewBox ||
    `0 0 ${rootAttrs.width || 24} ${rootAttrs.height || 24}`

  // Pila de herencia. El nivel 0 son los atributos del propio <svg>.
  const stack = [pickInherited(rootAttrs)]
  const nodes = []

  const tagRe = /<\/?([\w:-]+)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>/g
  let m
  while ((m = tagRe.exec(clean)) !== null) {
    const [full, tag, , selfClosing] = m
    const isClosing = full.startsWith('</')
    const local = tag.includes(':') ? tag.split(':').pop() : tag

    if (local === 'svg') continue

    if (local === 'g') {
      if (isClosing) stack.pop()
      else if (!selfClosing) stack.push({ ...top(stack), ...pickInherited(parseAttrs(full)) })
      continue
    }

    if (isClosing || !DRAWABLE.has(local)) continue

    const own = parseAttrs(full)
    const inherited = top(stack)
    const merged = { ...inherited, ...own }

    // Pintura efectiva. El valor inicial de `fill` en SVG es negro; el de `stroke`, none.
    let fill = normalizePaint(merged.fill ?? 'black')
    let stroke = normalizePaint(merged.stroke ?? 'none')

    if (fill === 'none' && stroke === 'none') {
      onWarn(`${name}: <${local}> sin relleno ni trazo; se asume fill="currentColor"`)
      fill = 'currentColor'
    }

    const attrs = { fill, stroke }
    for (const [key, value] of Object.entries(merged)) {
      if (DROPPED.has(key) || key.includes(':')) continue
      if (key === 'fill' || key === 'stroke') continue
      if (key === 'width' || key === 'height') {
        if (local !== 'rect') continue // width/height sólo tienen sentido en <rect>
      }
      if (value === '' || value == null) continue
      attrs[key] = key === 'd' ? roundNumbers(value, precision) : value
    }

    // Un trazo sin grosor explícito usa el de por defecto de SVG (1); lo hacemos visible
    // para que el generador pueda decidir si lo eleva al <Svg> raíz.
    if (stroke !== 'none' && attrs['stroke-width'] == null) attrs['stroke-width'] = '1'
    if (stroke === 'none') {
      for (const key of Object.keys(attrs)) {
        if (key.startsWith('stroke-')) delete attrs[key]
      }
    }

    nodes.push({ tag: local, attrs })
  }

  if (nodes.length === 0) throw new Error(`${name}: no se encontró ninguna figura dibujable`)

  return { viewBox, nodes }
}

function top(stack) {
  return stack[stack.length - 1]
}

function pickInherited(attrs) {
  const out = {}
  for (const key of INHERITED) {
    if (attrs[key] != null) out[key] = attrs[key]
  }
  return out
}
