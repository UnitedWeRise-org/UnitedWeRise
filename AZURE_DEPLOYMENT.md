# United We Rise - Azure Deployment Guide

## Current Status
🟢 **LIVE AND OPERATIONAL** - Platform successfully deployed to Azure  
- **Deployment Date**: August 8, 2025  
- **Frontend**: www.unitedwerise.org  
- **Backend**: Healthy and responding  
- **Database**: Connected and migrated  
- **Next**: User registration testing  

## Overview

This document provides a complete guide for deploying the United We Rise platform to Microsoft Azure using Container Apps, Static Web Apps, and PostgreSQL.

## Architecture

- **Frontend**: Azure Static Web Apps with GitHub Actions deployment
- **Backend**: Azure Container Apps with Docker
- **Database**: Azure Database for PostgreSQL Flexible Server
- **Storage**: Azure Storage Account for file uploads
- **Registry**: Azure Container Registry for Docker images
- **Security**: Azure Key Vault for secrets management
- **Monitoring**: Azure Application Insights

## Prerequisites

- Azure CLI installed and logged in
- GitHub repository with United We Rise codebase
- Domain name (optional for custom domain)

## Deployment Steps

### 1. Azure Infrastructure Setup

Create resource group and core infrastructure:

```powershell
# Variables
$RESOURCE_GROUP = "unitedwerise-rg"
$LOCATION = "eastus"

# Create resource group
az group create --name $RESOURCE_GROUP --location $LOCATION

# Create storage account
az storage account create --name uwrstorage2425 --resource-group $RESOURCE_GROUP --location $LOCATION --sku Standard_LRS

# Create container registry  
az acr create --name uwracr2425 --resource-group $RESOURCE_GROUP --sku Basic --admin-enabled true

# Create PostgreSQL server
az postgres flexible-server create --name unitedwerise-db --resource-group $RESOURCE_GROUP --location $LOCATION --admin-user uwradmin --admin-password "UWR-Secure2024!" --sku-name Standard_B1ms --tier Burstable --storage-size 32

# Create Key Vault
az keyvault create --name uwrkeyvault2425 --resource-group $RESOURCE_GROUP --location $LOCATION

# Create Application Insights
az monitor app-insights component create --app unitedwerise-insights --location $LOCATION --resource-group $RESOURCE_GROUP

# Create Container Apps environment
az containerapp env create --name unitedwerise-env --resource-group $RESOURCE_GROUP --location $LOCATION
```

### 2. Backend Deployment

Build and deploy the Node.js backend:

```powershell
# Build and push Docker image
az acr build --registry uwracr2425 --image unitedwerise-backend:latest ./backend

# Deploy to Container Apps
az containerapp create \
    --name unitedwerise-backend \
    --resource-group $RESOURCE_GROUP \
    --environment unitedwerise-env \
    --image uwracr2425.azurecr.io/unitedwerise-backend:latest \
    --target-port 3001 \
    --ingress external \
    --min-replicas 1 \
    --max-replicas 3 \
    --cpu 0.5 \
    --memory 1Gi \
    --env-vars \
        "NODE_ENV=production" \
        "PORT=3001" \
        "DATABASE_URL=postgresql://uwradmin:UWR-Secure2024!@unitedwerise-db.postgres.database.azure.com:5432/postgres?schema=public&sslmode=require" \
        "JWT_SECRET=UWR-JWT-Secret-123456-20250808"
```

### 3. Database Migration

Run Prisma migrations in the deployed container:

```powershell
az containerapp exec --name unitedwerise-backend --resource-group $RESOURCE_GROUP --command "npx prisma migrate deploy"
```

### 4. Frontend Deployment

Deploy the frontend using Azure Static Web Apps:

1. Go to Azure Portal → Static Web Apps → Create
2. Configure:
   - **Resource Group**: unitedwerise-rg
   - **Name**: unitedwerise-frontend
   - **Region**: Global
   - **Deployment source**: GitHub
   - **Repository**: UnitedWeRise-org/UnitedWeRise
   - **Branch**: main
   - **App location**: `/frontend`
   - **Output location**: `/`

### 5. Custom Domain Setup

Configure custom domain (if you own one):

1. **Add custom domain** in Static Web App settings
2. **Configure DNS records** in your domain registrar:
   ```
   CNAME: www → [static-web-app-url]
   URL Redirect: @ → https://www.[yourdomain].org (301 permanent)
   ```

## Configuration

### Environment Variables

Set these in your Container App:

```bash
# Core
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://uwradmin:UWR-Secure2024!@unitedwerise-db.postgres.database.azure.com:5432/postgres?schema=public&sslmode=require
JWT_SECRET=your-jwt-secret

# Optional - AI Services
HUGGINGFACE_API_KEY=your-key
QWEN3_API_URL=your-endpoint
GOOGLE_CIVIC_API_KEY=your-key
```

### Frontend API Configuration

Update `frontend/src/integrations/backend-integration.js`:

```javascript
this.API_BASE = 'https://unitedwerise-backend.wonderfulpond-f8a8271f.eastus.azurecontainerapps.io/api';
```

## Monitoring & Management

### Health Checks

- **Backend Health**: `https://unitedwerise-backend.[...].azurecontainerapps.io/health`
- **API Status**: `https://unitedwerise-backend.[...].azurecontainerapps.io/api/elections?state=CA`

### Logs

```powershell
# View container logs
az containerapp logs show --name unitedwerise-backend --resource-group unitedwerise-rg --follow

# View Static Web App deployment logs
az staticwebapp show --name unitedwerise-frontend --resource-group unitedwerise-rg
```

### Scaling

```powershell
# Scale backend replicas
az containerapp update --name unitedwerise-backend --resource-group unitedwerise-rg --min-replicas 2 --max-replicas 10

# Update resources
az containerapp update --name unitedwerise-backend --resource-group unitedwerise-rg --cpu 1.0 --memory 2Gi
```

## Security Considerations

### Network Security
- Container Apps use HTTPS-only ingress
- Database requires SSL connections
- Private endpoints can be configured for enhanced security

### Rate Limiting
- Implemented at application level using express-rate-limit
- Configured for Azure Container Apps proxy with custom key generator
- Different limits for authentication, posting, and general API access

### Secret Management
- Database credentials in environment variables
- Consider moving to Azure Key Vault for production secrets
- JWT secrets should be rotated regularly

## Cost Optimization

### Container Apps
- Use consumption-based pricing
- Configure min/max replicas based on traffic
- Monitor CPU and memory usage

### Database
- Start with Burstable tier (Standard_B1ms)
- Scale up based on performance needs
- Enable connection pooling in application

### Static Web Apps
- Global CDN included
- Pay only for bandwidth and functions (if used)

## Troubleshooting

### Common Issues

**Backend not connecting to database:**
```powershell
# Check environment variables
az containerapp show --name unitedwerise-backend --resource-group unitedwerise-rg --query properties.template.containers[0].env

# Test database connection
az postgres flexible-server connect --name unitedwerise-db --admin-user uwradmin
```

**Rate limit errors:**
- Ensure trust proxy is set to `1` for single proxy layer
- Use custom keyGenerator to strip port numbers from IPs

**Frontend not loading:**
- Check GitHub Actions deployment status
- Verify build configuration in Static Web App

### Performance Monitoring

Use Application Insights for:
- Request tracing
- Performance metrics
- Error logging
- Custom telemetry

## Production Checklist

- [x] Environment variables configured
- [x] Database migrations completed  
- [x] Custom domain configured with SSL
- [x] GitHub Actions deployment pipeline
- [x] hCaptcha configured for production
- [x] Rate limiting configured for Azure Container Apps
- [x] Database connectivity verified
- [x] Documentation updated
- [ ] User registration flow tested
- [ ] Monitoring and alerts set up
- [ ] Backup strategy implemented
- [ ] Security review completed
- [ ] Load testing performed

## Deployment URLs

### Live Environment
- **Frontend**: https://www.unitedwerise.org ✅ LIVE
- **Backend API**: https://unitedwerise-backend.wonderfulpond-f8a8271f.eastus.azurecontainerapps.io/api ✅ OPERATIONAL
- **Health Check**: https://unitedwerise-backend.wonderfulpond-f8a8271f.eastus.azurecontainerapps.io/health ✅ HEALTHY
- **Static Web App**: https://delightful-grass-04dddd70f.1.azurestaticapps.net ✅ LIVE

### Development
- **Local Backend**: http://localhost:3001
- **Local Frontend**: Open `frontend/index.html` in browser

## Support

For deployment issues:
1. Check Azure Portal for service status
2. Review Container Apps logs
3. Verify GitHub Actions deployment status
4. Test individual components (database, backend, frontend)

---

*Last updated: August 8, 2025*
*Deployment completed successfully to Azure Container Apps and Static Web Apps*