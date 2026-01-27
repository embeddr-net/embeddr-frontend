import { createEmbeddrApi } from '@embeddr/api'
import { embeddrApi as embeddrApiV2 } from '@/lib/api/v2/client'
import { BACKEND_V2_URL } from './config'

const coreApi = createEmbeddrApi({
  baseUrl: BACKEND_V2_URL,
  lotusBase: `${BACKEND_V2_URL}/lotus`,
})

type CombinedApi = Omit<
  typeof embeddrApiV2,
  'artifacts' | 'lotus' | 'library' | 'collections'
> & {
  artifacts: typeof embeddrApiV2.artifacts
  lotus: typeof embeddrApiV2.lotus & typeof coreApi.lotus
  // Use the shared client implementation for library/collections
  library: typeof coreApi.collections
  collections: typeof coreApi.collections
}

export const embeddrApi: CombinedApi = {
  ...embeddrApiV2,
  artifacts: {
    ...embeddrApiV2.artifacts,
    ...coreApi.artifacts,
  } as unknown as typeof embeddrApiV2.artifacts,
  lotus: {
    ...coreApi.lotus,
    ...embeddrApiV2.lotus,
  },
  // Explicitly substitute the library/collections implementation from the shared coreApi.
  // This ensures we use the proper class-based implementation (retaining getters/methods)
  // and fixes the issue where spreading embeddrApiV2 lost the 'library' getter property.
  library: coreApi.collections,
  collections: coreApi.collections,
}
