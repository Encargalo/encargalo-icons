# Changelog

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/)
y el versionado es [SemVer](https://semver.org/lang/es/).

## [0.2.0] - 2026-09-01

### Añadido

- Build en **CommonJS** además del ESM (`cjs/`), generado por el mismo
  `npm run build`. Los tests comprueban que ambos formatos renderizan idéntico.
- `npm run icons:import`: trae los SVG desde una bandeja configurable
  (`.iconsrc.json`, `ICONS_INBOX` o `--from`), normaliza los nombres, valida
  cada archivo y se detiene ante colisiones.
- [ACTUALIZAR.md](./ACTUALIZAR.md) con el procedimiento completo.
- `vercel.json` con la configuración de despliegue del catálogo.

### Corregido

- **Instalar el paquete ya no obliga a tocar la configuración del proyecto.**
  Al publicarse sólo como ESM, Jest no podía hacer `require()` del paquete y
  cada consumidor tenía que añadirlo a `transformIgnorePatterns`. Ahora el campo
  `exports` sirve CommonJS a quien hace `require()` y ESM a quien hace `import`.

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
