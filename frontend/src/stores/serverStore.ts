// frontend/src/stores/serverStore.ts
import { create } from 'zustand';
import { surreal } from '../lib/surreal';

export interface Server {
  id: string;
  name: string;
  icon?: string | null;
  owner: string;
  created_at: string;
}

interface ServerState {
  servers: Server[];
  activeServer: Server | null;
  loading: boolean;
  error: string | null;

  // Actions
  fetchServers: () => Promise<void>;
  setActiveServer: (server: Server | null) => void;
  createServer: (name: string) => Promise<Server>;
}

export const useServerStore = create<ServerState>((set, get) => ({
  servers: [],
  activeServer: null,
  loading: false,
  error: null,

  // 1. Fetch all servers the authenticated user belongs to
  fetchServers: async () => {
    set({ loading: true, error: null });
    try {
      // Table permissions automatically scope this to $auth->member_of->server
      const [result] = await surreal.query<[any[]]>(
        'SELECT id, name, icon, owner, created_at FROM server ORDER BY created_at ASC;'
      );

      const rawServers = Array.isArray(result) ? result : [];
      const formattedServers: Server[] = rawServers.map((raw) => ({
        id: String(raw.id),
        name: String(raw.name),
        icon: raw.icon ? String(raw.icon) : null,
        owner: String(raw.owner),
        created_at: String(raw.created_at),
      }));

      set({
        servers: formattedServers,
        loading: false,
        // Auto-select first server if none is currently selected
        activeServer: get().activeServer || formattedServers[0] || null,
      });
    } catch (err: any) {
      console.error('Failed to fetch servers:', err);
      set({ error: err?.message || 'Failed to load servers', loading: false });
    }
  },

  // 2. Select an active server
  setActiveServer: (server: Server | null) => {
    set({ activeServer: server });
  },

  // 3. Create a new server atomically (Server + Membership + Default #general channel)
  createServer: async (name: string): Promise<Server> => {
    set({ error: null });
    try {
      const query = `
        BEGIN TRANSACTION;
        LET $srv = CREATE ONLY server SET name = $name, owner = $auth;
        RELATE $auth->member_of->$srv.id;
        CREATE ONLY channel SET server = $srv.id, name = "general", position = 0;
        RETURN $srv;
        COMMIT TRANSACTION;
      `;

      const response = await surreal.query<[any, any, any, any, any, any]>(query, { name });
      
      // In SurrealDB batch transactions, index 4 corresponds to `RETURN $srv`
      const rawSrv = Array.isArray(response) 
        ? (response[4]?.result || response[4]) 
        : response;

      if (!rawSrv) {
        throw new Error('Server creation failed to return record');
      }

      const newServer: Server = {
        id: String(rawSrv.id),
        name: String(rawSrv.name),
        icon: rawSrv.icon ? String(rawSrv.icon) : null,
        owner: String(rawSrv.owner),
        created_at: String(rawSrv.created_at),
      };

      set((state) => ({
        servers: [...state.servers, newServer],
        activeServer: newServer,
      }));

      return newServer;
    } catch (err: any) {
      console.error('Failed to create server:', err);
      set({ error: err?.message || 'Failed to create server' });
      throw err;
    }
  },
}));
