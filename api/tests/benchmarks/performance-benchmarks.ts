/**
 * Performance Benchmarks
 * Defines performance benchmarks and thresholds for file upload/download operations
 */

import { PerformanceBenchmark } from '../utils/performance-test-utils';

export const PERFORMANCE_BENCHMARKS: PerformanceBenchmark[] = [
  {
    name: 'Small File Upload (1MB)',
    description: 'Performance benchmark for uploading small files (1MB)',
    baseline: {
      averageResponseTime: 1000, // 1 second
      throughput: 1000000, // 1MB/s
      errorRate: 0.01 // 1%
    },
    thresholds: {
      maxResponseTime: 2000, // 2 seconds
      minThroughput: 500000, // 500KB/s
      maxErrorRate: 0.05 // 5%
    }
  },
  {
    name: 'Medium File Upload (10MB)',
    description: 'Performance benchmark for uploading medium files (10MB)',
    baseline: {
      averageResponseTime: 5000, // 5 seconds
      throughput: 2000000, // 2MB/s
      errorRate: 0.01 // 1%
    },
    thresholds: {
      maxResponseTime: 10000, // 10 seconds
      minThroughput: 1000000, // 1MB/s
      maxErrorRate: 0.05 // 5%
    }
  },
  {
    name: 'Large File Upload (50MB)',
    description: 'Performance benchmark for uploading large files (50MB)',
    baseline: {
      averageResponseTime: 25000, // 25 seconds
      throughput: 2000000, // 2MB/s
      errorRate: 0.02 // 2%
    },
    thresholds: {
      maxResponseTime: 60000, // 60 seconds
      minThroughput: 1000000, // 1MB/s
      maxErrorRate: 0.1 // 10%
    }
  },
  {
    name: 'Audio File Upload (MP3)',
    description: 'Performance benchmark for uploading audio files (MP3)',
    baseline: {
      averageResponseTime: 3000, // 3 seconds
      throughput: 1500000, // 1.5MB/s
      errorRate: 0.01 // 1%
    },
    thresholds: {
      maxResponseTime: 6000, // 6 seconds
      minThroughput: 750000, // 750KB/s
      maxErrorRate: 0.05 // 5%
    }
  },
  {
    name: 'Text File Upload (TXT)',
    description: 'Performance benchmark for uploading text files',
    baseline: {
      averageResponseTime: 500, // 500ms
      throughput: 2000000, // 2MB/s
      errorRate: 0.005 // 0.5%
    },
    thresholds: {
      maxResponseTime: 1000, // 1 second
      minThroughput: 1000000, // 1MB/s
      maxErrorRate: 0.02 // 2%
    }
  },
  {
    name: 'Concurrent Upload (10 users)',
    description: 'Performance benchmark for concurrent file uploads (10 users)',
    baseline: {
      averageResponseTime: 2000, // 2 seconds
      throughput: 5000000, // 5MB/s total
      errorRate: 0.02 // 2%
    },
    thresholds: {
      maxResponseTime: 5000, // 5 seconds
      minThroughput: 2500000, // 2.5MB/s total
      maxErrorRate: 0.1 // 10%
    }
  },
  {
    name: 'Concurrent Upload (50 users)',
    description: 'Performance benchmark for concurrent file uploads (50 users)',
    baseline: {
      averageResponseTime: 5000, // 5 seconds
      throughput: 10000000, // 10MB/s total
      errorRate: 0.05 // 5%
    },
    thresholds: {
      maxResponseTime: 15000, // 15 seconds
      minThroughput: 5000000, // 5MB/s total
      maxErrorRate: 0.2 // 20%
    }
  },
  {
    name: 'File Download (1MB)',
    description: 'Performance benchmark for downloading files (1MB)',
    baseline: {
      averageResponseTime: 500, // 500ms
      throughput: 2000000, // 2MB/s
      errorRate: 0.005 // 0.5%
    },
    thresholds: {
      maxResponseTime: 1000, // 1 second
      minThroughput: 1000000, // 1MB/s
      maxErrorRate: 0.02 // 2%
    }
  },
  {
    name: 'File Download (10MB)',
    description: 'Performance benchmark for downloading files (10MB)',
    baseline: {
      averageResponseTime: 2000, // 2 seconds
      throughput: 5000000, // 5MB/s
      errorRate: 0.01 // 1%
    },
    thresholds: {
      maxResponseTime: 5000, // 5 seconds
      minThroughput: 2000000, // 2MB/s
      maxErrorRate: 0.05 // 5%
    }
  },
  {
    name: 'Blob Storage Upload',
    description: 'Performance benchmark for Azure Blob Storage uploads',
    baseline: {
      averageResponseTime: 1500, // 1.5 seconds
      throughput: 1500000, // 1.5MB/s
      errorRate: 0.01 // 1%
    },
    thresholds: {
      maxResponseTime: 3000, // 3 seconds
      minThroughput: 750000, // 750KB/s
      maxErrorRate: 0.05 // 5%
    }
  },
  {
    name: 'Blob Storage Download',
    description: 'Performance benchmark for Azure Blob Storage downloads',
    baseline: {
      averageResponseTime: 800, // 800ms
      throughput: 2500000, // 2.5MB/s
      errorRate: 0.005 // 0.5%
    },
    thresholds: {
      maxResponseTime: 2000, // 2 seconds
      minThroughput: 1250000, // 1.25MB/s
      maxErrorRate: 0.02 // 2%
    }
  },
  {
    name: 'Mixed File Types Upload',
    description: 'Performance benchmark for uploading mixed file types',
    baseline: {
      averageResponseTime: 2000, // 2 seconds
      throughput: 1500000, // 1.5MB/s
      errorRate: 0.02 // 2%
    },
    thresholds: {
      maxResponseTime: 4000, // 4 seconds
      minThroughput: 750000, // 750KB/s
      maxErrorRate: 0.1 // 10%
    }
  }
];

export const LOAD_TEST_CONFIGS = {
  smallFiles: {
    concurrentUsers: 10,
    totalOperations: 100,
    fileSizes: [1024 * 1024], // 1MB
    fileTypes: ['application/octet-stream'],
    testDuration: 60000, // 1 minute
    rampUpTime: 10000, // 10 seconds
    rampDownTime: 10000 // 10 seconds
  },
  mediumFiles: {
    concurrentUsers: 5,
    totalOperations: 50,
    fileSizes: [10 * 1024 * 1024], // 10MB
    fileTypes: ['application/octet-stream'],
    testDuration: 120000, // 2 minutes
    rampUpTime: 20000, // 20 seconds
    rampDownTime: 20000 // 20 seconds
  },
  largeFiles: {
    concurrentUsers: 2,
    totalOperations: 10,
    fileSizes: [50 * 1024 * 1024], // 50MB
    fileTypes: ['application/octet-stream'],
    testDuration: 300000, // 5 minutes
    rampUpTime: 30000, // 30 seconds
    rampDownTime: 30000 // 30 seconds
  },
  audioFiles: {
    concurrentUsers: 5,
    totalOperations: 25,
    fileSizes: [5 * 1024 * 1024, 10 * 1024 * 1024, 20 * 1024 * 1024], // 5MB, 10MB, 20MB
    fileTypes: ['audio/mpeg', 'audio/wav', 'audio/ogg'],
    testDuration: 180000, // 3 minutes
    rampUpTime: 15000, // 15 seconds
    rampDownTime: 15000 // 15 seconds
  },
  textFiles: {
    concurrentUsers: 20,
    totalOperations: 200,
    fileSizes: [1024, 10 * 1024, 100 * 1024, 1024 * 1024], // 1KB, 10KB, 100KB, 1MB
    fileTypes: ['text/plain', 'application/json', 'application/xml'],
    testDuration: 60000, // 1 minute
    rampUpTime: 5000, // 5 seconds
    rampDownTime: 5000 // 5 seconds
  },
  mixedFiles: {
    concurrentUsers: 10,
    totalOperations: 100,
    fileSizes: [1024 * 1024, 5 * 1024 * 1024, 10 * 1024 * 1024], // 1MB, 5MB, 10MB
    fileTypes: ['application/octet-stream', 'audio/mpeg', 'text/plain', 'image/jpeg'],
    testDuration: 120000, // 2 minutes
    rampUpTime: 10000, // 10 seconds
    rampDownTime: 10000 // 10 seconds
  },
  highConcurrency: {
    concurrentUsers: 50,
    totalOperations: 500,
    fileSizes: [1024 * 1024], // 1MB
    fileTypes: ['application/octet-stream'],
    testDuration: 300000, // 5 minutes
    rampUpTime: 30000, // 30 seconds
    rampDownTime: 30000 // 30 seconds
  },
  stressTest: {
    concurrentUsers: 100,
    totalOperations: 1000,
    fileSizes: [1024 * 1024, 5 * 1024 * 1024], // 1MB, 5MB
    fileTypes: ['application/octet-stream', 'audio/mpeg'],
    testDuration: 600000, // 10 minutes
    rampUpTime: 60000, // 60 seconds
    rampDownTime: 60000 // 60 seconds
  }
};

export const PERFORMANCE_THRESHOLDS = {
  // Response time thresholds (in milliseconds)
  responseTime: {
    excellent: 1000, // 1 second
    good: 2000, // 2 seconds
    acceptable: 5000, // 5 seconds
    poor: 10000, // 10 seconds
    critical: 30000 // 30 seconds
  },
  
  // Throughput thresholds (in bytes per second)
  throughput: {
    excellent: 5000000, // 5MB/s
    good: 2000000, // 2MB/s
    acceptable: 1000000, // 1MB/s
    poor: 500000, // 500KB/s
    critical: 100000 // 100KB/s
  },
  
  // Error rate thresholds (as decimal)
  errorRate: {
    excellent: 0.001, // 0.1%
    good: 0.01, // 1%
    acceptable: 0.05, // 5%
    poor: 0.1, // 10%
    critical: 0.2 // 20%
  },
  
  // Resource utilization thresholds (as percentage)
  resourceUtilization: {
    cpu: {
      excellent: 50,
      good: 70,
      acceptable: 85,
      poor: 95,
      critical: 99
    },
    memory: {
      excellent: 60,
      good: 80,
      acceptable: 90,
      poor: 95,
      critical: 99
    },
    disk: {
      excellent: 70,
      good: 85,
      acceptable: 95,
      poor: 98,
      critical: 99
    }
  }
};

export const PERFORMANCE_GOALS = {
  // Overall system performance goals
  system: {
    maxResponseTime: 5000, // 5 seconds
    minThroughput: 1000000, // 1MB/s
    maxErrorRate: 0.05, // 5%
    availability: 0.999 // 99.9%
  },
  
  // File upload specific goals
  upload: {
    smallFiles: {
      maxResponseTime: 2000, // 2 seconds
      minThroughput: 2000000, // 2MB/s
      maxErrorRate: 0.02 // 2%
    },
    mediumFiles: {
      maxResponseTime: 10000, // 10 seconds
      minThroughput: 1500000, // 1.5MB/s
      maxErrorRate: 0.05 // 5%
    },
    largeFiles: {
      maxResponseTime: 60000, // 60 seconds
      minThroughput: 1000000, // 1MB/s
      maxErrorRate: 0.1 // 10%
    }
  },
  
  // File download specific goals
  download: {
    maxResponseTime: 2000, // 2 seconds
    minThroughput: 5000000, // 5MB/s
    maxErrorRate: 0.01 // 1%
  },
  
  // Concurrent operations goals
  concurrency: {
    maxResponseTime: 10000, // 10 seconds
    minThroughput: 2000000, // 2MB/s
    maxErrorRate: 0.1 // 10%
  }
};

export const PERFORMANCE_METRICS = {
  // Key performance indicators
  kpis: [
    'average_response_time',
    'p95_response_time',
    'p99_response_time',
    'throughput',
    'error_rate',
    'concurrent_users',
    'operations_per_second'
  ],
  
  // Resource metrics
  resources: [
    'cpu_utilization',
    'memory_utilization',
    'disk_utilization',
    'network_utilization',
    'disk_io',
    'network_io'
  ],
  
  // Business metrics
  business: [
    'user_satisfaction',
    'conversion_rate',
    'bounce_rate',
    'session_duration',
    'feature_adoption'
  ]
};

export const PERFORMANCE_ALERTS = {
  // Alert thresholds
  thresholds: {
    responseTime: {
      warning: 3000, // 3 seconds
      critical: 10000 // 10 seconds
    },
    throughput: {
      warning: 500000, // 500KB/s
      critical: 100000 // 100KB/s
    },
    errorRate: {
      warning: 0.05, // 5%
      critical: 0.2 // 20%
    },
    resourceUtilization: {
      warning: 80, // 80%
      critical: 95 // 95%
    }
  },
  
  // Alert conditions
  conditions: {
    responseTimeSpike: {
      description: 'Response time increased by more than 50%',
      threshold: 1.5,
      duration: 300000 // 5 minutes
    },
    throughputDrop: {
      description: 'Throughput decreased by more than 30%',
      threshold: 0.7,
      duration: 300000 // 5 minutes
    },
    errorRateIncrease: {
      description: 'Error rate increased by more than 100%',
      threshold: 2.0,
      duration: 180000 // 3 minutes
    },
    resourceExhaustion: {
      description: 'Resource utilization exceeded 90%',
      threshold: 0.9,
      duration: 600000 // 10 minutes
    }
  }
};






