# iOS Shortcuts Quick Start Guide

## 🚀 Quick Setup (5 minutes)

### Step 1: Open Shortcuts App
- Find and open the **Shortcuts** app on your iPhone/iPad

### Step 2: Create New Shortcut
- Tap the **"+"** button in the top right
- Tap **"Add Action"**

### Step 3: Add Webhook Action
- Search for **"Get Contents of URL"**
- Select it

### Step 4: Configure the Webhook
- **URL**: `https://your-azure-functions-app.azurewebsites.net/api/webhook/share`
- **Method**: **POST**
- **Headers**: Add `Content-Type: application/json`
- **Request Body**: Select **JSON**

### Step 5: Set Up JSON Body
```json
{
  "url": "[Shortcut Input URLs]",
  "title": "[Shortcut Input Text]",
  "content": "[Shortcut Input Text]",
  "type": "webpage"
}
```

**To get the dynamic values:**
1. Delete the static text
2. Tap the **"+"** button next to each field
3. Select **"Shortcut Input"** → **"URLs"** or **"Text"**

### Step 6: Enable Sharing
- Tap the shortcut name at the top
- Rename to **"Send to Podcast Generator"**
- Tap the **settings icon** (gear)
- Enable **"Show in Share Sheet"**
- Set **"Accept Types"** to: **URLs**, **Text**, **Web Pages**

### Step 7: Test It!
1. Open **Safari** and go to any webpage
2. Tap the **Share button** (square with arrow)
3. Look for **"Send to Podcast Generator"**
4. Tap it!

## ✅ Success!
You should see a message like:
> "Content added to your podcast feed"

## 🔗 Get Your RSS Feed
The shortcut will return an RSS feed URL. Copy this URL and add it to your podcast app (Apple Podcasts, Overcast, etc.) to subscribe to your generated episodes.

## 🆘 Need Help?
- Make sure your webhook URL is correct
- Check that all required fields are filled
- Verify "Show in Share Sheet" is enabled
- Try restarting the Shortcuts app

---

**Replace `your-azure-functions-app.azurewebsites.net` with your actual Azure Functions URL!**

