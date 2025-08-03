import { NodeSSH } from 'node-ssh';
import { OpenAI } from 'openai';
import { VMProjectResult, ProjectAnalysis } from '@/types/gcp';
import * as fs from 'fs';
import * as path from 'path';

export class GCPVmService {
  private openai: OpenAI;
  private vmInstance: string;
  private vmZone: string;
  private projectId: string;
  private vmExternalIP: string;
  private logCallback?: (message: string) => void;

  constructor(logCallback?: (message: string) => void) {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    this.vmInstance = process.env.GCP_VM_INSTANCE!;
    this.vmZone = process.env.GCP_VM_ZONE!;
    this.projectId = process.env.GCP_PROJECT_ID!;
    this.vmExternalIP = process.env.GCP_VM_EXTERNAL_IP!; // Add this to .env for now
    this.logCallback = logCallback;
  }

  private log(message: string) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    if (this.logCallback) {
      this.logCallback(logMessage);
    }
  }

  async findAvailablePort(): Promise<number> {
    const ssh = new NodeSSH();
    
    try {
      this.log('🔍 Connecting to VM to find available port...');
      await ssh.connect({
        host: await this.getVmExternalIP(),
        username: process.env.GCP_VM_USERNAME!,
        privateKeyPath: process.env.GCP_VM_SSH_KEY_PATH!
      });

      this.log('✅ Connected to VM successfully');
      this.log('🔍 Scanning ports 8000-9000 for availability...');

      // Check for available ports starting from 8000
      for (let port = 8000; port <= 9000; port++) {
        const result = await ssh.execCommand(`netstat -tuln | grep :${port}`);
        if (result.stdout === '') {
          this.log(`✅ Found available port: ${port}`);
          return port;
        } else {
          this.log(`❌ Port ${port} is in use`);
        }
      }
      
      throw new Error('No available ports found in range 8000-9000');
    } catch (error) {
      this.log(`❌ Error finding available port: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    } finally {
      ssh.dispose();
      this.log('🔌 Disconnected from VM');
    }
  }

  async testVMConnection(): Promise<{ success: boolean; error?: string; port?: number }> {
    try {
      this.log('🔍 Testing VM connection...');
      const port = await this.findAvailablePort();
      this.log('✅ VM connection test successful!');
      return { success: true, port };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log(`❌ VM connection test failed: ${errorMessage}`);
      return { 
        success: false, 
        error: errorMessage
      };
    }
  }

  async generateBatCommand(projectPath: string, port: number): Promise<string> {
    this.log(`🤖 Generating startup commands for project at ${projectPath} on port ${port}...`);
    
    const response = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that generates Linux shell commands to run Node.js/web projects. Analyze the project structure and create appropriate startup commands."
        },
        {
          role: "user",
          content: `Generate a linux shell script content to run a project at path: ${projectPath} on port ${port}. 
          Consider common project types (React, Next.js, Express, etc.) and their typical startup commands.
          Return only the shell script content without explanations.`
        }
      ],
      temperature: 0.3
    });

    const command = response.choices[0].message.content || '';
    this.log(`✅ Generated startup command: ${command.substring(0, 100)}${command.length > 100 ? '...' : ''}`);
    return command;
  }

  async analyzeProject(packageJson: any, port: number): Promise<ProjectAnalysis> {
    const dependencies = Object.keys(packageJson.dependencies || {});
    const devDependencies = Object.keys(packageJson.devDependencies || {});
    const scripts = packageJson.scripts || {};

    let projectType = 'unknown';
    let startCommand = 'npm start';

    // Detect project type based on dependencies
    if (dependencies.includes('next') || devDependencies.includes('next')) {
      projectType = 'Next.js';
      startCommand = scripts.start || 'npm run dev';
    } else if (dependencies.includes('react') || devDependencies.includes('react')) {
      projectType = 'React';
      startCommand = scripts.start || 'npm start';
    } else if (dependencies.includes('express')) {
      projectType = 'Express';
      startCommand = scripts.start || 'node index.js';
    } else if (dependencies.includes('vue') || devDependencies.includes('vue')) {
      projectType = 'Vue.js';
      startCommand = scripts.serve || scripts.start || 'npm run serve';
    }

    return {
      projectType,
      dependencies: [...dependencies, ...devDependencies],
      startCommand,
      buildCommand: scripts.build,
      port
    };
  }

  async runProjectOnVM(repositoryId: string, repoName: string, userProjectPath: string): Promise<VMProjectResult> {
    const ssh = new NodeSSH();
    
    try {
      this.log(`🚀 Starting deployment of project: ${repoName}`);
      this.log(`📂 Local project path: ${userProjectPath}`);
      
      this.log('🔍 Connecting to VM...');
      await ssh.connect({
        host: await this.getVmExternalIP(),
        username: process.env.GCP_VM_USERNAME!,
        privateKeyPath: process.env.GCP_VM_SSH_KEY_PATH!
      });
      this.log('✅ Connected to VM successfully');

      // Create project directory on VM
      const vmProjectPath = `/home/${process.env.GCP_VM_USERNAME}/${repoName}`;
      this.log(`📁 Creating project directory: ${vmProjectPath}`);
      await ssh.execCommand(`mkdir -p ${vmProjectPath}`);

      // Upload project files to VM
      this.log('📤 Uploading project files to VM...');
      await ssh.putDirectory(userProjectPath, vmProjectPath, {
        recursive: true,
        concurrency: 10,
        validate: function(itemPath) {
          const baseName = path.basename(itemPath);
          return !baseName.startsWith('.') && baseName !== 'node_modules';
        }
      });
      this.log('✅ Project files uploaded successfully');

      // Find available port
      this.log('🔍 Finding available port...');
      const availablePort = await this.findAvailablePort();
      this.log(`✅ Using port: ${availablePort}`);

      // Check if start.sh already exists in the VM project directory
      this.log('🔍 Checking if start.sh already exists...');
      const startShResult = await ssh.execCommand(`test -f ${vmProjectPath}/start.sh && echo "exists" || echo "not found"`);
      
      let commands: string[] = [];
      
      if (startShResult.stdout.trim() === 'exists') {
        this.log('✅ Found existing start.sh, using npm run dev directly');
        commands = [
          'npm install',
          `PORT=${availablePort} npm run dev`
        ];
      } else {
        // Read package.json to understand project type
        this.log('📖 Analyzing project configuration...');
        const packageJsonPath = path.join(userProjectPath, 'package.json');
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

        // Use OpenAI to analyze the project and generate appropriate commands
        this.log('🤖 Using AI to generate deployment commands...');
        const openaiResponse = await this.openai.chat.completions.create({
          model: "gpt-4",
          messages: [
            {
              role: "system",
              content: "You are an expert DevOps assistant. Given a package.json file, generate the appropriate Linux commands to run this project on port " + availablePort + ". Return only the commands in the order they should be executed, separated by newlines. Include any necessary npm install and start commands."
            },
            {
              role: "user",
              content: JSON.stringify(packageJson, null, 2)
            }
          ],
          temperature: 0.1
        });

        commands = openaiResponse.choices[0].message.content?.split('\n').filter(cmd => cmd.trim() !== '') || [];
        this.log(`🤖 AI generated ${commands.length} deployment commands`);
      }

      // Execute each command on the VM
      this.log('⚙️ Executing deployment commands...');
      for (let i = 0; i < commands.length; i++) {
        const command = commands[i];
        this.log(`📋 [${i + 1}/${commands.length}] Running: ${command}`);
        
        const result = await ssh.execCommand(command, { cwd: vmProjectPath });
        
        if (result.stderr && !result.stderr.includes('npm WARN')) {
          this.log(`⚠️ Command warning: ${result.stderr}`);
        }
        
        if (result.stdout) {
          this.log(`📄 Output: ${result.stdout.substring(0, 200)}${result.stdout.length > 200 ? '...' : ''}`);
        }
      }

      const vmIP = await this.getVmExternalIP();
      const projectUrl = `http://${vmIP}:${availablePort}`;
      
      this.log('🎉 Project deployment completed successfully!');
      this.log(`🌐 Project URL: ${projectUrl}`);

      return {
        success: true,
        vmIP,
        port: availablePort,
        projectUrl,
        commands: commands,
        repositoryId
      };

    } catch (error) {
      this.log(`❌ Deployment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    } finally {
      ssh.dispose();
      this.log('🔌 Disconnected from VM');
    }
  }

  private convertBatToBash(batContent: string, projectPath: string, port: number): string {
    // Convert Windows batch commands to Linux bash
    let bashContent = batContent
      .replace(/cd\s+/g, 'cd ')
      .replace(/npm\s+start/g, `PORT=${port} npm start`)
      .replace(/yarn\s+start/g, `PORT=${port} yarn start`)
      .replace(/npx\s+next\s+start/g, `PORT=${port} npx next start`)
      .replace(/node\s+/g, `PORT=${port} node `);
    
    return `#!/bin/bash
cd ${projectPath}
export PORT=${port}
${bashContent}`;
  }

  private async getVmExternalIP(): Promise<string> {
    // For now, return the configured external IP
    // In production, you'd want to fetch this dynamically from GCP
    return this.vmExternalIP;
  }
}
