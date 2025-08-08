import { useState } from 'react';

interface PortResult {
  frontend: number;
  backend: number;
}

interface ProjectAnalysis {
  projectType: string;
  framework: string;
  buildCommands: string[];
  runCommands: string[];
  dependencies: string[];
  ports: {
    frontend?: number;
    backend?: number;
  };
}

interface RunProjectResult {
  success: boolean;
  message?: string;
  ports?: PortResult;
  port?: number; // Added for GCP VM deployments
  scriptPath?: string;
  localPath?: string;
  vmIP?: string; // Added for GCP VM deployments
  error?: string;
  analysis?: ProjectAnalysis;
}

export const useAgentService = () => {
  const [isAnalyzingProject, setIsAnalyzingProject] = useState(false);
  const [isRunningProject, setIsRunningProject] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projectAnalysis, setProjectAnalysis] = useState<ProjectAnalysis | null>(null);

  const analyzeProject = async (
    projectPath?: string,
    repositoryId?: string
  ): Promise<ProjectAnalysis | null> => {
    setIsAnalyzingProject(true);
    setError(null);

    try {
      const response = await fetch('/api/agent/analyze-project', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectPath,
          repositoryId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze project');
      }

      if (data.success) {
        setProjectAnalysis(data.analysis);
        return data.analysis;
      } else {
        throw new Error(data.error || 'Project analysis failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to analyze project';
      setError(errorMessage);
      return null;
    } finally {
      setIsAnalyzingProject(false);
    }
  };

  const runProject = async (
    projectPath?: string,
    repositoryId?: string,
    useAIAnalysis: boolean = true,
    useGCPVM: boolean = false
  ): Promise<RunProjectResult | null> => {
    setIsRunningProject(true);
    setError(null);

    try {
      const response = await fetch('/api/agent/run-project', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectPath,
          repositoryId,
          useAIAnalysis,
          useGCPVM,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to run project');
      }

      // Update project analysis and ports from the run result
      if (data.success) {
        if (data.analysis) {
          setProjectAnalysis(data.analysis);
        }
      }

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to run project';
      setError(errorMessage);
      return null;
    } finally {
      setIsRunningProject(false);
    }
  };

  const clearError = () => {
    setError(null);
  };

  return {
    // State
    isAnalyzingProject,
    isRunningProject,
    error,
    projectAnalysis,

    // Functions
    analyzeProject,
    runProject, // Now uses AI analysis for project type detection and command generation
    clearError,
  };
};
