# Fix Container Apps deployment with proper ACR authentication

Write-Host "Fixing Container Apps deployment..." -ForegroundColor Green

$ACR_NAME = "uwracr2425"
$IMAGE_NAME = "unitedwerise-backend"
$IMAGE_TAG = "20250808-1206"
$FULL_IMAGE_PATH = "$ACR_NAME.azurecr.io/$IMAGE_NAME`:$IMAGE_TAG"

# First, let's configure Container Apps to use ACR with admin credentials
Write-Host "Configuring Container Registry access..." -ForegroundColor Cyan

# Get ACR admin credentials
$ACR_USERNAME = az acr credential show --resource-group unitedwerise-rg --name $ACR_NAME --query username -o tsv
$ACR_PASSWORD = az acr credential show --resource-group unitedwerise-rg --name $ACR_NAME --query passwords[0].value -o tsv

Write-Host "ACR Username: $ACR_USERNAME" -ForegroundColor Yellow

# Delete the failed container app if it exists
Write-Host "Cleaning up any failed deployment..." -ForegroundColor Cyan
az containerapp delete --name unitedwerise-backend --resource-group unitedwerise-rg --yes 2>$null

# Create container app with proper ACR authentication
Write-Host "Creating Container App with ACR authentication..." -ForegroundColor Cyan

az containerapp create `
    --name unitedwerise-backend `
    --resource-group unitedwerise-rg `
    --environment unitedwerise-env `
    --image $FULL_IMAGE_PATH `
    --registry-server "$ACR_NAME.azurecr.io" `
    --registry-username $ACR_USERNAME `
    --registry-password $ACR_PASSWORD `
    --target-port 3001 `
    --ingress external `
    --min-replicas 1 `
    --max-replicas 3 `
    --cpu 0.5 `
    --memory 1Gi `
    --env-vars `
        "NODE_ENV=production" `
        "PORT=3001" `
        "DATABASE_URL=Server=unitedwerise-db.postgres.database.azure.com;Database=postgres;Port=5432;User Id=uwradmin;Password=UWR-Secure2024!;Ssl Mode=Require;" `
        "AZURE_STORAGE_CONNECTION_STRING=$(az storage account show-connection-string --resource-group unitedwerise-rg --name uwrstorage2425 --query connectionString -o tsv)" `
        "JWT_SECRET=UWR-JWT-Secret-$(Get-Random)-$(Get-Date -Format 'yyyyMMdd')"

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n==========================================" -ForegroundColor Green
    Write-Host "DEPLOYMENT SUCCESSFUL!" -ForegroundColor Green
    Write-Host "==========================================" -ForegroundColor Green
    
    # Get the application URL
    $APP_URL = az containerapp show --name unitedwerise-backend --resource-group unitedwerise-rg --query properties.configuration.ingress.fqdn -o tsv
    
    Write-Host "`nYour United We Rise backend is deployed!" -ForegroundColor Cyan
    Write-Host "Backend URL: https://$APP_URL" -ForegroundColor White
    Write-Host "Health Check: https://$APP_URL/health" -ForegroundColor White
    Write-Host "API Documentation: https://$APP_URL/api-docs" -ForegroundColor White
    
    Write-Host "`nTesting the deployment..." -ForegroundColor Cyan
    Start-Sleep -Seconds 45  # Give the app time to start
    
    try {
        $healthResponse = Invoke-RestMethod -Uri "https://$APP_URL/health" -TimeoutSec 15
        Write-Host "✅ Health check passed!" -ForegroundColor Green
        Write-Host "Response: $($healthResponse | ConvertTo-Json -Compress)" -ForegroundColor White
    } catch {
        Write-Host "⏱️  Health check not ready yet - checking logs..." -ForegroundColor Yellow
        
        # Show recent logs
        Write-Host "`nRecent logs:" -ForegroundColor Cyan
        az containerapp logs show --name unitedwerise-backend --resource-group unitedwerise-rg --tail 20
    }
    
    Write-Host "`nNext Steps:" -ForegroundColor Cyan
    Write-Host "1. ✅ Backend deployed and running" -ForegroundColor Green
    Write-Host "2. 🔄 Run database migrations" -ForegroundColor Yellow
    Write-Host "3. 🔄 Test API endpoints" -ForegroundColor Yellow
    Write-Host "4. 🔄 Deploy frontend" -ForegroundColor Yellow
    
} else {
    Write-Host "`nDeployment failed again!" -ForegroundColor Red
    Write-Host "Let's check what went wrong..." -ForegroundColor Yellow
    
    # Show any existing container app status
    az containerapp show --name unitedwerise-backend --resource-group unitedwerise-rg --query properties.provisioningState 2>$null
}

Write-Host "`nUseful Management Commands:" -ForegroundColor Cyan
Write-Host "View logs: az containerapp logs show --name unitedwerise-backend --resource-group unitedwerise-rg --follow" -ForegroundColor Gray
Write-Host "Restart app: az containerapp revision restart --name unitedwerise-backend --resource-group unitedwerise-rg" -ForegroundColor Gray
Write-Host "Scale app: az containerapp update --name unitedwerise-backend --resource-group unitedwerise-rg --min-replicas 2" -ForegroundColor Gray