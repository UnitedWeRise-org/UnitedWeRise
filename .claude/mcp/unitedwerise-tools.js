#!/usr/bin/env node

/**
 * United We Rise MCP Tools
 * Provides specialized tools for United We Rise platform operations
 */

const { spawn } = require('child_process');
const https = require('https');
const fs = require('fs').promises;
const path = require('path');

class UnitedWeRiseTools {
  constructor() {
    this.stagingUrl = process.env.STAGING_URL || 'https://dev.unitedwerise.org';
    this.stagingApi = process.env.STAGING_API || 'https://dev-api.unitedwerise.org';
    this.prodUrl = process.env.PROD_URL || 'https://www.unitedwerise.org';
    this.prodApi = process.env.PROD_API || 'https://api.unitedwerise.org';
    this.azureRegistry = process.env.AZURE_CONTAINER_REGISTRY || 'uwracr2425';
    this.resourceGroup = process.env.AZURE_RESOURCE_GROUP || 'unitedwerise-rg';
    this.stagingContainer = process.env.CONTAINER_APP_STAGING || 'unitedwerise-backend-staging';
    this.prodContainer = process.env.CONTAINER_APP_PROD || 'unitedwerise-backend';
  }

  /**
   * Check health status of both staging and production environments
   */
  async checkEnvironmentHealth() {
    const results = {
      staging: await this.checkEndpointHealth(`${this.stagingApi}/health`),
      production: await this.checkEndpointHealth(`${this.prodApi}/health`)
    };

    return {
      timestamp: new Date().toISOString(),
      environments: results,
      summary: this.generateHealthSummary(results)
    };
  }

  /**
   * Verify deployment status and release SHA
   */
  async verifyDeploymentStatus(environment = 'staging') {
    const apiUrl = environment === 'staging' ? this.stagingApi : this.prodApi;

    try {
      const healthData = await this.makeHttpRequest(`${apiUrl}/health`);
      const versionData = await this.makeHttpRequest(`${apiUrl}/version`);

      // Get local git SHA for comparison
      const localSha = await this.getGitSha();

      return {
        environment,
        deployed_sha: healthData.releaseSha || versionData.releaseSha,
        local_sha: localSha,
        uptime_seconds: healthData.uptime,
        deployment_fresh: healthData.uptime < 120, // Fresh if uptime < 2 minutes
        sha_match: localSha === (healthData.releaseSha || versionData.releaseSha),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        environment,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Execute pre-deployment checklist
   */
  async runPreDeploymentChecklist() {
    const checks = {
      git_status: await this.checkGitStatus(),
      typescript_compilation: await this.checkTypeScriptCompilation(),
      git_changes_pushed: await this.checkGitChangesPushed(),
      staging_health: await this.checkEndpointHealth(`${this.stagingApi}/health`)
    };

    const allPassed = Object.values(checks).every(check => check.passed);

    return {
      timestamp: new Date().toISOString(),
      all_checks_passed: allPassed,
      checks,
      ready_for_deployment: allPassed
    };
  }

  /**
   * Monitor API endpoint performance
   */
  async monitorApiPerformance(endpoints = null) {
    if (!endpoints) {
      endpoints = [
        `${this.stagingApi}/health`,
        `${this.stagingApi}/api/feed`,
        `${this.prodApi}/health`,
        `${this.prodApi}/api/feed`
      ];
    }

    const results = [];

    for (const endpoint of endpoints) {
      const start = Date.now();
      try {
        await this.makeHttpRequest(endpoint);
        const duration = Date.now() - start;
        results.push({
          endpoint,
          response_time_ms: duration,
          status: 'success',
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        results.push({
          endpoint,
          error: error.message,
          status: 'error',
          timestamp: new Date().toISOString()
        });
      }
    }

    return {
      timestamp: new Date().toISOString(),
      results,
      summary: this.generatePerformanceSummary(results)
    };
  }

  /**
   * Check for admin-only debugging compliance
   */
  async checkAdminDebuggingCompliance() {
    const violations = [];
    const searchPaths = ['backend/src', 'frontend/src'];

    for (const searchPath of searchPaths) {
      try {
        const consoleLogMatches = await this.searchForPattern(searchPath, 'console\\.log');
        const alertMatches = await this.searchForPattern(searchPath, 'alert\\(');

        violations.push(...consoleLogMatches.map(match => ({
          type: 'console.log_violation',
          file: match.file,
          line: match.line,
          content: match.content
        })));

        violations.push(...alertMatches.map(match => ({
          type: 'alert_violation',
          file: match.file,
          line: match.line,
          content: match.content
        })));
      } catch (error) {
        // Path might not exist, continue
      }
    }

    return {
      timestamp: new Date().toISOString(),
      compliant: violations.length === 0,
      violations,
      summary: `Found ${violations.length} admin debugging compliance violations`
    };
  }

  // Helper methods
  async checkEndpointHealth(url) {
    try {
      const data = await this.makeHttpRequest(url);
      return {
        url,
        status: 'healthy',
        uptime: data.uptime,
        release_sha: data.releaseSha,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        url,
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async makeHttpRequest(url) {
    return new Promise((resolve, reject) => {
      const request = https.get(url, (response) => {
        let data = '';
        response.on('data', chunk => data += chunk);
        response.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (error) {
            resolve({ raw: data });
          }
        });
      });

      request.on('error', reject);
      request.setTimeout(5000, () => {
        request.destroy();
        reject(new Error('Request timeout'));
      });
    });
  }

  async executeCommand(command, args = []) {
    return new Promise((resolve, reject) => {
      const process = spawn(command, args, { stdio: 'pipe' });
      let stdout = '';
      let stderr = '';

      process.stdout.on('data', data => stdout += data.toString());
      process.stderr.on('data', data => stderr += data.toString());

      process.on('close', code => {
        if (code === 0) {
          resolve({ stdout: stdout.trim(), stderr: stderr.trim() });
        } else {
          reject(new Error(`Command failed with code ${code}: ${stderr}`));
        }
      });
    });
  }

  async getGitSha() {
    try {
      const result = await this.executeCommand('git', ['rev-parse', '--short', 'HEAD']);
      return result.stdout;
    } catch (error) {
      return null;
    }
  }

  async checkGitStatus() {
    try {
      const result = await this.executeCommand('git', ['status', '--porcelain']);
      return {
        passed: result.stdout.length === 0,
        message: result.stdout.length === 0 ? 'Working tree clean' : 'Uncommitted changes detected',
        details: result.stdout
      };
    } catch (error) {
      return { passed: false, message: 'Git status check failed', error: error.message };
    }
  }

  async checkTypeScriptCompilation() {
    try {
      const result = await this.executeCommand('npm', ['run', 'build'], { cwd: 'backend' });
      return {
        passed: true,
        message: 'TypeScript compilation successful'
      };
    } catch (error) {
      return {
        passed: false,
        message: 'TypeScript compilation failed',
        error: error.message
      };
    }
  }

  async checkGitChangesPushed() {
    try {
      const result = await this.executeCommand('git', ['log', 'origin/development..HEAD']);
      return {
        passed: result.stdout.length === 0,
        message: result.stdout.length === 0 ? 'All changes pushed' : 'Unpushed commits detected',
        details: result.stdout
      };
    } catch (error) {
      return { passed: false, message: 'Git push status check failed', error: error.message };
    }
  }

  async searchForPattern(searchPath, pattern) {
    try {
      const result = await this.executeCommand('grep', ['-rn', '-E', pattern, searchPath]);
      return result.stdout.split('\n').filter(line => line.trim()).map(line => {
        const [file, lineNum, ...content] = line.split(':');
        return {
          file: file.trim(),
          line: parseInt(lineNum),
          content: content.join(':').trim()
        };
      });
    } catch (error) {
      return []; // No matches found
    }
  }

  generateHealthSummary(results) {
    const healthy = Object.values(results).filter(r => r.status === 'healthy').length;
    const total = Object.values(results).length;
    return `${healthy}/${total} environments healthy`;
  }

  generatePerformanceSummary(results) {
    const successful = results.filter(r => r.status === 'success');
    const avgResponseTime = successful.reduce((sum, r) => sum + r.response_time_ms, 0) / successful.length;
    return `${successful.length}/${results.length} endpoints successful, avg response: ${Math.round(avgResponseTime)}ms`;
  }
}

// MCP Server Implementation
const tools = new UnitedWeRiseTools();

const mcpTools = {
  'check-environment-health': {
    description: 'Check health status of staging and production environments',
    inputSchema: { type: 'object', properties: {} },
    handler: () => tools.checkEnvironmentHealth()
  },

  'verify-deployment': {
    description: 'Verify deployment status and SHA matching',
    inputSchema: {
      type: 'object',
      properties: {
        environment: { type: 'string', enum: ['staging', 'production'], default: 'staging' }
      }
    },
    handler: (args) => tools.verifyDeploymentStatus(args.environment)
  },

  'pre-deployment-checklist': {
    description: 'Run comprehensive pre-deployment checklist',
    inputSchema: { type: 'object', properties: {} },
    handler: () => tools.runPreDeploymentChecklist()
  },

  'monitor-api-performance': {
    description: 'Monitor API endpoint performance',
    inputSchema: {
      type: 'object',
      properties: {
        endpoints: { type: 'array', items: { type: 'string' } }
      }
    },
    handler: (args) => tools.monitorApiPerformance(args.endpoints)
  },

  'check-admin-debugging-compliance': {
    description: 'Check for admin-only debugging compliance violations',
    inputSchema: { type: 'object', properties: {} },
    handler: () => tools.checkAdminDebuggingCompliance()
  }
};

// Export for Claude Code MCP integration
if (require.main === module) {
  // CLI interface for testing
  const [,, command, ...args] = process.argv;

  if (mcpTools[command]) {
    mcpTools[command].handler(args)
      .then(result => console.log(JSON.stringify(result, null, 2)))
      .catch(error => {
        console.error('Error:', error.message);
        process.exit(1);
      });
  } else {
    console.log('Available commands:', Object.keys(mcpTools).join(', '));
  }
}

module.exports = { UnitedWeRiseTools, mcpTools };