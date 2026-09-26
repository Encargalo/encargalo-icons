# encargalo-icons

Los iconos son de [IconSax](https://app.iconsax.io/); **no son diseños propios de
Encargalo**. Este paquete sólo los empaqueta como componentes de React. El mismo
import funciona en la app de Expo y en las webs; el paquete elige el renderer
según la plataforma.

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

**El procedimiento completo está en [ACTUALIZAR.md](./ACTUALIZAR.md)**, incluido
cómo preparar una máquina nueva y cómo publicar. En resumen:

1. Deja los SVG exportados desde Figma en la carpeta que tengas configurada como
   bandeja, dentro de `Outline/` o `Solid/`.
2. `npm run icons:import` los copia a `src/svg/`, normaliza los nombres y
   descarta los inválidos o duplicados.
3. Opcional: añade alias y etiquetas de búsqueda en `icons.config.json`.
4. `npm run build` regenera `src/data`, `src/native`, `src/web` y `metadata.json`.
5. `npm test` comprueba que todo sigue renderizando.
6. `npm run catalog` genera `catalog.html` para revisarlos de un vistazo.

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

## Compatibilidad

El paquete se publica en **ESM y CommonJS a la vez**, así que no hay que
configurar nada en el proyecto que lo instale: ni `transformIgnorePatterns` en
Jest, ni `transpilePackages` en Next. Cada herramienta recibe el formato que
espera:

| Quién | Qué recibe |
| --- | --- |
| Metro / Expo | `src/native/` (ESM) |
| Jest, jest-expo | `cjs/native/` (CommonJS) |
| Vite, webpack, Next | `src/web/` (ESM, con tree-shaking) |
| `require()` a secas | `cjs/web/` (CommonJS) |

Instala y funciona con npm, pnpm, yarn (clásico y Berry con Plug'n'Play) y bun.

## Peso

Los 59 iconos ocupan ~71 KB de datos de trazado. Cada icono importado suma entre
0,3 y 3 KB al bundle; sólo `encargalo-icons/dynamic` los incluye todos.

## Créditos

Todos los iconos provienen de [IconSax](https://app.iconsax.io/) y pertenecen a
sus autores. Encargalo no los ha diseñado: sólo los exporta, los convierte a
componentes y, en algunos casos, los ajusta. La licencia MIT de este repo cubre
el código del paquete; para el uso de los iconos, consulta los términos de
IconSax.
