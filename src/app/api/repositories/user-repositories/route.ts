import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { userService } from '@/lib/userService';

export async function GET(request: NextRequest) {
    try {
        // Check authentication
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        // Get user data
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            include: {
                projects: {
                    orderBy: { createdAt: 'desc' },
                },
            },
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Get Gitea user info using email-based lookup
        let giteaUser = null;
        try {
            giteaUser = await (userService as any).findGiteaUserByEmail(user.email);
        } catch (error) {
            console.warn('Could not find Gitea user for email:', user.email);
        }

        // Transform projects data
        const repositories = user.projects.map(project => ({
            id: project.id,
            repoName: project.repoName,
            githubOwner: project.githubOwner || '',
            githubRepo: project.githubRepo || '',
            githubUrl: project.githubUrl || '',
            giteaRepoName: project.giteaRepoName || '',
            giteaCloneUrl: project.giteaCloneUrl || '',
            giteaWebUrl: project.giteaWebUrl || '',
            connectionStatus: project.connectionStatus,
            createdAt: project.createdAt.toISOString(),
            clonedAt: project.clonedAt?.toISOString() || project.createdAt.toISOString(),
            lastSyncAt: project.lastSyncAt?.toISOString() || project.createdAt.toISOString(),
        }));

        // Calculate summary
        const connectedRepos = repositories.filter(repo => repo.connectionStatus === 'connected');
        
        const userData = {
            appUser: {
                id: user.id,
                email: user.email,
                name: user.name,
                createdAt: user.createdAt.toISOString(),
            },
            giteaIntegration: {
                giteaEmail: giteaUser?.email || null,
                giteaCreatedAt: user.giteaCreatedAt?.toISOString() || null,
                hasToken: !!user.giteaAccessToken,
                mappingMethod: 'email-based',
            },
            repositories,
            summary: {
                totalRepositories: repositories.length,
                connectedRepositories: connectedRepos.length,
                mappingIntegrity: connectedRepos.length === repositories.length ? 'good' : 'issues',
            },
        };

        return NextResponse.json(userData);

    } catch (error) {
        console.error('Error in user-repositories API:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
