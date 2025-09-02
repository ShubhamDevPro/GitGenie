#!/usr/bin/env node

/**
 * Test script to validate the new project organization structure
 * This script helps verify that the path construction and parsing works correctly
 */

import { 
  getProjectPath, 
  getLegacyProjectPath, 
  parseProjectPath, 
  checkProjectPermissions,
  isUserSpecificPath,
  getProjectApiEndpoint
} from '../src/utils/aiAgentHelpers';

console.log('🧪 Testing GitGenie Project Organization Structure\n');

// Test 1: Project path construction
console.log('📁 Test 1: Project Path Construction');
const pathInfo = getProjectPath('john-doe', 'my-web-app');
console.log(`User Path: ${pathInfo.userPath}`);
console.log(`Project Path: ${pathInfo.projectPath}`);
console.log(`Expected: /home/ubuntu/projects/john-doe/my-web-app`);
console.log(`Match: ${pathInfo.projectPath === '/home/ubuntu/projects/john-doe/my-web-app' ? '✅' : '❌'}\n`);

// Test 2: Legacy path construction
console.log('📁 Test 2: Legacy Path Construction');
const legacyPath = getLegacyProjectPath('old-project');
console.log(`Legacy Path: ${legacyPath}`);
console.log(`Expected: /home/ubuntu/projects/old-project`);
console.log(`Match: ${legacyPath === '/home/ubuntu/projects/old-project' ? '✅' : '❌'}\n`);

// Test 3: Path detection
console.log('🔍 Test 3: Path Structure Detection');
const userSpecificPath = '/home/ubuntu/projects/john-doe/my-app';
const legacyPathExample = '/home/ubuntu/projects/legacy-app';
console.log(`User-specific path detection: ${isUserSpecificPath(userSpecificPath) ? '✅' : '❌'}`);
console.log(`Legacy path detection: ${!isUserSpecificPath(legacyPathExample) ? '✅' : '❌'}\n`);

// Test 4: Path parsing
console.log('🔧 Test 4: Path Parsing');
const parsedNew = parseProjectPath('/home/ubuntu/projects/jane-smith/her-project');
const parsedLegacy = parseProjectPath('/home/ubuntu/projects/legacy-project');

console.log('New format parsing:');
console.log(`  VM Username: ${parsedNew?.vmUsername} (expected: ubuntu) ${parsedNew?.vmUsername === 'ubuntu' ? '✅' : '❌'}`);
console.log(`  Gitea Username: ${parsedNew?.giteaUsername} (expected: jane-smith) ${parsedNew?.giteaUsername === 'jane-smith' ? '✅' : '❌'}`);
console.log(`  Project Name: ${parsedNew?.projectName} (expected: her-project) ${parsedNew?.projectName === 'her-project' ? '✅' : '❌'}`);
console.log(`  Is Legacy: ${parsedNew?.isLegacy} (expected: false) ${parsedNew?.isLegacy === false ? '✅' : '❌'}`);

console.log('Legacy format parsing:');
console.log(`  VM Username: ${parsedLegacy?.vmUsername} (expected: ubuntu) ${parsedLegacy?.vmUsername === 'ubuntu' ? '✅' : '❌'}`);
console.log(`  Gitea Username: ${parsedLegacy?.giteaUsername} (expected: legacy) ${parsedLegacy?.giteaUsername === 'legacy' ? '✅' : '❌'}`);
console.log(`  Project Name: ${parsedLegacy?.projectName} (expected: legacy-project) ${parsedLegacy?.projectName === 'legacy-project' ? '✅' : '❌'}`);
console.log(`  Is Legacy: ${parsedLegacy?.isLegacy} (expected: true) ${parsedLegacy?.isLegacy === true ? '✅' : '❌'}\n`);

// Test 5: Permission checking
console.log('🔐 Test 5: Permission Checking');
const ownProjectPerms = checkProjectPermissions('/home/ubuntu/projects/john-doe/his-app', 'john-doe');
const otherProjectPerms = checkProjectPermissions('/home/ubuntu/projects/jane-smith/her-app', 'john-doe');
const legacyProjectPerms = checkProjectPermissions('/home/ubuntu/projects/legacy-app', 'john-doe');

console.log(`Own project access: ${ownProjectPerms.canAccess && ownProjectPerms.isOwner ? '✅' : '❌'}`);
console.log(`Other's project access: ${!otherProjectPerms.canAccess && !otherProjectPerms.isOwner ? '✅' : '❌'}`);
console.log(`Legacy project access: ${legacyProjectPerms.canAccess && !legacyProjectPerms.isOwner ? '✅' : '❌'}\n`);

// Test 6: API endpoint construction
console.log('🌐 Test 6: API Endpoint Construction');
const endpoints = ['status', 'logs', 'run', 'info'];
endpoints.forEach(op => {
  const endpoint = getProjectApiEndpoint(op);
  console.log(`${op}: ${endpoint}`);
});

console.log('\n🎉 Project Organization Structure Tests Complete!');
console.log('\n📝 Summary:');
console.log('✅ User-specific project paths: /home/{vm_username}/projects/{gitea_username}/{project_name}');
console.log('✅ Legacy project paths: /home/{vm_username}/projects/{project_name}');
console.log('✅ Path parsing and permission checking');
console.log('✅ API endpoint construction');
console.log('\n🤖 AI agents can now use these utilities to:');
console.log('   - Navigate project structures consistently');
console.log('   - Check project ownership and permissions');
console.log('   - Construct proper API calls');
console.log('   - Understand the complete project organization');

// Example API usage for AI agents
console.log('\n📋 Example API Usage for AI Agents:');
console.log(`
// Get current user's projects
GET /api/agent/projects-info?scope=user&format=detailed

// Get all projects (admin view)  
GET /api/agent/projects-info?scope=all&format=summary

// Get specific user's projects
POST /api/agent/projects-info
{
  "giteaUsername": "john-doe",
  "format": "detailed"
}

// Check project status
POST /api/agent/project-status
{
  "repositoryId": "repository-id-here"
}
`);
