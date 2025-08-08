# AI-Powered Project Analysis and Launch

This application now includes AI-powered project analysis using OpenAI's GPT-4 model to intelligently detect project types and generate optimized build/run commands.

## Features

### 🤖 AI Project Analysis
- Automatically analyzes project structure and dependencies
- Detects framework types (React, Next.js, Node.js, Vue, Angular, etc.)
- Identifies whether it's a fullstack, frontend, or backend project
- Suggests optimal port configurations

### 🚀 Smart Project Launch
- Generates Windows batch files with proper command sequences
- Uses AI-recommended build and run commands
- Handles complex project structures (frontend/backend)
- Supports multiple frameworks and project types

### 🔧 Enhanced User Experience
- Real-time analysis feedback
- Detailed project information display
- Smart error handling and recovery
- Port conflict resolution

## Setup

### Environment Variables
Add the following to your `.env.local` file:

```env
OPENAI_API_KEY=your_openai_api_key_here
```

### API Endpoints

#### `/api/agent/analyze-project` (POST)
Analyzes a project using AI and returns detailed project information.

**Request Body:**
```json
{
  "projectPath": "/path/to/project",
  "repositoryId": "optional-repo-id"
}
```

**Response:**
```json
{
  "success": true,
  "analysis": {
    "projectType": "react",
    "framework": "Create React App",
    "buildCommands": ["npm install"],
    "runCommands": ["npm start"],
    "dependencies": ["react", "react-dom"],
    "ports": {
      "frontend": 8000
    }
  }
}
```

#### `/api/agent/run-project` (POST)
Runs a project with optional AI analysis.

**Request Body:**
```json
{
  "projectPath": "/path/to/project",
  "repositoryId": "optional-repo-id",
  "useAIAnalysis": true
}
```

## Usage

### In React Components

```tsx
import { useAgentService } from '@/hooks/useAgentService';

const MyComponent = () => {
  const { 
    isAnalyzingProject,
    isRunningProject,
    projectAnalysis,
    analyzeProject,
    runProject,
    error 
  } = useAgentService();

  const handleAnalyze = async () => {
    const analysis = await analyzeProject('/path/to/project');
    if (analysis) {
      console.log('Project type:', analysis.projectType);
      console.log('Framework:', analysis.framework);
    }
  };

  const handleRun = async () => {
    const result = await runProject('/path/to/project');
    if (result?.success) {
      console.log('Project started on ports:', result.ports);
    }
  };

  return (
    <div>
      <button onClick={handleAnalyze} disabled={isAnalyzingProject}>
        {isAnalyzingProject ? 'Analyzing...' : 'Analyze Project'}
      </button>
      
      <button onClick={handleRun} disabled={isRunningProject}>
        {isRunningProject ? 'Starting...' : 'Run Project'}
      </button>

      {projectAnalysis && (
        <div>
          <h3>Project Analysis</h3>
          <p>Type: {projectAnalysis.projectType}</p>
          <p>Framework: {projectAnalysis.framework}</p>
          <p>Dependencies: {projectAnalysis.dependencies.join(', ')}</p>
        </div>
      )}

      {error && <div className="error">Error: {error}</div>}
    </div>
  );
};
```

## AI Analysis Process

1. **Project Structure Scanning**: Reads directory structure up to 2 levels deep
2. **Package.json Analysis**: Extracts dependencies, scripts, and configuration
3. **AI Processing**: Sends structure to GPT-4 for intelligent analysis
4. **Command Generation**: Creates optimized build and run sequences
5. **Batch File Creation**: Generates Windows-compatible batch files
6. **Execution**: Runs the generated commands with proper error handling

## Supported Project Types

- **React**: Create React App, Vite React projects
- **Next.js**: App Router and Pages Router
- **Vue**: Vue CLI, Vite Vue projects
- **Angular**: Angular CLI projects
- **Node.js**: Express, Fastify, custom servers
- **Fullstack**: Projects with separate frontend/backend folders
- **And more**: The AI can adapt to various project structures

## Error Handling

The system includes comprehensive error handling:
- OpenAI API failures fallback to legacy analysis
- Invalid project structures are reported clearly
- Port conflicts are automatically resolved
- Malformed AI responses trigger retry mechanisms

## Performance Considerations

- AI analysis is cached when possible
- Token usage is optimized by sending only relevant file contents
- Parallel processing for multiple operations where safe
- Background processes for long-running tasks

## Migration from Legacy System

The new system maintains backward compatibility:
- Legacy `checkPortsAvailability()` still works
- Old `runProject()` method unchanged
- New methods are additive, not replacing existing functionality
- Components can gradually adopt AI features

## Troubleshooting

### Common Issues

1. **Missing OpenAI API Key**
   - Add `OPENAI_API_KEY` to your environment variables
   - Verify the key has sufficient credits

2. **AI Analysis Fails**
   - System falls back to legacy project detection
   - Check console for detailed error messages

3. **Port Conflicts**
   - System automatically finds alternative ports
   - Manual port specification available in analysis

4. **Batch File Execution Issues**
   - Ensure Windows execution policies allow batch files
   - Check that Node.js and npm are in system PATH
