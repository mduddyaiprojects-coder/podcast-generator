# iOS Shortcuts Setup Guide

This guide will help you set up iOS Shortcuts to automatically send shared content to your Podcast Generator webhook.

## Prerequisites

- iOS device with iOS 13.0 or later
- Shortcuts app installed (free from App Store)
- Your Podcast Generator webhook URL

## Step 1: Create the Shortcut

1. **Open the Shortcuts app** on your iPhone/iPad
2. **Tap the "+" button** in the top right to create a new shortcut
3. **Tap "Add Action"**
4. **Search for "Get Contents of URL"** and select it

## Step 2: Configure the Webhook

1. **In the "Get Contents of URL" action:**
   - **URL**: Enter your webhook URL: `https://your-azure-functions-app.azurewebsites.net/api/webhook/share`
   - **Method**: Select "POST"
   - **Headers**: Tap "Add Header" and add:
     - **Key**: `Content-Type`
     - **Value**: `application/json`

2. **Tap "Request Body"** and select "JSON"
3. **In the JSON body, enter:**
   ```json
   {
     "url": "https://example.com",
     "title": "Shared Content",
     "content": "",
     "type": "webpage"
   }
   ```

## Step 3: Make it Dynamic

We need to make the shortcut use the actual shared content instead of placeholder values:

1. **Replace the static values with dynamic ones:**
   - **For URL**: Delete the static URL and tap the "+" button next to "url". Select "Shortcut Input" → "URLs"
   - **For title**: Delete the static title and tap the "+" button next to "title". Select "Shortcut Input" → "Text"
   - **For content**: Delete the static content and tap the "+" button next to "content". Select "Shortcut Input" → "Text"

2. **The JSON should now look like:**
   ```json
   {
     "url": "[Shortcut Input URLs]",
     "title": "[Shortcut Input Text]",
     "content": "[Shortcut Input Text]",
     "type": "webpage"
   }
   ```

## Step 4: Handle the Response

1. **Add another action** after "Get Contents of URL"
2. **Search for "Get Value from Input"** and select it
3. **Set the Key to**: `message`
4. **Add a "Show Result" action** to display the success message

## Step 5: Configure Sharing

1. **Tap the shortcut name** at the top
2. **Rename it** to "Send to Podcast Generator"
3. **Tap the settings icon** (gear)
4. **Enable "Show in Share Sheet"**
5. **Set "Accept Types"** to:
   - URLs
   - Text
   - Web Pages

## Step 6: Test the Shortcut

1. **Open Safari** and go to any webpage
2. **Tap the Share button** (square with arrow)
3. **Look for "Send to Podcast Generator"** in the share sheet
4. **Tap it** to test

## Advanced Configuration

### Auto-detect Content Type

You can make the shortcut smarter by auto-detecting the content type:

1. **Add a "Get Value from Input" action** before the webhook call
2. **Set the Key to**: `URLs`
3. **Add an "If" action** to check if the URL contains specific domains:
   - **Condition**: "URLs" "contains" "youtube.com"
   - **If True**: Set type to "youtube"
   - **If False**: Set type to "webpage"

### Add Error Handling

1. **Wrap the webhook call in a "Try" action**
2. **Add error handling** in the "Catch" section
3. **Show an error message** if the webhook fails

## Troubleshooting

### Shortcut Not Appearing in Share Sheet
- Make sure "Show in Share Sheet" is enabled
- Check that the accepted types match what you're sharing
- Try restarting the Shortcuts app

### Webhook Returns Error
- Verify the webhook URL is correct
- Check that the JSON format is valid
- Ensure all required fields (url, title) are provided

### Content Not Processing
- Check the webhook logs for errors
- Verify the content type is supported
- Ensure the RSS feed URL is accessible

## Example Shortcut JSON

Here's a complete example of what your shortcut JSON should look like:

```json
{
  "WFWorkflowActions": [
    {
      "WFWorkflowActionIdentifier": "is.workflow.actions.geturlcontents",
      "WFWorkflowActionParameters": {
        "WFURL": "https://your-azure-functions-app.azurewebsites.net/api/webhook/share",
        "WFHTTPMethod": "POST",
        "WFHTTPHeaders": {
          "Content-Type": "application/json"
        },
        "WFHTTPBodyType": "JSON",
        "WFJSONBody": {
          "url": "{{Shortcut Input URLs}}",
          "title": "{{Shortcut Input Text}}",
          "content": "{{Shortcut Input Text}}",
          "type": "webpage"
        }
      }
    },
    {
      "WFWorkflowActionIdentifier": "is.workflow.actions.getvalue",
      "WFWorkflowActionParameters": {
        "WFInputKey": "message"
      }
    },
    {
      "WFWorkflowActionIdentifier": "is.workflow.actions.showresult",
      "WFWorkflowActionParameters": {}
    }
  ]
}
```

## Next Steps

Once your shortcut is working:

1. **Test with different content types** (web pages, YouTube videos, etc.)
2. **Subscribe to your RSS feed** in your podcast app
3. **Share content regularly** to build your personal podcast feed

## Support

If you encounter issues:
1. Check the webhook logs for error details
2. Verify your shortcut configuration matches this guide
3. Test the webhook directly with curl or Postman
4. Contact support with specific error messages

---

**Note**: Replace `your-azure-functions-app.azurewebsites.net` with your actual Azure Functions URL.

