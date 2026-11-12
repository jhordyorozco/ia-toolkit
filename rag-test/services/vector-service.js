const { ChromaClient } = require('chromadb');

module.exports = class VectorService {
  constructor() {
    this.client = new ChromaClient();
  }

  async conectar() {
    this.collection = await this.client.getOrCreateCollection({
      name: 'rag-test-parrafos',
      embeddingFunction: null
    });
  }

  async guardarParrafos(archivo, parrafos) {
    await this.collection.upsert({
      ids: parrafos.map(parrafo => parrafo.id),
      embeddings: parrafos.map(parrafo => parrafo.embedding),
      metadatas: parrafos.map(({ bloque, texto, palabrasClave }) => ({ archivo, numero: bloque, texto, palabrasClave: JSON.stringify(palabrasClave) }))
    });

    await this.collection.delete({
      where: { $and: [{ archivo }, { numero: { $gt: parrafos.length } }] }
    });
  }
};
