"use client";

import { useSession } from "@/hooks/useSession";
import { LogoutButton } from "./LogoutButton";
import Image from "next/image";

interface UserProfileProps {
  showFullProfile?: boolean;
  className?: string;
}

export function UserProfile({
  showFullProfile = false,
  className = "",
}: UserProfileProps) {
  const { user, session } = useSession();

  if (!user) return null;

  return (
    <div
      className={`bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 border border-gray-200/50 dark:border-gray-700/50 ${className}`}
    >
      <div className="flex items-center space-x-3">
        {/* User Avatar */}
        <div className="flex-shrink-0">
          {user.image || session?.user?.image ? (
            <Image
              src={user.image || session?.user?.image || ""}
              alt={user.name || session?.user?.name || "User"}
              width={40}
              height={40}
              className="w-10 h-10 rounded-full object-cover border-2 border-white/20 dark:border-gray-700/20"
              onError={(e) => {
                // Fallback to initials if image fails to load
                const target = e.target as HTMLImageElement;
                target.style.display = "none";
                const fallback = target.nextElementSibling as HTMLElement;
                if (fallback) fallback.style.display = "flex";
              }}
              onLoad={(e) => {
                // Ensure the image is visible when it loads successfully
                const target = e.target as HTMLImageElement;
                const fallback = target.nextElementSibling as HTMLElement;
                if (fallback) fallback.style.display = "none";
              }}
            />
          ) : null}
          <div
            className={`w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center ${
              user.image || session?.user?.image ? "hidden" : "flex"
            }`}
          >
            <span className="text-white font-medium text-sm">
              {user.name?.charAt(0)?.toUpperCase() ||
                session?.user?.name?.charAt(0)?.toUpperCase() ||
                user.email?.charAt(0)?.toUpperCase() ||
                session?.user?.email?.charAt(0)?.toUpperCase() ||
                "U"}
            </span>
          </div>
        </div>

        {/* User Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {user.name || session?.user?.name || "Anonymous User"}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {user.email || session?.user?.email}
          </p>
          {showFullProfile && (
            <div className="mt-2 space-y-1">
              <div className="flex items-center space-x-2">
                <span
                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    user.isVerified
                      ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                      : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400"
                  }`}
                >
                  {user.isVerified ? "Verified" : "Unverified"}
                </span>
                {session?.user?.provider && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                    {session.user.provider}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {showFullProfile && (
        <div className="mt-4 pt-4 border-t border-gray-200/50 dark:border-gray-700/50">
          <LogoutButton className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-red-600 hover:text-red-500 dark:text-red-400 dark:hover:text-red-300 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 rounded-lg transition-colors duration-200" />
        </div>
      )}
    </div>
  );
}
