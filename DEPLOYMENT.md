# Deployment Guide - OneShop E-Commerce App

This guide covers deploying OneShop as a full stack app with Vercel or Netlify for the frontend, Render for the backend, and MongoDB Atlas for the database.

## Prerequisites

- GitHub account with the repository pushed
- Netlify account (free tier is sufficient)
- Environment variables ready (API URL, Stripe keys)

## Deployment Architecture

- Frontend: Netlify
- Backend API: Render
- Database: MongoDB Atlas
- Payments: Stripe test mode for first public release

## Deploy with Vercel (frontend) + Render (backend)

The frontend is a static Vite app (Vercel or Netlify). The Express API, MongoDB access and the
Gemini shopping assistant run on the backend (Render). **Secrets such as `GEMINI_API_KEY` go on
the backend only.** Anything set on Vercel with a `VITE_` prefix is bundled into public JavaScript.

### 1. Backend on Render
Create the service from `render.yaml`, then set:

| Variable | Value |
|----------|-------|
| `MONGODB_URI` | MongoDB Atlas connection string |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | Long random strings (not the example values) |
| `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` | From the Stripe dashboard |
| `FRONTEND_URL` | Your Vercel URL, e.g. `https://oneshop.vercel.app` (comma-separate extra URLs such as previews) |
| `GEMINI_API_KEY` | Google AI Studio key for the shopping assistant |
| `ASSISTANT_MODEL` | Optional, defaults to `gemini-3.5-flash-lite` |
| `RATE_LIMIT_MAX_REQUESTS` | Requests per IP per 15 min, e.g. `300` |

Seed the catalog once against Atlas: `MONGODB_URI=<atlas uri> npm --prefix backend run seed:demo`.

### 2. Frontend on Vercel
1. Import the GitHub repo in Vercel and set **Root Directory** to `frontend` (`frontend/vercel.json` handles the build and SPA routing).
2. Add environment variables:
   - `VITE_API_URL` = `https://<your-render-service>.onrender.com/api/v1`
   - `VITE_STRIPE_PUBLISHABLE_KEY` = `pk_test_...` (or live key)
3. Deploy, then put the final Vercel URL into the backend's `FRONTEND_URL`.

Note: the Render free plan sleeps when idle, so the first request after a pause can take ~30-60s.

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
     | `VITE_API_URL` | `https://your-render-service.onrender.com/api/v1` | Backend API URL |
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

### `render.yaml`
Located in the project root, this file preconfigures the backend Render service:
- Root directory: `backend`
- Build command: `npm install && npm run build`
- Start command: `npm run start`
- `/health` health check
- Required backend environment variables

### `frontend/public/_redirects`
Ensures all routes are handled by React Router (client-side routing).

## Backend Deployment on Render

1. Create a new Render Web Service from your GitHub repo.
2. Render can detect [render.yaml](/c:/Users/Lenovo/Desktop/PROJECTS/e-commerce%20app/render.yaml), or you can set the same values manually.
3. Set these required environment variables in Render:
   - `MONGODB_URI`
   - `JWT_ACCESS_SECRET`
   - `JWT_REFRESH_SECRET`
   - `STRIPE_SECRET_KEY`
   - `STRIPE_PUBLISHABLE_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `FRONTEND_URL`
4. After the first deploy, verify `https://<your-render-service>/health`.

## Database Deployment on MongoDB Atlas

1. Create a free Atlas cluster.
2. Create a database user and copy the connection string.
3. Add Render's outbound access in Atlas network access settings, or allow the appropriate IP range for your first release.
4. Paste the Atlas URI into Render as `MONGODB_URI`.
5. After the backend is live, run the existing seed command against Atlas to load demo products and categories.

## Environment Variables Explained

### Required Variables

1. **VITE_API_URL**
   - Purpose: Backend API endpoint
   - Use your deployed Render backend URL (e.g. `https://your-service.onrender.com/api/v1`)

2. **VITE_STRIPE_PUBLISHABLE_KEY**
   - Purpose: Stripe payment processing
   - Get from: [Stripe Dashboard](https://dashboard.stripe.com/apikeys)
   - Use test key for development: `pk_test_...`
   - Use test key for the first public deployment

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

1. **Deploy Backend:** Complete the Render API deploy
2. **Deploy Database:** Point the backend to MongoDB Atlas
3. **Update Frontend Environment Variables:** Point `VITE_API_URL` to Render
4. **Configure Stripe Webhook:** Point Stripe to `https://<render-backend>/api/v1/webhooks/stripe`
5. **Promote to Live Payments Later:** Switch from Stripe test keys to live keys only after checkout is verified

## Support

- Netlify Docs: https://docs.netlify.com
- Netlify Community: https://answers.netlify.com
- Vite Deployment Guide: https://vite.dev/guide/static-deploy.html

---

**Deployed with Netlify** 🚀
