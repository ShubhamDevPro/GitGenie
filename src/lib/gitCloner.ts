export interface CloneOptions {
    githubUrl: string;
    githubOwner: string;
    githubRepo: string;
    giteaBaseUrl: string;
    giteaOwner: string;
    giteaRepo: string;
    giteaToken: string;
}

/**
 * Service to handle repository cloning via Gitea's API
 * This approach uses Gitea's built-in mirroring feature instead of local git operations
 */
class GitCloner {
    /**
     * Clone GitHub repository to Gitea using mirror functionality
     */
    async cloneRepository(options: CloneOptions): Promise<{ success: boolean; message: string }> {
        const { githubUrl, giteaBaseUrl, giteaOwner, giteaRepo, giteaToken } = options;

        try {
            // Use Gitea's repository mirroring feature
            const mirrorResponse = await this.createMirror(
                giteaBaseUrl,
                giteaOwner,
                giteaRepo,
                githubUrl,
                giteaToken
            );

            if (mirrorResponse.success) {
                // Trigger immediate sync
                await this.syncMirror(giteaBaseUrl, giteaOwner, giteaRepo, giteaToken);

                return {
                    success: true,
                    message: 'Repository successfully cloned and synchronized'
                };
            } else {
                throw new Error(mirrorResponse.error || 'Failed to create mirror');
            }

        } catch (error) {
            console.error('Error during repository cloning:', error);
            return {
                success: false,
                message: `Failed to clone repository: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }

    /**
     * Create a mirror repository in Gitea
     */
    private async createMirror(
        giteaBaseUrl: string,
        owner: string,
        repoName: string,
        githubUrl: string,
        token: string
    ): Promise<{ success: boolean; error?: string }> {
        try {
            const response = await fetch(`${giteaBaseUrl}/api/v1/repos/${owner}/${repoName}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `token ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    mirror_interval: '8h0m0s',
                    mirror: true,
                    clone_addr: githubUrl,
                }),
            });

            if (response.ok) {
                return { success: true };
            } else {
                const errorText = await response.text();
                return {
                    success: false,
                    error: `Gitea API error: ${response.status} ${errorText}`
                };
            }
        } catch (error) {
            return {
                success: false,
                error: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }

    /**
     * Trigger immediate synchronization of mirror
     */
    private async syncMirror(
        giteaBaseUrl: string,
        owner: string,
        repoName: string,
        token: string
    ): Promise<void> {
        try {
            await fetch(`${giteaBaseUrl}/api/v1/repos/${owner}/${repoName}/mirror-sync`, {
                method: 'POST',
                headers: {
                    'Authorization': `token ${token}`,
                    'Content-Type': 'application/json',
                },
            });
            // Don't throw on sync failure as it's optional
        } catch (error) {
            console.warn('Failed to trigger immediate sync:', error);
        }
    }

    /**
     * Alternative: Simple content copy approach for basic repositories
     */
    async copyRepositoryContent(options: CloneOptions): Promise<{ success: boolean; message: string }> {
        const { githubOwner, githubRepo, giteaBaseUrl, giteaOwner, giteaRepo, giteaToken } = options;

        try {
            // Get repository content from GitHub
            const repoInfo = await this.getGitHubRepoInfo(githubOwner, githubRepo);

            if (!repoInfo) {
                throw new Error('Failed to fetch repository information from GitHub');
            }

            // Get the default branch content
            const content = await this.getGitHubRepoContent(githubOwner, githubRepo, repoInfo.default_branch);

            if (content.length === 0) {
                throw new Error('Repository appears to be empty or inaccessible');
            }

            // Upload content to Gitea repository
            const uploadResults = await this.uploadContentToGitea(
                giteaBaseUrl,
                giteaOwner,
                giteaRepo,
                content,
                giteaToken
            );

            if (uploadResults.success) {
                return {
                    success: true,
                    message: `Repository content copied successfully (${uploadResults.filesUploaded} files)`
                };
            } else {
                throw new Error(uploadResults.error || 'Failed to upload content');
            }

        } catch (error) {
            console.error('Error copying repository content:', error);
            return {
                success: false,
                message: `Failed to copy repository: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }

    /**
     * Get repository information from GitHub
     */
    private async getGitHubRepoInfo(owner: string, repo: string): Promise<any> {
        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
            headers: {
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'GitGenie-App',
                ...(process.env.GITHUB_TOKEN && { 'Authorization': `token ${process.env.GITHUB_TOKEN}` })
            },
        });

        if (!response.ok) {
            throw new Error(`GitHub API error: ${response.status}`);
        }

        return await response.json();
    }

    /**
     * Get repository content from GitHub (simplified - gets main files only)
     */
    private async getGitHubRepoContent(owner: string, repo: string, branch: string = 'main'): Promise<any[]> {
        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents?ref=${branch}`, {
            headers: {
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'GitGenie-App',
                ...(process.env.GITHUB_TOKEN && { 'Authorization': `token ${process.env.GITHUB_TOKEN}` })
            },
        });

        if (!response.ok) {
            // Try master branch if main fails
            if (branch === 'main') {
                return this.getGitHubRepoContent(owner, repo, 'master');
            }
            throw new Error(`GitHub API error: ${response.status}`);
        }

        return await response.json();
    }

    /**
     * Upload content to Gitea repository (simplified - uploads main files only)
     */
    private async uploadContentToGitea(
        giteaBaseUrl: string,
        owner: string,
        repo: string,
        content: any[],
        token: string
    ): Promise<{ success: boolean; error?: string; filesUploaded?: number }> {
        let filesUploaded = 0;

        try {
            // Only upload README and important files to avoid API limits
            const importantFiles = content.filter(item =>
                item.type === 'file' &&
                (item.name.toLowerCase().includes('readme') ||
                    item.name.toLowerCase().includes('license') ||
                    item.name.includes('.md') ||
                    item.name.includes('.txt'))
            ).slice(0, 5); // Limit to 5 files

            for (const file of importantFiles) {
                try {
                    const fileResponse = await fetch(file.download_url);
                    const fileContent = await fileResponse.text();

                    const base64Content = Buffer.from(fileContent, 'utf8').toString('base64');

                    const uploadResponse = await fetch(
                        `${giteaBaseUrl}/api/v1/repos/${owner}/${repo}/contents/${file.name}`,
                        {
                            method: 'POST',
                            headers: {
                                'Authorization': `token ${token}`,
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                message: `Add ${file.name} from GitHub`,
                                content: base64Content,
                            }),
                        }
                    );

                    if (uploadResponse.ok) {
                        filesUploaded++;
                    }
                } catch (fileError) {
                    console.warn(`Failed to upload ${file.name}:`, fileError);
                }
            }

            return {
                success: filesUploaded > 0,
                filesUploaded,
                error: filesUploaded === 0 ? 'No files could be uploaded' : undefined
            };

        } catch (error) {
            return {
                success: false,
                error: `Upload error: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }
}

export const gitCloner = new GitCloner();
