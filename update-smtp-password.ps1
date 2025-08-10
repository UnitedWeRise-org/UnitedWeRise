# Script to update SMTP password in Azure
# Replace YOUR_NEW_APP_PASSWORD with the 16-character password you generate

$NEW_PASSWORD = "YOUR_NEW_APP_PASSWORD"  # Replace this!

# Update Azure Container App
az containerapp update `
  --name unitedwerise-backend `
  --resource-group unitedwerise-rg `
  --set-env-vars SMTP_PASS="$NEW_PASSWORD"

Write-Host "SMTP Password updated in Azure!"
Write-Host "Don't forget to also update backend/.env for local testing"