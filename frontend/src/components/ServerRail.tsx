// frontend/src/components/ServerRail.tsx
import React, { useState } from 'react';
import { useServerStore } from '../stores/serverStore';

export const ServerRail: React.FC = () => {
  const { servers, activeServer, setActiveServer, createServer } = useServerStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newServerName, setNewServerName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateServer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServerName.trim()) return;

    setCreating(true);
    setError(null);
    try {
      await createServer(newServerName.trim());
      setNewServerName('');
      setIsModalOpen(false);
    } catch (err: any) {
      setError(err?.message || 'Failed to create server');
    } finally {
      setCreating(false);
    }
  };

  // Helper: Get server name abbreviation (first letters or first 2 chars)
  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length > 1) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <>
      <nav className="flex h-screen w-[72px] flex-shrink-0 flex-col items-center bg-[#1e1f22] py-3 select-none z-20">
        {/* 1. Home / DM Button */}
        <div className="relative flex items-center justify-center w-full group mb-2">
          {/* Left Pill Indicator */}
          <div
            className={`absolute left-0 w-1 bg-white rounded-r-full transition-all duration-200 ${
              activeServer === null
                ? 'h-10'
                : 'h-0 group-hover:h-5'
            }`}
          />
          <button
            onClick={() => setActiveServer(null)}
            title="Direct Messages"
            className={`flex h-12 w-12 items-center justify-center rounded-[24px] transition-all duration-200 hover:rounded-[16px] hover:bg-[#5865f2] hover:text-white ${
              activeServer === null
                ? 'rounded-[16px] bg-[#5865f2] text-white'
                : 'bg-[#313338] text-[#dbdee1]'
            }`}
          >
            {/* Discord Logo SVG */}
            <svg className="h-7 w-7 fill-current" viewBox="0 0 127.14 96.36">
              <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,45.91,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,45.91,96.12,53,91.08,65.69,84.69,65.69Z" />
            </svg>
          </button>
        </div>

        {/* Separator */}
        <div className="h-[2px] w-8 rounded bg-[#35363c] mb-2" />

        {/* 2. Server List (Scrollable) */}
        <div className="flex flex-1 flex-col items-center gap-2 overflow-y-auto w-full no-scrollbar">
          {servers.map((server) => {
            const isActive = activeServer?.id === server.id;
            return (
              <div key={server.id} className="relative flex items-center justify-center w-full group">
                {/* Left Pill Indicator */}
                <div
                  className={`absolute left-0 w-1 bg-white rounded-r-full transition-all duration-200 ${
                    isActive ? 'h-10' : 'h-0 group-hover:h-5'
                  }`}
                />
                <button
                  onClick={() => setActiveServer(server)}
                  title={server.name}
                  className={`flex h-12 w-12 items-center justify-center font-bold text-sm transition-all duration-200 hover:rounded-[16px] hover:bg-[#5865f2] hover:text-white ${
                    isActive
                      ? 'rounded-[16px] bg-[#5865f2] text-white'
                      : 'rounded-[24px] bg-[#313338] text-[#dbdee1]'
                  }`}
                >
                  {server.icon ? (
                    <img
                      src={server.icon}
                      alt={server.name}
                      className="h-full w-full rounded-[inherit] object-cover"
                    />
                  ) : (
                    getInitials(server.name)
                  )}
                </button>
              </div>
            );
          })}

          {/* 3. Add Server Button */}
          <div className="relative flex items-center justify-center w-full group mt-1">
            <button
              onClick={() => setIsModalOpen(true)}
              title="Add a Server"
              className="flex h-12 w-12 items-center justify-center rounded-[24px] bg-[#313338] text-[#23a55a] transition-all duration-200 hover:rounded-[16px] hover:bg-[#23a55a] hover:text-white"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* 4. Create Server Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-[440px] rounded-lg bg-[#313338] shadow-2xl overflow-hidden text-[#dbdee1]">
            <div className="p-6 text-center">
              <h2 className="text-2xl font-bold text-white mb-2">Create a server</h2>
              <p className="text-sm text-[#949ba4]">
                Your server is where you and your friends hang out. Make yours and start talking.
              </p>

              {error && (
                <div className="mt-4 rounded bg-[#da373c]/15 border border-[#da373c] p-2.5 text-xs text-[#fa777c]">
                  {error}
                </div>
              )}

              <form onSubmit={handleCreateServer} className="mt-6 text-left space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#b5bac1] mb-2">
                    Server Name <span className="text-[#da373c]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newServerName}
                    onChange={(e) => setNewServerName(e.target.value)}
                    placeholder="Ferris's Community"
                    disabled={creating}
                    className="w-full rounded bg-[#1e1f22] p-2.5 text-sm text-white placeholder-[#80848e] outline-none transition focus:ring-2 focus:ring-[#5865f2] disabled:opacity-50"
                  />
                </div>

                <div className="mt-8 flex items-center justify-between bg-[#2b2d31] -mx-6 -mb-6 p-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    disabled={creating}
                    className="text-sm font-medium text-white hover:underline px-4 py-2"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating || !newServerName.trim()}
                    className="rounded bg-[#5865f2] px-6 py-2 text-sm font-semibold text-white transition hover:bg-[#4752c4] active:bg-[#3c45a5] disabled:opacity-50"
                  >
                    {creating ? 'Creating...' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
