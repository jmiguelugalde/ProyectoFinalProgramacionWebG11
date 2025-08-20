const API = (path) => `http://127.0.0.1:8000${path}`;
const qs = (s) => document.querySelector(s);
const loginView = qs('#login');
const appView = qs('#app');
const msg = qs('#loginMsg');
let lineChart;
let pieChart;

qs('#btnLogin').onclick = async () => {
  msg.textContent = '';
  const username = qs('#user').value;
  const password = qs('#pass').value;
  try {
    const r = await fetch(API('/api/login'), {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({username, password})
    });
    if (!r.ok) throw new Error('Credenciales inválidas');
    loginView.classList.add('hidden');
    appView.classList.remove('hidden');
    loadAll();
      await loadStores();

  } catch (e) { msg.textContent = e.message; }
};

qs('#btnLogout').onclick = () => {
  appView.classList.add('hidden');
  loginView.classList.remove('hidden');
};

qs('#btnApply').onclick = loadAll;

// Subir Excel y procesar
const upMsg = document.querySelector('#upMsg');
const btnUpload = document.querySelector('#btnUpload');
if (btnUpload) {
  btnUpload.onclick = async () => {
    const f = document.querySelector('#fileExcel').files[0];
    if (!f) { upMsg.textContent = 'Seleccione un archivo .xlsx'; return; }
    upMsg.textContent = 'Procesando...';
    const fd = new FormData();
    fd.append('file', f);
    try {
      const r = await fetch(API('/api/import/excel'), { method: 'POST', body: fd });
      if (!r.ok) throw new Error(await r.text());
      const j = await r.json();
      upMsg.textContent = `OK: insertados ${j.inserted}, omitidos ${j.skipped}`;
      await loadAll();   // refresca KPIs/gráficos/tabla
    } catch (e) {
      upMsg.textContent = 'Error: ' + e.message;
    }
  };
}

async function loadAll(){
  const store = qs('#fStore').value || '';
  const f = qs('#fFrom').value || '';
  const t = qs('#fTo').value || '';

  const p = new URLSearchParams();
  if (store) p.append('store', store);
  if (f) p.append('date_from', f);
  if (t) p.append('date_to', t);

  const kp = await fetch(API('/api/kpis?' + p.toString())).then(r=>r.json());
  qs('#kTotal').textContent = kp.total;
  qs('#kOsa').textContent = kp.osa_pct;
  qs('#kOos').textContent = kp.oos_pct;

  // Chart
  const ctx = document.getElementById('lineChart');
  const labels = kp.series.map(x=>x.date);
  const data = kp.series.map(x=>x.osa_pct);
  if (lineChart) lineChart.destroy();
  lineChart = new Chart(ctx, {
  type: 'line',
  data: { labels, datasets: [{ label:'OSA %', data }]},
  options: {
  responsive: true,
  maintainAspectRatio: false,
  scales: { y: { beginAtZero: true, max: 100 } }
  }
});

// ----- Pie / Dona OSA vs OOS -----
const pieCtx = document.getElementById('pieChart');
if (pieChart) pieChart.destroy();
pieChart = new Chart(pieCtx, {
  type: 'doughnut',
  data: {
    labels: ['OSA %', 'OOS %'],
    datasets: [{ data: [kp.osa_pct, kp.oos_pct] }]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' },
      tooltip: { callbacks: {
        label: (c) => `${c.label}: ${Number(c.raw).toFixed(1)}%`
      }}
    }
  }
});

  // Worst SKUs
  const tbw = qs('#tblWorst tbody'); tbw.innerHTML='';
  kp.worst_sku.forEach(r => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${r.barcode||''}</td><td>${r.osa_pct}</td>`;
    tbw.appendChild(tr);
  });

  // Items
  const items = await fetch(API('/api/measurements?' + p.toString())).then(r=>r.json());
  const tbi = qs('#tblItems tbody'); tbi.innerHTML='';
  items.items.forEach(r => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${r.fecha}</td><td>${r.pv}</td><td>${r.descripcion_sku}</td><td>${r.estado}</td><td>${r.tipo_resultado}</td><td>${r.osa_flag}</td><td>${r.oos_flag}</td>`;
    tbi.appendChild(tr);
  });
}

// ===== STORES CRUD =====
function resetStoreForm() {
  document.querySelector('#sId').value = '';
  document.querySelector('#sName').value = '';
  document.querySelector('#sProvincia').value = '';
  document.querySelector('#sFormato').value = '';
  document.querySelector('#sCliente').value = '';
}

async function loadStores() {
  const res = await fetch(API('/api/stores'));
  const data = await res.json();
  const tbody = document.querySelector('#tblStores tbody');
  tbody.innerHTML = '';
  data.forEach(s => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${s.id}</td>
      <td>${s.name}</td>
      <td>${s.provincia || ''}</td>
      <td>${s.formato || ''}</td>
      <td>${s.cliente || ''}</td>
      <td>
        <button data-id="${s.id}" class="edit-store">Editar</button>
        <button data-id="${s.id}" class="del-store">Eliminar</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // acciones
  tbody.querySelectorAll('.edit-store').forEach(btn => {
    btn.onclick = () => editStore(parseInt(btn.dataset.id), data);
  });
  tbody.querySelectorAll('.del-store').forEach(btn => {
    btn.onclick = () => deleteStore(parseInt(btn.dataset.id));
  });
}

function editStore(id, list) {
  const s = list.find(x => x.id === id);
  if (!s) return;
  document.querySelector('#sId').value = s.id;
  document.querySelector('#sName').value = s.name || '';
  document.querySelector('#sProvincia').value = s.provincia || '';
  document.querySelector('#sFormato').value = s.formato || '';
  document.querySelector('#sCliente').value = s.cliente || '';
}

async function saveStore() {
  const id = document.querySelector('#sId').value.trim();
  const payload = {
    name: document.querySelector('#sName').value.trim(),
    provincia: document.querySelector('#sProvincia').value.trim() || null,
    formato: document.querySelector('#sFormato').value.trim() || null,
    cliente: document.querySelector('#sCliente').value.trim() || null,
  };
  if (!payload.name) { alert('Nombre es requerido'); return; }

  const url = id ? API(`/api/stores/${id}`) : API('/api/stores');
  const method = id ? 'PUT' : 'POST';
  const r = await fetch(url, {
    method,
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(payload),
  });
  if (!r.ok) {
    const msg = await r.text();
    alert('Error: ' + msg);
    return;
  }
  resetStoreForm();
  await loadStores();
}

async function deleteStore(id) {
  if (!confirm('¿Eliminar la tienda?')) return;
  const r = await fetch(API(`/api/stores/${id}`), { method: 'DELETE' });
  if (!r.ok) {
    const msg = await r.text();
    alert('Error: ' + msg);
    return;
  }
  await loadStores();
}

// Bind de botones al cargar app
document.querySelector('#btnStoreSave').onclick = saveStore;
document.querySelector('#btnStoreReset').onclick = resetStoreForm;
