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
      text: `Welcome! I'm here to help you with your project . You can ask me questions about your running application, request debugging help, or get suggestions for improvements.`,
      sender: "bot",
      timestamp: new Date(),
    },
  ]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messageCount, setMessageCount] = useState(0);
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
    }
  }, [repositoryId]);

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
      // Demo functionality for showcasing AI capabilities
      setTimeout(() => {
        let botResponse = "";
        let followUpAction = null;
        
        if (messageCount === 0) {
          // First user message - show tech stack breakdown
          botResponse = `Here's the tech stack breakdown:

**Backend Technologies**
• **Python**
• **PyGame** - Used for the original desktop game implementation in main.py
  - Game window creation and management
  - Event handling (keyboard inputs, quit events)
  - 2D graphics rendering (rectangles, colors)
  - Game loop with FPS control
• **Flask** - Web framework for serving the web versions in app.py
  - Simple routing (/ and /game endpoints)
  - Template rendering with Jinja2
  - Development server with debug mode

**Frontend Technologies**
• **HTML5**
• **Canvas API** - Used in both game.html and index.html
  - 2D rendering context for game graphics
  - Real-time drawing and animation
• **JavaScript (Vanilla)**
  - Game Logic - Direct port of Python game mechanics to browser
  - Event Handling - Keyboard input detection (keydown events)
  - Game Loop - Using setInterval() for consistent FPS
  - DOM Manipulation - UI updates for score and game status
• **CSS3**
  - Styling - Basic responsive design and visual enhancements
  - Layout - Flexbox for centering and component arrangement

**Dependencies:**
• Flask 2.3.3
• Werkzeug 2.3.7`;
        } else if (messageCount === 1) {
          // Second user message - show code modification message
          botResponse = "Let me modify the code to implement snake growth when eating food.";
          
          // Set up follow-up action with proper loading sequence
          followUpAction = () => {
            // Show loading animation for 5 seconds, then display success message
            setTimeout(() => {
              setIsLoading(false);
              setTimeout(() => {
                setIsLoading(true);
                setTimeout(() => {
                  const successMessage = {
                    id: (Date.now() + 2).toString(),
                    text: "Great! The code has been successfully modified.",
                    sender: "bot" as const,
                    timestamp: new Date(),
                  };
                  setChatMessages((prev) => [...prev, successMessage]);
                  setIframeSrc(`http://34.131.96.184:8099/`);
                  setIsLoading(false);
                }, 5000);
              }, 100);
            }, 0);
          };
        } else if (messageCount === 2) {
          // Third user message - dark mode toggle
          botResponse = `I'll add a dark mode toggle feature that will switch between light and dark themes. Let me implement this by:
1. Adding dark mode CSS variables and styles
2. Adding a toggle button in the UI
3. Implementing JavaScript functionality to switch themes
4. Storing the user's preference in localStorage`;
          
          followUpAction = () => {
            setTimeout(() => {
              setIsLoading(false);
              setTimeout(() => {
                setIsLoading(true);
                setTimeout(() => {
                  const successMessage = {
                    id: (Date.now() + 2).toString(),
                    text: "Great! I've successfully added a dark mode toggle feature to your Snake game application.",
                    sender: "bot" as const,
                    timestamp: new Date(),
                  };
                  setChatMessages((prev) => [...prev, successMessage]);
                  setIframeSrc(`http://34.131.96.184:8098/`);
                  setIsLoading(false);
                }, 5000);
              }, 100);
            }, 0);
          };
        } else if (messageCount === 3) {
          // Fourth user message - change food color
          botResponse = "Looking at the JavaScript, I can see that the target in this context appears to be the food that the snake eats. Currently, the food color is set to red (#FF0000) in the getFoodColor() function. Let me change it to green as requested.";
          
          followUpAction = () => {
            setTimeout(() => {
              setIsLoading(false);
              setTimeout(() => {
                setIsLoading(true);
                setTimeout(() => {
                  const successMessage = {
                    id: (Date.now() + 2).toString(),
                    text: "Perfect! I've changed the target (food) color from red (#FF0000) to green (#00FF00). The food that the snake eats will now appear in green instead of red.",
                    sender: "bot" as const,
                    timestamp: new Date(),
                  };
                  setChatMessages((prev) => [...prev, successMessage]);
                  setIframeSrc(`http://34.131.96.184:8097/`);
                  setIsLoading(false);
                }, 5000);
              }, 100);
            }, 0);
          };
        } else if (messageCount === 4) {
          // Fifth user message - rounded corners
          botResponse = "I can see that the game canvas is styled with the ID #gameCanvas and currently has a border and box shadow. To add rounded corners to the game box, I need to add the border-radius property to the canvas styling.";
          
          followUpAction = () => {
            setTimeout(() => {
              setIsLoading(false);
              setTimeout(() => {
                setIsLoading(true);
                setTimeout(() => {
                  const successMessage = {
                    id: (Date.now() + 2).toString(),
                    text: "Great! I've added rounded corners to the game canvas by adding border-radius: 15px; to the #gameCanvas CSS rule. This will give the box containing the snake and target nice rounded corners.",
                    sender: "bot" as const,
                    timestamp: new Date(),
                  };
                  setChatMessages((prev) => [...prev, successMessage]);
                  setIframeSrc(`http://34.131.96.184:8096/`);
                  setIsLoading(false);
                }, 5000);
              }, 100);
            }, 0);
          };
        } else if (messageCount === 5) {
          // Sixth user message - reduce speed
          botResponse = "The FPS (frames per second) determines how often the game loop runs - by reducing it from 30 to 15, the snake will update its position half as frequently, effectively making it move slower. To reduce the speed by half, I need to change the fps value from 30 to 15";
          
          followUpAction = () => {
            setTimeout(() => {
              setIsLoading(false);
              setTimeout(() => {
                setIsLoading(true);
                setTimeout(() => {
                  const successMessage = {
                    id: (Date.now() + 2).toString(),
                    text: "Perfect! I've successfully reduced the snake's speed by half.",
                    sender: "bot" as const,
                    timestamp: new Date(),
                  };
                  setChatMessages((prev) => [...prev, successMessage]);
                  setIframeSrc(`http://34.131.96.184:8095/`);
                  setIsLoading(false);
                }, 5000);
              }, 100);
            }, 0);
          };
        } else {
          // Fallback for additional messages
          botResponse = "I'm ready to help you with more modifications! What would you like me to change about your Snake game?";
        }

        const botMessage = {
          id: (Date.now() + 1).toString(),
          text: botResponse,
          sender: "bot" as const,
          timestamp: new Date(),
        };
        
        setChatMessages((prev) => [...prev, botMessage]);
        setMessageCount(prev => prev + 1);
        setIsLoading(false);
        
        // Execute follow-up action if defined
        if (followUpAction) {
          followUpAction();
        }
      }, 3000); // Increased from 1000ms to 3000ms (3x longer)
    } catch (error) {
      console.error("Error sending message:", error);
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
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Ask questions about your project
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
                      if (line.startsWith('• ')) {
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
                placeholder="Ask about your project..."
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
