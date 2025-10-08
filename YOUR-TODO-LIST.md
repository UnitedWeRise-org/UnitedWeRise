# Your Manual Tasks - GitHub Actions Authentication Fix

## ✅ What Claude Completed:
- ✅ Created Azure App Registration: `github-actions-unitedwerise`
- ✅ Created Service Principal
- ✅ Created federated credentials for development & main branches
- ✅ Updated GitHub workflow files to use OIDC
- ✅ Committed and pushed changes to development branch

---

## 📋 What You Need to Do (10 minutes total):

### TASK 1: Assign Contributor Role (2 minutes)

**Via Azure Portal (Recommended):**

1. Go to: https://portal.azure.com
2. Search for: `unitedwerise-rg` (your resource group)
3. Click on it
4. Click **"Access control (IAM)"** in the left sidebar
5. Click **"+ Add"** → **"Add role assignment"**
6. Select role: **"Contributor"**
7. Click **"Next"**
8. Click **"+ Select members"**
9. In search box, type: `github-actions-unitedwerise`
10. Click on it to select it
11. Click **"Select"** button at bottom
12. Click **"Review + assign"**
13. Click **"Review + assign"** again

**✅ Done when:** You see "github-actions-unitedwerise" listed under Role assignments with "Contributor" role

---

### TASK 2: Add 3 GitHub Secrets (3 minutes)

1. **Go to:** https://github.com/UnitedWeRise-org/UnitedWeRise/settings/secrets/actions

2. **Add Secret #1:**
   - Click green "New repository secret" button (top right)
   - Name: `AZURE_CLIENT_ID`
   - Value: `d62caad0-7945-43a4-8576-edba1c7589b1`
   - Click "Add secret"

3. **Add Secret #2:**
   - Click "New repository secret" again
   - Name: `AZURE_TENANT_ID`
   - Value: `c3418fd6-1a5a-48f6-9600-4ca53d952dc1`
   - Click "Add secret"

4. **Add Secret #3:**
   - Click "New repository secret" again
   - Name: `AZURE_SUBSCRIPTION_ID`
   - Value: `f71adbbe-4225-40e8-bb8a-9ae87086477f`
   - Click "Add secret"

**✅ Done when:** You see 3 secrets listed on the secrets page

---

### TASK 3: Verify Deployment (5 minutes)

1. **Check GitHub Actions:**
   - Go to: https://github.com/UnitedWeRise-org/UnitedWeRise/actions
   - Look for the workflow that just ran (should be in progress)
   - Click on it to watch the deployment

2. **Wait for deployment to complete** (~5 minutes)

3. **Verify staging backend is updated:**
   ```bash
   curl -s https://dev-api.unitedwerise.org/health | grep releaseSha
   ```

   **Should show:** `"releaseSha":"bf13e0b"` or `"releaseSha":"179ba31"`

**✅ Done when:**
- GitHub Actions shows green checkmark ✅
- Staging backend shows new commit hash
- Security fixes are deployed!

---

## 🆘 If Something Goes Wrong:

### "I can't find the resource group in Azure Portal"
- Make sure you're logged into the correct Azure account
- Try direct link: https://portal.azure.com/#@c3418fd6-1a5a-48f6-9600-4ca53d952dc1/resource/subscriptions/f71adbbe-4225-40e8-bb8a-9ae87086477f/resourceGroups/unitedwerise-rg/overview

### "I can't add GitHub secrets"
- You need admin permissions on the GitHub repository
- Check you're logged into GitHub as the repo owner

### "GitHub Actions still failing"
- Double-check the 3 secret names are EXACTLY:
  - `AZURE_CLIENT_ID` (not Azure_Client_ID or anything else)
  - `AZURE_TENANT_ID`
  - `AZURE_SUBSCRIPTION_ID`
- Make sure you completed Task 1 (role assignment)

### "Staging backend still shows old commit"
- Wait the full 5 minutes for deployment
- Check GitHub Actions logs for errors
- Run: `curl -s https://dev-api.unitedwerise.org/health` to see full status

---

## 📞 Need Help?

If you get stuck, share:
1. Screenshot of GitHub Actions error (if any)
2. Screenshot of Azure role assignments page
3. Screenshot of GitHub secrets page (names only, not values)

---

## 🎉 When Complete:

Once all 3 tasks are done, your security fixes will be live on staging and GitHub Actions will work automatically for all future deployments!

**This is a one-time setup. You'll never have to do this again.**
