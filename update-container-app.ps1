# Update container app with new image
$IMAGE = "uwracr2425.azurecr.io/unitedwerise-backend:20250808-1220"

Write-Host "Updating container app with image: $IMAGE" -ForegroundColor Cyan

az containerapp update `
    --name unitedwerise-backend `
    --resource-group unitedwerise-rg `
    --image $IMAGE

if ($LASTEXITCODE -eq 0) {
    Write-Host "Container app updated successfully!" -ForegroundColor Green
    
    # Wait for deployment
    Write-Host "Waiting for deployment to complete..." -ForegroundColor Yellow
    Start-Sleep -Seconds 60
    
    # Get app URL and test
    $APP_URL = az containerapp show --name unitedwerise-backend --resource-group unitedwerise-rg --query properties.configuration.ingress.fqdn -o tsv
    Write-Host "Testing deployment at: https://$APP_URL/health" -ForegroundColor Cyan
    
    try {
        $response = Invoke-RestMethod -Uri "https://$APP_URL/health" -TimeoutSec 20
        Write-Host "✅ Deployment successful!" -ForegroundColor Green
        Write-Host "Trust proxy fix applied!" -ForegroundColor Green
    } catch {
        Write-Host "Checking logs..." -ForegroundColor Yellow
        az containerapp logs show --name unitedwerise-backend --resource-group unitedwerise-rg --tail 10
    }
} else {
    Write-Host "Update failed!" -ForegroundColor Red
}