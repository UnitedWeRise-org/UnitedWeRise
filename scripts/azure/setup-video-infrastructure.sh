#!/bin/bash
# Azure Video Infrastructure Setup Script
# UnitedWeRise Short-Form Video Feature
#
# Prerequisites:
# - Azure CLI installed and authenticated (az login)
# - Correct subscription selected (az account set --subscription <id>)
#
# Usage: ./setup-video-infrastructure.sh [staging|production]

set -e

ENVIRONMENT=${1:-staging}
RESOURCE_GROUP="unitedwerise-rg"
LOCATION="eastus"
STORAGE_ACCOUNT="uwrstorage2425"

echo "====================================="
echo "UnitedWeRise Video Infrastructure Setup"
echo "Environment: $ENVIRONMENT"
echo "Resource Group: $RESOURCE_GROUP"
echo "====================================="

# ========================================
# 1. Create Blob Storage Containers
# ========================================
echo ""
echo "Step 1: Creating blob storage containers..."

# Videos - Raw uploads (private, for re-encoding)
az storage container create \
  --name "videos-raw" \
  --account-name $STORAGE_ACCOUNT \
  --public-access off \
  --auth-mode login

# Videos - Encoded outputs (public for streaming)
az storage container create \
  --name "videos-encoded" \
  --account-name $STORAGE_ACCOUNT \
  --public-access blob \
  --auth-mode login

# Videos - Thumbnails (public)
az storage container create \
  --name "videos-thumbnails" \
  --account-name $STORAGE_ACCOUNT \
  --public-access blob \
  --auth-mode login

echo "Blob containers created successfully."

# ========================================
# 2. Set CORS Policy for Containers
# ========================================
echo ""
echo "Step 2: Setting CORS policy..."

az storage cors add \
  --account-name $STORAGE_ACCOUNT \
  --services b \
  --methods GET HEAD OPTIONS \
  --origins "https://www.unitedwerise.org" "https://dev.unitedwerise.org" "http://localhost:8080" \
  --allowed-headers "*" \
  --exposed-headers "*" \
  --max-age 3600 \
  --auth-mode login

echo "CORS policy configured."

# ========================================
# 3. Create Azure Media Services Account
# ========================================
echo ""
echo "Step 3: Creating Azure Media Services account..."

MEDIA_SERVICES_NAME="unitedweriseams"

# Check if Media Services account already exists
if az ams account show --name $MEDIA_SERVICES_NAME --resource-group $RESOURCE_GROUP &>/dev/null; then
  echo "Media Services account already exists."
else
  az ams account create \
    --name $MEDIA_SERVICES_NAME \
    --resource-group $RESOURCE_GROUP \
    --location $LOCATION \
    --storage-account $STORAGE_ACCOUNT

  echo "Media Services account created."
fi

# ========================================
# 4. Create Encoding Transform
# ========================================
echo ""
echo "Step 4: Creating encoding transform..."

# Create adaptive streaming transform with multiple bitrates
az ams transform create \
  --name "VideoEncodingTransform" \
  --resource-group $RESOURCE_GROUP \
  --account-name $MEDIA_SERVICES_NAME \
  --preset "AdaptiveStreaming" \
  --description "Adaptive bitrate encoding for short-form videos" \
  2>/dev/null || echo "Transform already exists or created."

echo "Encoding transform configured."

# ========================================
# 5. Create Streaming Endpoint
# ========================================
echo ""
echo "Step 5: Configuring streaming endpoint..."

# Check and start default streaming endpoint
az ams streaming-endpoint start \
  --name "default" \
  --resource-group $RESOURCE_GROUP \
  --account-name $MEDIA_SERVICES_NAME \
  2>/dev/null || echo "Streaming endpoint already running."

echo "Streaming endpoint configured."

# ========================================
# 6. Create CDN Profile and Endpoint
# ========================================
echo ""
echo "Step 6: Creating CDN profile..."

CDN_PROFILE_NAME="unitedwerise-video-cdn"
CDN_ENDPOINT_NAME="uwrvideos"

# Create CDN profile if not exists
if az cdn profile show --name $CDN_PROFILE_NAME --resource-group $RESOURCE_GROUP &>/dev/null; then
  echo "CDN profile already exists."
else
  az cdn profile create \
    --name $CDN_PROFILE_NAME \
    --resource-group $RESOURCE_GROUP \
    --location $LOCATION \
    --sku Standard_Microsoft

  echo "CDN profile created."
fi

# Create CDN endpoint pointing to videos-encoded container
if az cdn endpoint show --name $CDN_ENDPOINT_NAME --profile-name $CDN_PROFILE_NAME --resource-group $RESOURCE_GROUP &>/dev/null; then
  echo "CDN endpoint already exists."
else
  az cdn endpoint create \
    --name $CDN_ENDPOINT_NAME \
    --profile-name $CDN_PROFILE_NAME \
    --resource-group $RESOURCE_GROUP \
    --origin "$STORAGE_ACCOUNT.blob.core.windows.net" \
    --origin-host-header "$STORAGE_ACCOUNT.blob.core.windows.net" \
    --origin-path "/videos-encoded" \
    --enable-compression true \
    --content-types-to-compress "application/vnd.apple.mpegurl" "video/mp4"

  echo "CDN endpoint created."
fi

echo "CDN configured."

# ========================================
# 7. Output Configuration
# ========================================
echo ""
echo "====================================="
echo "Setup Complete!"
echo "====================================="
echo ""
echo "Add these to your .env file:"
echo ""
echo "# Video Infrastructure"
echo "AZURE_MEDIA_SERVICES_ACCOUNT_NAME=$MEDIA_SERVICES_NAME"
echo "AZURE_MEDIA_SERVICES_RESOURCE_GROUP=$RESOURCE_GROUP"
echo "AZURE_CDN_ENDPOINT=https://$CDN_ENDPOINT_NAME.azureedge.net"
echo "VIDEO_MAX_DURATION_SECONDS=180"
echo "VIDEO_MAX_SIZE_BYTES=524288000"
echo ""
echo "Get subscription ID with:"
echo "az account show --query id -o tsv"
