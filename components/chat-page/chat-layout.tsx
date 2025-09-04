"use client";

import { useState } from "react";
import { ChatSidebar } from "@/components/chat-page/chat-sidebar";
import { ChatInterface } from "@/components/chat-page/chat-interface";
import {
  createChat,
  updateChat,
  deleteChat,
  updateChatTitle,
} from "@/app/actions/action";
import type { Message } from "ai";
import type { ChatItem } from "@/types/type";
import type { MessageAttachment } from "@/types/type";

interface ChatLayoutProps {
  chats: ChatItem[];
  currentChat: ChatItem | null;
  chatId: string | null;
}

export function ChatLayout({
  chats: initialChats,
  currentChat,
  chatId,
}: ChatLayoutProps) {
  const [chats, setChats] = useState<ChatItem[]>(initialChats);
  const [currentChatId, setCurrentChatId] = useState<string | null>(chatId);
  const [currentChatData, setCurrentChatData] = useState<ChatItem | null>(
    currentChat
  );
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateUrlSilently = (newChatId: string | null) => {
    const newUrl = newChatId ? `/chat/${newChatId}` : "/chat";
    window.history.replaceState(null, "", newUrl);
    setCurrentChatId(newChatId);
  };

  const handleNewChat = () => {
    setCurrentChatData(null);
    setCurrentChatId(null);
    updateUrlSilently(null);
  };

  const handleSelectChat = (selectedChatId: string) => {
    const selectedChat = chats.find((chat) => chat._id === selectedChatId);
    setCurrentChatData(selectedChat || null);
    setCurrentChatId(selectedChatId);
    updateUrlSilently(selectedChatId);
  };

  const handleCreateNewChat = async (
    messages: Message[],
    attachments?: MessageAttachment[]
  ) => {
    try {
      setIsLoading(true);
      setError(null);
      const newChat = await createChat(messages, attachments);
      setChats((prev) => [newChat, ...prev]);
      setCurrentChatData(newChat);

      updateUrlSilently(newChat._id);

      return newChat;
    } catch (error) {
      console.error("Error creating chat:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to create chat";
      
      if (errorMessage.includes("Authentication required") || errorMessage.includes("Unauthorized")) {
        setError("Please sign in again to continue chatting.");
        // Redirect to sign-in page after a short delay
        setTimeout(() => {
          window.location.href = "/sign-in";
        }, 2000);
      } else {
        setError(errorMessage);
      }
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateChat = async (
    chatId: string,
    messages: Message[],
    attachments?: MessageAttachment[]
  ) => {
    try {
      setError(null);
      const updatedChat = await updateChat(chatId, messages, attachments);
      setChats((prev) =>
        prev.map((chat) => (chat._id === chatId ? updatedChat : chat))
      );

      if (currentChatId === chatId) {
        setCurrentChatData(updatedChat);
      }
    } catch (error) {
      console.error("Error updating chat:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to update chat";
      
      if (errorMessage.includes("Authentication required") || errorMessage.includes("Unauthorized")) {
        setError("Please sign in again to continue chatting.");
        // Redirect to sign-in page after a short delay
        setTimeout(() => {
          window.location.href = "/sign-in";
        }, 2000);
      } else {
        setError(errorMessage);
      }
    }
  };

  const handleDeleteChat = async (chatId: string) => {
    if (!confirm("Are you sure you want to delete this chat?")) return;

    try {
      setError(null);
      await deleteChat(chatId);
      setChats((prev) => prev.filter((chat) => chat._id !== chatId));

      if (chatId === currentChatId) {
        setCurrentChatData(null);
        setCurrentChatId(null);
        updateUrlSilently(null);
      }
    } catch (error) {
      console.error("Error deleting chat:", error);
      setError("Failed to delete chat. Please try again.");
    }
  };

  const handleEditChat = async (chatId: string) => {
    const chat = chats.find((c) => c._id === chatId);
    if (!chat) return;

    const newTitle = prompt("Enter new title:", chat.title);
    if (newTitle && newTitle !== chat.title) {
      try {
        await updateChatTitle(chatId, newTitle);
        const updatedChats = chats.map((c) =>
          c._id === chatId ? { ...c, title: newTitle } : c
        );
        setChats(updatedChats);

        if (currentChatId === chatId) {
          setCurrentChatData((prev) =>
            prev ? { ...prev, title: newTitle } : null
          );
        }
      } catch (error) {
        console.error("Error updating chat title:", error);
      }
    }
  };

  const handleToggleCollapse = (collapsed: boolean) => {
    setIsCollapsed(collapsed);
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-[#1a1a1a] via-[#212121] to-[#2a2a2a] overflow-hidden relative">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#10a37f]/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
      </div>
      {error && (
        <div className="absolute top-4 right-4 bg-red-500 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-md z-50 text-sm max-w-xs sm:max-w-none">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 text-white hover:text-gray-200"
          >
            ×
          </button>
        </div>
      )}

      <ChatSidebar
        selectedChatId={currentChatId}
        availableChats={chats.reduce((acc, chat) => {
          acc[chat._id] = chat;
          return acc;
        }, {} as Record<string, ChatItem>)}
        onNewChat={handleNewChat}
        onSelectChat={handleSelectChat}
        onEditChat={handleEditChat}
        onDeleteChat={handleDeleteChat}
        onToggleCollapse={handleToggleCollapse}
        isMobileMenuOpen={isMobileSidebarOpen}
        onToggleMobileMenu={setIsMobileSidebarOpen}
      />

      <div
        className={`flex-1 flex flex-col min-w-0 overflow-hidden transition-all duration-300 ease-in-out relative z-10 ${
          isCollapsed ? "ml-0" : ""
        }`}
        style={{
          marginLeft: isCollapsed ? "0" : "0",
        }}
      >
        <ChatInterface
          chatId={currentChatId}
          initialMessages={currentChatData?.messages || []}
          onUpdateChat={handleUpdateChat}
          onCreateNewChat={handleCreateNewChat}
          isLoading={isLoading}
          isCollapsed={isCollapsed}
          onToggleMobileSidebar={() =>
            setIsMobileSidebarOpen(!isMobileSidebarOpen)
          }
          isMobileSidebarOpen={isMobileSidebarOpen}
          onSetMobileSidebarOpen={setIsMobileSidebarOpen}
        />
      </div>
    </div>
  );
}
