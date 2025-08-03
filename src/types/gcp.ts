// Helper functions for GCP VM operations
export interface VMPortResult {
  port: number;
  isAvailable: boolean;
}

export interface VMProjectResult {
  success: boolean;
  port?: number;
  ports?: {
    frontend?: number;
    backend?: number;
  };
  scriptPath?: string;
  localPath?: string;
  vmIP?: string;
  logs?: string;
  error?: string;
  analysis?: ProjectAnalysis;
  projectUrl?: string;
  commands?: string[];
  repositoryId?: string;
}

export interface ProjectAnalysis {
  projectType: string;
  dependencies: string[];
  startCommand: string;
  buildCommand?: string;
  port: number;
  framework?: string;
}
