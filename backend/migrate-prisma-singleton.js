/**
 * Migration script to replace all PrismaClient instances with singleton
 * This fixes the database connection pool exhaustion issue
 */

const fs = require('fs');
const path = require('path');

// Files that need to be updated (from grep results)
const filesToUpdate = [
  'src/routes/admin.ts',
  'src/routes/auth.ts',
  'src/routes/notifications.ts',
  'src/routes/search.ts',
  'src/routes/users.ts',
  'src/routes/batch.ts',
  'src/routes/trendingTopics.ts',
  'src/routes/feed.ts',
  'src/routes/onboarding.ts',
  'src/routes/payments.ts',
  'src/routes/legislative.ts',
  'src/routes/crowdsourcing.ts',
  'src/routes/posts.ts',
  'src/routes/reputation.ts',
  'src/routes/health.ts',
  'src/routes/feedback.ts',
  'src/routes/verification.ts',
  'src/routes/political.ts',
  'src/routes/candidates.ts',
  'src/routes/candidateMessages.ts',
  'src/routes/elections.ts',
  'src/routes/topics.ts',
  'src/routes/moderation.ts',
  'src/routes/appeals.ts',
  'src/routes/messages.ts',
  'src/routes/totp.ts',
  'src/services/stripeService.ts',
  'src/services/topicAggregationService.ts',
  'src/services/civicOrganizingService.ts',
  'src/services/oauthService.ts',
  'src/services/newsAggregationService.ts',
  'src/services/legislativeDataService.ts',
  'src/services/districtIdentificationService.ts',
  'src/services/photoService.ts',
  'src/services/photoTaggingService.ts',
  'src/services/feedbackAnalysisService.ts',
  'src/services/relationshipService.ts',
  'src/services/reputationService.ts',
  'src/services/moderationService.ts',
  'src/services/probabilityFeedService.ts',
  'src/services/securityService.ts',
  'src/services/embeddingService.ts',
  'src/services/topicDiscoveryService.ts',
  'src/services/qwenService.ts',
  'src/services/representativeService.ts',
  'src/services/candidateInboxService.ts',
  'src/services/enhancedCandidateService.ts',
  'src/services/enhancedElectionService.ts',
  'src/services/topicService.ts',
  'src/services/electionService.ts',
  'src/services/metricsService.ts',
  'src/services/googleCivic.ts',
  'src/services/onboardingService.ts',
  'src/services/apiCache.ts',
  'src/websocket.ts',
  'src/middleware/auth.ts',
  'src/middleware/totpAuth.ts',
];

let updatedCount = 0;
let errorCount = 0;

filesToUpdate.forEach(file => {
  const filePath = path.join(__dirname, file);
  
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${file}`);
      return;
    }
    
    let content = fs.readFileSync(filePath, 'utf8');
    let updated = false;
    
    // Replace PrismaClient import with singleton import
    if (content.includes("import { PrismaClient") && content.includes("from '@prisma/client'")) {
      // Handle various import patterns
      content = content.replace(
        /import\s*{\s*PrismaClient([^}]*)\s*}\s*from\s*['"]@prisma\/client['"]/g,
        (match, otherImports) => {
          // Keep other imports from @prisma/client if any
          const cleanedImports = otherImports.replace(/,?\s*PrismaClient\s*,?/, '').trim();
          if (cleanedImports && cleanedImports !== ',') {
            return `import {${cleanedImports} } from '@prisma/client'`;
          }
          return ''; // Remove entire import if only PrismaClient
        }
      );
      
      // Add singleton import at the top (after the @prisma/client import if it still exists)
      const prismaClientImportRemoved = !content.includes("from '@prisma/client'");
      if (prismaClientImportRemoved) {
        // Add import at the very top
        content = `import { prisma } from '../lib/prisma';\n` + content;
      } else {
        // Add after @prisma/client import
        content = content.replace(
          /(from ['"]@prisma\/client['"];?\n)/,
          `$1import { prisma } from '../lib/prisma';\n`
        );
      }
      updated = true;
    }
    
    // Replace new PrismaClient() with the imported singleton
    if (content.includes('new PrismaClient()')) {
      content = content.replace(
        /const\s+prisma\s*=\s*new\s+PrismaClient\(\)[^;]*;/g,
        '// Using singleton prisma from lib/prisma.ts'
      );
      updated = true;
    }
    
    // Also handle cases with configuration
    if (content.includes('new PrismaClient({')) {
      content = content.replace(
        /const\s+prisma\s*=\s*new\s+PrismaClient\({[^}]*}\)[^;]*;/g,
        '// Using singleton prisma from lib/prisma.ts'
      );
      updated = true;
    }
    
    // Fix import paths based on file location
    const depth = file.split('/').length - 1;
    const importPath = depth === 2 ? '../lib/prisma' : '../../lib/prisma';
    content = content.replace(/from ['"]\.\.\/lib\/prisma['"]/, `from '${importPath}'`);
    
    if (updated) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Updated: ${file}`);
      updatedCount++;
    } else {
      console.log(`ℹ️  No changes needed: ${file}`);
    }
  } catch (error) {
    console.error(`❌ Error updating ${file}:`, error.message);
    errorCount++;
  }
});

console.log('\n📊 Migration Summary:');
console.log(`✅ Files updated: ${updatedCount}`);
console.log(`❌ Errors: ${errorCount}`);
console.log(`ℹ️  Files checked: ${filesToUpdate.length}`);
console.log('\n🎯 Next steps:');
console.log('1. Run "npm run build" to check for TypeScript errors');
console.log('2. Test locally to ensure everything works');
console.log('3. Deploy to production to fix connection pool issue');