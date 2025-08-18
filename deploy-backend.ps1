# PowerShell script to deploy backend to Azure
# This properly builds and deploys the backend with all new code

Write-Host "🚀 Starting backend deployment..." -ForegroundColor Cyan

# Variables
$REGISTRY = "uwracr2425"
$IMAGE = "unitedwerise-backend"
$TAG = "stripe-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
$RESOURCE_GROUP = "unitedwerise-rg"
$APP_NAME = "unitedwerise-backend"

Write-Host "📦 Building Docker image with tag: $TAG" -ForegroundColor Yellow

# Build and push the image
Write-Host "🔨 Building and pushing to Azure Container Registry..." -ForegroundColor Green
az acr build `
    --registry $REGISTRY `
    --image "${IMAGE}:${TAG}" `
    --image "${IMAGE}:latest" `
    --file backend/Dockerfile `
    backend/

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Build successful!" -ForegroundColor Green

# Update the container app to use the new image
Write-Host "🔄 Updating container app..." -ForegroundColor Yellow
az containerapp update `
    -n $APP_NAME `
    -g $RESOURCE_GROUP `
    --image "${REGISTRY}.azurecr.io/${IMAGE}:${TAG}"

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Container update failed!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Container app updated!" -ForegroundColor Green

# Get the latest revision
$revision = az containerapp revision list `
    -n $APP_NAME `
    -g $RESOURCE_GROUP `
    --query "[0].name" `
    -o tsv

Write-Host "📊 Latest revision: $revision" -ForegroundColor Cyan

# Check health
Write-Host "🏥 Checking backend health..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

$health = Invoke-RestMethod -Uri "https://unitedwerise-backend.wonderfulpond-f8a8271f.eastus.azurecontainerapps.io/health"
if ($health.status -eq "healthy") {
    Write-Host "✅ Backend is healthy!" -ForegroundColor Green
} else {
    Write-Host "⚠️ Backend health check failed" -ForegroundColor Yellow
}

Write-Host "🎉 Deployment complete!" -ForegroundColor Green
Write-Host "Test the Stripe integration with: node test-stripe.js" -ForegroundColor Cyan