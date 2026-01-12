# Set environment variables one by one
# SECURITY: Database URL and JWT secret must be set from environment variables or Azure Key Vault
Write-Host "Setting environment variables individually..." -ForegroundColor Green

$CONTAINER_APP = "unitedwerise-backend"
$RESOURCE_GROUP = "unitedwerise-rg"

# Validate required environment variables
if (-not $env:PROD_DATABASE_URL) {
    Write-Host "ERROR: PROD_DATABASE_URL environment variable not set." -ForegroundColor Red
    Write-Host "Please set it before running this script:" -ForegroundColor Yellow
    Write-Host '  $env:PROD_DATABASE_URL = "postgresql://user:pass@host:5432/db?sslmode=require"' -ForegroundColor Gray
    exit 1
}

if (-not $env:JWT_SECRET) {
    Write-Host "ERROR: JWT_SECRET environment variable not set." -ForegroundColor Red
    exit 1
}

# Set NODE_ENV
Write-Host "Setting NODE_ENV..." -ForegroundColor Cyan
az containerapp update --name $CONTAINER_APP --resource-group $RESOURCE_GROUP --set-env-vars NODE_ENV=production

# Set PORT
Write-Host "Setting PORT..." -ForegroundColor Cyan
az containerapp update --name $CONTAINER_APP --resource-group $RESOURCE_GROUP --set-env-vars PORT=3001

# Set DATABASE_URL from environment variable
Write-Host "Setting DATABASE_URL..." -ForegroundColor Cyan
az containerapp update --name $CONTAINER_APP --resource-group $RESOURCE_GROUP --set-env-vars DATABASE_URL="$env:PROD_DATABASE_URL"

# Set JWT_SECRET from environment variable
Write-Host "Setting JWT_SECRET..." -ForegroundColor Cyan
az containerapp update --name $CONTAINER_APP --resource-group $RESOURCE_GROUP --set-env-vars JWT_SECRET="$env:JWT_SECRET"

Write-Host "All environment variables set. Waiting for restart..." -ForegroundColor Green
Start-Sleep -Seconds 30

Write-Host "Running migration..." -ForegroundColor Cyan
az containerapp exec --name $CONTAINER_APP --resource-group $RESOURCE_GROUP --command "npx prisma migrate deploy"

Write-Host "Testing health check..." -ForegroundColor Green
Start-Sleep -Seconds 10

try {
    $response = Invoke-RestMethod -Uri "https://unitedwerise-backend.wonderfulpond-f8a8271f.eastus.azurecontainerapps.io/health" -TimeoutSec 20
    Write-Host ""
    Write-Host "HEALTH CHECK RESULT:" -ForegroundColor Green
    Write-Host ($response | ConvertTo-Json -Indent 2) -ForegroundColor White
} catch {
    Write-Host "Health check failed, checking logs..." -ForegroundColor Yellow
    az containerapp logs show --name $CONTAINER_APP --resource-group $RESOURCE_GROUP --tail 5
}