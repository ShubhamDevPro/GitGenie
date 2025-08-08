"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useRequireAuth } from "@/hooks/useSession";
import { useSidebar } from "@/hooks/useSidebar";
import { RunProjectButton } from "@/components/my-repositories/RunProjectButton";
import { OpenProjectButton } from "@/components/my-repositories/OpenProjectButton";
import { ConnectToProjectButton } from "@/components/my-repositories/ConnectToProjectButton";
import { Sidebar } from "@/components/sidebar";
import { LogoutButton } from "@/components/LogoutButton";
import { UserProfile } from "@/components/UserProfile";
import Link from "next/link";

interface ClonedRepository {
  id: string;
  repoName: string;
  githubOwner: string;
  githubRepo: string;
  githubUrl: string;
  giteaRepoName: string;
  giteaCloneUrl: string;
  giteaWebUrl: string;
  connectionStatus: string;
  createdAt: string;
  clonedAt: string;
  lastSyncAt: string;
}

interface UserData {
  appUser: {
    id: string;
    email: string;
    name: string | null;
    createdAt: string;
  };
  giteaIntegration: {
    giteaEmail: string | null;
    giteaCreatedAt: string | null;
    hasToken: boolean;
    mappingMethod: string;
  };
  repositories: ClonedRepository[];
  summary: {
    totalRepositories: number;
    connectedRepositories: number;
    mappingIntegrity: string;
  };
}

export default function MyRepositoriesPage() {
  // Require authentication for this page - will redirect to /login if not authenticated
  const { session, isLoading: sessionLoading, user } = useRequireAuth("/login");
  const router = useRouter();
  const { isSidebarOpen, toggleSidebar, closeSidebar } = useSidebar();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<number | null>(null);

  useEffect(() => {
    // Don't proceed if session is still loading
    if (sessionLoading) return;

    // Don't proceed if user is not authenticated (useRequireAuth will handle redirect)
    if (!session) return;

    // Only fetch if we don't have data yet or if data is older than 5 minutes
    const shouldFetch =
      !userData || !lastFetchTime || Date.now() - lastFetchTime > 5 * 60 * 1000;

    if (shouldFetch) {
      fetchUserRepositories();
    } else {
      // If we have cached data, just stop loading
      setLoading(false);
    }
  }, [session, sessionLoading, userData, lastFetchTime]);

  const fetchUserRepositories = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/repositories/user-repositories", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Include cookies for authentication
      });

      if (response.status === 401) {
        // Unauthorized - redirect to login
        await signOut({ callbackUrl: "/login" });
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to fetch repositories");
      }

      const data = await response.json();
      setUserData(data);
      setLastFetchTime(Date.now());
    } catch (error) {
      console.error("Error fetching user repositories:", error);
      setError(
        error instanceof Error ? error.message : "Failed to load repositories"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRepository = async (projectId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this repository? This will remove it from both your workspace and Gitea."
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/repositories/${projectId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Include cookies for authentication
      });

      if (response.status === 401) {
        // Unauthorized - redirect to login
        await signOut({ callbackUrl: "/login" });
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to delete repository");
      }

      // Force refresh the data after deletion
      setLastFetchTime(null); // This will force a fresh fetch
      await fetchUserRepositories();
    } catch (error) {
      console.error("Error deleting repository:", error);
      alert("Failed to delete repository. Please try again.");
    }
  };

  if (sessionLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">
            {sessionLoading
              ? "Checking authentication..."
              : "Loading your repositories..."}
          </p>
        </div>
      </div>
    );
  }

  // If not authenticated, useRequireAuth will handle the redirect
  // This is an extra safety check
  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">
            Redirecting to login...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-slate-900 flex items-center justify-center">
        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-lg rounded-2xl p-8 shadow-xl border border-white/20 dark:border-gray-700/20 max-w-md mx-auto">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-red-600 dark:text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Something went wrong
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
            <button
              onClick={fetchUserRepositories}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium rounded-xl transition-all duration-300 transform hover:scale-105"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-slate-900">
      {/* Sidebar */}
      <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />

      {/* Header */}
      <header className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-lg border-b border-white/20 dark:border-gray-700/20 sticky top-0 z-50">
        <div className="w-full px-3 sm:px-4 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <div className="flex items-center space-x-2 sm:space-x-4 min-w-0 flex-1">
              {/* Menu Button - Always visible */}
              <button
                onClick={toggleSidebar}
                className="p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200 flex-shrink-0"
                title="Open sidebar"
              >
                <svg
                  className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600 dark:text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>

              <Link
                href="/"
                className="flex items-center space-x-2 group min-w-0"
              >
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center transform transition-transform duration-300 group-hover:rotate-12 flex-shrink-0">
                  <svg
                    className="w-3 h-3 sm:w-4 sm:h-4 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                    />
                  </svg>
                </div>
                <span className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors duration-300 truncate">
                  GitGenie
                </span>
              </Link>
            </div>

            <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
              <UserProfile className="hidden sm:block" />
              <LogoutButton
                className="px-2 py-1 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors duration-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                redirectTo="/"
              >
                Sign Out
              </LogoutButton>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Page Header */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-2 sm:mb-4">
            My Repositories
          </h1>
          <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300">
            Manage your cloned repositories from GitHub to your private Gitea
            workspace
          </p>
        </div>

        {userData && (
          <>
            {/* User Summary */}
            <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-lg rounded-2xl p-6 shadow-xl border border-white/20 dark:border-gray-700/20 mb-6 sm:mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                Account Summary
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-4 sm:p-6 border border-blue-200/50 dark:border-blue-700/30">
                  <div className="text-2xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                    {userData.summary.totalRepositories}
                  </div>
                  <div className="text-sm sm:text-base text-blue-800 dark:text-blue-300">
                    Total Repositories
                  </div>
                </div>
                <div className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl p-4 sm:p-6 border border-green-200/50 dark:border-green-700/30">
                  <div className="text-2xl sm:text-3xl font-bold text-green-600 dark:text-green-400 mb-1">
                    {userData.summary.connectedRepositories}
                  </div>
                  <div className="text-sm sm:text-base text-green-800 dark:text-green-300">
                    Connected
                  </div>
                </div>
                <div className="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl p-4 sm:p-6 border border-purple-200/50 dark:border-purple-700/30">
                  <div className="text-sm text-purple-600 dark:text-purple-400 mb-1">
                    Integration Method
                  </div>
                  <div className="font-medium text-purple-800 dark:text-purple-300">
                    {userData.giteaIntegration.mappingMethod}
                  </div>
                </div>
              </div>
            </div>

            {/* Repositories List */}
            {userData.repositories.length === 0 ? (
              <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-lg rounded-2xl p-8 sm:p-12 shadow-xl border border-white/20 dark:border-gray-700/20 text-center">
                <div className="w-16 h-16 sm:w-24 sm:h-24 bg-gradient-to-r from-gray-400 to-gray-500 rounded-full mx-auto mb-4 sm:mb-6 flex items-center justify-center">
                  <svg
                    className="w-8 h-8 sm:w-12 sm:h-12 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4">
                  No repositories cloned yet
                </h3>
                <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400 mb-6 sm:mb-8 max-w-md mx-auto">
                  Start by going to the dashboard and cloning your first
                  repository from GitHub.
                </p>
                <button
                  onClick={() => router.push("/dashboard")}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg"
                >
                  Go to Dashboard
                </button>
              </div>
            ) : (
              <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/20 overflow-hidden">
                <div className="px-6 py-4 border-b border-white/20 dark:border-gray-700/20 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20">
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
                    Cloned Repositories
                  </h2>
                </div>
                <div className="divide-y divide-white/20 dark:divide-gray-700/20">
                  {userData.repositories.map((repo) => (
                    <div
                      key={repo.id}
                      className="p-6 hover:bg-white/50 dark:hover:bg-gray-700/30 transition-all duration-300"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3 mb-4">
                            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white truncate">
                              {repo.githubOwner}/{repo.githubRepo}
                            </h3>
                            <div className="flex items-center space-x-2 mt-2 sm:mt-0">
                              <span
                                className={`inline-flex items-center px-3 py-1 rounded-full text-xs sm:text-sm font-medium w-fit ${
                                  repo.connectionStatus === "connected"
                                    ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                                    : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
                                }`}
                              >
                                {repo.connectionStatus}
                              </span>
                              {/* VM Running Status Indicator - will be populated by ConnectToProjectButton */}
                              <div
                                id={`vm-status-${repo.id}`}
                                className="hidden"
                              >
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse mr-1"></div>
                                  🚀 VM Running
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                            <div className="flex items-center space-x-2">
                              <svg
                                className="w-4 h-4 text-gray-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                                />
                              </svg>
                              <span className="font-medium">Source:</span>
                              <a
                                href={repo.githubUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 transition-colors duration-200 truncate"
                              >
                                {repo.githubUrl}
                              </a>
                            </div>
                            <div className="flex items-center space-x-4">
                              <div className="flex items-center space-x-2">
                                <svg
                                  className="w-4 h-4 text-gray-400"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z"
                                  />
                                </svg>
                                <span className="font-medium">
                                  Gitea Repository:
                                </span>
                                <span className="text-gray-900 dark:text-gray-100">
                                  {repo.giteaRepoName}
                                </span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <svg
                                  className="w-4 h-4 text-gray-400"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                  />
                                </svg>
                                <span className="font-medium">Cloned:</span>
                                <span>
                                  {new Date(repo.clonedAt).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                            {repo.giteaCloneUrl && (
                              <div className="flex items-center space-x-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                                <svg
                                  className="w-4 h-4 text-gray-400 flex-shrink-0"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                                  />
                                </svg>
                                <span className="font-medium text-gray-700 dark:text-gray-300">
                                  Clone URL:
                                </span>
                                <code className="bg-white dark:bg-gray-900 px-2 py-1 rounded text-xs flex-1 truncate font-mono">
                                  {repo.giteaCloneUrl}
                                </code>
                                <button
                                  onClick={() =>
                                    navigator.clipboard.writeText(
                                      repo.giteaCloneUrl
                                    )
                                  }
                                  className="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 text-xs font-medium px-2 py-1 rounded hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-colors duration-200"
                                >
                                  Copy
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Project Actions Section */}
                        <div className="lg:w-80">
                          <div className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border border-orange-200/50 dark:border-orange-700/30 rounded-xl p-4">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-sm font-semibold text-orange-800 dark:text-orange-300">
                                🚀 Project Actions
                              </h4>
                              <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                                AI Agent Integration
                              </span>
                            </div>
                            <p className="text-xs text-orange-700 dark:text-orange-400 mb-4">
                              Open your project in VS Code, launch it with
                              automatic environment detection, or connect to
                              running instances
                            </p>

                            {/* Action Buttons */}
                            <div className="flex flex-col gap-3">
                              {/* Connect to Running Project (shows only if project is running) */}
                              <ConnectToProjectButton
                                repositoryId={repo.id}
                                repositoryName={repo.giteaRepoName}
                                className="text-sm w-full"
                              />

                              <OpenProjectButton
                                repositoryId={repo.id}
                                repositoryName={repo.giteaRepoName}
                                githubUrl={repo.githubUrl}
                                className="text-sm w-full"
                              />
                              <RunProjectButton
                                repositoryId={repo.id}
                                repositoryName={repo.giteaRepoName}
                                className="text-sm w-full"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Repository Actions */}
                        <div className="flex flex-col sm:flex-row gap-3 lg:w-auto">
                          {repo.giteaWebUrl && (
                            <a
                              href={repo.giteaWebUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                            >
                              <svg
                                className="w-4 h-4 mr-2"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                />
                              </svg>
                              View in Gitea
                            </a>
                          )}
                          <button
                            onClick={() => handleDeleteRepository(repo.id)}
                            className="inline-flex items-center justify-center px-4 py-2 border border-red-300 dark:border-red-600 shadow-sm text-sm font-medium rounded-lg text-red-700 dark:text-red-400 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-200"
                          >
                            <svg
                              className="w-4 h-4 mr-2"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
