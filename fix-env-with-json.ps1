# Fix DATABASE_URL using JSON configuration
Write-Host "Updating container app environment variables..." -ForegroundColor Green

$CONTAINER_APP = "unitedwerise-backend"
$RESOURCE_GROUP = "unitedwerise-rg"

Write-Host "Applying environment variables from JSON..." -ForegroundColor Cyan

# Update container app with environment variables from JSON
az containerapp update `
    --name $CONTAINER_APP `
    --resource-group $RESOURCE_GROUP `
    --replace-env-vars @env-vars.json

if ($LASTEXITCODE -eq 0) {
    Write-Host "Environment variables updated successfully!" -ForegroundColor Green
    Write-Host "Waiting for container to restart..." -ForegroundColor Yellow
    Start-Sleep -Seconds 45
    
    Write-Host "Running migration in container..." -ForegroundColor Cyan
    az containerapp exec `
        --name $CONTAINER_APP `
        --resource-group $RESOURCE_GROUP `
        --command "npx prisma migrate deploy"
    
    Write-Host ""
    Write-Host "Testing health check..." -ForegroundColor Green
    Start-Sleep -Seconds 15
    
    try {
        $response = Invoke-RestMethod -Uri "https://unitedwerise-backend.wonderfulpond-f8a8271f.eastus.azurecontainerapps.io/health" -TimeoutSec 20
        Write-Host ""
        Write-Host "FINAL HEALTH CHECK RESULT:" -ForegroundColor Green
        Write-Host ($response | ConvertTo-Json -Indent 2) -ForegroundColor White
        
        if ($response.database -eq "Connected") {
            Write-Host ""
            Write-Host "SUCCESS! Backend is fully operational!" -ForegroundColor Green
        }
    } catch {
        Write-Host "Checking final status..." -ForegroundColor Yellow
        az containerapp logs show --name $CONTAINER_APP --resource-group $RESOURCE_GROUP --tail 8
    }
} else {
    Write-Host "Failed to update environment variables" -ForegroundColor Red
}