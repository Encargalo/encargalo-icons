// Valores por defecto del set. Se pueden sobreescribir por icono con props.
export const DEFAULTS = {
  size: 24,
  color: 'currentColor',
  variant: 'outline',
}

/** Elementos SVG que produce el generador. */
export const SHAPE_TAGS = ['path', 'circle', 'rect', 'ellipse', 'line', 'polygon', 'polyline']

/**
 * Resuelve el grosor de trazo final.
 *
 * - Sin `strokeWidth`, el icono conserva el que trae de IconSax (1.5).
 * - Con `absoluteStrokeWidth`, el trazo se compensa para que se vea igual de
 *   fino a cualquier tamaño (útil en iconos grandes de estados vacíos).
 */
export function resolveStrokeWidth(base, strokeWidth, absolute, size, viewBox) {
  const width = strokeWidth ?? (base != null ? Number(base) : undefined)
  if (width == null || Number.isNaN(width)) return undefined
  if (!absolute) return width
  const canvas = Number(String(viewBox).split(/\s+/)[2]) || 24
  return (width * canvas) / size
}

/** Aplica el grosor resuelto a los atributos que ya venían con trazo. */
export function withStroke(attrs, width) {
  if (width == null || attrs.strokeWidth == null) return attrs
  return { ...attrs, strokeWidth: width }
}
