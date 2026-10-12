---
name: add-icons
description: Flujo para añadir o actualizar iconos en encargalo-icons (importar SVG desde la bandeja, build, tests, changelog y commit). Úsala siempre que el usuario diga "añadir icono(s)", "nuevos iconos", "actualizar icono" o deje SVG en la carpeta de iconos nuevos.
---

# Añadir iconos a encargalo-icons

Referencia completa del proceso: `ACTUALIZAR.md`. Esta skill es el flujo operativo.

## 0. Ruta de la bandeja (se pide una sola vez)

La ruta donde el usuario deja los SVG exportados vive en `.iconsrc.json`
(clave `inbox`, ignorado por git, una por persona).

1. Si `.iconsrc.json` **existe** con `inbox` → úsala, no preguntes nada.
2. Si **no existe** y el usuario no te ha dado la ruta en el mensaje → pídesela
   (una sola vez) y guárdala:
   ```json
   { "inbox": "/ruta/que/te-dio" }
   ```
   Si te la dio en el mensaje, guárdala sin volver a preguntar.
3. Nunca la metas en el repo versionado (`.iconsrc.example.json` es sólo plantilla).

La bandeja debe tener `Outline/` y/o `Solid/` con los `.svg`.

**Revisa SIEMPRE las dos carpetas** (`Outline/` y `Solid/`), aunque el usuario
sólo mencione una o diga un número de iconos: lístalas con `ls` y comprueba que
todo lo que hay en ambas aparece en el dry-run. Si falta alguno, investiga por qué
antes de seguir. Al final, vuelve a ejecutar el dry-run: debe salir sin pendientes.

## 1. Previsualizar

```bash
npm run icons:import -- --dry-run
```

La primera línea dice qué carpeta usa. Revisa y resume al usuario qué es nuevo,
qué cambia (contenido distinto con mismo nombre) y qué se ignora o descarta.

- Nombre ya existente con contenido distinto → el importador se detiene. Es una
  **actualización de trazado**: confirma con el usuario si no lo dijo y repite con
  `--force`.
- Si dice que no encuentra `Outline/` ni `Solid/`, la ruta es incorrecta: corrige
  `.iconsrc.json`.

## 2. Importar, generar y probar

```bash
npm run icons:import     # (con --force sólo si se confirmó la actualización)
npm run build            # genera src/data, src/native, src/web, cjs y metadata.json
npm test
```

No edites a mano nada bajo `src/data`, `src/native`, `src/web` ni `cjs`: es generado.
Si algo falla, díselo al usuario con la salida; no lo ocultes.

## 3. Alias y etiquetas (opcional)

Para cada icono **nuevo**, propón `tags` en español (y alias lucide si hay un
equivalente claro) en `icons.config.json` siguiendo el formato de las entradas
existentes. Si añades entradas, vuelve a ejecutar `npm run build`.

## 4. CHANGELOG

Añade a `## [Sin publicar]` de `CHANGELOG.md`, en el mismo estilo que las líneas
existentes:

- Iconos nuevos → `### Añadido`, indicando variante: «1 icono nuevo (`outline`): `nombre`».
- Trazados actualizados → `### Cambiado`: «`nombre` (`outline`): trazado actualizado».

## 5. Commit

Mensajes en español, estilo del historial: `Añadir icono shuffle (outline)`,
`Añadir document-upload y actualizar card y receipt`. Incluye todo lo generado
(`git add -A`; `.iconsrc.json`, `catalog.html` y `public/` ya están ignorados).
Termina con la línea `Co-Authored-By` que indique el contexto.

## 6. Push y publicar en npm

El usuario pidió que al terminar se publiquen los iconos, así que no hace falta
volver a preguntar (salvo `major`):

1. `git push`
2. Elige el `bump`: iconos nuevos → `minor`; sólo trazados corregidos → `patch`;
   renombrar o quitar un icono → `major` (**confirma antes**).
3. `gh workflow run publish.yml -f bump=<tipo>`
4. Sigue la ejecución (`gh run watch`) hasta que termine. Si falla, enséñale el
   error al usuario; no reintentes a ciegas.
5. El workflow sube la versión y empuja un commit + tag: haz `git pull` al acabar.

Si el build o los tests fallaron en el paso 2, **no publiques**.

## 7. Cierre

Resume al usuario: iconos añadidos/actualizados por variante, tags/alias
propuestos, estado de build y tests, el commit, la versión publicada en npm y que Vercel
redespliega el catálogo solo al hacer push a `main`.
