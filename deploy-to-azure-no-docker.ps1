# Deploy United We Rise to Azure using ACR Build (No Docker Required)
# SECURITY: Database URL must be set from environment variable

Write-Host "Deploying United We Rise to Azure (using ACR Build)..." -ForegroundColor Green

# Validate required environment variable
if (-not $env:PROD_DATABASE_URL) {
    Write-Host "ERROR: PROD_DATABASE_URL environment variable not set." -ForegroundColor Red
    Write-Host "Please set it before running this script:" -ForegroundColor Yellow
    Write-Host '  $env:PROD_DATABASE_URL = "postgresql://user:pass@host:5432/db?sslmode=require"' -ForegroundColor Gray
    exit 1
}

# Load configuration
if (Test-Path "azure-config-complete.env") {
    Write-Host "Loading Azure configuration..." -ForegroundColor Cyan
    Get-Content "azure-config-complete.env" | ForEach-Object {
        if ($_ -match '^([^#][^=]*)=(.*)$') {
            [Environment]::SetEnvironmentVariable($matches[1], $matches[2], "Process")
        }
    }
} else {
    Write-Host "Error: azure-config-complete.env not found!" -ForegroundColor Red
    exit 1
}

$ACR_NAME = "uwracr2425"
$IMAGE_NAME = "unitedwerise-backend"
$IMAGE_TAG = "$(Get-Date -Format 'yyyyMMdd-HHmm')"
$FULL_IMAGE_NAME = "$IMAGE_NAME`:$IMAGE_TAG"

# Build image using Azure Container Registry Build
Write-Host "`nBuilding image in Azure Container Registry..." -ForegroundColor Cyan
Write-Host "This builds in the cloud, no local Docker needed!" -ForegroundColor Yellow

az acr build --registry $ACR_NAME --image $FULL_IMAGE_NAME ./backend

if ($LASTEXITCODE -ne 0) {
    Write-Host "ACR build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "Image built successfully in Azure!" -ForegroundColor Green

# Deploy to Container Apps
Write-Host "`nDeploying to Azure Container Apps..." -ForegroundColor Cyan

$FULL_IMAGE_PATH = "$ACR_NAME.azurecr.io/$FULL_IMAGE_NAME"

# Enable system-assigned managed identity for Key Vault access
Write-Host "Configuring managed identity for Key Vault access..." -ForegroundColor Cyan
az containerapp identity assign --name unitedwerise-backend --resource-group unitedwerise-rg --system-assigned 2>$null

# Check if container app exists
$APP_EXISTS = az containerapp show --name unitedwerise-backend --resource-group unitedwerise-rg 2>$null

if ($APP_EXISTS) {
    Write-Host "Updating existing container app..." -ForegroundColor Yellow
    
    az containerapp update `
        --name unitedwerise-backend `
        --resource-group unitedwerise-rg `
        --image $FULL_IMAGE_PATH

} else {
    Write-Host "Creating new container app..." -ForegroundColor Yellow
    
    # Create container app with simple environment variables first
    az containerapp create `
        --name unitedwerise-backend `
        --resource-group unitedwerise-rg `
        --environment unitedwerise-env `
        --image $FULL_IMAGE_PATH `
        --target-port 3001 `
        --ingress external `
        --min-replicas 1 `
        --max-replicas 3 `
        --cpu 0.5 `
        --memory 1Gi `
        --env-vars `
            "NODE_ENV=production" `
            "PORT=3001" `
            "DATABASE_URL=$env:PROD_DATABASE_URL" `
            "AZURE_STORAGE_CONNECTION_STRING=$(az storage account show-connection-string --resource-group unitedwerise-rg --name uwrstorage2425 --query connectionString -o tsv)" `
            "JWT_SECRET=temp-jwt-secret-$(Get-Random)"
}

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n==========================================" -ForegroundColor Green
    Write-Host "DEPLOYMENT SUCCESSFUL!" -ForegroundColor Green
    Write-Host "==========================================" -ForegroundColor Green
    
    # Get the application URL
    $APP_URL = az containerapp show --name unitedwerise-backend --resource-group unitedwerise-rg --query properties.configuration.ingress.fqdn -o tsv
    
    Write-Host "`nYour application is deployed!" -ForegroundColor Cyan
    Write-Host "Backend URL: https://$APP_URL" -ForegroundColor White
    Write-Host "Health Check: https://$APP_URL/health" -ForegroundColor White
    Write-Host "API Documentation: https://$APP_URL/api-docs" -ForegroundColor White
    
    Write-Host "`nTesting the deployment..." -ForegroundColor Cyan
    Start-Sleep -Seconds 30  # Give the app time to start
    
    try {
        $healthCheck = Invoke-RestMethod -Uri "https://$APP_URL/health" -TimeoutSec 10
        Write-Host "Health check passed: $($healthCheck | ConvertTo-Json -Compress)" -ForegroundColor Green
    } catch {
        Write-Host "Health check not ready yet - this is normal for first deployment" -ForegroundColor Yellow
    }
    
    Write-Host "`nNext Steps:" -ForegroundColor Cyan
    Write-Host "1. Run database migrations" -ForegroundColor White
    Write-Host "2. Test your API endpoints" -ForegroundColor White
    Write-Host "3. Deploy your frontend" -ForegroundColor White
    
} else {
    Write-Host "`nDeployment failed!" -ForegroundColor Red
    Write-Host "Check the logs above for details." -ForegroundColor Yellow
}

Write-Host "`nUseful commands:" -ForegroundColor Cyan
Write-Host "View logs: az containerapp logs show --name unitedwerise-backend --resource-group unitedwerise-rg --follow" -ForegroundColor Gray
Write-Host "Check status: az containerapp show --name unitedwerise-backend --resource-group unitedwerise-rg --query properties.provisioningState" -ForegroundColor Gray