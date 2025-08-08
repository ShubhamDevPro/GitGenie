import React, { useState, useEffect } from "react";

interface ConnectToProjectButtonProps {
  repositoryId: string;
  repositoryName: string;
  className?: string;
}

interface ProjectStatus {
  isRunning: boolean;
  pid?: string;
  vmIP?: string;
  port?: string;
  projectUrl?: string;
}

export const ConnectToProjectButton: React.FC<ConnectToProjectButtonProps> = ({
  repositoryId,
  repositoryName,
  className = "",
}) => {
  const [projectStatus, setProjectStatus] = useState<ProjectStatus | null>(
    null
  );
  const [isChecking, setIsChecking] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [lastChecked, setLastChecked] = useState<number>(0);

  useEffect(() => {
    // Check project status on component mount
    checkProjectStatus();

    // Set up periodic status checking every 30 seconds
    const interval = setInterval(() => {
      if (Date.now() - lastChecked > 30000) {
        // Only if last check was > 30s ago
        checkProjectStatus();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [repositoryId]);

  // Update VM status indicator in the main repository header
  useEffect(() => {
    const statusElement = document.getElementById(`vm-status-${repositoryId}`);
    if (statusElement) {
      if (projectStatus?.isRunning) {
        statusElement.classList.remove("hidden");
      } else {
        statusElement.classList.add("hidden");
      }
    }
  }, [projectStatus?.isRunning, repositoryId]);

  const checkProjectStatus = async () => {
    if (isChecking) return;

    setIsChecking(true);
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
          vmIP: data.vmIP,
          port: data.port || "3000", // Default port
          projectUrl: data.vmIP
            ? `http://${data.vmIP}:${data.port || "3000"}`
            : undefined,
        });
        setLastChecked(Date.now());
      } else {
        console.error("Failed to check project status");
        setProjectStatus({ isRunning: false });
      }
    } catch (error) {
      console.error("Error checking project status:", error);
      setProjectStatus({ isRunning: false });
    } finally {
      setIsChecking(false);
    }
  };

  const connectToProject = async () => {
    if (!projectStatus?.isRunning || !projectStatus?.vmIP) return;

    setIsConnecting(true);
    try {
      // Open the project runner page with VM connection details
      const queryParams = new URLSearchParams({
        name: repositoryName,
        vmIP: projectStatus.vmIP,
        port: projectStatus.port || "3000",
        reconnect: "true", // Flag to indicate this is a reconnection
      });

      const projectRunnerUrl = `/project-runner/${repositoryId}?${queryParams.toString()}`;

      // Open in new tab
      window.open(projectRunnerUrl, "_blank");

      // Optional: Show success feedback
      setTimeout(() => setIsConnecting(false), 1000);
    } catch (error) {
      console.error("Error connecting to project:", error);
      setIsConnecting(false);
    }
  };

  const baseButtonClass = `
    inline-flex items-center justify-center px-3 py-2 text-sm font-medium rounded-lg 
    transition-all duration-300 transform hover:scale-105 disabled:opacity-50 
    disabled:cursor-not-allowed disabled:transform-none
  `;

  // Don't render anything if we're still checking initial status
  if (isChecking && !projectStatus) {
    return (
      <div
        className={`${baseButtonClass} bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 ${className}`}
      >
        <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mr-2"></div>
        Checking...
      </div>
    );
  }

  // Don't render if project is not running
  if (!projectStatus?.isRunning) {
    return null;
  }

  return (
    <div className="space-y-2">
      {/* Project Status Indicator */}
      <div className="flex items-center space-x-2 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700/30 rounded-lg">
        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
        <span className="text-xs font-medium text-green-700 dark:text-green-300">
          🚀 Running on VM
        </span>
        {projectStatus.pid && (
          <span className="text-xs text-green-600 dark:text-green-400">
            (PID: {projectStatus.pid})
          </span>
        )}
        <button
          onClick={checkProjectStatus}
          disabled={isChecking}
          className="text-xs text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200 ml-auto"
          title="Refresh status"
        >
          {isChecking ? (
            <div className="w-3 h-3 border border-green-600 border-t-transparent rounded-full animate-spin"></div>
          ) : (
            "🔄"
          )}
        </button>
      </div>

      {/* Connect Button */}
      <button
        onClick={connectToProject}
        disabled={isConnecting || !projectStatus.vmIP}
        className={`${baseButtonClass} bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold ${className}`}
        title={`Connect to running project at ${projectStatus.projectUrl}`}
      >
        {isConnecting ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
            Connecting...
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
                d="M13.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h1m4 0h1m6-6V7a2 2 0 00-2-2H5a2 2 0 00-2 2v11a2 2 0 002 2h14a2 2 0 002-2v-4M12 21l-3-3 3-3"
              />
            </svg>
            🔗 Connect to Running Project
          </>
        )}
      </button>

      {/* VM Info */}
      {projectStatus.vmIP && (
        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/30 rounded-lg">
          <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-medium">VM Status:</span>
              <span className="text-green-600 dark:text-green-400">
                🟢 Active
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium">VM IP:</span>
              <code className="bg-blue-100 dark:bg-blue-900/40 px-1 rounded text-xs">
                {projectStatus.vmIP}
              </code>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium">Port:</span>
              <code className="bg-blue-100 dark:bg-blue-900/40 px-1 rounded text-xs">
                {projectStatus.port}
              </code>
            </div>
            {projectStatus.projectUrl && (
              <div className="pt-1 border-t border-blue-200 dark:border-blue-700/30">
                <a
                  href={projectStatus.projectUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 underline"
                >
                  🌐 Open Direct URL: {projectStatus.projectUrl}
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
