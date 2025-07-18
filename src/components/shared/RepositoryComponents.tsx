import React from "react";
import ReactMarkdown, { Components } from "react-markdown";

// SVG Icons
export const StarIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 20 20">
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
  </svg>
);

export const ForkIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 20 20">
    <path
      fillRule="evenodd"
      d="M7.5 3A1.5 1.5 0 006 4.5v.793c.026.009.051.02.076.032L7.674 6.51a.5.5 0 01.252.434V10.5A1.5 1.5 0 009.426 12h1.148A1.5 1.5 0 0012 10.5V6.944a.5.5 0 01.252-.434L13.85 5.325c.025-.012.05-.023.076-.032V4.5A1.5 1.5 0 0012.5 3h-5zM5 4.5a2.5 2.5 0 115 0v.793l1.098.549A1.5 1.5 0 0112 7.056V10.5a2.5 2.5 0 01-2.5 2.5h-3A2.5 2.5 0 014 10.5V7.056a1.5 1.5 0 01.902-1.214L6 5.293V4.5z"
      clipRule="evenodd"
    />
  </svg>
);

export const GitHubIcon = ({
  className = "w-4 h-4",
}: {
  className?: string;
}) => (
  <svg className={className} fill="currentColor" viewBox="0 0 20 20">
    <path
      fillRule="evenodd"
      d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z"
      clipRule="evenodd"
    />
  </svg>
);

export const CloneIcon = ({
  className = "w-4 h-4",
}: {
  className?: string;
}) => (
  <svg
    className={className}
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
);

export const DocumentIcon = ({
  className = "w-6 h-6",
}: {
  className?: string;
}) => (
  <svg
    className={className}
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
);

export const ChevronDownIcon = ({
  className = "w-4 h-4",
}: {
  className?: string;
}) => (
  <svg
    className={className}
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
);

// Internal utility functions (not exported)
const WarningIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
    />
  </svg>
);

const getMarkdownComponents = (isMobile: boolean = false): Components => {
  const baseTextSize = isMobile ? "text-xs" : "text-xs sm:text-sm";
  const headingSize = isMobile ? "text-sm" : "text-lg sm:text-xl";
  const subHeadingSize = isMobile ? "text-sm" : "text-base sm:text-lg";
  const spacing = isMobile ? "mb-1" : "mb-2";
  const padding = isMobile ? "px-1 py-0.5" : "px-2 py-1";
  const listMargin = isMobile ? "ml-3" : "ml-4";

  return {
    h1: ({ children }) => (
      <h1
        className={`${headingSize} font-bold text-gray-900 dark:text-white ${spacing}`}
      >
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2
        className={`${subHeadingSize} font-semibold text-gray-900 dark:text-white ${spacing}`}
      >
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3
        className={`${baseTextSize} font-semibold text-gray-900 dark:text-white ${
          isMobile ? "mb-1" : "mb-1"
        }`}
      >
        {children}
      </h3>
    ),
    p: ({ children }) => (
      <p
        className={`${baseTextSize} text-gray-700 dark:text-gray-300 ${spacing} leading-relaxed`}
      >
        {children}
      </p>
    ),
    a: ({ href, children }) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 dark:text-blue-400 hover:underline"
      >
        {children}
      </a>
    ),
    code: ({ children }) => (
      <code
        className={`bg-gray-200 dark:bg-gray-800 ${padding} rounded ${baseTextSize} font-mono text-gray-900 dark:text-gray-100`}
      >
        {children}
      </code>
    ),
    pre: ({ children }) => (
      <pre
        className={`bg-gray-200 dark:bg-gray-800 p-2 rounded ${baseTextSize} font-mono text-gray-900 dark:text-gray-100 overflow-x-auto`}
      >
        {children}
      </pre>
    ),
    ul: ({ children }) => (
      <ul
        className={`${baseTextSize} text-gray-700 dark:text-gray-300 ${spacing} ${listMargin} list-disc`}
      >
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol
        className={`${baseTextSize} text-gray-700 dark:text-gray-300 ${spacing} ${listMargin} list-decimal`}
      >
        {children}
      </ol>
    ),
    li: ({ children }) => (
      <li className={isMobile ? "mb-0.5" : "mb-1"}>{children}</li>
    ),
    table: ({ children }) => (
      <table className={`w-full ${baseTextSize} border-collapse ${spacing}`}>
        {children}
      </table>
    ),
    th: ({ children }) => (
      <th
        className={`border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 ${padding} text-left font-semibold`}
      >
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className={`border border-gray-300 dark:border-gray-600 ${padding}`}>
        {children}
      </td>
    ),
    blockquote: ({ children }) => (
      <blockquote
        className={`border-l-4 border-gray-300 dark:border-gray-600 ${
          isMobile ? "pl-2 my-1" : "pl-4 my-2"
        } text-gray-600 dark:text-gray-400 italic`}
      >
        {children}
      </blockquote>
    ),
  };
};

const isReadmeError = (readme: string): boolean => {
  return (
    readme.includes("Failed to load") ||
    readme.includes("Unable to load") ||
    readme.includes("limited due to") ||
    readme.includes("No README file found") ||
    readme.includes("check your internet connection")
  );
};

const ReadmeErrorDisplay: React.FC<{
  readme: string;
  onRetry?: () => void;
  isMobile?: boolean;
}> = ({ readme, onRetry, isMobile = false }) => (
  <div className="text-center py-4">
    <WarningIcon
      className={`${
        isMobile ? "w-6 h-6" : "w-8 h-8"
      } text-gray-400 mx-auto mb-2`}
    />
    <p
      className={`${
        isMobile ? "text-xs" : "text-sm"
      } text-gray-500 dark:text-gray-400 mb-2`}
    >
      {readme}
    </p>
    {onRetry && (
      <button
        onClick={onRetry}
        className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded-md transition-colors duration-200"
      >
        Retry
      </button>
    )}
  </div>
);

// Shared README Display Component
export const ReadmeDisplay: React.FC<{
  readme: string;
  readmeLoading: boolean;
  onRetry?: () => void;
  isMobile?: boolean;
  maxHeight?: string;
}> = ({
  readme,
  readmeLoading,
  onRetry,
  isMobile = false,
  maxHeight = "max-h-48 sm:max-h-64",
}) => {
  if (readmeLoading) {
    return (
      <div className="flex items-center justify-center py-6 sm:py-8">
        <div
          className={`animate-spin rounded-full ${
            isMobile ? "h-5 w-5" : "h-6 w-6 sm:h-8 sm:w-8"
          } border-b-2 border-purple-600`}
        ></div>
        <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
          Loading README...
        </span>
      </div>
    );
  }

  return (
    <div
      className={`bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 sm:p-4 ${
        isMobile ? "max-h-40" : maxHeight
      } overflow-y-auto`}
    >
      {readme ? (
        isReadmeError(readme) ? (
          <ReadmeErrorDisplay
            readme={readme}
            onRetry={onRetry}
            isMobile={isMobile}
          />
        ) : (
          <div className="prose prose-sm sm:prose-base prose-gray dark:prose-invert max-w-none readme-content">
            <ReactMarkdown components={getMarkdownComponents(isMobile)}>
              {readme}
            </ReactMarkdown>
          </div>
        )
      ) : (
        <div className="text-center py-4">
          <DocumentIcon
            className={`${
              isMobile ? "w-6 h-6" : "w-8 h-8"
            } text-gray-400 mx-auto mb-2`}
          />
          <p
            className={`${
              isMobile ? "text-xs" : "text-sm"
            } text-gray-500 dark:text-gray-400 mb-2`}
          >
            {isMobile
              ? "No README available for this repository"
              : "Click on a repository to view its README"}
          </p>
        </div>
      )}
    </div>
  );
};
