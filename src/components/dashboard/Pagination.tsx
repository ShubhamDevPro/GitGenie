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
    <div className="mt-8 flex justify-center items-center space-x-2">
      {/* Previous Button */}
      <button
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={currentPage === 1 || isLoading}
        className="px-4 py-2 bg-white/70 dark:bg-gray-800/70 backdrop-blur-lg rounded-lg border border-white/20 dark:border-gray-700/20 text-gray-700 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white/70 dark:disabled:hover:bg-gray-800/70"
      >
        Previous
      </button>

      {/* Page Numbers */}
      {pageNumbers.map((item) => {
        if (item.type === "ellipsis") {
          return (
            <span
              key={item.key}
              className="px-2 text-gray-500 dark:text-gray-400"
            >
              {item.text}
            </span>
          );
        }

        if (item.type === "indicator") {
          return (
            <span
              key={item.key}
              className="px-2 text-sm text-gray-400 dark:text-gray-500"
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
            className={`px-3 py-2 rounded-lg border transition-all duration-300 disabled:opacity-50 ${
              item.isActive
                ? "bg-purple-100 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-800 dark:text-purple-200"
                : "bg-white/70 dark:bg-gray-800/70 backdrop-blur-lg border-white/20 dark:border-gray-700/20 text-gray-700 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-900/20"
            }`}
          >
            {item.text}
          </button>
        );
      })}

      {/* Next Button */}
      <button
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={
          currentPage >= Math.min(Math.ceil(totalCount / 10), 100) || isLoading
        }
        className="px-4 py-2 bg-white/70 dark:bg-gray-800/70 backdrop-blur-lg rounded-lg border border-white/20 dark:border-gray-700/20 text-gray-700 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white/70 dark:disabled:hover:bg-gray-800/70"
      >
        Next
      </button>
    </div>
  );
};
