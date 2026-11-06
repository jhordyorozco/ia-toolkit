/*
Procesar la carpeta "salida":
node --env-file=.env vastai-ocr-test.mjs

Procesar otra carpeta:
node --env-file=.env vastai-ocr-test.mjs "./otra-carpeta"

Procesar un único archivo:
node --env-file=.env vastai-ocr-test.mjs "documento.pdf"
*/

import fs from 'node:fs/promises';
import path from 'node:path';

const VAST_API_KEY = process.env.VAST_API_KEY;
const OCR_API_KEY = process.env.OCR_API_KEY;
const VAST_INSTANCE_ID = process.env.VAST_INSTANCE_ID;

const rutaEntrada = process.argv[2] || 'salida';
const carpetaResultado = 'resultado';

const tiposAdmitidos = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp'
};

async function obtenerArchivos(ruta) {
  const informacion = await fs.stat(ruta);

  if (informacion.isFile()) {
    const extension = path.extname(ruta).toLowerCase();

    if (!tiposAdmitidos[extension]) {
      throw new Error(`Formato no admitido: ${extension}`);
    }

    return [ruta];
  }

  if (!informacion.isDirectory()) {
    throw new Error(`La ruta no es un archivo ni una carpeta: ${ruta}`);
  }

  const elementos = await fs.readdir(ruta, {
    withFileTypes: true
  });

  const archivos = elementos
    .filter(elemento => elemento.isFile())
    .map(elemento => path.join(ruta, elemento.name))
    .filter(archivo => {
      const extension = path.extname(archivo).toLowerCase();
      return Boolean(tiposAdmitidos[extension]);
    })
    .sort((a, b) =>
      a.localeCompare(b, undefined, {
        numeric: true,
        sensitivity: 'base'
      })
    );

  if (archivos.length === 0) {
    throw new Error(
      `No se encontraron archivos compatibles en la carpeta "${ruta}"`
    );
  }

  return archivos;
}

async function obtenerServidorOCR() {
  const response = await fetch(
    'https://console.vast.ai/api/v1/instances/?owner=me',
    {
      headers: {
        Authorization: `Bearer ${VAST_API_KEY}`
      }
    }
  );

  if (!response.ok) {
    const detalle = await response.text();

    throw new Error(
      `Vast.ai HTTP ${response.status}: ${detalle}`
    );
  }

  const data = await response.json();

  const candidatas = data.instances.filter(instancia =>
    instancia.actual_status === 'running' &&
    instancia.ports?.['10001/tcp']?.[0]?.HostPort
  );

  const instancia = VAST_INSTANCE_ID
    ? candidatas.find(
      candidata => String(candidata.id) === VAST_INSTANCE_ID
    )
    : candidatas.length === 1
      ? candidatas[0]
      : null;

  if (!instancia) {
    throw new Error(
      'No hay una instancia OCR única y operativa. ' +
      'Comprueba el puerto 10001 o indica VAST_INSTANCE_ID.'
    );
  }

  const ip = instancia.public_ipaddr;
  const puerto = instancia.ports['10001/tcp'][0].HostPort;

  if (!ip || !puerto) {
    throw new Error('IP o puerto público no disponible');
  }

  console.log('Instancia:', instancia.id);
  console.log('IP:', ip);
  console.log('Puerto:', puerto);

  return `http://${ip}:${puerto}`;
}

async function comprobarModelo(url) {
  const response = await fetch(`${url}/ready`, {
    headers: {
      Authorization: `Bearer ${OCR_API_KEY}`
    },
    signal: AbortSignal.timeout(15000)
  });

  if (!response.ok) {
    const detalle = await response.text();

    throw new Error(
      `OCR HTTP ${response.status}: ${detalle}`
    );
  }

  console.log('Modelo preparado:', await response.json());
}

async function ejecutarOCR(url, archivo) {
  const buffer = await fs.readFile(archivo);

  const extension = path.extname(archivo).toLowerCase();
  const tipo = tiposAdmitidos[extension];

  if (!tipo) {
    throw new Error(`Formato no admitido: ${extension}`);
  }

  const form = new FormData();

  form.append(
    'file',
    new Blob([buffer], { type: tipo }),
    path.basename(archivo)
  );

  form.append('dpi', '200');
  form.append('crop_mode', 'true');
  form.append('tokens_per_page', '4000');

  console.log(`\nProcesando: ${path.basename(archivo)}`);
  console.log('Enviando documento al OCR...');

  const inicio = Date.now();

  const response = await fetch(`${url}/ocr`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OCR_API_KEY}`
    },
    body: form,
    signal: AbortSignal.timeout(900000)
  });

  if (!response.ok) {
    throw new Error(
      `OCR HTTP ${response.status}: ${await response.text()}`
    );
  }

  const resultado = await response.json();

  console.log('Páginas:', resultado.pages);
  console.log('Tiempo servidor:', resultado.elapsed_ms, 'ms');
  console.log('Tiempo total:', Date.now() - inicio, 'ms');

  const nombreBase = path.basename(
    archivo,
    path.extname(archivo)
  );

  const rutaTexto = path.join(
    carpetaResultado,
    `${nombreBase}.txt`
  );

  const rutaJson = path.join(
    carpetaResultado,
    `${nombreBase}.json`
  );

  await fs.writeFile(
    rutaTexto,
    resultado.text ?? '',
    'utf8'
  );

  await fs.writeFile(
    rutaJson,
    JSON.stringify(resultado, null, 2),
    'utf8'
  );

  console.log('Texto guardado en:', rutaTexto);
  console.log('JSON guardado en:', rutaJson);
}

async function main() {
  if (!VAST_API_KEY || !OCR_API_KEY) {
    throw new Error(
      'Faltan VAST_API_KEY u OCR_API_KEY en el archivo .env'
    );
  }

  const archivos = await obtenerArchivos(rutaEntrada);

  console.log(`Archivos encontrados: ${archivos.length}`);

  await fs.mkdir(carpetaResultado, {
    recursive: true
  });

  const url = await obtenerServidorOCR();

  await comprobarModelo(url);

  let completados = 0;
  let fallidos = 0;

  for (const archivo of archivos) {
    try {
      await ejecutarOCR(url, archivo);
      completados++;
    } catch (error) {
      fallidos++;
      console.error(
        `ERROR procesando "${path.basename(archivo)}":`,
        error.message
      );
    }
  }

  console.log('\n===== PROCESO FINALIZADO =====');
  console.log('Completados:', completados);
  console.log('Fallidos:', fallidos);
  console.log('Resultados guardados en:', carpetaResultado);

  if (fallidos > 0) {
    process.exitCode = 1;
  }
}

main().catch(error => {
  console.error('ERROR:', error.message);
  process.exitCode = 1;
});