# Cenit — dashboard GA4 + Search Console del portfolio

Dashboard privado que agrega las métricas más importantes de **Google Analytics 4** y
**Google Search Console** de los ~21 proyectos en producción, con un solo login de Google.
Microsoft Clarity queda para una fase 2 (el modelo de datos ya está preparado).

- **Login = "Continuar con Google"**: el mismo consentimiento autentica al usuario
  (allowlist `ALLOWED_EMAILS`) y entrega el refresh token con los scopes
  `analytics.readonly` + `webmasters.readonly` que usa el ETL. El refresh token se
  guarda cifrado (AES-256-GCM) en la DB.
- **ETL diario** (05:00 ART, node-cron dentro de la api): GA4 de ayer + Search Console
  con lag de 3 días (re-fetchea una ventana de 4 días porque Google ajusta datos
  retroactivamente). Upserts idempotentes. Backfill histórico de hasta 16 meses.
- **El dashboard lee solo de MySQL**: instantáneo, sin cuota de APIs, con histórico propio.

## Arquitectura

```
api/  Express ESM + Sequelize (DB CENIT en mysql_db compartido)
      /auth (Google OAuth + JWT sesión) · /sites (CRUD + discovery/mapping)
      /metrics (overview + detalle) · /etl (run/backfill/runs)
web/  Next 14 App Router + Tailwind + shadcn/ui + SWR + recharts
      BFF: cookie httpOnly + proxy /api/proxy/* → el browser nunca ve el token
```

Corre sobre la infra compartida de `/opt/shared` (Traefik + `mysql_db` en `net-shared`).

## Setup inicial (una sola vez): Google Cloud Console

1. Crear un proyecto en https://console.cloud.google.com (ej: `cenit-dashboard`).
2. **Habilitar 3 APIs** (APIs & Services → Library):
   - Google Analytics Data API
   - Google Analytics Admin API
   - Google Search Console API
3. **OAuth consent screen**: tipo *External*, completar nombre y email.
   ⚠ **Publicar la app (Publishing status: In production)**: en modo *Testing* los
   refresh tokens expiran a los 7 días y el ETL moriría semanalmente. Con menos de
   100 usuarios y uso propio no requiere verificación de Google (solo muestra una
   pantalla de advertencia al consentir).
4. **Credentials → Create credentials → OAuth client ID** (tipo *Web application*):
   - Authorized redirect URIs (dev): `http://localhost:4100/api/auth/callback`
   - (prod, cuando exista): `https://cenit.sda.ovh/api/auth/callback`
5. Copiar `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` en `api/.env`.

## Desarrollo

Requiere `/opt/shared` levantado (red `net-shared` + `mysql_db` + `traefik`).

```bash
make up      # crea api/.env (genera SECRET_KEY y TOKEN_ENCRYPTION_KEY), asegura la DB y levanta
make seed    # asegura los sitios de api/db/sites.local.json (copiar de sites.example.json; no se versiona)
```

- Dashboard: http://localhost:4100 (o http://cenit.localhost)
- API: http://cenit-api.localhost

> El login SIEMPRE por `http://localhost:4100`: Google no acepta `*.localhost` como
> redirect URI, solo `localhost` (por eso el mapeo de puerto 4100 del web).

## Flujo de uso

1. **Login** con la cuenta de Google del portfolio.
2. **Configuración → Buscar en Google**: lista las propiedades GA4 y sitios GSC reales
   y sugiere el mapeo por dominio → *Aplicar sugerencias* → *Guardar cambios*.
3. **Backfill histórico** (una vez): trae hasta 16 meses en bloques de 30 días.
4. Listo: el **Overview** muestra los 21 sitios con deltas vs el período anterior, y
   cada sitio tiene detalle con series, canales, dispositivos, top páginas y consultas.
   El cron mantiene los datos al día.

Si el acceso a Google se revoca (`invalid_grant`), aparece un banner "Reconectar
Google": volver a loguearse lo arregla (el consent se fuerza en cada login).

## Notas de diseño

- `prompt=consent` + `access_type=offline` en cada login garantizan refresh token nuevo.
- CTR nunca se almacena (se calcula al agregar); la posición por período se pondera
  por impresiones.
- Top 20 de páginas/queries **por día**; los tops por período se agregan por SUM
  (aproximación aceptable para un dashboard privado).
- Redis está disponible en net-shared si algún día hace falta cachear el overview.

## Deploy

```bash
cp .env.deploy.example .env.deploy.test   # completar SSH + GHCR
./deploy.sh test
```

Sube `ghcr.io/luiscruz19/cenit-{api,web}`, copia el compose al server y hace
pull+up. En el server: crear la DB `CENIT` y el `.env` desde
`.env.production.example` (con el redirect URI de prod registrado en Google).
