/**
 * Backend Deployment Timestamp Updater
 * 
 * Creates deployment timestamp file for backend deployment tracking
 */

const fs = require('fs');
const path = require('path');

function updateDeploymentTimestamp() {
  try {
    const timestamp = new Date().toISOString();
    const deploymentFile = path.join(__dirname, '../.deployment-time');
    
    // Write deployment timestamp
    fs.writeFileSync(deploymentFile, timestamp);
    
    // Update package.json with deployment info if it doesn't exist
    const packagePath = path.join(__dirname, '../package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    
    if (!packageJson.deploymentInfo) {
      packageJson.deploymentInfo = {};
    }
    
    packageJson.deploymentInfo.lastDeployment = timestamp;
    packageJson.deploymentInfo.deploymentCount = (packageJson.deploymentInfo.deploymentCount || 0) + 1;
    
    fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
    
    console.log(`✅ Backend deployment timestamp updated: ${timestamp}`);
    console.log(`📊 Deployment count: ${packageJson.deploymentInfo.deploymentCount}`);
    
  } catch (error) {
    console.error('❌ Failed to update deployment timestamp:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  updateDeploymentTimestamp();
}

module.exports = { updateDeploymentTimestamp };