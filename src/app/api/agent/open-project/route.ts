import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { AgentService } from '@/lib/agentService';

// POST: Open project in VS Code
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { repositoryId, repositoryName, githubUrl } = body;

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

    const cloneUrl = repository.githubUrl || githubUrl;
    if (!cloneUrl) {
      return NextResponse.json({ 
        error: 'Repository GitHub URL not available' 
      }, { status: 400 });
    }

    // Open project in VS Code using GitHub URL
    const result = await AgentService.openProjectInVSCode(
      cloneUrl,
      repositoryName || repository.repoName,
      'github' // Specify source type
    );
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Project opened in VS Code successfully',
        localPath: result.localPath
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 400 });
    }
  } catch (error) {
    console.error('Error opening project:', error);
    return NextResponse.json({ 
      error: 'Failed to open project' 
    }, { status: 500 });
  }
}
