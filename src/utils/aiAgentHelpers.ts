/**
 * Utility functions for AI agents to work with the GitGenie project structure
 * These functions help AI agents understand and navigate the project organization on the GCP VM
 */

export interface ProjectInfo {
  name: string;
  path: string;
  isRunning: boolean;
  lastModified?: string;
}

export interface UserProjectInfo {
  username: string;
  userPath: string;
  projects: ProjectInfo[];
}

export interface ProjectPathInfo {
  userPath: string;
  projectPath: string;
  giteaUsername: string;
  projectName: string;
}

/**
 * Constructs the VM project path following GitGenie's organization structure
 * @param giteaUsername - The Gitea username of the project owner
 * @param projectName - The name of the project
 * @param vmUsername - The VM username (defaults to 'ubuntu')
 * @returns Complete project path information
 */
export function getProjectPath(
  giteaUsername: string, 
  projectName: string, 
  vmUsername: string = 'ubuntu'
): ProjectPathInfo {
  const userPath = `/home/${vmUsername}/projects/${giteaUsername}`;
  const projectPath = `${userPath}/${projectName}`;
  
  return {
    userPath,
    projectPath,
    giteaUsername,
    projectName
  };
}

/**
 * Constructs the legacy project path (for backward compatibility)
 * @param projectName - The name of the project
 * @param vmUsername - The VM username (defaults to 'ubuntu')
 * @returns Legacy project path
 */
export function getLegacyProjectPath(projectName: string, vmUsername: string = 'ubuntu'): string {
  return `/home/${vmUsername}/projects/${projectName}`;
}

/**
 * Determines if a path follows the new user-specific structure
 * @param path - The project path to check
 * @returns True if the path follows the user-specific structure
 */
export function isUserSpecificPath(path: string): boolean {
  // Pattern: /home/{vm_username}/projects/{gitea_username}/{project_name}
  const pathParts = path.split('/');
  return pathParts.length >= 6 && pathParts[4] === 'projects';
}

/**
 * Extracts user and project information from a project path
 * @param path - The project path to parse
 * @returns Parsed path information or null if invalid
 */
export function parseProjectPath(path: string): {
  vmUsername: string;
  giteaUsername: string;
  projectName: string;
  isLegacy: boolean;
} | null {
  const pathParts = path.split('/').filter(part => part);
  
  if (pathParts.length < 4) return null;
  
  const vmUsername = pathParts[1]; // home/{vm_username}
  
  if (pathParts[2] !== 'projects') return null;
  
  if (pathParts.length === 4) {
    // Legacy format: /home/{vm_username}/projects/{project_name}
    return {
      vmUsername,
      giteaUsername: 'legacy',
      projectName: pathParts[3],
      isLegacy: true
    };
  } else if (pathParts.length === 5) {
    // New format: /home/{vm_username}/projects/{gitea_username}/{project_name}
    return {
      vmUsername,
      giteaUsername: pathParts[3],
      projectName: pathParts[4],
      isLegacy: false
    };
  }
  
  return null;
}

/**
 * AI Agent helper to understand project ownership and permissions
 * @param projectPath - The project path to check
 * @param currentUserGiteaUsername - The current user's Gitea username
 * @returns Permission information
 */
export function checkProjectPermissions(
  projectPath: string, 
  currentUserGiteaUsername: string
): {
  canAccess: boolean;
  isOwner: boolean;
  reason: string;
} {
  const parsed = parseProjectPath(projectPath);
  
  if (!parsed) {
    return {
      canAccess: false,
      isOwner: false,
      reason: 'Invalid project path format'
    };
  }
  
  if (parsed.isLegacy) {
    return {
      canAccess: true,
      isOwner: false,
      reason: 'Legacy project - ownership unclear'
    };
  }
  
  const isOwner = parsed.giteaUsername === currentUserGiteaUsername;
  
  return {
    canAccess: isOwner,
    isOwner,
    reason: isOwner ? 'User owns this project' : 'Project belongs to another user'
  };
}

/**
 * Helper for AI agents to construct API calls for project operations
 * @param operation - The operation to perform ('status', 'logs', 'stop', 'run')
 * @param repositoryId - The repository ID from the database
 * @returns API endpoint URL
 */
export function getProjectApiEndpoint(operation: string, repositoryId?: string): string {
  const baseUrl = '/api/agent';
  
  switch (operation) {
    case 'status':
      return `${baseUrl}/project-status`;
    case 'logs':
      return `${baseUrl}/project-logs`;
    case 'run':
      return `${baseUrl}/run-project`;
    case 'info':
      return `${baseUrl}/projects-info`;
    default:
      throw new Error(`Unknown operation: ${operation}`);
  }
}

/**
 * Helper for AI agents to understand the project structure summary
 * @param allProjects - Array of user project information
 * @returns Summary statistics
 */
export function getProjectSummary(allProjects: UserProjectInfo[]): {
  totalUsers: number;
  totalProjects: number;
  runningProjects: number;
  userBreakdown: Array<{
    username: string;
    projectCount: number;
    runningCount: number;
  }>;
} {
  return {
    totalUsers: allProjects.length,
    totalProjects: allProjects.reduce((sum, user) => sum + user.projects.length, 0),
    runningProjects: allProjects.reduce((sum, user) => 
      sum + user.projects.filter(p => p.isRunning).length, 0
    ),
    userBreakdown: allProjects.map(user => ({
      username: user.username,
      projectCount: user.projects.length,
      runningCount: user.projects.filter(p => p.isRunning).length
    }))
  };
}

/**
 * Example usage for AI agents:
 * 
 * // Get project path for a user
 * const pathInfo = getProjectPath('john-doe', 'my-web-app');
 * console.log(pathInfo.projectPath); // /home/ubuntu/projects/john-doe/my-web-app
 * 
 * // Check if user can access a project
 * const permissions = checkProjectPermissions(
 *   '/home/ubuntu/projects/jane-smith/her-app',
 *   'john-doe'
 * );
 * console.log(permissions.canAccess); // false
 * 
 * // Parse a project path
 * const parsed = parseProjectPath('/home/ubuntu/projects/john-doe/my-app');
 * console.log(parsed?.giteaUsername); // john-doe
 * 
 * // Get API endpoint for operations
 * const statusEndpoint = getProjectApiEndpoint('status');
 * // Make API call: POST /api/agent/project-status { repositoryId: 'xxx' }
 */
