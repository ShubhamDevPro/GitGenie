"use client";

import {
  createContext,
  useContext,
  ReactNode,
  useEffect,
  useState,
} from "react";
import { useSession as useNextAuthSession } from "next-auth/react";

interface SessionContextType {
  isOnline: boolean;
  lastActivity: Date;
  sessionExpiry: Date | null;
  refreshSession: () => Promise<void>;
  updateActivity: () => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

interface SessionContextProviderProps {
  children: ReactNode;
}

export function SessionContextProvider({
  children,
}: SessionContextProviderProps) {
  const { data: session, update } = useNextAuthSession();
  const [isOnline, setIsOnline] = useState(true);
  const [lastActivity, setLastActivity] = useState(new Date());
  const [sessionExpiry, setSessionExpiry] = useState<Date | null>(null);

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Track user activity
  useEffect(() => {
    const events = [
      "mousedown",
      "mousemove",
      "keypress",
      "scroll",
      "touchstart",
    ];

    const updateActivity = () => {
      setLastActivity(new Date());
    };

    events.forEach((event) => {
      document.addEventListener(event, updateActivity, true);
    });

    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, updateActivity, true);
      });
    };
  }, []);

  // Calculate session expiry
  useEffect(() => {
    if (session) {
      // NextAuth JWT tokens typically expire in 30 days by default
      const expiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      setSessionExpiry(expiry);
    } else {
      setSessionExpiry(null);
    }
  }, [session]);

  // Auto-refresh session when coming back online
  useEffect(() => {
    if (isOnline && session) {
      refreshSession();
    }
  }, [isOnline]);

  const refreshSession = async () => {
    try {
      await update();
    } catch (error) {
      console.error("Failed to refresh session:", error);
    }
  };

  const updateActivityManually = () => {
    setLastActivity(new Date());
  };

  const contextValue: SessionContextType = {
    isOnline,
    lastActivity,
    sessionExpiry,
    refreshSession,
    updateActivity: updateActivityManually,
  };

  return (
    <SessionContext.Provider value={contextValue}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSessionContext() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error(
      "useSessionContext must be used within a SessionContextProvider"
    );
  }
  return context;
}
