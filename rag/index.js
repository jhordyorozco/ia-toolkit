const OpenAI = require('openai');
const fs = require('fs/promises');
const path = require('path');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function generarEmbedding(texto) {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: texto,
    encoding_format: 'float'
  });

  return response.data[0].embedding;
}

async function main() {
  const texto = 'Necesito un presupuesto de 20 cajas de tornillos de acero inoxidable.';

  try {
    const embedding = await generarEmbedding(texto);
    const archivo = path.join(__dirname, 'embedding-large.json');

    await fs.writeFile(
      archivo,
      JSON.stringify({
        texto,
        modelo: 'text-embedding-3-small',
        dimensiones: embedding.length,
        embedding
      }, null, 2),
      'utf8'
    );

  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();