(async () => {

  const OpenAIService = require('./openai-service.js')
  const { ChromaClient } = require('chromadb')
  const { OpenAIEmbeddingFunction } = require('@chroma-core/openai')

  const client = new ChromaClient()

  const collection = await client.getOrCreateCollection({
    name: "my-collection-openai",
    embeddingFunction: new OpenAIEmbeddingFunction({
      apiKey: process.env.OPENAI_API_KEY,
      modelName: "text-embedding-3-large",
    })
  })

  const prompt = "¿A qué precio tenéis los pimientos rojos?"

  const result = await collection.query({
    queryTexts: [prompt],
  })


  const openaiService = new OpenAIService()

  const response = await openaiService.createResponse(
    `El usuario ha preguntado lo siguiente: ${prompt} y la base de vectores a dado el siguiente resultado ${JSON.stringify(result)}. Redacta la respuesta más apropiada`,
    'gpt-6-luna'
  )


  console.log(response.output_text)

})()