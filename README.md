# encargalo-icons

Iconos de Encargalo, derivados de [IconSax](https://iconsax.io), empaquetados
como componentes de React. El mismo import funciona en la app de Expo y en las
webs; el paquete elige el renderer según la plataforma.

```bash
npm install encargalo-icons
```

En React Native hace falta además `react-native-svg` (ya está en la app móvil):

```bash
npx expo install react-native-svg
```

## Uso

```tsx
import { Home, Receipt, Shop, User } from 'encargalo-icons'

<Home />                                  // 24 px, variante outline
<Home size={32} color="#FF5A1F" />
<Shop variant="solid" />                  // tab activo
<Search strokeWidth={2} />
```

### Props

| Prop | Tipo | Por defecto | Qué hace |
| --- | --- | --- | --- |
| `size` | `number` | `24` | Ancho y alto en px. |
| `color` | `string` | hereda | Color del icono. Alimenta los `currentColor` internos. |
| `variant` | `'outline' \| 'solid'` | `'outline'` | Si el icono no tiene esa variante, usa la que exista. |
| `strokeWidth` | `number` | el del icono (1.5) | Sólo afecta a los iconos dibujados con trazo. |
| `absoluteStrokeWidth` | `boolean` | `false` | Compensa el trazo al escalar, para que se vea igual de fino a cualquier `size`. |
| `accessibilityLabel` | `string` | — | Sin ella el icono es decorativo y queda fuera del lector de pantalla. |

El resto de props va tal cual al `<Svg>` (nativo) o `<svg>` (web): `style`,
`testID`, `className`, `opacity`, `transform`…

### Color

`color` se aplica al SVG raíz y los trazados usan `currentColor`, así que también
se puede pintar desde fuera:

```tsx
// NativeWind / Tailwind
<Home className="text-brand-500" />

// Estilo del contenedor, en web
<div style={{ color: 'var(--brand)' }}><Home /></div>
```

### Tab bar (outline / solid)

```tsx
import { Home, Receipt, Shop, User } from 'encargalo-icons'

const TABS = [
  { name: 'index',   label: 'Inicio',  Icon: Home },
  { name: 'shops',   label: 'Tiendas', Icon: Shop },
  { name: 'orders',  label: 'Pedidos', Icon: Receipt },
  { name: 'profile', label: 'Perfil',  Icon: User },
]

{TABS.map(({ name, label, Icon }) => (
  <Tabs.Screen
    key={name}
    name={name}
    options={{
      title: label,
      tabBarIcon: ({ focused, color, size }) => (
        <Icon variant={focused ? 'solid' : 'outline'} color={color} size={size} />
      ),
    }}
  />
))}
```

### Iconos por nombre

Cuando el nombre viene de datos (configuración de tabs, respuesta de la API):

```tsx
import { Icon, iconNames } from 'encargalo-icons/dynamic'

<Icon name="bag-timer" variant="solid" size={20} />
```

> Esta entrada arrastra **todos** los iconos al bundle. Para todo lo demás,
> importa el icono directamente.

### Alias

Cada icono exporta también el nombre equivalente en lucide, para migrar sin
renombrar en cada pantalla: `CheckCircle` → `TickCircle`, `EyeOff` → `EyeSlash`,
`Phone` → `Call`, `CreditCard` → `Card`, `XCircle` → `CloseCircle`,
`AlertTriangle` → `Danger`, `ShoppingBag` → `Bag`, `Info` → `InfoCircle`,
`ShieldCheck` → `ShieldTick`, `IdCard` → `PersonalCard`.

## Añadir o cambiar iconos

1. Exporta el SVG a 24×24 desde Figma y déjalo en
   `src/svg/outline/` o `src/svg/solid/`, con el nombre en kebab-case
   (`bag-timer.svg`). Ese nombre es el que manda: el componente será `BagTimer`.
2. Opcional: añade alias y etiquetas de búsqueda en `icons.config.json`.
3. `npm run build` regenera `src/data`, `src/native`, `src/web` y `metadata.json`.
4. `npm test` comprueba que todo sigue renderizando.
5. `npm run catalog` genera `catalog.html` para revisarlos de un vistazo.

Todo lo que hay bajo `src/data`, `src/native` y `src/web` es generado: no se
edita a mano. Lo único que se toca son los SVG y `icons.config.json`.

El generador resuelve la herencia de `fill`/`stroke`, quita `clipPath` y `defs`,
convierte los colores fijos a `currentColor`, sube al `<svg>` los atributos que
comparten todos los trazados y redondea las coordenadas a dos decimales
(desviación máxima medida: 0,005 px sobre un lienzo de 24).

## Publicar una versión

```bash
npm version patch      # o minor / major
git push --follow-tags
```

El workflow de `.github/workflows/publish.yml` publica en npm al recibir el tag.
Para publicar a mano:

```bash
npm login
npm publish            # prepublishOnly regenera y pasa los tests antes
```

Actualizar en los proyectos que lo consumen:

```bash
npm update encargalo-icons        # dentro del rango ^ del package.json
npm install encargalo-icons@latest
```

## Notas por proyecto

**Expo / Jest.** El paquete se publica como ESM. Para que Jest lo transpile,
añade `encargalo-icons` a `transformIgnorePatterns` en `package.json`:

```jsonc
"transformIgnorePatterns": [
  "node_modules/(?!(...|encargalo-icons))"
]
```

**Next.js.** Si se usa desde el servidor sin bundling, añádelo a
`transpilePackages` en `next.config.js`.

## Peso

Los 28 iconos ocupan ~33 KB de datos de trazado. Cada icono importado suma entre
0,3 y 3 KB al bundle; sólo `encargalo-icons/dynamic` los incluye todos.
