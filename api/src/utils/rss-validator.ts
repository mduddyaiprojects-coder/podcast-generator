import { logger } from './logger';
import { RssUtils } from './rss-utils';

/**
 * RSS Feed Validator
 * 
 * Provides comprehensive validation for RSS feeds including:
 * - XML structure validation
 * - RSS 2.0 specification compliance
 * - iTunes namespace compliance
 * - Content validation
 * - Performance checks
 */

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  score: number;
  maxScore: number;
  percentage: number;
}

export interface ValidationOptions {
  checkiTunesCompliance?: boolean;
  checkContentQuality?: boolean;
  checkPerformance?: boolean;
  maxEpisodes?: number;
  maxTitleLength?: number;
  maxDescriptionLength?: number;
}

export class RssValidator {
  // Removed unused constants

  private static readonly REQUIRED_CHANNEL_ELEMENTS = [
    'title',
    'description',
    'link',
    'language',
    'lastBuildDate',
    'generator'
  ];

  private static readonly REQUIRED_ITUNES_ELEMENTS = [
    'itunes:author',
    'itunes:summary',
    'itunes:explicit',
    'itunes:category',
    'itunes:owner'
  ];

  private static readonly REQUIRED_ITEM_ELEMENTS = [
    'title',
    'description',
    'link',
    'guid',
    'pubDate',
    'enclosure'
  ];

  private static readonly REQUIRED_ITUNES_ITEM_ELEMENTS = [
    'itunes:title',
    'itunes:summary',
    'itunes:duration',
    'itunes:explicit',
    'itunes:episodeType'
  ];

  /**
   * Validate RSS feed content
   */
  static validateRssFeed(
    rssContent: string,
    options: ValidationOptions = {}
  ): ValidationResult {
    const {
      checkiTunesCompliance = true,
      checkContentQuality = true,
      checkPerformance = true,
      maxEpisodes = 1000,
      maxTitleLength = 255,
      maxDescriptionLength = 4000
    } = options;

    const errors: string[] = [];
    const warnings: string[] = [];
    let score = 0;
    let maxScore = 0;

    logger.info('Starting RSS feed validation');

    // Basic XML structure validation
    const xmlValidation = this.validateXmlStructure(rssContent);
    errors.push(...xmlValidation.errors);
    warnings.push(...xmlValidation.warnings);
    score += xmlValidation.score;
    maxScore += xmlValidation.maxScore;

    // RSS 2.0 specification validation
    const rssValidation = this.validateRssSpecification(rssContent);
    errors.push(...rssValidation.errors);
    warnings.push(...rssValidation.warnings);
    score += rssValidation.score;
    maxScore += rssValidation.maxScore;

    // iTunes compliance validation
    if (checkiTunesCompliance) {
      const itunesValidation = this.validateiTunesCompliance(rssContent);
      errors.push(...itunesValidation.errors);
      warnings.push(...itunesValidation.warnings);
      score += itunesValidation.score;
      maxScore += itunesValidation.maxScore;
    }

    // Content quality validation
    if (checkContentQuality) {
      const contentValidation = this.validateContentQuality(rssContent, {
        maxEpisodes,
        maxTitleLength,
        maxDescriptionLength
      });
      errors.push(...contentValidation.errors);
      warnings.push(...contentValidation.warnings);
      score += contentValidation.score;
      maxScore += contentValidation.maxScore;
    }

    // Performance validation
    if (checkPerformance) {
      const performanceValidation = this.validatePerformance(rssContent);
      errors.push(...performanceValidation.errors);
      warnings.push(...performanceValidation.warnings);
      score += performanceValidation.score;
      maxScore += performanceValidation.maxScore;
    }

    const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
    const valid = errors.length === 0;

    logger.info(`RSS validation completed: ${valid ? 'VALID' : 'INVALID'} (${percentage}%)`);

    return {
      valid,
      errors,
      warnings,
      score,
      maxScore,
      percentage
    };
  }

  /**
   * Validate XML structure
   */
  private static validateXmlStructure(rssContent: string): {
    errors: string[];
    warnings: string[];
    score: number;
    maxScore: number;
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    let score = 0;
    const maxScore = 5;

    // Check XML declaration
    if (!rssContent.includes('<?xml version="1.0" encoding="UTF-8"?>')) {
      errors.push('Missing XML declaration');
    } else {
      score += 1;
    }

    // Check for proper XML encoding
    if (!rssContent.includes('encoding="UTF-8"')) {
      warnings.push('XML encoding should be UTF-8');
    } else {
      score += 1;
    }

    // Check for RSS root element
    if (!rssContent.includes('<rss version="2.0"')) {
      errors.push('Missing or invalid RSS root element');
    } else {
      score += 1;
    }

    // Check for proper closing tags
    if (!rssContent.includes('</rss>')) {
      errors.push('Missing closing RSS tag');
    } else {
      score += 1;
    }

    // Check for channel element
    if (!rssContent.includes('<channel>')) {
      errors.push('Missing channel element');
    } else {
      score += 1;
    }

    return { errors, warnings, score, maxScore };
  }

  /**
   * Validate RSS 2.0 specification compliance
   */
  private static validateRssSpecification(rssContent: string): {
    errors: string[];
    warnings: string[];
    score: number;
    maxScore: number;
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    let score = 0;
    const maxScore = 10;

    // Check required channel elements
    for (const element of this.REQUIRED_CHANNEL_ELEMENTS) {
      if (!rssContent.includes(`<${element}>`)) {
        errors.push(`Missing required channel element: ${element}`);
      } else {
        score += 1;
      }
    }

    // Check for items (episodes)
    const itemMatches = rssContent.match(/<item>/g);
    const itemCount = itemMatches ? itemMatches.length : 0;
    
    if (itemCount === 0) {
      warnings.push('No episodes found in RSS feed');
    } else {
      score += 1;
    }

    // Check for proper item structure
    if (itemCount > 0) {
      const hasValidItems = this.validateItemStructure(rssContent);
      if (hasValidItems) {
        score += 1;
      } else {
        errors.push('Invalid item structure found');
      }
    }

    // Check for CDATA sections in title and description
    if (rssContent.includes('<title>') && !rssContent.includes('<![CDATA[')) {
      warnings.push('Consider using CDATA sections for title and description to avoid XML parsing issues');
    } else {
      score += 1;
    }

    return { errors, warnings, score, maxScore };
  }

  /**
   * Validate iTunes namespace compliance
   */
  private static validateiTunesCompliance(rssContent: string): {
    errors: string[];
    warnings: string[];
    score: number;
    maxScore: number;
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    let score = 0;
    const maxScore = 8;

    // Check iTunes namespace
    if (!rssContent.includes('xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"')) {
      errors.push('Missing iTunes namespace declaration');
    } else {
      score += 1;
    }

    // Check required iTunes channel elements
    for (const element of this.REQUIRED_ITUNES_ELEMENTS) {
      if (!rssContent.includes(`<${element}>`) && !rssContent.includes(`<${element} `)) {
        errors.push(`Missing required iTunes element: ${element}`);
      } else {
        score += 1;
      }
    }

    // Check iTunes type
    if (!rssContent.includes('<itunes:type>')) {
      warnings.push('Missing iTunes type (should be "episodic" or "serial")');
    } else {
      score += 1;
    }

    // Check iTunes image
    if (!rssContent.includes('<itunes:image')) {
      warnings.push('Missing iTunes image (recommended for better podcast app compatibility)');
    } else {
      score += 1;
    }

    // Check iTunes item elements
    const itemMatches = rssContent.match(/<item>/g);
    if (itemMatches && itemMatches.length > 0) {
      const hasItunesItems = this.validateiTunesItemElements(rssContent);
      if (hasItunesItems) {
        score += 1;
      } else {
        errors.push('Missing required iTunes item elements');
      }
    }

    return { errors, warnings, score, maxScore };
  }

  /**
   * Validate content quality
   */
  private static validateContentQuality(
    rssContent: string,
    options: {
      maxEpisodes: number;
      maxTitleLength: number;
      maxDescriptionLength: number;
    }
  ): {
    errors: string[];
    warnings: string[];
    score: number;
    maxScore: number;
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    let score = 0;
    const maxScore = 6;

    // Count episodes
    const itemMatches = rssContent.match(/<item>/g);
    const episodeCount = itemMatches ? itemMatches.length : 0;

    if (episodeCount > options.maxEpisodes) {
      warnings.push(`Too many episodes (${episodeCount}), consider limiting to ${options.maxEpisodes}`);
    } else {
      score += 1;
    }

    // Check for empty titles
    const emptyTitles = (rssContent.match(/<title><\/title>/g) || []).length;
    if (emptyTitles > 0) {
      errors.push(`${emptyTitles} episodes have empty titles`);
    } else {
      score += 1;
    }

    // Check for empty descriptions
    const emptyDescriptions = (rssContent.match(/<description><\/description>/g) || []).length;
    if (emptyDescriptions > 0) {
      warnings.push(`${emptyDescriptions} episodes have empty descriptions`);
    } else {
      score += 1;
    }

    // Check for very long titles
    const titleMatches = rssContent.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/g);
    if (titleMatches) {
      const longTitles = titleMatches.filter(match => {
        const title = match.replace(/<title><!\[CDATA\[(.*?)\]\]><\/title>/, '$1');
        return title.length > options.maxTitleLength;
      }).length;
      
      if (longTitles > 0) {
        warnings.push(`${longTitles} episodes have titles longer than ${options.maxTitleLength} characters`);
      } else {
        score += 1;
      }
    } else {
      score += 1;
    }

    // Check for very long descriptions
    const descriptionMatches = rssContent.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/g);
    if (descriptionMatches) {
      const longDescriptions = descriptionMatches.filter(match => {
        const description = match.replace(/<description><!\[CDATA\[(.*?)\]\]><\/description>/, '$1');
        return description.length > options.maxDescriptionLength;
      }).length;
      
      if (longDescriptions > 0) {
        warnings.push(`${longDescriptions} episodes have descriptions longer than ${options.maxDescriptionLength} characters`);
      } else {
        score += 1;
      }
    } else {
      score += 1;
    }

    // Check for duplicate GUIDs
    const guidMatches = rssContent.match(/<guid[^>]*>(.*?)<\/guid>/g);
    if (guidMatches) {
      const guids = guidMatches.map(match => 
        match.replace(/<guid[^>]*>(.*?)<\/guid>/, '$1')
      );
      const uniqueGuids = new Set(guids);
      
      if (guids.length !== uniqueGuids.size) {
        errors.push('Duplicate GUIDs found in RSS feed');
      } else {
        score += 1;
      }
    } else {
      score += 1;
    }

    return { errors, warnings, score, maxScore };
  }

  /**
   * Validate performance characteristics
   */
  private static validatePerformance(rssContent: string): {
    errors: string[];
    warnings: string[];
    score: number;
    maxScore: number;
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    let score = 0;
    const maxScore = 4;

    // Check RSS feed size
    const sizeKB = Buffer.byteLength(rssContent, 'utf8') / 1024;
    
    if (sizeKB > 1024) { // 1MB
      warnings.push(`RSS feed is large (${sizeKB.toFixed(1)}KB), consider reducing episode count`);
    } else {
      score += 1;
    }

    // Check for excessive whitespace
    const whitespaceRatio = (rssContent.match(/\s/g) || []).length / rssContent.length;
    if (whitespaceRatio > 0.3) {
      warnings.push('RSS feed contains excessive whitespace');
    } else {
      score += 1;
    }

    // Check for proper line endings
    const hasConsistentLineEndings = !rssContent.includes('\r\n') || !rssContent.includes('\n');
    if (!hasConsistentLineEndings) {
      warnings.push('RSS feed has inconsistent line endings');
    } else {
      score += 1;
    }

    // Check for XML comments (should be minimal)
    const commentMatches = rssContent.match(/<!--.*?-->/g);
    const commentCount = commentMatches ? commentMatches.length : 0;
    
    if (commentCount > 10) {
      warnings.push(`RSS feed contains many XML comments (${commentCount}), consider removing unnecessary ones`);
    } else {
      score += 1;
    }

    return { errors, warnings, score, maxScore };
  }

  /**
   * Validate item structure
   */
  private static validateItemStructure(rssContent: string): boolean {
    const itemMatches = rssContent.match(/<item>[\s\S]*?<\/item>/g);
    if (!itemMatches) return false;

    for (const item of itemMatches) {
      for (const element of this.REQUIRED_ITEM_ELEMENTS) {
        if (!item.includes(`<${element}>`) && !item.includes(`<${element} `)) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Validate iTunes item elements
   */
  private static validateiTunesItemElements(rssContent: string): boolean {
    const itemMatches = rssContent.match(/<item>[\s\S]*?<\/item>/g);
    if (!itemMatches) return false;

    for (const item of itemMatches) {
      for (const element of this.REQUIRED_ITUNES_ITEM_ELEMENTS) {
        if (!item.includes(`<${element}>`)) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Quick validation for basic RSS compliance
   */
  static quickValidate(rssContent: string): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    // Basic checks
    if (!rssContent.includes('<?xml version="1.0" encoding="UTF-8"?>')) {
      issues.push('Missing XML declaration');
    }

    if (!rssContent.includes('<rss version="2.0"')) {
      issues.push('Missing RSS 2.0 declaration');
    }

    if (!rssContent.includes('<channel>')) {
      issues.push('Missing channel element');
    }

    if (!rssContent.includes('<item>')) {
      issues.push('No episodes found');
    }

    if (!rssContent.includes('xmlns:itunes=')) {
      issues.push('Missing iTunes namespace');
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  /**
   * Validate RSS feed against iTunes requirements
   */
  static validateiTunesRequirements(rssContent: string): ValidationResult {
    const itunesCompliance = RssUtils.checkiTunesCompliance(rssContent);
    
    return {
      valid: itunesCompliance.compliant,
      errors: itunesCompliance.issues,
      warnings: [],
      score: itunesCompliance.compliant ? 1 : 0,
      maxScore: 1,
      percentage: itunesCompliance.compliant ? 100 : 0
    };
  }

  /**
   * Get validation summary
   */
  static getValidationSummary(result: ValidationResult): string {
    const status = result.valid ? 'VALID' : 'INVALID';
    const errorCount = result.errors.length;
    const warningCount = result.warnings.length;
    
    let summary = `RSS Feed Validation: ${status} (${result.percentage}%)\n`;
    summary += `Score: ${result.score}/${result.maxScore}\n`;
    
    if (errorCount > 0) {
      summary += `\nErrors (${errorCount}):\n`;
      result.errors.forEach(error => summary += `  - ${error}\n`);
    }
    
    if (warningCount > 0) {
      summary += `\nWarnings (${warningCount}):\n`;
      result.warnings.forEach(warning => summary += `  - ${warning}\n`);
    }
    
    return summary.trim();
  }
}
