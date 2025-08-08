import React, { useState, useEffect } from "react";
import { useAgentService } from "@/hooks/useAgentService";

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
  className = "",
}) => {
  const {
    isRunningProject,
    isAnalyzingProject,
    error,
    projectAnalysis,
    analyzeProject,
    runProject,
    clearError,
  } = useAgentService();

  const [lastRunResult, setLastRunResult] = useState<any>(null);
  const [useGCPVM, setUseGCPVM] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [deploymentLogs, setDeploymentLogs] = useState<string[]>([]);
  const [projectStatus, setProjectStatus] = useState<{
    isRunning: boolean;
    pid?: string;
  } | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);

  // Check project status when component mounts and when GCP VM is toggled
  useEffect(() => {
    if (useGCPVM && repositoryId) {
      checkProjectStatus();
    } else {
      setProjectStatus(null);
    }
  }, [useGCPVM, repositoryId]);

  const handleAnalyzeProject = async () => {
    clearError();
    await analyzeProject(projectPath, repositoryId);
  };

  const checkProjectStatus = async () => {
    if (!repositoryId || !useGCPVM) return;

    setCheckingStatus(true);
    setDeploymentLogs((prev) => [
      ...prev,
      "🔍 Checking project status on VM...",
    ]);

    try {
      const response = await fetch("/api/agent/project-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ repositoryId }),
      });

      if (response.ok) {
        const data = await response.json();
        setProjectStatus({
          isRunning: data.isRunning,
          pid: data.pid,
        });

        // Add status result to logs
        if (data.isRunning) {
          setDeploymentLogs((prev) => [
            ...prev,
            `✅ Status check: Project is running with PID ${data.pid}`,
            `🌐 Your application should be accessible at the provided URL`,
          ]);
        } else {
          setDeploymentLogs((prev) => [
            ...prev,
            `❌ Status check: Project is not running`,
            `🔧 The server may have stopped. Check the VM logs for details.`,
          ]);
        }
      } else {
        setDeploymentLogs((prev) => [
          ...prev,
          "❌ Failed to check project status",
        ]);
      }
    } catch (error) {
      console.error("Error checking project status:", error);
      setDeploymentLogs((prev) => [
        ...prev,
        "❌ Error checking project status",
      ]);
    } finally {
      setCheckingStatus(false);
    }
  };

  const stopProject = async () => {
    if (!repositoryId || !useGCPVM) return;

    try {
      const response = await fetch("/api/agent/project-status", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ repositoryId }),
      });

      if (response.ok) {
        setProjectStatus({ isRunning: false });
        setDeploymentLogs((prev) => [
          ...prev,
          "🛑 Project stopped successfully",
        ]);
      }
    } catch (error) {
      console.error("Error stopping project:", error);
    }
  };

  const getProjectLogs = async () => {
    if (!repositoryId || !useGCPVM) return;

    try {
      setDeploymentLogs((prev) => [
        ...prev,
        "📄 Fetching server logs from VM...",
      ]);

      const response = await fetch("/api/agent/project-logs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ repositoryId }),
      });

      if (response.ok) {
        const data = await response.json();
        setDeploymentLogs((prev) => [
          ...prev,
          "📄 Server logs retrieved:",
          "--- VM Server Logs ---",
          data.logs,
          "--- End of VM Server Logs ---",
        ]);
      } else {
        setDeploymentLogs((prev) => [...prev, "❌ Failed to get server logs"]);
      }
    } catch (error) {
      console.error("Error getting project logs:", error);
      setDeploymentLogs((prev) => [...prev, "❌ Error fetching server logs"]);
    }
  };

  const handleRunProject = async () => {
    clearError();

    // Show deployment logs immediately when starting
    setShowLogs(true);
    setDeploymentLogs(["🚀 Starting deployment process..."]);

    const result = await runProject(projectPath, repositoryId, true, useGCPVM);
    if (result) {
      setLastRunResult(result);

      // Add final success message to deployment logs
      if (result.success && useGCPVM) {
        const vmResult = result as any; // Type assertion since we know it's a VM result when useGCPVM is true
        setDeploymentLogs((prev) => [
          ...prev,
          "✅ Deployment completed successfully!",
          `🌐 Your project is now running at: ${vmResult.projectUrl || "VM"}`,
          "📌 The server is running in background and will persist even if you navigate away or close this tab.",
          "🔄 The VM connection has been properly configured to maintain your running application.",
          "⏳ Redirecting to project runner in 3 seconds...",
        ]);

        // Redirect to project runner page after successful deployment
        setTimeout(() => {
          const queryParams = new URLSearchParams({
            name: repositoryName || "Unknown Project",
            vmIP: vmResult.vmIP || "",
            port: vmResult.port || "3000",
          });
          window.open(
            `/project-runner/${repositoryId}?${queryParams.toString()}`,
            "_blank"
          );
        }, 3000);
      } else if (result.success) {
        // For local deployment, still redirect but without VM parameters
        setTimeout(() => {
          const queryParams = new URLSearchParams({
            name: repositoryName || "Unknown Project",
            port: (
              result.port ||
              result.ports?.frontend ||
              result.ports?.backend ||
              "3000"
            ).toString(),
          });
          window.open(
            `/project-runner/${repositoryId}?${queryParams.toString()}`,
            "_blank"
          );
        }, 2000);
      }
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
          <div
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              useGCPVM ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                useGCPVM ? "translate-x-6" : "translate-x-1"
              }`}
            />
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

      {/* Project Status Indicator (for GCP VM) */}
      {useGCPVM && (
        <div className="p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200">
              🖥️ VM Project Status
            </h4>
            <div className="flex items-center space-x-2">
              <button
                onClick={checkProjectStatus}
                disabled={checkingStatus}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline px-2 py-1 bg-blue-100 dark:bg-blue-900/20 rounded"
              >
                {checkingStatus ? (
                  <>
                    <span className="inline-block w-3 h-3 border border-blue-600 border-t-transparent rounded-full animate-spin mr-1"></span>
                    Checking...
                  </>
                ) : (
                  "🔄 Refresh Status"
                )}
              </button>
              <button
                onClick={getProjectLogs}
                className="text-xs text-green-600 dark:text-green-400 hover:underline px-2 py-1 bg-green-100 dark:bg-green-900/20 rounded"
              >
                📄 Get Server Logs
              </button>
            </div>
          </div>

          {projectStatus ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div
                  className={`w-3 h-3 rounded-full ${
                    projectStatus.isRunning
                      ? "bg-green-500 animate-pulse"
                      : "bg-red-500"
                  }`}
                ></div>
                <span className="text-sm">
                  {projectStatus.isRunning ? (
                    <span className="text-green-700 dark:text-green-300">
                      ✅ Running{" "}
                      {projectStatus.pid && `(PID: ${projectStatus.pid})`}
                    </span>
                  ) : (
                    <span className="text-red-700 dark:text-red-300">
                      ❌ Not Running
                    </span>
                  )}
                </span>
              </div>

              {projectStatus.isRunning && (
                <button
                  onClick={stopProject}
                  className="text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 px-2 py-1 bg-red-100 dark:bg-red-900/20 rounded hover:bg-red-200 dark:hover:bg-red-900/40 transition-colors"
                >
                  🛑 Stop Project
                </button>
              )}
            </div>
          ) : (
            <div className="text-sm text-gray-600 dark:text-gray-400">
              📡 Status unknown - click refresh to check
            </div>
          )}
        </div>
      )}

      {/* Show Logs Toggle */}
      <div className="flex items-center space-x-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <label className="flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={showLogs}
            onChange={(e) => setShowLogs(e.target.checked)}
            className="sr-only"
          />
          <div
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              showLogs ? "bg-green-600" : "bg-gray-300 dark:bg-gray-600"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                showLogs ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </div>
          <span className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300">
            Show Deployment Logs
          </span>
        </label>
        {showLogs && (
          <div className="text-xs text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/20 px-2 py-1 rounded">
            📋 Live Logs
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
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
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
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h1m4 0h1m6-6V7a2 2 0 00-2-2H5a2 2 0 00-2 2v11a2 2 0 002 2h14a2 2 0 002-2v-4M12 21l-3-3 3-3"
                />
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
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Real-time Logs Display */}
      {showLogs &&
        (isRunningProject ||
          deploymentLogs.length > 0 ||
          lastRunResult?.logs) && (
          <div className="p-4 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 flex items-center">
                <span className="mr-2">📋</span>
                Deployment Logs
                {isRunningProject && (
                  <div className="ml-2 w-3 h-3 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                )}
              </h4>
              <div className="flex items-center space-x-2">
                {(lastRunResult?.logs || deploymentLogs.length > 0) && (
                  <button
                    onClick={() => {
                      const logs =
                        lastRunResult?.logs || deploymentLogs.join("\n");
                      navigator.clipboard.writeText(logs);
                    }}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline px-2 py-1 bg-blue-100 dark:bg-blue-900/20 rounded"
                    title="Copy all logs to clipboard"
                  >
                    📋 Copy Logs
                  </button>
                )}
                <button
                  onClick={() => {
                    setDeploymentLogs([]);
                    if (!lastRunResult?.logs) setShowLogs(false);
                  }}
                  className="text-xs text-gray-600 dark:text-gray-400 hover:underline px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded"
                  title="Clear logs"
                >
                  🗑️ Clear
                </button>
              </div>
            </div>

            <div className="bg-black text-green-400 p-3 rounded-lg text-xs font-mono max-h-80 overflow-y-auto border-2 border-gray-600">
              {isRunningProject && (
                <div className="text-yellow-400 mb-2">
                  🚀 Starting deployment process...
                  {useGCPVM && <div>☁️ Deploying to GCP VM...</div>}
                </div>
              )}

              {deploymentLogs.length > 0 && (
                <div className="mb-2">
                  {deploymentLogs.map((log, index) => (
                    <div key={index} className="mb-1">
                      <span className="text-gray-500">
                        [{new Date().toLocaleTimeString()}]
                      </span>
                      <span className="ml-2">{log}</span>
                    </div>
                  ))}
                </div>
              )}

              {lastRunResult?.logs && (
                <div>
                  <div className="text-cyan-400 mb-2">
                    📋 Complete Deployment Log:
                  </div>
                  <pre className="whitespace-pre-wrap leading-relaxed text-green-300">
                    {lastRunResult.logs}
                  </pre>
                </div>
              )}

              {!isRunningProject &&
                !lastRunResult?.logs &&
                deploymentLogs.length === 0 && (
                  <div className="text-gray-500 italic">
                    💡 Logs will appear here during deployment...
                  </div>
                )}
            </div>

            {lastRunResult?.commands && showLogs && (
              <div className="mt-3 pt-3 border-t border-gray-300 dark:border-gray-600">
                <h5 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  🤖 AI Generated Commands:
                </h5>
                <div className="bg-gray-800 text-blue-300 p-2 rounded text-xs font-mono">
                  {lastRunResult.commands.map((cmd: string, index: number) => (
                    <div key={index} className="mb-1">
                      <span className="text-gray-500">{index + 1}.</span>
                      <span className="ml-2">{cmd}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Debug Information */}
            {showLogs && (lastRunResult || useGCPVM) && (
              <div className="mt-3 pt-3 border-t border-gray-300 dark:border-gray-600">
                <h5 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  🔍 Debug Information:
                </h5>
                <div className="bg-gray-50 dark:bg-gray-900 p-2 rounded text-xs font-mono text-gray-600 dark:text-gray-400">
                  <div>Repository ID: {repositoryId}</div>
                  <div>Repository Name: {repositoryName}</div>
                  <div>Deployment Mode: {useGCPVM ? "GCP VM" : "Local"}</div>
                  {lastRunResult?.vmIP && (
                    <div>VM IP: {lastRunResult.vmIP}</div>
                  )}
                  {lastRunResult?.port && <div>Port: {lastRunResult.port}</div>}
                  {lastRunResult?.projectUrl && (
                    <div>Project URL: {lastRunResult.projectUrl}</div>
                  )}
                  <div>Timestamp: {new Date().toLocaleString()}</div>
                  {projectPath && <div>Project Path: {projectPath}</div>}
                </div>
              </div>
            )}
          </div>
        )}

      {/* Success Message */}
      {lastRunResult?.success && (
        <div className="p-3 bg-blue-100 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700 rounded-lg">
          <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
            🚀 Project Started Successfully
            {lastRunResult.vmIP ? " on GCP VM!" : "!"}
          </h4>
          <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
            <div>
              Repository: <span className="font-medium">{repositoryName}</span>
            </div>
            {lastRunResult.vmIP && (
              <div>
                VM IP: <span className="font-medium">{lastRunResult.vmIP}</span>
              </div>
            )}
            {lastRunResult.analysis && (
              <>
                <div>
                  Project Type:{" "}
                  <span className="font-medium">
                    {lastRunResult.analysis.projectType}
                  </span>
                </div>
                <div>
                  Framework:{" "}
                  <span className="font-medium">
                    {lastRunResult.analysis.framework}
                  </span>
                </div>
              </>
            )}
            {lastRunResult.ports && (
              <>
                {lastRunResult.vmIP ? (
                  <>
                    <div>
                      Application URL:{" "}
                      <a
                        href={`http://${lastRunResult.vmIP}:${
                          lastRunResult.ports.frontend || lastRunResult.port
                        }`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                      >
                        http://{lastRunResult.vmIP}:
                        {lastRunResult.ports.frontend || lastRunResult.port}
                      </a>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      Frontend URL:{" "}
                      <a
                        href={`http://localhost:${lastRunResult.ports.frontend}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                      >
                        http://localhost:{lastRunResult.ports.frontend}
                      </a>
                    </div>
                    <div>
                      Backend URL:{" "}
                      <a
                        href={`http://localhost:${lastRunResult.ports.backend}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                      >
                        http://localhost:{lastRunResult.ports.backend}
                      </a>
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          {/* VM Logs Display */}
          {lastRunResult.logs && showLogs && (
            <div className="mt-3 pt-3 border-t border-blue-300 dark:border-blue-700">
              <div className="flex items-center justify-between mb-2">
                <h5 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  📋 VM Deployment Logs
                </h5>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(lastRunResult.logs);
                  }}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                  title="Copy logs to clipboard"
                >
                  📋 Copy
                </button>
              </div>
              <div className="bg-gray-900 text-green-400 p-3 rounded-lg text-xs font-mono max-h-60 overflow-y-auto border">
                <pre className="whitespace-pre-wrap leading-relaxed">
                  {lastRunResult.logs}
                </pre>
              </div>
              <div className="mt-2 text-xs text-blue-600 dark:text-blue-400">
                💡 These are the real-time logs from your VM deployment process
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
            <div>
              Type:{" "}
              <span className="font-medium">{projectAnalysis.projectType}</span>
            </div>
            <div>
              Framework:{" "}
              <span className="font-medium">{projectAnalysis.framework}</span>
            </div>
            <div>
              Dependencies:{" "}
              <span className="font-medium">
                {projectAnalysis.dependencies.join(", ")}
              </span>
            </div>
            {projectAnalysis.ports.frontend && (
              <div>
                Suggested Frontend Port:{" "}
                <span className="font-medium">
                  {projectAnalysis.ports.frontend}
                </span>
              </div>
            )}
            {projectAnalysis.ports.backend && (
              <div>
                Suggested Backend Port:{" "}
                <span className="font-medium">
                  {projectAnalysis.ports.backend}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-red-800 dark:text-red-200 flex items-center">
              ❌ Deployment Error
            </h4>
            <button
              onClick={() => navigator.clipboard.writeText(error)}
              className="text-xs text-red-600 dark:text-red-400 hover:underline px-2 py-1 bg-red-200 dark:bg-red-800 rounded"
              title="Copy error to clipboard"
            >
              📋 Copy Error
            </button>
          </div>

          <div className="bg-red-50 dark:bg-red-900/30 p-3 rounded border">
            <p className="text-sm text-red-700 dark:text-red-300 font-mono whitespace-pre-wrap">
              {error}
            </p>
          </div>

          <div className="mt-3 text-xs text-red-600 dark:text-red-400">
            💡 Check the logs above for more details about what went wrong
            during deployment
          </div>

          <div className="flex items-center space-x-2 mt-3">
            <button
              onClick={clearError}
              className="text-xs text-red-600 dark:text-red-400 hover:underline px-3 py-1 bg-red-200 dark:bg-red-800 rounded"
            >
              Dismiss Error
            </button>
            <button
              onClick={() => {
                clearError();
                setLastRunResult(null);
                setDeploymentLogs([]);
              }}
              className="text-xs text-gray-600 dark:text-gray-400 hover:underline px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded"
            >
              Reset All
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
