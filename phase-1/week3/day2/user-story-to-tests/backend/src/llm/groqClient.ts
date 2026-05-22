import fetch from 'node-fetch'

interface GroqResponse {
  content: string
  model?: string
  promptTokens: number
  completionTokens: number
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Parse the wait time Groq embeds in 429 bodies: "Please try again in 23.84s"
function parseRetryAfterMs(errorBody: string): number {
  const match = errorBody.match(/try again in (\d+(?:\.\d+)?)(m?)s/)
  if (match) {
    const value = parseFloat(match[1])
    const ms = match[2] === 'm' ? value * 60_000 : value * 1_000
    return Math.ceil(ms) + 1_000 // add 1 s buffer
  }
  return 15_000 // fallback
}

export class GroqClient {
  private apiKey: string
  private baseUrl: string
  private model: string

  constructor() {
    this.apiKey = process.env.groq_API_KEY || ''
    this.baseUrl = process.env.groq_API_BASE || 'https://api.groq.com/openai/v1'
    this.model = process.env.groq_MODEL || 'llama3-8b-8192'

    if (!this.apiKey) {
      console.warn('groq_API_KEY not found in environment variables')
    } else {
      console.log(`Groq configured — model: ${this.model}`)
    }
  }

  async analyzeImages(dataUrls: string[]): Promise<string[]> {
    const visionModel = process.env.groq_VISION_MODEL || 'llama-3.2-11b-vision-preview'
    const endpoint = `${this.baseUrl}/chat/completions`
    const descriptions: string[] = []

    for (let i = 0; i < dataUrls.length; i++) {
      let lastError = ''
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: visionModel,
              messages: [{
                role: 'user',
                content: [
                  { type: 'text', text: 'You are analyzing a UI mockup screen to help a QA engineer write functional test cases. Describe in detail: all visible UI components (forms, inputs, buttons, dropdowns, checkboxes, toggles, etc.), labels and placeholder text, navigation elements, page structure, any visible validation rules or error states, and user interaction flows shown in the screen. Be specific and focus on testable behaviors.' },
                  { type: 'image_url', image_url: { url: dataUrls[i] } }
                ]
              }],
              temperature: 0.1,
              max_tokens: 1024
            })
          })

          if (response.status === 429) {
            const body = await response.text()
            const waitMs = parseRetryAfterMs(body)
            console.warn(`Vision API rate-limited for image ${i + 1}. Waiting ${waitMs}ms…`)
            await sleep(waitMs)
            continue
          }

          if (response.ok) {
            const data = await response.json() as any
            const content = data.choices?.[0]?.message?.content
            if (content) descriptions.push(`Mockup Screen ${i + 1}:\n${content}`)
          } else {
            const text = await response.text()
            console.error(`Vision API error for image ${i + 1}:`, text)
            descriptions.push(`Mockup Screen ${i + 1}: [Analysis unavailable — ${response.status}]`)
          }
          break
        } catch (err) {
          lastError = (err as Error).message
          if (attempt === 2) {
            console.error(`Error analyzing image ${i + 1}:`, lastError)
            descriptions.push(`Mockup Screen ${i + 1}: [Analysis error]`)
          }
        }
      }
    }

    return descriptions
  }

  async generateTests(systemPrompt: string, userPrompt: string, maxTokens = 4096): Promise<GroqResponse> {
    const endpoint = `${this.baseUrl}/chat/completions`
    const requestBody = {
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.2,
      max_tokens: maxTokens
    }

    console.log(`Groq request — model: ${this.model}, max_tokens: ${maxTokens}`)

    for (let attempt = 0; attempt < 3; attempt++) {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      if (response.status === 429) {
        const body = await response.text()
        const waitMs = parseRetryAfterMs(body)
        console.warn(`Rate limited (attempt ${attempt + 1}/3). Waiting ${waitMs}ms…`)
        if (attempt < 2) {
          await sleep(waitMs)
          continue
        }
        throw new Error(`Groq API rate limit exceeded after retries: ${body}`)
      }

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Groq API error: ${response.status} ${response.statusText} - ${errorText}`)
      }

      const data = await response.json() as any
      const content = data.choices?.[0]?.message?.content
      if (!content) throw new Error('No content received from Groq API')

      return {
        content,
        model: data.model,
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0
      }
    }

    throw new Error('Groq API failed after 3 attempts')
  }
}
