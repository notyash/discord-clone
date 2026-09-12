import React, { useEffect } from 'react';
import { useAuthStore } from './stores/authStore';
import { AuthScreen } from './components/AuthScreen';

function App() {
  const { user, loading, initialize, signout } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

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
    <div className="flex h-screen w-screen bg-[#313338] text-white">
      {/* Temporary Shell placeholder before building Sidebar & Chat components */}
      <div className="flex flex-1 flex-col items-center justify-center space-y-4">
        <h2 className="text-xl font-bold">Logged in as {user.username}</h2>
        <p className="text-sm text-[#949ba4]">{user.email} ({user.id})</p>
        <button
          onClick={() => signout()}
          className="rounded bg-[#da373c] px-4 py-2 text-sm font-semibold hover:bg-[#a1282c] transition"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}

export default App;