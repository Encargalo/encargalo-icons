// Archivo generado por scripts/build.mjs. No editar a mano.
import type { ReactElement, ReactNode } from 'react'
import type { IconComponent, IconProps } from '../core/types'

export type IconName =
  | "account"
  | "add"
  | "alert-circle"
  | "arrow-left"
  | "arrow-right"
  | "arrow-transfer"
  | "bag"
  | "bag-timer"
  | "call"
  | "car"
  | "card"
  | "card-tick"
  | "chevron-down"
  | "chevron-left"
  | "chevron-right"
  | "clock"
  | "close-circle"
  | "coffee"
  | "coin"
  | "copy"
  | "danger"
  | "document-like"
  | "document-upload"
  | "empty-wallet"
  | "error"
  | "eye"
  | "eye-line"
  | "eye-slash"
  | "flash"
  | "gallery-add"
  | "helmet"
  | "home"
  | "info-circle"
  | "location"
  | "location-slash"
  | "map"
  | "messages"
  | "minus"
  | "mobile"
  | "money-recive"
  | "money-send"
  | "moneys"
  | "motorbiker"
  | "paperclip"
  | "personal-card"
  | "printer"
  | "receipt"
  | "scan-barcode"
  | "search"
  | "setting"
  | "shiel-verified"
  | "shop"
  | "shopping-bag-plain"
  | "shopping-cart"
  | "shuffle"
  | "star"
  | "store"
  | "succes"
  | "tick-circle"
  | "ticket"
  | "trash"
  | "user"
  | "user-card"
  | "user-remove"
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
