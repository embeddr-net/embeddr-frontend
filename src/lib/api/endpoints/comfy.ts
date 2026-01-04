import { BACKEND_URL } from '../config'

export interface ComfyUploadResult {
  name: string
  subfolder: string
  type: string
}

export async function uploadImageFromPath(
  path: string,
  filename?: string,
  overwrite = false,
): Promise<ComfyUploadResult> {
  const response = await fetch(`${BACKEND_URL}/comfy/upload-from-path`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ path, filename, overwrite }),
  })

  if (!response.ok) {
    throw new Error('Failed to upload image to ComfyUI')
  }
  return response.json()
}

export async function getObjectInfo() {
  const response = await fetch(`${BACKEND_URL}/comfy/object_info`)
  if (!response.ok) {
    throw new Error(`Failed to fetch object info: ${response.statusText}`)
  }
  return response.json()
}
