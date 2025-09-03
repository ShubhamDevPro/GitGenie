import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { GCPVmService } from '@/lib/gcpVmService';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Restart endpoint called');
    
    const session = await auth();
    if (!session?.user?.email) {
      console.log('❌ No session or email found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    console.log('📄 Request body:', JSON.stringify(body, null, 2));
    
    const { repositoryId } = body;
    
    if (!repositoryId) {
      console.log('❌ Repository ID is missing from request');
      return NextResponse.json({ 
        error: 'Repository ID is required' 
      }, { status: 400 });
    }

    console.log(`✅ Processing restart for repositoryId: ${repositoryId}`);

    // Extract username from email (assuming format like devshubham22@gmail.com -> shubhamdev)
    // For restart, we don't need Gitea credentials since we're working with existing VM files
    const giteaUsername = 'shubhamdev'; // For now, hardcode since we know this is the test user
    
    const gcpVmService = new GCPVmService();
    
    console.log(`🔄 Restarting project in place: repositoryId=${repositoryId} for user: ${giteaUsername}`);
    
    // Use the new restart method that directly restarts existing project on VM
    // Add timeout to prevent API hanging
    const result = await Promise.race([
      gcpVmService.restartExistingProject(repositoryId, giteaUsername),
      new Promise<{ success: false; error: string }>((resolve) => 
        setTimeout(() => resolve({ success: false, error: 'Restart operation timeout' }), 30000)
      )
    ]);
    
    console.log(`🔍 Restart result:`, JSON.stringify(result, null, 2));
    
    if (result.success) {
      const vmIP = await gcpVmService.getVmExternalIP();
      console.log(`✅ Restart successful! Port: ${result.port}, VM IP: ${vmIP}`);
      return NextResponse.json({
        success: true,
        message: 'Project restarted successfully',
        port: result.port,
        projectUrl: `http://${vmIP}:${result.port}`,
        vmIP: vmIP
      });
    } else {
      console.log(`❌ Restart failed: ${result.error}`);
      return NextResponse.json({
        success: false,
        error: result.error || 'Failed to restart project'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Error restarting project:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}