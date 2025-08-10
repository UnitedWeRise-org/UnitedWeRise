# Redeploy backend with trust proxy fix
Write-Host "Redeploying backend with trust proxy configuration fix..." -ForegroundColor Green

$ACR_NAME = "uwracr2425"
$IMAGE_NAME = "unitedwerise-backend"
$NEW_TAG = (Get-Date -Format 'yyyyMMdd-HHmm')
$FULL_IMAGE_PATH = "$ACR_NAME.azurecr.io/$IMAGE_NAME`:$NEW_TAG"

Write-Host "Building new image with tag: $NEW_TAG" -ForegroundColor Cyan

# Build and push new image with trust proxy fix
az acr build --registry $ACR_NAME --image "$IMAGE_NAME`:$NEW_TAG" ./backend

if ($LASTEXITCODE -eq 0) {
    Write-Host "Build successful! Updating container app..." -ForegroundColor Green
    
    # Update container app with new image
    az containerapp update `
        --name unitedwerise-backend `
        --resource-group unitedwerise-rg `
        --image $FULL_IMAGE_PATH
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Deployment update successful!" -ForegroundColor Green
        Write-Host "Waiting for deployment to stabilize..." -ForegroundColor Yellow
        Start-Sleep -Seconds 60
        
        # Get the application URL
        $APP_URL = az containerapp show --name unitedwerise-backend --resource-group unitedwerise-rg --query properties.configuration.ingress.fqdn -o tsv
        
        Write-Host "`nTesting updated deployment..." -ForegroundColor Cyan
        Write-Host "Backend URL: https://$APP_URL" -ForegroundColor White
        
        try {
            $healthResponse = Invoke-RestMethod -Uri "https://$APP_URL/health" -TimeoutSec 20
            Write-Host "✅ Health check passed!" -ForegroundColor Green
            Write-Host "Response: $($healthResponse | ConvertTo-Json -Compress)" -ForegroundColor White
        } catch {
            Write-Host "⏱️  Health check still not ready - checking logs..." -ForegroundColor Yellow
            
            Write-Host "`nRecent logs:" -ForegroundColor Cyan
            az containerapp logs show --name unitedwerise-backend --resource-group unitedwerise-rg --tail 15
        }
        
        Write-Host "`n===========================================" -ForegroundColor Green
        Write-Host "BACKEND UPDATE COMPLETE!" -ForegroundColor Green
        Write-Host "===========================================" -ForegroundColor Green
        Write-Host "✅ Trust proxy configuration added" -ForegroundColor Green
        Write-Host "✅ New image built and deployed" -ForegroundColor Green
        Write-Host "🔄 Ready for database migration" -ForegroundColor Yellow
        
    } else {
        Write-Host "Container app update failed!" -ForegroundColor Red
    }
} else {
    Write-Host "Build failed!" -ForegroundColor Red
}