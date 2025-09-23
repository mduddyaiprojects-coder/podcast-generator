/**
 * Storage Cost Simulator for Testing
 * Provides utilities to simulate different storage scenarios and calculate expected costs
 */

export interface SimulatedFile {
  name: string;
  contentType: string;
  size: number; // in bytes
  lastModified: Date;
  accessTier: 'Hot' | 'Cool' | 'Archive';
  metadata?: Record<string, string>;
}

export interface StorageScenario {
  name: string;
  description: string;
  files: SimulatedFile[];
  expectedCosts: {
    hot: number;
    cool: number;
    archive: number;
    total: number;
  };
  expectedActions: {
    tierToCool: number;
    tierToArchive: number;
    delete: number;
    compress: number;
  };
}

export class StorageCostSimulator {
  private static readonly PRICING = {
    Hot: 0.0184,    // $0.0184 per GB per month
    Cool: 0.01,     // $0.01 per GB per month
    Archive: 0.00099 // $0.00099 per GB per month
  };

  /**
   * Create a realistic podcast storage scenario
   */
  static createPodcastScenario(): StorageScenario {
    const now = Date.now();
    const files: SimulatedFile[] = [];

    // Recent audio files (Hot tier)
    for (let i = 0; i < 10; i++) {
      files.push({
        name: `episode-${i + 1}.mp3`,
        contentType: 'audio/mpeg',
        size: 50 * 1024 * 1024, // 50MB
        lastModified: new Date(now - (i + 1) * 24 * 60 * 60 * 1000), // 1-10 days old
        accessTier: 'Hot'
      });
    }

    // Older audio files (Cool tier)
    for (let i = 0; i < 20; i++) {
      files.push({
        name: `episode-${i + 11}.mp3`,
        contentType: 'audio/mpeg',
        size: 50 * 1024 * 1024, // 50MB
        lastModified: new Date(now - (i + 31) * 24 * 60 * 60 * 1000), // 31-50 days old
        accessTier: 'Cool'
      });
    }

    // Very old audio files (Archive tier)
    for (let i = 0; i < 15; i++) {
      files.push({
        name: `episode-${i + 31}.mp3`,
        contentType: 'audio/mpeg',
        size: 50 * 1024 * 1024, // 50MB
        lastModified: new Date(now - (i + 91) * 24 * 60 * 60 * 1000), // 91-105 days old
        accessTier: 'Archive'
      });
    }

    // Image files
    for (let i = 0; i < 30; i++) {
      files.push({
        name: `thumbnail-${i + 1}.jpg`,
        contentType: 'image/jpeg',
        size: 2 * 1024 * 1024, // 2MB
        lastModified: new Date(now - (i + 1) * 24 * 60 * 60 * 1000), // 1-30 days old
        accessTier: i < 5 ? 'Hot' : i < 15 ? 'Cool' : 'Archive'
      });
    }

    // Text files (transcripts, scripts)
    for (let i = 0; i < 25; i++) {
      files.push({
        name: `transcript-${i + 1}.txt`,
        contentType: 'text/plain',
        size: 1 * 1024 * 1024, // 1MB
        lastModified: new Date(now - (i + 1) * 24 * 60 * 60 * 1000), // 1-25 days old
        accessTier: i < 10 ? 'Hot' : i < 20 ? 'Cool' : 'Archive'
      });
    }

    // RSS feeds
    for (let i = 0; i < 5; i++) {
      files.push({
        name: `feed-${i + 1}.xml`,
        contentType: 'application/rss+xml',
        size: 10 * 1024, // 10KB
        lastModified: new Date(now - (i + 1) * 24 * 60 * 60 * 1000), // 1-5 days old
        accessTier: 'Hot'
      });
    }

    // Temporary files
    for (let i = 0; i < 8; i++) {
      files.push({
        name: `temp-${i + 1}.tmp`,
        contentType: 'application/octet-stream',
        size: 100 * 1024, // 100KB
        lastModified: new Date(now - (i + 1) * 60 * 60 * 1000), // 1-8 hours old
        accessTier: 'Hot',
        metadata: { isTemporary: 'true' }
      });
    }

    const costs = this.calculateScenarioCosts(files);
    const actions = this.calculateExpectedActions(files);

    return {
      name: 'Realistic Podcast Storage',
      description: 'A realistic podcast storage scenario with various file types and ages',
      files,
      expectedCosts: costs,
      expectedActions: actions
    };
  }

  /**
   * Create a high-cost scenario for testing budget alerts
   */
  static createHighCostScenario(): StorageScenario {
    const now = Date.now();
    const files: SimulatedFile[] = [];

    // Many large files in Hot tier
    for (let i = 0; i < 100; i++) {
      files.push({
        name: `large-audio-${i + 1}.mp3`,
        contentType: 'audio/mpeg',
        size: 100 * 1024 * 1024, // 100MB
        lastModified: new Date(now - (i + 1) * 24 * 60 * 60 * 1000), // 1-100 days old
        accessTier: 'Hot'
      });
    }

    const costs = this.calculateScenarioCosts(files);
    const actions = this.calculateExpectedActions(files);

    return {
      name: 'High Cost Scenario',
      description: 'High storage usage scenario to test budget alerts',
      files,
      expectedCosts: costs,
      expectedActions: actions
    };
  }

  /**
   * Create a cost-optimized scenario
   */
  static createOptimizedScenario(): StorageScenario {
    const now = Date.now();
    const files: SimulatedFile[] = [];

    // Most files in appropriate tiers
    for (let i = 0; i < 5; i++) {
      files.push({
        name: `recent-${i + 1}.mp3`,
        contentType: 'audio/mpeg',
        size: 50 * 1024 * 1024, // 50MB
        lastModified: new Date(now - (i + 1) * 24 * 60 * 60 * 1000), // 1-5 days old
        accessTier: 'Hot'
      });
    }

    for (let i = 0; i < 20; i++) {
      files.push({
        name: `cool-${i + 1}.mp3`,
        contentType: 'audio/mpeg',
        size: 50 * 1024 * 1024, // 50MB
        lastModified: new Date(now - (i + 31) * 24 * 60 * 60 * 1000), // 31-50 days old
        accessTier: 'Cool'
      });
    }

    for (let i = 0; i < 30; i++) {
      files.push({
        name: `archive-${i + 1}.mp3`,
        contentType: 'audio/mpeg',
        size: 50 * 1024 * 1024, // 50MB
        lastModified: new Date(now - (i + 91) * 24 * 60 * 60 * 1000), // 91-120 days old
        accessTier: 'Archive'
      });
    }

    const costs = this.calculateScenarioCosts(files);
    const actions = this.calculateExpectedActions(files);

    return {
      name: 'Cost Optimized Scenario',
      description: 'Well-optimized storage scenario with proper tier distribution',
      files,
      expectedCosts: costs,
      expectedActions: actions
    };
  }

  /**
   * Calculate costs for a scenario
   */
  private static calculateScenarioCosts(files: SimulatedFile[]): {
    hot: number;
    cool: number;
    archive: number;
    total: number;
  } {
    let hotGB = 0;
    let coolGB = 0;
    let archiveGB = 0;

    files.forEach(file => {
      const sizeGB = file.size / (1024 * 1024 * 1024);
      switch (file.accessTier) {
        case 'Hot':
          hotGB += sizeGB;
          break;
        case 'Cool':
          coolGB += sizeGB;
          break;
        case 'Archive':
          archiveGB += sizeGB;
          break;
      }
    });

    const hotCost = hotGB * this.PRICING.Hot;
    const coolCost = coolGB * this.PRICING.Cool;
    const archiveCost = archiveGB * this.PRICING.Archive;

    return {
      hot: hotCost,
      cool: coolCost,
      archive: archiveCost,
      total: hotCost + coolCost + archiveCost
    };
  }

  /**
   * Calculate expected actions for a scenario
   */
  private static calculateExpectedActions(files: SimulatedFile[]): {
    tierToCool: number;
    tierToArchive: number;
    delete: number;
    compress: number;
  } {
    const now = Date.now();
    let tierToCool = 0;
    let tierToArchive = 0;
    let delete = 0;
    let compress = 0;

    files.forEach(file => {
      const ageInDays = (now - file.lastModified.getTime()) / (1000 * 60 * 60 * 24);

      // Temporary files
      if (file.metadata?.isTemporary === 'true') {
        if (ageInDays > 1) {
          delete++;
        }
        return;
      }

      // Audio files
      if (file.contentType.startsWith('audio/')) {
        if (ageInDays > 365) {
          delete++;
        } else if (file.accessTier === 'Cool' && ageInDays > 90) {
          tierToArchive++;
        } else if (file.accessTier === 'Hot' && ageInDays > 30) {
          tierToCool++;
        }
        return;
      }

      // Image files
      if (file.contentType.startsWith('image/')) {
        if (ageInDays > 90) {
          delete++;
        } else if (file.accessTier === 'Cool' && ageInDays > 30) {
          tierToArchive++;
        } else if (file.accessTier === 'Hot' && ageInDays > 7) {
          tierToCool++;
        }
        return;
      }

      // Text files
      if (file.contentType.includes('text') || file.contentType.includes('xml')) {
        if (ageInDays > 180) {
          delete++;
        } else if (file.accessTier === 'Cool' && ageInDays > 60) {
          tierToArchive++;
        } else if (file.accessTier === 'Hot' && ageInDays > 14) {
          tierToCool++;
        }
        
        // Compression for large text files
        if (file.size > 1048576 && ageInDays < 180) {
          compress++;
        }
        return;
      }

      // Default handling
      if (ageInDays > 30) {
        delete++;
      } else if (file.accessTier === 'Hot' && ageInDays > 7) {
        tierToCool++;
      }
    });

    return { tierToCool, tierToArchive, delete, compress };
  }

  /**
   * Calculate potential savings from optimization
   */
  static calculateOptimizationSavings(scenario: StorageScenario): {
    currentCost: number;
    optimizedCost: number;
    potentialSavings: number;
    savingsPercentage: number;
  } {
    const currentCost = scenario.expectedCosts.total;
    
    // Simulate optimized scenario
    const optimizedFiles = scenario.files.map(file => {
      const ageInDays = (Date.now() - file.lastModified.getTime()) / (1000 * 60 * 60 * 24);
      let optimizedTier = file.accessTier;

      // Apply optimization rules
      if (file.metadata?.isTemporary === 'true' && ageInDays > 1) {
        return null; // Delete temporary files
      }

      if (file.contentType.startsWith('audio/')) {
        if (ageInDays > 365) {
          return null; // Delete very old audio
        } else if (ageInDays > 90) {
          optimizedTier = 'Archive';
        } else if (ageInDays > 30) {
          optimizedTier = 'Cool';
        }
      } else if (file.contentType.startsWith('image/')) {
        if (ageInDays > 90) {
          return null; // Delete old images
        } else if (ageInDays > 30) {
          optimizedTier = 'Archive';
        } else if (ageInDays > 7) {
          optimizedTier = 'Cool';
        }
      } else if (file.contentType.includes('text') || file.contentType.includes('xml')) {
        if (ageInDays > 180) {
          return null; // Delete old text files
        } else if (ageInDays > 60) {
          optimizedTier = 'Archive';
        } else if (ageInDays > 14) {
          optimizedTier = 'Cool';
        }
      }

      return { ...file, accessTier: optimizedTier };
    }).filter(Boolean) as SimulatedFile[];

    const optimizedCosts = this.calculateScenarioCosts(optimizedFiles);
    const optimizedCost = optimizedCosts.total;
    const potentialSavings = currentCost - optimizedCost;
    const savingsPercentage = (potentialSavings / currentCost) * 100;

    return {
      currentCost,
      optimizedCost,
      potentialSavings,
      savingsPercentage
    };
  }

  /**
   * Generate test data for specific scenarios
   */
  static generateTestData(scenarioName: string, fileCount: number): SimulatedFile[] {
    const now = Date.now();
    const files: SimulatedFile[] = [];

    for (let i = 0; i < fileCount; i++) {
      const age = Math.random() * 365; // Random age up to 1 year
      const size = Math.random() * 100 * 1024 * 1024; // Random size up to 100MB
      const contentTypes = ['audio/mpeg', 'image/jpeg', 'text/plain', 'application/rss+xml'];
      const tiers: ('Hot' | 'Cool' | 'Archive')[] = ['Hot', 'Cool', 'Archive'];

      files.push({
        name: `test-file-${i + 1}.${contentTypes[Math.floor(Math.random() * contentTypes.length)].split('/')[1]}`,
        contentType: contentTypes[Math.floor(Math.random() * contentTypes.length)],
        size: Math.floor(size),
        lastModified: new Date(now - age * 24 * 60 * 60 * 1000),
        accessTier: tiers[Math.floor(Math.random() * tiers.length)]
      });
    }

    return files;
  }
}
