# Fix Azure Setup Issues

Write-Host "Fixing Azure Setup..." -ForegroundColor Green

# Get your user ID
Write-Host "`nGetting your user ID..." -ForegroundColor Cyan
$USER_ID = az ad signed-in-user show --query id -o tsv
Write-Host "User ID: $USER_ID" -ForegroundColor Yellow

# Grant Key Vault permissions
Write-Host "`nGranting Key Vault permissions..." -ForegroundColor Cyan
$SCOPE = "/subscriptions/f71adbbe-4225-40e8-bb8a-9ae87086477f/resourceGroups/unitedwerise-rg/providers/Microsoft.KeyVault/vaults/uwrkv2425"
az role assignment create --role "Key Vault Administrator" --assignee $USER_ID --scope $SCOPE

Write-Host "`nKey Vault permissions granted!" -ForegroundColor Green

# Create PostgreSQL Database
Write-Host "`nCreating PostgreSQL Database in West US 2..." -ForegroundColor Cyan
Write-Host "This will take 5-10 minutes..." -ForegroundColor Yellow

# SECURITY: Database password must be provided via environment variable
if (-not $env:DB_ADMIN_PASSWORD) {
    Write-Host "ERROR: DB_ADMIN_PASSWORD environment variable not set." -ForegroundColor Red
    Write-Host "Please set it before running this script:" -ForegroundColor Yellow
    Write-Host '  $env:DB_ADMIN_PASSWORD = "your-secure-password"' -ForegroundColor Gray
    exit 1
}

$PG_RESULT = az postgres flexible-server create --resource-group unitedwerise-rg --name unitedwerise-db --location westus2 --admin-user uwradmin --admin-password "$env:DB_ADMIN_PASSWORD" --sku-name Standard_B1ms --tier Burstable --storage-size 32 --version 14 --public-access 0.0.0.0-255.255.255.255 --yes

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nPostgreSQL created successfully!" -ForegroundColor Green
    
    # Now store secrets in Key Vault
    Write-Host "`nStoring secrets in Key Vault..." -ForegroundColor Cyan
    
    $DB_CONNECTION = "Server=unitedwerise-db.postgres.database.azure.com;Database=postgres;Port=5432;User Id=uwradmin;Password=$env:DB_ADMIN_PASSWORD;Ssl Mode=Require;"
    
    # Get storage connection string
    $STORAGE_CONNECTION = az storage account show-connection-string --resource-group unitedwerise-rg --name uwrstorage2425 --query connectionString -o tsv
    
    # Get ACR password
    $ACR_PASSWORD = az acr credential show --resource-group unitedwerise-rg --name uwracr2425 --query passwords[0].value -o tsv
    
    # Store secrets
    az keyvault secret set --vault-name uwrkv2425 --name "database-url" --value $DB_CONNECTION | Out-Null
    az keyvault secret set --vault-name uwrkv2425 --name "storage-connection" --value $STORAGE_CONNECTION | Out-Null
    az keyvault secret set --vault-name uwrkv2425 --name "jwt-secret" --value "$(New-Guid)-$(New-Guid)" | Out-Null
    az keyvault secret set --vault-name uwrkv2425 --name "acr-password" --value $ACR_PASSWORD | Out-Null
    
    Write-Host "`nSecrets stored successfully!" -ForegroundColor Green
    
    # Update the config file
    $ENV_CONTENT = @"
# Azure Configuration for United We Rise
# Generated: $(Get-Date)
# ALL RESOURCES CREATED SUCCESSFULLY!

# Database (in West US 2)
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
APPLICATIONINSIGHTS_CONNECTION_STRING=InstrumentationKey=bd18940b-d349-41aa-87cf-8fa4fc3eddde;IngestionEndpoint=https://eastus-8.in.applicationinsights.azure.com/;LiveEndpoint=https://eastus.livediagnostics.monitor.azure.com/;ApplicationId=c9da6b0f-8940-4d43-9c81-d4e4b44e4abd

# Azure Resource Info
RESOURCE_GROUP=unitedwerise-rg
LOCATION=eastus
DB_LOCATION=westus2
CONTAINER_ENV=unitedwerise-env
"@

    $ENV_CONTENT | Out-File -FilePath "azure-config-complete.env" -Encoding UTF8
    
    Write-Host "`n==========================================" -ForegroundColor Green
    Write-Host "ALL AZURE RESOURCES CREATED SUCCESSFULLY!" -ForegroundColor Green
    Write-Host "==========================================" -ForegroundColor Green
    
    Write-Host "`nConfiguration saved to: azure-config-complete.env" -ForegroundColor Yellow
    Write-Host "`nYour Azure resources are ready for deployment!" -ForegroundColor Green
    
} else {
    Write-Host "`nPostgreSQL creation failed. Try a different region:" -ForegroundColor Red
    Write-Host "  - centralus" -ForegroundColor Yellow
    Write-Host "  - westus" -ForegroundColor Yellow
    Write-Host "  - northeurope" -ForegroundColor Yellow
}