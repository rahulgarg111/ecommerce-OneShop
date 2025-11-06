# Deployment Guide - OneShop E-Commerce App

This guide covers deploying the OneShop frontend to Netlify.

## Prerequisites

- GitHub account with the repository pushed
- Netlify account (free tier is sufficient)
- Environment variables ready (API URL, Stripe keys)

## Quick Deploy to Netlify

### Option 1: Deploy via Netlify Dashboard (Recommended)

1. **Go to Netlify**
   - Visit [https://app.netlify.com](https://app.netlify.com)
   - Sign in with your GitHub account

2. **Import Your Repository**
   - Click "Add new site" → "Import an existing project"
   - Choose "Deploy with GitHub"
   - Authorize Netlify to access your GitHub repositories
   - Select your `oneshop-ecommerce` repository (or whatever you named it)

3. **Configure Build Settings**
   - Netlify will automatically detect the `netlify.toml` configuration
   - Verify the settings:
     - **Base directory:** `frontend`
     - **Build command:** `npm run build`
     - **Publish directory:** `frontend/dist`
   - Click "Deploy site"

4. **Set Environment Variables**
   - After deployment, go to "Site settings" → "Environment variables"
   - Add the following variables:

     | Variable Name | Value | Description |
     |---------------|-------|-------------|
     | `VITE_API_URL` | `http://localhost:5000/api/v1` | Backend API URL (or your deployed backend URL) |
     | `VITE_STRIPE_PUBLISHABLE_KEY` | `pk_test_...` | Your Stripe publishable key |

   - **Note:** For frontend-only mode (no backend), you can use placeholder values:
     - `VITE_API_URL`: `https://api.oneshop.com/api/v1` (mock URL)
     - `VITE_STRIPE_PUBLISHABLE_KEY`: `pk_test_placeholder`

5. **Redeploy with Environment Variables**
   - Go to "Deploys" tab
   - Click "Trigger deploy" → "Deploy site"
   - Wait for the build to complete

6. **Access Your Site**
   - Your site will be available at: `https://[random-name].netlify.app`
   - You can customize the site name in "Site settings" → "Site details" → "Change site name"

### Option 2: Deploy via Netlify CLI

```bash
# Install Netlify CLI globally
npm install -g netlify-cli

# Login to Netlify
netlify login

# Navigate to your project root
cd "c:\Users\Lenovo\Desktop\e-commerce app"

# Initialize Netlify site
netlify init

# Follow the prompts:
# - Create & configure a new site
# - Choose your team
# - Enter site name (optional)
# - Build command: npm run build
# - Publish directory: frontend/dist

# Deploy to production
netlify deploy --prod
```

## Configuration Files

### `netlify.toml`
Located in the project root, this file contains:
- Build settings (base directory, build command, publish directory)
- Redirect rules for React Router SPA support
- Security headers
- Asset caching rules

### `frontend/public/_redirects`
Ensures all routes are handled by React Router (client-side routing).

## Environment Variables Explained

### Required Variables

1. **VITE_API_URL**
   - Purpose: Backend API endpoint
   - Frontend-only mode: Use a mock URL (API calls will fail gracefully)
   - Full-stack mode: Use your deployed backend URL (e.g., Railway, Render, Heroku)

2. **VITE_STRIPE_PUBLISHABLE_KEY**
   - Purpose: Stripe payment processing
   - Get from: [Stripe Dashboard](https://dashboard.stripe.com/apikeys)
   - Use test key for development: `pk_test_...`
   - Use live key for production: `pk_live_...`

## Custom Domain (Optional)

1. Go to "Domain settings" → "Add custom domain"
2. Enter your domain name
3. Follow Netlify's instructions to configure DNS records
4. Wait for DNS propagation (can take up to 48 hours)

## Continuous Deployment

Netlify automatically redeploys when you push to GitHub:
- **Main branch** → Production deployment
- **Other branches** → Preview deployments

To disable auto-deploy:
1. Go to "Site settings" → "Build & deploy"
2. Click "Edit settings" under "Build settings"
3. Toggle "Auto publishing" off

## Troubleshooting

### Build Fails

**Error: "Command failed with exit code 1"**
- Check the build logs in Netlify dashboard
- Ensure all dependencies are in `package.json`
- Verify Node.js version compatibility

**TypeScript errors during build:**
```bash
# Locally test the build
cd frontend
npm run build
```

### Routes Return 404

- Ensure `_redirects` file exists in `frontend/public/`
- Verify the redirect rule in `netlify.toml`
- Clear browser cache and try again

### Environment Variables Not Working

- Ensure variable names start with `VITE_` prefix
- Redeploy after adding/changing environment variables
- Check "Deploys" → "Deploy log" to see if variables are detected

### Images Not Loading

- Verify image URLs in mock data are correct
- Check browser console for CORS errors
- Ensure Unsplash URLs are accessible

## Performance Optimization

Netlify automatically provides:
- ✅ CDN distribution
- ✅ Asset compression (gzip/brotli)
- ✅ HTTP/2 support
- ✅ Automatic HTTPS

Additional optimizations in `netlify.toml`:
- Static asset caching (1 year for `/assets/*`)
- Security headers (XSS, clickjacking protection)

## Monitoring

- **Analytics:** Enable in "Site settings" → "Analytics"
- **Forms:** If you add forms, enable in "Site settings" → "Forms"
- **Functions:** For serverless functions (future backend integration)

## Next Steps

1. **Custom Domain:** Configure your own domain name
2. **Deploy Backend:** Deploy the backend to Railway/Render/Heroku
3. **Update Environment Variables:** Point `VITE_API_URL` to your backend
4. **Configure Stripe:** Set up live Stripe keys for production payments
5. **Add Analytics:** Integrate Google Analytics or Plausible

## Support

- Netlify Docs: https://docs.netlify.com
- Netlify Community: https://answers.netlify.com
- Vite Deployment Guide: https://vite.dev/guide/static-deploy.html

---

**Deployed with Netlify** 🚀
