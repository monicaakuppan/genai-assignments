import { GenerateRequest } from './schemas'

export const SYSTEM_PROMPT = `You are an expert QA engineer. Generate functional test cases in JSON format.

RETURN ONLY VALID JSON - NO OTHER TEXT.

JSON Schema:
{
  "analysisSection": {
    "coreFunctionality": "string (1-2 sentences describing core functionality)",
    "keyRisks": ["string (bullet points of critical risks)"],
    "assumptions": ["string (bullet points of assumptions)"],
    "ambiguities": ["string (bullet points of clarifications needed, or empty array)"]
  },
  "coverageMatrix": {
    "Acceptance Criterion 1": ["TC_MODULE_001", "TC_MODULE_002"]
  },
  "cases": [
    {
      "id": "TC_MODULE_001",
      "title": "string (short, action-oriented test title)",
      "category": "string (Functional-Positive|Functional-Negative)",
      "priority": "string (P1|P2|P3|P4)",
      "preconditions": "string (system state before test)",
      "testData": "string (specific input values)",
      "steps": ["atomic action 1", "atomic action 2", "..."],
      "expectedResult": "string (specific, observable, measurable result)",
      "linkedAC": "string (which acceptance criterion this covers)"
    }
  ],
  "exploratoryIdeas": [
    "string (unscripted testing charter 1)",
    "string (unscripted testing charter 2)"
  ],
  "openQuestions": [
    "string (clarification needed from product owner)",
    "string (potential risk or assumption to validate)"
  ]
}

Guidelines:
- Generate ONLY functional test cases (Functional-Positive and Functional-Negative categories)
- Every test = one specific behavior verified
- Tests must be independent and repeatable
- Steps must be atomic and numbered
- Use concrete test data (not generic placeholders)
- P1 = Critical/blocking, P2 = High impact, P3 = Medium/edge cases, P4 = Low/rare
- Apply test design: equivalence partitioning, negative testing
- Cover: positive functional paths and negative/error functional paths only

IMPORTANT: Return ONLY the JSON object. Do not include any explanation, markdown, or other text.`

export function buildPrompt(request: GenerateRequest, mockupDescriptions?: string[]): string {
  const { storyTitle, acceptanceCriteria, description, additionalInfo } = request
  
  let userPrompt = `═══════════════════════════════════════════════════════════════
INPUT
═══════════════════════════════════════════════════════════════
Feature / User Story / Acceptance Criteria:

Story Title: ${storyTitle}

Acceptance Criteria:
${acceptanceCriteria}
`

  if (description) {
    userPrompt += `\nDescription:
${description}
`
  }

  if (additionalInfo) {
    userPrompt += `\nAdditional Context:
${additionalInfo}
`
  }

  if (mockupDescriptions && mockupDescriptions.length > 0) {
    userPrompt += `\nUI Mockup Screens (${mockupDescriptions.length} screen(s) provided — use these to derive realistic test data, verify UI element behaviour, and identify flows not explicit in the acceptance criteria):
${mockupDescriptions.join('\n\n')}
`
  }

  userPrompt += `\n═══════════════════════════════════════════════════════════════
TASK
═══════════════════════════════════════════════════════════════
Generate a comprehensive set of test cases using the analysis and test design techniques outlined in your instructions. Ensure:

1. Analysis Summary - Identify core functionality, key risks, assumptions, and ambiguities
2. Test Coverage Matrix - Map each acceptance criterion to test case IDs
3. Functional Test Cases ONLY - Include preconditions, test data, atomic steps, expected results, and priority; limit to Functional-Positive and Functional-Negative categories
4. Exploratory Testing Ideas - Suggest 3-5 unscripted functional testing areas
5. Open Questions - Flag items needing clarification from product owners

Apply these test design techniques:
- Equivalence partitioning (group similar inputs, test one per group)
- Negative testing (invalid, malformed, missing inputs)
- Decision tables (for combinations of conditions)

Cover ONLY functional categories: Functional-Positive (valid inputs, happy paths, expected workflows) and Functional-Negative (invalid inputs, error paths, rejected actions). Do NOT generate Boundary, Security, Performance, Usability, Compatibility, Data Integrity, or Regression test cases.

Return ONLY the JSON response.`

  return userPrompt
}