# GCP VM Integration Setup Guide

This guide explains how to set up and use the GCP VM integration feature that allows running projects on Google Cloud Platform virtual machines with OpenAI-powered analysis.

## Features

🤖 **AI-Powered Project Analysis**: Uses OpenAI to analyze project structure and generate appropriate startup commands
☁️ **Cloud Execution**: Runs projects on GCP VM instances for better scalability
🔍 **Port Discovery**: Automatically finds available ports on the VM
📝 **Smart Command Generation**: Converts Windows batch commands to Linux bash scripts for VM execution

## Prerequisites

1. **GCP Account**: Active Google Cloud Platform account
2. **VM Instance**: A running Linux VM instance on GCP
3. **SSH Access**: SSH key configured for VM access
4. **OpenAI API Key**: Valid OpenAI API key for project analysis

## Environment Setup

Add the following variables to your `.env` file:

```env
# GCP Configuration
GCP_PROJECT_ID="your-gcp-project-id"    # ← Replace with actual project ID
GCP_VM_INSTANCE="your-vm-instance-name"
GCP_VM_ZONE="us-central1-a"
GCP_VM_USERNAME="your-vm-username"
GCP_VM_SSH_KEY_PATH="C:/path/to/your/ssh/private/key"
GCP_VM_EXTERNAL_IP="your-vm-external-ip"

# OpenAI API Key (already configured)
OPENAI_API_KEY="your-openai-api-key"
```

**Example with real values:**
```env
# GCP Configuration
GCP_PROJECT_ID="gitgenie-vm-project-12345"     # ← PROJECT ID (container for all resources)
GCP_VM_INSTANCE="project-runner"               # ← INSTANCE ID (specific VM name)
GCP_VM_ZONE="us-central1-a"
GCP_VM_USERNAME="ubuntu"
GCP_VM_SSH_KEY_PATH="C:/Users/YourName/.ssh/gcp-vm-key"
GCP_VM_EXTERNAL_IP="34.123.45.67"
```

**Key Differences:**
- **GCP_PROJECT_ID**: Your Google Cloud Project (like "my-company-dev-environment")
- **GCP_VM_INSTANCE**: Your specific VM name (like "project-runner" or "web-server")

## GCP VM Setup Steps

### 0. Find or Create Your GCP Project

#### Find Existing Project ID:
```bash
# Method 1: Using gcloud CLI
gcloud projects list

# Method 2: Get current active project
gcloud config get-value project
```

#### Or visit Google Cloud Console:
1. Go to https://console.cloud.google.com/
2. Click the project dropdown at the top
3. Your project ID will be shown next to each project name

#### Create New Project (if needed):
```bash
# Create new project
gcloud projects create YOUR_PROJECT_ID --name="GitGenie VM Project"

# Set as active project
gcloud config set project YOUR_PROJECT_ID

# Enable required APIs
gcloud services enable compute.googleapis.com
```

### 1. Create a VM Instance

```bash
gcloud compute instances create project-runner \
  --zone=us-central1-a \
  --machine-type=e2-medium \
  --subnet=default \
  --network-tier=PREMIUM \
  --image=ubuntu-2004-lts \
  --image-project=ubuntu-os-cloud \
  --boot-disk-size=20GB \
  --boot-disk-type=pd-standard
```

### 2. Install Dependencies on VM

```bash
# SSH into your VM
gcloud compute ssh project-runner --zone=us-central1-a

# Install Node.js and npm
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Git
sudo apt-get install -y git

# Create projects directory
mkdir -p ~/projects
```

### 3. Configure SSH Key

Generate an SSH key pair for authentication:

```bash
# On your local machine
ssh-keygen -t rsa -b 4096 -f ~/.ssh/gcp-vm-key

# Add public key to VM
gcloud compute ssh project-runner --zone=us-central1-a --command="echo '$(cat ~/.ssh/gcp-vm-key.pub)' >> ~/.ssh/authorized_keys"
```

### 4. Configure Firewall Rules

```bash
# Allow incoming traffic on common ports (3000-4000)
gcloud compute firewall-rules create allow-project-ports \
  --allow tcp:3000-4000 \
  --source-ranges 0.0.0.0/0 \
  --description "Allow project development ports"
```

## How It Works

### 1. Project Analysis
- OpenAI analyzes the project's `package.json` to determine project type
- Generates appropriate startup commands (npm start, npm run dev, etc.)
- Detects frameworks like Next.js, React, Vue.js, Express

### 2. VM Deployment
- Clones the repository to the VM
- Finds an available port (3000-4000 range)
- Creates a bash startup script based on AI-generated commands
- Installs dependencies and runs the project

### 3. Access
- Returns the VM's external IP and assigned port
- Projects are accessible via `http://VM_IP:PORT`

## Usage

### Via UI
1. Navigate to the dashboard
2. Find your repository
3. Toggle "Run on GCP VM" switch
4. Click "🚀 Launch Project with AI"

### Via API
```javascript
const response = await fetch('/api/agent/run-project', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    repositoryId: 'your-repo-id',
    useAIAnalysis: true,
    useGCPVM: true
  })
});
```

## Testing VM Connection

Test your VM setup with:

```bash
curl http://localhost:3000/api/admin/test-vm
```

This endpoint checks:
- VM connectivity
- SSH authentication
- Available ports

## Troubleshooting

### Common Issues

1. **SSH Connection Failed**
   - Verify SSH key path in `.env`
   - Check VM is running: `gcloud compute instances list`
   - Ensure firewall allows SSH (port 22)

2. **Project Won't Start**
   - Check VM has Node.js installed
   - Verify project dependencies can be installed
   - Check VM disk space: `df -h`

3. **Can't Access Application**
   - Verify firewall rules allow the assigned port
   - Check if application is running: `ps aux | grep node`
   - Review application logs on VM

### Debug Commands

```bash
# Check VM status
gcloud compute instances describe project-runner --zone=us-central1-a

# SSH into VM and check logs
gcloud compute ssh project-runner --zone=us-central1-a
tail -f ~/projects/[repo-name]/output.log

# Check running processes
ps aux | grep node

# Check open ports
netstat -tuln | grep LISTEN
```

## Security Considerations

- Use dedicated service accounts with minimal permissions
- Regularly rotate SSH keys
- Monitor VM usage and costs
- Consider using VPC for network isolation
- Enable OS Login for better access management

## Cost Optimization

- Use preemptible instances for development
- Stop VMs when not in use
- Monitor usage with Google Cloud billing alerts
- Consider regional persistent disks for better performance

---

For more information, refer to the GCP documentation and OpenAI API documentation.

# Test if you can connect to your VM
ssh -i "C:/Users/sdeep/mykeys/ibm-project-vm" area51_project_ibm@34.131.96.184
