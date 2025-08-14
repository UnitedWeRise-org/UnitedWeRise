/**
 * Build Timestamp Updater
 * 
 * Updates the frontend with current build timestamps
 */

const fs = require('fs');
const path = require('path');

function updateBuildTimestamps() {
  try {
    const indexPath = path.join(__dirname, 'index.html');
    const deploymentStatusPath = path.join(__dirname, 'src/js/deployment-status.js');
    
    const now = new Date().toISOString();
    
    // Read index.html
    let indexContent = fs.readFileSync(indexPath, 'utf8');
    
    // Replace template values
    indexContent = indexContent.replace(/\{\{BUILD_TIME\}\}/g, now);
    indexContent = indexContent.replace(/\{\{LAST_UPDATED\}\}/g, now);
    
    // Write back to index.html
    fs.writeFileSync(indexPath, indexContent);
    
    // Read deployment-status.js
    let deploymentContent = fs.readFileSync(deploymentStatusPath, 'utf8');
    
    // Replace template values
    deploymentContent = deploymentContent.replace(/\{\{FRONTEND_BUILD_TIME\}\}/g, now);
    deploymentContent = deploymentContent.replace(/\{\{SCHEMA_VERSION\}\}/g, 'v1.0.0-' + Date.now());
    
    // Write back to deployment-status.js
    fs.writeFileSync(deploymentStatusPath, deploymentContent);
    
    console.log(`✅ Build timestamps updated: ${now}`);
    
    // Create a build info file
    const buildInfo = {
      buildTime: now,
      version: '1.0.0',
      components: {
        frontend: now,
        schemaVersion: 'v1.0.0-' + Date.now()
      }
    };
    
    fs.writeFileSync(path.join(__dirname, 'build-info.json'), JSON.stringify(buildInfo, null, 2));
    
  } catch (error) {
    console.error('❌ Failed to update build timestamps:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  updateBuildTimestamps();
}

module.exports = { updateBuildTimestamps };