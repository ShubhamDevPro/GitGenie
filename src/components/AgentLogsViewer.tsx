import { useEffect, useRef } from 'react';
import { AgentLog, AgentProgress, FileOperation } from '@/hooks/useAgentSocket';

interface AgentLogsViewerProps {
  logs: AgentLog[];
  progress: AgentProgress | null;
  fileOperations: FileOperation[];
  isAgentRunning: boolean;
  isConnected: boolean;
  onClear: () => void;
}

export function AgentLogsViewer({
  logs,
  progress,
  fileOperations,
  isAgentRunning,
  isConnected,
  onClear,
}: AgentLogsViewerProps) {
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs are added
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const getLogTypeColor = (type: AgentLog['type']) => {
    switch (type) {
      case 'success':
        return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20';
      case 'error':
        return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
      case 'warning':
        return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20';
      default:
        return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50';
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
            🔍 Agent Logs
          </h3>
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-xs text-gray-500">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
          {isAgentRunning && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
              <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse mr-1"></div>
              Running
            </span>
          )}
        </div>
        <button
          onClick={onClear}
          className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          title="Clear logs"
        >
          Clear
        </button>
      </div>

      {/* Progress Bar */}
      {progress && (
        <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/20">
          <div className="flex items-center justify-between text-xs text-blue-700 dark:text-blue-300 mb-1">
            <span className="font-medium">{progress.step}</span>
            <span>{progress.percentage}%</span>
          </div>
          <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress.percentage}%` }}
            ></div>
          </div>
          {progress.message && (
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">{progress.message}</p>
          )}
        </div>
      )}

      {/* Logs Container */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {logs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <div className="text-center">
              <div className="text-2xl mb-2">📋</div>
              <p className="text-sm">No logs yet</p>
              <p className="text-xs mt-1">Agent activity will appear here</p>
            </div>
          </div>
        ) : (
          <>
            {logs.map((log) => (
              <div
                key={log.id}
                className={`text-xs p-2 rounded border-l-2 ${getLogTypeColor(log.type)} border-l-current`}
              >
                <div className="flex items-start justify-between">
                  <span className="flex-1 font-mono leading-relaxed">{log.message}</span>
                  <span className="text-xs opacity-60 ml-2 flex-shrink-0">
                    {log.timestamp.toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
            <div ref={logsEndRef} />
          </>
        )}
      </div>

      {/* File Operations Summary */}
      {fileOperations.length > 0 && (
        <div className="border-t border-gray-200 dark:border-gray-700 p-2">
          <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
            Recent File Operations:
          </div>
          <div className="space-y-1 max-h-20 overflow-y-auto">
            {fileOperations.slice(-3).map((op, index) => (
              <div key={index} className="text-xs flex items-center space-x-2">
                <span className={`px-1 rounded ${
                  op.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' :
                  op.status === 'failed' ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400' :
                  'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400'
                }`}>
                  {op.operation}
                </span>
                <span className="text-gray-600 dark:text-gray-400 truncate flex-1">
                  {op.file_path.split('/').pop()}
                </span>
                <span className={`text-xs ${
                  op.status === 'completed' ? 'text-green-600 dark:text-green-400' :
                  op.status === 'failed' ? 'text-red-600 dark:text-red-400' :
                  'text-yellow-600 dark:text-yellow-400'
                }`}>
                  {op.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
