# Week 4 Batch C - Complete remaining routes console → logger migration
# Migrates 89 console calls across 9 route files

$files = @(
    "src/routes/onboarding.ts",
    "src/routes/motd.ts",
    "src/routes/legislative.ts",
    "src/routes/moderation.ts",
    "src/routes/elections.ts",
    "src/routes/crowdsourcing.ts",
    "src/routes/notifications.ts"
)

$totalMigrated = 0

foreach ($file in $files) {
    Write-Host ""
    Write-Host "Processing $file..." -ForegroundColor Cyan

    $content = Get-Content $file -Raw
    $originalContent = $content

    # Count console calls before migration
    $beforeCount = ([regex]::Matches($content, "console\.(log|error|warn|info|debug)")).Count

    # Add logger import if not present (after other imports, before router declaration)
    if ($content -notmatch "import.*\{.*logger.*\}.*from.*'\.\.\/services\/logger'") {
        $content = $content -replace "(import.*from.*';`n)(`nconst router)", "`$1import { logger } from '../services/logger';`n`$2"
    }

    # Replace patterns based on file
    switch -Regex ($file) {
        "onboarding" {
            # Pattern console.error('Get onboarding steps error:', error);
            $content = $content -replace "console\.error\('Get onboarding steps error:', error\);", "logger.error({ error, userId: req.user?.id }, 'Get onboarding steps error');"
            $content = $content -replace "console\.error\('Get onboarding progress error:', error\);", "logger.error({ error, userId: req.user?.id }, 'Get onboarding progress error');"
            $content = $content -replace "console\.log\(`Representatives fetched and cached for \$\{stepData\.zipCode\}, \$\{state\}`\);", "logger.info({ zipCode: stepData.zipCode, state }, 'Representatives fetched and cached');"
            $content = $content -replace "console\.error\('Failed to fetch representatives:', error\);", "logger.error({ error }, 'Failed to fetch representatives');"
            $content = $content -replace "console\.error\('Complete onboarding step error:', error\);", "logger.error({ error, userId: req.user?.id }, 'Complete onboarding step error');"
            $content = $content -replace "console\.error\('Skip onboarding step error:', error\);", "logger.error({ error, userId: req.user?.id }, 'Skip onboarding step error');"
            $content = $content -replace "console\.error\('Get interests error:', error\);", "logger.error({ error }, 'Get interests error');"
            $content = $content -replace "console\.error\('Location validation error:', error\);", "logger.error({ error }, 'Location validation error');"
            $content = $content -replace "console\.error\('Welcome step error:', error\);", "logger.error({ error, userId: req.user?.id }, 'Welcome step error');"
            $content = $content -replace "console\.error\('Get onboarding analytics error:', error\);", "logger.error({ error, userId: req.user?.id }, 'Get onboarding analytics error');"
            $content = $content -replace "console\.error\('Search preview error:', error\);", "logger.error({ error }, 'Search preview error');"
        }
        "motd" {
            $content = $content -replace "console\.log\('Duplicate view attempt ignored for token:', dismissalToken\);", "logger.debug({ dismissalToken }, 'Duplicate view attempt ignored');"
            $content = $content -replace "console\.error\('View recording error:', viewError\);", "logger.error({ error: viewError }, 'View recording error');"
            $content = $content -replace "console\.error\('Get current MOTD error:', error\);", "logger.error({ error }, 'Get current MOTD error');"
            $content = $content -replace "console\.error\('Dismiss MOTD error:', error\);", "logger.error({ error, motdId: req.params.id }, 'Dismiss MOTD error');"
            $content = $content -replace "console\.error\('Get MOTDs admin error:', error\);", "logger.error({ error }, 'Get MOTDs admin error');"
            $content = $content -replace "console\.error\('Create MOTD error:', error\);", "logger.error({ error, userId: req.user?.id }, 'Create MOTD error');"
            $content = $content -replace "console\.error\('Update MOTD error:', error\);", "logger.error({ error, motdId: req.params.id }, 'Update MOTD error');"
            $content = $content -replace "console\.error\('Toggle MOTD error:', error\);", "logger.error({ error, motdId: req.params.id }, 'Toggle MOTD error');"
            $content = $content -replace "console\.error\('Delete MOTD error:', error\);", "logger.error({ error, motdId: req.params.id }, 'Delete MOTD error');"
            $content = $content -replace "console\.error\('Get MOTD analytics error:', error\);", "logger.error({ error, motdId: req.params.id }, 'Get MOTD analytics error');"
        }
        "legislative" {
            $content = $content -replace "console\.error\('Error fetching voting records:', error\);", "logger.error({ error, bioguideId: req.params.bioguideId }, 'Error fetching voting records');"
            $content = $content -replace "console\.error\('Error fetching news coverage:', error\);", "logger.error({ error, officialName: req.params.officialName }, 'Error fetching news coverage');"
            $content = $content -replace "console\.error\('Error syncing federal legislators:', error\);", "logger.error({ error }, 'Error syncing federal legislators');"
            $content = $content -replace "console\.error\('Error syncing state legislators:', error\);", "logger.error({ error, stateCode: req.params.stateCode }, 'Error syncing state legislators');"
            $content = $content -replace "console\.error\('Error fetching trending news:', error\);", "logger.error({ error }, 'Error fetching trending news');"
            $content = $content -replace "console\.error\('Error fetching stored articles:', error\);", "logger.error({ error }, 'Error fetching stored articles');"
            $content = $content -replace "console\.error\('Error fetching voting statistics:', error\);", "logger.error({ error }, 'Error fetching voting statistics');"
            $content = $content -replace "console\.error\('Error fetching bills:', error\);", "logger.error({ error, bioguideId: req.params.bioguideId }, 'Error fetching bills');"
            $content = $content -replace "console\.error\('Legislative health check failed:', error\);", "logger.error({ error }, 'Legislative health check failed');"
            $content = $content -replace "console\.error\('News API status check failed:', error\);", "logger.error({ error }, 'News API status check failed');"
        }
        "moderation" {
            $content = $content -replace "console\.error\('Submit report error:', error\);", "logger.error({ error, userId: req.user?.id }, 'Submit report error');"
            $content = $content -replace "console\.error\('Get user reports error:', error\);", "logger.error({ error, userId: req.user?.id }, 'Get user reports error');"
            $content = $content -replace "console\.error\('Get reports queue error:', error\);", "logger.error({ error }, 'Get reports queue error');"
            $content = $content -replace "console\.error\(`Failed to fetch \$\{report\.targetType\} \$\{report\.targetId\}:`, error\);", "logger.error({ error, targetType: report.targetType, targetId: report.targetId }, 'Failed to fetch moderation target');"
            $content = $content -replace "console\.error\('Report action error:', error\);", "logger.error({ error, reportId: req.params.reportId }, 'Report action error');"
            $content = $content -replace "console\.error\('Failed to send report update email:', error\);", "logger.error({ error, reportId }, 'Failed to send report update email');"
            $content = $content -replace "console\.error\('Get moderation stats error:', error\);", "logger.error({ error }, 'Get moderation stats error');"
            $content = $content -replace "console\.error\('Promote user error:', error\);", "logger.error({ error, targetUserId: req.params.userId }, 'Promote user error');"
            $content = $content -replace "console\.error\('Moderation health check error:', error\);", "logger.error({ error }, 'Moderation health check error');"
        }
        "elections" {
            $content = $content -replace "console\.log\(`🗳️  Election request: \$\{state\.toUpperCase\(\)\}\$\{zipCode \? ` \(\$\{zipCode\}\)` : ''\}`\);", "logger.info({ state, zipCode }, 'Election request');"
            $content = $content -replace "console\.log\(`✅ Returning \$\{filteredElections\.length\} elections \(\$\{electionData\.source\}\)`\);", "logger.info({ count: filteredElections.length, source: electionData.source }, 'Returning elections');"
            $content = $content -replace "console\.error\('Election search error:', error\);", "logger.error({ error }, 'Election search error');"
            $content = $content -replace "console\.error\('Election retrieval error:', error\);", "logger.error({ error, electionId: req.params.id }, 'Election retrieval error');"
            $content = $content -replace "console\.error\('Candidate retrieval error:', error\);", "logger.error({ error, electionId: req.params.id }, 'Candidate retrieval error');"
            $content = $content -replace "console\.error\('Candidate registration error:', error\);", "logger.error({ error, userId: req.user?.id }, 'Candidate registration error');"
            $content = $content -replace "console\.error\('Candidate comparison error:', error\);", "logger.error({ error }, 'Candidate comparison error');"
            $content = $content -replace "console\.log\(`🗑️  Admin \$\{user\.username\} refreshing election cache\$\{state \? ` for \$\{state\}` : ''\}`\);", "logger.info({ admin: user.username, state }, 'Admin refreshing election cache');"
            $content = $content -replace "console\.error\('Cache refresh error:', error\);", "logger.error({ error }, 'Cache refresh error');"
        }
        "crowdsourcing" {
            $content = $content -replace "console\.error\('District lookup error:', error\);", "logger.error({ error }, 'District lookup error');"
            $content = $content -replace "console\.error\('Missing offices lookup error:', error\);", "logger.error({ error }, 'Missing offices lookup error');"
            $content = $content -replace "console\.error\('District submission error:', error\);", "logger.error({ error, userId: req.user?.id }, 'District submission error');"
            $content = $content -replace "console\.error\('Office submission error:', error\);", "logger.error({ error, userId: req.user?.id, districtId: req.params.districtId }, 'Office submission error');"
            $content = $content -replace "console\.error\('Official submission error:', error\);", "logger.error({ error, userId: req.user?.id, officeId: req.params.officeId }, 'Official submission error');"
            $content = $content -replace "console\.error\('Voting error:', error\);", "logger.error({ error, userId: req.user?.id, officialId: req.params.officialId }, 'Voting error');"
            $content = $content -replace "console\.error\('Conflict reporting error:', error\);", "logger.error({ error, userId: req.user?.id, districtId: req.params.districtId }, 'Conflict reporting error');"
            $content = $content -replace "console\.error\('Contributions lookup error:', error\);", "logger.error({ error, userId: req.user?.id }, 'Contributions lookup error');"
            $content = $content -replace "console\.error\('Leaderboard error:', error\);", "logger.error({ error }, 'Leaderboard error');"
        }
        "notifications" {
            # This file already has logger - just check for console.warn
            $content = $content -replace "console\.warn\('WebSocket service not available:', error\);", "logger.warn({ error }, 'WebSocket service not available');"
        }
    }

    # Count console calls after migration
    $afterCount = ([regex]::Matches($content, "console\.(log|error|warn|info|debug)")).Count

    $migrated = $beforeCount - $afterCount
    $totalMigrated += $migrated

    if ($content -ne $originalContent) {
        Set-Content -Path $file -Value $content -NoNewline
        Write-Host "SUCCESS: Migrated $migrated console calls (before: $beforeCount, after: $afterCount)" -ForegroundColor Green
    } else {
        Write-Host "SKIPPED: No changes needed" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "========================================"
Write-Host "Total console calls migrated: $totalMigrated" -ForegroundColor Green
Write-Host "========================================"
Write-Host ""
