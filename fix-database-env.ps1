# Fix DATABASE_URL environment variable in container
Write-Host "Fixing DATABASE_URL in container app..." -ForegroundColor Green

$CONTAINER_APP = "unitedwerise-backend"
$RESOURCE_GROUP = "unitedwerise-rg"
$DATABASE_URL = "postgresql://uwradmin:UWR-Secure2024!@unitedwerise-db.postgres.database.azure.com:5432/postgres?schema=public&sslmode=require"

Write-Host "Setting DATABASE_URL environment variable..." -ForegroundColor Cyan

# Update container app with correct DATABASE_URL
az containerapp update `
    --name $CONTAINER_APP `
    --resource-group $RESOURCE_GROUP `
    --set-env-vars "DATABASE_URL=$DATABASE_URL"

if ($LASTEXITCODE -eq 0) {
    Write-Host "Environment variable updated successfully!" -ForegroundColor Green
    Write-Host "Waiting for container to restart..." -ForegroundColor Yellow
    Start-Sleep -Seconds 30
    
    Write-Host "Running migration in container..." -ForegroundColor Cyan
    az containerapp exec `
        --name $CONTAINER_APP `
        --resource-group $RESOURCE_GROUP `
        --command "npx prisma migrate deploy"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "Migration successful! Testing health check..." -ForegroundColor Green
        Start-Sleep -Seconds 10
        
        try {
            $response = Invoke-RestMethod -Uri "https://unitedwerise-backend.wonderfulpond-f8a8271f.eastus.azurecontainerapps.io/health" -TimeoutSec 15
            Write-Host ""
            Write-Host "HEALTH CHECK SUCCESS!" -ForegroundColor Green
            Write-Host ($response | ConvertTo-Json -Indent 2) -ForegroundColor White
        } catch {
            Write-Host "Health check still failing, checking logs..." -ForegroundColor Yellow
            az containerapp logs show --name $CONTAINER_APP --resource-group $RESOURCE_GROUP --tail 5
        }
    }
} else {
    Write-Host "Failed to update environment variable" -ForegroundColor Red
}