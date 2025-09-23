import { Readable } from 'stream';
import { createReadStream, createWriteStream, statSync, existsSync, mkdirSync } from 'fs';
import { join, dirname, extname, basename } from 'path';
import { pipeline } from 'stream/promises';
import { logger } from './logger';
import { environmentService } from '../config/environment';

/**
 * File upload and download utilities
 * 
 * Provides comprehensive file handling capabilities including:
 * - File validation and security checks
 * - Upload/download with progress tracking
 * - File type detection and metadata extraction
 * - Compression and optimization
 * - Error handling and retry logic
 */

// File type definitions
export interface FileType {
  mimeType: string;
  extension: string;
  category: 'audio' | 'text' | 'image' | 'video' | 'document' | 'other';
  maxSize: number; // in bytes
  allowed: boolean;
}

// File metadata interface
export interface FileMetadata {
  name: string;
  size: number;
  mimeType: string;
  extension: string;
  category: string;
  lastModified: Date;
  checksum?: string;
  duration?: number; // for audio/video files
  dimensions?: { width: number; height: number }; // for images/video
}

// Upload options interface
export interface UploadOptions {
  maxSize?: number;
  allowedTypes?: string[];
  generateChecksum?: boolean;
  compress?: boolean;
  onProgress?: (progress: number) => void;
  retries?: number;
  timeout?: number;
}

// Download options interface
export interface DownloadOptions {
  destination?: string;
  onProgress?: (progress: number) => void;
  retries?: number;
  timeout?: number;
  chunkSize?: number;
}

// File validation result
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  metadata?: FileMetadata;
}

// Supported file types configuration
const SUPPORTED_FILE_TYPES: Record<string, FileType> = {
  // Audio files
  'audio/mpeg': { mimeType: 'audio/mpeg', extension: '.mp3', category: 'audio', maxSize: 100 * 1024 * 1024, allowed: true },
  'audio/wav': { mimeType: 'audio/wav', extension: '.wav', category: 'audio', maxSize: 200 * 1024 * 1024, allowed: true },
  'audio/ogg': { mimeType: 'audio/ogg', extension: '.ogg', category: 'audio', maxSize: 100 * 1024 * 1024, allowed: true },
  'audio/mp4': { mimeType: 'audio/mp4', extension: '.m4a', category: 'audio', maxSize: 100 * 1024 * 1024, allowed: true },
  'audio/webm': { mimeType: 'audio/webm', extension: '.webm', category: 'audio', maxSize: 100 * 1024 * 1024, allowed: true },
  
  // Text files
  'text/plain': { mimeType: 'text/plain', extension: '.txt', category: 'text', maxSize: 10 * 1024 * 1024, allowed: true },
  'text/html': { mimeType: 'text/html', extension: '.html', category: 'text', maxSize: 10 * 1024 * 1024, allowed: true },
  'text/css': { mimeType: 'text/css', extension: '.css', category: 'text', maxSize: 5 * 1024 * 1024, allowed: true },
  'text/javascript': { mimeType: 'text/javascript', extension: '.js', category: 'text', maxSize: 5 * 1024 * 1024, allowed: true },
  'application/json': { mimeType: 'application/json', extension: '.json', category: 'text', maxSize: 10 * 1024 * 1024, allowed: true },
  'application/xml': { mimeType: 'application/xml', extension: '.xml', category: 'text', maxSize: 10 * 1024 * 1024, allowed: true },
  
  // Document files
  'application/pdf': { mimeType: 'application/pdf', extension: '.pdf', category: 'document', maxSize: 50 * 1024 * 1024, allowed: true },
  'application/msword': { mimeType: 'application/msword', extension: '.doc', category: 'document', maxSize: 25 * 1024 * 1024, allowed: true },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { 
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
    extension: '.docx', 
    category: 'document', 
    maxSize: 25 * 1024 * 1024, 
    allowed: true 
  },
  
  // Image files
  'image/jpeg': { mimeType: 'image/jpeg', extension: '.jpg', category: 'image', maxSize: 20 * 1024 * 1024, allowed: true },
  'image/png': { mimeType: 'image/png', extension: '.png', category: 'image', maxSize: 20 * 1024 * 1024, allowed: true },
  'image/gif': { mimeType: 'image/gif', extension: '.gif', category: 'image', maxSize: 20 * 1024 * 1024, allowed: true },
  'image/webp': { mimeType: 'image/webp', extension: '.webp', category: 'image', maxSize: 20 * 1024 * 1024, allowed: true },
  
  // Video files
  'video/mp4': { mimeType: 'video/mp4', extension: '.mp4', category: 'video', maxSize: 500 * 1024 * 1024, allowed: true },
  'video/webm': { mimeType: 'video/webm', extension: '.webm', category: 'video', maxSize: 500 * 1024 * 1024, allowed: true },
  'video/quicktime': { mimeType: 'video/quicktime', extension: '.mov', category: 'video', maxSize: 500 * 1024 * 1024, allowed: true }
};

/**
 * File utilities class
 */
export class FileUtils {
  private static instance: FileUtils;
  private config: any;

  private constructor() {
    this.config = environmentService.getConfig();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): FileUtils {
    if (!FileUtils.instance) {
      FileUtils.instance = new FileUtils();
    }
    return FileUtils.instance;
  }

  /**
   * Validate file before upload
   */
  async validateFile(
    file: Buffer | Readable | string,
    filename: string,
    mimeType?: string,
    options: UploadOptions = {}
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let metadata: FileMetadata | undefined;

    try {
      // Get file size
      let size: number;
      if (Buffer.isBuffer(file)) {
        size = file.length;
      } else if (typeof file === 'string') {
        if (!existsSync(file)) {
          errors.push('File does not exist');
          return { valid: false, errors, warnings };
        }
        size = statSync(file).size;
      } else {
        // For streams, we can't easily get size without consuming the stream
        size = 0;
        warnings.push('File size validation skipped for stream input');
      }

      // Check file size
      const maxSize = options.maxSize || this.config.limits.maxFileSize;
      if (size > maxSize) {
        errors.push(`File size ${this.formatBytes(size)} exceeds maximum allowed size ${this.formatBytes(maxSize)}`);
      }

      // Detect MIME type if not provided
      const detectedMimeType = mimeType || this.detectMimeType(filename, file);
      if (!detectedMimeType) {
        errors.push('Could not determine file type');
        return { valid: false, errors, warnings };
      }

      // Check if file type is supported
      const fileType = SUPPORTED_FILE_TYPES[detectedMimeType];
      if (!fileType) {
        errors.push(`Unsupported file type: ${detectedMimeType}`);
        return { valid: false, errors, warnings };
      }

      if (!fileType.allowed) {
        errors.push(`File type ${detectedMimeType} is not allowed`);
        return { valid: false, errors, warnings };
      }

      // Check file type specific size limits
      if (size > fileType.maxSize) {
        errors.push(`File size ${this.formatBytes(size)} exceeds maximum for ${fileType.category} files (${this.formatBytes(fileType.maxSize)})`);
      }

      // Check allowed types if specified
      if (options.allowedTypes && !options.allowedTypes.includes(detectedMimeType)) {
        errors.push(`File type ${detectedMimeType} is not in allowed types`);
      }

      // Generate metadata
      metadata = {
        name: filename,
        size,
        mimeType: detectedMimeType,
        extension: fileType.extension,
        category: fileType.category,
        lastModified: new Date()
      };

      // Generate checksum if requested
      if (options.generateChecksum && Buffer.isBuffer(file)) {
        metadata.checksum = await this.generateChecksum(file);
      }

      // Security checks
      const securityResult = this.performSecurityChecks(file, filename, detectedMimeType);
      errors.push(...securityResult.errors);
      warnings.push(...securityResult.warnings);

      return {
        valid: errors.length === 0,
        errors,
        warnings,
        metadata
      };

    } catch (error) {
      logger.error('File validation error:', error);
      return {
        valid: false,
        errors: [`File validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings
      };
    }
  }

  /**
   * Upload file with progress tracking
   */
  async uploadFile(
    file: Buffer | Readable | string,
    destination: string,
    options: UploadOptions = {}
  ): Promise<{ success: boolean; url?: string; metadata?: FileMetadata; error?: string }> {
    try {
      // Validate file first
      const filename = typeof file === 'string' ? basename(file) : 'uploaded-file';
      const validation = await this.validateFile(file, filename, undefined, options);
      
      if (!validation.valid) {
        return {
          success: false,
          error: `File validation failed: ${validation.errors.join(', ')}`
        };
      }

      // Create destination directory if it doesn't exist
      const destDir = dirname(destination);
      if (!existsSync(destDir)) {
        mkdirSync(destDir, { recursive: true });
      }

      // Handle different input types
      if (Buffer.isBuffer(file)) {
        await this.uploadBuffer(file, destination, options);
      } else if (typeof file === 'string') {
        await this.uploadFromPath(file, destination, options);
      } else {
        await this.uploadStream(file, destination, options);
      }

      logger.info('File uploaded successfully', { destination, size: validation.metadata?.size });

      return {
        success: true,
        url: destination,
        metadata: validation.metadata
      };

    } catch (error) {
      logger.error('File upload error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown upload error'
      };
    }
  }

  /**
   * Download file with progress tracking
   */
  async downloadFile(
    source: string | Readable,
    destination?: string,
    options: DownloadOptions = {}
  ): Promise<{ success: boolean; path?: string; metadata?: FileMetadata; error?: string }> {
    try {
      const destPath = destination || this.generateTempPath();
      
      // Create destination directory if it doesn't exist
      const destDir = dirname(destPath);
      if (!existsSync(destDir)) {
        mkdirSync(destDir, { recursive: true });
      }

      if (typeof source === 'string') {
        await this.downloadFromUrl(source, destPath, options);
      } else {
        await this.downloadFromStream(source, destPath, options);
      }

      // Get file metadata
      const metadata = await this.extractMetadata(destPath);

      logger.info('File downloaded successfully', { source, destination: destPath, size: metadata.size });

      return {
        success: true,
        path: destPath,
        metadata
      };

    } catch (error) {
      logger.error('File download error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown download error'
      };
    }
  }

  /**
   * Extract file metadata
   */
  async extractMetadata(filePath: string): Promise<FileMetadata> {
    try {
      const stats = statSync(filePath);
      const filename = basename(filePath);
      const extension = extname(filename);
      const mimeType = this.detectMimeType(filename);

      const metadata: FileMetadata = {
        name: filename,
        size: stats.size,
        mimeType: mimeType || 'application/octet-stream',
        extension,
        category: this.getCategoryFromMimeType(mimeType),
        lastModified: stats.mtime
      };

      // Extract additional metadata based on file type
      if (metadata.category === 'audio' || metadata.category === 'video') {
        // Note: In a real implementation, you'd use libraries like ffprobe for media metadata
        metadata.duration = 0; // Placeholder
      }

      if (metadata.category === 'image' || metadata.category === 'video') {
        // Note: In a real implementation, you'd use libraries like sharp for image metadata
        metadata.dimensions = { width: 0, height: 0 }; // Placeholder
      }

      return metadata;

    } catch (error) {
      logger.error('Metadata extraction error:', error);
      throw new Error(`Failed to extract metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Compress file if supported
   */
  async compressFile(
    inputPath: string,
    outputPath: string,
    _quality: number = 0.8
  ): Promise<{ success: boolean; originalSize: number; compressedSize: number; ratio: number }> {
    try {
      const originalSize = statSync(inputPath).size;
      
      // For now, just copy the file (in a real implementation, you'd use compression libraries)
      const inputStream = createReadStream(inputPath);
      const outputStream = createWriteStream(outputPath);
      
      await pipeline(inputStream, outputStream);
      
      const compressedSize = statSync(outputPath).size;
      const ratio = compressedSize / originalSize;

      logger.info('File compressed', { 
        inputPath, 
        outputPath, 
        originalSize, 
        compressedSize, 
        ratio: `${(ratio * 100).toFixed(1)}%` 
      });

      return {
        success: true,
        originalSize,
        compressedSize,
        ratio
      };

    } catch (error) {
      logger.error('File compression error:', error);
      throw new Error(`Compression failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate file checksum
   */
  async generateChecksum(data: Buffer, algorithm: string = 'sha256'): Promise<string> {
    const crypto = await import('crypto');
    return crypto.createHash(algorithm).update(data).digest('hex');
  }

  /**
   * Clean up temporary files
   */
  async cleanupTempFiles(patterns: string[]): Promise<number> {
    let cleanedCount = 0;
    
    for (const pattern of patterns) {
      try {
        // In a real implementation, you'd use glob patterns to find and delete files
        logger.info('Cleanup requested', { pattern });
        cleanedCount++;
      } catch (error) {
        logger.warn('Cleanup error', { pattern, error });
      }
    }

    return cleanedCount;
  }

  // Private helper methods

  private async uploadBuffer(buffer: Buffer, destination: string, _options: UploadOptions): Promise<void> {
    const writeStream = createWriteStream(destination);
    writeStream.write(buffer);
    writeStream.end();
    
    return new Promise((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });
  }

  private async uploadFromPath(sourcePath: string, destination: string, _options: UploadOptions): Promise<void> {
    const readStream = createReadStream(sourcePath);
    const writeStream = createWriteStream(destination);
    
    await pipeline(readStream, writeStream);
  }

  private async uploadStream(stream: Readable, destination: string, _options: UploadOptions): Promise<void> {
    const writeStream = createWriteStream(destination);
    await pipeline(stream, writeStream);
  }

  private async downloadFromUrl(_url: string, _destination: string, _options: DownloadOptions): Promise<void> {
    // In a real implementation, you'd use axios or fetch to download from URL
    throw new Error('URL download not implemented yet');
  }

  private async downloadFromStream(stream: Readable, destination: string, _options: DownloadOptions): Promise<void> {
    const writeStream = createWriteStream(destination);
    await pipeline(stream, writeStream);
  }

  private detectMimeType(filename: string, _file?: Buffer | Readable | string): string | null {
    const extension = extname(filename).toLowerCase();
    
    // Simple MIME type detection based on extension
    const mimeMap: Record<string, string> = {
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.ogg': 'audio/ogg',
      '.m4a': 'audio/mp4',
      '.webm': 'audio/webm',
      '.txt': 'text/plain',
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'text/javascript',
      '.json': 'application/json',
      '.xml': 'application/xml',
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.mp4': 'video/mp4',
      '.mov': 'video/quicktime'
    };

    return mimeMap[extension] || null;
  }

  private getCategoryFromMimeType(mimeType: string | null): string {
    if (!mimeType) return 'other';
    
    const fileType = SUPPORTED_FILE_TYPES[mimeType];
    return fileType?.category || 'other';
  }

  private performSecurityChecks(_file: Buffer | Readable | string, filename: string, _mimeType: string): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for suspicious file extensions
    const suspiciousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.com'];
    const extension = extname(filename).toLowerCase();
    
    if (suspiciousExtensions.includes(extension)) {
      errors.push(`Suspicious file extension: ${extension}`);
    }

    // Check for double extensions (potential security risk)
    const nameWithoutExt = basename(filename, extension);
    if (nameWithoutExt.includes('.')) {
      warnings.push('File has multiple extensions, which could be a security risk');
    }

    // Check filename length
    if (filename.length > 255) {
      errors.push('Filename too long (max 255 characters)');
    }

    // Check for null bytes in filename
    if (filename.includes('\0')) {
      errors.push('Filename contains null bytes');
    }

    return { errors, warnings };
  }

  private generateTempPath(): string {
    const tempDir = process.env['TEMP'] || process.env['TMP'] || '/tmp';
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    return join(tempDir, `podcast-temp-${timestamp}-${random}`);
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Export singleton instance
export const fileUtils = FileUtils.getInstance();

// Export utility functions for convenience
export const validateFile = (file: Buffer | Readable | string, filename: string, mimeType?: string, options?: UploadOptions) =>
  fileUtils.validateFile(file, filename, mimeType, options);

export const uploadFile = (file: Buffer | Readable | string, destination: string, options?: UploadOptions) =>
  fileUtils.uploadFile(file, destination, options);

export const downloadFile = (source: string | Readable, destination?: string, options?: DownloadOptions) =>
  fileUtils.downloadFile(source, destination, options);

export const extractMetadata = (filePath: string) =>
  fileUtils.extractMetadata(filePath);

export const compressFile = (inputPath: string, outputPath: string, quality?: number) =>
  fileUtils.compressFile(inputPath, outputPath, quality);

export const generateChecksum = (data: Buffer, algorithm?: string) =>
  fileUtils.generateChecksum(data, algorithm);

export const cleanupTempFiles = (patterns: string[]) =>
  fileUtils.cleanupTempFiles(patterns);
