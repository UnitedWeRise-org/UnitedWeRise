# Run database migration inside the Azure container
Write-Host "Running database migration in Azure Container..." -ForegroundColor Green

$CONTAINER_APP = "unitedwerise-backend"
$RESOURCE_GROUP = "unitedwerise-rg"

Write-Host "Executing migration command in container..." -ForegroundColor Cyan

# Run the migration command directly in the container
az containerapp exec `
    --name $CONTAINER_APP `
    --resource-group $RESOURCE_GROUP `
    --command "npx prisma migrate deploy"

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Migration completed successfully!" -ForegroundColor Green
    Write-Host "Testing the health endpoint..." -ForegroundColor Cyan
    
    Start-Sleep -Seconds 10
    
    try {
        $response = Invoke-RestMethod -Uri "https://unitedwerise-backend.wonderfulpond-f8a8271f.eastus.azurecontainerapps.io/health" -TimeoutSec 15
        Write-Host ""
        Write-Host "HEALTH CHECK RESULT:" -ForegroundColor Green
        Write-Host ($response | ConvertTo-Json -Indent 2) -ForegroundColor White
        
        if ($response.database -eq "Connected") {
            Write-Host ""
            Write-Host "SUCCESS! Backend is fully operational!" -ForegroundColor Green
            Write-Host "Database: Connected" -ForegroundColor Green
            Write-Host "Backend URL: https://unitedwerise-backend.wonderfulpond-f8a8271f.eastus.azurecontainerapps.io" -ForegroundColor White
        }
    } catch {
        Write-Host "Health check failed, but migration may have succeeded" -ForegroundColor Yellow
        Write-Host "Checking container logs..." -ForegroundColor Cyan
        az containerapp logs show --name $CONTAINER_APP --resource-group $RESOURCE_GROUP --tail 10
    }
} else {
    Write-Host "Migration command failed" -ForegroundColor Red
    Write-Host "Checking container logs..." -ForegroundColor Cyan
    az containerapp logs show --name $CONTAINER_APP --resource-group $RESOURCE_GROUP --tail 15
}