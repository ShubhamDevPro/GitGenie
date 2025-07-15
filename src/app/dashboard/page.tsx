"use client";

import Link from "next/link";
import { useRepositorySearch } from "../../hooks/useRepositorySearch";
import { useSidebar } from "../../hooks/useSidebar";
import { popularLanguages } from "../../utils/repositoryUtils";
import { FilterSection } from "../../components/dashboard/FilterSection";
import { RepositoryList } from "../../components/dashboard/RepositoryList";
import { RepositoryDetails } from "../../components/dashboard/RepositoryDetails";
import { Pagination } from "../../components/dashboard/Pagination";
import { Sidebar } from "../../components/sidebar";

export default function Dashboard() {
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
  } = useRepositorySearch();

  const { isSidebarOpen, toggleSidebar, closeSidebar } = useSidebar();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-slate-900">
      {/* Sidebar */}
      <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />

      {/* Header */}
      <header className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-lg border-b border-white/20 dark:border-gray-700/20 sticky top-0 z-50">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              {/* Menu Button - Always visible */}
              <button
                onClick={toggleSidebar}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200"
                title="Open sidebar"
              >
                <svg
                  className="w-6 h-6 text-gray-600 dark:text-gray-400"
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

              <Link href="/" className="flex items-center space-x-2 group">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center transform transition-transform duration-300 group-hover:rotate-12">
                  <svg
                    className="w-4 h-4 text-white"
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
                <span className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors duration-300">
                  GitGenie
                </span>
              </Link>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600 dark:text-gray-300">
                Welcome back!
              </div>
              <Link
                href="/"
                className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors duration-300"
              >
                Sign Out
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Section */}
        <div className="mb-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              GitHub Repository Explorer
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Discover and explore amazing GitHub repositories
            </p>
          </div>

          <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search repositories (e.g., react, machine learning, typescript)..."
                className="w-full px-6 py-4 pl-14 text-lg bg-white/70 dark:bg-gray-800/70 backdrop-blur-lg border border-white/20 dark:border-gray-700/20 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-white shadow-lg"
                required
              />
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg
                  className="h-6 w-6 text-gray-400"
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
                className="absolute right-2 top-2 bottom-2 px-6 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium rounded-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Searching..." : "Search"}
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
          <div className="max-w-2xl mx-auto mb-8">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex">
                <svg
                  className="h-5 w-5 text-red-400"
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Repository List */}
            <div>
              <RepositoryList
                repositories={repositories}
                selectedRepo={selectedRepo}
                totalCount={totalCount}
                currentPage={currentPage}
                handleRepoClick={handleRepoClick}
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
            <RepositoryDetails
              selectedRepo={selectedRepo}
              readme={readme}
              readmeLoading={readmeLoading}
            />
          </div>
        )}

        {/* Empty State */}
        {!isLoading && repositories.length === 0 && searchQuery && (
          <div className="text-center py-12">
            <svg
              className="w-24 h-24 text-gray-400 mx-auto mb-6"
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
            <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
              No repositories found
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Try adjusting your search terms or search for something else
            </p>
          </div>
        )}

        {/* Welcome State */}
        {!searchQuery && repositories.length === 0 && (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full mx-auto mb-6 flex items-center justify-center">
              <svg
                className="w-12 h-12 text-white"
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
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Start Your GitHub Exploration
            </h3>
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
              Search for repositories by name, topic, or programming language.
              Discover amazing projects, view their documentation, and explore
              the open source community.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
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
                  className="p-4 bg-white/70 dark:bg-gray-800/70 backdrop-blur-lg rounded-xl border border-white/20 dark:border-gray-700/20 hover:scale-105 transition-all duration-300 group"
                >
                  <div className="text-2xl mb-2">{suggestion.icon}</div>
                  <div className="font-medium text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors duration-300">
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
