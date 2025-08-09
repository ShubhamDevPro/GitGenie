import { NextRequest, NextResponse } from 'next/server';
import { giteaService } from '@/lib/gitea';

export async function GET(request: NextRequest) {
    try {
        // Check server health
        const healthCheck = await giteaService.checkServerHealth();

        // Try to list admin users to test admin token
        let adminTokenWorking = false;
        let adminUsersData = null;
        try {
            const response = await fetch(`${process.env.GITEA_URL}/api/v1/admin/users?limit=5`, {
                headers: {
                    'Authorization': `token ${process.env.GITEA_ADMIN_TOKEN}`,
                    'Content-Type': 'application/json',
                },
            });
            adminTokenWorking = response.ok;
            if (response.ok) {
                adminUsersData = await response.json();
            }
        } catch (error) {
            console.error('Admin token test failed:', error);
        }

        return NextResponse.json({
            gitea: {
                serverHealth: healthCheck,
                adminTokenWorking,
                baseUrl: process.env.GITEA_URL,
                hasAdminToken: !!process.env.GITEA_ADMIN_TOKEN,
            }
        });
    } catch (error) {
        console.error('Gitea test error:', error);
        return NextResponse.json(
            {
                error: 'Failed to test Gitea connection',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}
