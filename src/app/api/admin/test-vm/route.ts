import { NextRequest, NextResponse } from 'next/server';
import { GCPVmService } from '@/lib/gcpVmService';
import { auth } from '@/auth';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const gcpVmService = new GCPVmService();
    
    // Test VM connection and port availability
    const testResult = await gcpVmService.testVMConnection();
    
    return NextResponse.json({
      success: testResult.success,
      message: testResult.success ? 'VM connection successful' : 'VM connection failed',
      error: testResult.error,
      availablePort: testResult.port
    });
  } catch (error) {
    console.error('Error testing VM connection:', error);
    return NextResponse.json({ 
      error: 'Failed to test VM connection' 
    }, { status: 500 });
  }
}
