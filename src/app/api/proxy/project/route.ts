import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

export async function GET(request: NextRequest) {
     try {
          const session = await auth();
          if (!session) {
               return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
          }

          const { searchParams } = new URL(request.url);
          const repositoryId = searchParams.get('repositoryId');
          const port = searchParams.get('port') || '3000';

          if (!repositoryId) {
               return NextResponse.json({ error: 'Repository ID is required' }, { status: 400 });
          }

          // Get the project status to retrieve the VM IP
          const baseUrl = process.env.NEXTAUTH_URL || `${request.nextUrl.protocol}//${request.nextUrl.host}`;
          const statusResponse = await fetch(`${baseUrl}/api/agent/project-status`, {
               method: 'POST',
               headers: {
                    'Content-Type': 'application/json',
                    'Cookie': request.headers.get('cookie') || '', // Forward cookies for auth
               },
               body: JSON.stringify({ repositoryId }),
          });

          if (!statusResponse.ok) {
               return NextResponse.json({ error: 'Failed to get project status' }, { status: 500 });
          }

          const statusData = await statusResponse.json();

          if (!statusData.isRunning || !statusData.vmIP) {
               return NextResponse.json({ error: 'Project is not running or VM IP not available' }, { status: 404 });
          }

          // Proxy the request to the actual VM
          const pathname = request.nextUrl.pathname.replace('/api/proxy/project', '') || '/';
          const search = request.nextUrl.search || '';
          const targetUrl = `http://${statusData.vmIP}:${port}${pathname}${search}`;

          console.log(`Proxying request to: ${targetUrl}`);

          const proxyResponse = await fetch(targetUrl, {
               method: request.method,
               headers: {
                    ...Object.fromEntries(request.headers.entries()),
                    'host': `${statusData.vmIP}:${port}`,
               },
               body: request.method !== 'GET' ? await request.arrayBuffer() : undefined,
          });

          // Copy the response
          const responseBody = await proxyResponse.arrayBuffer();
          const response = new NextResponse(responseBody, {
               status: proxyResponse.status,
               statusText: proxyResponse.statusText,
               headers: {
                    ...Object.fromEntries(proxyResponse.headers.entries()),
                    // Remove security headers that might interfere with iframe
                    'x-frame-options': 'ALLOWALL',
                    'content-security-policy': '',
               },
          });

          return response;
     } catch (error) {
          console.error('Proxy error:', error);
          return NextResponse.json({ error: 'Proxy error' }, { status: 500 });
     }
}

export async function POST(request: NextRequest) {
     return GET(request);
}

export async function PUT(request: NextRequest) {
     return GET(request);
}

export async function DELETE(request: NextRequest) {
     return GET(request);
}

export async function PATCH(request: NextRequest) {
     return GET(request);
}
