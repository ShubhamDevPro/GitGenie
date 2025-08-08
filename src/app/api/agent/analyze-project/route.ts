import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import OpenAI from 'openai';
import fs from 'fs/promises';
import path from 'path';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ProjectAnalysis {
  projectType: string;
  framework: string;
  buildCommands: string[];
  runCommands: string[];
  dependencies: string[];
  ports: {
    frontend?: number;
    backend?: number;
  };
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { projectPath, repositoryId } = body;

    let targetPath: string;

    if (repositoryId) {
      // Find the repository in the database
      const repository = await prisma.project.findFirst({
        where: {
          id: repositoryId,
          userId: session.user.id
        }
      });

      if (!repository) {
        return NextResponse.json({ 
          error: 'Repository not found or access denied' 
        }, { status: 404 });
      }

      if (!repository.giteaCloneUrl) {
        return NextResponse.json({ 
          error: 'Repository clone URL not available' 
        }, { status: 400 });
      }

      // For now, we'll use a temporary clone or existing clone path
      // In a real implementation, you might want to clone the repo first
      targetPath = projectPath || '/tmp/project-analysis';
    } else if (projectPath) {
      targetPath = projectPath;
    } else {
      return NextResponse.json({ 
        error: 'Either projectPath or repositoryId is required' 
      }, { status: 400 });
    }

    // Analyze the project using OpenAI
    const analysis = await analyzeProjectWithAI(targetPath);
    
    if (!analysis) {
      return NextResponse.json({
        success: false,
        error: 'Failed to analyze project structure'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      analysis
    });
  } catch (error) {
    console.error('Error analyzing project:', error);
    return NextResponse.json({ 
      error: 'Failed to analyze project' 
    }, { status: 500 });
  }
}

async function analyzeProjectWithAI(projectPath: string): Promise<ProjectAnalysis | null> {
  try {
    // Read project structure and key files
    const projectStructure = await getProjectStructure(projectPath);
    const packageJsonContent = await getPackageJsonContent(projectPath);
    
    const prompt = `
Analyze this project structure and provide build/run commands for Ubuntu Linux VM deployment:

Project Structure:
${projectStructure}

Package.json content:
${packageJsonContent}

Please analyze this project and provide a JSON response with the following structure:
{
  "projectType": "type (e.g., 'react', 'next.js', 'node.js', 'fullstack', 'vue', 'angular', 'express', 'fastify')",
  "framework": "specific framework or technology stack",
  "buildCommands": ["array of setup commands - typically just npm install"],
  "runCommands": ["array of development server commands"],
  "dependencies": ["key dependencies identified"],
  "ports": {
    "frontend": 8000,
    "backend": 9000
  }
}

CRITICAL REQUIREMENTS FOR UBUNTU LINUX VM:
1. Use development commands (npm run dev, npm start) - NEVER npm run build for faster startup
2. Commands will run on Ubuntu Linux VM, not Windows
3. Include proper environment variables for external access (HOST=0.0.0.0)
4. buildCommands should typically be ["npm install"] or ["npm ci"] only
5. runCommands should prioritize development servers: ["npm run dev"] for Next.js/React/Vue
6. For backend projects, use ["npm start"] or the appropriate start script
7. Ensure ports bind to 0.0.0.0 for external VM access

Consider:
- Package.json scripts and dependencies
- Project structure (frontend/backend folders, src structure)  
- Framework-specific development patterns
- Ubuntu Linux compatibility

Respond with only the JSON object, no additional text.
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are an expert developer who analyzes project structures and generates build/run commands for Ubuntu Linux VM deployment. Prioritize development server commands over build commands for faster startup. Always respond with valid JSON only."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 1000
    });

    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error('No response from OpenAI');
    }

    // Parse the JSON response
    const analysis: ProjectAnalysis = JSON.parse(responseContent);
    
    // Validate the response structure
    if (!analysis.projectType || !analysis.runCommands || !Array.isArray(analysis.runCommands)) {
      throw new Error('Invalid analysis response structure');
    }

    return analysis;
  } catch (error) {
    console.error('Error in AI project analysis:', error);
    return null;
  }
}

async function getProjectStructure(projectPath: string, maxDepth: number = 2, currentDepth: number = 0): Promise<string> {
  try {
    if (currentDepth > maxDepth) {
      return '';
    }

    const items = await fs.readdir(projectPath, { withFileTypes: true });
    let structure = '';

    for (const item of items) {
      // Skip common ignored directories and files
      if (item.name.startsWith('.') || 
          ['node_modules', 'dist', 'build', '.git', 'coverage'].includes(item.name)) {
        continue;
      }

      const indent = '  '.repeat(currentDepth);
      
      if (item.isDirectory()) {
        structure += `${indent}${item.name}/\n`;
        // Recursively get subdirectory structure
        const subPath = path.join(projectPath, item.name);
        structure += await getProjectStructure(subPath, maxDepth, currentDepth + 1);
      } else {
        structure += `${indent}${item.name}\n`;
      }
    }

    return structure;
  } catch (error) {
    console.error('Error reading project structure:', error);
    return 'Error reading project structure';
  }
}

async function getPackageJsonContent(projectPath: string): Promise<string> {
  try {
    const packageJsonPath = path.join(projectPath, 'package.json');
    const content = await fs.readFile(packageJsonPath, 'utf-8');
    
    // Parse and return key sections only to reduce token usage
    const packageData = JSON.parse(content);
    const relevantData = {
      name: packageData.name,
      scripts: packageData.scripts,
      dependencies: packageData.dependencies,
      devDependencies: packageData.devDependencies
    };
    
    return JSON.stringify(relevantData, null, 2);
  } catch (error) {
    // Try to find package.json in subdirectories (frontend/backend)
    try {
      const frontendPackage = await fs.readFile(path.join(projectPath, 'frontend', 'package.json'), 'utf-8');
      const backendPackage = await fs.readFile(path.join(projectPath, 'backend', 'package.json'), 'utf-8');
      
      return `Frontend package.json:\n${frontendPackage}\n\nBackend package.json:\n${backendPackage}`;
    } catch {
      return 'No package.json found';
    }
  }
}
