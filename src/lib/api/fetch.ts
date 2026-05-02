import { createFetchWithAuth } from "@embeddr/client-typescript";
import { useUserStore } from "@/store/userStore";

export const fetchWithAuth = createFetchWithAuth({
  getToken: () => useUserStore.getState().apiKey,
});
