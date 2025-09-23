#!/bin/bash

# Azure CDN Deployment Script for Podcast Generator
# This script deploys Azure CDN resources for content delivery

set -e

# Configuration
RESOURCE_GROUP_NAME="${AZURE_RESOURCE_GROUP_NAME:-podcast-generator-rg}"
LOCATION="${AZURE_LOCATION:-eastus}"
ENVIRONMENT="${ENVIRONMENT:-dev}"
STORAGE_ACCOUNT_NAME="${AZURE_STORAGE_ACCOUNT_NAME}"
CUSTOM_DOMAIN="${CDN_CUSTOM_DOMAIN:-}"
SKU="${CDN_SKU:-Standard_Microsoft}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if Azure CLI is installed
    if ! command -v az &> /dev/null; then
        log_error "Azure CLI is not installed. Please install it first."
        exit 1
    fi
    
    # Check if logged in to Azure
    if ! az account show &> /dev/null; then
        log_error "Not logged in to Azure. Please run 'az login' first."
        exit 1
    fi
    
    # Check required environment variables
    if [ -z "$STORAGE_ACCOUNT_NAME" ]; then
        log_error "AZURE_STORAGE_ACCOUNT_NAME environment variable is required"
        exit 1
    fi
    
    log_info "Prerequisites check passed"
}

# Deploy CDN resources
deploy_cdn() {
    log_info "Deploying Azure CDN resources..."
    
    # Create resource group if it doesn't exist
    if ! az group show --name "$RESOURCE_GROUP_NAME" &> /dev/null; then
        log_info "Creating resource group: $RESOURCE_GROUP_NAME"
        az group create --name "$RESOURCE_GROUP_NAME" --location "$LOCATION"
    else
        log_info "Resource group already exists: $RESOURCE_GROUP_NAME"
    fi
    
    # Deploy CDN using Bicep template
    log_info "Deploying CDN profile and endpoint..."
    az deployment group create \
        --resource-group "$RESOURCE_GROUP_NAME" \
        --template-file "infra/cdn.bicep" \
        --parameters \
            environment="$ENVIRONMENT" \
            storageAccountName="$STORAGE_ACCOUNT_NAME" \
            customDomainName="$CUSTOM_DOMAIN" \
            sku="$SKU" \
        --name "cdn-deployment-$(date +%Y%m%d-%H%M%S)" \
        --output table
    
    log_info "CDN deployment completed successfully"
}

# Get CDN endpoint URL
get_cdn_url() {
    log_info "Retrieving CDN endpoint URL..."
    
    local cdn_profile_name="podcast-generator-cdn-$ENVIRONMENT"
    local cdn_endpoint_name="podcast-generator-endpoint-$ENVIRONMENT"
    
    local cdn_url=$(az cdn endpoint show \
        --resource-group "$RESOURCE_GROUP_NAME" \
        --profile-name "$cdn_profile_name" \
        --name "$cdn_endpoint_name" \
        --query "hostName" \
        --output tsv)
    
    if [ -n "$cdn_url" ]; then
        log_info "CDN Endpoint URL: https://$cdn_url"
        echo "CDN_BASE_URL=https://$cdn_url" > .env.cdn
        log_info "CDN URL saved to .env.cdn"
    else
        log_error "Failed to retrieve CDN endpoint URL"
        exit 1
    fi
}

# Configure CDN settings
configure_cdn() {
    log_info "Configuring CDN settings..."
    
    local cdn_profile_name="podcast-generator-cdn-$ENVIRONMENT"
    local cdn_endpoint_name="podcast-generator-endpoint-$ENVIRONMENT"
    
    # Enable compression
    log_info "Enabling compression..."
    az cdn endpoint update \
        --resource-group "$RESOURCE_GROUP_NAME" \
        --profile-name "$cdn_profile_name" \
        --name "$cdn_endpoint_name" \
        --enable-compression true
    
    # Configure caching rules
    log_info "Configuring caching rules..."
    az cdn endpoint update \
        --resource-group "$RESOURCE_GROUP_NAME" \
        --profile-name "$cdn_profile_name" \
        --name "$cdn_endpoint_name" \
        --query-string-caching-behavior "IgnoreQueryString"
    
    log_info "CDN configuration completed"
}

# Test CDN endpoint
test_cdn() {
    log_info "Testing CDN endpoint..."
    
    local cdn_url=$(cat .env.cdn | grep CDN_BASE_URL | cut -d'=' -f2)
    
    if [ -n "$cdn_url" ]; then
        # Test with a simple request
        local response=$(curl -s -o /dev/null -w "%{http_code}" "$cdn_url" || echo "000")
        
        if [ "$response" = "200" ] || [ "$response" = "404" ]; then
            log_info "CDN endpoint is responding (HTTP $response)"
        else
            log_warn "CDN endpoint test returned HTTP $response"
        fi
    else
        log_warn "No CDN URL found for testing"
    fi
}

# Main execution
main() {
    log_info "Starting Azure CDN deployment for Podcast Generator"
    log_info "Environment: $ENVIRONMENT"
    log_info "Resource Group: $RESOURCE_GROUP_NAME"
    log_info "Storage Account: $STORAGE_ACCOUNT_NAME"
    log_info "CDN SKU: $SKU"
    
    if [ -n "$CUSTOM_DOMAIN" ]; then
        log_info "Custom Domain: $CUSTOM_DOMAIN"
    fi
    
    check_prerequisites
    deploy_cdn
    configure_cdn
    get_cdn_url
    test_cdn
    
    log_info "CDN deployment completed successfully!"
    log_info "Next steps:"
    log_info "1. Update your environment variables with the CDN URL"
    log_info "2. Configure your application to use the CDN endpoint"
    log_info "3. Test content delivery through the CDN"
}

# Run main function
main "$@"
