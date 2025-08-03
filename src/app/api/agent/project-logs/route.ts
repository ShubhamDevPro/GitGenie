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
      }
    });

    if (!repository) {
      return NextResponse.json({ 
        error: 'Repository not found or access denied' 
      }, { status: 404 });
    }

    const gcpVmService = new GCPVmService();
    const logs = await gcpVmService.getProjectLogs(
      repository.giteaRepoName || repository.repoName
    );

    return NextResponse.json({
      success: true,
      repositoryId,
      repositoryName: repository.giteaRepoName || repository.repoName,
      logs
    });

  } catch (error) {
    console.error('Error getting project logs:', error);
    return NextResponse.json({ 
      error: 'Failed to get project logs' 
    }, { status: 500 });
  }
}
