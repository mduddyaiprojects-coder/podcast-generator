# n8n Community Edition Setup Guide

This guide is specifically tailored for n8n Community Edition, which has several limitations compared to the paid version.

## 🚨 **Community Edition Limitations**

### **What You CAN'T Do:**
- ❌ Use environment variables (`$env.PODCAST_API_BASE_URL`)
- ❌ Import/export workflows easily
- ❌ Use workflow templates
- ❌ Advanced monitoring and alerting
- ❌ Workflow versioning
- ❌ Team collaboration features

### **What You CAN Do:**
- ✅ Create workflows manually
- ✅ Use webhooks
- ✅ Basic HTTP requests
- ✅ Function nodes with JavaScript
- ✅ Basic execution history
- ✅ Manual workflow management

## 🔧 **Community Edition Workflow Setup**

### **1. Manual Workflow Creation**

Since you can't import workflows easily, you'll need to create them manually:

#### **Step 1: Create New Workflow**
1. Open your n8n instance
2. Click **"New Workflow"**
3. Give it a name (e.g., "Content Processing")

#### **Step 2: Add Webhook Trigger**
1. Click **"Add Node"**
2. Search for **"Webhook"**
3. Configure:
   - **HTTP Method:** POST
   - **Path:** `process-content`
   - **Response Mode:** "Respond to Webhook"

#### **Step 3: Add Function Node (Validate Input)**
1. Click **"Add Node"**
2. Search for **"Function"**
3. Add this JavaScript code:
```javascript
// Simple validation and pass-through to Azure Functions
const { content_url, content_type, submission_id, metadata } = $input.first().json;

console.log('n8n: Processing content submission:', { content_url, content_type, submission_id });

// Basic validation
if (!content_url || !content_type) {
  throw new Error('Missing required fields: content_url and content_type');
}

// Pass data through to Azure Functions
return {
  json: {
    content_url,
    content_type,
    submission_id: submission_id || `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    metadata: metadata || {},
    workflow_source: 'n8n'
  }
};
```

#### **Step 4: Add HTTP Request Node (Call API)**
1. Click **"Add Node"**
2. Search for **"HTTP Request"**
3. Configure:
   - **URL:** `https://your-actual-api.azurewebsites.net/api/content`
   - **Method:** POST
   - **Headers:**
     - `Content-Type: application/json`
     - `X-Workflow-Source: n8n`
   - **Body Parameters:**
     - `content_url`: `={{$json.content_url}}`
     - `content_type`: `={{$json.content_type}}`
     - `submission_id`: `={{$json.submission_id}}`
     - `metadata`: `={{JSON.stringify($json.metadata)}}`

#### **Step 5: Add Function Node (Handle Response)**
1. Click **"Add Node"**
2. Search for **"Function"**
3. Add this JavaScript code:
```javascript
// Handle Azure Functions response
const response = $input.first().json;

console.log('n8n: Azure Functions response:', response);

// Check if the API call was successful
if (response.error) {
  throw new Error(`Azure Functions Error: ${response.message || 'Unknown error'}`);
}

// Return success response
return {
  json: {
    success: true,
    message: 'Content processing initiated via n8n',
    submission_id: response.submission_id,
    status: response.status || 'processing',
    timestamp: new Date().toISOString()
  }
};
```

#### **Step 6: Add Respond to Webhook Node (Success)**
1. Click **"Add Node"**
2. Search for **"Respond to Webhook"**
3. Configure:
   - **Response Body:** `={{JSON.stringify($json)}}`

#### **Step 7: Add Function Node (Error Handler)**
1. Click **"Add Node"**
2. Search for **"Function"**
3. Add this JavaScript code:
```javascript
// Simple error handling
const error = $input.first().json;

console.error('n8n: Workflow error:', error);

// Return error response
return {
  json: {
    success: false,
    error: error.message || 'Unknown error occurred',
    timestamp: new Date().toISOString()
  }
};
```

#### **Step 8: Add Respond to Webhook Node (Error)**
1. Click **"Add Node"**
2. Search for **"Respond to Webhook"**
3. Configure:
   - **Response Body:** `={{JSON.stringify($json)}}`
   - **Response Code:** 500

#### **Step 9: Connect the Nodes**
Connect the nodes in this order:
```
Webhook → Validate Input → Call API → Handle Response → Success Response
                                    ↓
                              Error Handler → Error Response
```

### **2. URL Configuration**

**IMPORTANT:** You must manually update the API URLs in each workflow:

#### **Content Processing Workflow:**
- Update URL to: `https://your-actual-api.azurewebsites.net/api/content`

#### **YouTube Extraction Workflow:**
- Update URL to: `https://your-actual-api.azurewebsites.net/api/content`

#### **Document Processing Workflow:**
- Update URL to: `https://your-actual-api.azurewebsites.net/api/content`

#### **TTS Generation Workflow:**
- Update URL to: `https://your-actual-api.azurewebsites.net/api/tts/generate`

#### **Error Handling Workflow:**
- Update URL to: `https://your-actual-api.azurewebsites.net/api/errors/log`

## 🧪 **Testing Community Edition Workflows**

### **1. Test Each Workflow Individually**

```bash
# Test Content Processing
curl -X POST https://your-n8n-instance.azurewebsites.net/webhook/process-content \
  -H "Content-Type: application/json" \
  -d '{
    "content_url": "https://example.com/test",
    "content_type": "url",
    "submission_id": "test-001"
  }'
```

### **2. Check Execution History**

1. Go to **"Executions"** in n8n
2. Look for your test execution
3. Click on it to see detailed logs
4. Check for any errors in the function nodes

### **3. Debug Common Issues**

#### **Issue: Webhook Not Responding**
- Check if workflow is **Active** (toggle switch)
- Verify webhook URL is correct
- Check n8n logs for errors

#### **Issue: API Calls Failing**
- Verify the hardcoded URL is correct
- Check if Azure Functions API is accessible
- Test the API endpoint directly

#### **Issue: Function Node Errors**
- Check the JavaScript code syntax
- Look at execution logs for specific error messages
- Test the function logic step by step

## 🔄 **Workflow Management**

### **1. Backup Workflows**
Since you can't export easily, take screenshots or document the workflow structure.

### **2. Update Workflows**
- Make changes directly in the n8n interface
- Test thoroughly before activating
- Keep backups of working configurations

### **3. Monitor Workflows**
- Check execution history regularly
- Look for failed executions
- Monitor response times

## 📊 **Community Edition Monitoring**

### **Basic Monitoring Options:**

#### **1. Execution History**
- View in n8n interface
- Check success/failure rates
- Review error messages

#### **2. Console Logging**
Add console.log statements in function nodes:
```javascript
console.log('Workflow step completed:', data);
console.error('Error occurred:', error);
```

#### **3. External Monitoring**
Set up external monitoring to ping your webhook endpoints:
```bash
# Health check script
curl -f https://your-n8n-instance.azurewebsites.net/webhook/process-content \
  -H "Content-Type: application/json" \
  -d '{"test": true}' || echo "Webhook down!"
```

## 🚀 **Deployment Strategy**

### **1. Development Environment**
- Create workflows in development n8n instance
- Test thoroughly with sample data
- Document all configurations

### **2. Production Environment**
- Manually recreate workflows in production
- Update all URLs to production endpoints
- Test each workflow individually
- Activate workflows one by one

### **3. Maintenance**
- Regular testing of all workflows
- Monitor execution logs
- Update URLs when API endpoints change
- Keep documentation up to date

## 💡 **Tips for Community Edition**

### **1. Use Descriptive Names**
- Name workflows clearly: "Content Processing - Production"
- Name nodes descriptively: "Validate Input Data"

### **2. Add Comments**
- Use function nodes to add comments
- Document what each step does

### **3. Test Incrementally**
- Build workflows step by step
- Test each node as you add it
- Don't activate until fully tested

### **4. Keep It Simple**
- Avoid complex workflows
- Use simple, clear logic
- Focus on core functionality

## 🔧 **Troubleshooting**

### **Common Community Edition Issues:**

1. **Workflow Not Saving**
   - Check if you're logged in
   - Try refreshing the page
   - Save frequently

2. **Nodes Not Connecting**
   - Make sure you're connecting the right output/input
   - Check node types are compatible

3. **Function Node Errors**
   - Check JavaScript syntax
   - Use console.log for debugging
   - Test logic outside n8n first

4. **Webhook Not Working**
   - Check workflow is active
   - Verify webhook path is correct
   - Test with simple curl commands

This Community Edition approach requires more manual work but is completely functional for the Podcast Generator system!