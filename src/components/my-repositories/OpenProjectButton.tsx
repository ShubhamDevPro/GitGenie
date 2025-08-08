import React, { useState } from 'react';

interface OpenProjectButtonProps {
  repositoryId: string;
  repositoryName: string;
  githubUrl?: string;
  className?: string;
}

export const OpenProjectButton: React.FC<OpenProjectButtonProps> = ({
  repositoryId,
  repositoryName,
  githubUrl,
  className = ""
}) => {
  const [isOpening, setIsOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleOpenProject = async () => {
    setIsOpening(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/agent/open-project', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repositoryId,
          repositoryName,
          githubUrl
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to open project');
      }

      if (data.success) {
        setSuccess(`Project "${repositoryName}" opened in VS Code!`);
        setTimeout(() => setSuccess(null), 3000);
      } else {
        throw new Error(data.error || 'Failed to open project');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to open project';
      setError(errorMessage);
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsOpening(false);
    }
  };

  const baseButtonClass = `
    inline-flex items-center justify-center px-3 py-2 text-sm font-medium rounded-lg 
    transition-all duration-300 transform hover:scale-105 disabled:opacity-50 
    disabled:cursor-not-allowed disabled:transform-none
  `;

  return (
    <div className="space-y-2">
      {/* Open Project Button */}
      <button
        onClick={handleOpenProject}
        disabled={isOpening}
        className={`${baseButtonClass} bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white ${className}`}
        title="Open project in VS Code"
      >
        {isOpening ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
            Opening...
          </>
        ) : (
          <>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Open in VS Code
          </>
        )}
      </button>

      {/* Success Message */}
      {success && (
        <div className="p-2 bg-green-100 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded-lg">
          <p className="text-xs text-green-700 dark:text-green-300">✅ {success}</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-2 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg">
          <p className="text-xs text-red-700 dark:text-red-300">❌ {error}</p>
          <button
            onClick={() => setError(null)}
            className="mt-1 text-xs text-red-600 dark:text-red-400 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
};
