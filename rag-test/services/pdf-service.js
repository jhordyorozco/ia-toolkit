const fs = require('fs/promises');
const path = require('path');
const { PDFDocument } = require('pdf-lib');

async function listarPdfs(carpetaEntrada, archivoSolicitado) {
  const rutaSolicitada = archivoSolicitado &&
    path.posix.normalize(archivoSolicitado.replace(/\\/g, '/')).replace(/\/$/, '');
  const entradas = await fs.readdir(carpetaEntrada, { withFileTypes: true, recursive: true });
  const archivosPdf = entradas
    .filter(entrada => entrada.isFile() && path.extname(entrada.name).toLowerCase() === '.pdf')
    .map(entrada => path.relative(carpetaEntrada, path.join(entrada.parentPath, entrada.name)).split(path.sep).join('/'))
    .filter(nombre => !rutaSolicitada || nombre === rutaSolicitada || nombre.startsWith(`${rutaSolicitada}/`))
    .sort();

  if (archivoSolicitado && !archivosPdf.length) {
    throw new Error(`No se encontraron PDF para "${archivoSolicitado}" en input/.`);
  }

  return archivosPdf;
}

async function leerPdf(archivo) {
  const buffer = await fs.readFile(archivo);
  const pdf = await PDFDocument.load(buffer);
  const paginas = pdf.getPageCount();

  if (paginas > 12) {
    throw new Error(`"${path.basename(archivo)}" tiene ${paginas} páginas. El máximo es de 12 por PDF.`);
  }

  return buffer;
}

module.exports = { listarPdfs, leerPdf };
