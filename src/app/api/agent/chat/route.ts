import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { geminiService, ChatMessage, ProjectContext } from '@/lib/geminiService';
import { openaiAgentService, OpenAIAgentService } from '@/lib/openaiAgentService';
import { userService } from '@/lib/userService';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { repositoryId, message, conversationHistory = [] } = body;

    if (!repositoryId || !message) {
      return NextResponse.json({ 
        error: 'Repository ID and message are required' 
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

    // Get gitea username for project path
    let giteaUsername: string;
    try {
      const giteaIntegration = await userService.ensureGiteaIntegration(session.user.id!);
      giteaUsername = giteaIntegration.giteaUser?.login;
      
      if (!giteaUsername) {
        return NextResponse.json({
          error: 'Unable to determine user project folder'
        }, { status: 400 });
      }
    } catch (error) {
      return NextResponse.json({
        error: 'Failed to get user Gitea integration'
      }, { status: 500 });
    }

    const projectName = repository.giteaRepoName || repository.repoName;

    // Get project context from VM
    let projectContext: ProjectContext;
    try {
      projectContext = await geminiService.getProjectContext(giteaUsername, projectName);
    } catch (error) {
      console.error('Error getting project context:', error);
      return NextResponse.json({
        error: 'Failed to access project files on VM',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }

    // Check if user is requesting code modifications
    const isCodeModification = OpenAIAgentService.isCodeModificationRequest(message);
    
    if (isCodeModification) {
      console.log('🤖 Code modification detected, using OpenAI Agent');
      
      // Use OpenAI Agent for code modifications
      try {
        const modificationResult = await openaiAgentService.modifyProjectCode({
          instruction: message,
          projectPath: projectContext.projectPath,
          giteaUsername
        });

        if (modificationResult.success) {
          // Return success response with modification details
          return NextResponse.json({
            success: true,
            response: `✅ **Code modifications completed!**\n\n${modificationResult.changes}\n\n📝 **Files modified:** ${modificationResult.filesModified.length}\n${modificationResult.filesModified.map(f => `• ${f.split('/').pop()}`).join('\n')}\n\n🔄 The project will be automatically restarted to apply your changes.`,
            projectInfo: {
              name: projectContext.projectName,
              path: projectContext.projectPath,
              filesCount: projectContext.files.length,
              hasPackageJson: !!projectContext.packageJson,
              hasReadme: !!projectContext.readme
            },
            isCodeModification: true,
            modificationResult
          });
        } else {
          // Return error response
          return NextResponse.json({
            success: false,
            response: `❌ **Failed to apply code modifications**\n\nError: ${modificationResult.error}\n\nPlease try rephrasing your request or be more specific about what you'd like to change.`,
            projectInfo: {
              name: projectContext.projectName,
              path: projectContext.projectPath,
              filesCount: projectContext.files.length,
              hasPackageJson: !!projectContext.packageJson,
              hasReadme: !!projectContext.readme
            },
            isCodeModification: true,
            error: modificationResult.error
          });
        }
      } catch (error) {
        console.error('Error in OpenAI Agent code modification:', error);
        return NextResponse.json({
          success: false,
          response: `❌ **OpenAI Agent Error**\n\nFailed to process code modification request: ${error instanceof Error ? error.message : 'Unknown error'}\n\nFalling back to chat response...`,
          error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
      }
    }

    // Continue with regular Gemini chat for non-code-modification requests
    console.log('💬 Regular chat detected, using Gemini');

    // Prepare conversation messages
    const messages: ChatMessage[] = [
      ...conversationHistory.map((msg: any) => ({
        role: msg.sender === 'user' ? 'user' as const : 'assistant' as const,
        content: msg.text,
        timestamp: new Date(msg.timestamp)
      })),
      {
        role: 'user' as const,
        content: message,
        timestamp: new Date()
      }
    ];

    // Generate AI response
    try {
      console.log('Generating AI response for repository:', repositoryId);
      console.log('Project context loaded:', {
        name: projectContext.projectName,
        filesCount: projectContext.files.length
      });
      
      const aiResponse = await geminiService.generateResponse(messages, projectContext);
      
      console.log('AI response generated successfully');
      
      return NextResponse.json({
        success: true,
        response: aiResponse,
        projectInfo: {
          name: projectContext.projectName,
          path: projectContext.projectPath,
          filesCount: projectContext.files.length,
          hasPackageJson: !!projectContext.packageJson,
          hasReadme: !!projectContext.readme
        }
      });
    } catch (error) {
      console.error('Error generating AI response:', error);
      return NextResponse.json({
        error: 'Failed to generate AI response',
        details: error instanceof Error ? error.message : 'Unknown error',
        debugInfo: {
          projectName: projectContext.projectName,
          filesCount: projectContext.files.length,
          hasContext: true
        }
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error in chat API:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET: Get project context (for debugging or initial load)
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const repositoryId = searchParams.get('repositoryId');

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

    // Get gitea username
    let giteaUsername: string;
    try {
      const giteaIntegration = await userService.ensureGiteaIntegration(session.user.id!);
      giteaUsername = giteaIntegration.giteaUser?.login;
      
      if (!giteaUsername) {
        return NextResponse.json({
          error: 'Unable to determine user project folder'
        }, { status: 400 });
      }
    } catch (error) {
      return NextResponse.json({
        error: 'Failed to get user Gitea integration'
      }, { status: 500 });
    }

    const projectName = repository.giteaRepoName || repository.repoName;

    // Get project context
    try {
      const projectContext = await geminiService.getProjectContext(giteaUsername, projectName);
      
      return NextResponse.json({
        success: true,
        projectContext: {
          name: projectContext.projectName,
          path: projectContext.projectPath,
          filesCount: projectContext.files.length,
          files: projectContext.files.map(f => ({ name: f.name, path: f.path, isDirectory: f.isDirectory })),
          hasPackageJson: !!projectContext.packageJson,
          hasReadme: !!projectContext.readme,
          mainFiles: projectContext.mainFiles.map(f => ({ name: f.name, language: f.language }))
        }
      });
    } catch (error) {
      console.error('Error getting project context:', error);
      return NextResponse.json({
        error: 'Failed to access project files on VM',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error in chat context API:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
