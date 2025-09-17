#!/bin/bash

# n8n Workflow Environment Setup Script
# This script sets up the n8n workflow environment for the podcast generator

set -e

echo "🚀 Setting up n8n workflow environment for Podcast Generator..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Install dependencies
echo "📦 Installing n8n dependencies..."
npm install

# Create .env file from template if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp n8n.env.template .env
    echo "⚠️  Please edit .env file with your actual credentials before running n8n"
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

# Create logs directory
mkdir -p logs
echo "✅ Created logs directory"

# Create workflow directories
mkdir -p workflows/{content-processing,youtube-extraction,document-processing,tts-generation,error-handling}
echo "✅ Created workflow directories"

# Set up n8n database (if using PostgreSQL)
if [ "$DB_TYPE" = "postgresdb" ] || [ -z "$DB_TYPE" ]; then
    echo "🗄️  Setting up PostgreSQL database for n8n..."
    echo "   Please ensure PostgreSQL is running and create the n8n database:"
    echo "   CREATE DATABASE n8n;"
    echo "   CREATE USER n8n WITH PASSWORD 'your-password';"
    echo "   GRANT ALL PRIVILEGES ON DATABASE n8n TO n8n;"
fi

echo ""
echo "🎉 n8n workflow environment setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your actual Azure n8n host and credentials"
echo "2. Edit credential files in credentials/ directory"
echo "3. Import workflows to your Azure n8n instance"
echo "4. Access your Azure n8n at: https://your-azure-n8n-host.azurewebsites.net"
echo ""
echo "Available commands:"
echo "  npm run dev     - Start n8n in development mode with tunnel"
echo "  npm run start   - Start n8n in production mode"
echo "  npm run import  - Import workflows from workflows/ directory"
echo "  npm run export  - Export workflows to workflows/ directory"
echo ""
