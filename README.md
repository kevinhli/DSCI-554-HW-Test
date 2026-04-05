[![Review Assignment Due Date](https://classroom.github.com/assets/deadline-readme-button-22041afd0340ce965d47ae6ef1cefeee28c7c493a6346c4f15d667ab976d596c.svg)](https://classroom.github.com/a/DLw1Zp-y)

## How To Run On Your Computer (If Needed)

1. Open PowerShell in the root of this repository.
2. Set your FRED API key:
   ```powershell
   $env:FRED_API_KEY="your_fred_api_key_here"
   ```
3. Start the dashboard:
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\run_dashboard.ps1
   ```
4. Open the local URL shown in the terminal, usually:
   ```text
   http://localhost:5173
   ```
5. If you want a production build instead of the local dev server, run:
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\run_dashboard.ps1 -Production
   ```

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
