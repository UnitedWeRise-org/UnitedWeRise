# Fix Automated GitHub Actions Deployments

**Current Status:** ⚠️ Manual deployments work, GitHub Actions fails
**Issue:** Azure role assignment not completing due to subscription context error
**Impact:** You need to ask me (or manually deploy) each time you push to development/main

---

## 🎯 GOAL

Enable GitHub Actions to automatically deploy when you push to:
- `development` branch → Staging (dev-api.unitedwerise.org)
- `main` branch → Production (api.unitedwerise.org)

---

## 📋 WHAT'S ALREADY DONE

✅ **Azure App Registration created:** `github-actions-unitedwerise`
✅ **Client ID:** `d62caad0-7945-43a4-8576-edba1c7589b1`
✅ **Federated credentials configured** for development and main branches
✅ **GitHub Secrets added:**
   - AZURE_CLIENT_ID
   - AZURE_TENANT_ID
   - AZURE_SUBSCRIPTION_ID
✅ **Workflows updated** to use OIDC authentication

---

## ❌ WHAT'S MISSING

**The service principal needs "Contributor" role** on the `unitedwerise-rg` resource group.

**Why it's failing:**
- Azure CLI has subscription context issues
- Azure Portal sign-in shows tenant mismatch
- Role assignment command keeps returning: `MissingSubscription` error

---

## 🛠️ SOLUTION OPTIONS

### Option 1: Azure Portal (Easiest - 5 minutes)

**You need to sign in with the correct Azure account.**

**Current Issue:** When you tried to sign in to Azure Portal, you got:
```
Error: User account does not exist in tenant 'People United for Peaceful Revolution'
```

**This means you're signed into Azure Portal with a different Microsoft account.**

**Fix:**
1. Go to https://portal.azure.com
2. Click your profile picture (top right)
3. Click "Sign out"
4. Sign back in with: **Jeffrey@peacefulrevolutions.onmicrosoft.com**
5. Once signed in, follow these steps:

#### Steps in Azure Portal:

1. **Navigate to Resource Group:**
   - Search bar: Type `unitedwerise-rg`
   - Click on the resource group

2. **Access Control (IAM):**
   - Left sidebar: Click **"Access control (IAM)"**

3. **Add Role Assignment:**
   - Top bar: Click **"+ Add"** → **"Add role assignment"**

4. **Select Contributor Role:**
   - Role tab: Select **"Contributor"**
   - Click **"Next"**

5. **Add Service Principal:**
   - Members tab: Click **"+ Select members"**
   - Search box: Type `github-actions-unitedwerise`
   - Click on it to select it
   - Click **"Select"** button (bottom of panel)
   - Click **"Next"**

6. **Review and Assign:**
   - Review tab: Click **"Review + assign"**
   - Click **"Review + assign"** again to confirm

7. **Verify:**
   - You should see `github-actions-unitedwerise` listed under "Role assignments"
   - Role: Contributor
   - Scope: unitedwerise-rg

**✅ Done!** GitHub Actions will work on the next push.

---

### Option 2: PowerShell (If Portal Still Doesn't Work)

```powershell
# Run in PowerShell (not Git Bash)

# Sign in with correct account
Connect-AzAccount -Tenant "c3418fd6-1a5a-48f6-9600-4ca53d952dc1"

# Set subscription
Set-AzContext -SubscriptionId "f71adbbe-4225-40e8-bb8a-9ae87086477f"

# Assign role
New-AzRoleAssignment `
  -ApplicationId "d62caad0-7945-43a4-8576-edba1c7589b1" `
  -RoleDefinitionName "Contributor" `
  -ResourceGroupName "unitedwerise-rg"

# Verify
Get-AzRoleAssignment -ResourceGroupName "unitedwerise-rg" | Where-Object { $_.DisplayName -eq "github-actions-unitedwerise" }
```

**Expected Output:**
```
RoleAssignmentName   : <guid>
RoleDefinitionName   : Contributor
Scope                : /subscriptions/f71adbbe-4225-40e8-bb8a-9ae87086477f/resourceGroups/unitedwerise-rg
DisplayName          : github-actions-unitedwerise
```

---

### Option 3: Ask Someone with Azure AD Admin Permissions

If you don't have the right permissions, someone with **"User Access Administrator"** or **"Owner"** role on the subscription can do this.

**Send them this info:**
- Service Principal App ID: `d62caad0-7945-43a4-8576-edba1c7589b1`
- Service Principal Name: `github-actions-unitedwerise`
- Resource Group: `unitedwerise-rg`
- Required Role: `Contributor`
- Subscription: `f71adbbe-4225-40e8-bb8a-9ae87086477f`

**They can run:**
```bash
az role assignment create \
  --assignee "d62caad0-7945-43a4-8576-edba1c7589b1" \
  --role "Contributor" \
  --scope "/subscriptions/f71adbbe-4225-40e8-bb8a-9ae87086477f/resourceGroups/unitedwerise-rg"
```

---

### Option 4: Continue with Manual Deployments (Temporary)

**Pros:**
- Works perfectly right now
- No additional setup needed
- I can deploy in ~5 minutes anytime

**Cons:**
- Requires asking me each time you want to deploy
- Not automatic

**How it works:**
1. You push code to `development` or `main`
2. You ask me: "Please deploy to staging/production"
3. I run the deployment commands
4. Takes ~5-7 minutes total

---

## 🧪 HOW TO TEST IF IT'S FIXED

After completing Option 1, 2, or 3:

### Test 1: Trigger a New Deployment

```bash
# Make a small change (add a comment to a file)
echo "# Test deployment" >> backend/src/server.ts

# Commit and push
git add backend/src/server.ts
git commit -m "test: Trigger automated deployment"
git push origin development
```

### Test 2: Monitor GitHub Actions

1. Go to: https://github.com/UnitedWeRise-org/UnitedWeRise/actions
2. Watch the "Backend Auto-Deploy to Staging" workflow
3. **If it works:** ✅ Green checkmark, no authentication errors
4. **If it still fails:** ❌ Check the error logs

### Test 3: Verify Staging Updated

```bash
# Wait 5-7 minutes after GitHub Actions shows success
curl -s https://dev-api.unitedwerise.org/health | grep releaseSha

# Should show the new commit hash
```

---

## 📊 CURRENT WORKAROUND

**Until automated deployments are fixed**, use manual deployment:

1. **Make your code changes**
2. **Commit and push to development**
   ```bash
   git add .
   git commit -m "your message"
   git push origin development
   ```
3. **Ask me:** "Please deploy to staging"
4. **I'll run:**
   ```bash
   # Build Docker image
   GIT_SHA=$(git rev-parse --short HEAD)
   DOCKER_TAG="backend-manual-${GIT_SHA}-$(date +%Y%m%d-%H%M%S)"
   az acr build --registry uwracr2425 --image "unitedwerise-backend:$DOCKER_TAG" --no-wait https://github.com/UnitedWeRise-org/UnitedWeRise.git#development:backend

   # Wait 3 minutes for build
   sleep 180

   # Deploy to staging
   DIGEST=$(az acr repository show --name uwracr2425 --image "unitedwerise-backend:$DOCKER_TAG" --query "digest" -o tsv)
   az containerapp update --name unitedwerise-backend-staging --resource-group unitedwerise-rg --image "uwracr2425.azurecr.io/unitedwerise-backend@$DIGEST" --revision-suffix "man-${GIT_SHA}-$(date +%H%M%S)" --set-env-vars NODE_ENV=staging STAGING_ENVIRONMENT=true RELEASE_SHA=$GIT_SHA RELEASE_DIGEST=$DIGEST
   ```
5. **Done in ~5 minutes**

---

## ✅ SUCCESS CRITERIA

You'll know automated deployments are working when:

1. ✅ Push to `development` branch
2. ✅ GitHub Actions runs automatically (no errors)
3. ✅ Staging backend updates within 5-7 minutes
4. ✅ Health endpoint shows new commit hash
5. ✅ No manual intervention needed

---

## 🔍 TROUBLESHOOTING

### Still Getting Authentication Errors?

**Check GitHub Secrets:**
1. Go to: https://github.com/UnitedWeRise-org/UnitedWeRise/settings/secrets/actions
2. Verify these 3 secrets exist:
   - AZURE_CLIENT_ID
   - AZURE_TENANT_ID
   - AZURE_SUBSCRIPTION_ID
3. Secret names must be EXACT (case-sensitive)

**Check Federated Credentials:**
```bash
az ad app federated-credential list --id d62caad0-7945-43a4-8576-edba1c7589b1 --output table
```

Should show 2 credentials:
- github-actions-development (for development branch)
- github-actions-main (for main branch)

**Check Role Assignment:**
```bash
az role assignment list --assignee d62caad0-7945-43a4-8576-edba1c7589b1 --output table
```

Should show Contributor role on unitedwerise-rg.

---

## 💡 WHY THIS HAPPENED

The original workflow used an old authentication method:
```yaml
- uses: azure/login@v1
  with:
    creds: ${{ secrets.AZURE_CREDENTIALS }}  # Never existed
```

We upgraded to modern OIDC:
```yaml
- uses: azure/login@v2
  with:
    client-id: ${{ secrets.AZURE_CLIENT_ID }}
    tenant-id: ${{ secrets.AZURE_TENANT_ID }}
    subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
```

But the service principal needs permission to actually deploy (Contributor role).

---

## 📞 NEED HELP?

**If Option 1 (Portal) doesn't work:**
- Check which Microsoft account you're signed in with
- Try signing out completely from all Microsoft services
- Use private/incognito window
- Sign in with: Jeffrey@peacefulrevolutions.onmicrosoft.com

**If Option 2 (PowerShell) doesn't work:**
- Make sure Azure PowerShell module is installed: `Install-Module -Name Az`
- Check you're signed into the right account: `Get-AzContext`

**If stuck:**
- Manual deployments work perfectly in the meantime
- The role assignment is a one-time setup
- Once it's done, it never needs to be touched again

---

## 🎉 BENEFITS ONCE FIXED

- ✅ **Automatic deployments** - Push code, it deploys automatically
- ✅ **Faster workflow** - No waiting for manual intervention
- ✅ **Audit trail** - GitHub Actions logs all deployments
- ✅ **Rollback easier** - Can re-run previous successful workflows
- ✅ **CI/CD best practice** - Professional development workflow

---

**Bottom Line:** The hard part is done (OIDC setup). Just need to complete the role assignment via Azure Portal or PowerShell, and automated deployments will work forever.
