# Deploy frontend using the correct GitHub repository
Write-Host "Setting up GitHub deployment for Static Web Apps..." -ForegroundColor Green

$RESOURCE_GROUP = "unitedwerise-rg"
$APP_NAME = "unitedwerise-frontend"
$LOCATION = "eastus"
$REPO_URL = "https://github.com/UnitedWeRise-org/UnitedWeRise"

Write-Host "Repository: $REPO_URL" -ForegroundColor Cyan
Write-Host "Creating Static Web App with GitHub integration..." -ForegroundColor Cyan

# Create Static Web App with GitHub repo
az staticwebapp create `
    --name $APP_NAME `
    --resource-group $RESOURCE_GROUP `
    --location $LOCATION `
    --source $REPO_URL `
    --branch "main" `
    --app-location "/frontend" `
    --output-location "/" `
    --login-with-github

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "SUCCESS! GitHub Actions deployment configured!" -ForegroundColor Green
    Write-Host "===========================================" -ForegroundColor Green
    
    # Get the URL
    $APP_URL = az staticwebapp show --name $APP_NAME --resource-group $RESOURCE_GROUP --query defaultHostname -o tsv
    
    Write-Host "Frontend URL: https://$APP_URL" -ForegroundColor White
    Write-Host "GitHub Repo: $REPO_URL" -ForegroundColor White
    Write-Host ""
    Write-Host "GitHub Actions will automatically deploy when you push to main branch!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Ready to commit your backend URL changes and deploy!" -ForegroundColor Cyan
    
} else {
    Write-Host "GitHub integration requires manual setup. Let's use Azure Portal approach." -ForegroundColor Yellow
}