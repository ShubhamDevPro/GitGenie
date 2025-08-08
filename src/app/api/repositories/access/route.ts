import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { userService } from "@/lib/userService";

/**
 * Get repository access details for authenticated user
 * This endpoint provides clone URLs while hiding Gitea web interface access
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

        const { searchParams } = new URL(request.url);
        const projectId = searchParams.get('projectId');

        if (!projectId) {
            return NextResponse.json(
                { error: "Project ID is required" },
                { status: 400 }
            );
        }

        // Get repository access details (without exposing Gitea web UI)
        const accessDetails = await userService.getRepositoryAccessDetails(
            session.user.id,
            projectId
        );

        return NextResponse.json({
            repository: {
                id: accessDetails.project.id,
                name: accessDetails.project.repoName,
                originalRepo: `${accessDetails.project.githubOwner}/${accessDetails.project.githubRepo}`,
                cloneUrl: accessDetails.cloneUrl,
                clonedAt: accessDetails.project.clonedAt,
                lastSyncAt: accessDetails.project.lastSyncAt,
                // Explicitly exclude web URL to prevent users from accessing Gitea UI
                status: accessDetails.project.connectionStatus,
            },
            userMapping: accessDetails.userMapping,
            accessInstructions: {
                method: "git_clone_only",
                message: "Use the clone URL with your Git client. Web interface access is not available.",
                cloneCommand: `git clone ${accessDetails.cloneUrl}`,
                note: "This repository is privately hosted and managed. Access is limited to Git operations only."
            }
        });

    } catch (error) {
        console.error("Get repository access error:", error);

        const errorMessage = error instanceof Error ? error.message : "Failed to get repository access";

        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        );
    }
}

/**
 * Update repository sync status
 */
export async function PATCH(request: NextRequest) {
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
        const { projectId, action } = body;

        if (!projectId || !action) {
            return NextResponse.json(
                { error: "Project ID and action are required" },
                { status: 400 }
            );
        }

        if (action === 'sync') {
            // Update last sync timestamp
            const prisma = (await import('@/lib/prisma')).default;

            const project = await prisma.project.findFirst({
                where: {
                    id: projectId,
                    userId: session.user.id,
                }
            });

            if (!project) {
                return NextResponse.json(
                    { error: "Repository not found or access denied" },
                    { status: 404 }
                );
            }

            const updatedProject = await prisma.project.update({
                where: { id: projectId },
                data: { lastSyncAt: new Date() }
            });

            return NextResponse.json({
                success: true,
                message: "Repository sync status updated",
                lastSyncAt: updatedProject.lastSyncAt,
            });
        }

        return NextResponse.json(
            { error: "Invalid action" },
            { status: 400 }
        );

    } catch (error) {
        console.error("Update repository access error:", error);

        const errorMessage = error instanceof Error ? error.message : "Failed to update repository";

        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        );
    }
}
