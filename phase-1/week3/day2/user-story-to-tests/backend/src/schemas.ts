import { z } from 'zod'

export const GenerateRequestSchema = z.object({
  storyTitle: z.string().min(1, 'Story title is required'),
  acceptanceCriteria: z.string().min(1, 'Acceptance criteria is required'),
  description: z.string().optional(),
  additionalInfo: z.string().optional(),
  mockupImages: z.array(z.string()).optional()
})

export const TestCaseSchema = z.object({
  id: z.string(),
  title: z.string(),
  category: z.string(),
  priority: z.string().optional(),
  preconditions: z.string().optional(),
  testData: z.string().optional(),
  steps: z.array(z.string()),
  expectedResult: z.string(),
  linkedAC: z.string().optional()
})

export const AnalysisSectionSchema = z.object({
  coreFunctionality: z.string(),
  keyRisks: z.array(z.string()),
  assumptions: z.array(z.string()),
  ambiguities: z.array(z.string())
})

export const GenerateResponseSchema = z.object({
  analysisSection: AnalysisSectionSchema.optional(),
  coverageMatrix: z.record(z.array(z.string())).optional(),
  cases: z.array(TestCaseSchema),
  exploratoryIdeas: z.array(z.string()).optional(),
  openQuestions: z.array(z.string()).optional(),
  model: z.string().optional(),
  promptTokens: z.number().optional().default(0),
  completionTokens: z.number().optional().default(0)
})

// Type exports
export type GenerateRequest = z.infer<typeof GenerateRequestSchema>
export type TestCase = z.infer<typeof TestCaseSchema>
export type AnalysisSection = z.infer<typeof AnalysisSectionSchema>
export type GenerateResponse = z.infer<typeof GenerateResponseSchema>