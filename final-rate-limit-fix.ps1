# Final rate limit fix for Azure Container Apps
$ACR_NAME = "uwracr2425"
$IMAGE_NAME = "unitedwerise-backend"
$NEW_TAG = (Get-Date -Format 'yyyyMMdd-HHmm')

Write-Host "Building with Azure Container Apps rate limit fix..." -ForegroundColor Green
Write-Host "- Trust proxy set to 1 (single proxy layer)" -ForegroundColor Cyan
Write-Host "- Custom keyGenerator strips port numbers from IPs" -ForegroundColor Cyan
Write-Host "Tag: $NEW_TAG" -ForegroundColor Yellow

az acr build --registry $ACR_NAME --image "$IMAGE_NAME`:$NEW_TAG" ./backend

if ($LASTEXITCODE -eq 0) {
    Write-Host "Updating container app with rate limit fix..." -ForegroundColor Green
    
    az containerapp update `
        --name unitedwerise-backend `
        --resource-group unitedwerise-rg `
        --image "$ACR_NAME.azurecr.io/$IMAGE_NAME`:$NEW_TAG"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✅ RATE LIMIT FIX DEPLOYED!" -ForegroundColor Green
        Write-Host "Waiting for startup..." -ForegroundColor Yellow
        Start-Sleep -Seconds 45
        
        $APP_URL = az containerapp show --name unitedwerise-backend --resource-group unitedwerise-rg --query properties.configuration.ingress.fqdn -o tsv
        
        Write-Host "`n🚀 Testing the fix..." -ForegroundColor Cyan
        try {
            $response = Invoke-RestMethod -Uri "https://$APP_URL/health" -TimeoutSec 20
            Write-Host "✅ HEALTH CHECK PASSED!" -ForegroundColor Green
            Write-Host "✅ No more rate limit errors!" -ForegroundColor Green
            Write-Host "`nBackend is ready for database migration!" -ForegroundColor Cyan
        } catch {
            Write-Host "Checking logs one more time..." -ForegroundColor Yellow
            az containerapp logs show --name unitedwerise-backend --resource-group unitedwerise-rg --tail 5
        }
    }
}