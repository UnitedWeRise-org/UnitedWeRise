# Deploy frontend using GitHub integration
Write-Host "Setting up GitHub deployment for Static Web Apps..." -ForegroundColor Green

$RESOURCE_GROUP = "unitedwerise-rg"
$APP_NAME = "unitedwerise-frontend"
$LOCATION = "eastus"

# You'll need to provide these
Write-Host "We need your GitHub repository information:" -ForegroundColor Cyan
$GITHUB_USER = Read-Host "Enter your GitHub username"
$GITHUB_REPO = Read-Host "Enter your repository name (e.g., UnitedWeRise-Dev)"

$REPO_URL = "https://github.com/${GITHUB_USER}/${GITHUB_REPO}"

Write-Host ""
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
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Commit and push your changes to trigger deployment" -ForegroundColor Yellow
    Write-Host "2. Check GitHub Actions tab for deployment status" -ForegroundColor Yellow
    Write-Host "3. Frontend will be live at: https://$APP_URL" -ForegroundColor Yellow
    
} else {
    Write-Host "GitHub integration failed. This might need manual setup in Azure Portal." -ForegroundColor Red
    Write-Host ""
    Write-Host "Alternative: Set up manually in Azure Portal:" -ForegroundColor Cyan
    Write-Host "1. Go to Static Web Apps in Azure Portal" -ForegroundColor Yellow
    Write-Host "2. Click 'Create'" -ForegroundColor Yellow
    Write-Host "3. Connect to your GitHub repo: $REPO_URL" -ForegroundColor Yellow
    Write-Host "4. Set app location to: /frontend" -ForegroundColor Yellow
    Write-Host "5. Set output location to: /" -ForegroundColor Yellow
}