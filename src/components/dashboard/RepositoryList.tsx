import React from "react";
import Image from "next/image";
import { formatDate } from "../../utils/repositoryUtils";

interface Repository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  pushed_at: string;
  owner: {
    login: string;
    avatar_url: string;
  };
}

interface RepositoryListProps {
  repositories: Repository[];
  selectedRepo: Repository | null;
  totalCount: number;
  currentPage: number;
  handleRepoClick: (repo: Repository) => void;
}

export const RepositoryList: React.FC<RepositoryListProps> = ({
  repositories,
  selectedRepo,
  totalCount,
  currentPage,
  handleRepoClick,
}) => {
  return (
    <div>
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Search Results
        </h2>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          <div>{totalCount.toLocaleString()} repositories found</div>
          {totalCount > 10 && (
            <div className="text-xs">
              Showing {(currentPage - 1) * 10 + 1}-
              {Math.min(currentPage * 10, totalCount)} of{" "}
              {totalCount.toLocaleString()}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {repositories.map((repo) => (
          <div
            key={repo.id}
            onClick={() => handleRepoClick(repo)}
            className={`p-6 bg-white/70 dark:bg-gray-800/70 backdrop-blur-lg rounded-2xl border border-white/20 dark:border-gray-700/20 cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg ${
              selectedRepo?.id === repo.id
                ? "ring-2 ring-purple-500 border-purple-300 dark:border-purple-600"
                : ""
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-3">
                <Image
                  src={repo.owner.avatar_url}
                  alt={repo.owner.login}
                  width={32}
                  height={32}
                  className="w-8 h-8 rounded-full"
                />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {repo.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {repo.owner.login}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                <div className="flex items-center">
                  <svg
                    className="w-4 h-4 mr-1"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  {repo.stargazers_count.toLocaleString()}
                </div>
                <div className="flex items-center">
                  <svg
                    className="w-4 h-4 mr-1"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M7.5 3A1.5 1.5 0 006 4.5v.793c.026.009.051.02.076.032L7.674 6.51a.5.5 0 01.252.434V10.5A1.5 1.5 0 009.426 12h1.148A1.5 1.5 0 0012 10.5V6.944a.5.5 0 01.252-.434L13.85 5.325c.025-.012.05-.023.076-.032V4.5A1.5 1.5 0 0012.5 3h-5zM5 4.5a2.5 2.5 0 115 0v.793l1.098.549A1.5 1.5 0 0112 7.056V10.5a2.5 2.5 0 01-2.5 2.5h-3A2.5 2.5 0 014 10.5V7.056a1.5 1.5 0 01.902-1.214L6 5.293V4.5z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {repo.forks_count.toLocaleString()}
                </div>
                {repo.language && (
                  <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 rounded-full text-xs">
                    {repo.language}
                  </span>
                )}
              </div>
            </div>

            <p className="text-gray-600 dark:text-gray-300 text-sm mb-3 line-clamp-2">
              {repo.description || "No description available"}
            </p>

            <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
              <span>Last pushed {formatDate(repo.pushed_at)}</span>
              <a
                href={repo.html_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-purple-600 dark:text-purple-400 hover:underline"
              >
                View on GitHub →
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
