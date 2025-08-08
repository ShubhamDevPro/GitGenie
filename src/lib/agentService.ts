import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import getPort, { portNumbers } from 'get-port';
import { simpleGit } from 'simple-git';
import OpenAI from 'openai';

const execAsync = promisify(exec);
const git = simpleGit();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface PortCheckResult {
  frontendPort: number;
  backendPort: number;
  isAvailable: boolean;
  error?: string;
}

export interface ProjectAnalysis {
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

export interface ProjectRunResult {
  success: boolean;
  scriptPath?: string;
  error?: string;
  ports?: {
    frontendPort: number;
    backendPort: number;
  };
  localPath?: string;
  analysis?: ProjectAnalysis;
}

export class AgentService {
  private static readonly TEMP_CLONE_DIR = path.join(process.cwd(), 'temp', 'cloned-repos');

  /**
   * Check for available ports on GCP
   */
  static async checkPortsAvailability(): Promise<PortCheckResult> {
    try {
      console.log('🔍 Finding two available ports in the 8000-9000 range...');
      
      const frontendPort = await getPort({ port: portNumbers(8000, 9000) });
      const backendPort = await getPort({
        port: portNumbers(8000, 9000),
        exclude: [frontendPort]
      });

      console.log(`✅ Available ports found: Frontend=${frontendPort}, Backend=${backendPort}`);
      
      return {
        frontendPort,
        backendPort,
        isAvailable: true
      };
    } catch (error) {
      console.error('❌ Could not find available ports in 8000-9000 range:', error);
      return {
        frontendPort: 0,
        backendPort: 0,
        isAvailable: false,
        error: error instanceof Error ? error.message : 'Unknown error finding ports'
      };
    }
  }

  /**
   * Clone repository from Gitea to local temporary directory
   */
  static async cloneFromGitea(giteaCloneUrl: string, repoName: string): Promise<string | null> {
    try {
      const localPath = path.join(this.TEMP_CLONE_DIR, `${repoName}-gitea-${Date.now()}`);
      
      // Ensure temp directory exists
      await fs.mkdir(path.dirname(localPath), { recursive: true });
      
      console.log(`Cloning from Gitea: ${giteaCloneUrl} to ${localPath}...`);
      await git.clone(giteaCloneUrl, localPath);
      
      console.log('✅ Repository cloned successfully from Gitea.');
      return localPath;
    } catch (error) {
      console.error('❌ Failed to clone repository from Gitea:', error);
      return null;
    }
  }

  /**
   * Clone repository from GitHub to local temporary directory
   */
  static async cloneFromGitHub(githubUrl: string, repoName: string): Promise<string | null> {
    try {
      const localPath = path.join(this.TEMP_CLONE_DIR, `${repoName}-github-${Date.now()}`);
      
      // Ensure temp directory exists
      await fs.mkdir(path.dirname(localPath), { recursive: true });
      
      console.log(`Cloning from GitHub: ${githubUrl} to ${localPath}...`);
      await git.clone(githubUrl, localPath);
      
      console.log('✅ Repository cloned successfully from GitHub.');
      return localPath;
    } catch (error) {
      console.error('❌ Failed to clone repository from GitHub:', error);
      return null;
    }
  }

  /**
   * Analyze project using OpenAI
   */
  static async analyzeProjectWithAI(projectPath: string): Promise<ProjectAnalysis | null> {
    try {
      // Read project structure and key files
      const projectStructure = await this.getProjectStructure(projectPath);
      const packageJsonContent = await this.getPackageJsonContent(projectPath);
      
      const prompt = `
Analyze this project structure and provide build/run commands for Ubuntu Linux VM deployment:

Project Structure:
${projectStructure}

Package.json content:
${packageJsonContent}

Please analyze this project and provide a JSON response with the following structure:
{
  "projectType": "type (e.g., 'next.js', 'react', 'vue', 'angular', 'node.js', 'express', 'fullstack')",
  "framework": "specific framework or technology stack",
  "buildCommands": ["npm install"],
  "runCommands": ["npm run dev", "npm start"],
  "dependencies": ["key dependencies identified"],
  "ports": {
    "frontend": 8000,
    "backend": 9000
  }
}

IMPORTANT RULES FOR UBUNTU LINUX VM:
1. For Next.js projects, use projectType "next.js" (not fullstack) unless there are actual separate backend/frontend folders
2. buildCommands should typically just be ["npm install"] or ["npm ci"] for faster setup
3. runCommands should prioritize development servers: ["npm run dev"] for Next.js/React/Vue for faster startup
4. Do NOT include "call" prefix in commands - just the raw npm commands
5. Only use "fullstack" projectType if there are actual separate "frontend" and "backend" directories
6. For single-tier applications (Next.js, Create React App, etc.), use appropriate single type
7. Check package.json scripts to determine correct development commands
8. Commands will run on Ubuntu Linux VM with external access requirements

Consider:
- Package.json scripts and dependencies
- Actual directory structure (frontend/backend folders vs single app structure)
- Framework-specific development patterns
- Ubuntu Linux compatibility
- Development server commands for faster startup

Respond with only the JSON object, no additional text.
`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are an expert developer who analyzes project structures and generates build/run commands for Ubuntu Linux VM deployment. Prioritize development server commands for faster startup. Always respond with valid JSON only."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 1000
      });

      const responseContent = completion.choices[0]?.message?.content;
      if (!responseContent) {
        throw new Error('No response from OpenAI');
      }

      // Parse the JSON response
      const analysis: ProjectAnalysis = JSON.parse(responseContent);
      
      // Validate the response structure
      if (!analysis.projectType || !analysis.runCommands || !Array.isArray(analysis.runCommands)) {
        throw new Error('Invalid analysis response structure');
      }

      return analysis;
    } catch (error) {
      console.error('Error in AI project analysis:', error);
      return null;
    }
  }

  /**
   * Get project structure for AI analysis
   */
  private static async getProjectStructure(projectPath: string, maxDepth: number = 2, currentDepth: number = 0): Promise<string> {
    try {
      if (currentDepth > maxDepth) {
        return '';
      }

      const items = await fs.readdir(projectPath, { withFileTypes: true });
      let structure = '';

      for (const item of items) {
        // Skip common ignored directories and files
        if (item.name.startsWith('.') || 
            ['node_modules', 'dist', 'build', '.git', 'coverage'].includes(item.name)) {
          continue;
        }

        const indent = '  '.repeat(currentDepth);
        
        if (item.isDirectory()) {
          structure += `${indent}${item.name}/\n`;
          // Recursively get subdirectory structure
          const subPath = path.join(projectPath, item.name);
          structure += await this.getProjectStructure(subPath, maxDepth, currentDepth + 1);
        } else {
          structure += `${indent}${item.name}\n`;
        }
      }

      return structure;
    } catch (error) {
      console.error('Error reading project structure:', error);
      return 'Error reading project structure';
    }
  }

  /**
   * Get package.json content for AI analysis
   */
  private static async getPackageJsonContent(projectPath: string): Promise<string> {
    try {
      const packageJsonPath = path.join(projectPath, 'package.json');
      const content = await fs.readFile(packageJsonPath, 'utf-8');
      
      // Parse and return key sections only to reduce token usage
      const packageData = JSON.parse(content);
      const relevantData = {
        name: packageData.name,
        scripts: packageData.scripts,
        dependencies: packageData.dependencies,
        devDependencies: packageData.devDependencies
      };
      
      return JSON.stringify(relevantData, null, 2);
    } catch (error) {
      // Try to find package.json in subdirectories (frontend/backend)
      try {
        const frontendPackage = await fs.readFile(path.join(projectPath, 'frontend', 'package.json'), 'utf-8');
        const backendPackage = await fs.readFile(path.join(projectPath, 'backend', 'package.json'), 'utf-8');
        
        return `Frontend package.json:\n${frontendPackage}\n\nBackend package.json:\n${backendPackage}`;
      } catch {
        return 'No package.json found';
      }
    }
  }

  /**
   * Generate run script using AI analysis
   */
  static async generateRunScriptFromAI(
    projectPath: string, 
    analysis: ProjectAnalysis,
    availablePorts?: { frontendPort: number; backendPort: number }
  ): Promise<string | null> {
    try {
      console.log(`Generating AI-powered run script for ${analysis.projectType} project...`);
      
      let scriptContent = '';
      const resolvedPath = path.resolve(projectPath);

      // Use available ports if provided, otherwise fall back to AI suggested ports (but ensure 8000-9000 range)
      const frontendPort = availablePorts?.frontendPort || Math.max(8000, analysis.ports.frontend || 8000);
      const backendPort = availablePorts?.backendPort || Math.max(8001, analysis.ports.backend || 8001);

      // Check if the project actually has frontend/backend folders
      const hasBackendFolder = await this.directoryExists(path.join(projectPath, 'backend'));
      const hasFrontendFolder = await this.directoryExists(path.join(projectPath, 'frontend'));

      if ((analysis.projectType.toLowerCase().includes('fullstack') || 
           analysis.projectType.toLowerCase().includes('full-stack')) && 
          hasBackendFolder && hasFrontendFolder) {
        // Handle true fullstack projects with separate folders
        scriptContent = `
@echo off
ECHO Starting ${analysis.framework} fullstack project...

ECHO.
ECHO ########## STARTING BACKEND ##########
cd /d "${path.join(resolvedPath, 'backend')}"
ECHO Installing dependencies and running backend on port ${backendPort}...
SET PORT=${backendPort}
start "Backend" cmd /c "npm install && ${analysis.runCommands.find(cmd => cmd.includes('backend') || cmd.includes('server')) || 'npm start'}"

ECHO.
ECHO ########## STARTING FRONTEND ##########
cd /d "${path.join(resolvedPath, 'frontend')}"
ECHO Installing dependencies and running frontend on port ${frontendPort}...
SET PORT=${frontendPort}
start "Frontend" cmd /c "npm install && ${analysis.runCommands.find(cmd => cmd.includes('frontend') || cmd.includes('dev')) || 'npm run dev'}"

ECHO.
ECHO Both services are starting in separate windows...
ECHO Frontend will be available at: http://localhost:${frontendPort}
ECHO Backend will be available at: http://localhost:${backendPort}
        `.trim();
      } else {
        // Handle single-tier projects (Next.js, React, etc.) - use frontend port
        const port = frontendPort;
        
        // Clean up build commands to remove double 'call'
        const cleanBuildCommands = analysis.buildCommands
          .map(cmd => cmd.replace(/^call\s+call\s+/, '').replace(/^call\s+/, ''))
          .filter(cmd => cmd.trim() !== '');
        
        const cleanRunCommands = analysis.runCommands
          .map(cmd => cmd.replace(/^call\s+call\s+/, '').replace(/^call\s+/, ''))
          .filter(cmd => cmd.trim() !== '');

        // For Next.js, add port flag to dev command
        const finalRunCommands = cleanRunCommands.map(cmd => {
          if (cmd.includes('next dev') || cmd.includes('npm run dev')) {
            return `${cmd} -- --port ${port}`;
          }
          return cmd;
        });

        scriptContent = `
@echo off
cd /d "${resolvedPath}"
ECHO Starting ${analysis.framework} project...

ECHO.
ECHO ########## INSTALLING DEPENDENCIES ##########
${cleanBuildCommands.length > 0 ? cleanBuildCommands.map(cmd => `call ${cmd}`).join('\n') : 'call npm install'}

ECHO.
ECHO ########## STARTING APPLICATION ##########
SET PORT=${port}
ECHO Running application on port ${port}...
${finalRunCommands.length > 0 ? finalRunCommands.map(cmd => `call ${cmd}`).join('\n') : `call npm run dev -- --port ${port}`}

ECHO.
ECHO Application will be available at: http://localhost:${port}
        `.trim();
      }

      const scriptPath = path.resolve(process.cwd(), 'temp', `run-${Date.now()}.bat`);
      
      // Ensure temp directory exists
      await fs.mkdir(path.dirname(scriptPath), { recursive: true });
      
      await fs.writeFile(scriptPath, scriptContent);
      console.log(`✅ AI-generated run.bat created successfully at ${scriptPath}`);
      console.log(`🚀 Using ports: Frontend=${frontendPort}, Backend=${backendPort}`);
      return scriptPath;
    } catch (error) {
      console.error('❌ Failed to create AI-generated run.bat:', error);
      return null;
    }
  }

  /**
   * Fix common build issues in cloned projects
   */
  static async fixCommonBuildIssues(projectPath: string): Promise<void> {
    try {
      console.log('🔧 Fixing common build issues...');
      
      // Fix ESLint issues - unescaped entities
      await this.fixEslintUnescapedEntities(projectPath);
      
      console.log('✅ Common build issues fixed');
    } catch (error) {
      console.warn('⚠️ Could not fix some build issues:', error);
    }
  }

  /**
   * Fix unescaped entities in React components
   */
  private static async fixEslintUnescapedEntities(projectPath: string): Promise<void> {
    try {
      const files = await this.findTsxFiles(projectPath);
      
      for (const file of files) {
        let content = await fs.readFile(file, 'utf-8');
        let modified = false;

        // Fix common unescaped entities
        const fixes = [
          { from: /doesn't/g, to: "doesn&apos;t" },
          { from: /can't/g, to: "can&apos;t" },
          { from: /won't/g, to: "won&apos;t" },
          { from: /don't/g, to: "don&apos;t" },
          { from: /isn't/g, to: "isn&apos;t" },
          { from: /aren't/g, to: "aren&apos;t" },
          { from: /wasn't/g, to: "wasn&apos;t" },
          { from: /weren't/g, to: "weren&apos;t" },
          { from: /hasn't/g, to: "hasn&apos;t" },
          { from: /haven't/g, to: "haven&apos;t" },
          { from: /shouldn't/g, to: "shouldn&apos;t" },
          { from: /wouldn't/g, to: "wouldn&apos;t" },
          { from: /couldn't/g, to: "couldn&apos;t" },
        ];

        for (const fix of fixes) {
          if (fix.from.test(content)) {
            content = content.replace(fix.from, fix.to);
            modified = true;
          }
        }

        if (modified) {
          await fs.writeFile(file, content, 'utf-8');
          console.log(`🔧 Fixed unescaped entities in: ${path.relative(projectPath, file)}`);
        }
      }
    } catch (error) {
      console.warn('Could not fix ESLint unescaped entities:', error);
    }
  }

  /**
   * Find all TSX files in project
   */
  private static async findTsxFiles(dir: string): Promise<string[]> {
    const files: string[] = [];
    
    try {
      const items = await fs.readdir(dir, { withFileTypes: true });
      
      for (const item of items) {
        if (item.name.startsWith('.') || item.name === 'node_modules') {
          continue;
        }
        
        const fullPath = path.join(dir, item.name);
        
        if (item.isDirectory()) {
          const subFiles = await this.findTsxFiles(fullPath);
          files.push(...subFiles);
        } else if (item.name.endsWith('.tsx') || item.name.endsWith('.ts')) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Ignore errors for individual directories
    }
    
    return files;
  }
  private static async directoryExists(dirPath: string): Promise<boolean> {
    try {
      const stat = await fs.stat(dirPath);
      return stat.isDirectory();
    } catch {
      return false;
    }
  }
  static async identifyProjectType(projectPath: string): Promise<string> {
    try {
      const files = await fs.readdir(projectPath);
      if (files.includes('frontend') && files.includes('backend')) {
        console.log('💡 Project type: Frontend/Backend');
        return 'fullstack';
      } else if (files.includes('package.json')) {
        console.log('💡 Project type: Node.js');
        return 'nodejs';
      }
      console.log('💡 Project type: Unknown');
      return 'unknown';
    } catch (error) {
      console.error('❌ Could not identify project type:', error);
      return 'error';
    }
  }

  /**
   * Generate run script for the project
   */
  static async generateRunScript(
    projectPath: string, 
    ports: { frontendPort: number; backendPort: number }, 
    projectType: string
  ): Promise<string | null> {
    console.log(`Generating a robust, chained run script for a ${projectType} project...`);
    let scriptContent = '';

    const chainedCommands = `call npm install && call npm run dev -- --port=`;

    if (projectType === 'nodejs') {
      scriptContent = `
@echo off
cd /d "${path.resolve(projectPath)}"
ECHO Running Install and Dev Server...
SET PORT=${ports.frontendPort}
${chainedCommands}${ports.frontendPort}
      `.trim();
    } else if (projectType === 'fullstack') {
      const installAndStartBackend = `call npm install && call npm run build && call npm start -- --port=`;
      const installAndStartFrontend = `call npm install && call npm run dev -- --port=`;
      scriptContent = `
@echo off
ECHO Starting full-stack project...

ECHO.
ECHO ########## STARTING BACKEND ##########
cd /d "${path.resolve(projectPath, 'backend')}"
ECHO Running Install, Build, and Start for Backend...
SET PORT=${ports.backendPort}
start "Backend" cmd /c "${installAndStartBackend}${ports.backendPort}"

ECHO.
ECHO ########## STARTING FRONTEND ##########
cd /d "${path.resolve(projectPath, 'frontend')}"
ECHO Running Install and Dev Server for Frontend...
SET PORT=${ports.frontendPort}
start "Frontend" cmd /c "${installAndStartFrontend}${ports.frontendPort}"
      `.trim();
    }

    try {
      const scriptPath = path.resolve(process.cwd(), 'temp', `run-${Date.now()}.bat`);
      
      // Ensure temp directory exists
      await fs.mkdir(path.dirname(scriptPath), { recursive: true });
      
      await fs.writeFile(scriptPath, scriptContent);
      console.log(`✅ Robust run.bat created successfully at ${scriptPath}`);
      return scriptPath;
    } catch (error) {
      console.error('❌ Failed to create run.bat:', error);
      return null;
    }
  }

  /**
   * Execute the generated script
   */
  static async executeScript(scriptPath: string): Promise<boolean> {
    try {
      console.log(`Executing ${scriptPath}...`);
      
      // For Windows, use 'start' command to open in new window
      await execAsync(`start "" "${scriptPath}"`);
      
      console.log('🚀 Project starting up in a new window!');
      return true;
    } catch (error) {
      console.error(`❌ Execution error: ${error}`);
      return false;
    }
  }

  /**
   * Core execution method with AI analysis
   */
  private static async executeProjectWorkflowWithAI(localPath: string): Promise<ProjectRunResult> {
    try {
      // Step 1: Fix common build issues
      await this.fixCommonBuildIssues(localPath);

      // Step 2: Analyze project with AI
      const analysis = await this.analyzeProjectWithAI(localPath);
      if (!analysis) {
        return {
          success: false,
          error: 'Failed to analyze project with AI'
        };
      }

      // Step 3: Check ports (use AI suggested ports or find available ones)
      const portResult = await this.checkPortsAvailability();
      if (!portResult.isAvailable) {
        return {
          success: false,
          error: portResult.error || 'No available ports found'
        };
      }

      // Use found ports (in 8000-9000 range) instead of AI suggested ports
      const finalPorts = {
        frontendPort: portResult.frontendPort,
        backendPort: portResult.backendPort
      };

      // Update analysis with final ports
      analysis.ports = {
        frontend: finalPorts.frontendPort,
        backend: finalPorts.backendPort
      };

      // Step 4: Generate run script using AI analysis with available ports
      const scriptPath = await this.generateRunScriptFromAI(localPath, analysis, finalPorts);

      if (!scriptPath) {
        return {
          success: false,
          error: 'Failed to generate AI-powered run script'
        };
      }

      // Step 5: Execute script
      const executed = await this.executeScript(scriptPath);
      
      if (!executed) {
        return {
          success: false,
          error: 'Failed to execute AI-generated run script'
        };
      }

      return {
        success: true,
        scriptPath,
        localPath,
        ports: finalPorts,
        analysis
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred in AI workflow'
      };
    }
  }

  /**
   * Run project with AI analysis
   */
  static async runProjectWithAI(projectPath: string): Promise<ProjectRunResult> {
    return this.executeProjectWorkflowWithAI(projectPath);
  }

  /**
   * Run project from Gitea with AI analysis
   */
  static async runProjectFromGiteaWithAI(giteaCloneUrl: string, repoName: string): Promise<ProjectRunResult> {
    // Clone from Gitea to local temp directory
    const localPath = await this.cloneFromGitea(giteaCloneUrl, repoName);
    if (!localPath) {
      return {
        success: false,
        error: 'Failed to clone repository from Gitea'
      };
    }

    return this.executeProjectWorkflowWithAI(localPath);
  }

  /**
   * Identify project type based on directory structure (legacy method)
   */
  private static async executeProjectWorkflow(localPath: string): Promise<ProjectRunResult> {
    try {
      // Step 1: Check ports
      const portResult = await this.checkPortsAvailability();
      if (!portResult.isAvailable) {
        return {
          success: false,
          error: portResult.error || 'No available ports found'
        };
      }

      // Step 2: Identify project type
      const projectType = await this.identifyProjectType(localPath);
      if (projectType === 'error' || projectType === 'unknown') {
        return {
          success: false,
          error: 'Could not identify project type or unsupported project structure'
        };
      }

      // Step 3: Generate run script
      const scriptPath = await this.generateRunScript(
        localPath, 
        { frontendPort: portResult.frontendPort, backendPort: portResult.backendPort }, 
        projectType
      );

      if (!scriptPath) {
        return {
          success: false,
          error: 'Failed to generate run script'
        };
      }

      // Step 4: Execute script
      const executed = await this.executeScript(scriptPath);
      
      if (!executed) {
        return {
          success: false,
          error: 'Failed to execute run script'
        };
      }

      return {
        success: true,
        scriptPath,
        localPath,
        ports: {
          frontendPort: portResult.frontendPort,
          backendPort: portResult.backendPort
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Main function to run a project from any source (GitHub or Gitea)
   */
  static async runProjectFromSource(sourceUrl: string, repoName: string, sourceType: 'github' | 'gitea' = 'github'): Promise<ProjectRunResult> {
    // Clone from the specified source to local temp directory
    const localPath = sourceType === 'github' 
      ? await this.cloneFromGitHub(sourceUrl, repoName)
      : await this.cloneFromGitea(sourceUrl, repoName);
      
    if (!localPath) {
      return {
        success: false,
        error: `Failed to clone repository from ${sourceType === 'github' ? 'GitHub' : 'Gitea'}`
      };
    }

    return this.executeProjectWorkflow(localPath);
  }

  /**
   * Main function to run a project from Gitea
   */
  static async runProjectFromGitea(giteaCloneUrl: string, repoName: string): Promise<ProjectRunResult> {
    // Clone from Gitea to local temp directory
    const localPath = await this.cloneFromGitea(giteaCloneUrl, repoName);
    if (!localPath) {
      return {
        success: false,
        error: 'Failed to clone repository from Gitea'
      };
    }

    return this.executeProjectWorkflow(localPath);
  }

  /**
   * Main function to run a project (legacy - for backward compatibility)
   */
  static async runProject(projectPath: string): Promise<ProjectRunResult> {
    return this.executeProjectWorkflow(projectPath);
  }

  /**
   * Open project in VS Code
   */
  static async openProjectInVSCode(cloneUrl: string, repoName: string, sourceType: 'github' | 'gitea' = 'gitea'): Promise<ProjectRunResult> {
    try {
      // Step 1: Clone from the specified source to local temp directory
      const localPath = sourceType === 'github' 
        ? await this.cloneFromGitHub(cloneUrl, repoName)
        : await this.cloneFromGitea(cloneUrl, repoName);
        
      if (!localPath) {
        return {
          success: false,
          error: `Failed to clone repository from ${sourceType === 'github' ? 'GitHub' : 'Gitea'}`
        };
      }

      console.log(`Opening project in VS Code: ${localPath}`);
      
      // Step 2: Open in VS Code
      try {
        await execAsync(`code "${localPath}"`);
        console.log('✅ Project opened in VS Code successfully!');
        
        return {
          success: true,
          localPath: localPath
        };
      } catch (error) {
        console.warn('VS Code command failed, trying alternative methods...');
        
        // Fallback: Try to open the folder with default system handler
        try {
          // For Windows
          await execAsync(`explorer "${localPath}"`);
          console.log('✅ Project folder opened with system explorer!');
          
          return {
            success: true,
            localPath: localPath
          };
        } catch (explorerError) {
          console.error('Failed to open with explorer:', explorerError);
          throw new Error('Could not open project. Please ensure VS Code is installed and in your PATH, or open the folder manually: ' + localPath);
        }
      }
    } catch (error) {
      console.error('❌ Error opening project:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred while opening project'
      };
    }
  }
}
