# iOS Share Sheet Extension for Podcast Generator

This directory contains the iOS Share Sheet extension that allows users to share content directly to the Podcast Generator from any iOS app.

## Overview

The iOS integration includes:
- **Share Extension**: Native iOS share sheet for content submission
- **iOS Shortcuts**: Automation workflows for advanced users
- **App Groups**: Shared data storage between extension and main app

## Project Structure

```
ios/
├── ShareExtension/                    # Main share extension
│   ├── ShareViewController.swift     # Main extension controller
│   ├── MainInterface.storyboard     # UI layout
│   ├── Info.plist                   # Extension configuration
│   ├── ShareExtension.entitlements  # App groups and permissions
│   └── ShareExtension.xcconfig      # Build configuration
├── Shortcuts/                        # iOS Shortcuts integration
│   └── SendToPodcast.shortcut       # Shortcuts workflow
├── PodcastGenerator.xcodeproj/       # Xcode project file
│   └── project.pbxproj              # Project configuration
└── README.md                        # This file
```

## Features

### Share Extension
- **Multi-content support**: URLs, text, images, files
- **Real-time processing**: Immediate content submission
- **User-friendly UI**: Clean, intuitive interface
- **Error handling**: Comprehensive error management
- **Loading states**: Visual feedback during processing

### Supported Content Types
- **URLs**: Web pages, articles, videos
- **Text**: Plain text content
- **Images**: Photos, screenshots, graphics
- **Files**: Documents, PDFs, audio files
- **Videos**: Video content (with size limits)

### iOS Shortcuts Integration
- **Automation workflows**: Custom shortcuts for power users
- **Siri integration**: Voice-activated content sharing
- **Batch processing**: Multiple content items at once
- **Custom actions**: Personalized workflow steps

## Setup Instructions

### Prerequisites
- Xcode 15.0 or later
- iOS 15.0 or later
- Apple Developer Account
- Valid code signing certificates

### 1. Configure Xcode Project

1. Open `PodcastGenerator.xcodeproj` in Xcode
2. Update the following settings:
   - **Bundle Identifier**: `com.podcastgenerator.shareextension`
   - **Development Team**: Your Apple Developer Team ID
   - **Deployment Target**: iOS 15.0

### 2. Configure API Endpoints

Update the API base URL in `ShareViewController.swift`:

```swift
private let apiBaseURL = "https://your-azure-functions-app.azurewebsites.net/api"
```

### 3. Set Up App Groups

1. Enable App Groups in your Apple Developer account
2. Create a new App Group: `group.com.podcastgenerator.share`
3. Add the App Group to your provisioning profiles
4. Update the group ID in `ShareExtension.entitlements`

### 4. Configure Code Signing

1. Select your development team in Xcode
2. Ensure provisioning profiles include the App Group
3. Verify code signing settings in `ShareExtension.xcconfig`

### 5. Build and Test

1. Build the project: `⌘+B`
2. Run on device or simulator
3. Test sharing from various apps

## Configuration

### Environment Variables

Update `ShareExtension.xcconfig` with your settings:

```xcconfig
// API Configuration
API_BASE_URL = https://your-azure-functions-app.azurewebsites.net/api
SHARE_EXTENSION_GROUP_ID = group.com.podcastgenerator.share

// Build Settings
PRODUCT_BUNDLE_IDENTIFIER = com.podcastgenerator.shareextension
DEVELOPMENT_TEAM = YOUR_TEAM_ID
```

### Content Type Mapping

The extension automatically detects content types:

| iOS Type | Podcast Type | Description |
|----------|--------------|-------------|
| `public.url` | `url` | Web pages, articles |
| `public.plain-text` | `text` | Text content |
| `public.image` | `image` | Images, photos |
| `public.data` | `file` | Files, documents |

### API Integration

The extension communicates with your Azure Functions API:

```swift
// Content submission structure
struct ContentSubmission: Codable {
    let url: String?
    let title: String
    let description: String?
    let contentType: ContentType
}
```

## Usage

### For End Users

1. **Install the app** from the App Store
2. **Enable the extension** in iOS Settings > Podcast Generator > Share Extension
3. **Share content** from any app using the share sheet
4. **Add notes** (optional) before submitting

### For Developers

1. **Customize the UI** in `MainInterface.storyboard`
2. **Add new content types** in `ShareViewController.swift`
3. **Extend API integration** as needed
4. **Test thoroughly** with various content types

## Testing

### Manual Testing

1. **Test different content types**:
   - URLs from Safari
   - Text from Notes
   - Images from Photos
   - Files from Files app

2. **Test error scenarios**:
   - Network connectivity issues
   - Invalid API responses
   - Large file uploads

3. **Test UI interactions**:
   - Text input and editing
   - Loading states
   - Error messages

### Automated Testing

```swift
// Example unit test
func testContentSubmission() {
    let content = ContentSubmission(
        url: "https://example.com",
        title: "Test Content",
        description: "Test description",
        contentType: .url
    )
    
    // Test content encoding
    XCTAssertNoThrow(try JSONEncoder().encode(content))
}
```

## Troubleshooting

### Common Issues

1. **Extension not appearing**:
   - Check bundle identifier
   - Verify provisioning profile
   - Restart device

2. **API calls failing**:
   - Check network connectivity
   - Verify API endpoint URL
   - Check server logs

3. **Content not processing**:
   - Check content type support
   - Verify file size limits
   - Check error logs

### Debug Tips

1. **Enable logging** in Xcode console
2. **Check network requests** in Charles Proxy
3. **Test on physical device** for full functionality
4. **Verify app groups** are properly configured

## Security Considerations

### Data Protection
- **App Groups**: Secure shared storage
- **Keychain**: Sensitive data storage
- **Network security**: HTTPS only

### Privacy
- **User consent**: Clear permission requests
- **Data minimization**: Only collect necessary data
- **Transparency**: Clear data usage policies

## Deployment

### App Store Submission

1. **Archive the project** in Xcode
2. **Upload to App Store Connect**
3. **Configure app metadata**
4. **Submit for review**

### Enterprise Distribution

1. **Create enterprise certificate**
2. **Build for distribution**
3. **Distribute via MDM or direct install**

## Maintenance

### Regular Updates
- **iOS compatibility**: Test with new iOS versions
- **API changes**: Update endpoint configurations
- **Security patches**: Keep dependencies updated

### Monitoring
- **Crash reports**: Monitor via Xcode or third-party tools
- **Analytics**: Track usage patterns
- **Performance**: Monitor API response times

## Support

### Documentation
- **Apple Developer Docs**: Share Extensions
- **iOS Human Interface Guidelines**: Share Sheets
- **Azure Functions Docs**: API integration

### Community
- **GitHub Issues**: Bug reports and feature requests
- **Discord/Slack**: Developer community
- **Stack Overflow**: Technical questions

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## Changelog

### Version 1.0.0
- Initial release
- Basic share extension functionality
- Support for URLs, text, images, and files
- iOS Shortcuts integration
- App Groups configuration
