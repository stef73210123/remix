import { google } from 'googleapis'
import type { docs_v1 } from 'googleapis'

function getServiceAccountCredentials() {
  const encoded = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (!encoded) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON env var is not set')
  const json = Buffer.from(encoded, 'base64').toString('utf-8')
  return JSON.parse(json)
}

export function getDocsClient() {
  const credentials = getServiceAccountCredentials()
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/documents.readonly'],
  })
  return google.docs({ version: 'v1', auth })
}

/**
 * Fetches a Google Doc by ID and returns the raw document object.
 */
export async function fetchDoc(docId: string): Promise<docs_v1.Schema$Document> {
  const docs = getDocsClient()
  const response = await docs.documents.get({ documentId: docId })
  return response.data
}
