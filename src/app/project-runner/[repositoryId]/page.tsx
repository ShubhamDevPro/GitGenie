"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useChatStorage, type ChatMessage } from "@/hooks/useChatStorage";
import { useAgentSocket } from "@/hooks/useAgentSocket";
import { AgentLogsViewer } from "@/components/AgentLogsViewer";
import { testAgentConnection } from "@/utils/agentConnectionUtils";
import ReactMarkdown from "react-markdown";

interface ProjectStatus {
  isRunning: boolean;
  pid?: string;
  projectUrl?: string;
}

export default function ProjectRunnerPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const router = useRouter();

  const repositoryId = params.repositoryId as string;
  const repositoryName = searchParams.get("name") || "Unknown Project";
  const vmIP = searchParams.get("vmIP");
  const port = searchParams.get("port") || "3000";

  const [projectStatus, setProjectStatus] = useState<ProjectStatus | null>(
    null
  );
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [iframeSrc, setIframeSrc] = useState<string>("");
  
  // Use chat storage hook
  const {
    messages: chatMessages,
    isLoaded: chatLoaded,
    addMessage,
    addMessages,
    updateMessages,
    clearMessages,
    getStorageInfo
  } = useChatStorage(repositoryId, repositoryName);

  // Use agent socket hook for real-time updates
  const {
    isConnected: socketConnected,
    logs: agentLogs,
    progress: agentProgress,
    fileOperations: agentFileOps,
    isAgentRunning,
    startMonitoring,
    stopMonitoring,
    clearLogs: clearAgentLogs,
    addLog: addAgentLog,
  } = useAgentSocket({
    vmIP: vmIP || "",
    onAgentComplete: (data) => {
      console.log("🎉 Agent completed via socket:", data);
      // Add completion message to chat
      const completionMessage: ChatMessage = {
        id: Date.now().toString(),
        text: `🎉 **Agent Task Completed Successfully!**\n\nThe OpenAI agent has finished processing your request. Check the logs below for detailed information about what was accomplished.\n\n*Session: ${data.session_id}*`,
        sender: "bot",
        timestamp: new Date(),
      };
      addMessage(completionMessage);
    },
    onAgentError: (data) => {
      console.error("💥 Agent error via socket:", data);
      // Add error message to chat
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        text: `💥 **Agent Error**: ${data.error}\n\nThe OpenAI agent encountered an issue while processing your request. Please try again or rephrase your request.\n\n*Session: ${data.session_id}*`,
        sender: "bot",
        timestamp: new Date(),
      };
      addMessage(errorMessage);
    },
  });
  
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [projectContextLoaded, setProjectContextLoaded] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);
  const [showAgentLogs, setShowAgentLogs] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);

  const [chatContainerRef, setChatContainerRef] = useState<HTMLDivElement | null>(null);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (chatContainerRef) {
      chatContainerRef.scrollTop = chatContainerRef.scrollHeight;
    }
  }, [chatMessages, isLoading]);

  const handleGoBack = () => {
    console.log("Back button clicked, history length:", window.history.length);
    // Try to go back in browser history first
    if (window.history.length > 1) {
      console.log("Using browser back navigation");
      router.back();
    } else {
      console.log("No history, redirecting to my-repositories");
      // Fallback to my-repositories page if no history
      router.push("/my-repositories");
    }
  };

  // Redirect if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  // Check project status and set iframe source
  useEffect(() => {
    if (repositoryId) {
      checkProjectStatus();
      loadProjectContext();
    }
  }, [repositoryId]);

  // Load project context for AI chat
  const loadProjectContext = async () => {
    if (!repositoryId) return;

    try {
      const response = await fetch(`/api/agent/chat?repositoryId=${repositoryId}`);
      if (response.ok) {
        const data = await response.json();
        setProjectContextLoaded(true);
        console.log('Project context loaded:', data.projectContext);
      } else {
        console.warn('Failed to load project context');
      }
    } catch (error) {
      console.error('Error loading project context:', error);
    }
  };

  // Set iframe source based on project status
  useEffect(() => {
    if (projectStatus?.isRunning && vmIP) {
      // Use a proxy URL to hide the actual VM IP
      setIframeSrc(
        `/api/proxy/project?repositoryId=${repositoryId}&port=${port}`
      );
    }
  }, [projectStatus, vmIP, port, repositoryId]);

  const checkProjectStatus = async () => {
    if (!repositoryId) return;

    setCheckingStatus(true);

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
          projectUrl: data.projectUrl,
        });
      }
    } catch (error) {
      console.error("Error checking project status:", error);
    } finally {
      setCheckingStatus(false);
    }
  };

  const stopProject = async () => {
    if (!repositoryId) return;

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
        setIframeSrc("");
      }
    } catch (error) {
      console.error("Error stopping project:", error);
    }
  };

  const restartProject = async () => {
    if (!repositoryId || isRestarting) return;

    setIsRestarting(true);

    try {
      // Add a restart notification message to chat
      const restartMessage: ChatMessage = {
        id: Date.now().toString(),
        text: "🔄 **Auto-Restart**: Restarting project to apply code changes...",
        sender: "bot",
        timestamp: new Date(),
      };
      addMessage(restartMessage);

      // Use the new restart-in-place endpoint that preserves agent changes
      console.log("� Restarting project in place (preserving agent changes)...");
      const restartResponse = await fetch("/api/agent/restart-project", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          repositoryId
        }),
      });

      if (restartResponse.ok) {
        const restartData = await restartResponse.json();
        
        // Step 4: Update iframe URL with new port if provided
        if (restartData.port && restartData.vmIP) {
          const newProjectUrl = `http://${restartData.vmIP}:${restartData.port}`;
          setIframeSrc(newProjectUrl);
          console.log(`🔄 Updated iframe URL to: ${newProjectUrl}`);
        }
        
        // Step 5: Check new project status
        await new Promise(resolve => setTimeout(resolve, 2000));
        await checkProjectStatus();

        // Add success message
        const successMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          text: "✅ **Restart Complete**: Project restarted successfully! Your changes are now live.",
          sender: "bot",
          timestamp: new Date(),
        };
        addMessage(successMessage);

      } else {
        const errorData = await restartResponse.json();
        throw new Error(errorData.error || "Failed to restart project");
      }

    } catch (error) {
      console.error("Error restarting project:", error);
      
      // Add error message
      const errorMessage: ChatMessage = {
        id: (Date.now() + 2).toString(),
        text: "⚠️ **Restart Failed**: Could not restart project automatically. You may need to restart manually using the project controls.",
        sender: "bot",
        timestamp: new Date(),
      };
      addMessage(errorMessage);
    } finally {
      setIsRestarting(false);
    }
  };

  // Test agent connection
  const testConnection = async () => {
    if (!vmIP || testingConnection) return;
    
    setTestingConnection(true);
    try {
      const result = await testAgentConnection(vmIP);
      addAgentLog(
        result.success 
          ? `✅ Connection test passed: ${result.message}` 
          : `❌ Connection test failed: ${result.message}`,
        result.success ? 'success' : 'error'
      );
      
      if (result.success) {
        setShowAgentLogs(true);
      }
    } catch (error) {
      addAgentLog(`❌ Connection test error: ${error}`, 'error');
    } finally {
      setTestingConnection(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: newMessage,
      sender: "user",
      timestamp: new Date(),
    };

    // Add user message to storage
    addMessage(userMessage);
    setNewMessage("");
    setIsLoading(true);

    try {
      const response = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repositoryId,
          message: newMessage,
          conversationHistory: chatMessages.map(msg => ({
            sender: msg.sender,
            text: msg.text,
            timestamp: msg.timestamp.toISOString()
          }))
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Extract response and metadata
        const responseText = data.response;
        const intent = data.intent || 'explanation';
        const agentType = data.agentType || 'gemini';
        const sessionId = data.sessionId;
        
        // Create different message styles based on agent type
        let messageText = responseText;
        let messagePrefix = '';
        
        if (agentType === 'openai') {
          messagePrefix = '🤖 **OpenAI Code Agent**: ';
          if (sessionId) {
            messageText += `\n\n---\n*Session: ${sessionId}*`;
          }
        } else if (agentType === 'gemini') {
          messagePrefix = '💎 **Gemini Assistant**: ';
        }
        
        const botMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          text: messagePrefix + messageText,
          sender: "bot",
          timestamp: new Date(),
        };
        addMessage(botMessage);
        
        // Show project context loaded status
        if (data.projectInfo && !projectContextLoaded) {
          setProjectContextLoaded(true);
        }

        // Auto-restart project if OpenAI agent made code changes
        if (data.shouldRestartProject && agentType === 'openai' && projectStatus?.isRunning) {
          console.log("🔄 OpenAI Agent completed successfully, triggering project restart...");
          // Small delay to let the user see the completion message first
          setTimeout(() => {
            restartProject();
          }, 2000);
        }

        // Start monitoring the session if it's an OpenAI agent request
        if (agentType === 'openai' && sessionId) {
          addAgentLog(`🚀 Started monitoring OpenAI agent session: ${sessionId}`, 'info');
          startMonitoring(sessionId);
          // Auto-show logs when agent starts
          setShowAgentLogs(true);
        }
      } else {
        const errorData = await response.json();
        
        // Handle different types of errors
        let errorMessageText = '';
        
        if (errorData.fallbackToGemini) {
          errorMessageText = `⚠️ **OpenAI Agent Issue**: ${errorData.error || 'Service temporarily unavailable'}\n\n💡 Try rephrasing your request as a question for Gemini, or check if the VM agent is running.`;
        } else {
          errorMessageText = `Sorry, I encountered an error: ${errorData.error || 'Unknown error'}. Please try again.`;
        }
        
        const errorMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          text: errorMessageText,
          sender: "bot",
          timestamp: new Date(),
        };
        addMessage(errorMessage);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: "Sorry, I'm having trouble connecting. Please check your internet connection and try again.",
        sender: "bot",
        timestamp: new Date(),
      };
      addMessage(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleGoBack}
              className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Go back to repositories"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              <span className="ml-1 text-sm font-medium">Back</span>
            </button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                🚀 {repositoryName}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Project Runner & AI Assistant
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Project Status */}
            <div className="flex items-center space-x-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  projectStatus?.isRunning
                    ? "bg-green-500 animate-pulse"
                    : "bg-red-500"
                }`}
              ></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {projectStatus?.isRunning ? "Running" : "Stopped"}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-2">
              <button
                onClick={checkProjectStatus}
                disabled={checkingStatus}
                className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-900/40 transition-colors"
              >
                {checkingStatus ? (
                  <>
                    <span className="inline-block w-3 h-3 border border-blue-600 border-t-transparent rounded-full animate-spin mr-1"></span>
                    Checking...
                  </>
                ) : (
                  "🔄 Refresh"
                )}
              </button>

              {projectStatus?.isRunning && (
                <button
                  onClick={stopProject}
                  className="px-3 py-1 text-sm bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-900/40 transition-colors"
                >
                  🛑 Stop
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-80px)]">
        {/* Left Side - Chatbot */}
        <div className="w-1/3 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
          {/* Chat Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                  🤖 Dual AI Agent
                  {projectContextLoaded && (
                    <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      Context Loaded
                    </span>
                  )}
                  {chatLoaded && (
                    <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                      💾 Auto-saved
                    </span>
                  )}
                  {projectStatus?.isRunning && (
                    <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      🔄 Auto-restart
                    </span>
                  )}
                  {isRestarting && (
                    <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                      ⏳ Restarting...
                    </span>
                  )}
                  {socketConnected && (
                    <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      🔌 Socket Connected
                    </span>
                  )}
                  {isAgentRunning && (
                    <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                      <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse mr-1"></div>
                      Agent Running
                    </span>
                  )}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  💎 <strong>Gemini</strong>: Explanations & Questions | 🤖 <strong>OpenAI Agent</strong>: Code Changes & Auto-restart
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowAgentLogs(!showAgentLogs)}
                  className={`p-1 transition-colors ${showAgentLogs 
                    ? 'text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300' 
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                  title="Toggle agent logs"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </button>
                {vmIP && (
                  <button
                    onClick={testConnection}
                    disabled={testingConnection}
                    className="p-1 text-gray-500 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400 transition-colors"
                    title="Test agent connection"
                  >
                    {testingConnection ? (
                      <div className="w-4 h-4 border border-gray-400 border-t-green-600 rounded-full animate-spin"></div>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                      </svg>
                    )}
                  </button>
                )}
                <button
                  onClick={() => {
                    const info = getStorageInfo();
                    alert(`Chat Storage Info:
• Messages in this session: ${info.currentSessionMessages}
• Total chat sessions: ${info.totalSessions}
• Storage size: ${info.storageSizeKB} KB
                    
Your chats are automatically saved to your browser's local storage.`);
                  }}
                  className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  title="Storage info"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to clear this chat session? This cannot be undone.')) {
                      clearMessages();
                    }
                  }}
                  className="p-1 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
                  title="Clear chat"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Chat Messages */}
          <div 
            ref={(el) => setChatContainerRef(el)}
            className={`overflow-y-auto p-4 space-y-4 ${showAgentLogs ? 'flex-none h-1/2' : 'flex-1'}`}
          >
            {!chatLoaded ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-2"></div>
                  <p className="text-sm text-gray-500">Loading chat history...</p>
                </div>
              </div>
            ) : (
              <>
                {chatMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.sender === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[80%] p-3 rounded-lg ${
                        message.sender === "user"
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      }`}
                    >
                      <div className="text-sm">
                        <ReactMarkdown
                          components={{
                            // Custom styling for different elements
                            p: ({ children }) => <div className="mb-2 last:mb-0">{children}</div>,
                            strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                            code: ({ children }) => (
                              <code className="bg-gray-200 dark:bg-gray-600 px-1 py-0.5 rounded text-sm font-mono">
                                {children}
                              </code>
                            ),
                            pre: ({ children }) => (
                              <pre className="my-2 p-2 bg-gray-800 text-green-400 rounded text-xs font-mono overflow-x-auto">
                                {children}
                              </pre>
                            ),
                            ul: ({ children }) => <ul className="ml-4 space-y-1">{children}</ul>,
                            ol: ({ children }) => <ol className="ml-4 space-y-1">{children}</ol>,
                            li: ({ children }) => <li className="list-disc">{children}</li>,
                            h1: ({ children }) => <h1 className="text-lg font-bold mb-2">{children}</h1>,
                            h2: ({ children }) => <h2 className="text-base font-bold mb-2">{children}</h2>,
                            h3: ({ children }) => <h3 className="text-sm font-bold mb-1">{children}</h3>,
                            blockquote: ({ children }) => (
                              <blockquote className="border-l-4 border-gray-300 pl-3 italic opacity-90">
                                {children}
                              </blockquote>
                            ),
                            a: ({ children, href }) => (
                              <a href={href} className="text-blue-500 hover:underline" target="_blank" rel="noopener noreferrer">
                                {children}
                              </a>
                            ),
                          }}
                        >
                          {message.text}
                        </ReactMarkdown>
                      </div>
                      <p className="text-xs opacity-70 mt-1">
                        {message.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce"></div>
                        <div
                          className="w-2 h-2 bg-gray-600 rounded-full animate-bounce"
                          style={{ animationDelay: "0.1s" }}
                        ></div>
                        <div
                          className="w-2 h-2 bg-gray-600 rounded-full animate-bounce"
                          style={{ animationDelay: "0.2s" }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Agent Logs Viewer (when toggled) */}
          {showAgentLogs && (
            <div className="flex-1 border-t border-gray-200 dark:border-gray-700">
              <AgentLogsViewer
                logs={agentLogs}
                progress={agentProgress}
                fileOperations={agentFileOps}
                isAgentRunning={isAgentRunning}
                isConnected={socketConnected}
                onClear={clearAgentLogs}
              />
            </div>
          )}

          {/* Chat Input */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Ask about your code, structure, bugs, or improvements..."
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading || !chatLoaded}
              />
              <button
                onClick={sendMessage}
                disabled={!newMessage.trim() || isLoading || !chatLoaded}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
              </button>
            </div>
            {!chatLoaded && (
              <p className="text-xs text-gray-500 mt-2">Loading chat history...</p>
            )}
            {showAgentLogs && (
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                🔍 Agent logs are visible above. Real-time updates will appear during code modifications.
              </p>
            )}
          </div>
        </div>

        {/* Right Side - Project Preview */}
        <div className="flex-1 bg-gray-100 dark:bg-gray-900 flex flex-col">
          {/* Preview Header */}
          <div className="p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
              🌐 Live Preview
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Your running application
            </p>
          </div>

          {/* Preview Content */}
          <div className="flex-1 p-4">
            {projectStatus?.isRunning && iframeSrc ? (
              <div className="h-full bg-white rounded-lg shadow-lg overflow-hidden">
                <iframe
                  src={iframeSrc}
                  className="w-full h-full border-0"
                  title={`${repositoryName} Preview`}
                  sandbox="allow-same-origin allow-scripts allow-forms allow-navigation"
                />
              </div>
            ) : projectStatus?.isRunning && vmIP ? (
              <div className="h-full bg-white rounded-lg shadow-lg overflow-hidden">
                <iframe
                  src={`http://${vmIP}:${port}`}
                  className="w-full h-full border-0"
                  title={`${repositoryName} Preview`}
                  sandbox="allow-same-origin allow-scripts allow-forms allow-navigation"
                />
              </div>
            ) : projectStatus && !projectStatus.isRunning ? (
              <div className="h-full flex items-center justify-center bg-white dark:bg-gray-800 rounded-lg">
                <div className="text-center">
                  <div className="text-6xl mb-4">😴</div>
                  <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Project is not running
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Your project needs to be started to see the preview
                  </p>
                  <button
                    onClick={handleGoBack}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Go back to start project
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center bg-white dark:bg-gray-800 rounded-lg">
                <div className="text-center">
                  <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Loading project status...
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Please wait while we check your project
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
