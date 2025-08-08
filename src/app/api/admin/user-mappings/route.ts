import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

/**
 * Admin endpoint to audit user-repository mappings
 * This helps verify that repositories are properly mapped to users
 */
export async function GET(request: NextRequest) {
    try {
        // Check authentication
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "Authentication required" },
                { status: 401 }
            );
        }

        // For security, you might want to add admin role check here
        // if (!session.user.isAdmin) {
        //     return NextResponse.json(
        //         { error: "Admin access required" },
        //         { status: 403 }
        //     );
        // }

        const prisma = (await import('@/lib/prisma')).default;

        // Get comprehensive mapping information
        const userMappings = await prisma.user.findMany({
            include: {
                projects: {
                    where: {
                        giteaRepoId: { not: null }
                    },
                    select: {
                        id: true,
                        repoName: true,
                        githubOwner: true,
                        githubRepo: true,
                        giteaRepoId: true,
                        giteaRepoName: true,
                        giteaCloneUrl: true,
                        clonedAt: true,
                        connectionStatus: true,
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Get Gitea user information for each user by email
        const { giteaService } = await import('@/lib/gitea');
        const mappingAnalysis = await Promise.all(userMappings.map(async (user) => {
            // Find corresponding Gitea user by email
            let giteaUser = null;
            try {
                // Search for Gitea user by email
                const response = await fetch(`${process.env.GITEA_URL}/api/v1/admin/users?limit=1000`, {
                    headers: {
                        'Authorization': `token ${process.env.GITEA_ADMIN_TOKEN}`,
                        'Content-Type': 'application/json',
                    },
                });
                if (response.ok) {
                    const giteaUsers = await response.json();
                    giteaUser = giteaUsers.find((gu: any) => gu.email === user.email);
                }
            } catch (error) {
                console.error(`Error fetching Gitea user for ${user.email}:`, error);
            }

            // Check repository mapping integrity
            const projectsWithIssues = user.projects.filter(project => {
                if (!giteaUser) return true; // No Gitea user found is an issue

                // Check if repository name starts with user's Gitea username
                const expectedPrefix = giteaUser.login;
                const actualRepoName = project.giteaRepoName;

                return expectedPrefix && actualRepoName &&
                    !actualRepoName.startsWith(expectedPrefix);
            });

            return {
                appUser: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    createdAt: user.createdAt,
                },
                giteaIntegration: {
                    giteaEmail: giteaUser?.email || null,
                    giteaCreatedAt: user.giteaCreatedAt,
                    hasToken: !!user.giteaAccessToken,
                    mappingMethod: 'email-based', // New mapping method
                },
                repositories: user.projects.map(project => ({
                    id: project.id,
                    name: project.repoName,
                    source: `${project.githubOwner}/${project.githubRepo}`,
                    giteaRepoId: project.giteaRepoId,
                    giteaRepoName: project.giteaRepoName,
                    clonedAt: project.clonedAt,
                    status: project.connectionStatus,
                    mappingStatus: giteaUser && project.giteaRepoName?.startsWith(giteaUser.login)
                        ? 'properly_mapped'
                        : 'mapping_issue'
                })),
                summary: {
                    totalRepositories: user.projects.length,
                    repositoriesWithMappingIssues: projectsWithIssues.length,
                    hasGiteaIntegration: !!giteaUser,
                    mappingIntegrity: projectsWithIssues.length === 0 && giteaUser ? 'good' : 'needs_attention'
                }
            };
        }));

        // Overall statistics
        const totalUsers = userMappings.length;
        const usersWithGiteaIntegration = mappingAnalysis.filter(u => u.summary.hasGiteaIntegration).length;
        const totalRepositories = userMappings.reduce((sum, u) => sum + u.projects.length, 0);
        const repositoriesWithIssues = mappingAnalysis.reduce(
            (sum, u) => sum + u.summary.repositoriesWithMappingIssues, 0
        );

        return NextResponse.json({
            summary: {
                totalUsers,
                usersWithGiteaIntegration,
                totalRepositories,
                repositoriesWithIssues,
                giteaServerUrl: process.env.GITEA_URL,
                mappingIntegrityPercentage: totalRepositories > 0
                    ? Math.round(((totalRepositories - repositoriesWithIssues) / totalRepositories) * 100)
                    : 100
            },
            userMappings: mappingAnalysis,
            recommendations: repositoriesWithIssues > 0 ? [
                "Some repositories may not be properly mapped to their Gitea users",
                "Consider running a mapping verification process",
                "Check if repository names follow the expected naming convention"
            ] : [
                "All repositories are properly mapped to their respective users",
                "User-repository mapping integrity is maintained"
            ]
        });

    } catch (error) {
        console.error("Admin audit error:", error);

        const errorMessage = error instanceof Error ? error.message : "Failed to generate audit report";

        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        );
    }
}
