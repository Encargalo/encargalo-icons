# Cómo actualizar el paquete

Guía completa para añadir iconos y publicar una versión nueva, desde cero y en
cualquier máquina. Si sólo vas a consumir el paquete, lo tuyo es el
[README](./README.md).

- [Preparar una máquina nueva](#preparar-una-máquina-nueva)
- [1. Añadir iconos](#1-añadir-iconos)
- [2. Regenerar y revisar](#2-regenerar-y-revisar)
- [3. Subir a GitHub](#3-subir-a-github)
- [4. Publicar en npm](#4-publicar-en-npm)
- [5. Actualizar el catálogo](#5-actualizar-el-catálogo)
- [6. Actualizar las apps](#6-actualizar-las-apps)
- [Problemas frecuentes](#problemas-frecuentes)

---

## Preparar una máquina nueva

Hace falta **Node 20 o superior** y git. Nada más: el paquete no usa bundler ni
transpilador.

```bash
git clone git@github.com:Encargalo/encargalo-icons.git
cd encargalo-icons
npm install
```

Después hay que decirle al importador **dónde dejas los SVG exportados**. Esa
ruta cambia por persona y por equipo, así que no está en el repo:

```bash
cp .iconsrc.example.json .iconsrc.json
```

Y edita `.iconsrc.json` con tu ruta:

```json
{ "inbox": "/home/tu-usuario/Imágenes/Icons/IconSax/New icons" }
```

`.iconsrc.json` está en `.gitignore` a propósito: cada quien tiene la suya y
nadie pisa la del otro.

> Alternativas si prefieres no crear el archivo: la variable de entorno
> `ICONS_INBOX`, o pasar `--from "/ruta"` en cada ejecución.

Dentro de esa carpeta se esperan dos subcarpetas, tal como las exporta IconSax:

```
New icons/
├── Outline/     ← los .svg de la variante outline
└── Solid/       ← los .svg de la variante solid
```

Comprueba que la configuración es correcta sin tocar nada:

```bash
npm run icons:import -- --dry-run
```

---

## 1. Añadir iconos

**Exporta desde Figma a 24×24**, en SVG. El nombre del archivo da igual: el
importador limpia el prefijo `iconsax-` y el sufijo de hash, así que
`iconsax-bag-timer-da8091a57397-.svg` se convierte solo en `bag-timer`.

Deja los archivos en `Outline/` o `Solid/` según su variante, y ejecuta:

```bash
npm run icons:import -- --dry-run   # primero mira qué va a hacer
npm run icons:import                # y luego hazlo
```

El importador copia a `src/svg/` y por el camino:

- **valida** cada SVG intentando convertirlo; si uno no dibuja nada, lo descarta
  y te lo dice, en vez de dejar que reviente más adelante;
- **ignora** los que ya estén en el repo con contenido idéntico;
- **se detiene** ante un nombre que ya existe con contenido distinto. Si de
  verdad quieres reemplazarlo, repite con `--force`;
- **avisa** si dos archivos distintos acabarían con el mismo nombre.

Sale con código 1 si algo quedó sin resolver, para que un script o CI se entere.

Los originales **siguen en tu carpeta**: el importador copia, nunca mueve ni
borra.

### Alias y etiquetas (opcional)

Si el icono tiene un equivalente en lucide, añádele el alias en
`icons.config.json` para poder migrar sin renombrar en cada pantalla. Las
etiquetas alimentan el buscador del catálogo:

```jsonc
"bag-timer": {
  "aliases": ["OrderPending"],
  "tags": ["pedido", "pendiente", "en curso", "tiempo"]
}
```

---

## 2. Regenerar y revisar

```bash
npm run build     # SVG → src/data, src/native, src/web y metadata.json
npm test          # renderiza todos los iconos en los dos renderers
npm run catalog   # genera catalog.html para mirarlos
```

Abre `catalog.html` en el navegador y comprueba que los nuevos se ven bien, en
las dos variantes y a varios tamaños.

Todo lo que hay bajo `src/data`, `src/native` y `src/web` **es generado**. No lo
edites a mano: el siguiente `npm run build` lo sobreescribe. Lo único que se
toca es `src/svg/` e `icons.config.json`.

---

## 3. Subir a GitHub

```bash
git add -A
git commit -m "Añadir iconos: bag-timer, wallet"
git push
```

El workflow de CI (`.github/workflows/ci.yml`) comprueba en cada push que lo
generado está al día. Si se te olvidó el `npm run build`, **el CI falla** con un
diff — vuelve a ejecutarlo y súbelo.

---

## 4. Publicar en npm

Se publica desde GitHub Actions con **Trusted Publishing** (OIDC): no hay ningún
token que caduque o se pueda filtrar. npm confía en el workflow
`.github/workflows/publish.yml` del repo `Encargalo/encargalo-icons`.

### Con el botón (lo habitual)

Tras hacer commit y push de los iconos a `main`:

- En GitHub: **Actions → Publicar en npm → Run workflow**, y elige el tipo de
  versión.
- O desde la terminal:

```bash
git push
gh workflow run publish.yml -f bump=minor   # o patch / major
```

| Cambio | `bump` |
| --- | --- |
| Iconos nuevos, nada roto | `minor` |
| Corregir el trazado de un icono existente | `patch` |
| Renombrar o quitar un icono | `major` |
| Publicar la versión que ya está en `package.json` | `ninguno` |

El workflow sube la versión (`npm version`), empuja el commit y el tag,
regenera, pasa los tests y publica.

### Con un tag a mano

También publica al empujar un tag `v*`:

```bash
npm version minor
git push --follow-tags
```

### Publicación manual (último recurso)

```bash
npm login
npm publish
```

La cuenta exige 2FA y no admite tokens que se lo salten, así que hay que
hacerlo desde una terminal interactiva.

### Si hay que reconfigurar el publicador de confianza

En npmjs.com → paquete → *Settings* → *Trusted Publisher* → GitHub Actions:
organización `Encargalo`, repo `encargalo-icons`, workflow `publish.yml`,
sin *environment* y con *Allow npm publish*. Si se renombra el workflow, hay
que actualizarlo también allí.

---

## 5. Actualizar el catálogo

El catálogo se genera desde `metadata.json`, así que se actualiza solo con
`npm run build`. No hay que editar HTML a mano nunca.

**En local:**

```bash
npm run catalog        # → catalog.html
```

`catalog.html` está en `.gitignore`: es un artefacto, se regenera cuando haga
falta.

**En Vercel:** el proyecto está conectado al repo, así que **cada push a `main`
lo redespliega solo**. No hay ningún paso manual.

La configuración de build vive en `vercel.json`, en la raíz del repo:

```json
{
  "buildCommand": "npm run build && npm run catalog:site",
  "outputDirectory": "public"
}
```

`vercel.json` tiene prioridad sobre lo que haya en el panel de Vercel, así que
ese es el único sitio donde tocarlo. La ventaja de tenerlo en el repo: si alguien
reimporta el proyecto o hay que crear uno nuevo, no tiene que acordarse de
configurar nada a mano.

Para reproducir en local exactamente lo que hace Vercel:

```bash
npm run build && npm run catalog:site   # → public/index.html
```

`public/` y `catalog.html` están en `.gitignore`: son artefactos.

---

## 6. Actualizar las apps

En cada proyecto que lo consuma:

```bash
npm update encargalo-icons        # dentro del rango ^ del package.json
npm install encargalo-icons@latest   # para saltar a una versión mayor
```

---

## Problemas frecuentes

**El CI falla con «Hay cambios generados sin commitear».**
Ejecutaste `npm run build` después de commitear, o no lo ejecutaste. Corre
`npm run build`, revisa el diff y súbelo.

**Yarn 4 o pnpm rechazan la versión recién publicada.**

```
YN0016: All versions satisfying "^0.2.0" are quarantined
```

No es un fallo del paquete: ambos ponen en cuarentena lo publicado hace menos de
~7 días, como defensa ante ataques de cadena de suministro. Se resuelve solo al
cumplirse el plazo. Para saltárselo:

```bash
YARN_NPM_MINIMAL_AGE_GATE=0 yarn add encargalo-icons
pnpm add encargalo-icons --config.minimumReleaseAge=0
```

npm, yarn 1 y bun no aplican cuarentena.

**El build falla con «no pude convertir X a CommonJS».**
`scripts/to-cjs.mjs` sólo entiende las formas de import/export que usa este
repo, y protesta ante cualquier otra en vez de emitir algo roto. Si añadiste
sintaxis nueva a `src/core/`, o la ajustas, o amplías el conversor. Los tests
comparan el render de ESM y CommonJS icono a icono, así que una divergencia se
detecta ahí.

**Un icono se ve relleno cuando debería ir con trazo (o al revés).**
Es cosa del export de Figma, no de la conversión. Comprueba en el SVG original
si los `path` llevan `fill` o `stroke`, y vuelve a exportarlo desde la variante
correcta.

**El importador dice que no encuentra Outline/ ni Solid/.**
Está mirando la carpeta equivocada. Comprueba la ruta:

```bash
npm run icons:import -- --dry-run
```

La primera línea de la salida dice qué carpeta está usando y de dónde sacó esa
ruta (`.iconsrc.json`, `ICONS_INBOX` o `--from`).
