import express from 'express'
import { z } from 'zod'
import { GroqClient } from '../llm/groqClient'

export const featuresRouter = express.Router()

const FeatureRequestSchema = z.object({
  storyTitle: z.string().min(1),
  acceptanceCriteria: z.string().optional(),
  cases: z.array(z.object({
    id: z.string(),
    title: z.string(),
    category: z.string(),
    priority: z.string().optional(),
    preconditions: z.string().optional(),
    testData: z.string().optional(),
    steps: z.array(z.string()),
    expectedResult: z.string(),
    linkedAC: z.string().optional()
  }))
})

const GHERKIN_SYSTEM_PROMPT = `You are an expert BDD/Cucumber specialist. Convert structured test cases into a production-quality Gherkin feature file.

OUTPUT RULES:
- Return ONLY valid Gherkin — no markdown fences, no explanation, no preamble or trailing text
- The output must be a complete .feature file that Cucumber can execute directly

STRUCTURE:
1. Feature: use the story title; add a 3-line user story (As a / I want / So that)
2. Background: add one if two or more scenarios share identical Given preconditions; omit otherwise
3. Scenario vs Scenario Outline: use Scenario Outline with an Examples table when the same flow is tested with multiple data values; otherwise use Scenario
4. Tags: place tags on the line above each Scenario/Scenario Outline
   - Always include @functional-positive OR @functional-negative
   - Always include the priority: @P1, @P2, @P3, or @P4
   - Add @smoke to P1 @functional-positive scenarios
5. Step keywords:
   - Given: system state, preconditions, and test data setup
   - When: the action or event the user performs (one primary action per scenario)
   - Then: the observable, verifiable outcome
   - And: continuation of the previous keyword block
   - But: negative continuation (e.g. "But the error banner should not appear")
6. Language: business-readable natural language — avoid technical implementation details
7. Order: list @functional-positive scenarios before @functional-negative scenarios within the file`

featuresRouter.post('/', async (req: express.Request, res: express.Response): Promise<void> => {
  const parsed = FeatureRequestSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request body' })
    return
  }

  const { storyTitle, acceptanceCriteria, cases } = parsed.data

  const casesText = cases.map(tc => {
    const lines = [
      `ID: ${tc.id}`,
      `Title: ${tc.title}`,
      `Category: ${tc.category}`,
      `Priority: ${tc.priority || 'N/A'}`,
      `Preconditions: ${tc.preconditions || 'None'}`,
      `Test Data: ${tc.testData || 'None'}`,
      `Steps:\n${tc.steps.map((s, i) => `  ${i + 1}. ${s}`).join('\n')}`,
      `Expected Result: ${tc.expectedResult}`,
      `Linked AC: ${tc.linkedAC || 'N/A'}`
    ]
    return lines.join('\n')
  }).join('\n\n---\n\n')

  const userPrompt = `Convert these test cases into a single Gherkin feature file as one complete BDD suite.

Feature title: ${storyTitle}
${acceptanceCriteria ? `\nAcceptance Criteria:\n${acceptanceCriteria}\n` : ''}
Test Cases (${cases.length} total):
${casesText}

Return the complete .feature file only.`

  try {
    const groqClient = new GroqClient()
    const response = await groqClient.generateTests(GHERKIN_SYSTEM_PROMPT, userPrompt, 2048)
    res.json({ content: response.content })
  } catch (err) {
    res.status(502).json({ error: (err as Error).message })
  }
})
