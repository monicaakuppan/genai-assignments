import express from 'express'
import { z } from 'zod'
import { JiraClient, buildTestCaseADF, JiraPushResult } from '../jira/jiraClient'

export const jiraRouter = express.Router()

// GET /api/jira/issue/:key  — import story from JIRA
jiraRouter.get('/issue/:key', async (req: express.Request, res: express.Response): Promise<void> => {
  const client = new JiraClient()
  if (!client.configured) {
    res.status(503).json({ error: 'JIRA credentials not configured (JIRA_URL, JIRA_EMAIL, JIRA_API_TOKEN missing from .env)' })
    return
  }
  try {
    const data = await client.getIssue(req.params.key)
    res.json(data)
  } catch (err) {
    res.status(502).json({ error: (err as Error).message })
  }
})

// GET /api/jira/status  — check if JIRA is configured
jiraRouter.get('/status', (_req: express.Request, res: express.Response): void => {
  const client = new JiraClient()
  res.json({
    configured: client.configured,
    projectKey: client.projectKey || null,
    issueType: client.issueType
  })
})

const AttachSchema = z.object({
  issueKey: z.string().min(1),
  filename: z.string().min(1),
  fileBase64: z.string().min(1)
})

// POST /api/jira/attach-excel  — attach an Excel file to an existing JIRA issue
jiraRouter.post('/attach-excel', async (req: express.Request, res: express.Response): Promise<void> => {
  const client = new JiraClient()
  if (!client.configured) {
    res.status(503).json({ error: 'JIRA credentials not configured' })
    return
  }

  const parsed = AttachSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request body' })
    return
  }

  const { issueKey, filename, fileBase64 } = parsed.data
  const buffer = Buffer.from(fileBase64, 'base64')

  try {
    const result = await client.attachFile(issueKey.toUpperCase(), filename, buffer)
    res.json(result)
  } catch (err) {
    res.status(502).json({ error: (err as Error).message })
  }
})

const PushSchema = z.object({
  storyTitle: z.string(),
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

// POST /api/jira/push-tests  — create one JIRA issue per test case
jiraRouter.post('/push-tests', async (req: express.Request, res: express.Response): Promise<void> => {
  const client = new JiraClient()
  if (!client.configured) {
    res.status(503).json({ error: 'JIRA credentials not configured' })
    return
  }
  if (!client.projectKey) {
    res.status(503).json({ error: 'JIRA_PROJECT_KEY not set in .env' })
    return
  }

  const parsed = PushSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request body' })
    return
  }

  const { storyTitle, cases } = parsed.data
  const result: JiraPushResult = {
    created: [],
    failed: [],
    projectKey: client.projectKey,
    issueType: client.issueType
  }

  for (const tc of cases) {
    try {
      const adf = buildTestCaseADF(tc, storyTitle)
      const issue = await client.createIssue(`[${tc.id}] ${tc.title}`, adf)
      result.created.push({ ...issue, tcId: tc.id })
    } catch (err) {
      result.failed.push({ tcId: tc.id, error: (err as Error).message })
    }
  }

  res.json(result)
})
