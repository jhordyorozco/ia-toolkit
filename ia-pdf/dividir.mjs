import { PDFDocument } from 'pdf-lib';
import { readFile, writeFile, mkdir } from 'node:fs/promises';

const archivo = process.argv[2];

if (!archivo) {
  console.error('Uso: node dividir.mjs "mi-documento.pdf"');
  process.exit(1);
}

const paginasPorArchivo = 12;
const original = await PDFDocument.load(await readFile(archivo));
const total = original.getPageCount();

await mkdir('salida', { recursive: true });

for (let inicio = 0; inicio < total; inicio += paginasPorArchivo) {
  const fin = Math.min(inicio + paginasPorArchivo, total);
  const nuevo = await PDFDocument.create();

  // pdf-lib cuenta las páginas desde 0.
  const indices = Array.from(
    { length: fin - inicio },
    (_, i) => inicio + i
  );

  const paginas = await nuevo.copyPages(original, indices);
  paginas.forEach((pagina) => nuevo.addPage(pagina));

  const numero = String(inicio / paginasPorArchivo + 1).padStart(2, '0');
  const destino = `salida/parte-${numero}.pdf`;

  await writeFile(destino, await nuevo.save());
  console.log(`${destino}: páginas ${inicio + 1} a ${fin}`);
}