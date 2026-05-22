import express from 'express'
import { GroqClient } from '../llm/groqClient'
import { GenerateRequestSchema, GenerateResponseSchema, GenerateResponse } from '../schemas'
import { SYSTEM_PROMPT, buildPrompt } from '../prompt'

export const generateRouter = express.Router()

generateRouter.post('/', async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    // Validate request body
    const validationResult = GenerateRequestSchema.safeParse(req.body)
    
    if (!validationResult.success) {
      res.status(400).json({
        error: `Validation error: ${validationResult.error.message}`
      })
      return
    }

    const request = validationResult.data

    // Create GroqClient instance here to ensure env vars are loaded
    const groqClient = new GroqClient()

    // Analyze mockup images if provided
    let mockupDescriptions: string[] = []
    if (request.mockupImages && request.mockupImages.length > 0) {
      console.log(`Analyzing ${request.mockupImages.length} mockup image(s) with vision model...`)
      mockupDescriptions = await groqClient.analyzeImages(request.mockupImages)
      console.log('Mockup analysis complete.')
    }

    // Build prompts
    const userPrompt = buildPrompt(request, mockupDescriptions)

    // Generate tests using Groq
    try {
      const groqResponse = await groqClient.generateTests(SYSTEM_PROMPT, userPrompt)
      
      // Parse the JSON content
      let parsedResponse: GenerateResponse
      try {
        const raw = groqResponse.content
        console.log('LLM raw response:', raw)

        // Try to extract the outermost JSON object from the response
        const start = raw.indexOf('{')
        const end = raw.lastIndexOf('}')
        if (start === -1 || end === -1 || end < start) {
          throw new Error('No JSON object found in LLM response')
        }
        const jsonContent = raw.slice(start, end + 1)
        parsedResponse = JSON.parse(jsonContent)
      } catch (parseError) {
        console.error('JSON parse error:', (parseError as Error).message)
        res.status(502).json({
          error: 'LLM returned invalid JSON format'
        })
        return
      }

      // Validate the response schema
      const responseValidation = GenerateResponseSchema.safeParse(parsedResponse)
      if (!responseValidation.success) {
        console.error('Schema validation error:', responseValidation.error.errors)
        console.error('Parsed response:', JSON.stringify(parsedResponse).substring(0, 500))
        res.status(502).json({
          error: 'LLM response does not match expected schema',
          details: responseValidation.error.errors
        })
        return
      }

      // Add token usage info if available
      const finalResponse = {
        ...responseValidation.data,
        model: groqResponse.model,
        promptTokens: groqResponse.promptTokens,
        completionTokens: groqResponse.completionTokens
      }

      res.json(finalResponse)
    } catch (llmError) {
      console.error('LLM error:', llmError)
      res.status(502).json({
        error: 'Failed to generate tests from LLM service'
      })
      return
    }
  } catch (error) {
    console.error('Error in generate route:', error)
    res.status(500).json({
      error: 'Internal server error'
    })
  }
})