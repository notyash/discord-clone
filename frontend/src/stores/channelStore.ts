// frontend/src/stores/channelStore.ts
import { create } from 'zustand';
import { surreal } from '../lib/surreal';

export interface Category {
  id: string;
  name: string;
  server: string;
  position: number;
  created_at: string;
}

export interface Channel {
  id: string;
  name: string;
  server: string;
  category: string | null;
  position: number;
  created_at: string;
}

interface ChannelState {
  categories: Category[];
  channels: Channel[];
  activeChannel: Channel | null;
  loading: boolean;
  error: string | null;

  // Actions
  fetchChannels: (serverId: string) => Promise<void>;
  createCategory: (name: string, serverId: string) => Promise<Category>;
  editCategory: (categoryId: string, name: string) => Promise<void>;
  deleteCategory: (categoryId: string) => Promise<void>;
  reorderCategory: (categoryId: string, newPosition: number) => Promise<void>;
  createChannel: (name: string, serverId: string, categoryId?: string | null) => Promise<Channel>;
  editChannel: (channelId: string, name: string) => Promise<void>;
  deleteChannel: (channelId: string) => Promise<void>;
  reorderChannel: (channelId: string, newPosition: number, newCategoryId?: string | null) => Promise<void>;
  setActiveChannel: (channel: Channel | null) => void;
}

export const useChannelStore = create<ChannelState>((set, get) => ({
  categories: [],
  channels: [],
  activeChannel: null,
  loading: false,
  error: null,

  // 1. Fetch all categories and channels for the given server in one batched round-trip
  fetchChannels: async (serverId: string) => {
    set({ loading: true, error: null });
    try {
      const query = `
        SELECT id, name, server, position, created_at FROM category WHERE server = type::record($serverId) ORDER BY position ASC, created_at ASC;
        SELECT id, name, server, category, position, created_at FROM channel WHERE server = type::record($serverId) ORDER BY position ASC, created_at ASC;
      `;

      const [rawCategories, rawChannels] = await surreal.query<[any[], any[]]>(query, { serverId });

      const categories: Category[] = (Array.isArray(rawCategories) ? rawCategories : []).map((raw) => ({
        id: String(raw.id),
        name: String(raw.name),
        server: String(raw.server),
        position: Number(raw.position || 0),
        created_at: String(raw.created_at),
      }));

      const channels: Channel[] = (Array.isArray(rawChannels) ? rawChannels : []).map((raw) => ({
        id: String(raw.id),
        name: String(raw.name),
        server: String(raw.server),
        category: raw.category ? String(raw.category) : null,
        position: Number(raw.position || 0),
        created_at: String(raw.created_at),
      }));

      // Preserve currently active channel if it belongs to this server, else default to first channel
      const currentActive = get().activeChannel;
      const validActive = channels.find((c) => c.id === currentActive?.id) || channels[0] || null;

      set({
        categories,
        channels,
        activeChannel: validActive,
        loading: false,
      });
    } catch (err: any) {
      console.error('Failed to fetch channels:', err);
      set({ error: err?.message || 'Failed to load channels', loading: false });
    }
  },

  // 2. Create a new category
  createCategory: async (name: string, serverId: string): Promise<Category> => {
    set({ error: null });
    try {
      const currentCategories = get().categories;
      const nextPos = currentCategories.length > 0
        ? Math.max(...currentCategories.map((c) => c.position)) + 1
        : 0;

      const [res] = await surreal.query<[any]>(
        'CREATE ONLY category SET name = $name, server = type::record($serverId), position = $pos;',
        { name, serverId, pos: nextPos }
      );

      const raw = Array.isArray(res) ? res[0] : res;
      if (!raw) throw new Error('Category creation failed');

      const newCategory: Category = {
        id: String(raw.id),
        name: String(raw.name),
        server: String(raw.server),
        position: Number(raw.position || 0),
        created_at: String(raw.created_at),
      };

      set((state) => ({
        categories: [...state.categories, newCategory],
      }));

      return newCategory;
    } catch (err: any) {
      console.error('Failed to create category:', err);
      set({ error: err?.message || 'Failed to create category' });
      throw err;
    }
  },

  // Edit category name
  editCategory: async (categoryId: string, name: string) => {
    const prevCategories = get().categories;
    set((state) => ({
      error: null,
      categories: state.categories.map((c) => (c.id === categoryId ? { ...c, name } : c)),
    }));
    try {
      await surreal.query('UPDATE type::record($categoryId) SET name = $name;', { categoryId, name });
    } catch (err: any) {
      console.error('Failed to edit category:', err);
      set({ categories: prevCategories, error: err?.message || 'Failed to edit category' });
      throw err;
    }
  },

  // Delete category and unassign its channels
  deleteCategory: async (categoryId: string) => {
    const prevCategories = get().categories;
    const prevChannels = get().channels;
    set((state) => ({
      error: null,
      categories: state.categories.filter((c) => c.id !== categoryId),
      channels: state.channels.map((ch) => (ch.category === categoryId ? { ...ch, category: null } : ch)),
    }));
    try {
      await surreal.query(`
        UPDATE channel SET category = NONE WHERE category = type::record($categoryId);
        DELETE type::record($categoryId);
      `, { categoryId });
    } catch (err: any) {
      console.error('Failed to delete category:', err);
      set({ categories: prevCategories, channels: prevChannels, error: err?.message || 'Failed to delete category' });
      throw err;
    }
  },

  // Reorder category via instant optimistic update + async SurrealQL sync
  reorderCategory: async (categoryId: string, newPosition: number) => {
    const prevCategories = get().categories;

    const updatedCategories = prevCategories
      .map((c) => (c.id === categoryId ? { ...c, position: newPosition } : c))
      .sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at));

    set({ categories: updatedCategories, error: null });

    try {
      await surreal.query(
        'UPDATE type::record($categoryId) SET position = $newPosition;',
        { categoryId, newPosition }
      );
    } catch (err: any) {
      console.error('Failed to reorder category:', err);
      set({ categories: prevCategories, error: err?.message || 'Failed to reorder category' });
    }
  },

  // 3. Create a new channel (inside a category or uncategorized)
  createChannel: async (name: string, serverId: string, categoryId: string | null = null): Promise<Channel> => {
    set({ error: null });
    try {
      const currentChannels = get().channels.filter((c) => c.category === categoryId);
      const nextPos = currentChannels.length > 0
        ? Math.max(...currentChannels.map((c) => c.position)) + 1
        : 0;

      const [res] = await surreal.query<[any]>(
        'CREATE ONLY channel SET name = $name, server = type::record($serverId), category = IF $categoryId THEN type::record($categoryId) ELSE NONE END, position = $pos;',
        { name, serverId, categoryId: categoryId || null, pos: nextPos }
      );

      const raw = Array.isArray(res) ? res[0] : res;
      if (!raw) throw new Error('Channel creation failed');

      const newChannel: Channel = {
        id: String(raw.id),
        name: String(raw.name),
        server: String(raw.server),
        category: raw.category ? String(raw.category) : null,
        position: Number(raw.position || 0),
        created_at: String(raw.created_at),
      };

      set((state) => ({
        channels: [...state.channels, newChannel],
        activeChannel: newChannel,
      }));

      return newChannel;
    } catch (err: any) {
      console.error('Failed to create channel:', err);
      set({ error: err?.message || 'Failed to create channel' });
      throw err;
    }
  },

  // Edit channel name
  editChannel: async (channelId: string, name: string) => {
    const prevChannels = get().channels;
    const prevActive = get().activeChannel;
    set((state) => ({
      error: null,
      channels: state.channels.map((c) => (c.id === channelId ? { ...c, name } : c)),
      activeChannel: prevActive?.id === channelId ? { ...prevActive, name } : prevActive,
    }));
    try {
      await surreal.query('UPDATE type::record($channelId) SET name = $name;', { channelId, name });
    } catch (err: any) {
      console.error('Failed to edit channel:', err);
      set({ channels: prevChannels, activeChannel: prevActive, error: err?.message || 'Failed to edit channel' });
      throw err;
    }
  },

  // Delete channel
  deleteChannel: async (channelId: string) => {
    const prevChannels = get().channels;
    const prevActive = get().activeChannel;
    const remaining = prevChannels.filter((c) => c.id !== channelId);
    set({
      error: null,
      channels: remaining,
      activeChannel: prevActive?.id === channelId ? (remaining[0] || null) : prevActive,
    });
    try {
      await surreal.query('DELETE type::record($channelId);', { channelId });
    } catch (err: any) {
      console.error('Failed to delete channel:', err);
      set({ channels: prevChannels, activeChannel: prevActive, error: err?.message || 'Failed to delete channel' });
      throw err;
    }
  },

  // 4. Reorder a channel via instant optimistic update + async SurrealQL sync
  reorderChannel: async (channelId: string, newPosition: number, newCategoryId?: string | null) => {
    const prevChannels = get().channels;
    
    // 1. Instant optimistic update: update position & category, then sort immediately
    const updatedChannels = prevChannels.map((c) =>
      c.id === channelId
        ? {
            ...c,
            position: newPosition,
            category: newCategoryId !== undefined ? newCategoryId : c.category,
          }
        : c
    ).sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at));

    set({ channels: updatedChannels, error: null });

    // 2. Persist to SurrealDB asynchronously in background
    try {
      if (newCategoryId !== undefined) {
        await surreal.query(
          'UPDATE type::record($channelId) SET position = $newPosition, category = IF $newCategoryId THEN type::record($newCategoryId) ELSE NONE END;',
          { channelId, newPosition, newCategoryId: newCategoryId || null }
        );
      } else {
        await surreal.query(
          'UPDATE type::record($channelId) SET position = $newPosition;',
          { channelId, newPosition }
        );
      }
    } catch (err: any) {
      console.error('Failed to reorder channel:', err);
      // Rollback on network failure
      set({ channels: prevChannels, error: err?.message || 'Failed to reorder channel' });
    }
  },

  // 5. Select active channel
  setActiveChannel: (channel: Channel | null) => {
    set({ activeChannel: channel });
  },
}));
