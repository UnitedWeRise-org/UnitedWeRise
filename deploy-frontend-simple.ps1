# Deploy frontend to Azure Static Web Apps (manual upload)
Write-Host "Creating Azure Static Web App..." -ForegroundColor Green

$RESOURCE_GROUP = "unitedwerise-rg"
$APP_NAME = "unitedwerise-frontend"
$LOCATION = "eastus"

Write-Host "Creating Static Web App without Git integration..." -ForegroundColor Cyan

# Create Static Web App without source control
az staticwebapp create `
    --name $APP_NAME `
    --resource-group $RESOURCE_GROUP `
    --location $LOCATION

if ($LASTEXITCODE -eq 0) {
    Write-Host "Static Web App created successfully!" -ForegroundColor Green
    
    # Get the deployment token for uploading files
    Write-Host "Getting deployment token..." -ForegroundColor Cyan
    $DEPLOYMENT_TOKEN = az staticwebapp secrets list --name $APP_NAME --resource-group $RESOURCE_GROUP --query properties.apiKey -o tsv
    
    # Get the URL
    $APP_URL = az staticwebapp show --name $APP_NAME --resource-group $RESOURCE_GROUP --query defaultHostname -o tsv
    
    Write-Host ""
    Write-Host "STATIC WEB APP CREATED!" -ForegroundColor Green
    Write-Host "===========================================" -ForegroundColor Green
    Write-Host "App Name: $APP_NAME" -ForegroundColor White
    Write-Host "URL: https://$APP_URL" -ForegroundColor White
    Write-Host ""
    Write-Host "Next steps to deploy your files:" -ForegroundColor Cyan
    Write-Host "1. Install Azure Static Web Apps CLI: npm install -g @azure/static-web-apps-cli" -ForegroundColor Yellow
    Write-Host "2. Deploy files: swa deploy ./frontend --deployment-token <token>" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Your deployment token:" -ForegroundColor White
    Write-Host $DEPLOYMENT_TOKEN -ForegroundColor Gray
    
} else {
    Write-Host "Failed to create Static Web App" -ForegroundColor Red
    Write-Host "Let's try using Azure Storage instead..." -ForegroundColor Yellow
    
    # Alternative: Use Azure Storage static website
    Write-Host "Creating static website using Azure Storage..." -ForegroundColor Cyan
    
    $STORAGE_ACCOUNT = "uwrstorage2425"
    
    # Enable static website on storage account
    az storage blob service-properties update `
        --account-name $STORAGE_ACCOUNT `
        --static-website `
        --index-document "index.html"
    
    if ($LASTEXITCODE -eq 0) {
        # Upload files to $web container
        Write-Host "Uploading frontend files..." -ForegroundColor Cyan
        az storage blob upload-batch `
            --account-name $STORAGE_ACCOUNT `
            --source "./frontend" `
            --destination '$web' `
            --overwrite
        
        # Get the static website URL
        $STATIC_URL = az storage account show --name $STORAGE_ACCOUNT --resource-group $RESOURCE_GROUP --query primaryEndpoints.web -o tsv
        
        Write-Host ""
        Write-Host "FRONTEND DEPLOYED TO AZURE STORAGE!" -ForegroundColor Green
        Write-Host "===========================================" -ForegroundColor Green
        Write-Host "Frontend URL: $STATIC_URL" -ForegroundColor White
        Write-Host "Backend API: https://unitedwerise-backend.wonderfulpond-f8a8271f.eastus.azurecontainerapps.io/api" -ForegroundColor White
        
        Write-Host ""
        Write-Host "Testing frontend..." -ForegroundColor Cyan
        try {
            $response = Invoke-WebRequest -Uri $STATIC_URL -TimeoutSec 15
            if ($response.StatusCode -eq 200) {
                Write-Host "✅ Frontend is live!" -ForegroundColor Green
            }
        } catch {
            Write-Host "Frontend URL: $STATIC_URL" -ForegroundColor Yellow
        }
    }
}