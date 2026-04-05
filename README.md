[![Review Assignment Due Date](https://classroom.github.com/assets/deadline-readme-button-22041afd0340ce965d47ae6ef1cefeee28c7c493a6346c4f15d667ab976d596c.svg)](https://classroom.github.com/a/DLw1Zp-y)

## How To Run On Your Computer (If Needed)

1. Install Python and Node.js on your computer if they are not already installed.
2. Open PowerShell in the root of this repository.
3. Set your FRED API key:
   `$env:FRED_API_KEY="your_fred_api_key_here"`
4. Run the dashboard launcher:
   `.\run_dashboard.ps1`
5. Wait for the script to refresh the data, install any missing dependencies, and start the local Vite server.
6. Open the local URL shown in the terminal, usually `http://localhost:5173`.

## Monetary Policy Dashboard

The technical skeleton for the team project lives in `..\project-team-09\.github\Monetary_Policy_Dashboard`.

### Stack

- React
- Bootstrap 5
- Vite
- GitHub Pages via GitHub Actions

### Local development

```powershell
cd .github/Monetary_Policy_Dashboard
npm.cmd install
npm.cmd run dev
```

### Production build

```powershell
cd .github/Monetary_Policy_Dashboard
npm.cmd run build
```

The deployed site is handled by `..\GitHub\project-team-09\.github\workflows\deploy-monetary-policy-dashboard.yml`, which builds the app from the dashboard folder and publishes the generated `dist` output to GitHub Pages whenever the app is pushed to `main`.
