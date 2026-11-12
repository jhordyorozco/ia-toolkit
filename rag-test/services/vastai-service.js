module.exports = class VastAIService {
  constructor() {
    this.vastApiKey = process.env.VAST_API_KEY;
    this.instanciaId = process.env.VAST_INSTANCE_ID;

    if (!this.vastApiKey) {
      throw new Error('Configura VAST_API_KEY en el .env de rag-test.');
    }
  }

  async obtenerServidorOCR() {
    const response = await fetch('https://console.vast.ai/api/v1/instances/?owner=me', {
      headers: { Authorization: `Bearer ${this.vastApiKey}` },
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      throw new Error(`Vast.ai respondió HTTP ${response.status} al consultar las instancias.`);
    }

    const { instances } = await response.json();
    if (!Array.isArray(instances)) {
      throw new Error('Vast.ai no devolvió la lista de instancias.');
    }
    if (!instances.length) {
      throw new Error('Vast.ai no devolvió ninguna instancia para la cuenta de VAST_API_KEY.');
    }

    const candidatas = instances.filter(instancia =>
      instancia.actual_status === 'running' &&
      instancia.public_ipaddr &&
      instancia.ports?.['10001/tcp']?.[0]?.HostPort
    );

    if (!this.instanciaId && candidatas.length > 1) {
      throw new Error('Hay varias instancias OCR activas. Indica VAST_INSTANCE_ID en el .env.');
    }

    const instancia = this.instanciaId
      ? candidatas.find(candidata => String(candidata.id) === this.instanciaId)
      : candidatas[0];

    if (!instancia) {
      throw new Error('No se encontró una instancia OCR activa con el puerto 10001/tcp publicado.');
    }

    const puerto = instancia.ports['10001/tcp'][0].HostPort;
    return `http://${instancia.public_ipaddr}:${puerto}`;
  }
};
