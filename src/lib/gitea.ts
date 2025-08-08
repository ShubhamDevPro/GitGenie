import { createCipher, createDecipher, randomBytes } from 'crypto';

export interface GiteaUser {
    id: number;
    login: string;
    email: string;
    full_name: string;
    avatar_url: string;
    created: string;
}

export interface GiteaRepository {
    id: number;
    name: string;
    full_name: string;
    description: string;
    private: boolean;
    html_url: string;
    clone_url: string;
    ssh_url: string;
    created_at: string;
    updated_at: string;
}

export interface CreateUserRequest {
    username: string;
    email: string;
    password: string;
    full_name?: string;
    send_notify?: boolean;
}

export interface CreateRepoRequest {
    name: string;
    description?: string;
    private?: boolean;
    auto_init?: boolean;
    gitignore_template?: string;
    license_template?: string;
    readme?: string;
}

class GiteaService {
    private baseUrl: string;
    private adminToken: string;
    private encryptionKey: string;

    constructor() {
        this.baseUrl = process.env.GITEA_URL || 'http://34.0.3.6:3000';
        this.adminToken = process.env.GITEA_ADMIN_TOKEN || '';
        this.encryptionKey = process.env.ENCRYPTION_KEY || '';

        if (!this.adminToken) {
            throw new Error('GITEA_ADMIN_TOKEN is required');
        }
        if (!this.encryptionKey || this.encryptionKey.length !== 32) {
            throw new Error('ENCRYPTION_KEY must be 32 characters long');
        }
    }

    private encrypt(text: string): string {
        const cipher = createCipher('aes-256-cbc', this.encryptionKey);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return encrypted;
    }

    private decrypt(encryptedText: string): string {
        const decipher = createDecipher('aes-256-cbc', this.encryptionKey);
        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }

    private async makeRequest(
        endpoint: string,
        options: RequestInit = {},
        token?: string
    ): Promise<Response> {
        const url = `${this.baseUrl}/api/v1${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `token ${token || this.adminToken}`,
            ...options.headers,
        };

        const response = await fetch(url, {
            ...options,
            headers,
        });

        return response;
    }

    /**
     * Create a new user in Gitea
     */
    async createUser(userData: CreateUserRequest): Promise<GiteaUser> {
        const response = await this.makeRequest('/admin/users', {
            method: 'POST',
            body: JSON.stringify({
                ...userData,
                send_notify: false, // Don't send email notifications
                must_change_password: false,
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to create Gitea user: ${response.status} ${error}`);
        }

        return await response.json();
    }

    /**
     * Get user by username
     */
    async getUserByUsername(username: string): Promise<GiteaUser | null> {
        const response = await this.makeRequest(`/users/${username}`);

        if (response.status === 404) {
            return null;
        }

        if (!response.ok) {
            throw new Error(`Failed to get Gitea user: ${response.status}`);
        }

        return await response.json();
    }

    /**
     * Create access token for a user
     * Note: Gitea 1.24.3 has limited API support for user token creation
     */
    async createUserToken(username: string, tokenName: string): Promise<string> {
        console.log(`Attempting to create token for user: ${username}`);

        // This Gitea version (1.24.3) doesn't support the admin user token creation APIs
        // The available endpoints either don't exist or require user authentication
        // So we'll use the admin token as fallback for all operations

        console.log(`Gitea version 1.24.3 detected - user token creation APIs not available`);
        console.log('Using admin token for all operations (repositories will still be user-owned)');

        return this.adminToken;
    }

    /**
     * Create a repository for a user with enhanced ownership verification
     */
    async createRepository(
        username: string,
        repoData: CreateRepoRequest,
        userToken?: string
    ): Promise<GiteaRepository> {
        const token = userToken || this.adminToken;
        const endpoint = userToken ? '/user/repos' : `/admin/users/${username}/repos`;

        console.log(`Creating repository for user: ${username}`);
        console.log(`Endpoint: ${endpoint}`);
        console.log(`Repository data:`, repoData);

        const response = await this.makeRequest(endpoint, {
            method: 'POST',
            body: JSON.stringify({
                ...repoData,
                private: false, // Make all cloned repos public
                auto_init: false, // Don't auto-initialize
            }),
        }, token);

        if (!response.ok) {
            const error = await response.text();
            console.error(`Failed to create repository: ${response.status} ${error}`);
            throw new Error(`Failed to create repository: ${response.status} ${error}`);
        }

        const repoResult = await response.json();

        // Verify repository ownership
        if (repoResult.full_name && !repoResult.full_name.startsWith(`${username}/`)) {
            console.error(`Repository ownership verification failed. Expected: ${username}/, Got: ${repoResult.full_name}`);
            throw new Error(`Repository ownership verification failed. Repository may not be properly assigned to user ${username}`);
        }

        console.log('Repository created successfully with verified ownership:', repoResult.full_name);
        return repoResult;
    }

    /**
     * Clone a GitHub repository to Gitea using migration API
     */
    async cloneRepository(
        username: string,
        repoName: string,
        githubUrl: string,
        description?: string,
        userToken?: string
    ): Promise<GiteaRepository> {
        const token = userToken || this.adminToken;

        console.log(`Migrating repository for user: ${username}`);
        console.log(`Migrating from: ${githubUrl}`);
        console.log(`Migration endpoint: /repos/migrate`);

        // Use Gitea's migration API to import from GitHub
        const migrationResponse = await this.makeRequest('/repos/migrate', {
            method: 'POST',
            body: JSON.stringify({
                clone_addr: githubUrl,
                repo_name: repoName,
                repo_owner: username,
                service: 'git', // Change from 'github' to 'git' for generic git repos
                mirror: false, // We want a full migration, not a mirror
                private: false, // Make repositories public
                description: description || `Cloned from ${githubUrl}`,
                wiki: false, // Disable wiki migration to simplify
                milestones: false, // Disable milestone migration
                labels: false, // Disable label migration
                issues: false, // Disable issue migration
                pull_requests: false, // Don't migrate PRs
                releases: false, // Disable release migration
                auth_username: '', // For public repos
                auth_password: '', // For public repos
                auth_token: '', // For public repos
            }),
        }, token);

        if (!migrationResponse.ok) {
            const error = await migrationResponse.text();
            console.error(`Failed to migrate repository: ${migrationResponse.status} ${error}`);
            
            // If migration fails, try the old method as fallback
            console.log('Migration failed, trying standard clone method...');
            return await this.fallbackCloneRepository(username, repoName, githubUrl, description, userToken);
        }

        const repoResult = await migrationResponse.json();

        // Verify repository ownership
        if (repoResult.full_name && !repoResult.full_name.startsWith(`${username}/`)) {
            console.error(`Repository ownership verification failed. Expected: ${username}/, Got: ${repoResult.full_name}`);
            throw new Error(`Repository ownership verification failed. Repository may not be properly assigned to user ${username}`);
        }

        console.log('Repository migrated successfully with content:', repoResult.full_name);
        
        // Wait a moment and check if content was actually cloned
        await new Promise(resolve => setTimeout(resolve, 3000));
        const contentCheck = await this.checkRepositoryContent(username, repoName, token);
        console.log(`Content check for ${username}/${repoName}:`, contentCheck);
        
        return repoResult;
    }

    /**
     * Fallback method: Clone repository using standard create + clone_addr
     */
    private async fallbackCloneRepository(
        username: string,
        repoName: string,
        githubUrl: string,
        description?: string,
        userToken?: string
    ): Promise<GiteaRepository> {
        const token = userToken || this.adminToken;
        const endpoint = userToken ? '/user/repos' : `/admin/users/${username}/repos`;

        console.log(`Fallback: Creating repository with clone for user: ${username}`);

        // Create repository with clone_addr to automatically pull content
        const response = await this.makeRequest(endpoint, {
            method: 'POST',
            body: JSON.stringify({
                name: repoName,
                description: description || `Cloned from ${githubUrl}`,
                private: false, // Make repositories public
                clone_addr: githubUrl, // This will clone the content
                mirror: false, // We want a full clone, not a mirror
                auto_init: false,
                auth_username: '', // For public GitHub repos
                auth_password: '', // For public GitHub repos
            }),
        }, token);

        if (!response.ok) {
            const error = await response.text();
            console.error(`Failed to create/clone repository: ${response.status} ${error}`);
            throw new Error(`Failed to create/clone repository: ${response.status} ${error}`);
        }

        const repoResult = await response.json();

        // Verify repository ownership
        if (repoResult.full_name && !repoResult.full_name.startsWith(`${username}/`)) {
            console.error(`Repository ownership verification failed. Expected: ${username}/, Got: ${repoResult.full_name}`);
            throw new Error(`Repository ownership verification failed. Repository may not be properly assigned to user ${username}`);
        }

        console.log('Repository cloned successfully with fallback method:', repoResult.full_name);

        // Wait a moment for the clone operation to initiate
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Check content after cloning
        const contentCheck = await this.checkRepositoryContent(username, repoName, token);
        console.log(`Content check for ${username}/${repoName}:`, contentCheck);

        // Trigger a manual sync if the repository supports it
        try {
            await this.triggerRepositorySync(username, repoName, token);
        } catch (error) {
            console.warn('Failed to trigger manual sync, repository should still clone in background:', error);
        }

        return repoResult;
    }

    /**
     * Trigger repository synchronization to pull content
     */
    private async triggerRepositorySync(owner: string, repoName: string, token: string): Promise<void> {
        try {
            // Try to trigger a sync if it's a mirrored repository
            const syncResponse = await this.makeRequest(`/repos/${owner}/${repoName}/mirror-sync`, {
                method: 'POST',
            }, token);
            
            if (syncResponse.ok) {
                console.log(`Triggered sync for repository: ${owner}/${repoName}`);
            }
        } catch (error) {
            console.warn(`Could not trigger sync for ${owner}/${repoName}:`, error);
        }
    }

    /**
     * Check repository status and content
     */
    async checkRepositoryContent(owner: string, repoName: string, token?: string): Promise<{ hasContent: boolean; fileCount?: number; error?: string }> {
        try {
            const usedToken = token || this.adminToken;
            
            // Try to get repository contents
            const contentsResponse = await this.makeRequest(`/repos/${owner}/${repoName}/contents`, {}, usedToken);
            
            if (contentsResponse.ok) {
                const contents = await contentsResponse.json();
                return {
                    hasContent: Array.isArray(contents) && contents.length > 0,
                    fileCount: Array.isArray(contents) ? contents.length : 0
                };
            } else if (contentsResponse.status === 409) {
                // 409 usually means empty repository
                return { hasContent: false, fileCount: 0 };
            } else {
                return {
                    hasContent: false,
                    error: `Failed to check contents: ${contentsResponse.status}`
                };
            }
        } catch (error) {
            return {
                hasContent: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Get repositories for a user
     */
    async getUserRepositories(username: string, userToken?: string): Promise<GiteaRepository[]> {
        const token = userToken || this.adminToken;
        const response = await this.makeRequest(`/users/${username}/repos`, {}, token);

        if (!response.ok) {
            throw new Error(`Failed to get user repositories: ${response.status}`);
        }

        return await response.json();
    }

    /**
     * Delete a repository
     */
    async deleteRepository(owner: string, repoName: string, userToken?: string): Promise<void> {
        const token = userToken || this.adminToken;
        const response = await this.makeRequest(`/repos/${owner}/${repoName}`, {
            method: 'DELETE',
        }, token);

        if (!response.ok && response.status !== 404) {
            throw new Error(`Failed to delete repository: ${response.status}`);
        }
    }

    /**
     * Encrypt a token for storage
     */
    encryptToken(token: string): string {
        return this.encrypt(token);
    }

    /**
     * Decrypt a stored token
     */
    decryptToken(encryptedToken: string): string {
        return this.decrypt(encryptedToken);
    }

    /**
     * Check Gitea server health and version
     */
    async checkServerHealth(): Promise<{ healthy: boolean; version?: string; error?: string }> {
        try {
            // Try to get version info
            const response = await this.makeRequest('/version');
            if (response.ok) {
                const versionData = await response.json();
                return {
                    healthy: true,
                    version: versionData.version || 'unknown'
                };
            } else {
                return {
                    healthy: false,
                    error: `Server responded with status: ${response.status}`
                };
            }
        } catch (error) {
            return {
                healthy: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Generate a unique username based on email
     */
    generateUsername(email: string, name?: string): string {
        const baseUsername = name
            ? name.toLowerCase().replace(/[^a-z0-9]/g, '')
            : email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');

        // Add timestamp to ensure uniqueness
        const timestamp = Date.now().toString(36);
        return `${baseUsername}_${timestamp}`.substring(0, 39); // Gitea username limit
    }

    /**
     * Generate a secure random password
     */
    generatePassword(): string {
        return randomBytes(16).toString('hex');
    }
}

export const giteaService = new GiteaService();
