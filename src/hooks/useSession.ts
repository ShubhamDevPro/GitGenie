"use client";

import { useSession as useNextAuthSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface UseSessionOptions {
     required?: boolean;
     redirectTo?: string;
     onUnauthenticated?: () => void;
}

export function useSession(options: UseSessionOptions = {}) {
     const { required = false, redirectTo = "/login", onUnauthenticated } = options;
     const { data: session, status, update } = useNextAuthSession();
     const router = useRouter();

     useEffect(() => {
          if (required && status === "unauthenticated") {
               if (onUnauthenticated) {
                    onUnauthenticated();
               } else {
                    router.push(redirectTo);
               }
          }
     }, [required, status, router, redirectTo, onUnauthenticated]);

     const refreshSession = async () => {
          try {
               await update();
          } catch (error) {
               console.error("Failed to refresh session:", error);
          }
     };

     return {
          session,
          status,
          isLoading: status === "loading",
          isAuthenticated: status === "authenticated",
          isUnauthenticated: status === "unauthenticated",
          user: session?.user,
          refreshSession,
          update,
     };
}

export function useRequireAuth(redirectTo: string = "/login") {
     return useSession({ required: true, redirectTo });
}
