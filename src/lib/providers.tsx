export const getProviderInfo = (providerId?: string | null) => {
  const id = providerId?.trim()
  if (!id) return null
  return {
    label: id,
    id,
  }
}

export const getArtifactProviderId = (
  artifact: {
    uri?: string
    metadata_json?: Record<string, any>
  },
  knownProviders?: Set<string>,
) => {
  const uri = artifact.uri || ''
  const metadata = artifact.metadata_json || {}
  const storageBackend = metadata?.storage_backend
  if (storageBackend) return String(storageBackend)

  const schemeMatch = uri.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):\/\//)
  if (schemeMatch) {
    const scheme = schemeMatch[1]
    if (scheme === 'http' || scheme === 'https') return null
    if (knownProviders && !knownProviders.has(scheme)) return null
    return scheme
  }

  return null
}

export const getArtifactImportSource = (artifact: {
  metadata_json?: Record<string, any>
}) => {
  return artifact.metadata_json?.external?.source || null
}

export const getArtifactOrigin = (artifact: {
  metadata_json?: Record<string, any>
}) => {
  return (
    artifact.metadata_json?.origin ||
    artifact.metadata_json?.comfy_meta?.origin ||
    null
  )
}
