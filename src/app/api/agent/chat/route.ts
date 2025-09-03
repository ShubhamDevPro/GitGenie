import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { geminiService, ChatMessage, ProjectContext } from '@/lib/geminiService';
import { openAIAgentService, OpenAIAgentService } from '@/lib/openAIAgentService';
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

    // Detect user intent: explanation vs code modification
    const intent = OpenAIAgentService.detectIntent(message);
    console.log('🧠 Detected intent:', intent, 'for message:', message.substring(0, 50));

    // Get project context from VM (needed for both paths)
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

    // Route based on intent
    if (intent === 'code_change') {
      // Use OpenAI Agent for code modifications
      try {
        console.log('🤖 Routing to OpenAI Agent for code modification');
        
        const sessionId = OpenAIAgentService.generateSessionId(
          session.user.id!, 
          repositoryId
        );
        
        const agentResponse = await openAIAgentService.sendCodeModificationRequest(
          projectContext.projectPath,
          sessionId,
          message
        );

        if (agentResponse.success && agentResponse.response) {
          return NextResponse.json({
            success: true,
            response: agentResponse.response,
            intent: 'code_change',
            agentType: 'openai',
            sessionId: agentResponse.session_id,
            shouldRestartProject: true, // Flag to indicate project should be restarted
            projectInfo: {
              name: projectContext.projectName,
              path: projectContext.projectPath,
              filesCount: projectContext.files.length,
              hasPackageJson: !!projectContext.packageJson,
              hasReadme: !!projectContext.readme
            }
          });
        } else {
          // Handle agent failure
          const errorMessage = agentResponse.error || 'OpenAI Agent failed to process request';
          return NextResponse.json({
            error: `Code modification failed: ${errorMessage}`,
            sessionId: agentResponse.session_id,
            fallbackToGemini: true
          }, { status: 500 });
        }
      } catch (error) {
        console.error('Error with OpenAI Agent:', error);
        return NextResponse.json({
          error: 'Failed to process code modification request',
          details: error instanceof Error ? error.message : 'Unknown error',
          fallbackToGemini: true
        }, { status: 500 });
      }
    } else {
      // Use Gemini for explanations
      console.log('💎 Routing to Gemini for explanation');

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
        console.log('Generating Gemini response for repository:', repositoryId);
        console.log('Project context loaded:', {
          name: projectContext.projectName,
          filesCount: projectContext.files.length
        });
        
        const aiResponse = await geminiService.generateResponse(messages, projectContext);
        
        console.log('Gemini response generated successfully');
        
        return NextResponse.json({
          success: true,
          response: aiResponse,
          intent: 'explanation',
          agentType: 'gemini',
          projectInfo: {
            name: projectContext.projectName,
            path: projectContext.projectPath,
            filesCount: projectContext.files.length,
            hasPackageJson: !!projectContext.packageJson,
            hasReadme: !!projectContext.readme
          }
        });
      } catch (error) {
        console.error('Error generating Gemini response:', error);
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
