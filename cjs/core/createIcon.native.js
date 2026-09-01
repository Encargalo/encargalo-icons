function _interop(m) { return m && m.__esModule ? m.default : m }
// Renderer nativo: react-native-svg. Metro resuelve este archivo en iOS/Android
// (extensión .native.js) y deja createIcon.js para web.
const _react = require('react')
const { createElement, forwardRef, memo } = _react
const _react_native_svg = require('react-native-svg')
const Svg = _interop(_react_native_svg)
const { Circle, Ellipse, Line, Path, Polygon, Polyline, Rect } = _react_native_svg
const ___defaults_js = require('./defaults.js')
const { DEFAULTS, resolveStrokeWidth, withStroke } = ___defaults_js
const ELEMENTS = {
  path: Path,
  circle: Circle,
  rect: Rect,
  ellipse: Ellipse,
  line: Line,
  polygon: Polygon,
  polyline: Polyline,
}

function createIcon(displayName, variants) {
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

exports.createIcon = createIcon
