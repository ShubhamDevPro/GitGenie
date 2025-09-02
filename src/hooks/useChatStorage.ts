import { useState, useEffect, useCallback } from 'react';

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

export interface ChatSession {
  repositoryId: string;
  repositoryName: string;
  messages: ChatMessage[];
  lastUpdated: Date;
}

const STORAGE_KEY = 'gitgenie_chat_sessions';
const MAX_SESSIONS = 50; // Limit to prevent localStorage from getting too large
const MAX_MESSAGES_PER_SESSION = 100; // Limit messages per session

export function useChatStorage(repositoryId: string, repositoryName: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load messages from localStorage on mount
  useEffect(() => {
    if (!repositoryId) return;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const sessions: ChatSession[] = JSON.parse(stored);
        const currentSession = sessions.find(session => session.repositoryId === repositoryId);
        
        if (currentSession) {
          // Convert timestamp strings back to Date objects
          const messagesWithDates = currentSession.messages.map(msg => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }));
          setMessages(messagesWithDates);
        } else {
          // Create initial welcome message for new sessions
          const welcomeMessage: ChatMessage = {
            id: '1',
            text: `Welcome! I'm your AI assistant for the ${repositoryName} project. I can help you understand your code, debug issues, suggest improvements, and answer questions about your project structure. What would you like to know?`,
            sender: 'bot',
            timestamp: new Date(),
          };
          setMessages([welcomeMessage]);
        }
      } else {
        // Create initial welcome message for first time users
        const welcomeMessage: ChatMessage = {
          id: '1',
          text: `Welcome! I'm your AI assistant for the ${repositoryName} project. I can help you understand your code, debug issues, suggest improvements, and answer questions about your project structure. What would you like to know?`,
          sender: 'bot',
          timestamp: new Date(),
        };
        setMessages([welcomeMessage]);
      }
    } catch (error) {
      console.error('Error loading chat messages from localStorage:', error);
      // Fallback to default welcome message
      const welcomeMessage: ChatMessage = {
        id: '1',
        text: `Welcome! I'm your AI assistant for the ${repositoryName} project. I can help you understand your code, debug issues, suggest improvements, and answer questions about your project structure. What would you like to know?`,
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
    } finally {
      setIsLoaded(true);
    }
  }, [repositoryId, repositoryName]);

  // Save messages to localStorage whenever messages change
  const saveToStorage = useCallback((newMessages: ChatMessage[]) => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      let sessions: ChatSession[] = stored ? JSON.parse(stored) : [];
      
      // Remove existing session for this repository
      sessions = sessions.filter(session => session.repositoryId !== repositoryId);
      
      // Limit messages to prevent localStorage overflow
      const limitedMessages = newMessages.slice(-MAX_MESSAGES_PER_SESSION);
      
      // Add current session
      const currentSession: ChatSession = {
        repositoryId,
        repositoryName,
        messages: limitedMessages,
        lastUpdated: new Date()
      };
      
      sessions.unshift(currentSession); // Add to beginning
      
      // Limit total sessions
      sessions = sessions.slice(0, MAX_SESSIONS);
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    } catch (error) {
      console.error('Error saving chat messages to localStorage:', error);
      // If localStorage is full, try to clear old sessions and retry
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const sessions: ChatSession[] = JSON.parse(stored);
          // Keep only the 10 most recent sessions
          const recentSessions = sessions.slice(0, 10);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(recentSessions));
          
          // Try saving again with reduced sessions
          const currentSession: ChatSession = {
            repositoryId,
            repositoryName,
            messages: newMessages.slice(-MAX_MESSAGES_PER_SESSION),
            lastUpdated: new Date()
          };
          
          const updatedSessions = recentSessions.filter(s => s.repositoryId !== repositoryId);
          updatedSessions.unshift(currentSession);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSessions));
        }
      } catch (retryError) {
        console.error('Failed to save chat messages even after cleanup:', retryError);
      }
    }
  }, [repositoryId, repositoryName]);

  // Add a new message
  const addMessage = useCallback((message: ChatMessage) => {
    setMessages(prev => {
      const newMessages = [...prev, message];
      saveToStorage(newMessages);
      return newMessages;
    });
  }, [saveToStorage]);

  // Add multiple messages (useful for user + bot message pairs)
  const addMessages = useCallback((newMessages: ChatMessage[]) => {
    setMessages(prev => {
      const updatedMessages = [...prev, ...newMessages];
      saveToStorage(updatedMessages);
      return updatedMessages;
    });
  }, [saveToStorage]);

  // Update messages array directly
  const updateMessages = useCallback((newMessages: ChatMessage[]) => {
    setMessages(newMessages);
    saveToStorage(newMessages);
  }, [saveToStorage]);

  // Clear current session messages
  const clearMessages = useCallback(() => {
    const welcomeMessage: ChatMessage = {
      id: '1',
      text: `Welcome! I'm your AI assistant for the ${repositoryName} project. I can help you understand your code, debug issues, suggest improvements, and answer questions about your project structure. What would you like to know?`,
      sender: 'bot',
      timestamp: new Date(),
    };
    
    setMessages([welcomeMessage]);
    saveToStorage([welcomeMessage]);
  }, [repositoryName, saveToStorage]);



  // Get storage usage info
  const getStorageInfo = useCallback(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const sessions = stored ? JSON.parse(stored) : [];
      const storageSize = stored ? stored.length : 0;
      
      return {
        totalSessions: sessions.length,
        currentSessionMessages: messages.length,
        storageSize,
        storageSizeKB: Math.round(storageSize / 1024)
      };
    } catch (error) {
      console.error('Error getting storage info:', error);
      return {
        totalSessions: 0,
        currentSessionMessages: messages.length,
        storageSize: 0,
        storageSizeKB: 0
      };
    }
  }, [messages.length]);

  return {
    messages,
    isLoaded,
    addMessage,
    addMessages,
    updateMessages,
    clearMessages,
    getStorageInfo
  };
}
