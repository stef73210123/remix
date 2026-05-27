'use client'

import { useCallback } from 'react'
import { toast } from 'sonner'

export interface DriveFile {
  fileId: string
  fileName: string
  mimeType: string
  accessToken: string
}

// Loaded once per page session
let gapiLoaded = false
let gsiLoaded = false

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve()
      return
    }
    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = reject
    document.head.appendChild(script)
  })
}

async function ensureGapi(): Promise<void> {
  if (gapiLoaded) return
  await loadScript('https://apis.google.com/js/api.js')
  gapiLoaded = true
}

async function ensureGsi(): Promise<void> {
  if (gsiLoaded) return
  await loadScript('https://accounts.google.com/gsi/client')
  gsiLoaded = true
}

function getAccessToken(clientId: string, scope: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope,
      callback: (response: { access_token?: string; error?: string }) => {
        if (response.error) { reject(new Error(response.error)); return }
        if (response.access_token) resolve(response.access_token)
        else reject(new Error('No access token received'))
      },
    })
    tokenClient.requestAccessToken({ prompt: 'consent' })
  })
}

function showPicker(
  accessToken: string,
  apiKey: string,
  onSelect: (file: DriveFile) => void,
  imagesOnly: boolean,
): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gapi = (window as any).gapi
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const google = (window as any).google

  gapi.load('picker', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let view: any
    if (imagesOnly) {
      view = new google.picker.DocsView(google.picker.ViewId.DOCS)
        .setMimeTypes('image/png,image/jpeg,image/jpg,image/gif,image/webp')
    } else {
      view = new google.picker.DocsView(google.picker.ViewId.DOCS)
    }

    const picker = new google.picker.PickerBuilder()
      .addView(view)
      .setOAuthToken(accessToken)
      .setDeveloperKey(apiKey)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .setCallback((data: any) => {
        if (data[google.picker.Response.ACTION] === google.picker.Action.PICKED) {
          const doc = data[google.picker.Response.DOCUMENTS][0]
          onSelect({
            fileId: doc[google.picker.Document.ID],
            fileName: doc[google.picker.Document.NAME],
            mimeType: doc[google.picker.Document.MIME_TYPE] || 'application/octet-stream',
            accessToken,
          })
        }
      })
      .build()

    picker.setVisible(true)
  })
}

export function useGoogleDrivePicker() {
  const openPicker = useCallback(async (
    onSelect: (file: DriveFile) => void,
    options: { imagesOnly?: boolean } = {},
  ) => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

    if (!apiKey || !clientId) {
      toast.error('Google Drive not configured. Contact your administrator.')
      return
    }

    try {
      await Promise.all([ensureGapi(), ensureGsi()])
      const accessToken = await getAccessToken(
        clientId,
        'https://www.googleapis.com/auth/drive.readonly',
      )
      showPicker(accessToken, apiKey, onSelect, options.imagesOnly ?? false)
    } catch (err) {
      console.error('[GoogleDrivePicker]', err)
      toast.error('Failed to open Google Drive picker. Check your API configuration.')
    }
  }, [])

  return { openPicker }
}
