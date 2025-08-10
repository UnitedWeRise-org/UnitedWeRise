# United We Rise - Azure Setup Script
# Run this after: az login

# Variables - UPDATE THESE
$RESOURCE_GROUP = "unitedwerise-rg"
$LOCATION = "eastus"
$DB_NAME = "unitedwerise-db"
$DB_ADMIN = "uwradmin"
$DB_PASSWORD = "UWR-SecurePass123!"  # CHANGE THIS!
$STORAGE_NAME = "unitedwerisestore$(Get-Random -Maximum 9999)"  # Must be globally unique
$ACR_NAME = "unitedweriseacr$(Get-Random -Maximum 9999)"       # Must be globally unique
$KEYVAULT_NAME = "unitedwerise-kv$(Get-Random -Maximum 9999)"  # Must be globally unique
$APP_INSIGHTS = "unitedwerise-insights"
$CONTAINER_ENV = "unitedwerise-env"

Write-Host "🚀 Creating United We Rise infrastructure on Azure..." -ForegroundColor Green
Write-Host "Region: $LOCATION" -ForegroundColor Yellow

# Create Resource Group
Write-Host "`n📁 Creating Resource Group..." -ForegroundColor Cyan
az group create --name $RESOURCE_GROUP --location $LOCATION

# Create PostgreSQL Database
Write-Host "`n🗄️ Creating PostgreSQL Database..." -ForegroundColor Cyan
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
  --public-access 0.0.0.0-255.255.255.255

# Create Storage Account
Write-Host "`n💾 Creating Storage Account..." -ForegroundColor Cyan
az storage account create `
  --resource-group $RESOURCE_GROUP `
  --name $STORAGE_NAME `
  --location $LOCATION `
  --sku Standard_LRS `
  --allow-blob-public-access true

# Create storage containers
Write-Host "📦 Creating storage containers..." -ForegroundColor Cyan
az storage container create --account-name $STORAGE_NAME --name photos --public-access blob
az storage container create --account-name $STORAGE_NAME --name thumbnails --public-access blob

# Create Container Registry
Write-Host "`n🐳 Creating Container Registry..." -ForegroundColor Cyan
az acr create `
  --resource-group $RESOURCE_GROUP `
  --name $ACR_NAME `
  --sku Basic `
  --admin-enabled true

# Create Key Vault
Write-Host "`n🔐 Creating Key Vault..." -ForegroundColor Cyan
az keyvault create `
  --resource-group $RESOURCE_GROUP `
  --name $KEYVAULT_NAME `
  --location $LOCATION `
  --sku standard

# Create Application Insights
Write-Host "`n📊 Creating Application Insights..." -ForegroundColor Cyan
az monitor app-insights component create `
  --resource-group $RESOURCE_GROUP `
  --app $APP_INSIGHTS `
  --location $LOCATION `
  --kind web

# Create Container Apps Environment
Write-Host "`n🏗️ Creating Container Apps Environment..." -ForegroundColor Cyan
az containerapp env create `
  --name $CONTAINER_ENV `
  --resource-group $RESOURCE_GROUP `
  --location $LOCATION

Write-Host "`n✅ Infrastructure created successfully!" -ForegroundColor Green

# Get connection strings and important info
Write-Host "`n📋 Collecting connection information..." -ForegroundColor Cyan

$DB_CONNECTION = "Server=$DB_NAME.postgres.database.azure.com;Database=postgres;Port=5432;User Id=$DB_ADMIN;Password=$DB_PASSWORD;Ssl Mode=Require;"

$STORAGE_CONNECTION = az storage account show-connection-string --resource-group $RESOURCE_GROUP --name $STORAGE_NAME --query connectionString -o tsv

$ACR_SERVER = az acr show --resource-group $RESOURCE_GROUP --name $ACR_NAME --query loginServer -o tsv
$ACR_USERNAME = az acr credential show --resource-group $RESOURCE_GROUP --name $ACR_NAME --query username -o tsv
$ACR_PASSWORD = az acr credential show --resource-group $RESOURCE_GROUP --name $ACR_NAME --query passwords[0].value -o tsv

$INSIGHTS_CONNECTION = az monitor app-insights component show --resource-group $RESOURCE_GROUP --app $APP_INSIGHTS --query connectionString -o tsv

# Store secrets in Key Vault
Write-Host "`n🔑 Storing secrets in Key Vault..." -ForegroundColor Cyan
az keyvault secret set --vault-name $KEYVAULT_NAME --name "database-url" --value $DB_CONNECTION
az keyvault secret set --vault-name $KEYVAULT_NAME --name "storage-connection" --value $STORAGE_CONNECTION
az keyvault secret set --vault-name $KEYVAULT_NAME --name "jwt-secret" --value "$(New-Guid)-$(New-Guid)"
az keyvault secret set --vault-name $KEYVAULT_NAME --name "app-insights-connection" --value $INSIGHTS_CONNECTION

# Create environment file
$ENV_CONTENT = @"
# Azure Configuration for United We Rise
# Generated: $(Get-Date)

# Database
DATABASE_URL=$DB_CONNECTION

# Storage
AZURE_STORAGE_CONNECTION_STRING=$STORAGE_CONNECTION
AZURE_STORAGE_ACCOUNT_NAME=$STORAGE_NAME

# Container Registry
ACR_SERVER=$ACR_SERVER
ACR_USERNAME=$ACR_USERNAME
ACR_PASSWORD=$ACR_PASSWORD

# Key Vault
AZURE_KEY_VAULT_NAME=$KEYVAULT_NAME

# Application Insights
APPLICATIONINSIGHTS_CONNECTION_STRING=$INSIGHTS_CONNECTION

# Azure Resource Info
RESOURCE_GROUP=$RESOURCE_GROUP
LOCATION=$LOCATION
CONTAINER_ENV=$CONTAINER_ENV
"@

$ENV_CONTENT | Out-File -FilePath "azure-config.env" -Encoding UTF8

Write-Host "`n🎉 Setup Complete!" -ForegroundColor Green
Write-Host "Configuration saved to: azure-config.env" -ForegroundColor Yellow
Write-Host "`nResource Names:" -ForegroundColor White
Write-Host "  Database: $DB_NAME" -ForegroundColor Gray
Write-Host "  Storage: $STORAGE_NAME" -ForegroundColor Gray
Write-Host "  Registry: $ACR_NAME" -ForegroundColor Gray
Write-Host "  Key Vault: $KEYVAULT_NAME" -ForegroundColor Gray

Write-Host "`n⚠️ SAVE THIS PASSWORD: $DB_PASSWORD" -ForegroundColor Red

Write-Host "`n🔗 Useful URLs:" -ForegroundColor White
Write-Host "  Portal: https://portal.azure.com" -ForegroundColor Blue
Write-Host "  Resource Group: https://portal.azure.com/#@/resource/subscriptions/$(az account show --query id -o tsv)/resourceGroups/$RESOURCE_GROUP" -ForegroundColor Blue