function separarParrafos(texto) {
  const textoNormalizado = texto.replace(/\r\n?/g, '\n').trim();
  const separador = /<\/?PAGE>|<BLOCK>[a-z_][a-z0-9_-]*(?:<LEVEL\d+>)?[ \t]*\[[^\]\n]*\][ \t]*<FORK>|\n[ \t]*\n+|\f/i;
  const bloques = textoNormalizado.split(separador);
  const parrafos = bloques.length === 1 ? textoNormalizado.split('\n') : bloques;

  return parrafos.map(parrafo => parrafo.trim()).filter(Boolean);
}

module.exports = separarParrafos;
