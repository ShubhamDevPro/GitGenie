import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { formatDate, formatDescription } from "../../utils/repositoryUtils";
import { Repository } from "../../types/repository";
import { useRepositoryClone } from "../../hooks/useRepositoryClone";
import {
  StarIcon,
  ForkIcon,
  GitHubIcon,
  CloneIcon,
  DocumentIcon,
  ReadmeDisplay,
} from "../shared/RepositoryComponents";

interface RepositoryDetailsProps {
  selectedRepo: Repository | null;
  readme: string;
  readmeLoading: boolean;
  onRetryReadme?: () => void;
}

export const RepositoryDetails: React.FC<RepositoryDetailsProps> = ({
  selectedRepo,
  readme,
  readmeLoading,
  onRetryReadme,
}) => {
  const { cloneRepository, isCloning, cloneError, cloneSuccess, clearMessages } = useRepositoryClone();
  const [showCloneMessage, setShowCloneMessage] = useState(false);
  const router = useRouter();

  const handleCloneClick = async () => {
    if (!selectedRepo) return;

    clearMessages();
    const result = await cloneRepository({
      githubOwner: selectedRepo.owner.login,
      githubRepo: selectedRepo.name,
      githubUrl: selectedRepo.html_url,
      description: selectedRepo.description || undefined,
    });

    if (result) {
      setShowCloneMessage(true);
      // Show success message briefly, then redirect to repositories page
      setTimeout(() => {
        setShowCloneMessage(false);
        clearMessages();
        router.push('/my-repositories');
      }, 2000); // Reduced time to 2 seconds for better UX
    }
  };

  return (
    <div className="hidden lg:block lg:sticky lg:top-24 lg:h-fit">
      {selectedRepo ? (
        <div className="p-4 sm:p-6 bg-white/70 dark:bg-gray-800/70 backdrop-blur-lg rounded-xl sm:rounded-2xl border border-white/20 dark:border-gray-700/20">
          <div className="mb-4 sm:mb-6">
            <div className="flex items-center space-x-3 mb-3 sm:mb-4">
              <Image
                src={selectedRepo.owner.avatar_url}
                alt={selectedRepo.owner.login}
                width={48}
                height={48}
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex-shrink-0"
              />
              <div className="min-w-0 flex-1">
                <h3 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white truncate">
                  {selectedRepo.name}
                </h3>
                <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 truncate">
                  {selectedRepo.full_name}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 sm:gap-6 mb-3 sm:mb-4">
              <div className="flex items-center text-yellow-500">
                <StarIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-1" />
                <span className="text-sm sm:text-base font-semibold">
                  {selectedRepo.stargazers_count.toLocaleString()}
                </span>
                <span className="ml-1 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                  stars
                </span>
              </div>

              <div className="flex items-center text-blue-500">
                <ForkIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-1" />
                <span className="text-sm sm:text-base font-semibold">
                  {selectedRepo.forks_count.toLocaleString()}
                </span>
                <span className="ml-1 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                  forks
                </span>
              </div>

              {selectedRepo.language && (
                <span className="px-2 py-1 sm:px-3 sm:py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 rounded-full text-xs sm:text-sm font-medium">
                  {selectedRepo.language}
                </span>
              )}
            </div>

            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mb-3 sm:mb-4 line-clamp-3">
              {formatDescription(selectedRepo.description)}
            </p>

            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-4 sm:mb-6">
              Last pushed: {formatDate(selectedRepo.pushed_at)}
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href={selectedRepo.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center px-4 py-2 sm:px-6 sm:py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium rounded-lg transition-all duration-300 transform hover:scale-105 text-sm sm:text-base"
              >
                <GitHubIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                <span className="sm:hidden">GitHub</span>
                <span className="hidden sm:inline">View on GitHub</span>
              </a>

              <button
                onClick={handleCloneClick}
                disabled={isCloning}
                className={`inline-flex items-center justify-center px-4 py-2 sm:px-6 sm:py-3 font-medium rounded-lg transition-all duration-300 transform hover:scale-105 text-sm sm:text-base ${isCloning
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                  } text-white`}
                title="Clone repository to your private workspace"
              >
                <CloneIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                {isCloning ? (
                  <>
                    <span className="sm:hidden">Cloning...</span>
                    <span className="hidden sm:inline">Cloning Repository...</span>
                  </>
                ) : (
                  <>
                    <span className="sm:hidden">Clone</span>
                    <span className="hidden sm:inline">Clone to Workspace</span>
                  </>
                )}
              </button>
            </div>

            {/* Clone status messages */}
            {(showCloneMessage && cloneSuccess) && (
              <div className="mt-4 p-3 bg-green-100 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded-lg">
                <p className="text-sm text-green-800 dark:text-green-200">
                  ✅ {cloneSuccess}
                </p>
              </div>
            )}

            {cloneError && (
              <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg">
                <p className="text-sm text-red-800 dark:text-red-200">
                  ❌ {cloneError}
                </p>
                <button
                  onClick={clearMessages}
                  className="mt-2 text-xs text-red-600 dark:text-red-400 hover:underline"
                >
                  Dismiss
                </button>
              </div>
            )}
          </div>

          {/* README Section */}
          <div>
            <h4 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-2 sm:mb-3">
              README Preview
            </h4>
            <ReadmeDisplay
              readme={readme}
              readmeLoading={readmeLoading}
              onRetry={onRetryReadme}
              isMobile={false}
            />
          </div>
        </div>
      ) : (
        <div className="p-4 sm:p-6 bg-white/70 dark:bg-gray-800/70 backdrop-blur-lg rounded-xl sm:rounded-2xl border border-white/20 dark:border-gray-700/20 text-center">
          <DocumentIcon className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-3 sm:mb-4" />
          <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-2">
            Repository Details
          </h3>
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">
            Select a repository from the search results to view its details and
            README
          </p>
        </div>
      )}
    </div>
  );
};
