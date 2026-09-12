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

// Initialize the WebSocket connection
export async function initSurreal(): Promise<void> {
  if (surreal.status === 'connected') return;

  try {
    await surreal.connect(DB_CONFIG.endpoint);
    await surreal.use({
      namespace: DB_CONFIG.namespace,
      database: DB_CONFIG.database,
    });
    console.log(' [SurrealDB] Connected to WebSocket at', DB_CONFIG.endpoint);
  } catch (err) {
    console.error(' [SurrealDB] Connection failed:', err);
    throw err;
  }
}