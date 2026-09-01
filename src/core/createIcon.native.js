// Renderer nativo: react-native-svg. Metro resuelve este archivo en iOS/Android
// (extensión .native.js) y deja createIcon.js para web.
import { createElement, forwardRef, memo } from 'react'
import Svg, { Circle, Ellipse, Line, Path, Polygon, Polyline, Rect } from 'react-native-svg'
import { DEFAULTS, resolveStrokeWidth, withStroke } from './defaults.js'

const ELEMENTS = {
  path: Path,
  circle: Circle,
  rect: Rect,
  ellipse: Ellipse,
  line: Line,
  polygon: Polygon,
  polyline: Polyline,
}

export function createIcon(displayName, variants) {
  const fallbackVariant = variants[DEFAULTS.variant] ? DEFAULTS.variant : Object.keys(variants)[0]

  const Icon = forwardRef(function Icon(props, ref) {
    const {
      size = DEFAULTS.size,
      color = DEFAULTS.color,
      strokeWidth,
      absoluteStrokeWidth = false,
      variant,
      accessibilityLabel,
      ...rest
    } = props

    const shape = variants[variant] ?? variants[fallbackVariant]
    const width = resolveStrokeWidth(
      shape.root.strokeWidth, strokeWidth, absoluteStrokeWidth, size, shape.viewBox,
    )

    // Sin etiqueta, el icono es decorativo: se oculta del lector de pantalla para
    // que no se lea el texto del botón dos veces.
    const a11y = accessibilityLabel
      ? { accessible: true, accessibilityRole: 'image', accessibilityLabel }
      : { accessible: false, importantForAccessibility: 'no-hide-descendants' }

    return createElement(
      Svg,
      {
        ref,
        width: size,
        height: size,
        viewBox: shape.viewBox,
        color,
        ...withStroke(shape.root, width),
        ...a11y,
        ...rest,
      },
      shape.nodes.map(([tag, attrs], i) =>
        createElement(ELEMENTS[tag], { key: i, ...withStroke(attrs, width) }),
      ),
    )
  })

  Icon.displayName = displayName
  return memo(Icon)
}
