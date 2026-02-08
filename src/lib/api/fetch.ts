// Frontend auth provider for the shared client fetch helper
import { setAuthTokenProvider, fetchWithAuth } from '@embeddr/client-typescript'
import { useUserStore } from '@/store/userStore'

setAuthTokenProvider(() => useUserStore.getState().apiKey)

export { fetchWithAuth }
