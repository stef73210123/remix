import { google } from 'googleapis'

function getServiceAccountCredentials() {
  const encoded = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (!encoded) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON env var is not set')
  const json = Buffer.from(encoded, 'base64').toString('utf-8')
  return JSON.parse(json)
}

export function getSheetsClient() {
  const credentials = getServiceAccountCredentials()
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
  return google.sheets({ version: 'v4', auth })
}

export function getSheetId(): string {
  const id = process.env.GOOGLE_SHEET_ID
  if (!id) throw new Error('GOOGLE_SHEET_ID env var is not set')
  return id
}

/**
 * Reads a tab range and returns rows as string[][] (skipping the header row).
 * Pass includeHeader=true to get header row as first element.
 */
export async function readSheetRange(
  tab: string,
  range?: string,
  includeHeader = false
): Promise<string[][]> {
  const sheets = getSheetsClient()
  const spreadsheetId = getSheetId()
  const fullRange = range ? `${tab}!${range}` : tab

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: fullRange,
  })

  const rows = (response.data.values as string[][]) || []
  if (rows.length === 0) return []
  return includeHeader ? rows : rows.slice(1)
}

/**
 * Appends a row to a sheet tab.
 */
export async function appendSheetRow(tab: string, values: string[]): Promise<void> {
  const sheets = getSheetsClient()
  const spreadsheetId = getSheetId()
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: tab,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [values] },
  })
}

/**
 * Updates a specific row by row index (1-based, including header).
 */
export async function updateSheetRow(
  tab: string,
  rowIndex: number,
  values: string[]
): Promise<void> {
  const sheets = getSheetsClient()
  const spreadsheetId = getSheetId()
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${tab}!A${rowIndex}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [values] },
  })
}

/**
 * Finds the row index (1-based, including header) where column A matches value.
 * Returns -1 if not found.
 */
export async function findRowIndex(tab: string, matchValue: string): Promise<number> {
  const rows = await readSheetRange(tab, undefined, true)
  for (let i = 0; i < rows.length; i++) {
    if (rows[i][0] === matchValue) return i + 1
  }
  return -1
}
