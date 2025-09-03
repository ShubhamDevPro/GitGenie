#!/bin/bash

# GitGenie Agent Deployment Script
# This script helps deploy the agent to your GCP VM

set -e

# Configuration
VM_IP="34.131.96.184"
VM_USER="area51_project_ibm"
SSH_KEY_PATH="$HOME/.ssh/gcp-vm-key"
AGENT_DIR="$(pwd)/agent"
REMOTE_DIR="/home/$VM_USER/gitgenie-agent"

echo "🚀 GitGenie Agent Deployment Script"
echo "=================================="
echo "VM IP: $VM_IP"
echo "VM User: $VM_USER"
echo "Local Agent Dir: $AGENT_DIR"
echo "Remote Dir: $REMOTE_DIR"
echo ""

# Check if agent directory exists
if [ ! -d "$AGENT_DIR" ]; then
    echo "❌ Error: Agent directory not found at $AGENT_DIR"
    exit 1
fi

# Check if SSH key exists
if [ ! -f "$SSH_KEY_PATH" ]; then
    echo "❌ Error: SSH key not found at $SSH_KEY_PATH"
    echo "Please update SSH_KEY_PATH in this script or ensure your SSH key is in the correct location"
    exit 1
fi

echo "📦 Creating deployment package..."
cd "$(dirname "$AGENT_DIR")"
tar -czf gitgenie-agent.tar.gz agent/
echo "✅ Package created: gitgenie-agent.tar.gz"

echo "📤 Transferring to GCP VM..."
scp -i "$SSH_KEY_PATH" gitgenie-agent.tar.gz "$VM_USER@$VM_IP:~/"
echo "✅ Transfer completed"

echo "🏗️ Setting up agent on VM..."
ssh -i "$SSH_KEY_PATH" "$VM_USER@$VM_IP" << 'EOF'
    echo "📂 Extracting agent files..."
    cd ~
    rm -rf gitgenie-agent  # Remove old version if exists
    tar -xzf gitgenie-agent.tar.gz
    mv agent gitgenie-agent
    cd gitgenie-agent
    
    echo "🐍 Setting up Python environment..."
    python3 -m venv agent_env || echo "Virtual environment already exists"
    source agent_env/bin/activate
    
    echo "📥 Installing dependencies..."
    pip install --upgrade pip
    pip install -r requirements.txt
    
    echo "⚙️ Checking environment configuration..."
    if [ ! -f ".env" ]; then
        echo "📝 Creating .env file from template..."
        cp .env.example .env
        echo "⚠️ Please edit .env file to add your OpenAI API key"
    else
        echo "✅ .env file already exists"
    fi
    
    echo "🔍 Creating startup script..."
    cat > start_agent.sh << 'SCRIPT'
#!/bin/bash
cd /home/area51_project_ibm/gitgenie-agent
source agent_env/bin/activate
export FLASK_ENV=production
export FLASK_DEBUG=False
python main.py
SCRIPT
    chmod +x start_agent.sh
    
    echo "🔄 Creating systemd service..."
    sudo tee /etc/systemd/system/gitgenie-agent.service > /dev/null << 'SERVICE'
[Unit]
Description=GitGenie OpenAI Agent
After=network.target

[Service]
Type=simple
User=area51_project_ibm
WorkingDirectory=/home/area51_project_ibm/gitgenie-agent
Environment=PATH=/home/area51_project_ibm/gitgenie-agent/agent_env/bin
ExecStart=/home/area51_project_ibm/gitgenie-agent/agent_env/bin/python main.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
SERVICE
    
    echo "🔧 Enabling and starting service..."
    sudo systemctl daemon-reload
    sudo systemctl enable gitgenie-agent
    
    echo "✅ Agent setup completed!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Edit .env file: nano /home/area51_project_ibm/gitgenie-agent/.env"
    echo "2. Add your OpenAI API key to the .env file"
    echo "3. Start the service: sudo systemctl start gitgenie-agent"
    echo "4. Check status: sudo systemctl status gitgenie-agent"
    echo "5. View logs: sudo journalctl -u gitgenie-agent -f"
    echo ""
    echo "🌐 The agent will be available at: http://34.131.96.184:5000"
EOF

echo "🧹 Cleaning up local files..."
rm gitgenie-agent.tar.gz

echo ""
echo "🎉 Deployment completed successfully!"
echo ""
echo "📋 Manual steps remaining:"
echo "1. SSH to your VM: ssh -i $SSH_KEY_PATH $VM_USER@$VM_IP"
echo "2. Edit the .env file: nano ~/gitgenie-agent/.env"
echo "3. Add your OpenAI API key"
echo "4. Start the service: sudo systemctl start gitgenie-agent"
echo "5. Test the endpoint: curl http://localhost:5000/"
echo ""
echo "🔗 Your agent will be accessible at: http://$VM_IP:5000"
echo "� GitGenie uses the /fix-sync endpoint for synchronous responses"
echo "�💬 GitGenie will automatically route code modification requests to this agent!"
