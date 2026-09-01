// Renderer web: SVG del DOM, sin dependencias. Lo usan el dashboard, owners y la
// landing; en React Native nunca se carga (Metro prefiere createIcon.native.js).
import { createElement, forwardRef, memo } from 'react'
import { DEFAULTS, resolveStrokeWidth, withStroke } from './defaults.js'

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

    const a11y = accessibilityLabel
      ? { role: 'img', 'aria-label': accessibilityLabel }
      : { 'aria-hidden': true, focusable: false }

    return createElement(
      'svg',
      {
        ref,
        xmlns: 'http://www.w3.org/2000/svg',
        width: size,
        height: size,
        viewBox: shape.viewBox,
        // `color` alimenta los currentColor de los paths y deja que CSS lo herede.
        ...(color === 'currentColor' ? null : { color }),
        ...withStroke(shape.root, width),
        ...a11y,
        ...rest,
      },
      shape.nodes.map(([tag, attrs], i) =>
        createElement(tag, { key: i, ...withStroke(attrs, width) }),
      ),
    )
  })

  Icon.displayName = displayName
  return memo(Icon)
}
