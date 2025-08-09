import { NextRequest, NextResponse } from 'next/server';
import { giteaService } from '@/lib/gitea';

export async function POST(request: NextRequest) {
    try {
        const { username } = await request.json();

        if (!username) {
            return NextResponse.json({ error: 'Username is required' }, { status: 400 });
        }

        // Test different token creation methods
        const testResults = {
            method1: { success: false, error: '' },
            method2: { success: false, error: '' },
            method3: { success: false, error: '' },
        };

        const tokenName = `test-token-${Date.now()}`;

        // Method 1: /users/{username}/tokens
        try {
            const response = await fetch(`${process.env.GITEA_URL}/api/v1/users/${username}/tokens`, {
                method: 'POST',
                headers: {
                    'Authorization': `token ${process.env.GITEA_ADMIN_TOKEN}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: tokenName + '-m1',
                    scopes: ['read:repository', 'write:repository'],
                }),
            });

            if (response.ok) {
                testResults.method1.success = true;
                const tokenData = await response.json();
                // Clean up - delete the test token if successful
                try {
                    await fetch(`${process.env.GITEA_URL}/api/v1/users/${username}/tokens/${tokenData.id}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `token ${process.env.GITEA_ADMIN_TOKEN}` },
                    });
                } catch (cleanupError) {
                    console.warn('Failed to cleanup test token:', cleanupError);
                }
            } else {
                testResults.method1.error = `${response.status}: ${await response.text()}`;
            }
        } catch (error) {
            testResults.method1.error = error instanceof Error ? error.message : 'Unknown error';
        }

        // Method 2: /admin/users/{username}/tokens
        try {
            const response = await fetch(`${process.env.GITEA_URL}/api/v1/admin/users/${username}/tokens`, {
                method: 'POST',
                headers: {
                    'Authorization': `token ${process.env.GITEA_ADMIN_TOKEN}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: tokenName + '-m2',
                    scopes: ['read:repository', 'write:repository'],
                }),
            });

            if (response.ok) {
                testResults.method2.success = true;
                const tokenData = await response.json();
                // Clean up - delete the test token if successful
                try {
                    await fetch(`${process.env.GITEA_URL}/api/v1/admin/users/${username}/tokens/${tokenData.id}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `token ${process.env.GITEA_ADMIN_TOKEN}` },
                    });
                } catch (cleanupError) {
                    console.warn('Failed to cleanup test token:', cleanupError);
                }
            } else {
                testResults.method2.error = `${response.status}: ${await response.text()}`;
            }
        } catch (error) {
            testResults.method2.error = error instanceof Error ? error.message : 'Unknown error';
        }

        // Method 3: Check what endpoints are available
        try {
            const response = await fetch(`${process.env.GITEA_URL}/api/v1/admin/users/${username}`, {
                headers: {
                    'Authorization': `token ${process.env.GITEA_ADMIN_TOKEN}`,
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const userData = await response.json();
                testResults.method3.success = true;
                testResults.method3.error = `User found: ${userData.login}`;
            } else {
                testResults.method3.error = `${response.status}: ${await response.text()}`;
            }
        } catch (error) {
            testResults.method3.error = error instanceof Error ? error.message : 'Unknown error';
        }

        return NextResponse.json({
            username,
            testResults,
            gitea: {
                version: '1.24.3',
                baseUrl: process.env.GITEA_URL,
            }
        });
    } catch (error) {
        console.error('Token test error:', error);
        return NextResponse.json(
            {
                error: 'Failed to test token creation',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}
