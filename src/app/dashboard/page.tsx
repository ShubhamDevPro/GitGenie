"use client";

import Link from "next/link";
import { useRequireAuth } from "../../hooks/useSession";
import { useRepositorySearch } from "../../hooks/useRepositorySearch";
import { useSidebar } from "../../hooks/useSidebar";
import { popularLanguages } from "../../utils/repositoryUtils";
import { FilterSection } from "../../components/dashboard/FilterSection";
import { RepositoryList } from "../../components/dashboard/RepositoryList";
import { RepositoryDetails } from "../../components/dashboard/RepositoryDetails";
import { Pagination } from "../../components/dashboard/Pagination";
import { Sidebar } from "../../components/sidebar";
import { LogoutButton } from "../../components/LogoutButton";
import { UserProfile } from "../../components/UserProfile";

export default function Dashboard() {
  // Require authentication for this page
  const { session, isLoading: sessionLoading, user } = useRequireAuth();

  const {
    // State
    searchQuery,
    setSearchQuery,
    repositories,
    isLoading,
    error,
    totalCount,
    currentPage,
    selectedRepo,
    readme,
    readmeLoading,
    selectedLanguage,
    setSelectedLanguage,
    sortBy,
    setSortBy,
    orderBy,
    setOrderBy,
    dateRange,
    setDateRange,
    showFilters,
    setShowFilters,
    setCurrentPage,
    setRepositories,
    setTotalCount,

    // Functions
    searchRepositories,
    handleSearch,
    resetFilters,
    handlePageChange,
    handleRepoClick,
    retryReadme,
  } = useRepositorySearch();

  const { isSidebarOpen, toggleSidebar, closeSidebar } = useSidebar();

  // Show loading spinner while session is loading
  if (sessionLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
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
        {/* Search Section */}
        <div className="mb-6 sm:mb-8">
          <div className="text-center mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-2 sm:mb-4">
              GitHub Repository Explorer
            </h1>
            <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300 px-4">
              Discover and explore amazing GitHub repositories
            </p>
          </div>

          <form
            onSubmit={handleSearch}
            className="max-w-2xl mx-auto px-4 sm:px-0"
          >
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search repositories..."
                className="w-full px-4 sm:px-6 py-3 sm:py-4 pl-10 sm:pl-14 text-base sm:text-lg bg-white/70 dark:bg-gray-800/70 backdrop-blur-lg border border-white/20 dark:border-gray-700/20 rounded-xl sm:rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-white shadow-lg"
                required
              />
              <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
                <svg
                  className="h-5 w-5 sm:h-6 sm:w-6 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="absolute right-2 top-2 bottom-2 px-3 sm:px-6 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium rounded-lg sm:rounded-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
              >
                {isLoading ? (
                  <span className="sm:hidden">...</span>
                ) : (
                  <span className="sm:hidden">Go</span>
                )}
                <span className="hidden sm:inline">
                  {isLoading ? "Searching..." : "Search"}
                </span>
              </button>
            </div>
          </form>

          {/* Filters Section */}
          <FilterSection
            showFilters={showFilters}
            setShowFilters={setShowFilters}
            selectedLanguage={selectedLanguage}
            setSelectedLanguage={setSelectedLanguage}
            sortBy={sortBy}
            setSortBy={setSortBy}
            orderBy={orderBy}
            setOrderBy={setOrderBy}
            dateRange={dateRange}
            setDateRange={setDateRange}
            searchQuery={searchQuery}
            setCurrentPage={setCurrentPage}
            searchRepositories={searchRepositories}
            setRepositories={setRepositories}
            setTotalCount={setTotalCount}
            resetFilters={resetFilters}
            popularLanguages={popularLanguages}
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="max-w-2xl mx-auto mb-6 sm:mb-8 px-4 sm:px-0">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 sm:p-4">
              <div className="flex">
                <svg
                  className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5"
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
                <div className="ml-3">
                  <p className="text-sm text-red-800 dark:text-red-200">
                    {error}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {repositories.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
            {/* Repository List */}
            <div className="order-1 lg:order-1">
              <RepositoryList
                repositories={repositories}
                selectedRepo={selectedRepo}
                totalCount={totalCount}
                currentPage={currentPage}
                handleRepoClick={handleRepoClick}
                readme={readme}
                readmeLoading={readmeLoading}
                onRetryReadme={retryReadme}
              />

              {/* Pagination */}
              <Pagination
                totalCount={totalCount}
                currentPage={currentPage}
                isLoading={isLoading}
                handlePageChange={handlePageChange}
              />
            </div>

            {/* Repository Details */}
            <div className="order-2 lg:order-2">
              <RepositoryDetails
                selectedRepo={selectedRepo}
                readme={readme}
                readmeLoading={readmeLoading}
                onRetryReadme={retryReadme}
              />
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && repositories.length === 0 && searchQuery && (
          <div className="text-center py-8 sm:py-12 px-4">
            <svg
              className="w-16 h-16 sm:w-24 sm:h-24 text-gray-400 mx-auto mb-4 sm:mb-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <h3 className="text-lg sm:text-xl font-medium text-gray-900 dark:text-white mb-2">
              No repositories found
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
              Try adjusting your search terms or search for something else
            </p>
          </div>
        )}

        {/* Welcome State */}
        {!searchQuery && repositories.length === 0 && (
          <div className="text-center py-8 sm:py-12 px-4">
            <div className="w-16 h-16 sm:w-24 sm:h-24 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full mx-auto mb-4 sm:mb-6 flex items-center justify-center">
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
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4">
              Start Your GitHub Exploration
            </h3>
            <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300 mb-6 sm:mb-8 max-w-2xl mx-auto">
              Search for repositories by name, topic, or programming language.
              Discover amazing projects, view their documentation, and explore
              the open source community.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 max-w-4xl mx-auto">
              {[
                {
                  query: "react",
                  language: "JavaScript",
                  icon: "⚛️",
                  label: "React Projects",
                },
                {
                  query: "machine learning",
                  language: "Python",
                  icon: "🤖",
                  label: "Machine Learning",
                },
                {
                  query: "typescript",
                  language: "TypeScript",
                  icon: "📘",
                  label: "TypeScript",
                },
                {
                  query: "vue",
                  language: "JavaScript",
                  icon: "💚",
                  label: "Vue.js",
                },
                {
                  query: "python",
                  language: "Python",
                  icon: "🐍",
                  label: "Python",
                },
                {
                  query: "flutter",
                  language: "Dart",
                  icon: "📱",
                  label: "Flutter Apps",
                },
              ].map((suggestion) => (
                <button
                  key={suggestion.query}
                  onClick={() => {
                    setSearchQuery(suggestion.query);
                    setSelectedLanguage(suggestion.language || "");
                    searchRepositories(suggestion.query, 1);
                  }}
                  className="p-3 sm:p-4 bg-white/70 dark:bg-gray-800/70 backdrop-blur-lg rounded-xl border border-white/20 dark:border-gray-700/20 hover:scale-105 transition-all duration-300 group"
                >
                  <div className="text-xl sm:text-2xl mb-1 sm:mb-2">
                    {suggestion.icon}
                  </div>
                  <div className="text-sm sm:text-base font-medium text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors duration-300">
                    {suggestion.label}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
