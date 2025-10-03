import { logger } from '../utils/logger';

/**
 * Script Policy Service
 * 
 * Defines and enforces policy defaults for podcast script generation.
 * Ensures consistent structure, tone, and length across episodes.
 * 
 * Requirements:
 * - FR-008: Script Quality - Structure
 *   "System MUST produce scripts that follow a defined structure: 
 *    intro/hook, 3–7 key points with transitions, recap, and outro."
 * 
 * - FR-009: Script Quality - Tone
 *   "System MUST produce scripts in a consistent, user-appropriate tone 
 *    configurable per show, with the default tone set to 
 *    'Energetic, conversational, and warm.'"
 * 
 * - FR-010: Script Quality - Length
 *   "System MUST target a consistent episode length range of 12–20 minutes."
 */

/**
 * Script structure components
 */
export interface ScriptStructure {
  intro: {
    enabled: boolean;
    description: string;
    targetDuration: string; // e.g., "30-60 seconds"
  };
  hook: {
    enabled: boolean;
    description: string;
    targetDuration: string;
  };
  keyPoints: {
    minCount: number;
    maxCount: number;
    description: string;
  };
  transitions: {
    enabled: boolean;
    description: string;
  };
  recap: {
    enabled: boolean;
    description: string;
    targetDuration: string;
  };
  outro: {
    enabled: boolean;
    description: string;
    targetDuration: string;
  };
}

/**
 * Script tone configuration
 */
export interface ScriptTone {
  name: string;
  description: string;
  characteristics: string[];
  promptGuidance: string; // For LLM prompts
}

/**
 * Script length policy
 */
export interface ScriptLength {
  targetMinMinutes: number;
  targetMaxMinutes: number;
  wordsPerMinute: number; // Average speaking rate
  targetWordCount: {
    min: number;
    max: number;
  };
}

/**
 * Complete script policy configuration
 */
export interface ScriptPolicy {
  structure: ScriptStructure;
  tone: ScriptTone;
  length: ScriptLength;
  version: string;
  lastUpdated: Date;
}

/**
 * Script policy service
 * Provides defaults and validation for script generation
 */
export class ScriptPolicyService {
  private defaultPolicy: ScriptPolicy;

  constructor() {
    this.defaultPolicy = this.createDefaultPolicy();
    logger.info('ScriptPolicyService initialized with default policy', {
      tone: this.defaultPolicy.tone.name,
      lengthRange: `${this.defaultPolicy.length.targetMinMinutes}-${this.defaultPolicy.length.targetMaxMinutes} min`,
      version: this.defaultPolicy.version
    });
  }

  /**
   * Get the default script policy (FR-008, FR-009, FR-010)
   */
  getDefaultPolicy(): ScriptPolicy {
    return { ...this.defaultPolicy };
  }

  /**
   * Get script structure policy (FR-008)
   */
  getStructurePolicy(): ScriptStructure {
    return { ...this.defaultPolicy.structure };
  }

  /**
   * Get script tone policy (FR-009)
   */
  getTonePolicy(): ScriptTone {
    return { ...this.defaultPolicy.tone };
  }

  /**
   * Get script length policy (FR-010)
   */
  getLengthPolicy(): ScriptLength {
    return { ...this.defaultPolicy.length };
  }

  /**
   * Validate script meets policy requirements
   * 
   * @param script - Script content to validate
   * @returns Validation result with any policy violations
   */
  validateScript(script: {
    content: string;
    estimatedDuration?: number;
    wordCount?: number;
  }): {
    valid: boolean;
    violations: string[];
    warnings: string[];
  } {
    const violations: string[] = [];
    const warnings: string[] = [];

    // Calculate word count if not provided
    const wordCount = script.wordCount || this.estimateWordCount(script.content);
    const policy = this.defaultPolicy.length;

    // Validate length (FR-010)
    if (wordCount < policy.targetWordCount.min) {
      violations.push(
        `Script too short: ${wordCount} words (target: ${policy.targetWordCount.min}-${policy.targetWordCount.max})`
      );
    } else if (wordCount > policy.targetWordCount.max) {
      violations.push(
        `Script too long: ${wordCount} words (target: ${policy.targetWordCount.min}-${policy.targetWordCount.max})`
      );
    }

    // Validate structure presence (FR-008)
    const structureChecks = this.checkStructurePresence(script.content);
    if (!structureChecks.hasIntro) {
      warnings.push('Script may be missing intro/hook section');
    }
    if (!structureChecks.hasOutro) {
      warnings.push('Script may be missing outro section');
    }
    if (structureChecks.sectionCount < this.defaultPolicy.structure.keyPoints.minCount) {
      warnings.push(
        `Script may have too few key points: ~${structureChecks.sectionCount} (target: ${this.defaultPolicy.structure.keyPoints.minCount}-${this.defaultPolicy.structure.keyPoints.maxCount})`
      );
    }

    logger.debug('Script validation completed', {
      wordCount,
      violations: violations.length,
      warnings: warnings.length
    });

    return {
      valid: violations.length === 0,
      violations,
      warnings
    };
  }

  /**
   * Generate prompt guidance for LLM script generation
   * Incorporates structure, tone, and length policies
   * 
   * @param contentSummary - Summary of source content
   * @returns Prompt string for LLM
   */
  generateScriptPrompt(contentSummary: string): string {
    const structure = this.defaultPolicy.structure;
    const tone = this.defaultPolicy.tone;
    const length = this.defaultPolicy.length;

    const prompt = `Generate a podcast episode script based on the following content.

CONTENT SUMMARY:
${contentSummary}

SCRIPT REQUIREMENTS:

Structure (FR-008):
1. Intro/Hook (${structure.intro.targetDuration}):
   - ${structure.intro.description}
   - ${structure.hook.description}

2. Key Points (${structure.keyPoints.minCount}-${structure.keyPoints.maxCount} sections):
   - ${structure.keyPoints.description}
   - ${structure.transitions.description}

3. Recap (${structure.recap.targetDuration}):
   - ${structure.recap.description}

4. Outro (${structure.outro.targetDuration}):
   - ${structure.outro.description}

Tone (FR-009):
${tone.promptGuidance}
Style: ${tone.characteristics.join(', ')}

Length (FR-010):
Target: ${length.targetMinMinutes}-${length.targetMaxMinutes} minutes
Word count: ${length.targetWordCount.min}-${length.targetWordCount.max} words
Speaking rate: ~${length.wordsPerMinute} words per minute

OUTPUT FORMAT:
Provide the complete script in a natural, conversational style suitable for audio narration.
Use clear section markers for each structural component.`;

    return prompt;
  }

  /**
   * Estimate word count from script content
   */
  private estimateWordCount(content: string): number {
    // Simple word count: split by whitespace and filter empty strings
    return content.split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Check for presence of structural components
   * Basic heuristic - can be enhanced with NLP
   */
  private checkStructurePresence(content: string): {
    hasIntro: boolean;
    hasOutro: boolean;
    sectionCount: number;
  } {
    const lowerContent = content.toLowerCase();
    
    // Look for intro/hook indicators
    const introIndicators = ['welcome', 'hello', 'today we', 'this episode', 'in this'];
    const hasIntro = introIndicators.some(indicator => lowerContent.includes(indicator));
    
    // Look for outro indicators
    const outroIndicators = ['thanks for listening', 'thank you for', 'until next time', 'see you', 'that\'s all'];
    const hasOutro = outroIndicators.some(indicator => lowerContent.includes(indicator));
    
    // Estimate section count by paragraph breaks or section markers
    const paragraphs = content.split(/\n\n+/).filter(p => p.trim().length > 0);
    const sectionCount = Math.max(3, Math.min(7, Math.floor(paragraphs.length / 2)));
    
    return {
      hasIntro,
      hasOutro,
      sectionCount
    };
  }

  /**
   * Create the default policy configuration
   * Implements FR-008, FR-009, FR-010
   */
  private createDefaultPolicy(): ScriptPolicy {
    // FR-008: Script structure
    const structure: ScriptStructure = {
      intro: {
        enabled: true,
        description: 'Opening that establishes the episode topic and sets expectations',
        targetDuration: '30-60 seconds'
      },
      hook: {
        enabled: true,
        description: 'Compelling opening that captures attention and creates interest',
        targetDuration: '15-30 seconds'
      },
      keyPoints: {
        minCount: 3,
        maxCount: 7,
        description: 'Main content sections covering key topics, insights, or story beats'
      },
      transitions: {
        enabled: true,
        description: 'Smooth connections between sections that maintain flow and context'
      },
      recap: {
        enabled: true,
        description: 'Brief summary of main points covered in the episode',
        targetDuration: '30-45 seconds'
      },
      outro: {
        enabled: true,
        description: 'Closing that wraps up, thanks listeners, and provides next steps',
        targetDuration: '30-45 seconds'
      }
    };

    // FR-009: Script tone (default: "Energetic, conversational, and warm")
    const tone: ScriptTone = {
      name: 'Energetic, Conversational, and Warm',
      description: 'Default podcast tone that engages listeners with enthusiasm and approachability',
      characteristics: [
        'Energetic and enthusiastic',
        'Conversational and natural',
        'Warm and friendly',
        'Approachable and relatable',
        'Engaging and dynamic'
      ],
      promptGuidance: `Write in an energetic, conversational, and warm tone. 
Imagine you're having an engaging conversation with a friend who's genuinely interested in the topic.
Use natural language, contractions, and rhetorical questions.
Show enthusiasm for the subject matter while remaining approachable and relatable.
Avoid overly formal or academic language - this should feel like a friendly chat, not a lecture.`
    };

    // FR-010: Script length (12-20 minutes)
    const length: ScriptLength = {
      targetMinMinutes: 12,
      targetMaxMinutes: 20,
      wordsPerMinute: 150, // Average conversational speaking rate
      targetWordCount: {
        min: 12 * 150, // 1,800 words
        max: 20 * 150  // 3,000 words
      }
    };

    return {
      structure,
      tone,
      length,
      version: '1.0.0',
      lastUpdated: new Date()
    };
  }

  /**
   * Get available tone presets
   * Default is "Energetic, conversational, and warm" (FR-009)
   * Additional tones can be configured per show
   */
  getAvailableTones(): ScriptTone[] {
    return [
      // Default tone (FR-009)
      this.defaultPolicy.tone,
      
      // Additional tone presets for future use
      {
        name: 'Professional and Informative',
        description: 'Clear, authoritative tone suitable for educational or business content',
        characteristics: [
          'Professional and credible',
          'Clear and articulate',
          'Informative and educational',
          'Measured and thoughtful'
        ],
        promptGuidance: 'Write in a professional, informative tone that establishes authority while remaining accessible. Use clear explanations and provide context for complex topics.'
      },
      {
        name: 'Casual and Entertaining',
        description: 'Lighthearted, fun tone for entertainment-focused content',
        characteristics: [
          'Casual and relaxed',
          'Entertaining and fun',
          'Humorous and playful',
          'Spontaneous and lively'
        ],
        promptGuidance: 'Write in a casual, entertaining tone. Feel free to use humor, pop culture references, and playful language. Keep it fun and engaging.'
      },
      {
        name: 'Thoughtful and Reflective',
        description: 'Contemplative tone for deeper, more introspective content',
        characteristics: [
          'Thoughtful and contemplative',
          'Reflective and insightful',
          'Nuanced and balanced',
          'Empathetic and understanding'
        ],
        promptGuidance: 'Write in a thoughtful, reflective tone. Take time to explore ideas deeply, consider multiple perspectives, and invite listeners to think critically.'
      }
    ];
  }

  /**
   * Estimate script duration from word count
   */
  estimateDuration(wordCount: number): number {
    const wpm = this.defaultPolicy.length.wordsPerMinute;
    return Math.round((wordCount / wpm) * 10) / 10; // Round to 1 decimal
  }

  /**
   * Get policy summary for logging/debugging
   */
  getPolicySummary(): string {
    const p = this.defaultPolicy;
    return `Script Policy v${p.version}:
  Structure: ${p.structure.keyPoints.minCount}-${p.structure.keyPoints.maxCount} key points with intro/outro
  Tone: ${p.tone.name}
  Length: ${p.length.targetMinMinutes}-${p.length.targetMaxMinutes} minutes (${p.length.targetWordCount.min}-${p.length.targetWordCount.max} words)`;
  }
}

// Export singleton instance
let scriptPolicyService: ScriptPolicyService | null = null;

/**
 * Get the script policy service instance
 */
export function getScriptPolicyService(): ScriptPolicyService {
  if (!scriptPolicyService) {
    scriptPolicyService = new ScriptPolicyService();
  }
  return scriptPolicyService;
}

/**
 * Get default script policy (convenience function)
 */
export function getDefaultScriptPolicy(): ScriptPolicy {
  return getScriptPolicyService().getDefaultPolicy();
}
