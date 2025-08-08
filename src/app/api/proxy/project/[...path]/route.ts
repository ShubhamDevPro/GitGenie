import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

export async function GET(
     request: NextRequest,
     { params }: { params: { path: string[] } }
) {
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

          // Build the target URL
          const pathString = params.path ? `/${params.path.join('/')}` : '/';
          const search = request.nextUrl.search || '';
          const targetUrl = `http://${statusData.vmIP}:${port}${pathString}${search}`;

          console.log(`Proxying request to: ${targetUrl}`);

          const proxyResponse = await fetch(targetUrl, {
               method: request.method,
               headers: {
                    ...Object.fromEntries(request.headers.entries()),
                    'host': `${statusData.vmIP}:${port}`,
               },
               body: request.method !== 'GET' ? await request.arrayBuffer() : undefined,
          });

          if (!proxyResponse.ok) {
               return NextResponse.json({
                    error: `Upstream server error: ${proxyResponse.status} ${proxyResponse.statusText}`
               }, { status: proxyResponse.status });
          }

          // Get content type to handle different response types
          const contentType = proxyResponse.headers.get('content-type') || '';

          if (contentType.includes('text/html')) {
               // For HTML responses, modify the content to make relative URLs work with our proxy
               let html = await proxyResponse.text();

               // Replace relative URLs to use our proxy
               html = html.replace(
                    /(src|href|action)=["'](?!https?:\/\/|\/\/|#)([^"']*?)["']/gi,
                    (match, attr, url) => {
                         // Handle root-relative URLs (starting with /)
                         if (url.startsWith('/')) {
                              return `${attr}="/api/proxy/project${url}?repositoryId=${repositoryId}&port=${port}"`;
                         }
                         // Handle relative URLs
                         return `${attr}="/api/proxy/project/${url}?repositoryId=${repositoryId}&port=${port}"`;
                    }
               );

               return new NextResponse(html, {
                    status: proxyResponse.status,
                    headers: {
                         'content-type': 'text/html',
                         'x-frame-options': 'ALLOWALL',
                         'content-security-policy': '',
                    },
               });
          } else {
               // For other content types (CSS, JS, images, etc.), pass through as-is
               const responseBody = await proxyResponse.arrayBuffer();
               return new NextResponse(responseBody, {
                    status: proxyResponse.status,
                    headers: {
                         ...Object.fromEntries(proxyResponse.headers.entries()),
                         'x-frame-options': 'ALLOWALL',
                         'content-security-policy': '',
                    },
               });
          }
     } catch (error) {
          console.error('Proxy error:', error);
          return NextResponse.json({ error: 'Proxy error' }, { status: 500 });
     }
}

export async function POST(request: NextRequest, context: any) {
     return GET(request, context);
}

export async function PUT(request: NextRequest, context: any) {
     return GET(request, context);
}

export async function DELETE(request: NextRequest, context: any) {
     return GET(request, context);
}

export async function PATCH(request: NextRequest, context: any) {
     return GET(request, context);
}
