"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SessionContextProvider } from "./SessionContext";

interface ProvidersProps {
  children: ReactNode;
  session?: any;
}

function SessionWrapper({ children }: { children: ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    // Handle session refresh on window focus
    const handleFocus = () => {
      if (document.visibilityState === "visible") {
        // Trigger session refresh
        window.dispatchEvent(new Event("focus"));
      }
    };

    document.addEventListener("visibilitychange", handleFocus);
    return () => document.removeEventListener("visibilitychange", handleFocus);
  }, []);

  useEffect(() => {
    // Handle storage events for cross-tab logout
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "nextauth.message") {
        const message = JSON.parse(e.newValue || "{}");
        if (message.event === "session" && message.data === null) {
          // User logged out in another tab
          router.push("/login");
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [router]);

  return <SessionContextProvider>{children}</SessionContextProvider>;
}

export default function Providers({ children, session }: ProvidersProps) {
  return (
    <SessionProvider
      session={session}
      refetchOnWindowFocus={true}
      refetchWhenOffline={false}
      refetchInterval={5 * 60} // Refetch every 5 minutes
    >
      <SessionWrapper>{children}</SessionWrapper>
    </SessionProvider>
  );
}
