// frontend/src/components/ChannelSidebar.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useServerStore } from '../stores/serverStore';
import { useChannelStore, type Channel, type Category } from '../stores/channelStore';

type ContextMenuState =
  | { type: 'sidebar'; x: number; y: number }
  | { type: 'channel'; channel: Channel; x: number; y: number }
  | { type: 'category'; category: Category; x: number; y: number }
  | null;

export const ChannelSidebar: React.FC = () => {
  const { user, signout } = useAuthStore();
  const { activeServer } = useServerStore();
  const {
    categories,
    channels,
    activeChannel,
    fetchChannels,
    createCategory,
    editCategory,
    deleteCategory,
    reorderCategory,
    createChannel,
    editChannel,
    deleteChannel,
    reorderChannel,
    setActiveChannel,
  } = useChannelStore();

  // Modals & Context Menu State
  const [isChannelModalOpen, setIsChannelModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [targetCategoryId, setTargetCategoryId] = useState<string | null>(null);
  const [channelName, setChannelName] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  // Edit / Delete Modals State
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);
  const [editChannelName, setEditChannelName] = useState('');
  const [deletingChannel, setDeletingChannel] = useState<Channel | null>(null);

  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);

  // Context Menu state
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const [hideMuted, setHideMuted] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Pointer Events Drag and Drop state (Channels & Categories)
  const [activeDrag, setActiveDrag] = useState<{
    type: 'channel' | 'category';
    id: string;
    name: string;
    x: number;
    y: number;
    isDragging: boolean;
  } | null>(null);

  const [dropTarget, setDropTarget] = useState<
    | { type: 'channel'; id: string; position: 'top' | 'bottom'; category: string | null }
    | { type: 'category'; id: string; position: 'top' | 'bottom' }
    | null
  >(null);

  const dragRef = useRef<{
    item: { type: 'channel'; channel: Channel } | { type: 'category'; category: Category } | null;
    startX: number;
    startY: number;
    isDragging: boolean;
  }>({ item: null, startX: 0, startY: 0, isDragging: false });

  const handleChannelPointerDown = (e: React.PointerEvent, channel: Channel) => {
    if (e.button !== 0) return;
    dragRef.current = {
      item: { type: 'channel', channel },
      startX: e.clientX,
      startY: e.clientY,
      isDragging: false,
    };
  };

  const handleCategoryPointerDown = (e: React.PointerEvent, category: Category) => {
    if (e.button !== 0) return;
    dragRef.current = {
      item: { type: 'category', category },
      startX: e.clientX,
      startY: e.clientY,
      isDragging: false,
    };
  };

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!dragRef.current.item) return;

      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      const dist = Math.hypot(dx, dy);

      if (!dragRef.current.isDragging && dist > 5) {
        dragRef.current.isDragging = true;
      }

      if (dragRef.current.isDragging) {
        const currentItem = dragRef.current.item;
        setActiveDrag({
          type: currentItem.type,
          id: currentItem.type === 'channel' ? currentItem.channel.id : currentItem.category.id,
          name: currentItem.type === 'channel' ? currentItem.channel.name : currentItem.category.name,
          x: e.clientX,
          y: e.clientY,
          isDragging: true,
        });

        const element = document.elementFromPoint(e.clientX, e.clientY);

        // Case A: Dragging a Channel
        if (currentItem.type === 'channel') {
          const channelElem = element?.closest('[data-channel-id]') as HTMLElement | null;
          if (channelElem) {
            const targetId = channelElem.getAttribute('data-channel-id');
            const rawCat = channelElem.getAttribute('data-category-id');
            const targetCategory = rawCat === 'null' ? null : rawCat;

            if (targetId && targetId !== currentItem.channel.id) {
              const rect = channelElem.getBoundingClientRect();
              const isTop = e.clientY < rect.top + rect.height / 2;
              const dropPos: 'top' | 'bottom' = isTop ? 'top' : 'bottom';

              // Redundant drop indicator check (same category)
              if (currentItem.channel.category === targetCategory) {
                const list = channels
                  .filter((c) => c.category === targetCategory)
                  .sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at));
                const sIdx = list.findIndex((c) => c.id === currentItem.channel.id);
                const tIdx = list.findIndex((c) => c.id === targetId);

                // If target is directly below and we hover top of it -> no change, skip indicator
                if (tIdx === sIdx + 1 && dropPos === 'top') {
                  setDropTarget(null);
                  return;
                }
                // If target is directly above and we hover bottom of it -> no change, skip indicator
                if (tIdx === sIdx - 1 && dropPos === 'bottom') {
                  setDropTarget(null);
                  return;
                }
              }

              setDropTarget({
                type: 'channel',
                id: targetId,
                position: dropPos,
                category: targetCategory,
              });
              return;
            }
          }
          setDropTarget(null);
          return;
        }

        // Case B: Dragging a Category
        if (currentItem.type === 'category') {
          const categoryElem = (element?.closest('[data-category-block-id]') || element?.closest('[data-category-header-id]')) as HTMLElement | null;
          if (categoryElem) {
            const targetCatId = categoryElem.getAttribute('data-category-block-id') || categoryElem.getAttribute('data-category-header-id');
            if (targetCatId && targetCatId !== currentItem.category.id) {
              const rect = categoryElem.getBoundingClientRect();
              const isTop = e.clientY < rect.top + rect.height / 2;
              const dropPos: 'top' | 'bottom' = isTop ? 'top' : 'bottom';

              // Redundant drop indicator check for categories
              const sortedCats = categories
                .slice()
                .sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at));
              const sIdx = sortedCats.findIndex((c) => c.id === currentItem.category.id);
              const tIdx = sortedCats.findIndex((c) => c.id === targetCatId);

              if (tIdx === sIdx + 1 && dropPos === 'top') {
                setDropTarget(null);
                return;
              }
              if (tIdx === sIdx - 1 && dropPos === 'bottom') {
                setDropTarget(null);
                return;
              }

              setDropTarget({
                type: 'category',
                id: targetCatId,
                position: dropPos,
              });
              return;
            }
          }
          setDropTarget(null);
          return;
        }
      }
    };

    const handlePointerUp = async () => {
      const { item, isDragging } = dragRef.current;
      const currentTarget = dropTarget;

      // Reset drag tracker
      dragRef.current = { item: null, startX: 0, startY: 0, isDragging: false };
      setActiveDrag(null);
      setDropTarget(null);

      if (!item || !isDragging || !currentTarget) return;

      if (item.type === 'channel' && currentTarget.type === 'channel') {
        const targetCategory = currentTarget.category;
        const otherChannels = channels
          .filter((c) => c.category === targetCategory && c.id !== item.channel.id)
          .sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at));

        const targetIdx = otherChannels.findIndex((c) => c.id === currentTarget.id);
        if (targetIdx === -1) return;

        const target = otherChannels[targetIdx];
        const prev = targetIdx > 0 ? otherChannels[targetIdx - 1] : null;
        const next = targetIdx < otherChannels.length - 1 ? otherChannels[targetIdx + 1] : null;

        let newPos: number;
        if (currentTarget.position === 'bottom') {
          newPos = next ? (target.position + next.position) / 2 : target.position + 1;
        } else {
          newPos = prev ? (prev.position + target.position) / 2 : target.position - 1;
        }

        await reorderChannel(item.channel.id, newPos, targetCategory);
      } else if (item.type === 'category' && currentTarget.type === 'category') {
        const otherCats = categories
          .filter((c) => c.id !== item.category.id)
          .sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at));

        const targetIdx = otherCats.findIndex((c) => c.id === currentTarget.id);
        if (targetIdx === -1) return;

        const target = otherCats[targetIdx];
        const prev = targetIdx > 0 ? otherCats[targetIdx - 1] : null;
        const next = targetIdx < otherCats.length - 1 ? otherCats[targetIdx + 1] : null;

        let newPos: number;
        if (currentTarget.position === 'bottom') {
          newPos = next ? (target.position + next.position) / 2 : target.position + 1;
        } else {
          newPos = prev ? (prev.position + target.position) / 2 : target.position - 1;
        }

        await reorderCategory(item.category.id, newPos);
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [channels, categories, dropTarget, reorderChannel, reorderCategory]);

  // Fetch channels whenever active server changes
  useEffect(() => {
    if (activeServer?.id) {
      fetchChannels(activeServer.id);
    }
  }, [activeServer?.id, fetchChannels]);

  // Close context menu on outside click or escape key
  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setContextMenu(null);
    };
    window.addEventListener('click', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('click', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Background Context Menu (Blank space only)
  const handleBackgroundContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ type: 'sidebar', x: e.clientX, y: e.clientY });
  };

  // Channel Context Menu
  const handleChannelContextMenu = (e: React.MouseEvent, channel: Channel) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ type: 'channel', channel, x: e.clientX, y: e.clientY });
  };

  // Category Context Menu
  const handleCategoryContextMenu = (e: React.MouseEvent, category: Category) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ type: 'category', category, x: e.clientX, y: e.clientY });
  };

  const handleCreateChannelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelName.trim() || !activeServer) return;
    try {
      const sanitized = channelName.trim().toLowerCase().replace(/\s+/g, '-');
      await createChannel(sanitized, activeServer.id, targetCategoryId);
      setChannelName('');
      setIsChannelModalOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName.trim() || !activeServer) return;
    try {
      await createCategory(categoryName.trim().toUpperCase(), activeServer.id);
      setCategoryName('');
      setIsCategoryModalOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditChannelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingChannel || !editChannelName.trim()) return;
    try {
      const sanitized = editChannelName.trim().toLowerCase().replace(/\s+/g, '-');
      await editChannel(editingChannel.id, sanitized);
      setEditingChannel(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteChannelSubmit = async () => {
    if (!deletingChannel) return;
    try {
      await deleteChannel(deletingChannel.id);
      setDeletingChannel(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || !editCategoryName.trim()) return;
    try {
      await editCategory(editingCategory.id, editCategoryName.trim().toUpperCase());
      setEditingCategory(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteCategorySubmit = async () => {
    if (!deletingCategory) return;
    try {
      await deleteCategory(deletingCategory.id);
      setDeletingCategory(null);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleCategory = (catId: string) => {
    setCollapsedCategories((prev) => ({ ...prev, [catId]: !prev[catId] }));
  };

  if (!activeServer) {
    return (
      <div className="flex h-screen w-60 flex-shrink-0 flex-col bg-[#2b2d31] text-[#949ba4] select-none p-4">
        <h2 className="text-base font-bold text-white mb-2">Direct Messages</h2>
        <p className="text-xs">Select a server from the rail on the left or create your own.</p>
      </div>
    );
  }

  // Uncategorized channels (category === null), sorted by position
  const uncategorizedChannels = channels
    .filter((c) => !c.category)
    .sort((a, b) => a.position - b.position);

  return (
    <div
      ref={sidebarRef}
      onContextMenu={handleBackgroundContextMenu}
      className="flex h-screen w-60 flex-shrink-0 flex-col bg-[#2b2d31] text-[#949ba4] select-none z-10"
    >
      {/* Floating Drag Snapshot pill */}
      {activeDrag?.isDragging && (
        <div
          style={{
            position: 'fixed',
            left: `${activeDrag.x + 12}px`,
            top: `${activeDrag.y + 12}px`,
            pointerEvents: 'none',
            zIndex: 9999,
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#111214] text-white text-xs font-bold tracking-wider uppercase shadow-2xl border border-[#35373c] opacity-95 select-none"
        >
          {activeDrag.type === 'channel' ? (
            <>
              <span className="text-[#80848e] font-bold text-base">#</span>
              <span className="lowercase font-medium text-sm">{activeDrag.name}</span>
            </>
          ) : (
            <>
              <svg className="h-3.5 w-3.5 text-[#949ba4]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <span>{activeDrag.name}</span>
            </>
          )}
        </div>
      )}

      {/* 1. Server Header Dropdown */}
      <header className="flex h-12 w-full items-center justify-between border-b border-[#1f2023] px-4 font-bold text-white shadow-sm hover:bg-[#35373c]/50 cursor-pointer transition">
        <span className="truncate text-base font-semibold">{activeServer.name}</span>
        <svg className="h-5 w-5 text-[#949ba4]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </header>

      {/* 2. Scrollable Channel & Category List (Right-clicking blank space triggers background menu) */}
      <div
        onContextMenu={handleBackgroundContextMenu}
        className="flex-1 overflow-y-auto px-2 py-3 space-y-4 no-scrollbar min-h-0"
      >
        {/* Uncategorized Channels */}
        {uncategorizedChannels.length > 0 && (
          <div className="space-y-0.5">
            {uncategorizedChannels.map((channel) => (
              <ChannelItem
                key={channel.id}
                channel={channel}
                isActive={activeChannel?.id === channel.id}
                dropTargetPosition={dropTarget?.type === 'channel' && dropTarget.id === channel.id ? dropTarget.position : null}
                isDragging={activeDrag?.type === 'channel' && activeDrag.id === channel.id}
                isMuted={activeDrag?.type === 'category'}
                onSelect={() => {
                  if (!dragRef.current.isDragging) setActiveChannel(channel);
                }}
                onPointerDown={(e) => handleChannelPointerDown(e, channel)}
                onContextMenu={(e) => handleChannelContextMenu(e, channel)}
              />
            ))}
          </div>
        )}

        {/* Categories */}
        {categories.map((category) => {
          const isCollapsed = collapsedCategories[category.id];
          const categoryChannels = channels
            .filter((c) => c.category === category.id)
            .sort((a, b) => a.position - b.position);

          const isCategoryTarget = dropTarget?.type === 'category' && dropTarget.id === category.id;
          const isBeingDragged = activeDrag?.type === 'category' && activeDrag.id === category.id;

          return (
            <div
              key={category.id}
              data-category-block-id={category.id}
              className="relative space-y-0.5"
            >
              {/* Top drop line indicator for category (above category header) */}
              {isCategoryTarget && dropTarget.position === 'top' && (
                <div className="absolute -top-[2px] left-0 right-0 h-[2px] bg-[#5865f2] rounded-full z-30 pointer-events-none" />
              )}

              {/* Category Header */}
              <div
                data-category-header-id={category.id}
                onPointerDown={(e) => handleCategoryPointerDown(e, category)}
                onContextMenu={(e) => handleCategoryContextMenu(e, category)}
                className={`relative flex items-center justify-between px-1.5 py-1 text-xs tracking-wider uppercase group rounded cursor-pointer select-none transition-colors ${
                  isBeingDragged
                    ? 'text-white font-black bg-[#35373c] shadow-md ring-1 ring-[#5865f2]/40'
                    : 'text-[#949ba4] font-bold hover:text-white'
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    if (!dragRef.current.isDragging) {
                      toggleCategory(category.id);
                    }
                  }}
                  className="flex items-center gap-1.5 flex-1 text-left outline-none"
                >
                  <svg
                    className={`h-3 w-3 transition-transform duration-150 ${
                      isCollapsed ? '-rotate-90' : 'rotate-0'
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                  </svg>
                  <span className={`truncate ${isBeingDragged ? 'font-black text-white' : 'font-bold'}`}>
                    {category.name}
                  </span>
                </button>

                {/* + Add Channel to this Category */}
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    setTargetCategoryId(category.id);
                    setIsChannelModalOpen(true);
                  }}
                  title="Create Channel"
                  className="opacity-0 group-hover:opacity-100 hover:text-white transition p-0.5"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>

              {/* Channels inside this Category */}
              {!isCollapsed && (
                <div className="space-y-0.5 mt-0.5">
                  {categoryChannels.map((channel) => (
                    <ChannelItem
                      key={channel.id}
                      channel={channel}
                      isActive={activeChannel?.id === channel.id}
                      dropTargetPosition={dropTarget?.type === 'channel' && dropTarget.id === channel.id ? dropTarget.position : null}
                      isDragging={activeDrag?.type === 'channel' && activeDrag.id === channel.id}
                      isMuted={activeDrag?.type === 'category'}
                      onSelect={() => {
                        if (!dragRef.current.isDragging) setActiveChannel(channel);
                      }}
                      onPointerDown={(e) => handleChannelPointerDown(e, channel)}
                      onContextMenu={(e) => handleChannelContextMenu(e, channel)}
                    />
                  ))}
                </div>
              )}

              {/* Bottom drop line indicator for category (below the last channel in this category) */}
              {isCategoryTarget && dropTarget.position === 'bottom' && (
                <div className="absolute -bottom-[2px] left-0 right-0 h-[2px] bg-[#5865f2] rounded-full z-30 pointer-events-none" />
              )}
            </div>
          );
        })}
      </div>

      {/* 3. Bottom User Profile Bar */}
      {user && (
        <footer className="flex h-[52px] w-full items-center justify-between bg-[#232428] px-2 py-1.5">
          <div className="flex items-center gap-2 overflow-hidden flex-1 p-1 rounded hover:bg-[#35373c]/50 cursor-pointer">
            <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-[#5865f2] font-bold text-white text-xs">
              {user.username.slice(0, 2).toUpperCase()}
              {/* Online indicator */}
              <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-[#23a55a] border-2 border-[#232428]" />
            </div>
            <div className="truncate text-xs">
              <p className="font-semibold text-white leading-tight">{user.username}</p>
              <p className="text-[10px] text-[#949ba4] leading-tight">Online</p>
            </div>
          </div>

          {/* Sign out button */}
          <button
            onClick={() => signout()}
            title="Log Out"
            className="p-1.5 rounded text-[#b5bac1] hover:bg-[#35373c] hover:text-[#da373c] transition"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </footer>
      )}

      {/* ========================================================================= */}
      {/* 4. CONTEXT MENUS */}
      {/* ========================================================================= */}

      {/* A. Background Context Menu (Blank Space) */}
      {contextMenu?.type === 'sidebar' && (
        <div
          style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
          className="fixed z-50 w-52 rounded-md bg-[#111214] p-1.5 shadow-2xl text-xs font-medium text-[#dbdee1] border border-[#1f2023] animate-in fade-in duration-75"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            onClick={() => setHideMuted(!hideMuted)}
            className="flex items-center justify-between px-2.5 py-1.5 rounded hover:bg-[#5865f2] hover:text-white cursor-pointer"
          >
            <span>Hide Muted Channels</span>
            <input
              type="checkbox"
              checked={hideMuted}
              onChange={() => setHideMuted(!hideMuted)}
              className="h-3.5 w-3.5 rounded bg-[#1e1f22] border-[#4e5058]"
            />
          </div>

          <div className="h-[1px] bg-[#35363c] my-1" />

          <button
            onClick={() => {
              setTargetCategoryId(null);
              setIsChannelModalOpen(true);
              setContextMenu(null);
            }}
            className="w-full text-left px-2.5 py-1.5 rounded hover:bg-[#5865f2] hover:text-white cursor-pointer transition"
          >
            Create Channel
          </button>

          <button
            onClick={() => {
              setIsCategoryModalOpen(true);
              setContextMenu(null);
            }}
            className="w-full text-left px-2.5 py-1.5 rounded hover:bg-[#5865f2] hover:text-white cursor-pointer transition"
          >
            Create Category
          </button>

          <button
            onClick={() => {
              navigator.clipboard.writeText(activeServer.id);
              setContextMenu(null);
            }}
            className="w-full text-left px-2.5 py-1.5 rounded hover:bg-[#5865f2] hover:text-white cursor-pointer transition text-[#5865f2]"
          >
            Copy Server ID
          </button>
        </div>
      )}

      {/* B. Channel Item Context Menu */}
      {contextMenu?.type === 'channel' && (
        <div
          style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
          className="fixed z-50 w-52 rounded-md bg-[#111214] p-1.5 shadow-2xl text-xs font-medium text-[#dbdee1] border border-[#1f2023] animate-in fade-in duration-75"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              setEditingChannel(contextMenu.channel);
              setEditChannelName(contextMenu.channel.name);
              setContextMenu(null);
            }}
            className="w-full text-left px-2.5 py-1.5 rounded hover:bg-[#5865f2] hover:text-white cursor-pointer transition flex items-center justify-between"
          >
            <span>Edit Channel</span>
            <span className="text-[10px] text-[#80848e]">✎</span>
          </button>

          <button
            onClick={() => {
              navigator.clipboard.writeText(contextMenu.channel.id);
              setContextMenu(null);
            }}
            className="w-full text-left px-2.5 py-1.5 rounded hover:bg-[#5865f2] hover:text-white cursor-pointer transition"
          >
            Copy Channel ID
          </button>

          <div className="h-[1px] bg-[#35363c] my-1" />

          <button
            onClick={() => {
              setDeletingChannel(contextMenu.channel);
              setContextMenu(null);
            }}
            className="w-full text-left px-2.5 py-1.5 rounded hover:bg-[#da373c] hover:text-white text-[#da373c] cursor-pointer transition flex items-center justify-between"
          >
            <span>Delete Channel</span>
            <span className="text-[10px]">✕</span>
          </button>
        </div>
      )}

      {/* C. Category Context Menu */}
      {contextMenu?.type === 'category' && (
        <div
          style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
          className="fixed z-50 w-52 rounded-md bg-[#111214] p-1.5 shadow-2xl text-xs font-medium text-[#dbdee1] border border-[#1f2023] animate-in fade-in duration-75"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              setTargetCategoryId(contextMenu.category.id);
              setIsChannelModalOpen(true);
              setContextMenu(null);
            }}
            className="w-full text-left px-2.5 py-1.5 rounded hover:bg-[#5865f2] hover:text-white cursor-pointer transition"
          >
            Create Channel
          </button>

          <button
            onClick={() => {
              setEditingCategory(contextMenu.category);
              setEditCategoryName(contextMenu.category.name);
              setContextMenu(null);
            }}
            className="w-full text-left px-2.5 py-1.5 rounded hover:bg-[#5865f2] hover:text-white cursor-pointer transition flex items-center justify-between"
          >
            <span>Edit Category</span>
            <span className="text-[10px] text-[#80848e]">✎</span>
          </button>

          <button
            onClick={() => {
              navigator.clipboard.writeText(contextMenu.category.id);
              setContextMenu(null);
            }}
            className="w-full text-left px-2.5 py-1.5 rounded hover:bg-[#5865f2] hover:text-white cursor-pointer transition"
          >
            Copy Category ID
          </button>

          <div className="h-[1px] bg-[#35363c] my-1" />

          <button
            onClick={() => {
              setDeletingCategory(contextMenu.category);
              setContextMenu(null);
            }}
            className="w-full text-left px-2.5 py-1.5 rounded hover:bg-[#da373c] hover:text-white text-[#da373c] cursor-pointer transition flex items-center justify-between"
          >
            <span>Delete Category</span>
            <span className="text-[10px]">✕</span>
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. MODALS */}
      {/* ========================================================================= */}

      {/* Create Channel Modal */}
      {isChannelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-[440px] rounded-lg bg-[#313338] shadow-2xl overflow-hidden text-[#dbdee1]">
            <div className="p-6">
              <h2 className="text-xl font-bold text-white mb-1">Create Channel</h2>
              <p className="text-xs text-[#949ba4] mb-4">
                {targetCategoryId
                  ? `in category ${categories.find((c) => c.id === targetCategoryId)?.name || ''}`
                  : `in ${activeServer.name}`}
              </p>

              <form onSubmit={handleCreateChannelSubmit} className="space-y-4 text-left">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#b5bac1] mb-2">
                    Channel Name <span className="text-[#da373c]">*</span>
                  </label>
                  <div className="flex items-center rounded bg-[#1e1f22] px-3 py-2 text-white focus-within:ring-2 focus-within:ring-[#5865f2]">
                    <span className="text-[#80848e] font-bold mr-1">#</span>
                    <input
                      type="text"
                      required
                      autoFocus
                      value={channelName}
                      onChange={(e) => setChannelName(e.target.value)}
                      placeholder="new-channel"
                      className="w-full bg-transparent outline-none text-sm placeholder-[#80848e]"
                    />
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between bg-[#2b2d31] -mx-6 -mb-6 p-4">
                  <button
                    type="button"
                    onClick={() => setIsChannelModalOpen(false)}
                    className="text-sm font-medium text-white hover:underline px-4 py-2"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!channelName.trim()}
                    className="rounded bg-[#5865f2] px-6 py-2 text-sm font-semibold text-white transition hover:bg-[#4752c4] disabled:opacity-50"
                  >
                    Create Channel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Create Category Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-[440px] rounded-lg bg-[#313338] shadow-2xl overflow-hidden text-[#dbdee1]">
            <div className="p-6">
              <h2 className="text-xl font-bold text-white mb-1">Create Category</h2>
              <p className="text-xs text-[#949ba4] mb-4">in {activeServer.name}</p>

              <form onSubmit={handleCreateCategorySubmit} className="space-y-4 text-left">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#b5bac1] mb-2">
                    Category Name <span className="text-[#da373c]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    placeholder="TEXT CHANNELS"
                    className="w-full rounded bg-[#1e1f22] p-2.5 text-sm text-white placeholder-[#80848e] outline-none transition focus:ring-2 focus:ring-[#5865f2]"
                  />
                </div>

                <div className="mt-6 flex items-center justify-between bg-[#2b2d31] -mx-6 -mb-6 p-4">
                  <button
                    type="button"
                    onClick={() => setIsCategoryModalOpen(false)}
                    className="text-sm font-medium text-white hover:underline px-4 py-2"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!categoryName.trim()}
                    className="rounded bg-[#5865f2] px-6 py-2 text-sm font-semibold text-white transition hover:bg-[#4752c4] disabled:opacity-50"
                  >
                    Create Category
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Channel Modal */}
      {editingChannel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-[440px] rounded-lg bg-[#313338] shadow-2xl overflow-hidden text-[#dbdee1]">
            <div className="p-6">
              <h2 className="text-xl font-bold text-white mb-1">Edit Channel</h2>
              <p className="text-xs text-[#949ba4] mb-4">#{editingChannel.name}</p>

              <form onSubmit={handleEditChannelSubmit} className="space-y-4 text-left">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#b5bac1] mb-2">
                    Channel Name <span className="text-[#da373c]">*</span>
                  </label>
                  <div className="flex items-center rounded bg-[#1e1f22] px-3 py-2 text-white focus-within:ring-2 focus-within:ring-[#5865f2]">
                    <span className="text-[#80848e] font-bold mr-1">#</span>
                    <input
                      type="text"
                      required
                      autoFocus
                      value={editChannelName}
                      onChange={(e) => setEditChannelName(e.target.value)}
                      className="w-full bg-transparent outline-none text-sm"
                    />
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between bg-[#2b2d31] -mx-6 -mb-6 p-4">
                  <button
                    type="button"
                    onClick={() => setEditingChannel(null)}
                    className="text-sm font-medium text-white hover:underline px-4 py-2"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!editChannelName.trim()}
                    className="rounded bg-[#5865f2] px-6 py-2 text-sm font-semibold text-white transition hover:bg-[#4752c4] disabled:opacity-50"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Channel Confirmation Modal */}
      {deletingChannel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-[440px] rounded-lg bg-[#313338] shadow-2xl overflow-hidden text-[#dbdee1]">
            <div className="p-6">
              <h2 className="text-xl font-bold text-white mb-2">Delete Channel</h2>
              <p className="text-sm text-[#dbdee1] mb-4">
                Are you sure you want to delete <strong className="text-white">#{deletingChannel.name}</strong>? This cannot be undone.
              </p>

              <div className="mt-6 flex items-center justify-between bg-[#2b2d31] -mx-6 -mb-6 p-4">
                <button
                  type="button"
                  onClick={() => setDeletingChannel(null)}
                  className="text-sm font-medium text-white hover:underline px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteChannelSubmit}
                  className="rounded bg-[#da373c] px-6 py-2 text-sm font-semibold text-white transition hover:bg-[#a1282c]"
                >
                  Delete Channel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Category Modal */}
      {editingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-[440px] rounded-lg bg-[#313338] shadow-2xl overflow-hidden text-[#dbdee1]">
            <div className="p-6">
              <h2 className="text-xl font-bold text-white mb-1">Edit Category</h2>
              <p className="text-xs text-[#949ba4] mb-4">{editingCategory.name}</p>

              <form onSubmit={handleEditCategorySubmit} className="space-y-4 text-left">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#b5bac1] mb-2">
                    Category Name <span className="text-[#da373c]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={editCategoryName}
                    onChange={(e) => setEditCategoryName(e.target.value)}
                    className="w-full rounded bg-[#1e1f22] p-2.5 text-sm text-white placeholder-[#80848e] outline-none transition focus:ring-2 focus:ring-[#5865f2]"
                  />
                </div>

                <div className="mt-6 flex items-center justify-between bg-[#2b2d31] -mx-6 -mb-6 p-4">
                  <button
                    type="button"
                    onClick={() => setEditingCategory(null)}
                    className="text-sm font-medium text-white hover:underline px-4 py-2"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!editCategoryName.trim()}
                    className="rounded bg-[#5865f2] px-6 py-2 text-sm font-semibold text-white transition hover:bg-[#4752c4] disabled:opacity-50"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Category Confirmation Modal */}
      {deletingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-[440px] rounded-lg bg-[#313338] shadow-2xl overflow-hidden text-[#dbdee1]">
            <div className="p-6">
              <h2 className="text-xl font-bold text-white mb-2">Delete Category</h2>
              <p className="text-sm text-[#dbdee1] mb-4">
                Are you sure you want to delete <strong className="text-white">{deletingCategory.name}</strong>? Channels in this category will be moved to uncategorized.
              </p>

              <div className="mt-6 flex items-center justify-between bg-[#2b2d31] -mx-6 -mb-6 p-4">
                <button
                  type="button"
                  onClick={() => setDeletingCategory(null)}
                  className="text-sm font-medium text-white hover:underline px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteCategorySubmit}
                  className="rounded bg-[#da373c] px-6 py-2 text-sm font-semibold text-white transition hover:bg-[#a1282c]"
                >
                  Delete Category
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Reusable Channel Item Sub-Component
interface ChannelItemProps {
  channel: Channel;
  isActive: boolean;
  dropTargetPosition: 'top' | 'bottom' | null;
  isDragging: boolean;
  isMuted?: boolean;
  onSelect: () => void;
  onPointerDown: (e: React.PointerEvent) => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

const ChannelItem: React.FC<ChannelItemProps> = ({
  channel,
  isActive,
  dropTargetPosition,
  isDragging,
  isMuted = false,
  onSelect,
  onPointerDown,
  onContextMenu,
}) => {
  let stateClasses = 'text-[#949ba4] hover:bg-[#35373c]/50 hover:text-[#dbdee1] opacity-100';

  if (isMuted) {
    stateClasses = 'opacity-30 text-[#6d6f78] pointer-events-none';
  } else if (isDragging) {
    stateClasses = 'opacity-25 bg-[#35373c]/30 text-[#949ba4]';
  } else if (isActive) {
    stateClasses = 'bg-[#35373c] text-white opacity-100';
  }

  return (
    <div
      data-channel-id={channel.id}
      data-category-id={channel.category || 'null'}
      onPointerDown={onPointerDown}
      onClick={onSelect}
      onContextMenu={onContextMenu}
      className={`relative group flex items-center gap-1.5 px-2 py-1.5 rounded-md cursor-pointer text-sm font-medium select-none transition-all duration-150 ${stateClasses}`}
    >
      {/* Top drop line indicator */}
      {dropTargetPosition === 'top' && (
        <div className="absolute -top-[2px] left-0 right-0 h-[2px] bg-[#5865f2] rounded-full z-20 pointer-events-none" />
      )}

      {/* Bottom drop line indicator */}
      {dropTargetPosition === 'bottom' && (
        <div className="absolute -bottom-[2px] left-0 right-0 h-[2px] bg-[#5865f2] rounded-full z-20 pointer-events-none" />
      )}

      <span className={`font-bold text-base ${isMuted ? 'text-[#4e5058]' : 'text-[#80848e]'}`}>#</span>
      <span className="truncate flex-1">{channel.name}</span>
    </div>
  );
};



