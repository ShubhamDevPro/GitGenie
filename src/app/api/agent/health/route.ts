import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check environment variables
    const envChecks = {
      GEMINI_API_KEY: !!process.env.GEMINI_API_KEY,
      GCP_VM_EXTERNAL_IP: !!process.env.GCP_VM_EXTERNAL_IP,
      GCP_VM_USERNAME: !!process.env.GCP_VM_USERNAME,
      GCP_VM_SSH_KEY_PATH: !!process.env.GCP_VM_SSH_KEY_PATH,
    };

    const allEnvSet = Object.values(envChecks).every(Boolean);

    return NextResponse.json({
      success: true,
      environmentCheck: envChecks,
      allEnvironmentVariablesSet: allEnvSet,
      message: allEnvSet 
        ? 'All environment variables are configured correctly'
        : 'Some environment variables are missing'
    });

  } catch (error) {
    console.error('Error in health check:', error);
    return NextResponse.json({
      error: 'Health check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
