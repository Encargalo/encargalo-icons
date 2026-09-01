// Archivo generado por scripts/build.mjs. No editar a mano.
import type { ReactElement, ReactNode } from 'react'
import type { IconComponent, IconProps } from '../core/types'

export type IconName =
  | "arrow-left"
  | "arrow-right"
  | "bag"
  | "bag-timer"
  | "call"
  | "car"
  | "card"
  | "chevron-down"
  | "chevron-left"
  | "chevron-right"
  | "close-circle"
  | "danger"
  | "document-like"
  | "eye"
  | "eye-slash"
  | "helmet"
  | "home"
  | "info-circle"
  | "paperclip"
  | "personal-card"
  | "receipt"
  | "search"
  | "shield-tick"
  | "shop"
  | "star"
  | "tick-circle"
  | "user"
  | "user-square"

export declare const iconRegistry: Record<IconName, IconComponent>
export declare const iconNames: readonly IconName[]

export interface DynamicIconProps extends IconProps {
  name: IconName | (string & {})
  /** Qué renderizar si el nombre no existe en el set. Por defecto, nada. */
  fallback?: ReactNode
}

export declare function Icon(props: DynamicIconProps): ReactElement | null
