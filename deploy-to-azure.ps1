# Deploy United We Rise to Azure Container Apps
param(
    [switch]$SkipBuild = $false
)

Write-Host "Deploying United We Rise to Azure..." -ForegroundColor Green

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
$FULL_IMAGE_NAME = "$ACR_NAME.azurecr.io/$IMAGE_NAME`:$IMAGE_TAG"

if (-not $SkipBuild) {
    # Build Docker image
    Write-Host "`nBuilding Docker image..." -ForegroundColor Cyan
    Write-Host "Image: $FULL_IMAGE_NAME" -ForegroundColor Yellow
    
    Set-Location backend
    docker build -t $FULL_IMAGE_NAME .
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Docker build failed!" -ForegroundColor Red
        exit 1
    }
    
    Set-Location ..
    Write-Host "Docker image built successfully!" -ForegroundColor Green
    
    # Login to Azure Container Registry
    Write-Host "`nLogging into Azure Container Registry..." -ForegroundColor Cyan
    az acr login --name $ACR_NAME
    
    # Push image to ACR
    Write-Host "`nPushing image to Azure Container Registry..." -ForegroundColor Cyan
    docker push $FULL_IMAGE_NAME
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Docker push failed!" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "Image pushed successfully!" -ForegroundColor Green
}

# Deploy to Container Apps
Write-Host "`nDeploying to Azure Container Apps..." -ForegroundColor Cyan

# Check if container app exists
$APP_EXISTS = az containerapp show --name unitedwerise-backend --resource-group unitedwerise-rg 2>$null

if ($APP_EXISTS) {
    Write-Host "Updating existing container app..." -ForegroundColor Yellow
    
    az containerapp update `
        --name unitedwerise-backend `
        --resource-group unitedwerise-rg `
        --image $FULL_IMAGE_NAME `
        --set-env-vars `
            "DATABASE_URL=secretref:database-url" `
            "AZURE_STORAGE_CONNECTION_STRING=secretref:storage-connection" `
            "JWT_SECRET=secretref:jwt-secret" `
            "NODE_ENV=production" `
            "PORT=3001"

} else {
    Write-Host "Creating new container app..." -ForegroundColor Yellow
    
    az containerapp create `
        --name unitedwerise-backend `
        --resource-group unitedwerise-rg `
        --environment unitedwerise-env `
        --image $FULL_IMAGE_NAME `
        --target-port 3001 `
        --ingress external `
        --min-replicas 1 `
        --max-replicas 3 `
        --cpu 0.5 `
        --memory 1Gi `
        --secrets `
            "database-url=keyvaultref:https://uwrkv2425.vault.azure.net/secrets/database-url,identityref:system" `
            "storage-connection=keyvaultref:https://uwrkv2425.vault.azure.net/secrets/storage-connection,identityref:system" `
            "jwt-secret=keyvaultref:https://uwrkv2425.vault.azure.net/secrets/jwt-secret,identityref:system" `
        --env-vars `
            "DATABASE_URL=secretref:database-url" `
            "AZURE_STORAGE_CONNECTION_STRING=secretref:storage-connection" `
            "JWT_SECRET=secretref:jwt-secret" `
            "NODE_ENV=production" `
            "PORT=3001"
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
    
    Write-Host "`nNext Steps:" -ForegroundColor Cyan
    Write-Host "1. Test your backend API endpoints" -ForegroundColor White
    Write-Host "2. Run database migrations" -ForegroundColor White
    Write-Host "3. Deploy your frontend" -ForegroundColor White
    
} else {
    Write-Host "`nDeployment failed!" -ForegroundColor Red
    Write-Host "Check the logs above for details." -ForegroundColor Yellow
}

Write-Host "`nUseful commands:" -ForegroundColor Cyan
Write-Host "View logs: az containerapp logs show --name unitedwerise-backend --resource-group unitedwerise-rg --follow" -ForegroundColor Gray
Write-Host "Check status: az containerapp show --name unitedwerise-backend --resource-group unitedwerise-rg --query properties.provisioningState" -ForegroundColor Gray