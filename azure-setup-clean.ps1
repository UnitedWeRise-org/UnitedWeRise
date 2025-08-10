# United We Rise - Azure Setup Script (Clean Version)
# This version handles existing resources and provider registration

Write-Host "United We Rise - Azure Infrastructure Setup" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green

# Variables
$RESOURCE_GROUP = "unitedwerise-rg"
$LOCATION = "eastus"
$DB_NAME = "unitedwerise-db"
$DB_ADMIN = "uwradmin"
$DB_PASSWORD = "UWR-Secure2024!"  # Strong password
$RANDOM_SUFFIX = Get-Random -Maximum 9999
$STORAGE_NAME = "uwrstorage$RANDOM_SUFFIX"  # Shortened for Azure limits
$ACR_NAME = "uwracr$RANDOM_SUFFIX"
$KEYVAULT_NAME = "uwrkv$RANDOM_SUFFIX"
$APP_INSIGHTS = "unitedwerise-insights"
$CONTAINER_ENV = "unitedwerise-env"

Write-Host "`nConfiguration:" -ForegroundColor Cyan
Write-Host "  Region: $LOCATION" -ForegroundColor White
Write-Host "  Resource Group: $RESOURCE_GROUP" -ForegroundColor White
Write-Host "  Random Suffix: $RANDOM_SUFFIX" -ForegroundColor White

# Check provider registration status
Write-Host "`nChecking Azure provider registrations..." -ForegroundColor Yellow
$providers = @(
    "Microsoft.DBforPostgreSQL",
    "Microsoft.Storage",
    "Microsoft.ContainerRegistry",
    "Microsoft.KeyVault",
    "Microsoft.Insights",
    "Microsoft.App"
)

$allRegistered = $true
foreach ($provider in $providers) {
    $status = az provider show -n $provider --query registrationState -o tsv
    if ($status -ne "Registered") {
        Write-Host "  $provider : $status" -ForegroundColor Red
        $allRegistered = $false
    } else {
        Write-Host "  $provider : Registered" -ForegroundColor Green
    }
}

if (-not $allRegistered) {
    Write-Host "`nSome providers are not registered. Registering now..." -ForegroundColor Yellow
    foreach ($provider in $providers) {
        az provider register --namespace $provider
    }
    Write-Host "Please wait 2-3 minutes and run this script again." -ForegroundColor Yellow
    exit
}

Write-Host "`nAll providers registered. Proceeding with setup..." -ForegroundColor Green

# Create Resource Group (if not exists)
Write-Host "`nStep 1: Resource Group" -ForegroundColor Cyan
$rgExists = az group exists --name $RESOURCE_GROUP
if ($rgExists -eq "true") {
    Write-Host "  Resource group already exists" -ForegroundColor Yellow
} else {
    Write-Host "  Creating resource group..." -ForegroundColor White
    az group create --name $RESOURCE_GROUP --location $LOCATION
}

# Create PostgreSQL Database
Write-Host "`nStep 2: PostgreSQL Database" -ForegroundColor Cyan
$dbExists = az postgres flexible-server show --resource-group $RESOURCE_GROUP --name $DB_NAME 2>$null
if ($dbExists) {
    Write-Host "  Database already exists" -ForegroundColor Yellow
} else {
    Write-Host "  Creating PostgreSQL database (this takes 5-10 minutes)..." -ForegroundColor White
    az postgres flexible-server create `
        --resource-group $RESOURCE_GROUP `
        --name $DB_NAME `
        --location $LOCATION `
        --admin-user $DB_ADMIN `
        --admin-password $DB_PASSWORD `
        --sku-name Standard_B1ms `
        --tier Burstable `
        --storage-size 32 `
        --version 14 `
        --public-access 0.0.0.0-255.255.255.255 `
        --yes
}

# Create Storage Account
Write-Host "`nStep 3: Storage Account" -ForegroundColor Cyan
Write-Host "  Creating storage account: $STORAGE_NAME" -ForegroundColor White
az storage account create `
    --resource-group $RESOURCE_GROUP `
    --name $STORAGE_NAME `
    --location $LOCATION `
    --sku Standard_LRS `
    --allow-blob-public-access true

# Wait for storage account to be ready
Start-Sleep -Seconds 10

# Get storage key for container creation
$STORAGE_KEY = az storage account keys list `
    --resource-group $RESOURCE_GROUP `
    --account-name $STORAGE_NAME `
    --query "[0].value" -o tsv

# Create storage containers
Write-Host "  Creating storage containers..." -ForegroundColor White
az storage container create `
    --account-name $STORAGE_NAME `
    --account-key $STORAGE_KEY `
    --name photos `
    --public-access blob

az storage container create `
    --account-name $STORAGE_NAME `
    --account-key $STORAGE_KEY `
    --name thumbnails `
    --public-access blob

# Create Container Registry
Write-Host "`nStep 4: Container Registry" -ForegroundColor Cyan
Write-Host "  Creating container registry: $ACR_NAME" -ForegroundColor White
az acr create `
    --resource-group $RESOURCE_GROUP `
    --name $ACR_NAME `
    --sku Basic `
    --admin-enabled true

# Create Key Vault
Write-Host "`nStep 5: Key Vault" -ForegroundColor Cyan
Write-Host "  Creating key vault: $KEYVAULT_NAME" -ForegroundColor White
az keyvault create `
    --resource-group $RESOURCE_GROUP `
    --name $KEYVAULT_NAME `
    --location $LOCATION

# Create Application Insights
Write-Host "`nStep 6: Application Insights" -ForegroundColor Cyan
Write-Host "  Creating application insights..." -ForegroundColor White
az monitor app-insights component create `
    --resource-group $RESOURCE_GROUP `
    --app $APP_INSIGHTS `
    --location $LOCATION `
    --kind web

# Create Container Apps Environment
Write-Host "`nStep 7: Container Apps Environment" -ForegroundColor Cyan
Write-Host "  Creating container apps environment..." -ForegroundColor White
az containerapp env create `
    --name $CONTAINER_ENV `
    --resource-group $RESOURCE_GROUP `
    --location $LOCATION

Write-Host "`nCollecting connection information..." -ForegroundColor Yellow

# Get all connection strings
$DB_CONNECTION = "Server=$DB_NAME.postgres.database.azure.com;Database=postgres;Port=5432;User Id=$DB_ADMIN;Password=$DB_PASSWORD;Ssl Mode=Require;"

$STORAGE_CONNECTION = az storage account show-connection-string `
    --resource-group $RESOURCE_GROUP `
    --name $STORAGE_NAME `
    --query connectionString -o tsv

$ACR_SERVER = "$ACR_NAME.azurecr.io"
$ACR_USERNAME = az acr credential show `
    --resource-group $RESOURCE_GROUP `
    --name $ACR_NAME `
    --query username -o tsv

$ACR_PASSWORD_VAL = az acr credential show `
    --resource-group $RESOURCE_GROUP `
    --name $ACR_NAME `
    --query passwords[0].value -o tsv

$INSIGHTS_KEY = az monitor app-insights component show `
    --resource-group $RESOURCE_GROUP `
    --app $APP_INSIGHTS `
    --query instrumentationKey -o tsv

# Store secrets in Key Vault
Write-Host "`nStoring secrets in Key Vault..." -ForegroundColor Cyan
az keyvault secret set --vault-name $KEYVAULT_NAME --name "database-url" --value $DB_CONNECTION | Out-Null
az keyvault secret set --vault-name $KEYVAULT_NAME --name "storage-connection" --value $STORAGE_CONNECTION | Out-Null
az keyvault secret set --vault-name $KEYVAULT_NAME --name "jwt-secret" --value "$(New-Guid)-$(New-Guid)" | Out-Null
az keyvault secret set --vault-name $KEYVAULT_NAME --name "acr-password" --value $ACR_PASSWORD_VAL | Out-Null

# Create environment file
$ENV_CONTENT = @"
# Azure Configuration for United We Rise
# Generated: $(Get-Date)
# KEEP THIS FILE SECURE - IT CONTAINS PASSWORDS

# Database
DATABASE_URL=$DB_CONNECTION
DB_NAME=$DB_NAME
DB_ADMIN=$DB_ADMIN
DB_PASSWORD=$DB_PASSWORD

# Storage
AZURE_STORAGE_CONNECTION_STRING=$STORAGE_CONNECTION
AZURE_STORAGE_ACCOUNT_NAME=$STORAGE_NAME
AZURE_STORAGE_KEY=$STORAGE_KEY

# Container Registry
ACR_SERVER=$ACR_SERVER
ACR_USERNAME=$ACR_USERNAME
ACR_PASSWORD=$ACR_PASSWORD_VAL

# Key Vault
AZURE_KEY_VAULT_NAME=$KEYVAULT_NAME

# Application Insights
APPLICATIONINSIGHTS_INSTRUMENTATION_KEY=$INSIGHTS_KEY

# Azure Resource Info
RESOURCE_GROUP=$RESOURCE_GROUP
LOCATION=$LOCATION
CONTAINER_ENV=$CONTAINER_ENV
"@

$ENV_CONTENT | Out-File -FilePath "azure-config.env" -Encoding UTF8

Write-Host "`n==========================================" -ForegroundColor Green
Write-Host "SETUP COMPLETE!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green

Write-Host "`nResource Summary:" -ForegroundColor Cyan
Write-Host "  Resource Group: $RESOURCE_GROUP" -ForegroundColor White
Write-Host "  Database: $DB_NAME" -ForegroundColor White
Write-Host "  Storage: $STORAGE_NAME" -ForegroundColor White
Write-Host "  Registry: $ACR_NAME" -ForegroundColor White
Write-Host "  Key Vault: $KEYVAULT_NAME" -ForegroundColor White

Write-Host "`nIMPORTANT - SAVE THESE CREDENTIALS:" -ForegroundColor Red
Write-Host "  Database Password: $DB_PASSWORD" -ForegroundColor Yellow
Write-Host "  Config File: azure-config.env" -ForegroundColor Yellow

Write-Host "`nNext Steps:" -ForegroundColor Cyan
Write-Host "  1. Configuration saved to: azure-config.env" -ForegroundColor White
Write-Host "  2. Keep this file secure - it contains passwords" -ForegroundColor White
Write-Host "  3. Ready to deploy your application!" -ForegroundColor White

Write-Host "`nAzure Portal:" -ForegroundColor Cyan
Write-Host "  https://portal.azure.com/#@/resource/subscriptions/$(az account show --query id -o tsv)/resourceGroups/$RESOURCE_GROUP" -ForegroundColor Blue