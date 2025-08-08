import prisma from './prisma';
import { giteaService } from './gitea';

interface User {
    id: string;
    name: string | null;
    email: string;
    giteaAccessToken: string | null;
    giteaCreatedAt: Date | null;
}

export interface UserGiteaIntegration {
    user: User;
    giteaUser: any;
    isNewGiteaUser: boolean;
}

class UserService {
    /**
     * Ensure user has a Gitea account and return integration info
     * Uses email-based mapping instead of storing separate giteaUserId/giteaUsername
     */
    async ensureGiteaIntegration(userId: string): Promise<UserGiteaIntegration> {
        // Get user from database
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            throw new Error('User not found');
        }

        // Always check if a Gitea user with this email exists
        const existingGiteaUser = await this.findGiteaUserByEmail(user.email);

        if (existingGiteaUser) {
            console.log(`Found existing Gitea user for email: ${user.email}`);

            // Update our database to mark when Gitea integration was verified
            const updatedUser = await prisma.user.update({
                where: { id: userId },
                data: {
                    giteaCreatedAt: user.giteaCreatedAt || new Date(), // Set if not already set
                },
            });

            return {
                user: updatedUser,
                giteaUser: existingGiteaUser,
                isNewGiteaUser: false,
            };
        }

        // Create new Gitea user with email-based username
        const giteaUsername = await this.generateUniqueGiteaUsername(user.email, user.name || undefined);
        const giteaPassword = giteaService.generatePassword();

        try {
            const giteaUser = await giteaService.createUser({
                username: giteaUsername,
                email: user.email,
                password: giteaPassword,
                full_name: user.name || undefined,
                send_notify: false,
            });

            // Update user record to mark Gitea integration created
            const updatedUser = await prisma.user.update({
                where: { id: userId },
                data: {
                    giteaAccessToken: null, // Use admin token as fallback
                    giteaCreatedAt: new Date(),
                },
            });

            return {
                user: updatedUser,
                giteaUser,
                isNewGiteaUser: true,
            };
        } catch (error) {
            console.error('Error creating Gitea user:', error);

            // If email already exists, try to find and link the existing user
            if (error instanceof Error && error.message.includes('e-mail already in use')) {
                console.log('Email already in use, attempting to link existing Gitea user...');
                const existingUser = await this.findGiteaUserByEmail(user.email);
                if (existingUser) {
                    const updatedUser = await prisma.user.update({
                        where: { id: userId },
                        data: {
                            giteaAccessToken: null,
                            giteaCreatedAt: new Date(),
                        },
                    });

                    return {
                        user: updatedUser,
                        giteaUser: existingUser,
                        isNewGiteaUser: false,
                    };
                }
            }

            // Don't fail the integration completely - the system can work with admin token fallback
            // Only fail if the user creation itself failed
            if (error instanceof Error &&
                (error.message.includes('Failed to create Gitea user') ||
                    error.message.includes('Network error'))) {
                throw new Error('Failed to set up Gitea integration: Unable to create user account');
            }

            // For other errors (like token creation), continue with admin token fallback
            console.warn('Continuing with admin token fallback due to error:', error);
            throw new Error('Failed to set up Gitea integration');
        }
    }

    /**
     * Find Gitea user by email (searches through users)
     */
    private async findGiteaUserByEmail(email: string): Promise<any | null> {
        try {
            // Use Gitea API to search for user by email
            // This requires admin privileges
            const response = await fetch(`${process.env.GITEA_URL}/api/v1/admin/users?limit=1000`, {
                headers: {
                    'Authorization': `token ${process.env.GITEA_ADMIN_TOKEN}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                return null;
            }

            const users = await response.json();
            return users.find((user: any) => user.email === email) || null;
        } catch (error) {
            console.error('Error searching for Gitea user by email:', error);
            return null;
        }
    }

    /**
     * Generate a unique Gitea username, checking for conflicts
     */
    private async generateUniqueGiteaUsername(email: string, name?: string): Promise<string> {
        const baseUsername = name
            ? name.toLowerCase().replace(/[^a-z0-9]/g, '')
            : email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');

        // Generate a unique username using timestamp and random suffix to avoid conflicts
        const timestamp = Date.now().toString(36);
        const randomSuffix = Math.random().toString(36).substring(2, 5);

        // Create username: baseUsername_timestamp_random (max 39 chars for Gitea)
        const uniqueUsername = `${baseUsername}_${timestamp}_${randomSuffix}`.substring(0, 39);

        return uniqueUsername;
    }

    /**
     * Get user's decrypted Gitea access token
     */
    async getUserGiteaToken(userId: string): Promise<string | null> {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { giteaAccessToken: true },
        });

        if (!user?.giteaAccessToken) {
            // If no user token is stored, return null so admin token can be used as fallback
            return null;
        }

        try {
            return giteaService.decryptToken(user.giteaAccessToken);
        } catch (error) {
            console.error('Error decrypting Gitea token:', error);
            return null;
        }
    }

    /**
     * Clone a GitHub repository to user's Gitea account
     */
    async cloneRepositoryToGitea(
        userId: string,
        githubOwner: string,
        githubRepo: string,
        githubUrl: string,
        description?: string
    ) {
        // Ensure user has Gitea integration
        const integration = await this.ensureGiteaIntegration(userId);
        const userToken = await this.getUserGiteaToken(userId);

        // Use user token if available, otherwise fall back to admin token
        // Note: When using admin token, the operation will be performed with admin privileges
        console.log(`Cloning repository with ${userToken ? 'user' : 'admin'} token for user: ${integration.user.email} -> Gitea: ${integration.giteaUser.login}`);

        // Generate a unique repository name with user prefix for better organization
        const repoName = this.generateUniqueRepoName(githubRepo, integration.giteaUser.login);

        // Check if user already has this repository cloned
        const existingProject = await prisma.project.findFirst({
            where: {
                userId: userId,
                githubOwner: githubOwner,
                githubRepo: githubRepo,
                connectionStatus: 'connected'
            }
        });

        if (existingProject) {
            throw new Error(`Repository ${githubOwner}/${githubRepo} is already cloned to your workspace`);
        }

        try {
            // Create repository in Gitea with proper user ownership
            const giteaRepo = await giteaService.cloneRepository(
                integration.giteaUser.login,
                repoName,
                githubUrl,
                description || `Cloned from ${githubUrl} by ${integration.user.email}`,
                userToken || undefined // Pass undefined to use admin token as fallback
            );

            // Verify repository ownership by checking if it's under the correct user
            if (giteaRepo.full_name && !giteaRepo.full_name.startsWith(`${integration.giteaUser.login}/`)) {
                console.warn(`Repository created but ownership might not be correct: ${giteaRepo.full_name}`);
            }

            // Create project record in database with enhanced tracking
            const project = await prisma.project.create({
                data: {
                    repoName: repoName,
                    repoUrl: giteaRepo.clone_url,
                    connectionStatus: 'connected',
                    userId: userId,
                    githubOwner: githubOwner,
                    githubRepo: githubRepo,
                    githubUrl: githubUrl,
                    giteaRepoId: giteaRepo.id,
                    giteaRepoName: giteaRepo.name,
                    giteaCloneUrl: giteaRepo.clone_url,
                    giteaWebUrl: giteaRepo.html_url,
                    clonedAt: new Date(),
                    lastSyncAt: new Date(),
                },
            });

            // Log the mapping for audit purposes
            console.log(`Successfully mapped repository: User ${integration.user.email} -> Gitea User ${integration.giteaUser.login} -> Repository ${giteaRepo.full_name}`);

            return {
                project,
                giteaRepo,
                message: `Repository successfully cloned to your private workspace as ${integration.giteaUser.login}/${repoName}`,
                giteaUsername: integration.giteaUser.login,
                repositoryFullName: giteaRepo.full_name,
            };
        } catch (error) {
            console.error('Error cloning repository:', error);

            // Enhanced error handling with user context
            if (error instanceof Error) {
                if (error.message.includes('already exists')) {
                    throw new Error(`A repository with this name already exists in your workspace. Please try again.`);
                } else if (error.message.includes('not found')) {
                    throw new Error(`Source repository not found or not accessible: ${githubUrl}`);
                } else if (error.message.includes('authentication')) {
                    throw new Error(`Authentication failed. Please contact support.`);
                }
            }

            throw new Error(`Failed to clone repository: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Get user's cloned repositories with detailed mapping information
     */
    async getUserClonedRepositories(userId: string) {
        const repositories = await prisma.project.findMany({
            where: {
                userId,
                giteaRepoId: { not: null },
            },
            include: {
                user: {
                    select: {
                        email: true,
                        name: true,
                    }
                }
            },
            orderBy: { clonedAt: 'desc' },
        });

        // Get Gitea user information for mapping verification
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { email: true }
        });

        let giteaUser = null;
        if (user) {
            giteaUser = await this.findGiteaUserByEmail(user.email);
        }

        // Add mapping verification for each repository
        return repositories.map(repo => ({
            ...repo,
            mappingInfo: {
                userEmail: repo.user.email,
                userName: repo.user.name,
                giteaUsername: giteaUser?.login || null,
                repositoryOwner: repo.giteaRepoName?.split('-')[0], // Extract owner from repo name
                isProperlyMapped: giteaUser?.login && repo.giteaRepoName?.startsWith(giteaUser.login),
            }
        }));
    }

    /**
     * Get repository access details for a specific user
     */
    async getRepositoryAccessDetails(userId: string, projectId: string) {
        const project = await prisma.project.findFirst({
            where: {
                id: projectId,
                userId,
                giteaRepoId: { not: null },
            },
            include: {
                user: {
                    select: {
                        email: true,
                        name: true,
                    }
                }
            }
        });

        if (!project) {
            throw new Error('Repository not found or access denied');
        }

        // Get Gitea user information via email lookup
        const giteaUser = await this.findGiteaUserByEmail(project.user.email);

        return {
            project,
            accessMethod: 'clone_url_only', // Users only get clone URL, no web UI access
            cloneUrl: project.giteaCloneUrl,
            giteaWebUrl: null, // Explicitly hide web URL from users
            userMapping: {
                appUserId: project.userId,
                appUserEmail: project.user.email,
                repositoryFullName: giteaUser?.login ? `${giteaUser.login}/${project.giteaRepoName}` : null,
            }
        };
    }

    /**
     * Delete a cloned repository
     */
    async deleteClonedRepository(userId: string, projectId: string) {
        const project = await prisma.project.findFirst({
            where: {
                id: projectId,
                userId,
                giteaRepoId: { not: null },
            },
        });

        if (!project) {
            throw new Error('Repository not found');
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { email: true },
        });

        if (!user?.email || !project.giteaRepoName) {
            throw new Error('User or repository information not found');
        }

        // Get Gitea user information via email lookup
        const giteaUser = await this.findGiteaUserByEmail(user.email);

        if (!giteaUser?.login) {
            throw new Error('Gitea user not found for this email');
        }

        const userToken = await this.getUserGiteaToken(userId);

        try {
            // Delete from Gitea
            await giteaService.deleteRepository(
                giteaUser.login,
                project.giteaRepoName,
                userToken || undefined
            );

            // Delete from database
            await prisma.project.delete({
                where: { id: projectId },
            });

            return { message: 'Repository successfully deleted' };
        } catch (error) {
            console.error('Error deleting repository:', error);
            throw new Error('Failed to delete repository');
        }
    }

    /**
     * Generate a unique repository name with user context
     */
    private generateUniqueRepoName(originalName: string, username?: string): string {
        const timestamp = Date.now().toString(36);
        const sanitizedName = originalName.toLowerCase().replace(/[^a-z0-9-_.]/g, '-');

        // Include username prefix for better organization and uniqueness
        if (username) {
            const sanitizedUsername = username.toLowerCase().replace(/[^a-z0-9-_.]/g, '-');
            return `${sanitizedUsername}-${sanitizedName}-${timestamp}`;
        }

        return `${sanitizedName}-${timestamp}`;
    }
}

export const userService = new UserService();
