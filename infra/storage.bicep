@description('Azure Storage Account with lifecycle management policies for cost optimization')
param location string = resourceGroup().location
param environment string = 'dev'
param storageAccountName string = 'podcastgen${environment}${uniqueString(resourceGroup().id)}'
param containerName string = 'podcast-content'
param enableHttpsOnly bool = true
param allowBlobPublicAccess bool = false
param minTlsVersion string = 'TLS1_2'
param accessTier string = 'Hot' // Hot, Cool, Archive
param enableVersioning bool = true
param enableChangeFeed bool = true
param enableSoftDelete bool = true
param softDeleteRetentionDays int = 7
param enableBlobRetention bool = true
param blobRetentionDays int = 7
param enableContainerDeleteRetention bool = true
param containerDeleteRetentionDays int = 7

// Storage Account
resource storageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: storageAccountName
  location: location
  sku: {
    name: 'Standard_LRS' // Standard_LRS, Standard_GRS, Standard_RAGRS, Premium_LRS
  }
  kind: 'StorageV2'
  properties: {
    accessTier: accessTier
    supportsHttpsTrafficOnly: enableHttpsOnly
    allowBlobPublicAccess: allowBlobPublicAccess
    minimumTlsVersion: minTlsVersion
    allowSharedKeyAccess: true
    isHnsEnabled: false
    isSftpEnabled: false
    isLocalUserEnabled: false
    networkAcls: {
      bypass: 'AzureServices'
      virtualNetworkRules: []
      ipRules: []
      defaultAction: 'Allow'
    }
    encryption: {
      services: {
        blob: {
          enabled: true
          keyType: 'Account'
        }
        file: {
          enabled: true
          keyType: 'Account'
        }
      }
      keySource: 'Microsoft.Storage'
    }
    blobServices: {
      properties: {
        isVersioningEnabled: enableVersioning
        changeFeed: {
          enabled: enableChangeFeed
        }
        deleteRetentionPolicy: {
          enabled: enableBlobRetention
          days: blobRetentionDays
        }
        containerDeleteRetentionPolicy: {
          enabled: enableContainerDeleteRetention
          days: containerDeleteRetentionDays
        }
        cors: {
          corsRules: [
            {
              allowedOrigins: ['*']
              allowedMethods: ['GET', 'HEAD', 'OPTIONS']
              allowedHeaders: ['*']
              exposedHeaders: ['*']
              maxAgeInSeconds: 3600
            }
          ]
        }
      }
    }
  }
  tags: {
    Environment: environment
    Purpose: 'podcast-generator-storage'
    Created: utcNow('yyyy-MM-dd')
  }
}

// Container
resource container 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-01-01' = {
  parent: storageAccount::blobServices
  name: containerName
  properties: {
    publicAccess: 'None'
    metadata: {
      description: 'Podcast content storage container'
      createdBy: 'podcast-generator-infrastructure'
    }
  }
}

// Lifecycle Management Policy
resource lifecyclePolicy 'Microsoft.Storage/storageAccounts/managementPolicies@2023-01-01' = {
  parent: storageAccount
  name: 'default'
  properties: {
    policy: {
      rules: [
        {
          name: 'PodcastAudioLifecycle'
          type: 'Lifecycle'
          definition: {
            filters: {
              blobTypes: ['blockBlob']
              prefixMatch: ['${containerName}/audio/']
            }
            actions: {
              baseBlob: {
                tierToCool: {
                  daysAfterModificationGreaterThan: 30
                }
                tierToArchive: {
                  daysAfterModificationGreaterThan: 90
                }
                delete: {
                  daysAfterModificationGreaterThan: 365
                }
              }
            }
          }
          enabled: true
        }
        {
          name: 'PodcastImageLifecycle'
          type: 'Lifecycle'
          definition: {
            filters: {
              blobTypes: ['blockBlob']
              prefixMatch: ['${containerName}/images/']
            }
            actions: {
              baseBlob: {
                tierToCool: {
                  daysAfterModificationGreaterThan: 7
                }
                tierToArchive: {
                  daysAfterModificationGreaterThan: 30
                }
                delete: {
                  daysAfterModificationGreaterThan: 90
                }
              }
            }
          }
          enabled: true
        }
        {
          name: 'PodcastTempFilesLifecycle'
          type: 'Lifecycle'
          definition: {
            filters: {
              blobTypes: ['blockBlob']
              prefixMatch: ['${containerName}/temp/']
            }
            actions: {
              baseBlob: {
                delete: {
                  daysAfterModificationGreaterThan: 1
                }
              }
            }
          }
          enabled: true
        }
        {
          name: 'PodcastTranscriptsLifecycle'
          type: 'Lifecycle'
          definition: {
            filters: {
              blobTypes: ['blockBlob']
              prefixMatch: ['${containerName}/transcripts/']
            }
            actions: {
              baseBlob: {
                tierToCool: {
                  daysAfterModificationGreaterThan: 14
                }
                tierToArchive: {
                  daysAfterModificationGreaterThan: 60
                }
                delete: {
                  daysAfterModificationGreaterThan: 180
                }
              }
            }
          }
          enabled: true
        }
        {
          name: 'PodcastRSSFeedsLifecycle'
          type: 'Lifecycle'
          definition: {
            filters: {
              blobTypes: ['blockBlob']
              prefixMatch: ['${containerName}/feeds/']
            }
            actions: {
              baseBlob: {
                tierToCool: {
                  daysAfterModificationGreaterThan: 7
                }
                delete: {
                  daysAfterModificationGreaterThan: 30
                }
              }
            }
          }
          enabled: true
        }
        {
          name: 'PodcastChaptersLifecycle'
          type: 'Lifecycle'
          definition: {
            filters: {
              blobTypes: ['blockBlob']
              prefixMatch: ['${containerName}/chapters/']
            }
            actions: {
              baseBlob: {
                tierToCool: {
                  daysAfterModificationGreaterThan: 14
                }
                delete: {
                  daysAfterModificationGreaterThan: 90
                }
              }
            }
          }
          enabled: true
        }
        {
          name: 'PodcastSummariesLifecycle'
          type: 'Lifecycle'
          definition: {
            filters: {
              blobTypes: ['blockBlob']
              prefixMatch: ['${containerName}/summaries/']
            }
            actions: {
              baseBlob: {
                tierToCool: {
                  daysAfterModificationGreaterThan: 14
                }
                delete: {
                  daysAfterModificationGreaterThan: 90
                }
              }
            }
          }
          enabled: true
        }
        {
          name: 'PodcastScriptsLifecycle'
          type: 'Lifecycle'
          definition: {
            filters: {
              blobTypes: ['blockBlob']
              prefixMatch: ['${containerName}/scripts/']
            }
            actions: {
              baseBlob: {
                tierToCool: {
                  daysAfterModificationGreaterThan: 14
                }
                delete: {
                  daysAfterModificationGreaterThan: 90
                }
              }
            }
          }
          enabled: true
        }
      ]
    }
  }
}

// Storage Account Key (for connection string generation)
resource storageAccountKeys 'Microsoft.Storage/storageAccounts/listKeys@2023-01-01' = {
  parent: storageAccount
  name: 'default'
}

// Outputs
output storageAccountName string = storageAccount.name
output storageAccountId string = storageAccount.id
output containerName string = container.name
output primaryConnectionString string = 'DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};AccountKey=${storageAccountKeys.keys[0].value};EndpointSuffix=${environment().suffixes.storage}'
output blobEndpoint string = storageAccount.properties.primaryEndpoints.blob
output lifecyclePolicyId string = lifecyclePolicy.id
