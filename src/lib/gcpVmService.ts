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
          Consider common project types (React, Next.js, Express, Flask etc.) and their typical startup commands.
          Return only the shell script content without explanations. Also don't run "npm run build" command as it is not needed for development mode.`
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
      const vmProjectPath = `/home/${process.env.GCP_VM_USERNAME}/projects/${repoName}`;
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
        // Detect project type and handle accordingly
        this.log('📖 Analyzing project configuration...');
        
        // Check for different project types
        const packageJsonPath = path.join(userProjectPath, 'package.json');
        const requirementsTxtPath = path.join(userProjectPath, 'requirements.txt');
        const appPyPath = path.join(userProjectPath, 'app.py');
        const mainPyPath = path.join(userProjectPath, 'main.py');
        
        let projectType = 'unknown';
        
        if (fs.existsSync(packageJsonPath)) {
          // Node.js project
          projectType = 'nodejs';
          this.log('🟢 Detected Node.js project (package.json found)');
          
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
          
        } else if (fs.existsSync(requirementsTxtPath) || fs.existsSync(appPyPath) || fs.existsSync(mainPyPath)) {
          // Python/Flask project
          projectType = 'python';
          this.log('🐍 Detected Python/Flask project');
          
          // Determine the main file
          let mainFile = 'app.py';
          if (fs.existsSync(appPyPath)) {
            mainFile = 'app.py';
          } else if (fs.existsSync(mainPyPath)) {
            mainFile = 'main.py';
          }
          
          this.log(`🎯 Using main file: ${mainFile}`);
          
          // Generate Python/Flask deployment commands
          commands = [
            'python3 -m pip install --user -r requirements.txt',
            `export FLASK_APP=${mainFile}`,
            `export FLASK_ENV=development`,
            `export FLASK_RUN_PORT=${availablePort}`,
            `export FLASK_RUN_HOST=0.0.0.0`,
            `export PYTHONUNBUFFERED=1`,
            `python3 -m flask run --host=0.0.0.0 --port=${availablePort}`
          ];
          
          // If no requirements.txt, try basic Flask command
          if (!fs.existsSync(requirementsTxtPath)) {
            this.log('⚠️ No requirements.txt found, using basic Flask setup');
            commands = [
              'python3 -m pip install --user flask',
              `export FLASK_APP=${mainFile}`,
              `export FLASK_ENV=development`,
              `export FLASK_RUN_PORT=${availablePort}`,
              `export FLASK_RUN_HOST=0.0.0.0`,
              `export PYTHONUNBUFFERED=1`,
              `python3 -m flask run --host=0.0.0.0 --port=${availablePort}`
            ];
          }
          
          this.log(`🐍 Generated ${commands.length} Python/Flask deployment commands`);
          
        } else {
          // Unknown project type - try to use OpenAI with project structure
          projectType = 'unknown';
          this.log('❓ Unknown project type, using AI to analyze project structure');
          
          // Get list of files in the project
          const files = fs.readdirSync(userProjectPath).slice(0, 20); // Limit to first 20 files
          
          const openaiResponse = await this.openai.chat.completions.create({
            model: "gpt-4",
            messages: [
              {
                role: "system",
                content: `You are an expert DevOps assistant. Given a list of files in a project directory, determine the project type and generate appropriate Linux commands to run this project on port ${availablePort}. Return only the commands in the order they should be executed, separated by newlines.`
              },
              {
                role: "user",
                content: `Project files: ${files.join(', ')}\n\nGenerate deployment commands for this project.`
              }
            ],
            temperature: 0.1
          });

          commands = openaiResponse.choices[0].message.content?.split('\n').filter(cmd => cmd.trim() !== '') || [];
          this.log(`🤖 AI analyzed project structure and generated ${commands.length} deployment commands`);
        }
      }

      // Execute setup commands (all except the last one which starts the server)
      this.log('⚙️ Executing setup commands...');
      const setupCommands = commands.slice(0, -1);
      const startCommand = commands[commands.length - 1];
      
      for (let i = 0; i < setupCommands.length; i++) {
        const command = setupCommands[i];
        this.log(`📋 [${i + 1}/${setupCommands.length}] Running: ${command}`);
        
        const result = await ssh.execCommand(command, { cwd: vmProjectPath });
        
        if (result.stderr && !result.stderr.includes('npm WARN')) {
          this.log(`⚠️ Command warning: ${result.stderr}`);
        }
        
        if (result.stdout) {
          this.log(`📄 Output: ${result.stdout.substring(0, 200)}${result.stdout.length > 200 ? '...' : ''}`);
        }
      }
      
      // Start the server in the background (detached)
      if (startCommand) {
        this.log(`🚀 Starting server in background: ${startCommand}`);
        
        // Create a more robust startup script that ensures the server stays running
        const startupScript = `#!/bin/bash
cd ${vmProjectPath}
export PORT=${availablePort}

# Kill any existing server on this port
if [ -f server.pid ]; then
    OLD_PID=$(cat server.pid)
    if ps -p $OLD_PID > /dev/null 2>&1; then
        kill $OLD_PID 2>/dev/null
        sleep 2
    fi
fi

# Start the new server in background with proper logging
nohup ${startCommand} > server.log 2>&1 &
NEW_PID=$!
echo $NEW_PID > server.pid

# Wait a moment and verify the process is still running
sleep 3
if ps -p $NEW_PID > /dev/null 2>&1; then
    echo "Server started successfully with PID: $NEW_PID"
    echo "Server is running and listening on port ${availablePort}"
else
    echo "Server failed to start. Check server.log for details."
    cat server.log 2>/dev/null || echo "No log file found"
    exit 1
fi
`;

        // Write the startup script to VM
        await ssh.execCommand(`cat > ${vmProjectPath}/start_server.sh << 'EOF'
${startupScript}
EOF`);
        
        // Make script executable and run it
        await ssh.execCommand(`chmod +x ${vmProjectPath}/start_server.sh`);
        const startResult = await ssh.execCommand(`${vmProjectPath}/start_server.sh`, { cwd: vmProjectPath });
        
        this.log(`🎯 Server startup result: ${startResult.stdout}`);
        if (startResult.stderr) {
          this.log(`⚠️ Server startup stderr: ${startResult.stderr}`);
        }
        
        // Additional verification - check if the process is actually running
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
        const verifyResult = await ssh.execCommand(`ps aux | grep "${availablePort}" | grep -v grep`);
        if (verifyResult.stdout) {
          this.log(`✅ Server verification: Process found running on port ${availablePort}`);
        } else {
          this.log(`⚠️ Server verification: No process found on port ${availablePort}`);
          // Try to get server logs for debugging
          const logResult = await ssh.execCommand(`cat ${vmProjectPath}/server.log 2>/dev/null || echo "No log file"`, { cwd: vmProjectPath });
          this.log(`📄 Server logs: ${logResult.stdout}`);
        }
      }

      const vmIP = await this.getVmExternalIP();
      const projectUrl = `http://${vmIP}:${availablePort}`;
      
      this.log('🎉 Project deployment completed successfully!');
      this.log(`🌐 Project URL: ${projectUrl}`);
      this.log('✅ Server is running in background and will persist across sessions');

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
      // Only disconnect after deployment is complete
      // The server will continue running in background
      ssh.dispose();
      this.log('🔌 Disconnected from VM (server continues running)');
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

  async checkProjectStatus(repoName: string): Promise<{ isRunning: boolean; pid?: string; port?: number }> {
    const ssh = new NodeSSH();
    
    try {
      this.log(`🔍 Checking status of project: ${repoName}`);
      await ssh.connect({
        host: await this.getVmExternalIP(),
        username: process.env.GCP_VM_USERNAME!,
        privateKeyPath: process.env.GCP_VM_SSH_KEY_PATH!
      });

      const vmProjectPath = `/home/${process.env.GCP_VM_USERNAME}/projects/${repoName}`;
      
      // Check if PID file exists and if process is running
      const pidResult = await ssh.execCommand(`if [ -f ${vmProjectPath}/server.pid ]; then cat ${vmProjectPath}/server.pid; else echo "no-pid"; fi`);
      
      if (pidResult.stdout.trim() === 'no-pid') {
        this.log(`📄 No PID file found for ${repoName}`);
        return { isRunning: false };
      }

      const pid = pidResult.stdout.trim();
      
      // Check if the process is actually running
      const processCheck = await ssh.execCommand(`ps -p ${pid} > /dev/null 2>&1 && echo "running" || echo "stopped"`);
      
      if (processCheck.stdout.trim() === 'running') {
        // Double-check by looking for the actual process with port info
        const portCheck = await ssh.execCommand(`netstat -tlnp 2>/dev/null | grep ":.*:.*LISTEN.*${pid}/" || ps aux | grep ${pid} | grep -v grep`);
        
        if (portCheck.stdout) {
          this.log(`✅ Project ${repoName} is running with PID: ${pid}`);
          
          // Try to extract port from netstat output
          const portMatch = portCheck.stdout.match(/:(\d+)\s.*LISTEN/);
          const port = portMatch ? parseInt(portMatch[1]) : undefined;
          
          return { isRunning: true, pid, port };
        } else {
          this.log(`❌ Process ${pid} exists but may not be listening on expected ports`);
          return { isRunning: false, pid };
        }
      } else {
        this.log(`❌ Project ${repoName} process not found (PID: ${pid})`);
        
        // Clean up stale PID file
        await ssh.execCommand(`rm -f ${vmProjectPath}/server.pid`);
        
        return { isRunning: false, pid };
      }
      
    } catch (error) {
      this.log(`❌ Error checking project status: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { isRunning: false };
    } finally {
      ssh.dispose();
    }
  }

  async getProjectLogs(repoName: string): Promise<string> {
    const ssh = new NodeSSH();
    
    try {
      this.log(`📄 Getting logs for project: ${repoName}`);
      await ssh.connect({
        host: await this.getVmExternalIP(),
        username: process.env.GCP_VM_USERNAME!,
        privateKeyPath: process.env.GCP_VM_SSH_KEY_PATH!
      });

      const vmProjectPath = `/home/${process.env.GCP_VM_USERNAME}/projects/${repoName}`;
      
      // Get server logs
      const logResult = await ssh.execCommand(`cat ${vmProjectPath}/server.log 2>/dev/null || echo "No server log file found"`);
      
      return logResult.stdout || 'No logs available';
      
    } catch (error) {
      this.log(`❌ Error getting project logs: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return 'Error retrieving logs';
    } finally {
      ssh.dispose();
    }
  }

  async stopProject(repoName: string): Promise<boolean> {
    const ssh = new NodeSSH();
    
    try {
      this.log(`🛑 Stopping project: ${repoName}`);
      await ssh.connect({
        host: await this.getVmExternalIP(),
        username: process.env.GCP_VM_USERNAME!,
        privateKeyPath: process.env.GCP_VM_SSH_KEY_PATH!
      });

      const vmProjectPath = `/home/${process.env.GCP_VM_USERNAME}/projects/${repoName}`;
      
      // Read PID file and kill the process
      const pidResult = await ssh.execCommand(`if [ -f ${vmProjectPath}/server.pid ]; then cat ${vmProjectPath}/server.pid; else echo "no-pid"; fi`);
      
      if (pidResult.stdout.trim() === 'no-pid') {
        this.log(`📄 No PID file found for ${repoName}, nothing to stop`);
        return true;
      }

      const pid = pidResult.stdout.trim();
      const killResult = await ssh.execCommand(`kill ${pid} && echo "killed" || echo "failed"`);
      
      if (killResult.stdout.trim() === 'killed') {
        // Clean up PID file
        await ssh.execCommand(`rm -f ${vmProjectPath}/server.pid`);
        this.log(`✅ Successfully stopped project ${repoName} (PID: ${pid})`);
        return true;
      } else {
        this.log(`❌ Failed to stop project ${repoName} (PID: ${pid})`);
        return false;
      }
      
    } catch (error) {
      this.log(`❌ Error stopping project: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    } finally {
      ssh.dispose();
    }
  }
}
