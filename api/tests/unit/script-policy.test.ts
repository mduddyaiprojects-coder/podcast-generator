import { describe, it, expect, beforeEach } from '@jest/globals';

/**
 * Unit Test: Script Policy and Defaults
 * 
 * This test validates the script generation policy including structure,
 * tone defaults, and length targets as defined in the feature requirements.
 * 
 * Requirements Tested:
 * - FR-008 (Script Quality: Structure): intro/hook, 3-7 key points, transitions, recap, outro
 * - FR-009 (Script Quality: Tone): default "Energetic, conversational, and warm"
 * - FR-010 (Script Quality: Length): target 12-20 minutes
 * 
 * This is a pure unit test that validates the script policy configuration
 * and validates script structure without external dependencies.
 */

/**
 * Script Policy Configuration
 * Defines the default structure and settings for generated podcast scripts
 */
interface ScriptPolicy {
  structure: {
    sections: string[];
    minKeyPoints: number;
    maxKeyPoints: number;
    requiresTransitions: boolean;
  };
  tone: {
    default: string;
    allowed: string[];
  };
  length: {
    targetMinMinutes: number;
    targetMaxMinutes: number;
    unit: string;
  };
  metadata: {
    version: string;
    lastUpdated: string;
  };
}

/**
 * Script Structure Validator
 * Validates that a generated script follows the required structure
 */
interface ScriptSection {
  type: string;
  content: string;
  order: number;
  wordCount?: number;
}

interface GeneratedScript {
  sections: ScriptSection[];
  tone: string;
  estimatedDurationMinutes?: number;
  metadata?: {
    generatedAt: string;
    policyVersion: string;
  };
}

/**
 * Default Script Policy
 * This should match the implementation in api/src/services/script-policy.ts
 */
const DEFAULT_SCRIPT_POLICY: ScriptPolicy = {
  structure: {
    sections: ['intro', 'hook', 'key_points', 'transitions', 'recap', 'outro'],
    minKeyPoints: 3,
    maxKeyPoints: 7,
    requiresTransitions: true
  },
  tone: {
    default: 'Energetic, conversational, and warm',
    allowed: [
      'Energetic, conversational, and warm',
      'Professional and informative',
      'Casual and friendly',
      'Educational and detailed',
      'Storytelling and narrative'
    ]
  },
  length: {
    targetMinMinutes: 12,
    targetMaxMinutes: 20,
    unit: 'minutes'
  },
  metadata: {
    version: '1.0.0',
    lastUpdated: '2025-09-29'
  }
};

/**
 * Script Policy Validator
 */
class ScriptPolicyValidator {
  private policy: ScriptPolicy;

  constructor(policy?: ScriptPolicy) {
    this.policy = policy || DEFAULT_SCRIPT_POLICY;
  }

  /**
   * Get the default script policy
   */
  getPolicy(): ScriptPolicy {
    return this.policy;
  }

  /**
   * Validate script structure against policy
   */
  validateStructure(script: GeneratedScript): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Check for required sections
    const sectionTypes = script.sections.map(s => s.type);
    
    // Must have intro/hook
    if (!sectionTypes.includes('intro') && !sectionTypes.includes('hook')) {
      errors.push('Script must include intro or hook section');
    }

    // Must have key points
    const keyPointSections = script.sections.filter(s => 
      s.type === 'key_points' || s.type === 'key_point'
    );
    if (keyPointSections.length < this.policy.structure.minKeyPoints) {
      errors.push(`Script must have at least ${this.policy.structure.minKeyPoints} key points`);
    }
    if (keyPointSections.length > this.policy.structure.maxKeyPoints) {
      errors.push(`Script must have at most ${this.policy.structure.maxKeyPoints} key points`);
    }

    // Must have transitions if required
    if (this.policy.structure.requiresTransitions && keyPointSections.length > 1) {
      const hasTransitions = sectionTypes.includes('transition') || 
                            sectionTypes.includes('transitions');
      if (!hasTransitions) {
        errors.push('Script must include transitions between key points');
      }
    }

    // Must have recap
    if (!sectionTypes.includes('recap') && !sectionTypes.includes('summary')) {
      errors.push('Script must include recap or summary section');
    }

    // Must have outro
    if (!sectionTypes.includes('outro') && !sectionTypes.includes('conclusion')) {
      errors.push('Script must include outro or conclusion section');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate script tone against policy
   */
  validateTone(script: GeneratedScript): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!script.tone) {
      errors.push('Script must specify a tone');
    } else if (!this.policy.tone.allowed.includes(script.tone)) {
      errors.push(`Tone "${script.tone}" is not in allowed list`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate script length against policy
   */
  validateLength(script: GeneratedScript): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!script.estimatedDurationMinutes) {
      warnings.push('Script does not specify estimated duration');
      return { valid: true, errors, warnings };
    }

    if (script.estimatedDurationMinutes < this.policy.length.targetMinMinutes) {
      warnings.push(
        `Script duration (${script.estimatedDurationMinutes} min) is below target minimum (${this.policy.length.targetMinMinutes} min)`
      );
    }

    if (script.estimatedDurationMinutes > this.policy.length.targetMaxMinutes) {
      warnings.push(
        `Script duration (${script.estimatedDurationMinutes} min) exceeds target maximum (${this.policy.length.targetMaxMinutes} min)`
      );
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate complete script against all policies
   */
  validate(script: GeneratedScript): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const structureResult = this.validateStructure(script);
    const toneResult = this.validateTone(script);
    const lengthResult = this.validateLength(script);

    return {
      valid: structureResult.valid && toneResult.valid && lengthResult.valid,
      errors: [
        ...structureResult.errors,
        ...toneResult.errors,
        ...lengthResult.errors
      ],
      warnings: lengthResult.warnings
    };
  }
}

describe('Script Policy Unit Tests', () => {
  let validator: ScriptPolicyValidator;

  beforeEach(() => {
    validator = new ScriptPolicyValidator();
  });

  describe('Default Policy Configuration', () => {
    it('should have correct default script structure requirements', () => {
      const policy = validator.getPolicy();

      expect(policy.structure.sections).toContain('intro');
      expect(policy.structure.sections).toContain('hook');
      expect(policy.structure.sections).toContain('key_points');
      expect(policy.structure.sections).toContain('transitions');
      expect(policy.structure.sections).toContain('recap');
      expect(policy.structure.sections).toContain('outro');
    });

    it('should require 3-7 key points (FR-008)', () => {
      const policy = validator.getPolicy();

      expect(policy.structure.minKeyPoints).toBe(3);
      expect(policy.structure.maxKeyPoints).toBe(7);
    });

    it('should require transitions between key points (FR-008)', () => {
      const policy = validator.getPolicy();

      expect(policy.structure.requiresTransitions).toBe(true);
    });

    it('should have default tone as "Energetic, conversational, and warm" (FR-009)', () => {
      const policy = validator.getPolicy();

      expect(policy.tone.default).toBe('Energetic, conversational, and warm');
    });

    it('should allow multiple tone options', () => {
      const policy = validator.getPolicy();

      expect(policy.tone.allowed.length).toBeGreaterThan(1);
      expect(policy.tone.allowed).toContain('Energetic, conversational, and warm');
      expect(policy.tone.allowed).toContain('Professional and informative');
    });

    it('should target 12-20 minutes duration (FR-010)', () => {
      const policy = validator.getPolicy();

      expect(policy.length.targetMinMinutes).toBe(12);
      expect(policy.length.targetMaxMinutes).toBe(20);
      expect(policy.length.unit).toBe('minutes');
    });

    it('should include policy metadata', () => {
      const policy = validator.getPolicy();

      expect(policy.metadata).toHaveProperty('version');
      expect(policy.metadata).toHaveProperty('lastUpdated');
      expect(policy.metadata.version).toBeTruthy();
    });
  });

  describe('Script Structure Validation', () => {
    it('should accept valid script with all required sections', () => {
      const validScript: GeneratedScript = {
        sections: [
          { type: 'intro', content: 'Welcome to the show...', order: 1 },
          { type: 'hook', content: 'Today we explore...', order: 2 },
          { type: 'key_point', content: 'First point...', order: 3 },
          { type: 'transition', content: 'Moving on...', order: 4 },
          { type: 'key_point', content: 'Second point...', order: 5 },
          { type: 'transition', content: 'Next...', order: 6 },
          { type: 'key_point', content: 'Third point...', order: 7 },
          { type: 'recap', content: 'To summarize...', order: 8 },
          { type: 'outro', content: 'Thanks for listening...', order: 9 }
        ],
        tone: 'Energetic, conversational, and warm',
        estimatedDurationMinutes: 15
      };

      const result = validator.validateStructure(validScript);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject script without intro/hook', () => {
      const invalidScript: GeneratedScript = {
        sections: [
          { type: 'key_point', content: 'First point...', order: 1 },
          { type: 'recap', content: 'Summary...', order: 2 },
          { type: 'outro', content: 'Goodbye...', order: 3 }
        ],
        tone: 'Energetic, conversational, and warm'
      };

      const result = validator.validateStructure(invalidScript);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Script must include intro or hook section');
    });

    it('should reject script with too few key points', () => {
      const invalidScript: GeneratedScript = {
        sections: [
          { type: 'intro', content: 'Welcome...', order: 1 },
          { type: 'key_point', content: 'Only point...', order: 2 },
          { type: 'recap', content: 'Summary...', order: 3 },
          { type: 'outro', content: 'Goodbye...', order: 4 }
        ],
        tone: 'Energetic, conversational, and warm'
      };

      const result = validator.validateStructure(invalidScript);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('at least 3 key points'))).toBe(true);
    });

    it('should reject script with too many key points', () => {
      const sections: ScriptSection[] = [
        { type: 'intro', content: 'Welcome...', order: 1 }
      ];

      // Add 8 key points (exceeds max of 7)
      for (let i = 0; i < 8; i++) {
        sections.push({
          type: 'key_point',
          content: `Point ${i + 1}...`,
          order: i + 2
        });
      }

      sections.push({ type: 'recap', content: 'Summary...', order: 10 });
      sections.push({ type: 'outro', content: 'Goodbye...', order: 11 });

      const invalidScript: GeneratedScript = {
        sections,
        tone: 'Energetic, conversational, and warm'
      };

      const result = validator.validateStructure(invalidScript);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('at most 7 key points'))).toBe(true);
    });

    it('should require transitions for multiple key points', () => {
      const invalidScript: GeneratedScript = {
        sections: [
          { type: 'intro', content: 'Welcome...', order: 1 },
          { type: 'key_point', content: 'First point...', order: 2 },
          { type: 'key_point', content: 'Second point...', order: 3 },
          { type: 'key_point', content: 'Third point...', order: 4 },
          { type: 'recap', content: 'Summary...', order: 5 },
          { type: 'outro', content: 'Goodbye...', order: 6 }
        ],
        tone: 'Energetic, conversational, and warm'
      };

      const result = validator.validateStructure(invalidScript);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('transitions'))).toBe(true);
    });

    it('should reject script without recap', () => {
      const invalidScript: GeneratedScript = {
        sections: [
          { type: 'intro', content: 'Welcome...', order: 1 },
          { type: 'key_point', content: 'First point...', order: 2 },
          { type: 'key_point', content: 'Second point...', order: 3 },
          { type: 'key_point', content: 'Third point...', order: 4 },
          { type: 'outro', content: 'Goodbye...', order: 5 }
        ],
        tone: 'Energetic, conversational, and warm'
      };

      const result = validator.validateStructure(invalidScript);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('recap'))).toBe(true);
    });

    it('should reject script without outro', () => {
      const invalidScript: GeneratedScript = {
        sections: [
          { type: 'intro', content: 'Welcome...', order: 1 },
          { type: 'key_point', content: 'First point...', order: 2 },
          { type: 'key_point', content: 'Second point...', order: 3 },
          { type: 'key_point', content: 'Third point...', order: 4 },
          { type: 'recap', content: 'Summary...', order: 5 }
        ],
        tone: 'Energetic, conversational, and warm'
      };

      const result = validator.validateStructure(invalidScript);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('outro'))).toBe(true);
    });
  });

  describe('Tone Validation', () => {
    it('should accept default tone', () => {
      const script: GeneratedScript = {
        sections: [],
        tone: 'Energetic, conversational, and warm'
      };

      const result = validator.validateTone(script);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept all allowed tones', () => {
      const policy = validator.getPolicy();

      policy.tone.allowed.forEach(tone => {
        const script: GeneratedScript = {
          sections: [],
          tone
        };

        const result = validator.validateTone(script);
        expect(result.valid).toBe(true);
      });
    });

    it('should reject script without tone specified', () => {
      const script: GeneratedScript = {
        sections: [],
        tone: '' // Empty tone
      };

      const result = validator.validateTone(script);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('must specify a tone'))).toBe(true);
    });

    it('should reject invalid tone', () => {
      const script: GeneratedScript = {
        sections: [],
        tone: 'Angry and aggressive' // Not in allowed list
      };

      const result = validator.validateTone(script);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('not in allowed list'))).toBe(true);
    });
  });

  describe('Length Validation', () => {
    it('should accept duration within 12-20 minute target range', () => {
      const durations = [12, 15, 18, 20];

      durations.forEach(duration => {
        const script: GeneratedScript = {
          sections: [],
          tone: 'Energetic, conversational, and warm',
          estimatedDurationMinutes: duration
        };

        const result = validator.validateLength(script);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(result.warnings).toHaveLength(0);
      });
    });

    it('should warn if duration is below minimum target (12 min)', () => {
      const script: GeneratedScript = {
        sections: [],
        tone: 'Energetic, conversational, and warm',
        estimatedDurationMinutes: 10
      };

      const result = validator.validateLength(script);

      expect(result.valid).toBe(true); // Still valid, just a warning
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.includes('below target minimum'))).toBe(true);
    });

    it('should warn if duration exceeds maximum target (20 min)', () => {
      const script: GeneratedScript = {
        sections: [],
        tone: 'Energetic, conversational, and warm',
        estimatedDurationMinutes: 25
      };

      const result = validator.validateLength(script);

      expect(result.valid).toBe(true); // Still valid, just a warning
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.includes('exceeds target maximum'))).toBe(true);
    });

    it('should handle missing duration gracefully', () => {
      const script: GeneratedScript = {
        sections: [],
        tone: 'Energetic, conversational, and warm'
        // No estimatedDurationMinutes
      };

      const result = validator.validateLength(script);

      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.includes('does not specify estimated duration'))).toBe(true);
    });
  });

  describe('Complete Script Validation', () => {
    it('should validate complete valid script successfully', () => {
      const validScript: GeneratedScript = {
        sections: [
          { type: 'intro', content: 'Welcome to Tech Insights...', order: 1 },
          { type: 'hook', content: 'Ever wondered about AI?...', order: 2 },
          { type: 'key_point', content: 'AI basics explained...', order: 3 },
          { type: 'transition', content: 'Moving to practical uses...', order: 4 },
          { type: 'key_point', content: 'Real-world applications...', order: 5 },
          { type: 'transition', content: 'Looking at challenges...', order: 6 },
          { type: 'key_point', content: 'Current limitations...', order: 7 },
          { type: 'recap', content: 'To recap our discussion...', order: 8 },
          { type: 'outro', content: 'Thanks for listening...', order: 9 }
        ],
        tone: 'Energetic, conversational, and warm',
        estimatedDurationMinutes: 15,
        metadata: {
          generatedAt: new Date().toISOString(),
          policyVersion: '1.0.0'
        }
      };

      const result = validator.validate(validScript);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should accumulate multiple validation errors', () => {
      const invalidScript: GeneratedScript = {
        sections: [
          { type: 'key_point', content: 'Only one point...', order: 1 }
          // Missing intro, recap, outro, insufficient key points
        ],
        tone: 'Invalid tone',
        estimatedDurationMinutes: 5
      };

      const result = validator.validate(invalidScript);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });

    it('should provide actionable error messages', () => {
      const invalidScript: GeneratedScript = {
        sections: [
          { type: 'intro', content: 'Intro...', order: 1 }
        ],
        tone: 'Energetic, conversational, and warm'
      };

      const result = validator.validate(invalidScript);

      expect(result.valid).toBe(false);
      result.errors.forEach(error => {
        expect(error.length).toBeGreaterThan(0);
        expect(error).not.toBe('');
      });
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('should accept exactly 3 key points (minimum)', () => {
      const script: GeneratedScript = {
        sections: [
          { type: 'intro', content: 'Welcome...', order: 1 },
          { type: 'key_point', content: 'Point 1...', order: 2 },
          { type: 'transition', content: 'Next...', order: 3 },
          { type: 'key_point', content: 'Point 2...', order: 4 },
          { type: 'transition', content: 'Finally...', order: 5 },
          { type: 'key_point', content: 'Point 3...', order: 6 },
          { type: 'recap', content: 'Summary...', order: 7 },
          { type: 'outro', content: 'Goodbye...', order: 8 }
        ],
        tone: 'Energetic, conversational, and warm',
        estimatedDurationMinutes: 15
      };

      const result = validator.validate(script);

      expect(result.valid).toBe(true);
    });

    it('should accept exactly 7 key points (maximum)', () => {
      const sections: ScriptSection[] = [
        { type: 'intro', content: 'Welcome...', order: 1 }
      ];

      for (let i = 0; i < 7; i++) {
        sections.push({
          type: 'key_point',
          content: `Point ${i + 1}...`,
          order: (i * 2) + 2
        });
        if (i < 6) {
          sections.push({
            type: 'transition',
            content: `Transition ${i + 1}...`,
            order: (i * 2) + 3
          });
        }
      }

      sections.push({ type: 'recap', content: 'Summary...', order: 15 });
      sections.push({ type: 'outro', content: 'Goodbye...', order: 16 });

      const script: GeneratedScript = {
        sections,
        tone: 'Energetic, conversational, and warm',
        estimatedDurationMinutes: 18
      };

      const result = validator.validate(script);

      expect(result.valid).toBe(true);
    });

    it('should accept exactly 12 minutes (minimum target)', () => {
      const script: GeneratedScript = {
        sections: [],
        tone: 'Energetic, conversational, and warm',
        estimatedDurationMinutes: 12
      };

      const result = validator.validateLength(script);

      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it('should accept exactly 20 minutes (maximum target)', () => {
      const script: GeneratedScript = {
        sections: [],
        tone: 'Energetic, conversational, and warm',
        estimatedDurationMinutes: 20
      };

      const result = validator.validateLength(script);

      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });
  });
});
