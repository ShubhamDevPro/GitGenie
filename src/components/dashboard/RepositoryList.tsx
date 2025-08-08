import React from "react";
import Image from "next/image";
import { formatDate, formatDescription } from "../../utils/repositoryUtils";
import { Repository } from "../../types/repository";
import {
  StarIcon,
  ForkIcon,
  GitHubIcon,
  CloneIcon,
  ChevronDownIcon,
  ReadmeDisplay,
} from "../shared/RepositoryComponents";

interface RepositoryListProps {
  repositories: Repository[];
  selectedRepo: Repository | null;
  totalCount: number;
  currentPage: number;
  handleRepoClick: (repo: Repository) => void;
  readme?: string;
  readmeLoading?: boolean;
  onRetryReadme?: () => void;
}

export const RepositoryList: React.FC<RepositoryListProps> = ({
  repositories,
  selectedRepo,
  totalCount,
  currentPage,
  handleRepoClick,
  readme,
  readmeLoading,
  onRetryReadme,
}) => {
  return (
    <div>
      <div className="mb-3 sm:mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <h2 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">
          Search Results
        </h2>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          <div className="text-xs sm:text-sm">
            {totalCount.toLocaleString()} repositories found
          </div>
          {totalCount > 10 && (
            <div className="text-xs">
              Showing {(currentPage - 1) * 10 + 1}-
              {Math.min(currentPage * 10, totalCount)} of{" "}
              {totalCount.toLocaleString()}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3 sm:space-y-4">
        {repositories.map((repo) => (
          <div
            key={repo.id}
            className={`p-4 sm:p-6 bg-white/70 dark:bg-gray-800/70 backdrop-blur-lg rounded-xl sm:rounded-2xl border border-white/20 dark:border-gray-700/20 cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg ${
              selectedRepo?.id === repo.id
                ? "ring-2 ring-purple-500 border-purple-300 dark:border-purple-600"
                : ""
            }`}
          >
            <div onClick={() => handleRepoClick(repo)}>
              <div className="flex items-start justify-between mb-2 sm:mb-3">
                <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                  <Image
                    src={repo.owner.avatar_url}
                    alt={repo.owner.login}
                    width={32}
                    height={32}
                    className="w-6 h-6 sm:w-8 sm:h-8 rounded-full flex-shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white truncate">
                      {repo.name}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
                      {repo.owner.login}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 sm:space-x-4">
                  <div className="flex flex-col sm:flex-row items-end sm:items-center space-y-1 sm:space-y-0 sm:space-x-4 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center">
                      <StarIcon className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                      {repo.stargazers_count.toLocaleString()}
                    </div>
                    <div className="flex items-center">
                      <ForkIcon className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                      {repo.forks_count.toLocaleString()}
                    </div>
                    {repo.language && (
                      <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 rounded-full text-xs">
                        {repo.language}
                      </span>
                    )}
                  </div>

                  {/* Expand indicator for mobile */}
                  <div className="lg:hidden">
                    <ChevronDownIcon
                      className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${
                        selectedRepo?.id === repo.id ? "rotate-180" : ""
                      }`}
                    />
                  </div>
                </div>
              </div>{" "}
              <p className="text-gray-600 dark:text-gray-300 text-xs sm:text-sm mb-2 sm:mb-3 line-clamp-2">
                {formatDescription(repo.description)}
              </p>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <span>Last pushed {formatDate(repo.pushed_at)}</span>
                <a
                  href={repo.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-purple-600 dark:text-purple-400 hover:underline whitespace-nowrap"
                >
                  View on GitHub →
                </a>
              </div>
            </div>

            {/* Inline Details on Mobile */}
            {selectedRepo?.id === repo.id && (
              <div className="lg:hidden mt-4 pt-4 border-t border-gray-200 dark:border-gray-600 animate-in slide-in-from-top duration-300">
                <div className="flex flex-col gap-3">
                  <div className="flex gap-2">
                    <a
                      href={repo.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 inline-flex items-center justify-center px-3 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium rounded-lg transition-all duration-300 text-sm transform hover:scale-105 active:scale-95"
                    >
                      <GitHubIcon className="w-4 h-4 mr-2" />
                      GitHub
                    </a>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(
                          `git clone ${repo.html_url}.git`
                        );
                      }}
                      className="flex-1 inline-flex items-center justify-center px-3 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-medium rounded-lg transition-all duration-300 text-sm transform hover:scale-105 active:scale-95"
                      title="Copy clone command to clipboard"
                    >
                      <CloneIcon className="w-4 h-4 mr-2" />
                      Clone
                    </button>
                  </div>

                  {/* README Section */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                      README Preview
                    </h4>
                    <ReadmeDisplay
                      readme={readme || ""}
                      readmeLoading={readmeLoading || false}
                      onRetry={
                        onRetryReadme
                          ? () => {
                              onRetryReadme();
                            }
                          : undefined
                      }
                      isMobile={true}
                    />
                  </div>

                  {/* Tap to collapse hint */}
                  <div className="text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Tap again to collapse
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
