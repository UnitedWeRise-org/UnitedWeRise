# Fix GitHub Actions Azure Authentication (PERMANENT)

## What This Fixes

Your GitHub Actions workflows are failing with:
```
Login failed with Error: Using auth-type: SERVICE_PRINCIPAL. Not all values are present.
```

This is because the workflow expects a `AZURE_CREDENTIALS` secret that doesn't exist.

**Solution:** Switch from legacy service principal authentication to modern OIDC (OpenID Connect) authentication.

---

## Benefits of OIDC

✅ **No passwords stored** - GitHub gets temporary tokens from Azure
✅ **More secure** - Tokens expire automatically
✅ **Azure best practice** - Recommended by Microsoft
✅ **Easier management** - No credential rotation needed

---

## Step-by-Step Fix

### Step 1: Run the Setup Script

This creates an Azure App Registration with federated credentials for GitHub Actions:

```bash
bash setup-github-azure-auth.sh
```

**What it does:**
1. Creates Azure AD app registration: `github-actions-unitedwerise`
2. Creates service principal
3. Assigns Contributor role to `unitedwerise-rg` resource group
4. Creates federated credentials for `development` and `main` branches
5. Outputs the 3 secrets you need to add to GitHub

**Expected output:**
```
✅ Azure Setup Complete!

📝 Now add these secrets to your GitHub repository:

Secret Name: AZURE_CLIENT_ID
Value: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

Secret Name: AZURE_TENANT_ID
Value: c3418fd6-1a5a-48f6-9600-4ca53d952dc1

Secret Name: AZURE_SUBSCRIPTION_ID
Value: f71adbbe-4225-40e8-bb8a-9ae87086477f
```

---

### Step 2: Add GitHub Secrets

1. **Go to:** https://github.com/UnitedWeRise-org/UnitedWeRise/settings/secrets/actions

2. **Click:** "New repository secret"

3. **Add each secret:**

   | Name | Value (from script output) |
   |------|---------------------------|
   | `AZURE_CLIENT_ID` | Copy from script output |
   | `AZURE_TENANT_ID` | Copy from script output |
   | `AZURE_SUBSCRIPTION_ID` | Copy from script output |

4. **Verify:** You should see 3 secrets listed in GitHub

---

### Step 3: Commit Workflow Changes

The workflows have been updated to use OIDC authentication:

```bash
git add .github/workflows/backend-staging-autodeploy.yml
git add .github/workflows/backend-production-autodeploy.yml
git add setup-github-azure-auth.sh
git add FIX-GITHUB-ACTIONS-AUTH.md

git commit -m "fix: Switch GitHub Actions to OIDC authentication

- Update workflows to use azure/login@v2 with OIDC
- Remove dependency on AZURE_CREDENTIALS secret
- Add setup script for Azure app registration
- Fixes deployment authentication failures

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

git push origin development
```

---

### Step 4: Test the Deployment

After pushing, GitHub Actions will automatically trigger:

1. **Monitor:** https://github.com/UnitedWeRise-org/UnitedWeRise/actions

2. **Should see:** ✅ Green checkmark on "Backend Auto-Deploy to Staging"

3. **Verify deployment:**
   ```bash
   # Wait 5 minutes, then check:
   curl -s https://dev-api.unitedwerise.org/health | grep releaseSha
   # Should show: "releaseSha":"bf13e0b"
   ```

---

## What Changed in Workflows

### Before (Failed):
```yaml
- name: Azure Login
  uses: azure/login@v1
  with:
    creds: ${{ secrets.AZURE_CREDENTIALS }}  # Secret doesn't exist
```

### After (Works):
```yaml
permissions:
  id-token: write
  contents: read

- name: Azure Login (OIDC)
  uses: azure/login@v2
  with:
    client-id: ${{ secrets.AZURE_CLIENT_ID }}
    tenant-id: ${{ secrets.AZURE_TENANT_ID }}
    subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
```

---

## Troubleshooting

### If setup script fails:

**Error:** "App already exists"
```bash
# Delete existing app and try again:
APP_ID=$(az ad app list --display-name "github-actions-unitedwerise" --query "[0].appId" -o tsv)
az ad app delete --id $APP_ID
bash setup-github-azure-auth.sh
```

**Error:** "Insufficient privileges"
- You need Azure AD admin permissions to create app registrations
- Ask someone with admin rights to run the setup script

### If GitHub Actions still fails:

**Error:** "Failed to login: AADSTS70021: No matching federated identity record found"
- Double-check the GitHub secrets are added correctly
- Make sure secret names match exactly: `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`
- Verify you're pushing to the `development` branch (federated credential is branch-specific)

**Error:** "The client does not have authorization to perform action"
- The service principal needs Contributor role on the resource group
- Run: `az role assignment create --assignee <APP_ID> --role "Contributor" --scope "/subscriptions/f71adbbe-4225-40e8-bb8a-9ae87086477f/resourceGroups/unitedwerise-rg"`

---

## Verify Everything Works

After successful setup, you should see:

1. ✅ Azure App Registration: `github-actions-unitedwerise` exists
2. ✅ Federated credentials for `development` and `main` branches
3. ✅ 3 GitHub secrets configured
4. ✅ GitHub Actions deployment succeeds
5. ✅ Staging backend shows new commit hash

---

## Security Notes

**OIDC is more secure because:**
- No long-lived credentials stored in GitHub
- Tokens expire after 1 hour
- GitHub can only request tokens for specific branches/environments
- Azure validates the GitHub identity on every request

**Permissions granted:**
- Service principal has Contributor role on `unitedwerise-rg` resource group only
- Can deploy to Container Apps, ACR, but can't modify other resources
- Can't access other subscriptions or resource groups

---

## This Fixes Going Forward

Once set up, this authentication will:
- ✅ Work for all future deployments to `development` and `main`
- ✅ Not require any maintenance or credential rotation
- ✅ Continue working even if you change Azure passwords
- ✅ Allow secure deployments without storing secrets

**This is a one-time setup that permanently fixes the authentication issue.**
