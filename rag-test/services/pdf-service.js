const fs = require('fs/promises');
const path = require('path');

async function listarPdfs(carpetaEntrada, archivoSolicitado) {
  const entradas = await fs.readdir(carpetaEntrada, { withFileTypes: true });
  const archivosPdf = entradas
    .filter(entrada => entrada.isFile() && path.extname(entrada.name).toLowerCase() === '.pdf')
    .map(entrada => entrada.name)
    .filter(nombre => !archivoSolicitado || nombre === archivoSolicitado)
    .sort();

  if (archivoSolicitado && !archivosPdf.length) {
    throw new Error(`No se encontró el PDF "${archivoSolicitado}" en input/.`);
  }

  return archivosPdf;
}

module.exports = listarPdfs;
