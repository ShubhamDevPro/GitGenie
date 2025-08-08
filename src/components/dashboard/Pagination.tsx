import React from "react";
import { generatePageNumbers } from "../../utils/repositoryUtils";

interface PaginationProps {
  totalCount: number;
  currentPage: number;
  isLoading: boolean;
  handlePageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  totalCount,
  currentPage,
  isLoading,
  handlePageChange,
}) => {
  if (totalCount <= 10) return null;

  const pageNumbers = generatePageNumbers(
    currentPage,
    totalCount,
    handlePageChange
  );

  return (
    <div className="mt-6 sm:mt-8 flex justify-center items-center space-x-1 sm:space-x-2">
      {/* Previous Button */}
      <button
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={currentPage === 1 || isLoading}
        className="px-2 py-1 sm:px-4 sm:py-2 bg-white/70 dark:bg-gray-800/70 backdrop-blur-lg rounded-lg border border-white/20 dark:border-gray-700/20 text-gray-700 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white/70 dark:disabled:hover:bg-gray-800/70 text-sm sm:text-base"
      >
        <span className="sm:hidden">Prev</span>
        <span className="hidden sm:inline">Previous</span>
      </button>

      {/* Page Numbers */}
      <div className="flex items-center space-x-1 sm:space-x-2">
        {pageNumbers.map((item) => {
          if (item.type === "ellipsis") {
            return (
              <span
                key={item.key}
                className="px-1 sm:px-2 text-gray-500 dark:text-gray-400 text-sm"
              >
                {item.text}
              </span>
            );
          }

          if (item.type === "indicator") {
            return (
              <span
                key={item.key}
                className="px-1 sm:px-2 text-xs sm:text-sm text-gray-400 dark:text-gray-500 hidden sm:inline"
              >
                {item.text}
              </span>
            );
          }

          return (
            <button
              key={item.key}
              onClick={item.onClick}
              disabled={isLoading}
              className={`px-2 py-1 sm:px-3 sm:py-2 rounded-lg border transition-all duration-300 disabled:opacity-50 text-sm sm:text-base ${
                item.isActive
                  ? "bg-purple-100 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-800 dark:text-purple-200"
                  : "bg-white/70 dark:bg-gray-800/70 backdrop-blur-lg border-white/20 dark:border-gray-700/20 text-gray-700 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-900/20"
              }`}
            >
              {item.text}
            </button>
          );
        })}
      </div>

      {/* Next Button */}
      <button
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={
          currentPage >= Math.min(Math.ceil(totalCount / 10), 100) || isLoading
        }
        className="px-2 py-1 sm:px-4 sm:py-2 bg-white/70 dark:bg-gray-800/70 backdrop-blur-lg rounded-lg border border-white/20 dark:border-gray-700/20 text-gray-700 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white/70 dark:disabled:hover:bg-gray-800/70 text-sm sm:text-base"
      >
        <span className="sm:hidden">Next</span>
        <span className="hidden sm:inline">Next</span>
      </button>
    </div>
  );
};
