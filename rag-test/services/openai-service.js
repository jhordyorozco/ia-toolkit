const OpenAI = require('openai');

module.exports = class OpenAIService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  async createResponse(input, model, options = {}) {
    const response = await this.openai.responses.create({
      ...options,
      input,
      model
    });

    if (response.status !== 'completed') {
      throw new Error(`Respuesta de OpenAI no completada (${response.status}).`);
    }

    return response;
  }

  async generarEmbedding(texto) {
    const response = await this.openai.embeddings.create({
      model: 'text-embedding-3-large',
      input: texto,
      encoding_format: 'float'
    });

    return response.data[0].embedding;
  }
};
