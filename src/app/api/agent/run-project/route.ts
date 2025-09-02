import { NextRequest, NextResponse } from 'next/server';
import { AgentService, ProjectRunResult } from '@/lib/agentService';
import { GCPVmService } from '@/lib/gcpVmService';
import { VMProjectResult } from '@/types/gcp';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

// GET: Check port availability (legacy support)
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const portResult = await AgentService.checkPortsAvailability();
    
    return NextResponse.json({
      success: portResult.isAvailable,
      ports: portResult.isAvailable ? {
        frontend: portResult.frontendPort,
        backend: portResult.backendPort
      } : null,
      error: portResult.error
    });
  } catch (error) {
    console.error('Error checking port availability:', error);
    return NextResponse.json({ 
      error: 'Failed to check port availability' 
    }, { status: 500 });
  }
}

// POST: Run project with AI analysis or legacy mode
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { projectPath, repositoryId, useAIAnalysis = false, useGCPVM = false } = body;

    let result: ProjectRunResult | VMProjectResult;

    if (repositoryId) {
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

      if (!repository.giteaCloneUrl) {
        return NextResponse.json({ 
          error: 'Repository clone URL not available' 
        }, { status: 400 });
      }

      // Get gitea username for better project organization on VM
      let giteaUsername: string | undefined;
      try {
        const { userService } = await import('@/lib/userService');
        const giteaIntegration = await userService.ensureGiteaIntegration(session.user.id!);
        giteaUsername = giteaIntegration.giteaUser?.login;
      } catch (error) {
        console.warn('Could not get gitea username:', error);
        // Continue without gitea username - will use fallback structure
      }

      // Run project on GCP VM or locally
      if (useGCPVM) {
        // Create a callback for real-time logging
        const logMessages: string[] = [];
        const logCallback = (message: string) => {
          logMessages.push(message);
          console.log(`[GCP VM] ${message}`);
        };

        const gcpVmService = new GCPVmService(logCallback);
        
        // For GCP VM, we need the local path to the cloned project
        // First clone the project locally to upload to VM
        const localClonePath = await AgentService.cloneFromGitea(
          repository.giteaCloneUrl,
          repository.giteaRepoName || repository.repoName
        );
        
        if (!localClonePath) {
          return NextResponse.json({ 
            error: 'Failed to clone repository locally for VM upload' 
          }, { status: 500 });
        }
        
        result = await gcpVmService.runProjectOnVM(
          repositoryId,
          repository.giteaRepoName || repository.repoName,
          localClonePath,
          giteaUsername
        );
        
        // Add logs to the result
        (result as VMProjectResult).logs = logMessages.join('\n');
      } else if (useAIAnalysis) {
        result = await AgentService.runProjectFromGiteaWithAI(
          repository.giteaCloneUrl,
          repository.giteaRepoName || repository.repoName
        );
      } else {
        result = await AgentService.runProjectFromGitea(
          repository.giteaCloneUrl,
          repository.giteaRepoName || repository.repoName
        );
      }
    } else if (projectPath) {
      // Legacy support for direct project paths
      if (useGCPVM) {
        return NextResponse.json({ 
          error: 'GCP VM execution requires repositoryId' 
        }, { status: 400 });
      } else if (useAIAnalysis) {
        result = await AgentService.runProjectWithAI(projectPath);
      } else {
        result = await AgentService.runProject(projectPath);
      }
    } else {
      return NextResponse.json({ 
        error: 'Either projectPath or repositoryId is required' 
      }, { status: 400 });
    }
    
    if (result.success) {
      // Handle different result types with proper type guards
      const isVMResult = (result: ProjectRunResult | VMProjectResult): result is VMProjectResult => {
        return 'vmIP' in result;
      };
      
      const vmResult = isVMResult(result) ? result : null;
      const agentResult = !isVMResult(result) ? result : null;
      
      const ports = vmResult 
        ? vmResult.ports || (vmResult.port ? { frontend: vmResult.port } : undefined)
        : agentResult?.ports ? { frontend: agentResult.ports.frontendPort, backend: agentResult.ports.backendPort } : undefined;

      return NextResponse.json({
        success: true,
        message: useGCPVM ? 'Project started on GCP VM successfully' : 'Project started successfully',
        ports,
        port: vmResult?.port,
        scriptPath: result.scriptPath,
        localPath: result.localPath,
        vmIP: vmResult?.vmIP,
        analysis: result.analysis
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 400 });
    }
  } catch (error) {
    console.error('Error running project:', error);
    return NextResponse.json({ 
      error: 'Failed to run project' 
    }, { status: 500 });
  }
}
