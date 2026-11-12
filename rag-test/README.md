# rag-test

Lee los PDF de `input/`, extrae su texto con Vast.ai, guarda en ChromaDB un embedding por párrafo y genera un JSON en `output/`.

## Qué hace cada archivo

- **`index.js`** coordina los servicios y escribe un JSON por PDF después de guardarlo en ChromaDB.
- **`services/pdf-service.js`** lista los PDF de `input/` o selecciona el que indiques por nombre.
- **`services/vastai-service.js`** localiza la instancia activa de Vast.ai y devuelve la dirección del OCR.
- **`services/ocr-service.js`** comprueba que el OCR esté listo, envía el PDF y devuelve el texto extraído.
- **`services/parrafos.js`** separa los bloques del OCR y quita sus etiquetas y coordenadas. También admite texto con saltos de línea.
- **`services/palabras-clave.js`** recibe un párrafo y le pide a `gpt-6-luna` que devuelva sus palabras clave.
- **`services/openai-service.js`** crea el cliente que usa Luna y genera los vectores con `text-embedding-3-large`.
- **`services/vector-service.js`** guarda cada vector en `rag-test-parrafos`, junto con el texto original, el nombre del PDF y el número de párrafo.

## Configuración y dependencias

- **`.env`** guarda las claves locales de Vast.ai, del OCR y de OpenAI.
- **`.env.example`** muestra los nombres de las variables para crear un `.env` en otro equipo.
- **`package.json`** declara los paquetes que importan los servicios de OpenAI y ChromaDB.
- **`package-lock.json`** registra las versiones exactas para que `npm ci` pueda reinstalar las mismas dependencias.

## Arranque

### 1. Preparar el proyecto

Desde `rag-test`, instala las dependencias la primera vez.

```powershell
npm ci
```

Pon el PDF en `input/`. Si aún no tienes un `.env`, copia `.env.example` a `.env` y completa `VAST_API_KEY`, `OCR_API_KEY` y `OPENAI_API_KEY`.

### 2. Arrancar ChromaDB desde Antigravity

Abre Docker Desktop y el terminal PowerShell de Antigravity. Si el contenedor `chroma-rag-test` ya existe y está detenido, arráncalo así.

```powershell
docker start chroma-rag-test
```

Si vas a usar ChromaDB por primera vez, crea el contenedor con este comando.

```powershell
docker run -d --name chroma-rag-test -p 127.0.0.1:8000:8000 -v chroma-rag-test-data:/data chromadb/chroma:1.5.3
```

El volumen `chroma-rag-test-data` conserva los datos. Si ChromaDB ya está en marcha en `localhost:8000`, pasa directamente a la comprobación.

En el mismo terminal, comprueba que responde. Deberías ver un valor en `nanosecond heartbeat`.

```powershell
Invoke-RestMethod http://localhost:8000/api/v2/heartbeat
```

### 3. Iniciar la instancia OCR en Vast.ai

Inicia la instancia que tiene el servicio OCR y comprueba que figure como **Running** con el puerto `10001/tcp` publicado. Si hay varias instancias OCR activas, indica el ID en `VAST_INSTANCE_ID` dentro de `.env`.

### 4. Procesar el PDF

Con ChromaDB y Vast.ai en marcha, ejecuta desde `rag-test` el comando con el nombre del PDF.

```powershell
node --env-file=.env index.js "boib.pdf"
```

Para procesar todos los PDF de `input/`, ejecuta `node --env-file=.env index.js`.

## Resultado

Para `input/boib.pdf`, se genera `output/boib.pdf.json` con una entrada por bloque de texto.

- **`id`** identifica el registro en el JSON y en ChromaDB, por ejemplo `boib.pdf:1`.
- **`bloque`** es la posición del bloque procesado dentro del PDF, empezando en 1.
- **`texto`** contiene el texto extraído de ese bloque.
- **`palabrasClave`** contiene las palabras clave de Luna.
- **`embedding`** contiene el vector generado a partir de esas palabras clave.

Si vuelves a procesar un PDF con el mismo nombre, se actualizan sus registros y su JSON.


Consultar desde ChromaDB por terminal

<!-- @'
import { ChromaClient } from 'chromadb';

const cliente = new ChromaClient();
const coleccion = await cliente.getCollection({
  name: 'rag-test-parrafos',
  embeddingFunction: null
});

const resultado = await coleccion.get({
  where: { archivo: 'prueba.pdf' },
  include: ['metadatas', 'embeddings'],
  limit: 10
});

console.table(resultado.metadatas.map((meta, i) => ({
  id: resultado.ids[i],
  archivo: meta.archivo,
  bloque: meta.numero,
  texto: meta.texto,
  palabrasClave: JSON.parse(meta.palabrasClave ?? '[]').join(', '),
  dimensiones: resultado.embeddings[i]?.length
})));
'@ | node --input-type=module - -->
