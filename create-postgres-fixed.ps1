# Create PostgreSQL in Central US
# SECURITY: Database password must be set from environment variable

Write-Host "Creating PostgreSQL Database in Central US..." -ForegroundColor Green
Write-Host "This will take 5-10 minutes..." -ForegroundColor Yellow

# Validate required environment variable
if (-not $env:DB_ADMIN_PASSWORD) {
    Write-Host "ERROR: DB_ADMIN_PASSWORD environment variable not set." -ForegroundColor Red
    Write-Host "Please set it before running this script:" -ForegroundColor Yellow
    Write-Host '  $env:DB_ADMIN_PASSWORD = "your-secure-password"' -ForegroundColor Gray
    exit 1
}

az postgres flexible-server create --resource-group unitedwerise-rg --name unitedwerise-db --location centralus --admin-user uwradmin --admin-password "$env:DB_ADMIN_PASSWORD" --sku-name Standard_B1ms --tier Burstable --storage-size 32 --version 14 --public-access 0.0.0.0-255.255.255.255 --yes

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nPostgreSQL created successfully!" -ForegroundColor Green
    
    # Store secrets in Key Vault
    Write-Host "`nStoring secrets in Key Vault..." -ForegroundColor Cyan
    
    $DB_CONNECTION = "Server=unitedwerise-db.postgres.database.azure.com;Database=postgres;Port=5432;User Id=uwradmin;Password=$env:DB_ADMIN_PASSWORD;Ssl Mode=Require;"
    
    # Get storage connection string
    $STORAGE_CONNECTION = az storage account show-connection-string --resource-group unitedwerise-rg --name uwrstorage2425 --query connectionString -o tsv
    
    # Get ACR password
    $ACR_PASSWORD = az acr credential show --resource-group unitedwerise-rg --name uwracr2425 --query passwords[0].value -o tsv
    
    # Get App Insights connection string
    $INSIGHTS_CONNECTION = az monitor app-insights component show --resource-group unitedwerise-rg --app unitedwerise-insights --query connectionString -o tsv
    
    # Store secrets
    az keyvault secret set --vault-name uwrkv2425 --name "database-url" --value $DB_CONNECTION | Out-Null
    az keyvault secret set --vault-name uwrkv2425 --name "storage-connection" --value $STORAGE_CONNECTION | Out-Null
    az keyvault secret set --vault-name uwrkv2425 --name "jwt-secret" --value "$(New-Guid)-$(New-Guid)" | Out-Null
    az keyvault secret set --vault-name uwrkv2425 --name "acr-password" --value $ACR_PASSWORD | Out-Null
    
    Write-Host "`nSecrets stored successfully!" -ForegroundColor Green
    
    # Create final config file
    $ENV_CONTENT = @"
# Azure Configuration for United We Rise
# Generated: $(Get-Date)
# ALL RESOURCES CREATED SUCCESSFULLY!

# Database (in Central US)
DATABASE_URL=$DB_CONNECTION
DB_NAME=unitedwerise-db
DB_ADMIN=uwradmin
DB_PASSWORD=SET_VIA_ENV_VARIABLE

# Storage (in East US)
AZURE_STORAGE_CONNECTION_STRING=$STORAGE_CONNECTION
AZURE_STORAGE_ACCOUNT_NAME=uwrstorage2425

# Container Registry
ACR_SERVER=uwracr2425.azurecr.io
ACR_USERNAME=uwracr2425
ACR_PASSWORD=$ACR_PASSWORD

# Key Vault
AZURE_KEY_VAULT_NAME=uwrkv2425

# Application Insights
APPLICATIONINSIGHTS_CONNECTION_STRING=$INSIGHTS_CONNECTION

# Azure Resource Info
RESOURCE_GROUP=unitedwerise-rg
LOCATION=eastus
DB_LOCATION=centralus
CONTAINER_ENV=unitedwerise-env
CONTAINER_APP_URL=https://wonderfulpond-f8a8271f.eastus.azurecontainerapps.io

# Next Steps:
# 1. Build and push Docker image to ACR
# 2. Deploy to Container Apps
# 3. Configure custom domain (optional)
"@

    $ENV_CONTENT | Out-File -FilePath "azure-config-complete.env" -Encoding UTF8
    
    Write-Host "`n==========================================" -ForegroundColor Green
    Write-Host "ALL AZURE RESOURCES CREATED SUCCESSFULLY!" -ForegroundColor Green
    Write-Host "==========================================" -ForegroundColor Green
    
    Write-Host "`nResources Created:" -ForegroundColor Cyan
    Write-Host "  Resource Group: unitedwerise-rg" -ForegroundColor White
    Write-Host "  PostgreSQL: unitedwerise-db (Central US)" -ForegroundColor White
    Write-Host "  Storage: uwrstorage2425 (East US)" -ForegroundColor White
    Write-Host "  Container Registry: uwracr2425" -ForegroundColor White
    Write-Host "  Key Vault: uwrkv2425" -ForegroundColor White
    Write-Host "  Application Insights: unitedwerise-insights" -ForegroundColor White
    Write-Host "  Container Apps Environment: unitedwerise-env" -ForegroundColor White
    
    Write-Host "`nConfiguration saved to: azure-config-complete.env" -ForegroundColor Yellow
    Write-Host "`nYour Azure infrastructure is ready!" -ForegroundColor Green
    Write-Host "Next: We will deploy your application to Container Apps" -ForegroundColor Cyan
    
} else {
    Write-Host "`nCentral US also restricted. Trying North Europe..." -ForegroundColor Yellow
    
    # Try North Europe as last resort
    az postgres flexible-server create --resource-group unitedwerise-rg --name unitedwerise-db --location northeurope --admin-user uwradmin --admin-password "$env:DB_ADMIN_PASSWORD" --sku-name Standard_B1ms --tier Burstable --storage-size 32 --version 14 --public-access 0.0.0.0-255.255.255.255 --yes
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`nPostgreSQL created in North Europe!" -ForegroundColor Green
        Write-Host "Note: Database is in Europe, may have slightly higher latency" -ForegroundColor Yellow
    } else {
        Write-Host "`nAll regions failed. We need to try a different approach." -ForegroundColor Red
    }
}