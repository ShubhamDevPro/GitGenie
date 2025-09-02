import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { GCPVmService } from '@/lib/gcpVmService';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { repositoryId } = body;

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

    // Get gitea username for proper project path resolution
    let giteaUsername: string | undefined;
    try {
      const { userService } = await import('@/lib/userService');
      const giteaIntegration = await userService.ensureGiteaIntegration(session.user.id!);
      giteaUsername = giteaIntegration.giteaUser?.login;
    } catch (error) {
      console.warn('Could not get gitea username:', error);
      // Continue without gitea username - will use fallback structure
    }

    const gcpVmService = new GCPVmService();
    const status = await gcpVmService.checkProjectStatus(
      repository.giteaRepoName || repository.repoName,
      giteaUsername
    );

    // Add VM IP to the response for proxy usage
    const vmIP = await gcpVmService.getVmExternalIP();

    return NextResponse.json({
      success: true,
      repositoryId,
      repositoryName: repository.giteaRepoName || repository.repoName,
      vmIP: status.isRunning ? vmIP : undefined, // Only include VM IP if project is running
      ...status
    });

  } catch (error) {
    console.error('Error checking project status:', error);
    return NextResponse.json({
      error: 'Failed to check project status'
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { repositoryId } = body;

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

    // Get gitea username for proper project path resolution
    let giteaUsername: string | undefined;
    try {
      const { userService } = await import('@/lib/userService');
      const giteaIntegration = await userService.ensureGiteaIntegration(session.user.id!);
      giteaUsername = giteaIntegration.giteaUser?.login;
    } catch (error) {
      console.warn('Could not get gitea username:', error);
      // Continue without gitea username - will use fallback structure
    }

    const gcpVmService = new GCPVmService();
    const stopped = await gcpVmService.stopProject(
      repository.giteaRepoName || repository.repoName,
      giteaUsername
    );

    return NextResponse.json({
      success: stopped,
      repositoryId,
      repositoryName: repository.giteaRepoName || repository.repoName,
      message: stopped ? 'Project stopped successfully' : 'Failed to stop project'
    });

  } catch (error) {
    console.error('Error stopping project:', error);
    return NextResponse.json({
      error: 'Failed to stop project'
    }, { status: 500 });
  }
}
