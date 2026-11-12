const fs = require('fs/promises');
const path = require('path');
const { randomUUID } = require('crypto');
const OCRService = require('./services/ocr-service.js');
const OpenAIService = require('./services/openai-service.js');
const VastAIService = require('./services/vastai-service.js');
const VectorService = require('./services/vector-service.js');
const listarPdfs = require('./services/pdf-service.js');
const separarParrafos = require('./services/parrafos.js');
const extraerPalabrasClave = require('./services/palabras-clave.js');

async function main() {
  const carpetaEntrada = path.join(__dirname, 'input');
  const carpetaSalida = path.join(__dirname, 'output');
  const archivoSolicitado = process.argv[2];

  try {
    const archivosPdf = await listarPdfs(carpetaEntrada, archivoSolicitado);

    if (!archivosPdf.length) {
      console.log('No hay archivos PDF en input/.');
      return;
    }

    await fs.mkdir(carpetaSalida, { recursive: true });
    const vastai = new VastAIService();
    const ocr = new OCRService();
    const url = await vastai.obtenerServidorOCR();
    await ocr.comprobarModelo(url);
    const openai = new OpenAIService();
    const vectores = new VectorService();
    await vectores.conectar();

    for (const archivo of archivosPdf) {
      const resultado = await ocr.ejecutarOCR(url, path.join(carpetaEntrada, archivo));
      const parrafos = separarParrafos(resultado.text);
      if (!parrafos.length) {
        throw new Error(`El OCR no devolvió párrafos con texto para "${archivo}".`);
      }

      const registros = [];

      console.log('Archivo:', archivo);
      console.log('Vista previa del texto OCR:', parrafos.join('\n\n').slice(0, 300));
      console.log('Párrafos encontrados:', parrafos.length);

      for (const [indice, parrafo] of parrafos.entries()) {
        const bloque = indice + 1;
        const palabrasClave = await extraerPalabrasClave(openai, parrafo);
        const textoPalabrasClave = palabrasClave.join(', ');
        const embedding = await openai.generarEmbedding(textoPalabrasClave);
        registros.push({ id: `${archivo}:${bloque}`, bloque, texto: parrafo, palabrasClave, embedding });

        console.log(`Párrafo ${bloque}:`, textoPalabrasClave);
        console.log('Dimensiones del embedding:', embedding.length);
      }

      const rutaJson = path.join(carpetaSalida, `${archivo}.json`);
      const temporal = path.join(carpetaSalida, `${randomUUID()}.tmp`);
      try {
        await fs.writeFile(temporal, JSON.stringify(registros, null, 2), 'utf8');
        await vectores.guardarParrafos(archivo, registros);
        await fs.rename(temporal, rutaJson);
      } finally {
        await fs.rm(temporal, { force: true });
      }

      console.log('Párrafos guardados en ChromaDB:', registros.length);
      console.log('JSON guardado:', rutaJson);
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exitCode = 1;
  }
}

main();
