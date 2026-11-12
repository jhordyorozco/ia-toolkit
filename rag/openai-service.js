const OpenAI = require('openai')
const { toFile } = require('openai/uploads')

module.exports = class OpenAIService {
  constructor () {
    this.openai = new OpenAI({
      ...(process.env.LLM_PROVIDER && { baseURL: process.env.LLM_PROVIDER }),
      apiKey: process.env.OPENAI_API_KEY
    })
    this.resetConversation()
  }

  resetConversation () {
    this.responseId = null
    this.answer = null
    this.tools = []
  }

  async createResponse (input, model, options = {}) {
    this.answer = null
    this.tools = []

    const response = await this.openai.responses.create({
      ...(this.responseId && { previous_response_id: this.responseId }),
      ...options,
      input,
      model,
      stream: false,
      background: false
    })

    if (response.status !== 'completed') {
      throw new Error(response.error?.message || response.incomplete_details?.reason || `Respuesta no completada: ${response.status}`)
    }

    this.responseId = response.id
    this.answer = response.output_text || ''
    this.tools = response.output.filter(item => item.type === 'function_call')

    return response
  }

  submitToolOutputs (toolOutputs, model, options = {}) {
    if (!this.responseId) {
      throw new Error('No hay una respuesta previa para enviar resultados de herramientas')
    }

    return this.createResponse(toolOutputs.map(output => ({ ...output, type: 'function_call_output' })), model, options)
  }

  async transcribeAudio (fileStream, languages = ['es'], filename = 'audio.ogg') {
    const file = await toFile(fileStream, filename)

    return this.openai.audio.transcriptions.create({
      file,
      model: 'gpt-transcribe',
      languages 
    })
  }

  analyzeImageUrl (imageUrls, model, text = '¿Qué ves en la imagen?', options = {}) {
    return this.createResponse([{
      role: 'user',
      content: [
        { type: 'input_text', text },
        ...imageUrls.map(imageUrl => ({ type: 'input_image', image_url: imageUrl, detail: 'high' }))
      ]
    }], model, options)
  }

  analyzeImageBuffer (images, model, text = '¿Qué ves en la imagen?', options = {}) {
    const imageUrls = images.map(image => `data:${image.mimetype};base64,${image.buffer.toString('base64')}`)
    return this.analyzeImageUrl(imageUrls, model, text, options)
  }
}
