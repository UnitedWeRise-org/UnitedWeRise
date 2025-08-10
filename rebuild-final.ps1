# Final rebuild with express-rate-limit trust proxy fix
$ACR_NAME = "uwracr2425"
$IMAGE_NAME = "unitedwerise-backend"
$NEW_TAG = (Get-Date -Format 'yyyyMMdd-HHmm')

Write-Host "Building final image with express-rate-limit trust proxy fix..." -ForegroundColor Green
Write-Host "Tag: $NEW_TAG" -ForegroundColor Cyan

az acr build --registry $ACR_NAME --image "$IMAGE_NAME`:$NEW_TAG" ./backend

if ($LASTEXITCODE -eq 0) {
    Write-Host "Build successful! Updating container app..." -ForegroundColor Green
    
    az containerapp update `
        --name unitedwerise-backend `
        --resource-group unitedwerise-rg `
        --image "$ACR_NAME.azurecr.io/$IMAGE_NAME`:$NEW_TAG"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Final deployment successful!" -ForegroundColor Green
        Write-Host "Waiting for startup..." -ForegroundColor Yellow
        Start-Sleep -Seconds 45
        
        $APP_URL = az containerapp show --name unitedwerise-backend --resource-group unitedwerise-rg --query properties.configuration.ingress.fqdn -o tsv
        
        Write-Host "`n===========================================" -ForegroundColor Green
        Write-Host "BACKEND DEPLOYMENT COMPLETE!" -ForegroundColor Green
        Write-Host "===========================================" -ForegroundColor Green
        Write-Host "Backend URL: https://$APP_URL" -ForegroundColor White
        Write-Host "Health Check: https://$APP_URL/health" -ForegroundColor White
        
        try {
            $response = Invoke-RestMethod -Uri "https://$APP_URL/health" -TimeoutSec 20
            Write-Host "✅ Health check passed!" -ForegroundColor Green
            Write-Host "✅ Trust proxy issues resolved!" -ForegroundColor Green
            Write-Host "🚀 Ready for database migration!" -ForegroundColor Cyan
        } catch {
            Write-Host "Checking final logs..." -ForegroundColor Yellow
            az containerapp logs show --name unitedwerise-backend --resource-group unitedwerise-rg --tail 8
        }
    }
}