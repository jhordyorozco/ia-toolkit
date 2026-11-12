const path = require('path');
const { leerPdf } = require('./pdf-service.js');

module.exports = class OCRService {
  constructor() {
    this.ocrApiKey = process.env.OCR_API_KEY;

    if (!this.ocrApiKey) {
      throw new Error('Configura OCR_API_KEY en el .env de rag-test.');
    }
  }

  async comprobarModelo(url) {
    const response = await fetch(`${url}/ready`, {
      headers: { Authorization: `Bearer ${this.ocrApiKey}` },
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      throw new Error(`OCR respondió HTTP ${response.status} al comprobar /ready.`);
    }
  }

  async ejecutarOCR(url, archivo) {
    const buffer = await leerPdf(archivo);
    const nombre = path.basename(archivo);
    const form = new FormData();

    form.append('file', new Blob([buffer], { type: 'application/pdf' }), nombre);
    form.append('dpi', '200');
    form.append('crop_mode', 'true');
    form.append('tokens_per_page', '4000');

    const response = await fetch(`${url}/ocr`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.ocrApiKey}` },
      body: form,
      signal: AbortSignal.timeout(900000)
    });

    if (!response.ok) {
      throw new Error(`OCR respondió HTTP ${response.status} al procesar ${nombre}.`);
    }

    const resultado = await response.json();
    if (typeof resultado.text !== 'string' || !resultado.text.trim()) {
      throw new Error(`El OCR no devolvió texto para ${nombre}.`);
    }

    return resultado;
  }
};
