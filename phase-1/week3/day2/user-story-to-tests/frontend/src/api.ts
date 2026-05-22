import { GenerateRequest, GenerateResponse, JiraAttachResult, JiraIssueData, JiraPushResult, JiraStatus, TestCase } from './types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081/api'

async function apiCall<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options)
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }))
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
  }
  return response.json()
}

export async function generateTests(request: GenerateRequest): Promise<GenerateResponse> {
  try {
    return await apiCall<GenerateResponse>(`${API_BASE_URL}/generate-tests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    })
  } catch (error) {
    console.error('Error generating tests:', error)
    throw error instanceof Error ? error : new Error('Unknown error occurred')
  }
}

export async function fetchJiraStatus(): Promise<JiraStatus> {
  return apiCall<JiraStatus>(`${API_BASE_URL}/jira/status`)
}

export async function fetchJiraIssue(key: string): Promise<JiraIssueData> {
  return apiCall<JiraIssueData>(`${API_BASE_URL}/jira/issue/${encodeURIComponent(key)}`)
}

export async function pushTestsToJira(storyTitle: string, cases: TestCase[]): Promise<JiraPushResult> {
  return apiCall<JiraPushResult>(`${API_BASE_URL}/jira/push-tests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ storyTitle, cases }),
  })
}

export async function generateFeatureFile(storyTitle: string, acceptanceCriteria: string, cases: TestCase[]): Promise<string> {
  const data = await apiCall<{ content: string }>(`${API_BASE_URL}/generate-features`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ storyTitle, acceptanceCriteria, cases })
  })
  return data.content
}

export async function attachExcelToJira(issueKey: string, filename: string, fileBase64: string): Promise<JiraAttachResult> {
  try {
    const data = await apiCall<{ id: string; filename: string; issueKey: string; issueUrl: string }>(
      `${API_BASE_URL}/jira/attach-excel`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issueKey, filename, fileBase64 }),
      }
    )
    return { success: true, filename: data.filename, issueKey: data.issueKey, issueUrl: data.issueUrl }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}