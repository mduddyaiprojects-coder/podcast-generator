#!/bin/bash

# iOS Share Sheet Extension Setup Script
# This script helps set up the iOS Share Sheet extension for the podcast generator

set -e

echo "🍎 Setting up iOS Share Sheet Extension for Podcast Generator..."

# Check if Xcode is installed
if ! command -v xcodebuild &> /dev/null; then
    echo "❌ Xcode is not installed. Please install Xcode from the App Store."
    exit 1
fi

echo "✅ Xcode detected: $(xcodebuild -version | head -n1)"

# Check if we're in the right directory
if [ ! -f "PodcastGenerator.xcodeproj/project.pbxproj" ]; then
    echo "❌ Xcode project not found. Please run this script from the ios/ directory."
    exit 1
fi

echo "✅ Xcode project found"

# Create necessary directories
echo "📁 Creating project directories..."
mkdir -p ShareExtension
mkdir -p Shortcuts
mkdir -p PodcastGenerator.xcodeproj

echo "✅ Project directories created"

# Check if all required files exist
echo "🔍 Checking required files..."

required_files=(
    "ShareExtension/ShareViewController.swift"
    "ShareExtension/MainInterface.storyboard"
    "ShareExtension/Info.plist"
    "ShareExtension/ShareExtension.entitlements"
    "ShareExtension/ShareExtension.xcconfig"
    "Shortcuts/SendToPodcast.shortcut"
    "PodcastGenerator.xcodeproj/project.pbxproj"
)

missing_files=()

for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        missing_files+=("$file")
    fi
done

if [ ${#missing_files[@]} -eq 0 ]; then
    echo "✅ All required files present"
else
    echo "❌ Missing files:"
    for file in "${missing_files[@]}"; do
        echo "   - $file"
    done
    exit 1
fi

# Validate Xcode project
echo "🔧 Validating Xcode project..."
if xcodebuild -project PodcastGenerator.xcodeproj -list &> /dev/null; then
    echo "✅ Xcode project is valid"
else
    echo "❌ Xcode project validation failed"
    exit 1
fi

# Check iOS deployment target
echo "📱 Checking iOS deployment target..."
deployment_target=$(grep -o 'IPHONEOS_DEPLOYMENT_TARGET = [0-9.]*' PodcastGenerator.xcodeproj/project.pbxproj | head -1 | cut -d' ' -f3)
if [ "$deployment_target" = "15.0" ]; then
    echo "✅ iOS deployment target: $deployment_target"
else
    echo "⚠️  iOS deployment target: $deployment_target (expected 15.0)"
fi

# Check bundle identifier
echo "🆔 Checking bundle identifier..."
bundle_id=$(grep -o 'PRODUCT_BUNDLE_IDENTIFIER = [^;]*' PodcastGenerator.xcodeproj/project.pbxproj | head -1 | cut -d' ' -f3)
if [ "$bundle_id" = "com.podcastgenerator.shareextension" ]; then
    echo "✅ Bundle identifier: $bundle_id"
else
    echo "⚠️  Bundle identifier: $bundle_id (expected com.podcastgenerator.shareextension)"
fi

# Check Swift version
echo "🐦 Checking Swift version..."
swift_version=$(grep -o 'SWIFT_VERSION = [0-9.]*' PodcastGenerator.xcodeproj/project.pbxproj | head -1 | cut -d' ' -f3)
if [ "$swift_version" = "5.0" ]; then
    echo "✅ Swift version: $swift_version"
else
    echo "⚠️  Swift version: $swift_version (expected 5.0)"
fi

# Check entitlements
echo "🔐 Checking entitlements..."
if [ -f "ShareExtension/ShareExtension.entitlements" ]; then
    if grep -q "group.com.podcastgenerator.share" ShareExtension/ShareExtension.entitlements; then
        echo "✅ App Groups configured"
    else
        echo "⚠️  App Groups not configured properly"
    fi
else
    echo "❌ Entitlements file not found"
fi

# Check Info.plist
echo "📋 Checking Info.plist..."
if [ -f "ShareExtension/Info.plist" ]; then
    if grep -q "NSExtensionPointIdentifier" ShareExtension/Info.plist; then
        echo "✅ Extension configuration found"
    else
        echo "⚠️  Extension configuration incomplete"
    fi
else
    echo "❌ Info.plist not found"
fi

# Check storyboard
echo "🎨 Checking storyboard..."
if [ -f "ShareExtension/MainInterface.storyboard" ]; then
    if grep -q "ShareViewController" ShareExtension/MainInterface.storyboard; then
        echo "✅ Storyboard configured"
    else
        echo "⚠️  Storyboard configuration incomplete"
    fi
else
    echo "❌ Storyboard not found"
fi

# Check shortcuts
echo "⚡ Checking iOS Shortcuts..."
if [ -f "Shortcuts/SendToPodcast.shortcut" ]; then
    if grep -q "WFWorkflowActions" Shortcuts/SendToPodcast.shortcut; then
        echo "✅ Shortcuts workflow configured"
    else
        echo "⚠️  Shortcuts workflow incomplete"
    fi
else
    echo "❌ Shortcuts file not found"
fi

echo ""
echo "🎉 iOS Share Sheet Extension setup complete!"
echo ""
echo "Next steps:"
echo "1. Open PodcastGenerator.xcodeproj in Xcode"
echo "2. Update the API base URL in ShareViewController.swift"
echo "3. Configure your Apple Developer Team ID"
echo "4. Set up App Groups in your Apple Developer account"
echo "5. Build and test on a device"
echo ""
echo "Configuration files to update:"
echo "  - ShareViewController.swift: API endpoint URL"
echo "  - ShareExtension.xcconfig: Development team ID"
echo "  - ShareExtension.entitlements: App Groups ID"
echo ""
echo "For detailed setup instructions, see README.md"

