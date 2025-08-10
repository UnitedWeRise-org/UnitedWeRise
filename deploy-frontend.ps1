# Deploy frontend to Azure Static Web Apps
Write-Host "Deploying United We Rise frontend to Azure Static Web Apps..." -ForegroundColor Green

$RESOURCE_GROUP = "unitedwerise-rg"
$APP_NAME = "unitedwerise-frontend"
$LOCATION = "eastus"

Write-Host "Creating Static Web App..." -ForegroundColor Cyan

# Create Static Web App
az staticwebapp create `
    --name $APP_NAME `
    --resource-group $RESOURCE_GROUP `
    --location $LOCATION `
    --source "./frontend" `
    --branch "main" `
    --app-location "/" `
    --output-location "/"

if ($LASTEXITCODE -eq 0) {
    Write-Host "Static Web App created successfully!" -ForegroundColor Green
    
    # Get the URL
    $APP_URL = az staticwebapp show --name $APP_NAME --resource-group $RESOURCE_GROUP --query defaultHostname -o tsv
    
    Write-Host ""
    Write-Host "FRONTEND DEPLOYMENT COMPLETE!" -ForegroundColor Green
    Write-Host "===========================================" -ForegroundColor Green
    Write-Host "Frontend URL: https://$APP_URL" -ForegroundColor White
    Write-Host "Backend API: https://unitedwerise-backend.wonderfulpond-f8a8271f.eastus.azurecontainerapps.io/api" -ForegroundColor White
    Write-Host ""
    Write-Host "United We Rise is now fully deployed!" -ForegroundColor Green
    
    # Test the frontend
    Write-Host "Testing frontend..." -ForegroundColor Cyan
    Start-Sleep -Seconds 30
    
    try {
        $response = Invoke-WebRequest -Uri "https://$APP_URL" -TimeoutSec 15
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ Frontend is live and responding!" -ForegroundColor Green
        }
    } catch {
        Write-Host "Frontend may still be deploying. Check the URL in a few minutes." -ForegroundColor Yellow
    }
    
} else {
    Write-Host "Failed to create Static Web App" -ForegroundColor Red
}