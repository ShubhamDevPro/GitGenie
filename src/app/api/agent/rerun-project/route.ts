import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { AgentService } from '@/lib/agentService';
import { GCPVmService } from '@/lib/gcpVmService';
import { userService } from '@/lib/userService';
import path from 'path';
import fs from 'fs/promises';

interface RerunProjectResult {
  success: boolean;
  message?: string;
  error?: string;
  ports?: { frontendPort: number; backendPort: number };
  port?: number;
  scriptPath?: string;
  localPath?: string;
  vmIP?: string;
  analysis?: any;
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { repositoryId, useGCPVM = false } = body;

    if (!repositoryId) {
      return NextResponse.json({ 
        error: 'Repository ID is required' 
      }, { status: 400 });
    }

    // Find the repository in the database
    const repository = await prisma.project.findFirst({
      where: {
        id: repositoryId,
        userId: session.user.id
      },
      include: {
        user: true
      }
    });

    if (!repository) {
      return NextResponse.json({ 
        error: 'Repository not found or access denied' 
      }, { status: 404 });
    }

    let result: RerunProjectResult;

    if (useGCPVM) {
      // For GCP VM rerun, we need the gitea username to construct the VM path
      let giteaUsername: string;
      try {
        const giteaIntegration = await userService.ensureGiteaIntegration(session.user.id);
        giteaUsername = giteaIntegration.giteaUser.login;
      } catch (error) {
        console.error('Error getting gitea integration:', error);
        return NextResponse.json({ 
          error: 'Unable to determine gitea username for VM path construction' 
        }, { status: 500 });
      }

      // Use the existing GCP VM rerun functionality
      const gcpVmService = new GCPVmService();
      const vmResult = await gcpVmService.rerunExistingProject(
        repositoryId,
        repository.giteaRepoName || repository.repoName,
        giteaUsername
      );

      if (vmResult.success) {
        result = {
          success: true,
          message: 'Project re-run completed successfully on GCP VM',
          port: vmResult.port,
          vmIP: vmResult.vmIP,
        };
      } else {
        result = {
          success: false,
          error: vmResult.error || 'Failed to re-run project on GCP VM'
        };
      }
    } else {
      // For local rerun, find the existing project path from previous runs
      const existingProjectPath = await findExistingProjectPath(
        repository.giteaRepoName || repository.repoName
      );

      if (!existingProjectPath) {
        return NextResponse.json({ 
          error: 'No existing project found. Please run "Launch Project with AI" first to create the project.' 
        }, { status: 404 });
      }

      console.log(`🔄 Re-running project from existing path: ${existingProjectPath}`);

      // Use the existing project workflow but without cloning
      result = await rerunProjectFromExistingPath(existingProjectPath);
    }

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        ports: result.ports,
        port: result.port,
        scriptPath: result.scriptPath,
        localPath: result.localPath,
        vmIP: result.vmIP,
        analysis: result.analysis
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 400 });
    }
  } catch (error) {
    console.error('Error re-running project:', error);
    return NextResponse.json({ 
      error: 'Failed to re-run project' 
    }, { status: 500 });
  }
}

/**
 * Find existing project path from previous runs
 * Looks for the most recent project directory in temp/cloned-repos
 */
async function findExistingProjectPath(repoName: string): Promise<string | null> {
  try {
    const tempDir = path.join(process.cwd(), 'temp', 'cloned-repos');
    
    // Check if temp directory exists
    try {
      await fs.access(tempDir);
    } catch {
      console.log('Temp directory does not exist');
      return null;
    }

    // Read all directories in temp/cloned-repos
    const entries = await fs.readdir(tempDir, { withFileTypes: true });
    
    // Filter for directories that match the repo name pattern
    const matchingDirs = entries
      .filter(entry => 
        entry.isDirectory() && 
        entry.name.includes(repoName) && 
        (entry.name.includes('-gitea-') || entry.name.includes('-github-'))
      )
      .map(entry => ({
        name: entry.name,
        path: path.join(tempDir, entry.name)
      }));

    if (matchingDirs.length === 0) {
      console.log(`No existing project directories found for ${repoName}`);
      return null;
    }

    // Get timestamps from directory names and sort by most recent
    const sortedDirs = matchingDirs
      .map(dir => {
        // Extract timestamp from directory name (e.g., "repo-name-gitea-1234567890")
        const timestampMatch = dir.name.match(/-(\d+)$/);
        const timestamp = timestampMatch ? parseInt(timestampMatch[1]) : 0;
        return { ...dir, timestamp };
      })
      .sort((a, b) => b.timestamp - a.timestamp);

    const mostRecentPath = sortedDirs[0].path;
    
    // Verify the directory still exists and contains project files
    try {
      await fs.access(mostRecentPath);
      const files = await fs.readdir(mostRecentPath);
      
      // Check if it looks like a valid project directory
      const hasProjectFiles = files.some(file => 
        file === 'package.json' || 
        file === 'requirements.txt' || 
        file === 'src' || 
        file === 'app.py' || 
        file === 'main.py'
      );

      if (hasProjectFiles) {
        console.log(`✅ Found existing project at: ${mostRecentPath}`);
        return mostRecentPath;
      } else {
        console.log(`Directory exists but doesn't contain valid project files: ${mostRecentPath}`);
        return null;
      }
    } catch {
      console.log(`Directory no longer exists: ${mostRecentPath}`);
      return null;
    }
  } catch (error) {
    console.error('Error finding existing project path:', error);
    return null;
  }
}

/**
 * Re-run project using existing project path (without cloning)
 * This reuses the modified project files and applies new AI analysis
 */
async function rerunProjectFromExistingPath(projectPath: string): Promise<RerunProjectResult> {
  try {
    console.log(`🔄 Re-running project workflow for: ${projectPath}`);

    // Step 1: Fix common build issues (in case new issues appeared)
    await AgentService.fixCommonBuildIssues(projectPath);

    // Step 2: Analyze project with AI (re-analyze to catch any changes)
    const analysis = await AgentService.analyzeProjectWithAI(projectPath);
    if (!analysis) {
      return {
        success: false,
        error: 'Failed to analyze project with AI'
      };
    }

    console.log(`🤖 AI Analysis completed for project type: ${analysis.projectType}`);

    // Step 3: Check ports (find new available ports)
    const portResult = await AgentService.checkPortsAvailability();
    if (!portResult.isAvailable) {
      return {
        success: false,
        error: portResult.error || 'No available ports found'
      };
    }

    const finalPorts = {
      frontendPort: portResult.frontendPort,
      backendPort: portResult.backendPort
    };

    // Update analysis with final ports
    analysis.ports = {
      frontend: finalPorts.frontendPort,
      backend: finalPorts.backendPort
    };

    console.log(`🚀 Using ports: Frontend=${finalPorts.frontendPort}, Backend=${finalPorts.backendPort}`);

    // Step 4: Generate run script using AI analysis with available ports
    const scriptPath = await AgentService.generateRunScriptFromAI(projectPath, analysis, finalPorts);

    if (!scriptPath) {
      return {
        success: false,
        error: 'Failed to generate AI-powered run script'
      };
    }

    console.log(`📜 Generated run script: ${scriptPath}`);

    // Step 5: Execute script
    const executed = await AgentService.executeScript(scriptPath);
    
    if (!executed) {
      return {
        success: false,
        error: 'Failed to execute run script'
      };
    }

    console.log(`✅ Project re-run completed successfully`);

    return {
      success: true,
      message: 'Project re-run completed successfully',
      scriptPath,
      localPath: projectPath,
      ports: finalPorts,
      analysis
    };
  } catch (error) {
    console.error('Error in rerun workflow:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred in rerun workflow'
    };
  }
}
