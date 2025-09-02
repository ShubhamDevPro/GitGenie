"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

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
  const [chatMessages, setChatMessages] = useState<
    Array<{ id: string; text: string; sender: "user" | "bot"; timestamp: Date }>
  >([
    {
      id: "1",
      text: `Welcome! I'm your AI assistant for the ${repositoryName} project. I can help you understand your code, debug issues, suggest improvements, and answer questions about your project structure. What would you like to know?`,
      sender: "bot",
      timestamp: new Date(),
    },
  ]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [projectContextLoaded, setProjectContextLoaded] = useState(false);

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

  const sendMessage = async () => {
    if (!newMessage.trim() || isLoading) return;

    const userMessage = {
      id: Date.now().toString(),
      text: newMessage,
      sender: "user" as const,
      timestamp: new Date(),
    };

    setChatMessages((prev) => [...prev, userMessage]);
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
        const botMessage = {
          id: (Date.now() + 1).toString(),
          text: data.response,
          sender: "bot" as const,
          timestamp: new Date(),
        };
        setChatMessages((prev) => [...prev, botMessage]);
      } else {
        const errorData = await response.json();
        const errorMessage = {
          id: (Date.now() + 1).toString(),
          text: `Sorry, I encountered an error: ${errorData.error || 'Unknown error'}. Please try again.`,
          sender: "bot" as const,
          timestamp: new Date(),
        };
        setChatMessages((prev) => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        text: "Sorry, I'm having trouble connecting. Please check your internet connection and try again.",
        sender: "bot" as const,
        timestamp: new Date(),
      };
      setChatMessages((prev) => [...prev, errorMessage]);
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
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
              🤖 AI Agent
              {projectContextLoaded && (
                <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  Context Loaded
                </span>
              )}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Ask questions about your project code and structure
            </p>
          </div>

          {/* Chat Messages */}
          <div 
            ref={(el) => setChatContainerRef(el)}
            className="flex-1 overflow-y-auto p-4 space-y-4"
          >
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
                  <div className="text-sm whitespace-pre-line">
                    {message.text.split('\n').map((line, index) => {
                      // Handle code blocks with ```
                      if (line.trim().startsWith('```') && line.trim().endsWith('```') && line.trim().length > 6) {
                        const code = line.trim().slice(3, -3);
                        return (
                          <div key={index} className="my-2 p-2 bg-gray-800 text-green-400 rounded text-xs font-mono overflow-x-auto">
                            {code}
                          </div>
                        );
                      }
                      // Handle single line code with `
                      if (line.includes('`')) {
                        const parts = line.split(/(`[^`]+`)/g);
                        return (
                          <div key={index}>
                            {parts.map((part, partIndex) => {
                              if (part.startsWith('`') && part.endsWith('`')) {
                                return (
                                  <code key={partIndex} className="bg-gray-200 dark:bg-gray-600 px-1 rounded text-sm font-mono">
                                    {part.slice(1, -1)}
                                  </code>
                                );
                              }
                              return part;
                            })}
                          </div>
                        );
                      }
                      // Handle bold markdown formatting
                      if (line.includes('**')) {
                        const parts = line.split(/(\*\*.*?\*\*)/g);
                        return (
                          <div key={index}>
                            {parts.map((part, partIndex) => {
                              if (part.startsWith('**') && part.endsWith('**')) {
                                return <strong key={partIndex}>{part.slice(2, -2)}</strong>;
                              }
                              return part;
                            })}
                          </div>
                        );
                      }
                      // Handle bullet points
                      if (line.startsWith('• ') || line.startsWith('- ')) {
                        return <div key={index} className="ml-2">{line}</div>;
                      }
                      // Handle numbered lists
                      if (/^\d+\.\s/.test(line)) {
                        return <div key={index} className="ml-2">{line}</div>;
                      }
                      // Handle indented lines
                      if (line.startsWith('  - ')) {
                        return <div key={index} className="ml-4 text-xs opacity-90">{line}</div>;
                      }
                      return <div key={index}>{line}</div>;
                    })}
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
          </div>

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
                disabled={isLoading}
              />
              <button
                onClick={sendMessage}
                disabled={!newMessage.trim() || isLoading}
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
