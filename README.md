# OSA Dashboard — FastAPI + React (Vite) + Docker

Plataforma para visualizar KPIs de **On-Shelf Availability (OSA)**.  
Backend **FastAPI**, frontend **React (Vite)**, base **MySQL** en Docker (o **SQLite** en local).

---

## 👥 Participantes
> **Agrega aquí los nombres de tu equipo**
- Jafet Rojas
- Jose Ugalde
- Oscar Umaña


---

## 🚀 Stack
- **Frontend:** React 18 + Vite, TypeScript, Chart.js 4 (+ annotation/zoom)
- **Backend:** FastAPI (Uvicorn), CORS habilitado
- **DB:** MySQL 8 (en Docker) — *en desarrollo local podés usar SQLite por defecto*
- **Infra:** Docker Compose + Nginx (sirviendo el build de Vite)

---

## 📂 Estructura
ProyectoFinalProgramacionWeb/
├─ backend/
│ ├─ main.py # API (login, KPIs, CRUD opcional)
│ └─ ... # routers/, models/, etc (si aplica)
├─ frontend/
│ ├─ src/
│ │ ├─ App.tsx # UI principal + charts + filtros
│ │ ├─ main.tsx # bootstrap React
│ │ ├─ api.ts # Axios + interceptor (Bearer)
│ │ └─ vite-env.d.ts # tipos de Vite
│ ├─ Dockerfile # build Vite -> Nginx
│ └─ package.json
├─ docker-compose.yml
├─ .env.example # plantilla de variables (sin secretos)
├─ .gitignore
└─ README.md

yaml
Copy
Edit

---

## 🔐 Variables de entorno
Copia `.env.example` a **`.env`** en la raíz y ajusta valores:

```env
# Backend
ADMIN_USER=admin
ADMIN_PASS=admin123

# Si usas MySQL (Docker por defecto)
DB_HOST=db
DB_PORT=3306
DB_USER=osa_user
DB_PASSWORD=osa_pass
DB_NAME=osa_db

# Clave para JWT/firmas
SECRET_KEY=change_me

# Frontend (opcional para dev fuera de Docker)
VITE_API_URL=http://127.0.0.1:8000
No subas el .env real al repo (está ignorado en .gitignore).

▶️ Puesta en marcha con Docker (recomendado)
Requisitos: Docker Desktop.

(Opcional) Copia tu Excel a data/mediciones.xlsx.

Levanta los servicios:

bash
Copy
Edit
docker compose down -v
docker compose build --no-cache web api
docker compose up -d
(Opcional) Importa datos dentro del contenedor api:

bash
Copy
Edit
docker compose run --rm api python -m backend.import_excel /data/mediciones.xlsx
URLs

Frontend (Nginx): http://localhost:5173

Backend (FastAPI): http://localhost:8000

Swagger/OpenAPI: http://localhost:8000/docs

MySQL local: localhost:3307 (map a 3306 del contenedor)

Login demo (por .env):

makefile
Copy
Edit
usuario: admin
clave:    admin123
💻 Desarrollo local (sin Docker)
Backend
bash
Copy
Edit
cd backend
python -m venv .venv
# Linux/Mac
. .venv/bin/activate
# Windows
.venv\Scripts\activate

pip install -r requirements.txt
cp ../.env.example ../.env   # edita si quieres MySQL; si no, se usa SQLite por defecto
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
Importar datos desde Excel (columnas en español como tu archivo):

bash
Copy
Edit
python -m backend.import_excel "C:/ruta/a/mediciones.xlsx"
API local: http://127.0.0.1:8000/docs

Frontend (Vite)
bash
Copy
Edit
cd frontend
npm install
npm run dev           # http://localhost:5173
# o build + preview:
npm run build
npm run preview -- --port 5173
Si el editor marca error de tipos con Vite, crea src/vite-env.d.ts:

ts
Copy
Edit
/// <reference types="vite/client" />
🔌 Endpoints principales
POST /api/login
Body: { "username": "admin", "password": "admin123" }
200 OK → { ok, token, username, role }

GET /api/kpis
Query (opcionales): store, date_from, date_to
200 OK → { total, osa_pct, oos_pct, series: [{date, osa_pct}], worst_sku? }

Si está protegido, usar: Authorization: Bearer <token>

Ejemplos curl

bash
Copy
Edit
curl -X POST http://127.0.0.1:8000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

curl "http://127.0.0.1:8000/api/kpis?store=PV-01&date_from=2025-08-01&date_to=2025-08-22" \
  -H "Authorization: Bearer DEMO_TOKEN"
📊 Visualizaciones (Frontend)
Línea OSA% con:

Agrupar: día / semana / mes

Meta configurable (línea horizontal)

Media móvil (7) on/off

Zoom / Pan (rueda del mouse y arrastre)

Dona OSA vs OOS

Filtros: tienda (PV), rango de fechas

Exportar CSV de la serie visible

Persistencia de filtros en localStorage

🧱 Modelo mínimo sugerido (usuarios)
Si usas MySQL:

sql
Copy
Edit
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(120) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,  -- bcrypt
  role VARCHAR(30) NOT NULL DEFAULT 'user',
  active TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
En local, si prefieres SQLite, la base se guarda en ./data/osa.db.

🧰 Scripts útiles
Frontend

bash
Copy
Edit
npm run dev       # desarrollo
npm run build     # genera /dist
npm run preview   # sirve /dist (5173)
Docker

bash
Copy
Edit
docker compose ps
docker compose logs -f web
docker compose logs -f api
docker compose down -v
docker compose build --no-cache web api
docker compose up -d
MySQL (desde host)

bash
Copy
Edit
mysql -h 127.0.0.1 -P 3307 -u osa_user -p
🩺 Troubleshooting (rápido)
El frontend pide /app.js (404)
Estabas sirviendo un index.html viejo. Reconstruí web y verificá dentro del contenedor:

bash
Copy
Edit
docker compose exec web sh -lc "sed -n '1,80p' /usr/share/nginx/html/index.html"
Debe referenciar /assets/index-*.js, no /app.js.

Vite/TypeScript: Cannot find type definition 'vite/client'
Quitá "types": ["vite/client"] del tsconfig.json y crea src/vite-env.d.ts con:

ts
Copy
Edit
/// <reference types="vite/client" />
CORS
En local viene abierto (*). En despliegue, limita a tus dominios.

Puertos 5173/5174/5175 ocupados
Cerrá procesos o reiniciá Docker. En Windows:

powershell
Copy
Edit
Get-NetTCPConnection -LocalPort 5173 | % { Stop-Process -Id $_.OwningProcess -Force }
EPERM al instalar npm (Windows)
Cerrá node.exe, eliminá node_modules y package-lock.json, y reinstalá:

powershell
Copy
Edit
taskkill /F /IM node.exe
cd frontend
Remove-Item -Recurse -Force node_modules
Remove-Item -Force package-lock.json
npm cache clean --force
npm install
422 en Swagger al probar login
Mandá JSON puro (no pegues el comando curl dentro del body).

401 en login
Revisá ADMIN_USER/ADMIN_PASS del .env del api o datos reales en DB.

🔒 Seguridad (básico)
Cambiá SECRET_KEY en producción.

No comitees .env (usá .env.example).

Limita CORS a tus orígenes reales en prod.

Aísla MySQL a red interna; expone solo lo necesario.

🤝 Contribuir
PRs con ramas; opcional: protección de main.

Documentá cambios que afecten despliegue y .env.example.

Estándar de commits sugerido: feat:, fix:, chore:, docs:, refactor:.

📜 Licencia
MIT (o la que defina el equipo).