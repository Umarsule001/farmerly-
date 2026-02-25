// Simple client-side demo app using localStorage (polished + export/import)
const Storage = {
  getUsers() { return JSON.parse(localStorage.getItem('farmerly_users')||'[]'); },
  saveUsers(u){ localStorage.setItem('farmerly_users', JSON.stringify(u)); },
  getCurrent(){ return JSON.parse(localStorage.getItem('farmerly_session')||'null'); },
  setCurrent(s){ localStorage.setItem('farmerly_session', JSON.stringify(s)); },
  clearSession(){ localStorage.removeItem('farmerly_session'); },
  getLoans(){ return JSON.parse(localStorage.getItem('farmerly_loans')||'[]'); },
  saveLoans(l){ localStorage.setItem('farmerly_loans', JSON.stringify(l)); },
  getRecords(){ return JSON.parse(localStorage.getItem('farmerly_records')||'[]'); },
  saveRecords(r){ localStorage.setItem('farmerly_records', JSON.stringify(r)); }
};

function toast(msg, time=2400){
  const el = document.createElement('div'); el.className='toast alert alert-success'; el.textContent=msg; document.body.appendChild(el);
  setTimeout(()=> el.classList.add('show'),20);
  setTimeout(()=> el.remove(), time);
}

function logout(){ Storage.clearSession(); window.location = 'index.html'; }

function requireAuth(role){
  const s = Storage.getCurrent();
  if (!s) { window.location = 'login.html'; return null; }
  if (role && s.role !== role){ window.location = (s.role==='admin'?'admin-panel.html':'farmer-dashboard.html'); return null; }
  return s;
}

// Registration
function handleRegister(e){
  e.preventDefault();
  const f = e.target;
  const name = f.name.value.trim();
  const email = f.email.value.trim().toLowerCase();
  const password = f.password.value;
  const role = f.role.value;
  const farm_details = f.farm_details.value || '';
  const contact = f.contact.value || '';
  const users = Storage.getUsers();
  if (users.find(u=>u.email===email)){ alert('Email already registered'); return; }
  const user = { id: Date.now(), name, email, password, role, farm_details, contact };
  users.push(user); Storage.saveUsers(users);
  Storage.setCurrent({ email, role, name });
  toast('Account created — welcome!');
  window.location = role==='admin' ? 'admin-panel.html' : 'farmer-dashboard.html';
}

// Login
function handleLogin(e){
  e.preventDefault();
  const f = e.target;
  const email = f.email.value.trim().toLowerCase();
  const password = f.password.value;
  const users = Storage.getUsers();
  const user = users.find(u=>u.email===email && u.password===password);
  if (!user){ alert('Invalid credentials'); return; }
  Storage.setCurrent({ email:user.email, role:user.role, name:user.name });
  toast('Signed in');
  window.location = user.role==='admin' ? 'admin-panel.html' : 'farmer-dashboard.html';
}

// Farmer dashboard
function renderFarmerDashboard(){
  const s = requireAuth('farmer'); if (!s) return;
  const users = Storage.getUsers();
  const user = users.find(u=>u.email===s.email) || {};
  document.getElementById('fd-name').textContent = user.name || '-';
  document.getElementById('fd-contact').textContent = user.contact || '-';
  document.getElementById('fd-farm').textContent = user.farm_details || '-';
  const loans = Storage.getLoans().filter(l=>l.email===s.email);
  const tbody = document.getElementById('fd-loans'); tbody.innerHTML='';
  loans.forEach(l=>{ const tr = document.createElement('tr'); tr.innerHTML = `<td>${l.amount}</td><td>${l.status}</td><td>${new Date(l.createdAt).toLocaleString()}</td>`; tbody.appendChild(tr); });
}

// Loan apply
function handleLoanApply(e){ e.preventDefault(); const f=e.target; const amount=f.amount.value; const reason=f.reason.value; const s=Storage.getCurrent(); if(!s){alert('Please login'); return;} const loans=Storage.getLoans(); loans.unshift({ id:Date.now(), email:s.email, amount, reason, status:'pending', createdAt:new Date().toISOString() }); Storage.saveLoans(loans); toast('Loan submitted'); window.location='farmer-dashboard.html'; }

// Portal records
function renderPortal(){ const s=requireAuth('farmer'); if(!s) return; const records=Storage.getRecords().filter(r=>r.email===s.email); const ul=document.getElementById('portal-list'); ul.innerHTML=''; records.forEach(r=>{ const li=document.createElement('li'); li.className='list-group-item'; li.innerHTML=`<strong>${new Date(r.createdAt).toLocaleString()}</strong>: ${r.data}`; ul.appendChild(li); }); document.getElementById('portal-count').textContent = records.length; }
function handleAddRecord(e){ e.preventDefault(); const f=e.target; const data=f.data.value.trim(); if(!data){alert('Enter data'); return;} const s=Storage.getCurrent(); const records=Storage.getRecords(); records.unshift({ id:Date.now(), email:s.email, data, createdAt:new Date().toISOString() }); Storage.saveRecords(records); toast('Record added'); window.location='farmer-portal.html'; }

// Admin
function renderAdminPanel(){ const s=requireAuth('admin'); if(!s) return; const users=Storage.getUsers(); const loans=Storage.getLoans(); const uf=document.getElementById('admin-users'); uf.innerHTML=''; users.filter(u=>u.role==='farmer').forEach(u=>{ const tr=document.createElement('tr'); tr.innerHTML=`<td>${u.name}</td><td>${u.email}</td><td>${u.contact||'-'}</td>`; uf.appendChild(tr); }); const lf=document.getElementById('admin-loans'); lf.innerHTML=''; loans.forEach(l=>{ const tr=document.createElement('tr'); const user = users.find(u=>u.email===l.email) || {}; tr.innerHTML=`<td>${user.name||l.email}</td><td>${l.amount}</td><td>${l.status}</td><td><button class="btn btn-sm btn-success me-1" onclick="adminApprove(${l.id})">Approve</button><button class="btn btn-sm btn-danger" onclick="adminReject(${l.id})">Reject</button></td>`; lf.appendChild(tr); }); }
function adminApprove(id){ const loans=Storage.getLoans(); const l=loans.find(x=>x.id===id); if(l){ l.status='approved'; Storage.saveLoans(loans); renderAdminPanel(); toast('Loan approved'); } }
function adminReject(id){ const loans=Storage.getLoans(); const l=loans.find(x=>x.id===id); if(l){ l.status='rejected'; Storage.saveLoans(loans); renderAdminPanel(); toast('Loan rejected'); } }

// Export / Import
function exportData(all=true){
  const payload = {
    users: Storage.getUsers(),
    loans: Storage.getLoans(),
    records: Storage.getRecords()
  };
  const data = JSON.stringify(payload, null, 2);
  const filename = `farmerly-export-${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.json`;
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  toast('Data exported');
}

function handleImportFile(e){
  const file = e.target.files && e.target.files[0];
  if (!file) return; const reader = new FileReader(); reader.onload = (ev)=>{
    try{
      const obj = JSON.parse(ev.target.result);
      if (obj.users) Storage.saveUsers(obj.users);
      if (obj.loans) Storage.saveLoans(obj.loans);
      if (obj.records) Storage.saveRecords(obj.records);
      toast('Data imported');
      // refresh if on admin
      if (document.getElementById('admin-users')) renderAdminPanel();
    }catch(err){ alert('Invalid file'); }
  }; reader.readAsText(file);
}

// Expose handlers
window.handleRegister=handleRegister; window.handleLogin=handleLogin; window.renderFarmerDashboard=renderFarmerDashboard; window.handleLoanApply=handleLoanApply; window.renderPortal=renderPortal; window.handleAddRecord=handleAddRecord; window.renderAdminPanel=renderAdminPanel; window.adminApprove=adminApprove; window.adminReject=adminReject; window.logout=logout; window.exportData=exportData; window.handleImportFile=handleImportFile;

// --- Theme (dark mode) ---
function applyTheme(name){
  if (name === 'dark') document.documentElement.classList.add('dark');
  else document.documentElement.classList.remove('dark');
  try{ localStorage.setItem('farmerly_theme', name); }catch(e){}
  const btn = document.getElementById('theme-toggle'); if (btn) btn.innerHTML = name==='dark' ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
}

function toggleTheme(){ const cur = localStorage.getItem('farmerly_theme') || 'light'; applyTheme(cur==='dark' ? 'light' : 'dark'); }

function initTheme(){
  const saved = localStorage.getItem('farmerly_theme');
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(saved || (prefersDark ? 'dark' : 'light'));
  const btn = document.getElementById('theme-toggle'); if (btn) btn.addEventListener('click', toggleTheme);
}

// --- Scroll reveal & counters ---
function initReveals(){
  const obs = new IntersectionObserver((entries)=>{
    entries.forEach(e=>{ if (e.isIntersecting) { e.target.classList.add('reveal'); obs.unobserve(e.target); } });
  }, { threshold: 0.12 });
  document.querySelectorAll('.feature-card, .hero-fade').forEach(el=>obs.observe(el));
  // counters
  document.querySelectorAll('.counter').forEach(el=>{
    obs.observe(el);
    el.dataset.animated = 'false';
  });
  obs.disconnect();
  // Counter animation on scroll
  const counterObs = new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{
      if (entry.isIntersecting && entry.target.dataset.animated==='false'){
        const el = entry.target; const to = parseInt(el.getAttribute('data-to')||'0',10);
        let i=0; const step = Math.max(1, Math.floor(to/60));
        const t = setInterval(()=>{ i+=step; if (i>=to){ el.textContent = to; clearInterval(t); el.dataset.animated='true'; } else el.textContent = i; }, 16);
      }
    });
  }, { threshold: 0.5 });
  document.querySelectorAll('.counter').forEach(el=>counterObs.observe(el));
}

// initialize UI extras
if (typeof window !== 'undefined'){
  window.addEventListener('DOMContentLoaded', ()=>{
    try { initTheme(); initReveals(); } catch(e){}
  });
}

// --- Lottie loader & micro-interactions ---
function loadLottieScript(cb){
  if (window.lottie) return cb && cb();
  const s = document.createElement('script');
  s.src = 'https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.9.6/lottie.min.js';
  s.onload = ()=> cb && cb();
  s.onerror = ()=> console.warn('Lottie failed to load');
  document.head.appendChild(s);
}

function initLottieAnimations(){
  loadLottieScript(()=>{
    try{
      if (document.getElementById('lottie-hero')){
        lottie.loadAnimation({ container: document.getElementById('lottie-hero'), renderer: 'svg', loop: true, autoplay: true, path: 'https://assets2.lottiefiles.com/packages/lf20_jcikwtux.json' });
      }
      if (document.getElementById('lottie-hero-2')){
        lottie.loadAnimation({ container: document.getElementById('lottie-hero-2'), renderer: 'svg', loop: true, autoplay: true, path: 'https://assets10.lottiefiles.com/packages/lf20_touohxv0.json' });
      }
    }catch(e){ console.error(e); }
  });
}

// initialize lottie after DOM ready
if (typeof window !== 'undefined'){
  window.addEventListener('DOMContentLoaded', ()=>{
    try{ initLottieAnimations(); }catch(e){}
  });
}
