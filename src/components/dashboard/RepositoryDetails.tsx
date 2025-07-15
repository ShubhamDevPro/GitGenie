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

interface RepositoryDetailsProps {
  selectedRepo: Repository | null;
  readme: string;
  readmeLoading: boolean;
}

export const RepositoryDetails: React.FC<RepositoryDetailsProps> = ({
  selectedRepo,
  readme,
  readmeLoading,
}) => {
  return (
    <div className="lg:sticky lg:top-24 lg:h-fit">
      {selectedRepo ? (
        <div className="p-6 bg-white/70 dark:bg-gray-800/70 backdrop-blur-lg rounded-2xl border border-white/20 dark:border-gray-700/20">
          <div className="mb-6">
            <div className="flex items-center space-x-3 mb-4">
              <Image
                src={selectedRepo.owner.avatar_url}
                alt={selectedRepo.owner.login}
                width={48}
                height={48}
                className="w-12 h-12 rounded-full"
              />
              <div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {selectedRepo.name}
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  {selectedRepo.full_name}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-6 mb-4">
              <div className="flex items-center text-yellow-500">
                <svg
                  className="w-5 h-5 mr-1"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span className="font-semibold">
                  {selectedRepo.stargazers_count.toLocaleString()}
                </span>
                <span className="ml-1 text-gray-500 dark:text-gray-400">
                  stars
                </span>
              </div>

              <div className="flex items-center text-blue-500">
                <svg
                  className="w-5 h-5 mr-1"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M7.5 3A1.5 1.5 0 006 4.5v.793c.026.009.051.02.076.032L7.674 6.51a.5.5 0 01.252.434V10.5A1.5 1.5 0 009.426 12h1.148A1.5 1.5 0 0012 10.5V6.944a.5.5 0 01.252-.434L13.85 5.325c.025-.012.05-.023.076-.032V4.5A1.5 1.5 0 0012.5 3h-5zM5 4.5a2.5 2.5 0 115 0v.793l1.098.549A1.5 1.5 0 0112 7.056V10.5a2.5 2.5 0 01-2.5 2.5h-3A2.5 2.5 0 014 10.5V7.056a1.5 1.5 0 01.902-1.214L6 5.293V4.5z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="font-semibold">
                  {selectedRepo.forks_count.toLocaleString()}
                </span>
                <span className="ml-1 text-gray-500 dark:text-gray-400">
                  forks
                </span>
              </div>

              {selectedRepo.language && (
                <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 rounded-full text-sm font-medium">
                  {selectedRepo.language}
                </span>
              )}
            </div>

            <p className="text-gray-600 dark:text-gray-300 mb-4">
              {selectedRepo.description || "No description available"}
            </p>

            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Last pushed: {formatDate(selectedRepo.pushed_at)}
            </p>

            <div className="flex space-x-3">
              <a
                href={selectedRepo.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium rounded-lg transition-all duration-300 transform hover:scale-105"
              >
                <svg
                  className="w-5 h-5 mr-2"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z"
                    clipRule="evenodd"
                  />
                </svg>
                View on GitHub
              </a>

              <button
                onClick={() =>
                  navigator.clipboard.writeText(
                    `git clone ${selectedRepo.html_url}.git`
                  )
                }
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-medium rounded-lg transition-all duration-300 transform hover:scale-105"
                title="Copy clone command to clipboard"
              >
                <svg
                  className="w-5 h-5 mr-2"
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
                Clone Repo
              </button>
            </div>
          </div>

          {/* README Section */}
          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              README Preview
            </h4>
            {readmeLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              </div>
            ) : (
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 max-h-64 overflow-y-auto">
                <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono">
                  {readme || "Click on a repository to view its README"}
                </pre>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="p-6 bg-white/70 dark:bg-gray-800/70 backdrop-blur-lg rounded-2xl border border-white/20 dark:border-gray-700/20 text-center">
          <svg
            className="w-16 h-16 text-gray-400 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Repository Details
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Select a repository from the search results to view its details and
            README
          </p>
        </div>
      )}
    </div>
  );
};
