import { useWebSocketStream } from "@embeddr/react-ui";

export interface PluginEventPayload {
  [key: string]: any;
}

/**
 * Hook to listen for specific plugin events from the backend via WebSocket.
 *
 * @param eventType The specific event suffix (e.g. "embeddings.generated")
 *                  The hook automatically prefixes "plugin:"
 * @param callback  Function to call when event is received
 */
export function usePluginEvent(eventType: string, callback: (payload: PluginEventPayload) => void) {
  useWebSocketStream((message: any) => {
    const targetType = `plugin:${eventType}`;
    if (message.type === targetType) {
      callback(message.data);
    }
  });
}
