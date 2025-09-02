import { NextRequest, NextResponse } from 'next/server';
import { GCPVmService } from '@/lib/gcpVmService';
import { auth } from '@/auth';
import { userService } from '@/lib/userService';

/**
 * API endpoint for AI agents to get information about user projects on the VM
 * This helps AI agents understand the project structure and provide better assistance
 */

// GET: Get project information for the current user or all users (admin only)
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const scope = searchParams.get('scope') || 'user'; // 'user' or 'all'
    const format = searchParams.get('format') || 'detailed'; // 'detailed' or 'summary'

    const gcpVmService = new GCPVmService();

    if (scope === 'all') {
      // For now, let's allow this for all users, but in production you might want to restrict to admins
      // TODO: Add admin check if needed
      const allProjects = await gcpVmService.listAllProjects();
      
      if (format === 'summary') {
        const summary = {
          totalUsers: allProjects.length,
          totalProjects: allProjects.reduce((sum, user) => sum + user.projects.length, 0),
          runningProjects: allProjects.reduce((sum, user) => sum + user.projects.filter(p => p.isRunning).length, 0),
          users: allProjects.map(user => ({
            username: user.username,
            projectCount: user.projects.length,
            runningCount: user.projects.filter(p => p.isRunning).length
          }))
        };
        
        return NextResponse.json({
          success: true,
          scope: 'all',
          format: 'summary',
          data: summary
        });
      }

      return NextResponse.json({
        success: true,
        scope: 'all',
        format: 'detailed',
        data: allProjects
      });
    } else {
      // Get projects for current user only
      try {
        const giteaIntegration = await userService.ensureGiteaIntegration(session.user.id!);
        const giteaUsername = giteaIntegration.giteaUser?.login;

        if (!giteaUsername) {
          return NextResponse.json({
            success: true,
            scope: 'user',
            format,
            data: {
              username: null,
              userPath: null,
              projects: [],
              message: 'User has no Gitea integration'
            }
          });
        }

        const userProjects = await gcpVmService.listUserProjects(giteaUsername);
        
        if (format === 'summary') {
          const summary = {
            username: userProjects.username,
            projectCount: userProjects.projects.length,
            runningCount: userProjects.projects.filter(p => p.isRunning).length,
            userPath: userProjects.userPath
          };
          
          return NextResponse.json({
            success: true,
            scope: 'user',
            format: 'summary',
            data: summary
          });
        }

        return NextResponse.json({
          success: true,
          scope: 'user',
          format: 'detailed',
          data: userProjects
        });

      } catch (error) {
        return NextResponse.json({
          success: false,
          error: 'Failed to get user Gitea integration',
          details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
      }
    }

  } catch (error) {
    console.error('Error getting projects info:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get projects information',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST: Get project information for a specific user (by gitea username)
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { giteaUsername, format = 'detailed' } = body;

    if (!giteaUsername) {
      return NextResponse.json({
        error: 'giteaUsername is required'
      }, { status: 400 });
    }

    const gcpVmService = new GCPVmService();
    const userProjects = await gcpVmService.listUserProjects(giteaUsername);
    
    if (format === 'summary') {
      const summary = {
        username: userProjects.username,
        projectCount: userProjects.projects.length,
        runningCount: userProjects.projects.filter(p => p.isRunning).length,
        userPath: userProjects.userPath
      };
      
      return NextResponse.json({
        success: true,
        format: 'summary',
        data: summary
      });
    }

    return NextResponse.json({
      success: true,
      format: 'detailed',
      data: userProjects
    });

  } catch (error) {
    console.error('Error getting specific user projects:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get user projects',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
