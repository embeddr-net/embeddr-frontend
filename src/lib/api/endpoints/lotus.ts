import { BACKEND_V2_URL } from '../config'

export async function invokeLotus(
  capId: string,
  input: Record<string, any> = {},
): Promise<any> {
  const response = await fetch(`${BACKEND_V2_URL}/lotus/${capId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || 'Lotus invoke failed')
  }

  return response.json()
}

export async function listLotusClients(): Promise<{
  ok: boolean
  clients?: string[]
  count?: number
  details?: Array<{
    client_id: string
    address?: string | null
    user_agent?: string | null
    origin?: string | null
    forwarded_for?: string | null
    path?: string | null
  }>
  error?: string
}> {
  return invokeLotus('embeddr-core.clients.list', {})
}
