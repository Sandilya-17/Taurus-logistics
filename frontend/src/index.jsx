<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#0b1326" />
    <meta name="description" content="Taurus Trade & Logistics ERP — Enterprise Resource Planning System" />
    <title>Taurus Trade &amp; Logistics ERP</title>

    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
      rel="stylesheet"
    />

    <style>
      html, body { background: #f4f6fb; }
      body {
        margin: 0;
        font-family: 'DM Sans','Inter', system-ui, -apple-system, "Segoe UI", sans-serif;
        -webkit-font-smoothing: antialiased;
      }
      /* First-paint loader so the screen never looks broken */
      #app-boot {
        position: fixed; inset: 0; display: grid; place-items: center;
        background: #f4f6fb; z-index: 9999;
      }
      #app-boot .ring {
        width: 44px; height: 44px; border-radius: 50%;
        border: 3px solid #e2e8f0; border-top-color: #2563eb;
        animation: spin .9s linear infinite;
      }
      @keyframes spin { to { transform: rotate(360deg); } }
      @media (prefers-color-scheme: dark) {
        html, body, #app-boot { background: #0a0f1f; }
      }
    </style>
    <script>
      window.API_BASE_URL = '%REACT_APP_API_URL%' !== '%REACT_APP_API_URL%'
        ? '%REACT_APP_API_URL%'
        : window.location.origin + '/api';
    </script>
  </head>
  <body>
    <div id="root"></div>
    <div id="app-boot"><div class="ring" aria-label="Loading"></div></div>
    <script>
      // Hide boot loader once React mounts something into #root
      const obs = new MutationObserver(() => {
        if (document.getElementById('root').childElementCount > 0) {
          const b = document.getElementById('app-boot');
          if (b) { b.style.transition = 'opacity .2s'; b.style.opacity = '0'; setTimeout(() => b.remove(), 220); }
          obs.disconnect();
        }
      });
      obs.observe(document.getElementById('root'), { childList: true });
    </script>
  </body>
</html>
