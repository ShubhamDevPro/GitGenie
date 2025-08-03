import React, { useState } from 'react';
import { useAgentService } from '@/hooks/useAgentService';

interface RunProjectButtonProps {
  repositoryId: string;
  repositoryName: string;
  projectPath?: string;
  className?: string;
}

export const RunProjectButton: React.FC<RunProjectButtonProps> = ({
  repositoryId,
  repositoryName,
  projectPath,
  className = ""
}) => {
  const { 
    isRunningProject, 
    isAnalyzingProject,
    error, 
    projectAnalysis, 
    analyzeProject,
    runProject, 
    clearError 
  } = useAgentService();
  
  const [lastRunResult, setLastRunResult] = useState<any>(null);
  const [useGCPVM, setUseGCPVM] = useState(false);

  const handleAnalyzeProject = async () => {
    clearError();
    await analyzeProject(projectPath, repositoryId);
  };

  const handleRunProject = async () => {
    clearError();
    const result = await runProject(projectPath, repositoryId, true, useGCPVM);
    if (result) {
      setLastRunResult(result);
    }
  };

  const baseButtonClass = `
    inline-flex items-center justify-center px-3 py-2 text-sm font-medium rounded-lg 
    transition-all duration-300 transform hover:scale-105 disabled:opacity-50 
    disabled:cursor-not-allowed disabled:transform-none
  `;

  return (
    <div className="space-y-3">
      {/* GCP VM Toggle */}
      <div className="flex items-center space-x-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <label className="flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={useGCPVM}
            onChange={(e) => setUseGCPVM(e.target.checked)}
            className="sr-only"
          />
          <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            useGCPVM ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
          }`}>
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              useGCPVM ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </div>
          <span className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300">
            Run on GCP VM
          </span>
        </label>
        {useGCPVM && (
          <div className="text-xs text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/20 px-2 py-1 rounded">
            ☁️ Cloud Execution
          </div>
        )}
      </div>

      {/* AI Analysis and Run Project Buttons */}
      <div className="flex items-center space-x-2">
        {/* Analyze Project Button */}
        <button
          onClick={handleAnalyzeProject}
          disabled={isAnalyzingProject || isRunningProject}
          className={`${baseButtonClass} bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white ${className}`}
          title="Analyze project structure with AI"
        >
          {isAnalyzingProject ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              Analyzing...
            </>
          ) : (
            <>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              🤖 Analyze
            </>
          )}
        </button>

        {/* Run Project Button */}
        <button
          onClick={handleRunProject}
          disabled={isRunningProject || isAnalyzingProject}
          className={`${baseButtonClass} bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-semibold ${className}`}
          title="Analyze project with AI and start with optimized build commands"
        >
          {isRunningProject ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              Starting Project...
            </>
          ) : (
            <>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h1m4 0h1m6-6V7a2 2 0 00-2-2H5a2 2 0 00-2 2v11a2 2 0 002 2h14a2 2 0 002-2v-4M12 21l-3-3 3-3" />
              </svg>
              🚀 Launch Project with AI
            </>
          )}
        </button>

        {lastRunResult && (
          <button
            onClick={() => {
              clearError();
              setLastRunResult(null);
            }}
            className="px-2 py-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            title="Reset"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        )}
      </div>

      {/* Success Message */}
      {lastRunResult?.success && (
        <div className="p-3 bg-blue-100 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700 rounded-lg">
          <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
            🚀 Project Started Successfully{lastRunResult.vmIP ? ' on GCP VM!' : '!'}
          </h4>
          <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
            <div>Repository: <span className="font-medium">{repositoryName}</span></div>
            {lastRunResult.vmIP && (
              <div>VM IP: <span className="font-medium">{lastRunResult.vmIP}</span></div>
            )}
            {lastRunResult.analysis && (
              <>
                <div>Project Type: <span className="font-medium">{lastRunResult.analysis.projectType}</span></div>
                <div>Framework: <span className="font-medium">{lastRunResult.analysis.framework}</span></div>
              </>
            )}
            {lastRunResult.ports && (
              <>
                {lastRunResult.vmIP ? (
                  <>
                    <div>Application URL: <a href={`http://${lastRunResult.vmIP}:${lastRunResult.ports.frontend || lastRunResult.port}`} target="_blank" rel="noopener noreferrer" className="underline">http://{lastRunResult.vmIP}:{lastRunResult.ports.frontend || lastRunResult.port}</a></div>
                  </>
                ) : (
                  <>
                    <div>Frontend URL: <a href={`http://localhost:${lastRunResult.ports.frontend}`} target="_blank" rel="noopener noreferrer" className="underline">http://localhost:{lastRunResult.ports.frontend}</a></div>
                    <div>Backend URL: <a href={`http://localhost:${lastRunResult.ports.backend}`} target="_blank" rel="noopener noreferrer" className="underline">http://localhost:{lastRunResult.ports.backend}</a></div>
                  </>
                )}
              </>
            )}
          </div>
          
          {/* VM Logs Display */}
          {lastRunResult.logs && (
            <div className="mt-3 pt-3 border-t border-blue-300 dark:border-blue-700">
              <h5 className="text-xs font-medium text-blue-800 dark:text-blue-200 mb-2">
                📋 VM Deployment Logs:
              </h5>
              <div className="bg-gray-900 text-green-400 p-2 rounded text-xs font-mono max-h-40 overflow-y-auto">
                <pre className="whitespace-pre-wrap">{lastRunResult.logs}</pre>
              </div>
            </div>
          )}
          
          <button
            onClick={() => setLastRunResult(null)}
            className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* AI Analysis Display */}
      {projectAnalysis && (
        <div className="p-3 bg-green-100 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded-lg">
          <h4 className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">
            🤖 AI Project Analysis
          </h4>
          <div className="text-xs text-green-700 dark:text-green-300 space-y-1">
            <div>Type: <span className="font-medium">{projectAnalysis.projectType}</span></div>
            <div>Framework: <span className="font-medium">{projectAnalysis.framework}</span></div>
            <div>Dependencies: <span className="font-medium">{projectAnalysis.dependencies.join(', ')}</span></div>
            {projectAnalysis.ports.frontend && (
              <div>Suggested Frontend Port: <span className="font-medium">{projectAnalysis.ports.frontend}</span></div>
            )}
            {projectAnalysis.ports.backend && (
              <div>Suggested Backend Port: <span className="font-medium">{projectAnalysis.ports.backend}</span></div>
            )}
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="p-3 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg">
          <h4 className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">
            ❌ Error
          </h4>
          <p className="text-xs text-red-700 dark:text-red-300">{error}</p>
          <button
            onClick={clearError}
            className="mt-2 text-xs text-red-600 dark:text-red-400 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
};
