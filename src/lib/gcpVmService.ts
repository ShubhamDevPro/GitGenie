import { OpenAI } from 'openai';
import { VMProjectResult, ProjectAnalysis } from '@/types/gcp';
import * as fs from 'fs';
import * as path from 'path';

// Dynamically import node-ssh only on server side
const getNodeSSH = async () => {
  if (typeof window !== 'undefined') {
    throw new Error('SSH operations are only available on the server side');
  }
  const { NodeSSH } = await import('node-ssh');
  return NodeSSH;
};

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
    console.log(`[GCP VM] ${message}`);
    if (this.logCallback) {
      this.logCallback(message);
    }
  }

  /**
   * Generate the VM project path with user-specific folder structure
   * @param repoName - Repository name
   * @param giteaUsername - Optional Gitea username for user-specific folders
   * @returns VM project path
   */
  private getVmProjectPath(repoName: string, giteaUsername?: string): string {
    if (giteaUsername) {
      return `/home/${process.env.GCP_VM_USERNAME}/projects/${giteaUsername}/${repoName}`;
    } else {
      // Fallback to old structure for backward compatibility
      return `/home/${process.env.GCP_VM_USERNAME}/projects/${repoName}`;
    }
  }

  async findAvailablePort(): Promise<number> {
    const NodeSSH = await getNodeSSH();
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
    const NodeSSH = await getNodeSSH();
    const ssh = new NodeSSH();
    try {
      this.log('🔍 Testing VM connection...');
      
      await ssh.connect({
        host: await this.getVmExternalIP(),
        username: process.env.GCP_VM_USERNAME!,
        privateKeyPath: process.env.GCP_VM_SSH_KEY_PATH!
      });

      this.log('✅ VM connection successful');
      
      // Test finding an available port
      const port = await this.findAvailablePort();
      
      return {
        success: true,
        port
      };
    } catch (error) {
      this.log(`❌ VM connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    } finally {
      ssh.dispose();
    }
  }

  async generateBatCommand(projectPath: string, port: number): Promise<string> {
    this.log(`🤖 Generating startup commands for project at ${projectPath} on port ${port}...`);

    const response = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are an expert DevOps assistant for Ubuntu Linux servers. Generate ONLY essential bash commands to run Node.js/web projects in development mode.

CRITICAL REQUIREMENTS:
1. Target is Ubuntu Linux VM (not Windows)
2. Use development commands (npm run dev, npm start) - NEVER npm run build
3. Include proper environment variables for external access (HOST=0.0.0.0)
4. Return ONLY executable bash commands without explanations
5. Skip build/compilation steps for faster startup
6. Ensure proper port binding for external VM access

Example output format:
npm install
export PORT=${port}
export HOST=0.0.0.0
npm run dev`
        },
        {
          role: "user",
          content: `Generate Linux bash commands to run a project at path: ${projectPath} on port ${port} in development mode. 
          Consider common project types (React, Next.js, Express, Flask etc.) and their development startup commands.
          Return only the bash commands without explanations.`
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

  async runProjectOnVM(repositoryId: string, repoName: string, userProjectPath: string, giteaUsername?: string): Promise<VMProjectResult> {
    const NodeSSH = await getNodeSSH();
    const ssh = new NodeSSH();

    try {
      this.log(`🚀 Starting deployment of project: ${repoName}`);
      this.log(`📂 Local project path: ${userProjectPath}`);
      if (giteaUsername) {
        this.log(`👤 Gitea username: ${giteaUsername}`);
      }

      this.log('🔍 Connecting to VM...');
      await ssh.connect({
        host: await this.getVmExternalIP(),
        username: process.env.GCP_VM_USERNAME!,
        privateKeyPath: process.env.GCP_VM_SSH_KEY_PATH!
      });
      this.log('✅ Connected to VM successfully');

      // Create user-specific project directory on VM
      // Structure: /home/{vm_username}/projects/{gitea_username}/{repo_name}
      const vmProjectPath = this.getVmProjectPath(repoName, giteaUsername);
      if (giteaUsername) {
        this.log(`📁 Creating user-specific project directory: ${vmProjectPath}`);
        this.log(`🏗️ Project structure: projects/{user}/{repository}`);
      } else {
        this.log(`📁 Creating project directory (fallback): ${vmProjectPath}`);
        this.log(`⚠️ Warning: No gitea username provided, using fallback structure`);
      }
      
      await ssh.execCommand(`mkdir -p ${vmProjectPath}`);

      // Upload project files to VM
      this.log('📤 Uploading project files to VM...');
      await ssh.putDirectory(userProjectPath, vmProjectPath, {
        recursive: true,
        concurrency: 10,
        validate: function (itemPath: string) {
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
        this.log('✅ Found existing start.sh, using direct npm run dev');
        commands = [
          'npm install',
          `export PORT=${availablePort}`,
          `export HOST=0.0.0.0`,
          'npm run dev'
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
                content: `You are an expert DevOps assistant for Ubuntu Linux servers. Given a package.json file, generate ONLY the essential Linux bash commands to run this project in development mode on port ${availablePort}. 

CRITICAL REQUIREMENTS:
1. Use development commands (npm run dev, npm start) - NEVER npm run build
2. Target is Ubuntu Linux VM (not Windows)
3. Include proper environment variables for port binding
4. Return ONLY executable bash commands, one per line
5. Skip any build/compilation steps for faster startup
6. Ensure commands bind to 0.0.0.0 (not localhost) for external access

Example output format:
npm install
export PORT=${availablePort}
npm run dev

Do NOT include explanations, comments, or invalid commands.`
              },
              {
                role: "user",
                content: `Package.json for Ubuntu Linux deployment:\n${JSON.stringify(packageJson, null, 2)}\n\nGenerate minimal bash commands to run this project in development mode on port ${availablePort}.`
              }
            ],
            temperature: 0.1
          });

          commands = openaiResponse.choices[0].message.content?.split('\n').filter(cmd => cmd.trim() !== '' && !cmd.startsWith('#')) || [];

          // Filter out any invalid commands that might cause syntax errors
          commands = commands.filter(cmd => {
            const trimmed = cmd.trim();
            // Remove any commands that look like explanations or contain invalid syntax
            return trimmed.length > 0 &&
              !trimmed.toLowerCase().includes('as a') &&
              !trimmed.toLowerCase().includes('please provide') &&
              !trimmed.includes('(') &&
              !trimmed.includes(')') &&
              (trimmed.startsWith('npm') || trimmed.startsWith('export') || trimmed.startsWith('cd') || trimmed.startsWith('python') || trimmed.startsWith('pip'));
          });

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
                content: `You are an expert DevOps assistant for Ubuntu Linux servers. Given a list of project files, determine the project type and generate ONLY essential Linux bash commands to run this project in development mode on port ${availablePort}.

CRITICAL REQUIREMENTS:
1. Use development commands (npm run dev, npm start, python3 flask run) - NEVER build commands
2. Target is Ubuntu Linux VM (not Windows)
3. Include proper environment variables for port binding  
4. Return ONLY executable bash commands, one per line
5. Skip build/compilation steps for faster startup
6. Ensure commands bind to 0.0.0.0 (not localhost) for external access
7. For Node.js: use npm install + npm run dev
8. For Python: use pip install + flask run with proper env vars

Example outputs:
For Node.js: npm install → export PORT=${availablePort} → npm run dev
For Python: pip3 install -r requirements.txt → export FLASK_APP=app.py → flask run --host=0.0.0.0 --port=${availablePort}

Do NOT include explanations, comments, or invalid commands.`
              },
              {
                role: "user",
                content: `Project files for Ubuntu Linux deployment: ${files.join(', ')}\n\nGenerate minimal bash commands to run this project in development mode on port ${availablePort}.`
              }
            ],
            temperature: 0.1
          });

          commands = openaiResponse.choices[0].message.content?.split('\n').filter(cmd => cmd.trim() !== '' && !cmd.startsWith('#')) || [];

          // Filter out any invalid commands that might cause syntax errors
          commands = commands.filter(cmd => {
            const trimmed = cmd.trim();
            // Remove any commands that look like explanations or contain invalid syntax
            return trimmed.length > 0 &&
              !trimmed.toLowerCase().includes('as a') &&
              !trimmed.toLowerCase().includes('please provide') &&
              !trimmed.includes('(') &&
              !trimmed.includes(')') &&
              (trimmed.startsWith('npm') || trimmed.startsWith('export') || trimmed.startsWith('cd') || trimmed.startsWith('python') || trimmed.startsWith('pip'));
          });

          this.log(`🤖 AI analyzed project structure and generated ${commands.length} deployment commands`);
        }

        // If no valid commands were generated, provide fallback based on file structure
        if (commands.length === 0) {
          this.log('⚠️ No valid commands generated by AI, using fallback logic');
          const files = fs.readdirSync(userProjectPath);

          if (files.includes('package.json')) {
            this.log('📦 Fallback: Detected Node.js project');
            commands = [
              'npm install',
              `export PORT=${availablePort}`,
              `export HOST=0.0.0.0`,
              'npm run dev || npm start'
            ];
          } else if (files.includes('requirements.txt') || files.includes('app.py')) {
            this.log('🐍 Fallback: Detected Python project');
            commands = [
              'pip3 install -r requirements.txt || pip3 install flask',
              `export FLASK_APP=app.py`,
              `export FLASK_ENV=development`,
              `python3 -m flask run --host=0.0.0.0 --port=${availablePort}`
            ];
          } else {
            this.log('❌ Fallback: Unknown project type, using basic commands');
            commands = [
              `echo "No suitable deployment strategy found for this project"`
            ];
          }
        }
      }

      // Ensure we have at least some commands to execute
      if (commands.length === 0) {
        throw new Error('No deployment commands generated or available');
      }

      // Execute setup commands (all except the last one which starts the server)
      this.log('⚙️ Executing setup commands...');
      const setupCommands = commands.slice(0, -1);
      const startCommand = commands[commands.length - 1];

      if (setupCommands.length === 0) {
        this.log('⚠️ No setup commands to execute, proceeding directly to start command');
      }

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

  async getVmExternalIP(): Promise<string> {
    // For now, return the configured external IP
    // In production, you'd want to fetch this dynamically from GCP
    return this.vmExternalIP;
  }

  async checkProjectStatus(repoName: string, giteaUsername?: string): Promise<{ isRunning: boolean; pid?: string; port?: number }> {
    const NodeSSH = await getNodeSSH();
    const ssh = new NodeSSH();

    try {
      this.log(`🔍 Checking status of project: ${repoName}`);
      if (giteaUsername) {
        this.log(`👤 For user: ${giteaUsername}`);
      }
      await ssh.connect({
        host: await this.getVmExternalIP(),
        username: process.env.GCP_VM_USERNAME!,
        privateKeyPath: process.env.GCP_VM_SSH_KEY_PATH!
      });

      const vmProjectPath = this.getVmProjectPath(repoName, giteaUsername);

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

  async getProjectLogs(repoName: string, giteaUsername?: string): Promise<string> {
    const NodeSSH = await getNodeSSH();
    const ssh = new NodeSSH();

    try {
      this.log(`📄 Getting logs for project: ${repoName}`);
      if (giteaUsername) {
        this.log(`👤 For user: ${giteaUsername}`);
      }
      await ssh.connect({
        host: await this.getVmExternalIP(),
        username: process.env.GCP_VM_USERNAME!,
        privateKeyPath: process.env.GCP_VM_SSH_KEY_PATH!
      });

      const vmProjectPath = this.getVmProjectPath(repoName, giteaUsername);

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

  async stopProject(repoName: string, giteaUsername?: string): Promise<boolean> {
    const NodeSSH = await getNodeSSH();
    const ssh = new NodeSSH();

    try {
      this.log(`🛑 Stopping project: ${repoName}`);
      if (giteaUsername) {
        this.log(`👤 For user: ${giteaUsername}`);
      }
      await ssh.connect({
        host: await this.getVmExternalIP(),
        username: process.env.GCP_VM_USERNAME!,
        privateKeyPath: process.env.GCP_VM_SSH_KEY_PATH!
      });

      const vmProjectPath = this.getVmProjectPath(repoName, giteaUsername);

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

  /**
   * List all projects for a specific user on the VM
   * This is useful for AI agents to understand user's project structure
   * @param giteaUsername - Gitea username to list projects for
   * @returns Array of project information including names and paths
   */
  async listUserProjects(giteaUsername: string): Promise<{
    username: string;
    userPath: string;
    projects: Array<{
      name: string;
      path: string;
      isRunning: boolean;
      lastModified?: string;
    }>;
  }> {
    const NodeSSH = await getNodeSSH();
    const ssh = new NodeSSH();

    try {
      this.log(`📋 Listing projects for user: ${giteaUsername}`);
      
      await ssh.connect({
        host: await this.getVmExternalIP(),
        username: process.env.GCP_VM_USERNAME!,
        privateKeyPath: process.env.GCP_VM_SSH_KEY_PATH!
      });

      const userProjectsPath = `/home/${process.env.GCP_VM_USERNAME}/projects/${giteaUsername}`;
      
      // Check if user directory exists
      const userDirCheck = await ssh.execCommand(`test -d ${userProjectsPath} && echo "exists" || echo "not_found"`);
      
      if (userDirCheck.stdout.trim() === 'not_found') {
        this.log(`📁 No projects directory found for user: ${giteaUsername}`);
        return {
          username: giteaUsername,
          userPath: userProjectsPath,
          projects: []
        };
      }

      // List all directories in user's projects folder
      const listResult = await ssh.execCommand(`ls -la ${userProjectsPath} | grep '^d' | grep -v '\\.$' | awk '{print $9}'`);
      
      if (!listResult.stdout.trim()) {
        this.log(`📂 User directory exists but no projects found for: ${giteaUsername}`);
        return {
          username: giteaUsername,
          userPath: userProjectsPath,
          projects: []
        };
      }

      const projectNames = listResult.stdout.trim().split('\n').filter((name: string) => name && name !== '.' && name !== '..');
      const projects = [];

      for (const projectName of projectNames) {
        const projectPath = `${userProjectsPath}/${projectName}`;
        
        // Check if project is running
        const pidCheck = await ssh.execCommand(`test -f ${projectPath}/server.pid && cat ${projectPath}/server.pid || echo "not_running"`);
        let isRunning = false;
        
        if (pidCheck.stdout.trim() !== 'not_running') {
          const pid = pidCheck.stdout.trim();
          const processCheck = await ssh.execCommand(`ps -p ${pid} > /dev/null 2>&1 && echo "running" || echo "stopped"`);
          isRunning = processCheck.stdout.trim() === 'running';
        }

        // Get last modified time
        const modTimeResult = await ssh.execCommand(`stat -c %y ${projectPath} 2>/dev/null || echo "unknown"`);
        const lastModified = modTimeResult.stdout.trim() !== 'unknown' ? modTimeResult.stdout.trim() : undefined;

        projects.push({
          name: projectName,
          path: projectPath,
          isRunning,
          lastModified
        });
      }

      this.log(`✅ Found ${projects.length} projects for user ${giteaUsername}`);
      
      return {
        username: giteaUsername,
        userPath: userProjectsPath,
        projects
      };

    } catch (error) {
      this.log(`❌ Error listing projects for user ${giteaUsername}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    } finally {
      ssh.dispose();
    }
  }

  /**
   * List all users and their projects on the VM
   * This provides a complete overview of the projects folder structure
   * @returns Array of all users and their projects
   */
  async listAllProjects(): Promise<Array<{
    username: string;
    userPath: string;
    projects: Array<{
      name: string;
      path: string;
      isRunning: boolean;
      lastModified?: string;
    }>;
  }>> {
    const NodeSSH = await getNodeSSH();
    const ssh = new NodeSSH();

    try {
      this.log(`📋 Listing all projects on VM`);
      
      await ssh.connect({
        host: await this.getVmExternalIP(),
        username: process.env.GCP_VM_USERNAME!,
        privateKeyPath: process.env.GCP_VM_SSH_KEY_PATH!
      });

      const projectsBasePath = `/home/${process.env.GCP_VM_USERNAME}/projects`;
      
      // Check if projects directory exists
      const projectsDirCheck = await ssh.execCommand(`test -d ${projectsBasePath} && echo "exists" || echo "not_found"`);
      
      if (projectsDirCheck.stdout.trim() === 'not_found') {
        this.log(`📁 No projects directory found on VM`);
        return [];
      }

      // List all user directories and individual project folders (for backward compatibility)
      const listResult = await ssh.execCommand(`ls -la ${projectsBasePath} | grep '^d' | grep -v '\\.$' | awk '{print $9}'`);
      
      if (!listResult.stdout.trim()) {
        this.log(`📂 Projects directory exists but is empty`);
        return [];
      }

      const entries = listResult.stdout.trim().split('\n').filter((name: string) => name && name !== '.' && name !== '..');
      const allProjects = [];

      for (const entry of entries) {
        const entryPath = `${projectsBasePath}/${entry}`;
        
        // Check if this entry is a user directory (contains subdirectories) or a direct project
        const subDirCheck = await ssh.execCommand(`find ${entryPath} -maxdepth 1 -type d | wc -l`);
        const subDirCount = parseInt(subDirCheck.stdout.trim()) - 1; // Subtract 1 for the directory itself

        if (subDirCount > 0) {
          // This is likely a user directory with projects
          const userProjects = await this.listUserProjects(entry);
          allProjects.push(userProjects);
        } else {
          // This is likely a legacy direct project folder
          // Check if project is running
          const pidCheck = await ssh.execCommand(`test -f ${entryPath}/server.pid && cat ${entryPath}/server.pid || echo "not_running"`);
          let isRunning = false;
          
          if (pidCheck.stdout.trim() !== 'not_running') {
            const pid = pidCheck.stdout.trim();
            const processCheck = await ssh.execCommand(`ps -p ${pid} > /dev/null 2>&1 && echo "running" || echo "stopped"`);
            isRunning = processCheck.stdout.trim() === 'running';
          }

          // Get last modified time
          const modTimeResult = await ssh.execCommand(`stat -c %y ${entryPath} 2>/dev/null || echo "unknown"`);
          const lastModified = modTimeResult.stdout.trim() !== 'unknown' ? modTimeResult.stdout.trim() : undefined;

          // Add as legacy project under special "legacy" user
          allProjects.push({
            username: 'legacy',
            userPath: projectsBasePath,
            projects: [{
              name: entry,
              path: entryPath,
              isRunning,
              lastModified
            }]
          });
        }
      }

      this.log(`✅ Found projects from ${allProjects.length} users/categories`);
      
      return allProjects;

    } catch (error) {
      this.log(`❌ Error listing all projects: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    } finally {
      ssh.dispose();
    }
  }

  /**
   * Re-run an existing project on VM using existing files (preserves agent modifications)
   * This method does NOT clone from Gitea, it uses the existing project files on the VM
   * @param repositoryId - Repository ID
   * @param repoName - Repository name
   * @param giteaUsername - Gitea username for project path construction
   * @returns VMProjectResult
   */
  async rerunExistingProject(repositoryId: string, repoName: string, giteaUsername: string): Promise<VMProjectResult> {
    const NodeSSH = await getNodeSSH();
    const ssh = new NodeSSH();

    try {
      this.log(`🔄 Re-running existing project: ${repoName}`);
      this.log(`👤 For user: ${giteaUsername}`);
      this.log(`⚠️ Using existing files on VM (preserving agent modifications)`);

      this.log('🔍 Connecting to VM...');
      await ssh.connect({
        host: await this.getVmExternalIP(),
        username: process.env.GCP_VM_USERNAME!,
        privateKeyPath: process.env.GCP_VM_SSH_KEY_PATH!
      });
      this.log('✅ Connected to VM successfully');

      // Get the existing VM project path
      const vmProjectPath = this.getVmProjectPath(repoName, giteaUsername);
      this.log(`📁 Using existing VM project path: ${vmProjectPath}`);

      // Check if the project directory exists
      const projectExistsCheck = await ssh.execCommand(`test -d ${vmProjectPath} && echo "exists" || echo "not_found"`);
      
      if (projectExistsCheck.stdout.trim() === 'not_found') {
        throw new Error(`Project directory not found on VM: ${vmProjectPath}`);
      }

      this.log('✅ Found existing project directory on VM');

      // Stop any existing process first
      this.log('🛑 Stopping any existing process...');
      const pidResult = await ssh.execCommand(`if [ -f ${vmProjectPath}/server.pid ]; then cat ${vmProjectPath}/server.pid; else echo "no-pid"; fi`);

      if (pidResult.stdout.trim() !== 'no-pid') {
        const pid = pidResult.stdout.trim();
        this.log(`🔍 Found existing process with PID: ${pid}`);
        
        const killResult = await ssh.execCommand(`kill ${pid} && echo "killed" || echo "failed"`);
        if (killResult.stdout.trim() === 'killed') {
          this.log(`✅ Stopped existing process (PID: ${pid})`);
          await ssh.execCommand(`rm -f ${vmProjectPath}/server.pid`);
        } else {
          this.log(`⚠️ Could not stop existing process, continuing anyway`);
        }
      } else {
        this.log('📄 No existing process found');
      }

      // Find available port
      this.log('🔍 Finding available port...');
      const availablePort = await this.findAvailablePort();
      this.log(`✅ Using port: ${availablePort}`);

      // Analyze the existing project structure on VM to determine project type
      this.log('📖 Analyzing existing project structure on VM...');
      
      const fileListResult = await ssh.execCommand(`ls -la ${vmProjectPath}`, { cwd: vmProjectPath });
      this.log(`📄 Files in project directory: ${fileListResult.stdout}`);

      let commands: string[] = [];
      let projectType = 'unknown';

      // Check for different project types on VM
      const packageJsonExists = await ssh.execCommand(`test -f ${vmProjectPath}/package.json && echo "exists" || echo "not_found"`);
      const requirementsTxtExists = await ssh.execCommand(`test -f ${vmProjectPath}/requirements.txt && echo "exists" || echo "not_found"`);
      const appPyExists = await ssh.execCommand(`test -f ${vmProjectPath}/app.py && echo "exists" || echo "not_found"`);
      const mainPyExists = await ssh.execCommand(`test -f ${vmProjectPath}/main.py && echo "exists" || echo "not_found"`);
      const startShExists = await ssh.execCommand(`test -f ${vmProjectPath}/start.sh && echo "exists" || echo "not_found"`);

      if (startShExists.stdout.trim() === 'exists') {
        // Use existing start.sh script
        this.log('✅ Found existing start.sh, using direct execution');
        projectType = 'custom';
        commands = [
          `export PORT=${availablePort}`,
          `export HOST=0.0.0.0`,
          'chmod +x start.sh',
          './start.sh'
        ];
      } else if (packageJsonExists.stdout.trim() === 'exists') {
        // Node.js project
        projectType = 'nodejs';
        this.log('🟢 Detected Node.js project (package.json found on VM)');

        // Read package.json from VM to understand the project
        const packageJsonResult = await ssh.execCommand(`cat ${vmProjectPath}/package.json`);
        
        try {
          const packageJson = JSON.parse(packageJsonResult.stdout);
          this.log('🤖 Using AI to generate deployment commands for existing project...');
          
          const openaiResponse = await this.openai.chat.completions.create({
            model: "gpt-4",
            messages: [
              {
                role: "system",
                content: `You are an expert DevOps assistant for Ubuntu Linux servers. Given a package.json file from an EXISTING project on a VM, generate ONLY the essential Linux bash commands to restart this project in development mode on port ${availablePort}.

CRITICAL REQUIREMENTS:
1. Use development commands (npm run dev, npm start) - NEVER npm run build
2. Target is Ubuntu Linux VM (not Windows)
3. ALWAYS include: export HOST=0.0.0.0 for external access
4. ALWAYS include: export PORT=${availablePort}
5. Return ONLY executable bash commands, one per line
6. Skip npm install if not necessary (assume dependencies might be installed)
7. Ensure commands bind to 0.0.0.0 (not localhost) for external access
8. Focus on RESTART commands, not initial setup
9. For Next.js: use npm run dev -- --hostname 0.0.0.0
10. For React: use HOST=0.0.0.0 npm start
11. For Node.js: ensure server binds to 0.0.0.0

Example output format:
npm install
export PORT=${availablePort}
export HOST=0.0.0.0
npm run dev

Do NOT include explanations, comments, or invalid commands.`
              },
              {
                role: "user",
                content: `Package.json for restarting existing project on Ubuntu Linux VM:\n${JSON.stringify(packageJson, null, 2)}\n\nGenerate minimal bash commands to restart this project in development mode on port ${availablePort}.`
              }
            ],
            temperature: 0.1
          });

          commands = openaiResponse.choices[0].message.content?.split('\n').filter(cmd => cmd.trim() !== '' && !cmd.startsWith('#')) || [];

          // Filter out any invalid commands
          commands = commands.filter(cmd => {
            const trimmed = cmd.trim();
            return trimmed.length > 0 &&
              !trimmed.toLowerCase().includes('as a') &&
              !trimmed.toLowerCase().includes('please provide') &&
              !trimmed.includes('(') &&
              !trimmed.includes(')') &&
              (trimmed.startsWith('npm') || trimmed.startsWith('export') || trimmed.startsWith('cd') || trimmed.startsWith('python') || trimmed.startsWith('pip'));
          });

          this.log(`🤖 AI generated ${commands.length} restart commands`);
        } catch (jsonError) {
          this.log('⚠️ Could not parse package.json, using fallback commands');
          commands = [
            'npm install',
            `export PORT=${availablePort}`,
            `export HOST=0.0.0.0`,
            'npm run dev -- --hostname 0.0.0.0 || HOST=0.0.0.0 npm start'
          ];
        }
      } else if (requirementsTxtExists.stdout.trim() === 'exists' || appPyExists.stdout.trim() === 'exists' || mainPyExists.stdout.trim() === 'exists') {
        // Python/Flask project
        projectType = 'python';
        this.log('🐍 Detected Python/Flask project on VM');

        // Determine the main file
        let mainFile = 'app.py';
        if (appPyExists.stdout.trim() === 'exists') {
          mainFile = 'app.py';
        } else if (mainPyExists.stdout.trim() === 'exists') {
          mainFile = 'main.py';
        }

        this.log(`🎯 Using main file: ${mainFile}`);

        // Generate Python/Flask restart commands
        if (requirementsTxtExists.stdout.trim() === 'exists') {
          commands = [
            'python3 -m pip install --user -r requirements.txt',
            `export FLASK_APP=${mainFile}`,
            `export FLASK_ENV=development`,
            `export FLASK_RUN_PORT=${availablePort}`,
            `export FLASK_RUN_HOST=0.0.0.0`,
            `export PYTHONUNBUFFERED=1`,
            `python3 -m flask run --host=0.0.0.0 --port=${availablePort}`
          ];
        } else {
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

        this.log(`🐍 Generated ${commands.length} Python/Flask restart commands`);
      } else {
        // Unknown project type - try basic restart
        this.log('❓ Unknown project type, using basic restart commands');
        projectType = 'unknown';
        
        // Get list of files in the project on VM
        const filesListResult = await ssh.execCommand(`ls ${vmProjectPath}`);
        const files = filesListResult.stdout.split('\n').filter((f: string) => f.trim());

        if (files.includes('package.json')) {
          commands = [
            'npm install',
            `export PORT=${availablePort}`,
            `export HOST=0.0.0.0`,
            'npm run dev -- --hostname 0.0.0.0 || HOST=0.0.0.0 npm start'
          ];
        } else if (files.some((f: string) => f.includes('.py'))) {
          commands = [
            'python3 -m pip install --user flask',
            `export FLASK_APP=app.py`,
            `export FLASK_ENV=development`,
            `export FLASK_RUN_PORT=${availablePort}`,
            `export FLASK_RUN_HOST=0.0.0.0`,
            `python3 -m flask run --host=0.0.0.0 --port=${availablePort}`
          ];
        } else {
          throw new Error('Could not determine project type for restart');
        }
      }

      // Ensure we have commands to execute
      if (commands.length === 0) {
        throw new Error('No restart commands generated');
      }

      // Execute setup commands (all except the last one which starts the server)
      this.log('⚙️ Executing restart commands...');
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

      // Start the server in the background
      if (startCommand) {
        this.log(`🚀 Starting server in background: ${startCommand}`);

        // Create restart script with proper host binding
        const restartScript = `#!/bin/bash
cd ${vmProjectPath}
export PORT=${availablePort}
export HOST=0.0.0.0

# Start the new server in background with proper logging
nohup ${startCommand} > server.log 2>&1 &
NEW_PID=$!
echo $NEW_PID > server.pid

# Wait a moment and verify the process is still running
sleep 3
if ps -p $NEW_PID > /dev/null 2>&1; then
    echo "Server restarted successfully with PID: $NEW_PID"
    echo "Server is running and listening on port ${availablePort}"
else
    echo "Server failed to restart. Check server.log for details."
    cat server.log 2>/dev/null || echo "No log file found"
    exit 1
fi
`;

        // Write and execute the restart script
        await ssh.execCommand(`cat > ${vmProjectPath}/restart_server.sh << 'EOF'
${restartScript}
EOF`);

        await ssh.execCommand(`chmod +x ${vmProjectPath}/restart_server.sh`);
        const startResult = await ssh.execCommand(`${vmProjectPath}/restart_server.sh`, { cwd: vmProjectPath });

        this.log(`🎯 Server restart result: ${startResult.stdout}`);
        if (startResult.stderr) {
          this.log(`⚠️ Server restart stderr: ${startResult.stderr}`);
        }

        // Verification
        await new Promise(resolve => setTimeout(resolve, 2000));
        const verifyResult = await ssh.execCommand(`ps aux | grep "${availablePort}" | grep -v grep`);
        if (verifyResult.stdout) {
          this.log(`✅ Server verification: Process found running on port ${availablePort}`);
        } else {
          this.log(`⚠️ Server verification: No process found on port ${availablePort}`);
          const logResult = await ssh.execCommand(`cat ${vmProjectPath}/server.log 2>/dev/null || echo "No log file"`);
          this.log(`📄 Server logs: ${logResult.stdout}`);
        }
      }

      const vmIP = await this.getVmExternalIP();
      const projectUrl = `http://${vmIP}:${availablePort}`;

      this.log('🎉 Project restart completed successfully!');
      this.log(`🌐 Project URL: ${projectUrl}`);
      this.log('✅ Server is running with preserved agent modifications');

      return {
        success: true,
        vmIP,
        port: availablePort,
        projectUrl,
        commands: commands,
        repositoryId
      };

    } catch (error) {
      this.log(`❌ Project restart failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    } finally {
      ssh.dispose();
      this.log('🔌 Disconnected from VM (server continues running)');
    }
  }
}
