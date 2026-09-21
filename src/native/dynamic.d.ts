// Archivo generado por scripts/build.mjs. No editar a mano.
import type { ReactElement, ReactNode } from 'react'
import type { IconComponent, IconProps } from '../core/types'

export type IconName =
  | "account"
  | "add"
  | "alert-circle"
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
  | "clock"
  | "close-circle"
  | "copy"
  | "danger"
  | "document-like"
  | "error"
  | "eye"
  | "eye-line"
  | "eye-slash"
  | "gallery-add"
  | "helmet"
  | "home"
  | "info-circle"
  | "location"
  | "mobile"
  | "moneys"
  | "motorbiker"
  | "paperclip"
  | "personal-card"
  | "receipt"
  | "scan-barcode"
  | "search"
  | "shiel-verified"
  | "shop"
  | "shopping-bag-plain"
  | "star"
  | "store"
  | "succes"
  | "tick-circle"
  | "ticket"
  | "user"
  | "user-card"
  | "user-square"
  | "warning"

export declare const iconRegistry: Record<IconName, IconComponent>
export declare const iconNames: readonly IconName[]

export interface DynamicIconProps extends IconProps {
  name: IconName | (string & {})
  /** Qué renderizar si el nombre no existe en el set. Por defecto, nada. */
  fallback?: ReactNode
}

export declare function Icon(props: DynamicIconProps): ReactElement | null
