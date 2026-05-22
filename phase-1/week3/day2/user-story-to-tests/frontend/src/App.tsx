import { useState, useEffect } from 'react'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { generateTests, fetchJiraIssue, fetchJiraStatus, attachExcelToJira, generateFeatureFile } from './api'
import { GenerateRequest, GenerateResponse, TestCase, JiraAttachResult, JiraStatus } from './types'

function App() {
  const [formData, setFormData] = useState<GenerateRequest>({
    storyTitle: '',
    acceptanceCriteria: '',
    description: '',
    additionalInfo: ''
  })
  const [results, setResults] = useState<GenerateResponse | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedTestCases, setExpandedTestCases] = useState<Set<string>>(new Set())
  const [mockupPreviews, setMockupPreviews] = useState<string[]>([])
  const [jiraKey, setJiraKey] = useState('')
  const [jiraImporting, setJiraImporting] = useState(false)
  const [jiraImportError, setJiraImportError] = useState<string | null>(null)
  const [jiraStatus, setJiraStatus] = useState<JiraStatus | null>(null)
  const [jiraPushing, setJiraPushing] = useState(false)
  const [jiraAttachResult, setJiraAttachResult] = useState<JiraAttachResult | null>(null)
  const [featureContent, setFeatureContent] = useState<string | null>(null)
  const [isGeneratingFeature, setIsGeneratingFeature] = useState(false)
  const [featureError, setFeatureError] = useState<string | null>(null)
  const [featureCopied, setFeatureCopied] = useState(false)

  const toggleTestCaseExpansion = (testCaseId: string) => {
    const newExpanded = new Set(expandedTestCases)
    if (newExpanded.has(testCaseId)) {
      newExpanded.delete(testCaseId)
    } else {
      newExpanded.add(testCaseId)
    }
    setExpandedTestCases(newExpanded)
  }

  const handleJiraImport = async () => {
    if (!jiraKey.trim()) return
    setJiraImporting(true)
    setJiraImportError(null)
    try {
      const data = await fetchJiraIssue(jiraKey.trim().toUpperCase())
      setFormData(prev => ({
        ...prev,
        storyTitle: data.storyTitle || prev.storyTitle,
        description: data.description || prev.description,
        acceptanceCriteria: data.acceptanceCriteria || prev.acceptanceCriteria,
      }))
      if (data.mockupImages?.length) {
        setMockupPreviews(prev => [...prev, ...data.mockupImages!])
      }
    } catch (err) {
      setJiraImportError(err instanceof Error ? err.message : 'Failed to fetch JIRA issue')
    } finally {
      setJiraImporting(false)
    }
  }

  const handleJiraPush = async () => {
    if (!results || !jiraKey.trim()) return
    setJiraPushing(true)
    setJiraAttachResult(null)
    try {
      const rows = results.cases.map(tc => ({
        'ID': tc.id,
        'Title': tc.title,
        'Category': tc.category,
        'Priority': tc.priority || '',
        'Preconditions': tc.preconditions || '',
        'Test Data': tc.testData || '',
        'Steps': tc.steps.map((s, i) => `${i + 1}. ${s}`).join('\n'),
        'Expected Result': tc.expectedResult,
        'Linked AC': tc.linkedAC || ''
      }))
      const ws = XLSX.utils.json_to_sheet(rows)
      ws['!cols'] = [20, 40, 22, 10, 30, 25, 50, 35, 25].map(w => ({ wch: w }))
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Test Cases')
      const fileBase64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' }) as string
      const filename = `${safeFilename}.xlsx`
      const result = await attachExcelToJira(jiraKey.trim().toUpperCase(), filename, fileBase64)
      setJiraAttachResult(result)
    } catch (err) {
      setJiraAttachResult({ success: false, error: err instanceof Error ? err.message : 'Unknown error' })
    } finally {
      setJiraPushing(false)
    }
  }

  useEffect(() => {
    fetchJiraStatus().then(setJiraStatus).catch(() => setJiraStatus(null))
  }, [])

  const handleImageFiles = (files: FileList | null) => {
    if (!files) return
    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) return
      const reader = new FileReader()
      reader.onload = e => {
        const dataUrl = e.target?.result as string
        setMockupPreviews(prev => [...prev, dataUrl])
      }
      reader.readAsDataURL(file)
    })
  }

  const removeImage = (index: number) => {
    setMockupPreviews(prev => prev.filter((_, i) => i !== index))
  }

  const handleGenerateFeature = async () => {
    if (!results) return
    setIsGeneratingFeature(true)
    setFeatureError(null)
    setFeatureContent(null)
    try {
      const content = await generateFeatureFile(
        formData.storyTitle,
        formData.acceptanceCriteria,
        results.cases
      )
      setFeatureContent(content)
    } catch (err) {
      setFeatureError(err instanceof Error ? err.message : 'Failed to generate feature file')
    } finally {
      setIsGeneratingFeature(false)
    }
  }

  const downloadFeatureFile = () => {
    if (!featureContent) return
    const blob = new Blob([featureContent], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${safeFilename}.feature`
    a.click()
    URL.revokeObjectURL(url)
  }

  const copyFeatureFile = () => {
    if (!featureContent) return
    navigator.clipboard.writeText(featureContent).then(() => {
      setFeatureCopied(true)
      setTimeout(() => setFeatureCopied(false), 2000)
    })
  }

  const safeFilename = (formData.storyTitle || 'test-cases')
    .replace(/[^a-z0-9]/gi, '-')
    .toLowerCase()

  const downloadExcel = () => {
    if (!results) return
    const rows = results.cases.map(tc => ({
      'ID': tc.id,
      'Title': tc.title,
      'Category': tc.category,
      'Priority': tc.priority || '',
      'Preconditions': tc.preconditions || '',
      'Test Data': tc.testData || '',
      'Steps': tc.steps.map((s, i) => `${i + 1}. ${s}`).join('\n'),
      'Expected Result': tc.expectedResult,
      'Linked AC': tc.linkedAC || ''
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    ws['!cols'] = [20, 40, 22, 10, 30, 25, 50, 35, 25].map(w => ({ wch: w }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Test Cases')
    XLSX.writeFile(wb, `${safeFilename}.xlsx`)
  }

  const downloadPDF = () => {
    if (!results) return
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a3' })
    doc.setFontSize(14)
    doc.text(`Test Cases: ${formData.storyTitle || 'Generated'}`, 40, 40)
    doc.setFontSize(10)
    doc.text(`${results.cases.length} test case(s)  •  ${new Date().toLocaleDateString()}`, 40, 58)
    autoTable(doc, {
      head: [['ID', 'Title', 'Category', 'Priority', 'Preconditions', 'Test Data', 'Steps', 'Expected Result', 'Linked AC']],
      body: results.cases.map(tc => [
        tc.id,
        tc.title,
        tc.category,
        tc.priority || '',
        tc.preconditions || '',
        tc.testData || '',
        tc.steps.map((s, i) => `${i + 1}. ${s}`).join('\n'),
        tc.expectedResult,
        tc.linkedAC || ''
      ]),
      startY: 70,
      styles: { fontSize: 7, cellPadding: 4, overflow: 'linebreak' },
      headStyles: { fillColor: [52, 152, 219], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 249, 250] },
      columnStyles: {
        0: { cellWidth: 65 },
        1: { cellWidth: 110 },
        2: { cellWidth: 75 },
        3: { cellWidth: 45 },
        4: { cellWidth: 90 },
        5: { cellWidth: 80 },
        6: { cellWidth: 130 },
        7: { cellWidth: 110 },
        8: { cellWidth: 75 }
      }
    })
    doc.save(`${safeFilename}.pdf`)
  }

  const handleInputChange = (field: keyof GenerateRequest, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.storyTitle.trim() || !formData.acceptanceCriteria.trim()) {
      setError('Story Title and Acceptance Criteria are required')
      return
    }

    setIsLoading(true)
    setError(null)
    
    try {
      const response = await generateTests({
        ...formData,
        mockupImages: mockupPreviews.length > 0 ? mockupPreviews : undefined
      })
      setResults(response)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate tests')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div>
      <style>{`
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
          background-color: #f5f5f5;
          color: #333;
          line-height: 1.6;
        }
        
        .container {
          max-width: 95%;
          width: 100%;
          margin: 0 auto;
          padding: 20px;
          min-height: 100vh;
        }
        
        @media (min-width: 768px) {
          .container {
            max-width: 90%;
            padding: 30px;
          }
        }
        
        @media (min-width: 1024px) {
          .container {
            max-width: 85%;
            padding: 40px;
          }
        }
        
        @media (min-width: 1440px) {
          .container {
            max-width: 1800px;
            padding: 50px;
          }
        }
        
        .header {
          text-align: center;
          margin-bottom: 40px;
        }
        
        .title {
          font-size: 2.5rem;
          color: #2c3e50;
          margin-bottom: 10px;
        }
        
        .subtitle {
          color: #666;
          font-size: 1.1rem;
        }
        
        .form-container {
          background: white;
          border-radius: 8px;
          padding: 30px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          margin-bottom: 30px;
        }
        
        .form-group {
          margin-bottom: 20px;
        }
        
        .form-label {
          display: block;
          font-weight: 600;
          margin-bottom: 8px;
          color: #2c3e50;
        }
        
        .form-input, .form-textarea {
          width: 100%;
          padding: 12px;
          border: 2px solid #e1e8ed;
          border-radius: 6px;
          font-size: 14px;
          transition: border-color 0.2s;
        }
        
        .form-input:focus, .form-textarea:focus {
          outline: none;
          border-color: #3498db;
        }
        
        .form-textarea {
          resize: vertical;
          min-height: 100px;
        }
        
        .submit-btn {
          background: #3498db;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 6px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .submit-btn:hover:not(:disabled) {
          background: #2980b9;
        }
        
        .submit-btn:disabled {
          background: #bdc3c7;
          cursor: not-allowed;
        }
        
        .error-banner {
          background: #e74c3c;
          color: white;
          padding: 15px;
          border-radius: 6px;
          margin-bottom: 20px;
        }
        
        .loading {
          text-align: center;
          padding: 40px;
          color: #666;
          font-size: 18px;
        }
        
        .results-container {
          background: white;
          border-radius: 8px;
          padding: 30px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .results-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 20px;
          padding-bottom: 15px;
          border-bottom: 2px solid #e1e8ed;
        }

        .results-header-left {
          flex: 1;
        }

        .download-buttons {
          display: flex;
          gap: 10px;
          flex-shrink: 0;
        }

        .download-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.2s, transform 0.1s;
          white-space: nowrap;
        }

        .download-btn:active {
          transform: scale(0.97);
        }

        .download-btn-excel {
          background: #217346;
          color: white;
        }

        .download-btn-excel:hover {
          background: #1a5c38;
        }

        .download-btn-pdf {
          background: #e74c3c;
          color: white;
        }

        .download-btn-pdf:hover {
          background: #c0392b;
        }
        
        .results-title {
          font-size: 1.8rem;
          color: #2c3e50;
          margin-bottom: 10px;
        }
        
        .results-meta {
          color: #666;
          font-size: 14px;
        }
        
        .table-container {
          overflow-x: auto;
        }
        
        .results-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
        }
        
        .results-table th,
        .results-table td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid #e1e8ed;
        }
        
        .results-table th {
          background: #f8f9fa;
          font-weight: 600;
          color: #2c3e50;
        }
        
        .results-table tr:hover {
          background: #f8f9fa;
        }
        
        .category-positive { color: #27ae60; font-weight: 600; }
        .category-negative { color: #e74c3c; font-weight: 600; }
        .category-edge { color: #f39c12; font-weight: 600; }
        .category-authorization { color: #9b59b6; font-weight: 600; }
        .category-non-functional { color: #34495e; font-weight: 600; }
        
        .test-case-id {
          cursor: pointer;
          color: #3498db;
          font-weight: 600;
          padding: 8px 12px;
          border-radius: 4px;
          transition: background-color 0.2s;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        
        .test-case-id:hover {
          background: #f8f9fa;
        }
        
        .test-case-id.expanded {
          background: #e3f2fd;
          color: #1976d2;
        }
        
        .expand-icon {
          font-size: 10px;
          transition: transform 0.2s;
        }
        
        .expand-icon.expanded {
          transform: rotate(90deg);
        }
        
        .expanded-details {
          margin-top: 15px;
          background: #fafbfc;
          border: 1px solid #e1e8ed;
          border-radius: 8px;
          padding: 20px;
        }
        
        .step-item {
          background: white;
          border: 1px solid #e1e8ed;
          border-radius: 6px;
          padding: 15px;
          margin-bottom: 12px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        
        .step-header {
          display: grid;
          grid-template-columns: 80px 1fr 1fr 1fr;
          gap: 15px;
          align-items: start;
        }
        
        .step-id {
          font-weight: 600;
          color: #2c3e50;
          background: #f8f9fa;
          padding: 4px 8px;
          border-radius: 4px;
          text-align: center;
          font-size: 12px;
        }
        
        .step-description {
          color: #2c3e50;
          line-height: 1.5;
        }
        
        .step-test-data {
          color: #666;
          font-style: italic;
          font-size: 14px;
        }
        
        .step-expected {
          color: #27ae60;
          font-weight: 500;
          font-size: 14px;
        }
        
        .step-labels {
          display: grid;
          grid-template-columns: 80px 1fr 1fr 1fr;
          gap: 15px;
          margin-bottom: 10px;
          font-weight: 600;
          color: #666;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .analysis-section {
          background: #f0f4ff;
          border-left: 4px solid #3498db;
          padding: 20px;
          border-radius: 6px;
          margin-bottom: 30px;
        }
        
        .analysis-section h3 {
          color: #2c3e50;
          margin-bottom: 15px;
          font-size: 1.1rem;
        }
        
        .analysis-subsection {
          margin-bottom: 15px;
        }
        
        .analysis-subsection h4 {
          color: #34495e;
          font-size: 0.95rem;
          margin-bottom: 8px;
        }
        
        .analysis-list {
          list-style-position: inside;
          color: #555;
          line-height: 1.8;
        }
        
        .analysis-list li {
          margin-bottom: 6px;
        }
        
        .exploratory-section, .questions-section {
          background: #fff9e6;
          border-left: 4px solid #f39c12;
          padding: 20px;
          border-radius: 6px;
          margin-bottom: 30px;
        }
        
        .exploratory-section h3, .questions-section h3 {
          color: #2c3e50;
          margin-bottom: 15px;
          font-size: 1.1rem;
        }
        
        .questions-section {
          background: #ffe6e6;
          border-left-color: #e74c3c;
        }

        .jira-import-bar {
          background: white;
          border-radius: 8px;
          padding: 16px 20px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .jira-import-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 600;
          color: #0052CC;
          font-size: 14px;
          white-space: nowrap;
        }

        .jira-logo {
          width: 20px;
          height: 20px;
        }

        .jira-key-input {
          padding: 8px 12px;
          border: 2px solid #e1e8ed;
          border-radius: 6px;
          font-size: 14px;
          width: 160px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-family: monospace;
          transition: border-color 0.2s;
        }

        .jira-key-input:focus {
          outline: none;
          border-color: #0052CC;
        }

        .jira-load-btn {
          padding: 8px 18px;
          background: #0052CC;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.2s;
          white-space: nowrap;
        }

        .jira-load-btn:hover:not(:disabled) {
          background: #0747A6;
        }

        .jira-load-btn:disabled {
          background: #bdc3c7;
          cursor: not-allowed;
        }

        .jira-import-error {
          color: #e74c3c;
          font-size: 13px;
          flex-basis: 100%;
          margin-top: 4px;
        }

        .jira-not-configured {
          color: #888;
          font-size: 13px;
          font-style: italic;
        }

        .download-btn-jira {
          background: #0052CC;
          color: white;
        }

        .download-btn-jira:hover:not(:disabled) {
          background: #0747A6;
        }

        .download-btn-jira:disabled {
          background: #bdc3c7;
          cursor: not-allowed;
        }

        .jira-push-result {
          background: #f0f7ff;
          border-left: 4px solid #0052CC;
          border-radius: 6px;
          padding: 16px 20px;
          margin-bottom: 24px;
        }

        .jira-push-result h3 {
          color: #0052CC;
          margin-bottom: 12px;
          font-size: 1rem;
        }

        .jira-created-list {
          list-style: none;
          margin-bottom: 10px;
        }

        .jira-created-list li {
          padding: 4px 0;
          font-size: 13px;
          color: #333;
        }

        .jira-created-list a {
          color: #0052CC;
          font-weight: 600;
          text-decoration: none;
          margin-right: 6px;
        }

        .jira-created-list a:hover {
          text-decoration: underline;
        }

        .jira-failed-list {
          list-style: none;
          margin-top: 8px;
        }

        .jira-failed-list li {
          padding: 3px 0;
          font-size: 12px;
          color: #e74c3c;
        }

        .mockup-upload-zone {
          border: 2px dashed #c0cdd8;
          border-radius: 8px;
          padding: 20px;
          cursor: pointer;
          transition: border-color 0.2s, background 0.2s;
          background: #fafbfc;
          min-height: 80px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .mockup-upload-zone:hover {
          border-color: #3498db;
          background: #f0f7ff;
        }

        .mockup-upload-hint {
          color: #888;
          font-size: 14px;
          text-align: center;
          pointer-events: none;
        }

        .mockup-thumbnails {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          align-items: center;
          width: 100%;
        }

        .mockup-thumb {
          position: relative;
          width: 90px;
          height: 70px;
          border-radius: 6px;
          overflow: hidden;
          border: 1px solid #ddd;
          flex-shrink: 0;
        }

        .mockup-thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .mockup-thumb-remove {
          position: absolute;
          top: 2px;
          right: 2px;
          background: rgba(0,0,0,0.6);
          color: white;
          border: none;
          border-radius: 50%;
          width: 18px;
          height: 18px;
          font-size: 11px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          line-height: 1;
          padding: 0;
        }

        .mockup-thumb-remove:hover {
          background: #e74c3c;
        }

        .mockup-add-more {
          color: #3498db;
          font-size: 13px;
          padding: 8px 12px;
          border: 1px dashed #3498db;
          border-radius: 6px;
          white-space: nowrap;
        }

        .download-btn-feature {
          background: #27ae60;
          color: white;
        }
        .download-btn-feature:hover:not(:disabled) {
          background: #1e8449;
        }
        .download-btn-feature:disabled {
          background: #bdc3c7;
          cursor: not-allowed;
        }

        .feature-section {
          background: #1e1e2e;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 30px;
        }
        .feature-section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 14px;
        }
        .feature-section-title {
          color: #cdd6f4;
          font-size: 1rem;
          font-weight: 600;
          font-family: monospace;
        }
        .feature-action-btns {
          display: flex;
          gap: 8px;
        }
        .feature-action-btn {
          padding: 6px 14px;
          border: none;
          border-radius: 5px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s;
        }
        .feature-action-btn-copy {
          background: #313244;
          color: #cdd6f4;
        }
        .feature-action-btn-copy:hover {
          background: #45475a;
        }
        .feature-action-btn-download {
          background: #27ae60;
          color: white;
        }
        .feature-action-btn-download:hover {
          background: #1e8449;
        }
        .feature-code {
          margin: 0;
          font-family: 'Fira Code', 'Cascadia Code', 'Consolas', monospace;
          font-size: 13px;
          line-height: 1.6;
          color: #cdd6f4;
          white-space: pre-wrap;
          word-break: break-word;
          max-height: 520px;
          overflow-y: auto;
        }
        .feature-error {
          color: #f38ba8;
          font-size: 13px;
          margin-top: 8px;
        }
      `}</style>
      
      <div className="container">
        <div className="header">
          <h1 className="title">User Story to Tests</h1>
          <p className="subtitle">Generate comprehensive test cases from your user stories</p>
        </div>
        
        <div className="jira-import-bar">
          <span className="jira-import-label">
            <svg className="jira-logo" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15.999 0C7.163 0 0 7.163 0 16s7.163 16 16 16 16-7.163 16-16S24.836 0 15.999 0z" fill="#0052CC"/>
              <path d="M23.5 8.5h-6a1 1 0 000 2h3.586l-9.793 9.793a1 1 0 101.414 1.414L22.5 11.914V15.5a1 1 0 002 0v-6a1 1 0 00-1-1z" fill="white"/>
            </svg>
            Import from JIRA
          </span>
          {jiraStatus && !jiraStatus.configured && (
            <span className="jira-not-configured">Not configured — fill JIRA_* fields in .env</span>
          )}
          {(!jiraStatus || jiraStatus.configured) && (
            <>
              <input
                className="jira-key-input"
                placeholder="e.g. PROJ-123"
                value={jiraKey}
                onChange={e => { setJiraKey(e.target.value); setJiraImportError(null) }}
                onKeyDown={e => e.key === 'Enter' && handleJiraImport()}
                disabled={jiraImporting}
              />
              <button
                className="jira-load-btn"
                onClick={handleJiraImport}
                disabled={jiraImporting || !jiraKey.trim()}
                type="button"
              >
                {jiraImporting ? 'Loading…' : 'Load'}
              </button>
            </>
          )}
          {jiraImportError && <span className="jira-import-error">{jiraImportError}</span>}
        </div>

        <form onSubmit={handleSubmit} className="form-container">
          <div className="form-group">
            <label htmlFor="storyTitle" className="form-label">
              Story Title *
            </label>
            <input
              type="text"
              id="storyTitle"
              className="form-input"
              value={formData.storyTitle}
              onChange={(e) => handleInputChange('storyTitle', e.target.value)}
              placeholder="Enter the user story title..."
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="description" className="form-label">
              Description
            </label>
            <textarea
              id="description"
              className="form-textarea"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Additional description (optional)..."
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="acceptanceCriteria" className="form-label">
              Acceptance Criteria *
            </label>
            <textarea
              id="acceptanceCriteria"
              className="form-textarea"
              value={formData.acceptanceCriteria}
              onChange={(e) => handleInputChange('acceptanceCriteria', e.target.value)}
              placeholder="Enter the acceptance criteria..."
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="additionalInfo" className="form-label">
              Additional Info
            </label>
            <textarea
              id="additionalInfo"
              className="form-textarea"
              value={formData.additionalInfo}
              onChange={(e) => handleInputChange('additionalInfo', e.target.value)}
              placeholder="Any additional information (optional)..."
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              Mockup Screens
              <span style={{ fontWeight: 400, color: '#888', marginLeft: 8 }}>optional — images are analysed by a vision model to enrich test context</span>
            </label>
            <div
              className="mockup-upload-zone"
              onClick={() => (document.getElementById('mockup-file-input') as HTMLInputElement)?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); handleImageFiles(e.dataTransfer.files) }}
            >
              {mockupPreviews.length === 0 ? (
                <p className="mockup-upload-hint">Click or drag &amp; drop images here (PNG, JPG, etc.)</p>
              ) : (
                <div className="mockup-thumbnails">
                  {mockupPreviews.map((src, i) => (
                    <div key={i} className="mockup-thumb">
                      <img src={src} alt={`Mockup ${i + 1}`} />
                      <button
                        type="button"
                        className="mockup-thumb-remove"
                        onClick={e => { e.stopPropagation(); removeImage(i) }}
                        title="Remove"
                      >×</button>
                    </div>
                  ))}
                  <div className="mockup-add-more">+ Add more</div>
                </div>
              )}
            </div>
            <input
              id="mockup-file-input"
              type="file"
              accept="image/*"
              multiple
              style={{ display: 'none' }}
              onChange={e => { handleImageFiles(e.target.files); e.target.value = '' }}
            />
          </div>

          <button
            type="submit"
            className="submit-btn"
            disabled={isLoading}
          >
            {isLoading
              ? mockupPreviews.length > 0 ? 'Analysing screens & generating…' : 'Generating...'
              : 'Generate'}
          </button>
        </form>

        {error && (
          <div className="error-banner">
            {error}
          </div>
        )}

        {isLoading && (
          <div className="loading">
            Generating test cases...
          </div>
        )}

        {results && (
          <div className="results-container">
            <div className="results-header">
              <div className="results-header-left">
                <h2 className="results-title">Generated Test Cases</h2>
                <div className="results-meta">
                  {results.cases.length} test case(s) generated
                  {results.model && ` • Model: ${results.model}`}
                  {results.promptTokens > 0 && ` • Tokens: ${results.promptTokens + results.completionTokens}`}
                </div>
              </div>
              <div className="download-buttons">
                <button className="download-btn download-btn-excel" onClick={downloadExcel}>
                  ⬇ Excel
                </button>
                <button className="download-btn download-btn-pdf" onClick={downloadPDF}>
                  ⬇ PDF
                </button>
                <button
                  className="download-btn download-btn-feature"
                  onClick={handleGenerateFeature}
                  disabled={isGeneratingFeature}
                >
                  {isGeneratingFeature ? 'Generating…' : '⬇ BDD Feature'}
                </button>
                {jiraStatus?.configured && (
                  <button
                    className="download-btn download-btn-jira"
                    onClick={handleJiraPush}
                    disabled={jiraPushing || !jiraKey.trim()}
                    title={!jiraKey.trim() ? 'Enter a JIRA issue key above first' : undefined}
                  >
                    {jiraPushing ? 'Pushing…' : '↑ Push to JIRA'}
                  </button>
                )}
              </div>
            </div>
            
            {jiraAttachResult && (
              <div className="jira-push-result">
                {jiraAttachResult.success ? (
                  <h3>
                    Excel attached to{' '}
                    {jiraAttachResult.issueUrl ? (
                      <a href={jiraAttachResult.issueUrl} target="_blank" rel="noreferrer">
                        {jiraAttachResult.issueKey}
                      </a>
                    ) : (
                      jiraAttachResult.issueKey
                    )}
                    {jiraAttachResult.filename && ` — ${jiraAttachResult.filename}`}
                  </h3>
                ) : (
                  <ul className="jira-failed-list">
                    <li>Failed to attach: {jiraAttachResult.error}</li>
                  </ul>
                )}
              </div>
            )}

            {(featureContent || featureError) && (
              <div className="feature-section">
                <div className="feature-section-header">
                  <span className="feature-section-title">
                    {safeFilename}.feature — {results?.cases.length} scenario(s)
                  </span>
                  {featureContent && (
                    <div className="feature-action-btns">
                      <button className="feature-action-btn feature-action-btn-copy" onClick={copyFeatureFile}>
                        {featureCopied ? 'Copied!' : 'Copy'}
                      </button>
                      <button className="feature-action-btn feature-action-btn-download" onClick={downloadFeatureFile}>
                        ⬇ Download .feature
                      </button>
                    </div>
                  )}
                </div>
                {featureContent
                  ? <pre className="feature-code">{featureContent}</pre>
                  : <p className="feature-error">{featureError}</p>
                }
              </div>
            )}

            {results.analysisSection && (
              <div className="analysis-section">
                <h3>📊 Analysis Summary</h3>
                
                <div className="analysis-subsection">
                  <h4>Core Functionality</h4>
                  <p style={{color: '#555'}}>{results.analysisSection.coreFunctionality}</p>
                </div>
                
                {results.analysisSection.keyRisks && results.analysisSection.keyRisks.length > 0 && (
                  <div className="analysis-subsection">
                    <h4>Key Risks Identified</h4>
                    <ul className="analysis-list">
                      {results.analysisSection.keyRisks.map((risk, idx) => (
                        <li key={idx}>{risk}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {results.analysisSection.assumptions && results.analysisSection.assumptions.length > 0 && (
                  <div className="analysis-subsection">
                    <h4>Assumptions Made</h4>
                    <ul className="analysis-list">
                      {results.analysisSection.assumptions.map((assumption, idx) => (
                        <li key={idx}>{assumption}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {results.analysisSection.ambiguities && results.analysisSection.ambiguities.length > 0 && (
                  <div className="analysis-subsection">
                    <h4>Ambiguities / Clarifications Needed</h4>
                    <ul className="analysis-list">
                      {results.analysisSection.ambiguities.map((ambiguity, idx) => (
                        <li key={idx}>{ambiguity}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
            
            <div className="table-container">
              <table className="results-table">
                <thead>
                  <tr>
                    <th>Test Case ID</th>
                    <th>Title</th>
                    <th>Category</th>
                    <th>Expected Result</th>
                  </tr>
                </thead>
                <tbody>
                  {results.cases.map((testCase: TestCase) => (
                    <>
                      <tr key={testCase.id}>
                        <td>
                          <div 
                            className={`test-case-id ${expandedTestCases.has(testCase.id) ? 'expanded' : ''}`}
                            onClick={() => toggleTestCaseExpansion(testCase.id)}
                          >
                            <span className={`expand-icon ${expandedTestCases.has(testCase.id) ? 'expanded' : ''}`}>
                              ▶
                            </span>
                            {testCase.id}
                          </div>
                        </td>
                        <td>{testCase.title}</td>
                        <td>
                          <span className={`category-${testCase.category.toLowerCase()}`}>
                            {testCase.category}
                          </span>
                        </td>
                        <td>{testCase.expectedResult}</td>
                      </tr>
                      {expandedTestCases.has(testCase.id) && (
                        <tr key={`${testCase.id}-details`}>
                          <td colSpan={4}>
                            <div className="expanded-details">
                              <h4 style={{marginBottom: '15px', color: '#2c3e50'}}>Test Steps for {testCase.id}</h4>
                              <div className="step-labels">
                                <div>Step ID</div>
                                <div>Step Description</div>
                                <div>Test Data</div>
                                <div>Expected Result</div>
                              </div>
                              {testCase.steps.map((step, index) => (
                                <div key={index} className="step-item">
                                  <div className="step-header">
                                    <div className="step-id">S{String(index + 1).padStart(2, '0')}</div>
                                    <div className="step-description">{step}</div>
                                    <div className="step-test-data">{testCase.testData || 'N/A'}</div>
                                    <div className="step-expected">
                                      {index === testCase.steps.length - 1 ? testCase.expectedResult : 'Step completed successfully'}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
            
            {results.exploratoryIdeas && results.exploratoryIdeas.length > 0 && (
              <div className="exploratory-section">
                <h3>🔍 Exploratory Testing Ideas</h3>
                <ul className="analysis-list">
                  {results.exploratoryIdeas.map((idea, idx) => (
                    <li key={idx}>{idea}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {results.openQuestions && results.openQuestions.length > 0 && (
              <div className="questions-section">
                <h3>❓ Open Questions / Risks</h3>
                <ul className="analysis-list">
                  {results.openQuestions.map((question, idx) => (
                    <li key={idx}>{question}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default App