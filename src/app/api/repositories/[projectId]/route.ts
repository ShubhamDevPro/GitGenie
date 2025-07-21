import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { userService } from "@/lib/userService";

export async function DELETE(
    request: NextRequest,
    { params }: { params: { projectId: string } }
) {
    try {
        // Check authentication
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "Authentication required" },
                { status: 401 }
            );
        }

        const { projectId } = params;

        if (!projectId) {
            return NextResponse.json(
                { error: "Project ID is required" },
                { status: 400 }
            );
        }

        // Delete repository
        const result = await userService.deleteClonedRepository(
            session.user.id,
            projectId
        );

        return NextResponse.json({
            success: true,
            message: result.message,
        });

    } catch (error) {
        console.error("Delete repository error:", error);

        const errorMessage = error instanceof Error ? error.message : "Failed to delete repository";

        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        );
    }
}
