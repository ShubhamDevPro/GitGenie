import { OpenAI } from 'openai';

// Dynamically import node-ssh only on server side
const getNodeSSH = async () => {
  if (typeof window !== 'undefined') {
    throw new Error('SSH operations are only available on the server side');
  }
  const { NodeSSH } = await import('node-ssh');
  return NodeSSH;
};

interface CodeModificationRequest {
  instruction: string;
  projectPath: string;
  giteaUsername: string;
}

interface CodeModificationResult {
  success: boolean;
  filesModified: string[];
  changes: string;
  error?: string;
}

export class OpenAIAgentService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Detect if user message is requesting code modifications
   */
  static isCodeModificationRequest(message: string): boolean {
    const codeModificationKeywords = [
      'change', 'modify', 'edit', 'update', 'add', 'remove', 'delete',
      'create', 'make', 'fix', 'implement', 'write', 'build',
      'add feature', 'add function', 'add method', 'add component',
      'change color', 'change style', 'change layout', 'change text',
      'update code', 'modify code', 'edit file', 'rewrite',
      'improve', 'enhance', 'refactor', 'optimize'
    ];

    const lowerMessage = message.toLowerCase();
    return codeModificationKeywords.some(keyword => 
      lowerMessage.includes(keyword)
    );
  }

  /**
   * Apply code modifications to project files on VM
   */
  async modifyProjectCode(request: CodeModificationRequest): Promise<CodeModificationResult> {
    const NodeSSH = await getNodeSSH();
    const ssh = new NodeSSH();

    try {
      console.log(`🤖 OpenAI Agent: Processing code modification request`);
      console.log(`📁 Project path: ${request.projectPath}`);

      // Connect to VM
      await ssh.connect({
        host: process.env.GCP_VM_EXTERNAL_IP!,
        username: process.env.GCP_VM_USERNAME!,
        privateKeyPath: process.env.GCP_VM_SSH_KEY_PATH!
      });

      // Get current project files
      const filesResult = await ssh.execCommand(`find ${request.projectPath} -type f -name "*.py" -o -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" -o -name "*.html" -o -name "*.css" -o -name "*.json" | head -20`);
      
      if (!filesResult.stdout.trim()) {
        return {
          success: false,
          filesModified: [],
          changes: '',
          error: 'No modifiable files found in project'
        };
      }

      const projectFiles = filesResult.stdout.trim().split('\n');
      console.log(`📄 Found ${projectFiles.length} files to analyze`);

      // Read current file contents
      const fileContents: { [filePath: string]: string } = {};
      for (const filePath of projectFiles.slice(0, 10)) { // Limit to first 10 files
        try {
          const contentResult = await ssh.execCommand(`cat ${filePath} 2>/dev/null | head -200`);
          if (contentResult.stdout) {
            fileContents[filePath] = contentResult.stdout;
          }
        } catch (error) {
          console.warn(`Could not read file ${filePath}`);
        }
      }

      // Use OpenAI to determine what changes to make
      const prompt = `You are an expert developer. The user wants to make changes to their project with this instruction:

"${request.instruction}"

Here are the current project files and their contents:

${Object.entries(fileContents).map(([path, content]) => 
  `FILE: ${path}\n\`\`\`\n${content.substring(0, 2000)}\n\`\`\`\n`
).join('\n')}

Please analyze the user's request and provide SPECIFIC file modifications. Return your response in this JSON format:

{
  "analysis": "Brief explanation of what changes you'll make",
  "modifications": [
    {
      "filePath": "path/to/file.py",
      "action": "modify|create|delete",
      "newContent": "Complete new file content here",
      "explanation": "What this change does"
    }
  ]
}

IMPORTANT RULES:
1. Always provide COMPLETE file content for modified files (not just diffs)
2. Preserve the existing file structure and don't break functionality
3. Make minimal, focused changes based on the user's request
4. For web projects, ensure all changes work together
5. If creating new files, place them in appropriate directories
6. Focus on the user's specific request, don't make unnecessary changes

Respond ONLY with valid JSON.`;

      const completion = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are an expert developer who makes precise code modifications based on user instructions."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 4000
      });

      const response = completion.choices[0].message.content;
      if (!response) {
        throw new Error('No response from OpenAI');
      }

      // Parse OpenAI response
      let modifications;
      try {
        modifications = JSON.parse(response);
      } catch (error) {
        console.error('Failed to parse OpenAI response:', response);
        throw new Error('Invalid response format from OpenAI');
      }

      const filesModified: string[] = [];
      let changesDescription = modifications.analysis || 'Code modifications applied';

      // Apply modifications to VM files
      for (const mod of modifications.modifications || []) {
        const { filePath, action, newContent, explanation } = mod;

        try {
          if (action === 'modify' || action === 'create') {
            // Write new content to file
            const tempFile = `/tmp/gitgenie_${Date.now()}.tmp`;
            
            // Create temporary file with new content
            await ssh.execCommand(`cat > ${tempFile} << 'GITGENIE_EOF'\n${newContent}\nGITGENIE_EOF`);
            
            // Move to target location
            await ssh.execCommand(`mv ${tempFile} ${filePath}`);
            
            filesModified.push(filePath);
            console.log(`✅ ${action === 'create' ? 'Created' : 'Modified'} file: ${filePath}`);
            
          } else if (action === 'delete') {
            await ssh.execCommand(`rm -f ${filePath}`);
            filesModified.push(filePath);
            console.log(`🗑️ Deleted file: ${filePath}`);
          }
        } catch (error) {
          console.error(`Failed to ${action} file ${filePath}:`, error);
        }
      }

      console.log(`🎉 OpenAI Agent: Applied ${filesModified.length} file modifications`);

      return {
        success: true,
        filesModified,
        changes: changesDescription,
      };

    } catch (error) {
      console.error('Error in OpenAI Agent code modification:', error);
      return {
        success: false,
        filesModified: [],
        changes: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    } finally {
      ssh.dispose();
    }
  }
}

export const openaiAgentService = new OpenAIAgentService();
