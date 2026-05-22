import fetch from 'node-fetch'

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

export class JiraClient {
  private baseUrl: string
  private authHeader: string
  readonly projectKey: string
  readonly issueType: string
  readonly configured: boolean

  constructor() {
    const url = (process.env.JIRA_URL || '').replace(/\/$/, '')
    const email = process.env.JIRA_EMAIL || ''
    const token = process.env.JIRA_API_TOKEN || ''
    this.baseUrl = url
    this.projectKey = process.env.JIRA_PROJECT_KEY || ''
    this.issueType = process.env.JIRA_ISSUE_TYPE || 'Task'
    this.authHeader = `Basic ${Buffer.from(`${email}:${token}`).toString('base64')}`
    this.configured = !!(url && email && token)
  }

  async getIssue(issueKey: string): Promise<JiraIssueData> {
    const response = await fetch(`${this.baseUrl}/rest/api/3/issue/${issueKey}`, {
      headers: { 'Authorization': this.authHeader, 'Accept': 'application/json' }
    })
    if (!response.ok) {
      const text = await response.text()
      throw new Error(`JIRA ${response.status} ${response.statusText}: ${text}`)
    }
    const data = await response.json() as any
    const fields = data.fields

    const storyTitle = fields.summary || ''
    const acceptanceCriteria = extractADFText(fields.description)

    // Download image attachments (limit to 5 to keep payload manageable)
    const attachments: any[] = fields.attachment || []
    const imageAttachments = attachments
      .filter(a => typeof a.mimeType === 'string' && a.mimeType.startsWith('image/'))
      .slice(0, 5)

    const imageResults = await Promise.allSettled(
      imageAttachments.map(async (a) => {
        const imgRes = await fetch(a.content, { headers: { 'Authorization': this.authHeader } })
        if (!imgRes.ok) throw new Error(`${imgRes.status} ${imgRes.statusText}`)
        const buf = Buffer.from(await imgRes.arrayBuffer())
        return `data:${a.mimeType};base64,${buf.toString('base64')}`
      })
    )

    const mockupImages = imageResults
      .filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled')
      .map(r => r.value)

    return { storyTitle, description: '', acceptanceCriteria, mockupImages: mockupImages.length ? mockupImages : undefined }
  }

  async attachFile(
    issueKey: string,
    filename: string,
    buffer: Buffer
  ): Promise<{ id: string; filename: string; issueKey: string; issueUrl: string }> {
    const boundary = `----FormBoundary${Date.now()}${Math.random().toString(36).slice(2)}`
    const mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    const header = Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${mimeType}\r\n\r\n`
    )
    const footer = Buffer.from(`\r\n--${boundary}--\r\n`)
    const body = Buffer.concat([header, buffer, footer])

    const response = await fetch(`${this.baseUrl}/rest/api/3/issue/${issueKey}/attachments`, {
      method: 'POST',
      headers: {
        'Authorization': this.authHeader,
        'X-Atlassian-Token': 'no-check',
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
      body: body as unknown as BodyInit
    })
    if (!response.ok) {
      const text = await response.text()
      throw new Error(`JIRA ${response.status} ${response.statusText}: ${text}`)
    }
    const data = await response.json() as any
    const attachment = Array.isArray(data) ? data[0] : data
    return { id: attachment.id, filename: attachment.filename, issueKey, issueUrl: `${this.baseUrl}/browse/${issueKey}` }
  }

  async createIssue(summary: string, adfDescription: object): Promise<{ id: string; key: string; url: string }> {
    const response = await fetch(`${this.baseUrl}/rest/api/3/issue`, {
      method: 'POST',
      headers: {
        'Authorization': this.authHeader,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: {
          project: { key: this.projectKey },
          issuetype: { name: this.issueType },
          summary,
          description: adfDescription
        }
      })
    })
    if (!response.ok) {
      const text = await response.text()
      throw new Error(`JIRA ${response.status} ${response.statusText}: ${text}`)
    }
    const data = await response.json() as any
    return { id: data.id, key: data.key, url: `${this.baseUrl}/browse/${data.key}` }
  }
}

function extractADFText(node: any): string {
  if (!node) return ''
  if (typeof node === 'string') return node
  if (node.type === 'text') return node.text || ''
  if (node.type === 'hardBreak') return '\n'
  const childText = (node.content || []).map(extractADFText).join('')
  return node.type === 'paragraph' || node.type === 'heading'
    ? childText + '\n'
    : childText
}

export function buildTestCaseADF(tc: any, storyTitle: string): object {
  const para = (text: string) => ({
    type: 'paragraph', content: [{ type: 'text', text }]
  })
  const boldPara = (label: string, value: string) => ({
    type: 'paragraph',
    content: [
      { type: 'text', text: `${label}: `, marks: [{ type: 'strong' }] },
      { type: 'text', text: value }
    ]
  })

  const content: object[] = [
    boldPara('Story', storyTitle),
    boldPara('Category', tc.category),
    boldPara('Priority', tc.priority || 'N/A'),
  ]
  if (tc.preconditions) content.push(boldPara('Preconditions', tc.preconditions))
  if (tc.testData) content.push(boldPara('Test Data', tc.testData))

  content.push({ type: 'paragraph', content: [{ type: 'text', text: 'Steps:', marks: [{ type: 'strong' }] }] })
  tc.steps.forEach((step: string) => content.push(para(step)))

  content.push(boldPara('Expected Result', tc.expectedResult))
  if (tc.linkedAC) content.push(boldPara('Linked AC', tc.linkedAC))

  return { type: 'doc', version: 1, content }
}
