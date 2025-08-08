import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { userService } from "@/lib/userService";

export async function POST(request: NextRequest) {
    try {
        // Check authentication
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "Authentication required" },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { githubOwner, githubRepo, githubUrl, description } = body;

        // Validate required fields
        if (!githubOwner || !githubRepo || !githubUrl) {
            return NextResponse.json(
                { error: "Missing required fields: githubOwner, githubRepo, githubUrl" },
                { status: 400 }
            );
        }

        // Clone repository to Gitea
        const result = await userService.cloneRepositoryToGitea(
            session.user.id,
            githubOwner,
            githubRepo,
            githubUrl,
            description
        );

        return NextResponse.json({
            success: true,
            project: result.project,
            message: result.message,
        });

    } catch (error) {
        console.error("Clone repository error:", error);

        const errorMessage = error instanceof Error ? error.message : "Failed to clone repository";

        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        );
    }
}

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

        // Get user's cloned repositories with detailed mapping information
        const repositories = await userService.getUserClonedRepositories(session.user.id);

        // Filter out Gitea web URLs and provide only necessary information
        const sanitizedRepositories = repositories.map(repo => ({
            id: repo.id,
            name: repo.repoName,
            originalRepo: `${repo.githubOwner}/${repo.githubRepo}`,
            originalUrl: repo.githubUrl,
            cloneUrl: repo.giteaCloneUrl,
            status: repo.connectionStatus,
            clonedAt: repo.clonedAt,
            lastSyncAt: repo.lastSyncAt,
            // User mapping information for admin/debugging purposes
            userMapping: repo.mappingInfo,
            // Explicitly exclude web URL
            giteaWebUrl: undefined,
        }));

        return NextResponse.json({
            repositories: sanitizedRepositories,
            count: repositories.length,
            userInfo: {
                appUserId: session.user.id,
                appUserEmail: session.user.email,
                hasGiteaIntegration: repositories.length > 0 ? repositories[0].mappingInfo.giteaUsername !== null : false,
            },
            accessNote: "Repositories are accessible via Git clone only. Web interface access is restricted."
        });

    } catch (error) {
        console.error("Get repositories error:", error);

        const errorMessage = error instanceof Error ? error.message : "Failed to fetch repositories";

        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        );
    }
}
