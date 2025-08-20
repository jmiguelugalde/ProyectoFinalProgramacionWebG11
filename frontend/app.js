const API = (path) => `http://127.0.0.1:8000${path}`;

const qs = (s) => document.querySelector(s);
const loginView = qs('#login');
const appView = qs('#app');
const msg = qs('#loginMsg');
let lineChart;

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
  } catch (e) { msg.textContent = e.message; }
};

qs('#btnLogout').onclick = () => {
  appView.classList.add('hidden');
  loginView.classList.remove('hidden');
};

qs('#btnApply').onclick = loadAll;

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
    options: { responsive: true, scales: { y: { beginAtZero: true, max:100 } } }
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
