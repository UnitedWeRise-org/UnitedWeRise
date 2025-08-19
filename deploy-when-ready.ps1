# PowerShell script to deploy once GitHub Actions verifies the build
# Run this AFTER GitHub Actions shows the build is working

Write-Host "🚀 UnitedWeRise Backend Deployment Script" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan

# Check if GitHub Actions passed
Write-Host "📋 Step 1: Verify GitHub Actions build passed" -ForegroundColor Yellow
Write-Host "   Check: https://github.com/UnitedWeRise-org/UnitedWeRise/actions" -ForegroundColor Gray
Write-Host "   Look for: 'Build Backend Test' workflow with green checkmark" -ForegroundColor Gray
Write-Host ""

$confirmation = Read-Host "Did GitHub Actions 'Build Backend Test' workflow PASS? (y/n)"
if ($confirmation -ne 'y') {
    Write-Host "❌ Please wait for GitHub Actions to pass before deploying" -ForegroundColor Red
    exit 1
}

Write-Host "✅ GitHub Actions verified - proceeding with deployment" -ForegroundColor Green
Write-Host ""

# Generate unique tag
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$TAG = "stripe-verified-$timestamp"

Write-Host "📦 Step 2: Building and pushing to Azure Container Registry" -ForegroundColor Yellow
Write-Host "   Tag: $TAG" -ForegroundColor Gray

try {
    # Build in Azure (this avoids local Unicode issues)
    Write-Host "🔨 Building in Azure Container Registry..." -ForegroundColor Green
    
    # Change to backend directory and build
    cd backend
    
    # Use a file to capture output and avoid Unicode display issues
    $logFile = "../build-log.txt"
    
    az acr build --registry uwracr2425 --image "unitedwerise-backend:$TAG" --image "unitedwerise-backend:latest" --file Dockerfile . > $logFile 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Build completed successfully!" -ForegroundColor Green
    } else {
        Write-Host "❌ Build failed - check build-log.txt for details" -ForegroundColor Red
        exit 1
    }
    
    cd ..
} catch {
    Write-Host "❌ Build failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🔄 Step 3: Updating Container App" -ForegroundColor Yellow

try {
    az containerapp update `
        --name unitedwerise-backend `
        --resource-group unitedwerise-rg `
        --image "uwracr2425.azurecr.io/unitedwerise-backend:$TAG"
        
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Container app updated!" -ForegroundColor Green
    } else {
        Write-Host "❌ Container update failed" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Container update failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "⏳ Step 4: Waiting for deployment to stabilize..." -ForegroundColor Yellow
Start-Sleep -Seconds 45

Write-Host "🏥 Step 5: Testing deployment" -ForegroundColor Yellow

# Test health endpoint
try {
    $health = Invoke-RestMethod -Uri "https://unitedwerise-backend.wonderfulpond-f8a8271f.eastus.azurecontainerapps.io/health" -TimeoutSec 10
    Write-Host "✅ Health check passed" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Health check failed, but continuing..." -ForegroundColor Yellow
}

# Test Stripe endpoint
try {
    $stripeResponse = Invoke-WebRequest -Uri "https://unitedwerise-backend.wonderfulpond-f8a8271f.eastus.azurecontainerapps.io/api/payments/campaigns" -TimeoutSec 10
    if ($stripeResponse.StatusCode -eq 200) {
        Write-Host "🎉 STRIPE INTEGRATION IS LIVE!" -ForegroundColor Green
        Write-Host "✅ Deployment successful!" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Stripe endpoint returned: $($stripeResponse.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 401 -or $statusCode -eq 403) {
        Write-Host "🎉 STRIPE ENDPOINT IS AVAILABLE! (Auth required)" -ForegroundColor Green
        Write-Host "✅ Deployment successful!" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Stripe endpoint test failed: Status $statusCode" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "🧪 Step 6: Run full integration test" -ForegroundColor Yellow
Write-Host "   Run: node test-stripe.js" -ForegroundColor Gray
Write-Host ""
Write-Host "🎉 Deployment complete!" -ForegroundColor Green
Write-Host "   Image tag: $TAG" -ForegroundColor Gray
Write-Host "   Backend: https://unitedwerise-backend.wonderfulpond-f8a8271f.eastus.azurecontainerapps.io" -ForegroundColor Gray