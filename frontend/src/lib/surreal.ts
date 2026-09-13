// frontend/src/lib/surreal.ts
import { Surreal } from 'surrealdb';

// Create a single shared instance of the SurrealDB client
export const surreal = new Surreal();

// Connection configuration constants
export const DB_CONFIG = {
  endpoint: 'ws://localhost:8000/rpc',
  namespace: 'discord_clone',
  database: 'dev',
  access: 'account',
};

// In-flight connection promise to prevent concurrent race conditions (e.g. React StrictMode)
let connectingPromise: Promise<void> | null = null;

// Initialize the WebSocket connection safely
export async function initSurreal(): Promise<void> {
  if (surreal.status === 'connected') return;
  if (connectingPromise) return connectingPromise;

  connectingPromise = (async () => {
    try {
      if (surreal.status === 'disconnected') {
        await surreal.connect(DB_CONFIG.endpoint);
      }
      await surreal.ready;
      await surreal.use({
        namespace: DB_CONFIG.namespace,
        database: DB_CONFIG.database,
      });
      console.log(' [SurrealDB] Connected to WebSocket at', DB_CONFIG.endpoint);
    } catch (err) {
      console.error(' [SurrealDB] Connection failed:', err);
      throw err;
    } finally {
      connectingPromise = null;
    }
  })();

  return connectingPromise;
}