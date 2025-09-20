#!/usr/bin/env node

/**
 * Cross-Reference Validation Script
 *
 * Validates all {#section-name} cross-references in documentation files
 * to ensure they point to valid section anchors.
 *
 * Usage: node scripts/validate-cross-references.js
 */

const fs = require('fs');
const path = require('path');

class CrossReferenceValidator {
  constructor() {
    this.basePath = path.join(__dirname, '..');
    this.documentationFiles = [
      'MASTER_DOCUMENTATION.md',
      'CHANGELOG.md',
      'CLAUDE.md',
      'API_QUICK_REFERENCE.md',
      'README.md'
    ];
    this.errors = [];
    this.warnings = [];
    this.validSections = new Map();
  }

  /**
   * Main validation function
   */
  async validate() {
    console.log('🔍 Starting cross-reference validation...\n');

    // Step 1: Find all valid section anchors
    this.findValidSections();

    // Step 2: Find all cross-references and validate them
    this.validateCrossReferences();

    // Step 3: Generate report
    this.generateReport();

    return {
      success: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings,
      sectionsFound: this.validSections.size
    };
  }

  /**
   * Find all valid section anchors in documentation files
   */
  findValidSections() {
    console.log('📋 Finding valid section anchors...');

    this.documentationFiles.forEach(fileName => {
      const filePath = path.join(this.basePath, fileName);

      if (!fs.existsSync(filePath)) {
        this.warnings.push(`📄 File not found: ${fileName}`);
        return;
      }

      const content = fs.readFileSync(filePath, 'utf8');

      // Find section headers with anchors: ## Section Name {#anchor-id}
      const sectionRegex = /^##+ .+\{#([a-z0-9-]+)\}/gm;
      let match;

      while ((match = sectionRegex.exec(content)) !== null) {
        const anchorId = match[1];
        const lineNumber = content.substring(0, match.index).split('\n').length;

        if (this.validSections.has(anchorId)) {
          this.errors.push(`🔴 Duplicate section anchor: {#${anchorId}} in ${fileName}:${lineNumber} (also in ${this.validSections.get(anchorId).file})`);
        } else {
          this.validSections.set(anchorId, {
            file: fileName,
            line: lineNumber,
            anchor: anchorId
          });
        }
      }

      console.log(`  ✅ ${fileName}: Found ${Array.from(this.validSections.keys()).filter(key => this.validSections.get(key).file === fileName).length} section anchors`);
    });

    console.log(`\n📊 Total valid sections found: ${this.validSections.size}\n`);
  }

  /**
   * Validate all cross-references in documentation files
   */
  validateCrossReferences() {
    console.log('🔗 Validating cross-references...');

    this.documentationFiles.forEach(fileName => {
      const filePath = path.join(this.basePath, fileName);

      if (!fs.existsSync(filePath)) {
        return;
      }

      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');

      // Find cross-references: {#section-name}
      const crossRefRegex = /\{#([a-z0-9-]+)\}/g;
      let match;
      let referencesFound = 0;
      let brokenReferences = 0;

      while ((match = crossRefRegex.exec(content)) !== null) {
        const referencedAnchor = match[1];
        const lineNumber = content.substring(0, match.index).split('\n').length;
        const lineContent = lines[lineNumber - 1];

        referencesFound++;

        if (!this.validSections.has(referencedAnchor)) {
          this.errors.push(`🔴 Broken cross-reference: {#${referencedAnchor}} in ${fileName}:${lineNumber}`);
          this.errors.push(`    📝 Line content: ${lineContent.trim()}`);
          brokenReferences++;
        }
      }

      console.log(`  📄 ${fileName}: ${referencesFound} references, ${brokenReferences} broken`);
    });

    console.log('');
  }

  /**
   * Generate validation report
   */
  generateReport() {
    console.log('📊 VALIDATION REPORT');
    console.log('='.repeat(50));

    // Summary
    console.log(`📋 Files checked: ${this.documentationFiles.length}`);
    console.log(`📍 Valid sections: ${this.validSections.size}`);
    console.log(`❌ Errors found: ${this.errors.length}`);
    console.log(`⚠️  Warnings: ${this.warnings.length}`);

    // Success/Failure status
    if (this.errors.length === 0) {
      console.log('\n✅ ALL CROSS-REFERENCES VALID! No broken links found.');
    } else {
      console.log('\n❌ VALIDATION FAILED - Broken cross-references found:');
      this.errors.forEach(error => console.log(`  ${error}`));
    }

    // Warnings
    if (this.warnings.length > 0) {
      console.log('\n⚠️  WARNINGS:');
      this.warnings.forEach(warning => console.log(`  ${warning}`));
    }

    // Section summary
    console.log('\n📑 SECTION ANCHOR SUMMARY:');
    const fileGroups = {};
    this.validSections.forEach((section, anchor) => {
      if (!fileGroups[section.file]) {
        fileGroups[section.file] = [];
      }
      fileGroups[section.file].push(anchor);
    });

    Object.keys(fileGroups).forEach(file => {
      console.log(`  📄 ${file}: ${fileGroups[file].length} sections`);
    });

    // Save detailed report
    this.saveDetailedReport();
  }

  /**
   * Save detailed validation report to file
   */
  saveDetailedReport() {
    const reportPath = path.join(this.basePath, 'cross-reference-validation-report.md');

    let report = `# Cross-Reference Validation Report\n\n`;
    report += `**Generated**: ${new Date().toISOString()}\n`;
    report += `**Status**: ${this.errors.length === 0 ? '✅ PASSED' : '❌ FAILED'}\n\n`;

    // Summary
    report += `## Summary\n\n`;
    report += `- **Files checked**: ${this.documentationFiles.length}\n`;
    report += `- **Valid sections**: ${this.validSections.size}\n`;
    report += `- **Errors found**: ${this.errors.length}\n`;
    report += `- **Warnings**: ${this.warnings.length}\n\n`;

    // Valid sections
    report += `## Valid Section Anchors\n\n`;
    const sortedSections = Array.from(this.validSections.entries()).sort();
    sortedSections.forEach(([anchor, section]) => {
      report += `- \`{#${anchor}}\` → ${section.file}:${section.line}\n`;
    });

    // Errors
    if (this.errors.length > 0) {
      report += `\n## Errors Found\n\n`;
      this.errors.forEach(error => {
        report += `- ${error}\n`;
      });
    }

    // Warnings
    if (this.warnings.length > 0) {
      report += `\n## Warnings\n\n`;
      this.warnings.forEach(warning => {
        report += `- ${warning}\n`;
      });
    }

    fs.writeFileSync(reportPath, report);
    console.log(`\n💾 Detailed report saved to: cross-reference-validation-report.md`);
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new CrossReferenceValidator();
  validator.validate().then(result => {
    process.exit(result.success ? 0 : 1);
  }).catch(error => {
    console.error('❌ Validation failed:', error);
    process.exit(1);
  });
}

module.exports = CrossReferenceValidator;