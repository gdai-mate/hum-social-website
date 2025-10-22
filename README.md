# hüm Marketing Website

This is the marketing/landing page for hüm, designed to be hosted at `hum-social.com` (root domain) while the app runs at `app.hum-social.com`.

## Features

- 📱 Fully responsive design
- 🎨 Matches hüm app aesthetic (parchment/charcoal theme)
- ⚡ Static HTML/CSS (fast loading, no build step needed)
- 🚀 Easy to deploy on any static hosting platform

## Deployment Options

### Option 1: GitHub Pages (FREE & Easy)

1. **Create a new GitHub repository:**
   ```bash
   cd /Users/asgard/Desktop/hüm-project/website
   git init
   git add .
   git commit -m "Initial commit: hüm marketing website"
   gh repo create hum-social-website --public --source=. --remote=origin --push
   ```

2. **Enable GitHub Pages:**
   - Go to your repo settings
   - Navigate to "Pages" section
   - Source: Deploy from branch `main`
   - Click "Save"

3. **Configure Custom Domain:**
   In GoDaddy DNS for `hum-social.com`, add these records:
   ```
   Type: A
   Name: @
   Value: 185.199.108.153

   Type: A
   Name: @
   Value: 185.199.109.153

   Type: A
   Name: @
   Value: 185.199.110.153

   Type: A
   Name: @
   Value: 185.199.111.153

   Type: CNAME
   Name: www
   Value: yourusername.github.io
   ```

4. **Add CNAME file** (in this directory):
   ```
   hum-social.com
   ```

### Option 2: Azure Static Web Apps (FREE)

1. **Create a new Static Web App in Azure:**
   ```bash
   az staticwebapp create \
     --name hum-website \
     --resource-group hum-prod-rg \
     --location eastus2 \
     --sku Free \
     --source https://github.com/yourusername/hum-social-website \
     --branch main \
     --app-location "/"
   ```

2. **Configure Custom Domain:**
   ```bash
   # Add root domain
   az staticwebapp hostname set \
     --name hum-website \
     --resource-group hum-prod-rg \
     --hostname "hum-social.com" \
     --validation-method dns-txt-token
   ```

3. **In GoDaddy DNS:**
   Add the TXT record provided by Azure for validation.

### Option 3: Quick Redirect (2 minutes)

If you want users to go directly to the app for now:

1. Go to GoDaddy DNS Management for `hum-social.com`
2. Add Forwarding:
   - From: `hum-social.com`
   - To: `https://app.hum-social.com`
   - Type: 301 (Permanent)
   - Include path: Yes

## Local Development

Just open `index.html` in your browser:

```bash
open index.html
```

Or use a simple HTTP server:

```bash
python3 -m http.server 8000
# Then visit http://localhost:8000
```

## Customization

### Update Content
Edit `index.html` to change:
- Hero title and subtitle
- Features
- How It Works steps
- Philosophy section
- Footer links

### Update Styling
Edit `style.css` to change:
- Colors (CSS variables in `:root`)
- Fonts
- Layout
- Animations

### Add Assets
Place images/logos in an `assets/` folder:
```
website/
  ├── assets/
  │   ├── logo.svg
  │   ├── hero-bg.jpg
  │   └── favicon.svg
  ├── index.html
  ├── style.css
  └── README.md
```

## Links to Update

Before deploying, make sure these links point to the correct locations:
- All "Get Started" buttons → `https://app.hum-social.com`
- Footer links → Update email, privacy, terms URLs
- Social media links (if you add them)

## SEO Optimization

Add these meta tags to `<head>` section:

```html
<meta property="og:title" content="hüm - Voice-First Social Accountability">
<meta property="og:description" content="Join hüm - the voice-first social platform where accountability meets community.">
<meta property="og:image" content="https://hum-social.com/assets/og-image.jpg">
<meta property="og:url" content="https://hum-social.com">
<meta name="twitter:card" content="summary_large_image">
```

## Analytics (Optional)

To add Google Analytics, insert before `</head>`:

```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

## Support

Questions? Reach out:
- Email: hello@hum-social.com
- App: https://app.hum-social.com

---

Built with ❤️ for the hüm community
