# Set environment variables one by one
Write-Host "Setting environment variables individually..." -ForegroundColor Green

$CONTAINER_APP = "unitedwerise-backend"
$RESOURCE_GROUP = "unitedwerise-rg"

# Set NODE_ENV
Write-Host "Setting NODE_ENV..." -ForegroundColor Cyan
az containerapp update --name $CONTAINER_APP --resource-group $RESOURCE_GROUP --set-env-vars NODE_ENV=production

# Set PORT
Write-Host "Setting PORT..." -ForegroundColor Cyan
az containerapp update --name $CONTAINER_APP --resource-group $RESOURCE_GROUP --set-env-vars PORT=3001

# Set DATABASE_URL with proper escaping
Write-Host "Setting DATABASE_URL..." -ForegroundColor Cyan
$DB_URL = "postgresql://uwradmin:UWR-Secure2024!@unitedwerise-db.postgres.database.azure.com:5432/postgres?schema=public"
az containerapp update --name $CONTAINER_APP --resource-group $RESOURCE_GROUP --set-env-vars DATABASE_URL="$DB_URL"

# Set JWT_SECRET
Write-Host "Setting JWT_SECRET..." -ForegroundColor Cyan
az containerapp update --name $CONTAINER_APP --resource-group $RESOURCE_GROUP --set-env-vars JWT_SECRET=UWR-JWT-Secret-123456-20250808

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