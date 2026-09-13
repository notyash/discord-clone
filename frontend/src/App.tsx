import React, { useEffect } from 'react';
import { useAuthStore } from './stores/authStore';
import { useServerStore } from './stores/serverStore';
import { AuthScreen } from './components/AuthScreen';
import { ServerRail } from './components/ServerRail';

function App() {
  const { user, loading, initialize, signout } = useAuthStore();
  const { fetchServers, activeServer } = useServerStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (user) {
      fetchServers();
    }
  }, [user, fetchServers]);

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#1e1f22] text-[#949ba4]">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#5865f2] border-t-transparent mx-auto" />
          <p className="text-sm font-medium">Connecting to SurrealDB...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#313338] text-white select-none">
      {/* 1. Leftmost Server Rail */}
      <ServerRail />

      {/* 2. Main Content Area placeholder before adding ChannelSidebar & ChatArea */}
      <div className="flex flex-1 flex-col items-center justify-center space-y-4 bg-[#313338] text-[#dbdee1]">
        {activeServer ? (
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-white">Active Server: {activeServer.name}</h2>
            <p className="text-sm text-[#949ba4]">Server ID: {activeServer.id}</p>
          </div>
        ) : (
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-white">Direct Messages / Home</h2>
            <p className="text-sm text-[#949ba4]">Select a server on the left rail or click + to create one.</p>
          </div>
        )}

        <div className="pt-4 border-t border-[#35363c] text-center space-y-3">
          <p className="text-sm text-[#949ba4]">
            Logged in as <strong className="text-white">{user.username}</strong> ({user.email})
          </p>
          <button
            onClick={() => signout()}
            className="rounded bg-[#da373c] px-4 py-2 text-sm font-semibold text-white hover:bg-[#a1282c] transition"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;