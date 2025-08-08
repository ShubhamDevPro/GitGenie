import React from "react";
import { Repository } from "../../types/repository";

interface OverrideFilters {
  language?: string;
  dateRange?: string;
  sortBy?: string;
  orderBy?: string;
}

interface FilterSectionProps {
  showFilters: boolean;
  setShowFilters: (show: boolean) => void;
  selectedLanguage: string;
  setSelectedLanguage: (language: string) => void;
  sortBy: string;
  setSortBy: (sort: string) => void;
  orderBy: string;
  setOrderBy: (order: string) => void;
  dateRange: string;
  setDateRange: (range: string) => void;
  searchQuery: string;
  setCurrentPage: (page: number) => void;
  searchRepositories: (
    query: string,
    page: number,
    overrides?: OverrideFilters
  ) => void;
  setRepositories: (repos: Repository[]) => void;
  setTotalCount: (count: number) => void;
  resetFilters: () => void;
  popularLanguages: string[];
}

export const FilterSection: React.FC<FilterSectionProps> = ({
  showFilters,
  setShowFilters,
  selectedLanguage,
  setSelectedLanguage,
  sortBy,
  setSortBy,
  orderBy,
  setOrderBy,
  dateRange,
  setDateRange,
  searchQuery,
  setCurrentPage,
  searchRepositories,
  setRepositories,
  setTotalCount,
  resetFilters,
  popularLanguages,
}) => {
  return (
    <div className="max-w-4xl mx-auto mt-6">
      <div className="flex justify-center mb-4">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center space-x-2 px-4 py-2 bg-white/70 dark:bg-gray-800/70 backdrop-blur-lg rounded-lg border border-white/20 dark:border-gray-700/20 text-gray-700 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all duration-300"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"
            />
          </svg>
          <span>Filters</span>
          <svg
            className={`w-4 h-4 transition-transform duration-300 ${
              showFilters ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
      </div>

      {showFilters && (
        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-lg rounded-2xl border border-white/20 dark:border-gray-700/20 p-6 shadow-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Language Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Programming Language
              </label>
              <select
                value={selectedLanguage}
                onChange={(e) => {
                  const newLanguage = e.target.value;
                  setSelectedLanguage(newLanguage);
                  setCurrentPage(1);
                  if (searchQuery || newLanguage || dateRange) {
                    searchRepositories(searchQuery || "popular", 1, {
                      language: newLanguage,
                    });
                  } else {
                    setRepositories([]);
                    setTotalCount(0);
                  }
                }}
                className="w-full px-3 py-2 bg-white/50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white"
              >
                <option value="">All Languages</option>
                {popularLanguages.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort By Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => {
                  const newSortBy = e.target.value;
                  setSortBy(newSortBy);
                  setCurrentPage(1);
                  if (searchQuery || selectedLanguage || dateRange) {
                    searchRepositories(searchQuery || "popular", 1, {
                      sortBy: newSortBy,
                    });
                  }
                }}
                className="w-full px-3 py-2 bg-white/50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white"
              >
                <option value="stars">Stars</option>
                <option value="forks">Forks</option>
                <option value="updated">Recently Updated</option>
              </select>
            </div>

            {/* Order Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Order
              </label>
              <select
                value={orderBy}
                onChange={(e) => {
                  const newOrderBy = e.target.value;
                  setOrderBy(newOrderBy);
                  setCurrentPage(1);
                  if (searchQuery || selectedLanguage || dateRange) {
                    searchRepositories(searchQuery || "popular", 1, {
                      orderBy: newOrderBy,
                    });
                  }
                }}
                className="w-full px-3 py-2 bg-white/50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white"
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>

            {/* Date Range Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Last Updated
              </label>
              <select
                value={dateRange}
                onChange={(e) => {
                  const newDateRange = e.target.value;
                  setDateRange(newDateRange);
                  setCurrentPage(1);
                  if (searchQuery || selectedLanguage || newDateRange) {
                    searchRepositories(searchQuery || "popular", 1, {
                      dateRange: newDateRange,
                    });
                  }
                }}
                className="w-full px-3 py-2 bg-white/50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white"
              >
                <option value="">Any Time</option>
                <option value="day">Last 24 Hours</option>
                <option value="week">Last Week</option>
                <option value="month">Last Month</option>
                <option value="year">Last Year</option>
              </select>
            </div>

            {/* Reset Filters Button */}
            <div className="flex items-end">
              <button
                onClick={resetFilters}
                className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-300"
              >
                Reset Filters
              </button>
            </div>
          </div>

          {/* Active Filters Display */}
          <div className="mt-4 flex flex-wrap gap-2">
            {selectedLanguage && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200">
                Language: {selectedLanguage}
                <button
                  onClick={() => {
                    setSelectedLanguage("");
                    setCurrentPage(1);
                    if (searchQuery || dateRange) {
                      searchRepositories(searchQuery || "popular", 1);
                    } else {
                      setRepositories([]);
                      setTotalCount(0);
                    }
                  }}
                  className="ml-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                >
                  ×
                </button>
              </span>
            )}
            {dateRange && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200">
                Updated:{" "}
                {dateRange === "day"
                  ? "Last 24h"
                  : dateRange === "week"
                  ? "Last Week"
                  : dateRange === "month"
                  ? "Last Month"
                  : "Last Year"}
                <button
                  onClick={() => {
                    setDateRange("");
                    setCurrentPage(1);
                    if (searchQuery || selectedLanguage) {
                      searchRepositories(searchQuery || "popular", 1);
                    } else {
                      setRepositories([]);
                      setTotalCount(0);
                    }
                  }}
                  className="ml-2 text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200"
                >
                  ×
                </button>
              </span>
            )}
            {(sortBy !== "stars" || orderBy !== "desc") && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-200">
                Sort: {sortBy} ({orderBy})
                <button
                  onClick={() => {
                    setSortBy("stars");
                    setOrderBy("desc");
                    setCurrentPage(1);
                    if (searchQuery || selectedLanguage || dateRange) {
                      searchRepositories(searchQuery || "popular", 1);
                    }
                  }}
                  className="ml-2 text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-200"
                >
                  ×
                </button>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
