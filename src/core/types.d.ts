import type { ComponentType, Ref } from 'react'

export type IconVariant = 'outline' | 'solid'

export interface IconProps {
  /** Alto y ancho en px. Por defecto 24. */
  size?: number
  /** Color del icono. Alimenta los `currentColor` internos. */
  color?: string
  /** Sobreescribe el grosor de trazo del icono (los de IconSax vienen a 1.5). */
  strokeWidth?: number
  /** Compensa el trazo al escalar, para que se vea igual de fino a cualquier `size`. */
  absoluteStrokeWidth?: boolean
  /** `outline` (por defecto) o `solid`. Si el icono no tiene esa variante, usa la que exista. */
  variant?: IconVariant
  /**
   * Etiqueta para lectores de pantalla. Si se omite, el icono se marca como
   * decorativo y queda fuera del árbol de accesibilidad.
   */
  accessibilityLabel?: string

  style?: unknown
  testID?: string
  opacity?: number | string
  transform?: string
  className?: string
  onPress?: () => void
  ref?: Ref<unknown>

  /** Resto de props del `<Svg>` / `<svg>` subyacente. */
  [key: string]: unknown
}

export type IconComponent = ComponentType<IconProps>

/** Geometría de una variante, tal y como la emite scripts/build.mjs. */
export interface IconShape {
  viewBox: string
  root: Record<string, string>
  nodes: Array<[string, Record<string, string>]>
}

export declare function createIcon(
  displayName: string,
  variants: Partial<Record<IconVariant, IconShape>>,
): IconComponent
