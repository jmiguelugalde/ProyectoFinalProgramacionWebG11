# OSA Dashboard (mínimo viable)

## Requisitos
- Python 3.11+
- (Opcional) MySQL si desea usarlo. Por defecto usa SQLite.

## Backend
```bash
cd backend
python -m venv .venv && . .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env   # edite si quiere MySQL o credenciales
uvicorn backend.main:app --reload
```
- Importar datos desde Excel (columnas en español como su archivo):
```bash
python -m backend.import_excel "C:/ruta/a/mediciones.xlsx"
```
- API: http://127.0.0.1:8000/docs

## Frontend
Abra `frontend/index.html` en el navegador (o sirva con cualquier servidor estático).

### Login demo
- Usuario: `admin`
- Clave: `admin123`

## Notas
- Columnas requeridas: IdConjuntoProducto, Fecha, PV, Codigo de Barra, ESTADO, Tipo de Resultado, Descripcion SKU.
- Se calculan flags: `osa_flag` (OSA/ENCONTRADO) y `oos_flag` (OOS/FALTANTE).


## Docker (recomendado)
1. Copie su Excel a `data/mediciones.xlsx`.
2. Inicie servicios:
```bash
docker compose up -d --build
```
3. Importe datos al contenedor (una vez):
```bash
docker compose run --rm api python -m backend.import_excel /data/mediciones.xlsx
```
4. Apps:
- API: http://localhost:8000/docs
- Web: http://localhost:5173

> La base `osa.db` persiste en `./data` (volumen del host).
