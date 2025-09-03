#!/usr/bin/env node

/**
 * Deploy updated agent files to GCP VM
 * This script uploads the enhanced agent files with debugging
 */

// Load environment variables from .env file
const fs = require('fs');
const path = require('path');

// Simple .env loader
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envLines = envContent.split('\n');
  for (const line of envLines) {
    const trimmedLine = line.trim();
    if (trimmedLine && !trimmedLine.startsWith('#')) {
      const [key, ...valueParts] = trimmedLine.split('=');
      const value = valueParts.join('=').replace(/^["']|["']$/g, '');
      process.env[key] = value;
    }
  }
}

const { NodeSSH } = require('node-ssh');

async function deployAgent() {
  const ssh = new NodeSSH();
  
  try {
    console.log('🔌 Connecting to GCP VM...');
    await ssh.connect({
      host: process.env.GCP_VM_EXTERNAL_IP,
      username: process.env.GCP_VM_USERNAME,
      privateKeyPath: process.env.GCP_VM_SSH_KEY_PATH
    });
    console.log('✅ Connected to VM successfully');

    const localAgentPath = path.join(__dirname, 'agent');
    const vmAgentPath = `/home/${process.env.GCP_VM_USERNAME}/agent`;
    
    console.log(`📁 Local agent path: ${localAgentPath}`);
    console.log(`📁 VM agent path: ${vmAgentPath}`);

    // Backup existing agent directory
    console.log('💾 Creating backup of existing agent directory...');
    await ssh.execCommand(`cp -r ${vmAgentPath} ${vmAgentPath}_backup_$(date +%Y%m%d_%H%M%S)`);
    
    // Stop the agent service if running
    console.log('🛑 Stopping agent service...');
    await ssh.execCommand('pkill -f "python.*main.py" || true');
    await ssh.execCommand('sleep 2');
    
    // Upload the updated agent files
    console.log('📤 Uploading updated agent files...');
    await ssh.putDirectory(localAgentPath, vmAgentPath, {
      recursive: true,
      concurrency: 10,
      validate: function (itemPath) {
        const baseName = path.basename(itemPath);
        // Skip hidden files, Python cache, and logs
        return !baseName.startsWith('.') && 
               baseName !== '__pycache__' && 
               baseName !== 'logs' &&
               !baseName.endsWith('.pyc');
      }
    });
    console.log('✅ Agent files uploaded successfully');

    // Install any missing dependencies
    console.log('📦 Installing/updating Python dependencies...');
    const pipResult = await ssh.execCommand(`cd ${vmAgentPath} && python3 -m pip install -r requirements.txt --break-system-packages`);
    console.log('Pip install output:', pipResult.stdout);
    if (pipResult.stderr) console.log('Pip install errors:', pipResult.stderr);
    
    // Start the agent service
    console.log('🚀 Starting updated agent service...');
    const startResult = await ssh.execCommand(`cd ${vmAgentPath} && nohup python3 main.py > agent.log 2>&1 & echo $!`);
    
    if (startResult.stdout.trim()) {
      console.log(`✅ Agent started with PID: ${startResult.stdout.trim()}`);
      
      // Wait a moment and check if it's still running
      await new Promise(resolve => setTimeout(resolve, 3000));
      const checkResult = await ssh.execCommand(`ps -p ${startResult.stdout.trim()} -o pid,cmd --no-headers`);
      
      if (checkResult.stdout.trim()) {
        console.log('✅ Agent is running successfully');
        console.log(`Process: ${checkResult.stdout.trim()}`);
      } else {
        console.log('⚠️ Agent may have stopped, check logs');
        const logResult = await ssh.execCommand(`cd ${vmAgentPath} && tail -20 agent.log`);
        console.log('Recent logs:');
        console.log(logResult.stdout);
      }
    } else {
      console.log('❌ Failed to start agent');
    }
    
    console.log('🎉 Agent deployment completed!');
    console.log('📊 Agent should now have enhanced debugging for file operations');
    
  } catch (error) {
    console.error('❌ Deployment failed:', error);
  } finally {
    ssh.dispose();
  }
}

// Check if environment variables are set
const requiredEnvVars = ['GCP_VM_EXTERNAL_IP', 'GCP_VM_USERNAME', 'GCP_VM_SSH_KEY_PATH'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingVars);
  console.error('Please set these in your .env file');
  process.exit(1);
}

deployAgent().catch(console.error);
