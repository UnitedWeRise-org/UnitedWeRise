#!/bin/bash

# Setup GitHub Actions OIDC Authentication with Azure
# This script creates an Azure App Registration with federated credentials for GitHub Actions

set -e

echo "🔐 Setting up GitHub Actions OIDC Authentication with Azure"
echo "============================================================"
echo ""

# Configuration
SUBSCRIPTION_ID="f71adbbe-4225-40e8-bb8a-9ae87086477f"
TENANT_ID="c3418fd6-1a5a-48f6-9600-4ca53d952dc1"
RESOURCE_GROUP="unitedwerise-rg"
APP_NAME="github-actions-unitedwerise"
GITHUB_ORG="UnitedWeRise-org"
GITHUB_REPO="UnitedWeRise"

echo "📋 Configuration:"
echo "  Subscription: $SUBSCRIPTION_ID"
echo "  Tenant: $TENANT_ID"
echo "  Resource Group: $RESOURCE_GROUP"
echo "  App Name: $APP_NAME"
echo "  GitHub: $GITHUB_ORG/$GITHUB_REPO"
echo ""

# Step 1: Create Azure AD App Registration
echo "Step 1: Creating Azure AD App Registration..."
APP_ID=$(az ad app create --display-name "$APP_NAME" --query appId -o tsv)

if [ -z "$APP_ID" ]; then
    echo "❌ Failed to create app registration"
    exit 1
fi

echo "✅ App created: $APP_ID"
echo ""

# Step 2: Create Service Principal
echo "Step 2: Creating Service Principal..."
az ad sp create --id "$APP_ID" > /dev/null
echo "✅ Service Principal created"
echo ""

# Step 3: Assign Contributor role to resource group
echo "Step 3: Assigning Contributor role..."
az role assignment create \
    --assignee "$APP_ID" \
    --role "Contributor" \
    --scope "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP" \
    > /dev/null

echo "✅ Contributor role assigned to resource group: $RESOURCE_GROUP"
echo ""

# Step 4: Create federated credential for development branch
echo "Step 4: Creating federated credential for development branch..."
cat > federated-cred-dev.json <<EOF
{
  "name": "github-actions-development",
  "issuer": "https://token.actions.githubusercontent.com",
  "subject": "repo:${GITHUB_ORG}/${GITHUB_REPO}:ref:refs/heads/development",
  "description": "GitHub Actions deployment from development branch",
  "audiences": [
    "api://AzureADTokenExchange"
  ]
}
EOF

az ad app federated-credential create \
    --id "$APP_ID" \
    --parameters @federated-cred-dev.json

echo "✅ Federated credential created for development branch"
echo ""

# Step 5: Create federated credential for main branch
echo "Step 5: Creating federated credential for main branch..."
cat > federated-cred-main.json <<EOF
{
  "name": "github-actions-main",
  "issuer": "https://token.actions.githubusercontent.com",
  "subject": "repo:${GITHUB_ORG}/${GITHUB_REPO}:ref:refs/heads/main",
  "description": "GitHub Actions deployment from main branch",
  "audiences": [
    "api://AzureADTokenExchange"
  ]
}
EOF

az ad app federated-credential create \
    --id "$APP_ID" \
    --parameters @federated-cred-main.json

echo "✅ Federated credential created for main branch"
echo ""

# Cleanup temp files
rm federated-cred-dev.json federated-cred-main.json

# Step 6: Display GitHub Secrets to add
echo "============================================================"
echo "✅ Azure Setup Complete!"
echo "============================================================"
echo ""
echo "📝 Now add these secrets to your GitHub repository:"
echo ""
echo "1. Go to: https://github.com/$GITHUB_ORG/$GITHUB_REPO/settings/secrets/actions"
echo ""
echo "2. Click 'New repository secret' and add these 3 secrets:"
echo ""
echo "   Secret Name: AZURE_CLIENT_ID"
echo "   Value: $APP_ID"
echo ""
echo "   Secret Name: AZURE_TENANT_ID"
echo "   Value: $TENANT_ID"
echo ""
echo "   Secret Name: AZURE_SUBSCRIPTION_ID"
echo "   Value: $SUBSCRIPTION_ID"
echo ""
echo "============================================================"
echo ""
echo "After adding the secrets, your GitHub Actions workflows will"
echo "automatically authenticate with Azure using OIDC (no passwords!)."
echo ""
echo "🎉 Setup complete! Push your changes to test the deployment."
