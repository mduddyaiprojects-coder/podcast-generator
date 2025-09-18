#!/bin/bash

# Azure n8n Workflow Setup Script
# This script configures workflows for your existing Azure-hosted n8n instance

set -e

echo "🚀 Setting up workflows for Azure-hosted n8n instance..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp n8n.env.template .env
    echo "⚠️  Please edit .env file with your Azure n8n host and credentials"
    echo "   Update N8N_HOST with your actual Azure n8n hostname"
    echo "   Update all API keys and connection strings"
else
    echo "✅ .env file already exists"
fi

# Create credentials from templates
echo "🔐 Setting up credential templates..."
for cred_file in credentials/*.json.template; do
    if [ -f "$cred_file" ]; then
        base_name=$(basename "$cred_file" .template)
        if [ ! -f "credentials/$base_name" ]; then
            cp "$cred_file" "credentials/$base_name"
            echo "✅ Created credentials/$base_name"
        else
            echo "✅ credentials/$base_name already exists"
        fi
    fi
done

# Create workflow directories
mkdir -p workflows/{content-processing,youtube-extraction,document-processing,tts-generation,error-handling}
echo "✅ Created workflow directories"

echo ""
echo "🎉 Azure n8n workflow setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your Azure n8n host and credentials:"
echo "   - N8N_HOST=your-actual-azure-n8n-host.azurewebsites.net"
echo "   - Update all API keys and connection strings"
echo ""
echo "2. Configure credentials in your Azure n8n instance:"
echo "   - Go to Settings > Credentials in your n8n interface"
echo "   - Create credentials for each service using the templates"
echo ""
echo "3. Import workflows:"
echo "   - Use the workflow files in workflows/ directory"
echo "   - Import them into your Azure n8n instance"
echo ""
echo "4. Configure webhooks:"
echo "   - Set up webhook URLs to point to your Azure Functions"
echo "   - Update webhook endpoints in workflow configurations"
echo ""
echo "Available workflow types:"
echo "  - Content Processing: Main workflow for content submissions"
echo "  - YouTube Extraction: Process YouTube videos"
echo "  - Document Processing: Handle uploaded documents"
echo "  - TTS Generation: Convert text to speech"
echo "  - Error Handling: Handle errors and retries"
echo ""
echo "Your Azure n8n should be accessible at:"
echo "  https://your-azure-n8n-host.azurewebsites.net"

