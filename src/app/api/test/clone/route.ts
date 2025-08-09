import { NextRequest, NextResponse } from 'next/server';
import { userService } from '@/lib/userService';

export async function POST(request: NextRequest) {
    try {
        // For testing purposes - use a hardcoded user ID
        // In real implementation, this would come from the authenticated session
        const testUserId = 'test-user-id-' + Date.now();

        // First, we need a user in the database to test with
        // This is a simplified test - normally the user would exist from authentication
        const testUserEmail = `test-${Date.now()}@example.com`;

        const body = await request.json();
        const { githubOwner, githubRepo, githubUrl, description } = body;

        // Validate required fields
        if (!githubOwner || !githubRepo || !githubUrl) {
            return NextResponse.json(
                { error: "Missing required fields: githubOwner, githubRepo, githubUrl" },
                { status: 400 }
            );
        }

        console.log(`Testing repository clone for: ${githubOwner}/${githubRepo}`);

        // For this test, we'll create a mock user in the database first
        const prisma = (await import('@/lib/prisma')).default;

        let testUser;
        try {
            testUser = await prisma.user.create({
                data: {
                    name: 'Test User',
                    email: testUserEmail,
                    isVerified: true,
                },
            });
        } catch (error) {
            return NextResponse.json(
                { error: "Failed to create test user" },
                { status: 500 }
            );
        }

        try {
            // Test the clone functionality
            console.log('Starting clone process...');
            const result = await userService.cloneRepositoryToGitea(
                testUser.id,
                githubOwner,
                githubRepo,
                githubUrl,
                description
            );

            console.log('Clone process completed successfully');
            console.log('Result:', JSON.stringify(result, null, 2));

            return NextResponse.json({
                success: true,
                project: result.project,
                message: result.message,
                testUser: {
                    id: testUser.id,
                    email: testUser.email,
                    giteaUsername: result.giteaUsername, // Use the actual Gitea username from the result
                }
            });

        } catch (cloneError) {
            // Clean up test user
            try {
                await prisma.user.delete({ where: { id: testUser.id } });
            } catch (cleanupError) {
                console.warn('Failed to cleanup test user:', cleanupError);
            }

            console.error("Clone test error:", cloneError);
            console.error("Clone error stack:", (cloneError as Error).stack);
            return NextResponse.json(
                { error: cloneError instanceof Error ? cloneError.message : "Failed to clone repository" },
                { status: 500 }
            );
        }

    } catch (error) {
        console.error("Test clone repository error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Test failed" },
            { status: 500 }
        );
    }
}
