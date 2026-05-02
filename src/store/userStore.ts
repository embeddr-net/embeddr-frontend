import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UserState {
  // Profile
  displayName: string;
  setDisplayName: (name: string) => void;

  avatarUrl: string;
  setAvatarUrl: (url: string) => void;

  isOperator: boolean;
  setIsOperator: (isOperator: boolean) => void;

  // Authentication
  apiKey: string | null;
  setApiKey: (key: string | null) => void;

  // Preferences
  activePlugins: Array<string>;
  setActivePlugins: (plugins: Array<string>) => void;
  togglePlugin: (pluginId: string) => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      displayName: "Guest User",
      setDisplayName: (name) => set({ displayName: name }),

      avatarUrl: "",
      setAvatarUrl: (url) => set({ avatarUrl: url }),

      isOperator: false,
      setIsOperator: (isOperator) => set({ isOperator }),

      apiKey: null,
      setApiKey: (key) => set({ apiKey: key }),

      activePlugins: [],
      setActivePlugins: (plugins) => set({ activePlugins: plugins }),
      togglePlugin: (pluginId) =>
        set((state) => {
          const plugins = new Set(state.activePlugins);
          if (plugins.has(pluginId)) {
            plugins.delete(pluginId);
          } else {
            plugins.add(pluginId);
          }
          return { activePlugins: Array.from(plugins) };
        }),
    }),
    {
      name: "embeddr-user-storage",
    },
  ),
);
