import { GoogleGenerativeAI } from '@google/generative-ai';
import { NodeSSH } from 'node-ssh';
import path from 'path';

export interface ProjectContext {
  projectPath: string;
  giteaUsername: string;
  projectName: string;
  files: Array<{
    name: string;
    path: string;
    content?: string;
    isDirectory: boolean;
  }>;
  packageJson?: any;
  readme?: string;
  mainFiles: Array<{
    name: string;
    content: string;
    language: string;
  }>;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured');
    }
    
    console.log('Initializing Gemini service with API key:', process.env.GEMINI_API_KEY ? 'Set' : 'Not set');
    
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    // Use the correct model name for the current API version
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  }

  /**
   * Get project context from GCP VM
   */
  async getProjectContext(giteaUsername: string, projectName: string): Promise<ProjectContext> {
    const ssh = new NodeSSH();

    try {
      console.log('Getting project context for:', { giteaUsername, projectName });
      
      // Connect to VM
      console.log('Connecting to VM...');
      await ssh.connect({
        host: process.env.GCP_VM_EXTERNAL_IP!,
        username: process.env.GCP_VM_USERNAME!,
        privateKeyPath: process.env.GCP_VM_SSH_KEY_PATH!
      });
      console.log('Connected to VM successfully');

      const projectPath = `/home/${process.env.GCP_VM_USERNAME}/projects/${giteaUsername}/${projectName}`;
      console.log('Project path:', projectPath);
      
      // Check if project exists
      const projectExists = await ssh.execCommand(`test -d ${projectPath} && echo "exists" || echo "not_found"`);
      console.log('Project exists check:', projectExists.stdout.trim());
      
      if (projectExists.stdout.trim() === 'not_found') {
        throw new Error(`Project not found at path: ${projectPath}`);
      }

      // Get project file structure
      console.log('Getting file structure...');
      const filesResult = await ssh.execCommand(`find ${projectPath} -type f -name "*.py" -o -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" -o -name "*.json" -o -name "*.md" -o -name "*.txt" -o -name "*.yml" -o -name "*.yaml" -o -name "*.html" -o -name "*.css" -o -name "Dockerfile" -o -name "requirements.txt" | head -50`);
      
      console.log('Files found:', filesResult.stdout ? 'Yes' : 'None');
      const filePaths = filesResult.stdout.trim().split('\n').filter(p => p);
      console.log('File paths count:', filePaths.length);
      
      const files: ProjectContext['files'] = [];
      const mainFiles: ProjectContext['mainFiles'] = [];
      let packageJson: any = null;
      let readme: string = '';

      // Read important files
      for (const filePath of filePaths) {
        const fileName = path.basename(filePath);
        const relativePath = filePath.replace(projectPath + '/', '');
        
        try {
          // Read file content for analysis
          const contentResult = await ssh.execCommand(`cat ${filePath} 2>/dev/null | head -100`); // Limit to first 100 lines
          const content = contentResult.stdout;

          files.push({
            name: fileName,
            path: relativePath,
            content: content.length > 5000 ? content.substring(0, 5000) + '...[truncated]' : content,
            isDirectory: false
          });

          // Collect main files for context
          if (fileName.toLowerCase().includes('main') || 
              fileName.toLowerCase().includes('app') || 
              fileName.toLowerCase().includes('index') ||
              fileName.toLowerCase() === 'readme.md' ||
              fileName.toLowerCase() === 'package.json' ||
              fileName.toLowerCase() === 'requirements.txt') {
            
            const language = this.getFileLanguage(fileName);
            
            if (fileName.toLowerCase() === 'package.json') {
              try {
                packageJson = JSON.parse(content);
              } catch (e) {
                console.warn('Failed to parse package.json');
              }
            } else if (fileName.toLowerCase() === 'readme.md') {
              readme = content;
            } else if (content.trim()) {
              mainFiles.push({
                name: fileName,
                content: content.length > 3000 ? content.substring(0, 3000) + '...[truncated]' : content,
                language
              });
            }
          }
        } catch (error) {
          // Skip files that can't be read
          console.warn(`Could not read file ${fileName}:`, error);
          files.push({
            name: fileName,
            path: relativePath,
            isDirectory: false
          });
        }
      }

      // Get directory structure
      const dirResult = await ssh.execCommand(`find ${projectPath} -type d | head -20`);
      const directories = dirResult.stdout.trim().split('\n')
        .filter(p => p && p !== projectPath)
        .map(dirPath => ({
          name: path.basename(dirPath),
          path: dirPath.replace(projectPath + '/', ''),
          isDirectory: true
        }));

      files.push(...directories);

      console.log('Project context loaded:', {
        totalFiles: files.length,
        mainFiles: mainFiles.length,
        hasPackageJson: !!packageJson,
        hasReadme: !!readme
      });

      return {
        projectPath,
        giteaUsername,
        projectName,
        files,
        packageJson,
        readme,
        mainFiles
      };

    } catch (error) {
      console.error('Error getting project context:', error);
      throw error;
    } finally {
      ssh.dispose();
    }
  }

  /**
   * Generate AI response with project context
   */
  async generateResponse(
    messages: ChatMessage[],
    projectContext: ProjectContext
  ): Promise<string> {
    try {
      console.log('Generating response with context:', {
        projectName: projectContext.projectName,
        filesCount: projectContext.files.length,
        hasPackageJson: !!projectContext.packageJson,
        messagesCount: messages.length
      });

      // Build context prompt
      const contextPrompt = this.buildContextPrompt(projectContext);
      
      // Build conversation history
      const conversationHistory = messages.map(msg => 
        `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
      ).join('\n\n');

      // Get the latest user message
      const latestMessage = messages[messages.length - 1];
      if (latestMessage.role !== 'user') {
        throw new Error('Latest message must be from user');
      }

      const fullPrompt = `${contextPrompt}

CONVERSATION HISTORY:
${conversationHistory}

Please respond to the user's question about their project. Keep your response focused on the project context provided above. Be helpful, accurate, and concise.`;

      console.log('Sending prompt to Gemini (first 500 chars):', fullPrompt.substring(0, 500));

      const result = await this.model.generateContent(fullPrompt);
      const response = await result.response;
      
      const responseText = response.text();
      console.log('Received response from Gemini:', responseText ? 'Success' : 'Empty response');
      
      if (!responseText || responseText.trim() === '') {
        throw new Error('Received empty response from Gemini API');
      }
      
      // Filter out sensitive information from the response
      const filteredResponse = this.filterSensitiveInformation(responseText);
      
      return filteredResponse;
    } catch (error) {
      console.error('Error generating AI response:', error);
      
      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('API key')) {
          throw new Error('Invalid Gemini API key. Please check your GEMINI_API_KEY environment variable.');
        } else if (error.message.includes('quota')) {
          throw new Error('Gemini API quota exceeded. Please try again later.');
        } else if (error.message.includes('safety')) {
          throw new Error('Response was blocked due to safety filters. Please rephrase your question.');
        } else {
          throw new Error(`Gemini API error: ${error.message}`);
        }
      }
      
      throw new Error('Failed to generate AI response. Please try again.');
    }
  }

  /**
   * Build context prompt from project information
   */
  private buildContextPrompt(context: ProjectContext): string {
    let prompt = `You are an AI assistant helping a developer with their project. Here's the context of their current project:

PROJECT INFORMATION:
- Project Name: ${context.projectName}
- Owner: ${context.giteaUsername}
- Project Path: ${context.projectPath}

`;

    // Add package.json info if available
    if (context.packageJson) {
      prompt += `PACKAGE.JSON INFORMATION:
- Name: ${context.packageJson.name || 'N/A'}
- Version: ${context.packageJson.version || 'N/A'}
- Description: ${context.packageJson.description || 'N/A'}
- Main Dependencies: ${context.packageJson.dependencies ? Object.keys(context.packageJson.dependencies).slice(0, 10).join(', ') : 'None'}
- Scripts: ${context.packageJson.scripts ? Object.keys(context.packageJson.scripts).join(', ') : 'None'}

`;
    }

    // Add README if available (but limit size)
    if (context.readme) {
      const readmePreview = context.readme.substring(0, 800);
      prompt += `README CONTENT:
${readmePreview}${context.readme.length > 800 ? '...[truncated]' : ''}

`;
    }

    // Add main files content (but be more conservative with size)
    if (context.mainFiles.length > 0) {
      prompt += `MAIN PROJECT FILES:
`;
      // Limit to first 3 main files to avoid token issues
      context.mainFiles.slice(0, 3).forEach(file => {
        const fileContent = file.content.substring(0, 1000); // Limit each file content
        prompt += `
File: ${file.name} (${file.language})
Content:
${fileContent}${file.content.length > 1000 ? '...[truncated]' : ''}

`;
      });
    }

    // Add file structure (simplified)
    if (context.files.length > 0) {
      prompt += `PROJECT STRUCTURE:
`;
      const maxFiles = 20; // Limit to avoid token limits
      context.files.slice(0, maxFiles).forEach(file => {
        if (file.isDirectory) {
          prompt += `📁 ${file.path}/\n`;
        } else {
          prompt += `📄 ${file.path}\n`;
        }
      });
      
      if (context.files.length > maxFiles) {
        prompt += `... and ${context.files.length - maxFiles} more files\n`;
      }
    }

    prompt += `
INSTRUCTIONS:
- You are specifically helping with this project only
- Answer questions about the code, structure, dependencies, and functionality
- Provide helpful suggestions for improvements or debugging
- If asked about files not in the context, politely mention you can only see the files listed above
- Keep responses focused and practical
- Use markdown formatting for code snippets when appropriate
- IMPORTANT: Do not mention specific port numbers, IP addresses, debug settings, or server configuration details
- Instead use generic terms like "configured port", "localhost", "debug mode", etc.
- Focus on code functionality and development guidance rather than deployment details

`;

    console.log('Built context prompt length:', prompt.length);
    
    // If prompt is too long, provide a simplified version
    if (prompt.length > 8000) {
      console.log('Prompt too long, using simplified version');
      return this.buildSimplifiedPrompt(context);
    }

    return prompt;
  }

  /**
   * Build a simplified prompt when the full context is too large
   */
  private buildSimplifiedPrompt(context: ProjectContext): string {
    return `You are an AI assistant helping a developer with their project.

PROJECT: ${context.projectName}
OWNER: ${context.giteaUsername}
FILES: ${context.files.length} files found
${context.packageJson ? `DEPENDENCIES: ${Object.keys(context.packageJson.dependencies || {}).slice(0, 5).join(', ')}` : ''}

This is a ${this.detectProjectType(context)} project. Please help the user with questions about their code, debugging, and improvements.

IMPORTANT: Do not mention specific port numbers, IP addresses, debug settings, or server configuration details. Focus on code functionality and development guidance.`;
  }

  /**
   * Detect project type from context
   */
  private detectProjectType(context: ProjectContext): string {
    if (context.packageJson) return 'Node.js/JavaScript';
    if (context.files.some(f => f.name.endsWith('.py'))) return 'Python';
    if (context.files.some(f => f.name.endsWith('.java'))) return 'Java';
    if (context.files.some(f => f.name.endsWith('.php'))) return 'PHP';
    return 'software development';
  }

  /**
   * Filter out sensitive information from AI responses
   */
  private filterSensitiveInformation(text: string): string {
    let filteredText = text;

    // Remove port numbers (common patterns)
    filteredText = filteredText.replace(/port\s+\d+/gi, 'the configured port');
    filteredText = filteredText.replace(/:\d{2,5}/g, ':PORT');
    filteredText = filteredText.replace(/on port \d+/gi, 'on the configured port');
    filteredText = filteredText.replace(/listening on \d+/gi, 'listening on the configured port');

    // Remove debug settings
    filteredText = filteredText.replace(/debug\s*=\s*true/gi, 'debug mode');
    filteredText = filteredText.replace(/debug=true/gi, 'debug mode');
    filteredText = filteredText.replace(/--debug/gi, 'debug flag');

    // Remove IP addresses
    filteredText = filteredText.replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, '[IP_ADDRESS]');
    filteredText = filteredText.replace(/0\.0\.0\.0/gi, 'localhost');
    filteredText = filteredText.replace(/127\.0\.0\.1/gi, 'localhost');

    // Remove localhost with ports
    filteredText = filteredText.replace(/localhost:\d+/gi, 'localhost');
    filteredText = filteredText.replace(/127\.0\.0\.1:\d+/gi, 'localhost');

    // Remove specific development server patterns
    filteredText = filteredText.replace(/running on http:\/\/[^\s]+/gi, 'running locally');
    filteredText = filteredText.replace(/server running at [^\s]+/gi, 'server running locally');

    // Remove file paths that might contain sensitive info
    filteredText = filteredText.replace(/\/home\/[^\/\s]+\/projects\/[^\s]*/gi, 'your project directory');
    filteredText = filteredText.replace(/\/tmp\/[^\s]*/gi, 'temporary directory');

    // Remove VM or server specific paths
    filteredText = filteredText.replace(/\/var\/[^\s]*/gi, 'system directory');
    filteredText = filteredText.replace(/\/opt\/[^\s]*/gi, 'installation directory');

    return filteredText;
  }

  /**
   * Determine file language based on extension
   */
  private getFileLanguage(fileName: string): string {
    const ext = path.extname(fileName).toLowerCase();
    const languageMap: Record<string, string> = {
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.py': 'python',
      '.html': 'html',
      '.css': 'css',
      '.json': 'json',
      '.md': 'markdown',
      '.yml': 'yaml',
      '.yaml': 'yaml',
      '.txt': 'text'
    };
    
    return languageMap[ext] || 'text';
  }
}

export const geminiService = new GeminiService();
