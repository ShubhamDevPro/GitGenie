"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useChatStorage, type ChatMessage } from "@/hooks/useChatStorage";
import ReactMarkdown from "react-markdown";

interface ProjectStatus {
  isRunning: boolean;
  pid?: string;
  projectUrl?: string;
  port?: number; // Add port to interface
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
  
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [projectContextLoaded, setProjectContextLoaded] = useState(false);
  const [isRerunning, setIsRerunning] = useState(false);

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
      // Use the current port from project status, fallback to URL parameter
      const currentPort = projectStatus.port || port;
      // Use a proxy URL to hide the actual VM IP
      setIframeSrc(
        `/api/proxy/project?repositoryId=${repositoryId}&port=${currentPort}`
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
          port: data.port, // Capture the current port
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

  const rerunProject = async () => {
    if (!repositoryId || isRerunning) return;

    setIsRerunning(true);

    // Add rerun message to chat
    const rerunMessage: ChatMessage = {
      id: Date.now().toString(),
      text: "🔄 Starting project re-run. This will use the existing project files with any changes made by the AI agent...",
      sender: "bot",
      timestamp: new Date(),
    };
    addMessage(rerunMessage);

    try {
      const response = await fetch("/api/agent/rerun-project", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          repositoryId: repositoryId,
          useGCPVM: vmIP ? true : false // Use GCP VM if we have a VM IP
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Update project status to get new port info
        await checkProjectStatus();
        
        // Refresh iframe to show changes - wait for status update
        setTimeout(() => {
          if (iframeSrc) {
            // Force iframe reload by updating src with timestamp
            const currentPort = projectStatus?.port || port;
            const urlWithTimestamp = `/api/proxy/project?repositoryId=${repositoryId}&port=${currentPort}&t=${Date.now()}`;
            setIframeSrc(''); // Clear first
            setTimeout(() => setIframeSrc(urlWithTimestamp), 100); // Then reload with timestamp
          }
        }, 500); // Wait for checkProjectStatus to complete

        const successMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          text: `✅ Project re-run completed successfully! ${data.message || 'The project has been restarted with your changes.'} ${data.port ? `Running on port ${data.port}.` : ''}`,
          sender: "bot",
          timestamp: new Date(),
        };
        addMessage(successMessage);
      } else {
        const errorData = await response.json();
        const errorMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          text: `❌ Re-run failed: ${errorData.error || 'Unknown error'}. Please try using the "Launch Project with AI" button from the repositories page.`,
          sender: "bot",
          timestamp: new Date(),
        };
        addMessage(errorMessage);
      }
    } catch (error) {
      console.error("Error re-running project:", error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: "❌ Re-run failed due to connection issues. Please check your internet connection and try again.",
        sender: "bot",
        timestamp: new Date(),
      };
      addMessage(errorMessage);
    } finally {
      setIsRerunning(false);
    }
  };

    const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text,
      sender: "user",
      timestamp: new Date(),
    };

    addMessage(userMessage);
    setNewMessage(""); // Clear input after sending
    setIsLoading(true);

    try {
      const response = await fetch("/api/agent/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          message: text,
          repositoryId: repositoryId
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const botMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          text: data.response,
          sender: "bot",
          timestamp: new Date(),
        };
        addMessage(botMessage);

        // Check if code was modified and trigger auto re-run
        if (data.codeModified && repositoryId) {
          const rerunMessage: ChatMessage = {
            id: (Date.now() + 2).toString(),
            text: "🔄 Code changes detected. Automatically re-running the project...",
            sender: "bot",
            timestamp: new Date(),
          };
          addMessage(rerunMessage);

          // Trigger auto re-run
          try {
            const rerunResponse = await fetch("/api/agent/rerun-project", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ repositoryId: repositoryId }),
            });

            if (rerunResponse.ok) {
              const rerunData = await rerunResponse.json();
              const successMessage: ChatMessage = {
                id: (Date.now() + 3).toString(),
                text: `✅ Project re-run completed successfully! The changes have been applied and the project is running.`,
                sender: "bot",
                timestamp: new Date(),
              };
              addMessage(successMessage);
            } else {
              const rerunError = await rerunResponse.json();
              const errorMessage: ChatMessage = {
                id: (Date.now() + 3).toString(),
                text: `❌ Auto re-run failed: ${rerunError.error || 'Unknown error'}. You may need to manually restart the project.`,
                sender: "bot",
                timestamp: new Date(),
              };
              addMessage(errorMessage);
            }
          } catch (rerunError) {
            console.error("Error during auto re-run:", rerunError);
            const errorMessage: ChatMessage = {
              id: (Date.now() + 3).toString(),
              text: "❌ Auto re-run failed due to connection issues. You may need to manually restart the project.",
              sender: "bot",
              timestamp: new Date(),
            };
            addMessage(errorMessage);
          }
        }
      } else {
        const errorData = await response.json();
        const errorMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          text: `Sorry, I encountered an error: ${errorData.error || 'Unknown error'}. Please try again.`,
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

              <button
                onClick={rerunProject}
                disabled={isRerunning}
                className="px-3 py-1 text-sm bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded hover:bg-green-200 dark:hover:bg-green-900/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Re-run project with current changes"
              >
                {isRerunning ? (
                  <>
                    <span className="inline-block w-3 h-3 border border-green-600 border-t-transparent rounded-full animate-spin mr-1"></span>
                    Re-running...
                  </>
                ) : (
                  "🚀 Re-run"
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
                  🤖 AI Agent
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
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Ask questions about your project code and structure
                </p>
              </div>
              <div className="flex items-center space-x-2">
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
            className="flex-1 overflow-y-auto p-4 space-y-4"
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

          {/* Chat Input */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && sendMessage(newMessage)}
                placeholder="Ask about your code, structure, bugs, or improvements..."
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading || !chatLoaded}
              />
              <button
                onClick={() => sendMessage(newMessage)}
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
