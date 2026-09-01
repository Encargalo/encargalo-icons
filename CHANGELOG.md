# Changelog

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/)
y el versionado es [SemVer](https://semver.org/lang/es/).

## [0.1.0] - 2026-09-01

### Añadido

- 28 iconos derivados de IconSax: 22 con variante `outline`, 13 con `solid`,
  7 con ambas.
- Renderer nativo sobre `react-native-svg` y renderer web sobre SVG del DOM,
  seleccionados por la condición `react-native` de `exports`.
- Props `size`, `color`, `variant`, `strokeWidth`, `absoluteStrokeWidth` y
  `accessibilityLabel`.
- Alias para migrar desde `lucide-react-native` sin renombrar en cada pantalla
  (`CheckCircle`, `EyeOff`, `Phone`, `CreditCard`, …).
- Entrada `encargalo-icons/dynamic` con `<Icon name="…" />`, `iconRegistry` e
  `iconNames` para casos en que el nombre viene de datos.
- `metadata.json` con nombres, alias, etiquetas y SVG normalizados, para
  alimentar el catálogo.
