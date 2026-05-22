export interface GenerateRequest {
  storyTitle: string
  acceptanceCriteria: string
  description?: string
  additionalInfo?: string
  mockupImages?: string[]
}

export interface TestCase {
  id: string
  title: string
  category: string
  priority?: string
  preconditions?: string
  testData?: string
  steps: string[]
  expectedResult: string
  linkedAC?: string
}

export interface AnalysisSection {
  coreFunctionality: string
  keyRisks: string[]
  assumptions: string[]
  ambiguities: string[]
}

export interface JiraIssueData {
  storyTitle: string
  description: string
  acceptanceCriteria: string
  mockupImages?: string[]
}

export interface JiraCreatedIssue {
  tcId: string
  id: string
  key: string
  url: string
}

export interface JiraPushResult {
  created: JiraCreatedIssue[]
  failed: { tcId: string; error: string }[]
  projectKey: string
  issueType: string
}

export interface JiraAttachResult {
  success: boolean
  filename?: string
  issueKey?: string
  issueUrl?: string
  error?: string
}

export interface JiraStatus {
  configured: boolean
  projectKey: string | null
  issueType: string
}

export interface GenerateResponse {
  analysisSection?: AnalysisSection
  coverageMatrix?: Record<string, string[]>
  cases: TestCase[]
  exploratoryIdeas?: string[]
  openQuestions?: string[]
  model?: string
  promptTokens: number
  completionTokens: number
}