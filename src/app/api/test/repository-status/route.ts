import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { giteaService } from '@/lib/gitea';

export async function GET(request: NextRequest) {
    try {
        // Check authentication
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        // Get repository info from query params
        const { searchParams } = new URL(request.url);
        const owner = searchParams.get('owner');
        const repo = searchParams.get('repo');

        if (!owner || !repo) {
            return NextResponse.json({ error: 'Owner and repo parameters required' }, { status: 400 });
        }

        // Check repository content
        const contentCheck = await giteaService.checkRepositoryContent(owner, repo);
        
        return NextResponse.json({
            owner,
            repo,
            contentCheck,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error checking repository status:', error);
        return NextResponse.json(
            { error: 'Failed to check repository status', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
