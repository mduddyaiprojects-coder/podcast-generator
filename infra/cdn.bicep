@description('Azure CDN profile and endpoint for podcast content delivery')
param location string = resourceGroup().location
param environment string = 'dev'
param storageAccountName string
param storageContainerName string = 'podcast-content'
param cdnProfileName string = 'podcast-generator-cdn-${environment}'
param cdnEndpointName string = 'podcast-generator-endpoint-${environment}'
param customDomainName string = ''
param sku string = 'Standard_Microsoft' // Standard_Microsoft, Standard_Akamai, Standard_Verizon, Premium_Verizon
param enableHttps bool = true
param enableCompression bool = true
param cacheDurationDays int = 365

// CDN Profile
resource cdnProfile 'Microsoft.Cdn/profiles@2023-05-01' = {
  name: cdnProfileName
  location: 'Global'
  sku: {
    name: sku
  }
  tags: {
    Environment: environment
    Purpose: 'podcast-generator-cdn'
    Created: utcNow('yyyy-MM-dd')
  }
}

// CDN Endpoint
resource cdnEndpoint 'Microsoft.Cdn/profiles/endpoints@2023-05-01' = {
  parent: cdnProfile
  name: cdnEndpointName
  location: 'Global'
  properties: {
    originHostHeader: '${storageAccountName}.blob.core.windows.net'
    isHttpAllowed: !enableHttps
    isHttpsEnabled: enableHttps
    isCompressionEnabled: enableCompression
    contentTypesToCompress: [
      'text/plain'
      'text/html'
      'text/css'
      'text/javascript'
      'application/javascript'
      'application/json'
      'application/xml'
      'audio/mpeg'
      'audio/mp3'
      'audio/wav'
      'audio/ogg'
    ]
    queryStringCachingBehavior: 'IgnoreQueryString'
    origins: [
      {
        name: 'blob-storage-origin'
        hostName: '${storageAccountName}.blob.core.windows.net'
        httpPort: 80
        httpsPort: 443
        originHostHeader: '${storageAccountName}.blob.core.windows.net'
        priority: 1
        weight: 1000
        enabled: true
      }
    ]
    deliveryPolicy: {
      description: 'Podcast content delivery policy'
      rules: [
        {
          name: 'audio-cache-rule'
          order: 1
          conditions: [
            {
              name: 'UrlPath'
              parameters: {
                operator: 'BeginsWith'
                matchValues: ['/audio/']
              }
            }
          ]
          actions: [
            {
              name: 'CacheExpiration'
              parameters: {
                cacheBehavior: 'Override'
                cacheDuration: '${cacheDurationDays}.00:00:00'
              }
            }
          ]
        }
        {
          name: 'text-cache-rule'
          order: 2
          conditions: [
            {
              name: 'UrlPath'
              parameters: {
                operator: 'BeginsWith'
                matchValues: ['/transcripts/', '/scripts/', '/summaries/']
              }
            }
          ]
          actions: [
            {
              name: 'CacheExpiration'
              parameters: {
                cacheBehavior: 'Override'
                cacheDuration: '7.00:00:00'
              }
            }
          ]
        }
        {
          name: 'json-cache-rule'
          order: 3
          conditions: [
            {
              name: 'UrlPath'
              parameters: {
                operator: 'BeginsWith'
                matchValues: ['/chapters/']
              }
            }
          ]
          actions: [
            {
              name: 'CacheExpiration'
              parameters: {
                cacheBehavior: 'Override'
                cacheDuration: '1.00:00:00'
              }
            }
          ]
        }
      ]
    }
  }
  tags: {
    Environment: environment
    Purpose: 'podcast-generator-cdn'
    Created: utcNow('yyyy-MM-dd')
  }
}

// Custom Domain (optional)
resource customDomain 'Microsoft.Cdn/profiles/endpoints/customDomains@2023-05-01' = if (!empty(customDomainName)) {
  parent: cdnEndpoint
  name: customDomainName
  properties: {
    hostName: customDomainName
  }
}

// CDN Endpoint URL output
output cdnEndpointUrl string = 'https://${cdnEndpoint.properties.hostName}'
output cdnProfileName string = cdnProfile.name
output cdnEndpointName string = cdnEndpoint.name
output customDomainName string = !empty(customDomainName) ? customDomain.name : ''
