import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        const baseUrl = process.env.GITEA_URL;
        const adminToken = process.env.GITEA_ADMIN_TOKEN;

        if (!baseUrl || !adminToken) {
            return NextResponse.json({ error: 'Missing Gitea configuration' }, { status: 500 });
        }

        // Test various endpoints to see what's available
        const testEndpoints = [
            { name: 'Server Version', endpoint: '/version', method: 'GET' },
            { name: 'Admin Users List', endpoint: '/admin/users?limit=1', method: 'GET' },
            { name: 'User Creation Test', endpoint: '/admin/users', method: 'POST', testOnly: true },
        ];

        const results: any[] = [];

        for (const test of testEndpoints) {
            try {
                const headers = {
                    'Authorization': `token ${adminToken}`,
                    'Content-Type': 'application/json',
                };

                let body = undefined;
                if (test.testOnly && test.method === 'POST') {
                    // Don't actually create a user, just test the endpoint availability
                    continue;
                }

                const response = await fetch(`${baseUrl}/api/v1${test.endpoint}`, {
                    method: test.method,
                    headers,
                    body,
                });

                results.push({
                    name: test.name,
                    endpoint: test.endpoint,
                    status: response.status,
                    available: response.status !== 404,
                    responseHeaders: Object.fromEntries(response.headers.entries()),
                    ...(response.ok ? { data: await response.json() } : { error: await response.text() })
                });
            } catch (error) {
                results.push({
                    name: test.name,
                    endpoint: test.endpoint,
                    status: 'ERROR',
                    available: false,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        }

        // Test token creation endpoints specifically
        const testUser = 'testuser123'; // Use a non-existent user for testing
        const tokenTests = [
            { name: 'User Tokens', endpoint: `/users/${testUser}/tokens` },
            { name: 'Admin User Tokens', endpoint: `/admin/users/${testUser}/tokens` },
            { name: 'Admin Access Tokens', endpoint: `/admin/access_tokens` },
            { name: 'User Settings', endpoint: `/user/settings` },
        ];

        for (const test of tokenTests) {
            try {
                const response = await fetch(`${baseUrl}/api/v1${test.endpoint}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `token ${adminToken}`,
                        'Content-Type': 'application/json',
                    },
                });

                results.push({
                    name: test.name,
                    endpoint: test.endpoint,
                    status: response.status,
                    available: response.status !== 404,
                    method: 'GET (test)',
                    note: response.status === 404 ? 'Endpoint not found' :
                        response.status === 403 ? 'Access denied' :
                            response.status === 401 ? 'Authentication required' :
                                'Endpoint exists'
                });
            } catch (error) {
                results.push({
                    name: test.name,
                    endpoint: test.endpoint,
                    status: 'ERROR',
                    available: false,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        }

        return NextResponse.json({
            baseUrl,
            hasAdminToken: !!adminToken,
            tests: results,
            summary: {
                totalTests: results.length,
                available: results.filter(r => r.available).length,
                unavailable: results.filter(r => !r.available).length
            }
        });

    } catch (error) {
        console.error('Gitea endpoints test error:', error);
        return NextResponse.json(
            {
                error: 'Failed to test Gitea endpoints',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}
