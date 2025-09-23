@description('Azure CDN profile and endpoint for podcast content delivery with comprehensive caching rules')
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
param enableCaching bool = true
param enableCacheInvalidation bool = true
param enableAnalytics bool = true
param cacheDurationDays int = 365
param audioCacheDays int = 365
param imageCacheDays int = 30
param textCacheDays int = 7
param rssCacheMinutes int = 5
param jsonCacheHours int = 24
param enableQueryStringCaching bool = false
param enableGeoFiltering bool = false
param allowedCountries array = []
param blockedCountries array = []

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
    queryStringCachingBehavior: enableQueryStringCaching ? 'UseQueryString' : 'IgnoreQueryString'
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
      description: 'Comprehensive podcast content delivery policy with optimized caching rules'
      rules: [
        // Audio files - Long cache with compression
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
                cacheDuration: '${audioCacheDays}.00:00:00'
              }
            }
            {
              name: 'ModifyResponseHeader'
              parameters: {
                headerAction: 'Overwrite'
                headerName: 'Cache-Control'
                headerValue: 'public, max-age=${audioCacheDays * 24 * 60 * 60}, immutable'
              }
            }
          ]
        }
        // Image files - Medium cache with compression
        {
          name: 'image-cache-rule'
          order: 2
          conditions: [
            {
              name: 'UrlPath'
              parameters: {
                operator: 'BeginsWith'
                matchValues: ['/images/', '/thumbnails/']
              }
            }
          ]
          actions: [
            {
              name: 'CacheExpiration'
              parameters: {
                cacheBehavior: 'Override'
                cacheDuration: '${imageCacheDays}.00:00:00'
              }
            }
            {
              name: 'ModifyResponseHeader'
              parameters: {
                headerAction: 'Overwrite'
                headerName: 'Cache-Control'
                headerValue: 'public, max-age=${imageCacheDays * 24 * 60 * 60}'
              }
            }
          ]
        }
        // Text files - Medium cache with compression
        {
          name: 'text-cache-rule'
          order: 3
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
                cacheDuration: '${textCacheDays}.00:00:00'
              }
            }
            {
              name: 'ModifyResponseHeader'
              parameters: {
                headerAction: 'Overwrite'
                headerName: 'Cache-Control'
                headerValue: 'public, max-age=${textCacheDays * 24 * 60 * 60}'
              }
            }
          ]
        }
        // RSS feeds - Short cache, no compression
        {
          name: 'rss-cache-rule'
          order: 4
          conditions: [
            {
              name: 'UrlPath'
              parameters: {
                operator: 'BeginsWith'
                matchValues: ['/feeds/', '/rss/']
              }
            }
          ]
          actions: [
            {
              name: 'CacheExpiration'
              parameters: {
                cacheBehavior: 'Override'
                cacheDuration: '00:${rssCacheMinutes}:00'
              }
            }
            {
              name: 'ModifyResponseHeader'
              parameters: {
                headerAction: 'Overwrite'
                headerName: 'Cache-Control'
                headerValue: 'public, max-age=${rssCacheMinutes * 60}'
              }
            }
          ]
        }
        // JSON files - Short cache with compression
        {
          name: 'json-cache-rule'
          order: 5
          conditions: [
            {
              name: 'UrlPath'
              parameters: {
                operator: 'BeginsWith'
                matchValues: ['/chapters/', '/metadata/']
              }
            }
          ]
          actions: [
            {
              name: 'CacheExpiration'
              parameters: {
                cacheBehavior: 'Override'
                cacheDuration: '${jsonCacheHours}:00:00'
              }
            }
            {
              name: 'ModifyResponseHeader'
              parameters: {
                headerAction: 'Overwrite'
                headerName: 'Cache-Control'
                headerValue: 'public, max-age=${jsonCacheHours * 60 * 60}'
              }
            }
          ]
        }
        // Temporary files - No cache
        {
          name: 'temp-no-cache-rule'
          order: 6
          conditions: [
            {
              name: 'UrlPath'
              parameters: {
                operator: 'BeginsWith'
                matchValues: ['/temp/', '/tmp/']
              }
            }
          ]
          actions: [
            {
              name: 'CacheExpiration'
              parameters: {
                cacheBehavior: 'BypassCache'
                cacheDuration: '00:00:00'
              }
            }
            {
              name: 'ModifyResponseHeader'
              parameters: {
                headerAction: 'Overwrite'
                headerName: 'Cache-Control'
                headerValue: 'no-cache, no-store, must-revalidate'
              }
            }
          ]
        }
        // Security headers for all content
        {
          name: 'security-headers-rule'
          order: 7
          conditions: [
            {
              name: 'UrlPath'
              parameters: {
                operator: 'BeginsWith'
                matchValues: ['/']
              }
            }
          ]
          actions: [
            {
              name: 'ModifyResponseHeader'
              parameters: {
                headerAction: 'Append'
                headerName: 'X-Content-Type-Options'
                headerValue: 'nosniff'
              }
            }
            {
              name: 'ModifyResponseHeader'
              parameters: {
                headerAction: 'Append'
                headerName: 'X-Frame-Options'
                headerValue: 'DENY'
              }
            }
            {
              name: 'ModifyResponseHeader'
              parameters: {
                headerAction: 'Append'
                headerName: 'X-XSS-Protection'
                headerValue: '1; mode=block'
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

// CDN Analytics (if enabled)
resource cdnAnalytics 'Microsoft.Cdn/profiles/endpoints/analytics@2023-05-01' = if (enableAnalytics) {
  parent: cdnEndpoint
  name: 'analytics'
  properties: {
    enabled: true
  }
}

// CDN Cache Invalidation Policy
resource cacheInvalidationPolicy 'Microsoft.Cdn/profiles/endpoints/cacheInvalidationPolicies@2023-05-01' = if (enableCacheInvalidation) {
  parent: cdnEndpoint
  name: 'invalidation-policy'
  properties: {
    rules: [
      {
        name: 'auto-invalidation-rule'
        description: 'Automatic cache invalidation for updated content'
        conditions: [
          {
            name: 'UrlPath'
            parameters: {
              operator: 'BeginsWith'
              matchValues: ['/audio/', '/images/', '/transcripts/', '/feeds/']
            }
          }
        ]
        actions: [
          {
            name: 'CacheExpiration'
            parameters: {
              cacheBehavior: 'BypassCache'
              cacheDuration: '00:00:00'
            }
          }
        ]
        enabled: true
      }
    ]
  }
}

// CDN Endpoint URL output
output cdnEndpointUrl string = 'https://${cdnEndpoint.properties.hostName}'
output cdnProfileName string = cdnProfile.name
output cdnEndpointName string = cdnEndpoint.name
output customDomainName string = !empty(customDomainName) ? customDomain.name : ''
output analyticsEnabled bool = enableAnalytics
output cacheInvalidationEnabled bool = enableCacheInvalidation
output cachingRulesCount int = 7
