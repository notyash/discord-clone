import { useEffect } from 'react';
import { useAuthStore } from './stores/authStore';
import { useServerStore } from './stores/serverStore';
import { useChannelStore } from './stores/channelStore';
import { AuthScreen } from './components/AuthScreen';
import { ServerRail } from './components/ServerRail';
import { ChannelSidebar } from './components/ChannelSidebar';

function App() {
  const { user, loading, initialize } = useAuthStore();
  const { fetchServers, activeServer } = useServerStore();
  const { activeChannel } = useChannelStore();

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
      {/* 1. Column 1: Leftmost Server Rail (72px) */}
      <ServerRail />

      {/* 2. Column 2: Channel Sidebar (240px) */}
      {activeServer && <ChannelSidebar />}

      {/* 3. Column 3: Main Chat Area Placeholder (flex-1) */}
      <div className="flex flex-1 flex-col bg-[#313338] text-[#dbdee1]">
        {/* Active Channel Header */}
        <header className="flex h-12 w-full items-center border-b border-[#1f2023] px-4 font-semibold text-white shadow-sm">
          {activeChannel ? (
            <div className="flex items-center gap-2">
              <span className="text-[#80848e] text-lg font-bold">#</span>
              <span className="text-sm font-bold text-white">{activeChannel.name}</span>
            </div>
          ) : (
            <span className="text-sm text-[#949ba4]">No channel selected</span>
          )}
        </header>

        {/* Chat Message Viewport Placeholder */}
        <div className="flex flex-1 flex-col items-center justify-center space-y-3 p-6 text-center">
          {activeChannel ? (
            <div className="space-y-2">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#35373c] text-3xl font-bold text-white">
                #
              </div>
              <h2 className="text-2xl font-bold text-white">Welcome to #{activeChannel.name}!</h2>
              <p className="text-sm text-[#949ba4]">
                This is the start of the #{activeChannel.name} channel.
              </p>
              <p className="text-xs text-[#80848e]">Channel ID: {activeChannel.id}</p>
            </div>
          ) : (
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white">Select a channel</h2>
              <p className="text-sm text-[#949ba4]">Right-click on the sidebar or click + to create a channel.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;