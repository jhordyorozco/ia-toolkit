
(async () => {
  try{
    const fs = require('fs/promises')
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

    const jsonFile = await fs.readFile('./precios_uco_2026.json', 'utf8')
    let data = JSON.parse(jsonFile)

    data = data.reduce((acc, element) => {
      acc.ids.push(element.reference)
      acc.documents.push(element.productName)
      acc.metadatas.push({
        "reference": element.reference,
        "price": element.price,
        "format": element.format
      })

      return acc
    }, {
      ids: [],
      documents: [],
      metadatas: [],
    })

    await collection.add(data)
  }catch(error){
    console.log(error)
  }
})()