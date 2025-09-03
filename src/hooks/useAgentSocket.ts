import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

export interface AgentLog {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: Date;
}

export interface AgentProgress {
  step: string;
  current: number;
  total: number;
  percentage: number;
  message?: string;
  timestamp: Date;
}

export interface FileOperation {
  operation: 'read' | 'write' | 'create' | 'patch' | 'lint';
  file_path: string;
  status: 'started' | 'completed' | 'failed';
  timestamp: Date;
}

export interface UseAgentSocketOptions {
  vmIP: string;
  onAgentComplete?: (data: { log: string; session_id: string }) => void;
  onAgentError?: (data: { error: string; session_id: string }) => void;
}

export function useAgentSocket({ vmIP, onAgentComplete, onAgentError }: UseAgentSocketOptions) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [progress, setProgress] = useState<AgentProgress | null>(null);
  const [fileOperations, setFileOperations] = useState<FileOperation[]>([]);
  const [isAgentRunning, setIsAgentRunning] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const onAgentCompleteRef = useRef(onAgentComplete);
  const onAgentErrorRef = useRef(onAgentError);

  // Update refs when callbacks change
  useEffect(() => {
    onAgentCompleteRef.current = onAgentComplete;
    onAgentErrorRef.current = onAgentError;
  }, [onAgentComplete, onAgentError]);

  // Add log entry - moved up to avoid issues with connect function
  const addLog = useCallback((message: string, type: AgentLog['type'] = 'info', timestamp?: string) => {
    const logEntry: AgentLog = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      message,
      type,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
    };
    
    setLogs(prev => {
      const newLogs = [...prev, logEntry];
      // Keep only the last 100 logs to prevent memory issues
      return newLogs.slice(-100);
    });
  }, []);

  // Connect to the VM agent's WebSocket server
  const connect = useCallback(() => {
    if (!vmIP || socketRef.current?.connected) return;

    try {
      const socketUrl = `http://${vmIP}:5000`;
      console.log('🔌 Connecting to agent socket:', socketUrl);
      
      const newSocket = io(socketUrl, {
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
        timeout: 10000,
      });

      socketRef.current = newSocket;
      setSocket(newSocket);

      // Connection events
      newSocket.on('connect', () => {
        console.log('✅ Connected to agent socket');
        setIsConnected(true);
        addLog('🔌 Connected to GitGenie Agent server', 'success');
      });

      newSocket.on('disconnect', (reason) => {
        console.log('❌ Disconnected from agent socket:', reason);
        setIsConnected(false);
        setIsAgentRunning(false);
        addLog('❌ Disconnected from agent server', 'error');
      });

      newSocket.on('connect_error', (error) => {
        console.error('🚫 Socket connection error:', error);
        setIsConnected(false);
        addLog('🚫 Failed to connect to agent server', 'error');
      });

      // Agent log events
      newSocket.on('agent_log', (data: { message: string; type: string; timestamp?: string }) => {
        addLog(data.message, data.type as AgentLog['type'], data.timestamp);
      });

      // Progress events
      newSocket.on('agent_progress', (data: {
        step: string;
        current: number;
        total: number;
        percentage: number;
        message?: string;
        timestamp?: string;
      }) => {
        const progressData: AgentProgress = {
          ...data,
          timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
        };
        setProgress(progressData);
        addLog(`⏳ ${data.step}: ${data.current}/${data.total} (${data.percentage}%)${data.message ? ' - ' + data.message : ''}`, 'info');
      });

      // File operation events
      newSocket.on('file_operation', (data: {
        operation: string;
        file_path: string;
        status: string;
        timestamp?: string;
      }) => {
        const fileOp: FileOperation = {
          operation: data.operation as FileOperation['operation'],
          file_path: data.file_path,
          status: data.status as FileOperation['status'],
          timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
        };
        
        setFileOperations(prev => [...prev, fileOp]);
        
        const emoji = getFileOperationEmoji(fileOp.operation, fileOp.status);
        addLog(
          `${emoji} ${fileOp.operation.toUpperCase()}: ${fileOp.file_path} - ${fileOp.status.toUpperCase()}`,
          fileOp.status === 'failed' ? 'error' : 'info'
        );
      });

      // Agent completion/error events
      newSocket.on('agent_complete', (data: { log: string; session_id: string }) => {
        console.log('🎉 Agent completed:', data);
        setIsAgentRunning(false);
        setProgress(null);
        addLog('🎉 Agent execution completed successfully!', 'success');
        onAgentCompleteRef.current?.(data);
      });

      newSocket.on('agent_error', (data: { error: string; session_id: string }) => {
        console.error('💥 Agent error:', data);
        setIsAgentRunning(false);
        setProgress(null);
        addLog(`💥 Agent execution failed: ${data.error}`, 'error');
        onAgentErrorRef.current?.(data);
      });

      // Status events
      newSocket.on('status', (data: { message: string }) => {
        addLog(`📡 ${data.message}`, 'info');
      });

    } catch (error) {
      console.error('Failed to create socket connection:', error);
      addLog('Failed to establish WebSocket connection', 'error');
    }
  }, [vmIP]);  // Only depend on vmIP, not the callback functions

  // Disconnect from socket
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      console.log('🔌 Disconnecting from agent socket');
      socketRef.current.disconnect();
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
      setIsAgentRunning(false);
      setProgress(null);
    }
  }, []);

  // Clear logs
  const clearLogs = useCallback(() => {
    setLogs([]);
    setFileOperations([]);
    setProgress(null);
  }, []);

  // Start monitoring an agent session
  const startMonitoring = useCallback((sessionId: string) => {
    addLog(`🚀 Started monitoring agent session: ${sessionId}`, 'info');
    setIsAgentRunning(true);
    setProgress(null);
    setFileOperations([]);
  }, [addLog]);

  // Stop monitoring
  const stopMonitoring = useCallback(() => {
    setIsAgentRunning(false);
    setProgress(null);
  }, []);

  // Auto-connect when vmIP changes
  useEffect(() => {
    if (vmIP) {
      connect();
    }
    
    // Cleanup on unmount or vmIP change
    return () => {
      disconnect();
    };
  }, [vmIP]); // Only depend on vmIP, not the functions

  return {
    socket,
    isConnected,
    logs,
    progress,
    fileOperations,
    isAgentRunning,
    connect,
    disconnect,
    clearLogs,
    startMonitoring,
    stopMonitoring,
    addLog,
  };
}

// Helper function to get emoji for file operations
function getFileOperationEmoji(operation: string, status: string): string {
  const emojis: Record<string, Record<string, string>> = {
    'read': { 'started': '📖', 'completed': '✅', 'failed': '❌' },
    'write': { 'started': '✍️', 'completed': '✅', 'failed': '❌' },
    'create': { 'started': '📝', 'completed': '✅', 'failed': '❌' },
    'patch': { 'started': '🔧', 'completed': '✅', 'failed': '❌' },
    'lint': { 'started': '🔍', 'completed': '✅', 'failed': '❌' },
  };
  
  return emojis[operation]?.[status] || '📄';
}
