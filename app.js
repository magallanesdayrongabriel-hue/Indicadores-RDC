// ═══════════════════════════════════════════════════════
// DATA STORE
// ═══════════════════════════════════════════════════════
var tableData = {
  carteras:      { cols:['Cartera','PRO 2026','OBJ','Variación %','Estado'],         editable:[0,1,2,3,4], rows:[['HORECA 1','1.10','1.00','+9.1%','✅ Cumplido'],['HORECA 3','1.03','1.00','+2.9%','✅ Cumplido'],['HORECA 4','1.04','1.00','+4.0%','✅ Cumplido'],['COMERCIO 2','1.27','1.00','+27.0%','✅ Cumplido'],['COMERCIO 5','1.32','1.00','+32.0%','✅ Cumplido']] },
  clima:         { cols:['Bimestre','PRO 2026','OBJ','Estado'],                      editable:[0,1,2,3],   rows:[['1er BIM','0.95','0.97','⚠ Bajo obj.'],['2do BIM','—','0.97','Pendiente']] },
  productividad: { cols:['Mes','PRO 2026','PRO 2025','OBJ','Tendencia'],              editable:[0,1,2,3,4], rows:[['Enero','0.86','0.70','—','↑ Mejora'],['Febrero','0.86','0.70','—','↑ Mejora'],['Marzo–Dic','—','0.70','—','Pendiente']] },
  conversion:    { cols:['Segmento','PRO 2026','OBJ','Variación %','Estado'],         editable:[0,1,2,3,4], rows:[['HORECA 1','0.49','0.60','-22.4%','⚠ Alerta'],['HORECA 3','0.35','0.60','-71.4%','🔴 Crítico'],['HORECA 4','0.27','0.60','—','🔴 Crítico'],['COMERCIO 2','0.27','0.50','—','🔴 Crítico'],['COMERCIO 5','0.26','0.50','—','🔴 Crítico']] },
  visitas:       { cols:['Segmento','2026','OBJ','Variación %'],                      editable:[0,1,2,3],   rows:[['HORECA 1','0.95','1.00','-5.3%'],['HORECA 3','0.88','1.00','-13.6%'],['HORECA 4','0.91','1.00','—'],['COMERCIO 2','0.96','1.00','—'],['COMERCIO 5','0.94','1.00','—'],['SCLI','0.94','1.00','—']] },
  ventas:        { cols:['Categoría','PRO 2026','OBJ','Estado'],                      editable:[0,1,2,3],   rows:[['FRESCOS','0.55','1.10','🔴 Crítico'],['MMCC','0.53','1.15','🔴 Crítico']] }
};
var tableIds = { carteras:'tbl-carteras', clima:'tbl-clima', productividad:'tbl-productividad', conversion:'tbl-conversion', visitas:'tbl-visitas', ventas:'tbl-ventas' };

// ═══════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════
// ─── Get values for a key, using monthlyData if a month is active ───
// Returns a READ-ONLY view of rows for a given key+month — NEVER modifies tableData
function getMonthAwareRows(key, forceMonth) {
  var mes = forceMonth !== undefined ? forceMonth
          : (typeof currentDashMonth !== 'undefined' ? currentDashMonth : 'todos');
  var td = tableData[key];
  if (!td) return [];
  // Always return deep copies — never mutate the original
  if (mes === 'todos' || !monthlyData[mes] || !monthlyData[mes][key]) {
    return td.rows.map(function(r){ return r.slice(); });
  }
  var mData = monthlyData[mes][key];
  return td.rows.map(function(baseRow) {
    var row = baseRow.slice(); // always a fresh copy
    var mSeg = mData[row[0]];
    if (mSeg) {
      if (mSeg.val !== undefined && !isNaN(mSeg.val)) row[1] = String(parseFloat(mSeg.val).toFixed(2));
      if (mSeg.obj !== undefined && !isNaN(mSeg.obj)) row[2] = String(parseFloat(mSeg.obj).toFixed(2));
    }
    return row;
  });
}

function rowAvgGlobal(key, col) {
  var rows = getMonthAwareRows(key);
  if (!rows) return 0;
  var s=0, n=0;
  rows.forEach(function(r){ var v=parseFloat(r[col]); if(!isNaN(v)){s+=v;n++;} });
  return n ? s/n : 0;
}

// ═══════════════════════════════════════════════════════
// NAVEGACIÓN
// ═══════════════════════════════════════════════════════
var sectionTitles = { tables:'Tablas de Datos', dashboard:'Dashboard', summary:'Resumen Ejecutivo', meses:'Seguimiento Mensual', comparacion:'Comparación por Mes' };

function navigate(view) {
  document.querySelectorAll('.view').forEach(function(v){ v.classList.remove('active'); });
  document.querySelectorAll('.nav-item').forEach(function(n){ n.classList.remove('active'); });
  document.getElementById('view-'+view).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(function(n){
    if (n.getAttribute('onclick') && n.getAttribute('onclick').indexOf("'"+view+"'") !== -1) n.classList.add('active');
  });
  document.getElementById('topbar-label').textContent = sectionTitles[view];
  if (view === 'dashboard')    { initCharts(); updateKPICards(); }
  if (view === 'summary')      { updateSummary(); }
  if (view === 'meses')        { initMeses(); }
  if (view === 'comparacion')  { initComparacion(); }
}

// ═══════════════════════════════════════════════════════
// FECHA
// ═══════════════════════════════════════════════════════
var daysArr   = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
var monthsArr = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
var now = new Date();
document.getElementById('date-chip').textContent = daysArr[now.getDay()]+' '+now.getDate()+' '+monthsArr[now.getMonth()]+' '+now.getFullYear();

// ═══════════════════════════════════════════════════════
// MODAL HELPERS
// ═══════════════════════════════════════════════════════
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
document.querySelectorAll('.modal-overlay').forEach(function(o){
  o.addEventListener('click', function(e){ if(e.target===o) o.classList.remove('open'); });
});

// ═══════════════════════════════════════════════════════
// RENDER TABLE
// ═══════════════════════════════════════════════════════
function computeEstado(pro, obj) {
  var p=parseFloat(pro), o=parseFloat(obj);
  if (isNaN(p)||isNaN(o)||o===0) return '<span style="color:var(--muted)">—</span>';
  var pct=(p/o)*100;
  return pct>=100
    ? '<span style="color:#17a55e;font-weight:700">✅ Cumplido ('+pct.toFixed(1)+'%)</span>'
    : '<span style="color:#cc3333;font-weight:700">❌ No cumplido ('+pct.toFixed(1)+'%)</span>';
}

function renderTableById(key) {
  var el = document.getElementById(tableIds[key]);
  if (!el) return;
  var tbody = el.querySelector('tbody');
  var td = tableData[key];
  var html = '';
  td.rows.forEach(function(row) {
    var processed = row.slice();
    if (key==='carteras') {
      var pro=parseFloat(row[1]), obj=parseFloat(row[2]);
      if (!isNaN(pro)&&!isNaN(obj)&&obj!==0) {
        processed[3] = (((pro-obj)/obj)*100>=0?'+':'')+(((pro-obj)/obj)*100).toFixed(1)+'%';
        processed[4] = computeEstado(pro,obj);
      }
    }
    html += '<tr>'+processed.map(function(c){ return '<td>'+c+'</td>'; }).join('')+'</tr>';
  });
  tbody.innerHTML = html;
}

// ═══════════════════════════════════════════════════════
// EDITAR TABLA
// ═══════════════════════════════════════════════════════
function openEditModal() {
  document.getElementById('edit-table-select').value='';
  document.getElementById('edit-rows-container').innerHTML='';
  document.getElementById('btn-save-edit').style.display='none';
  document.getElementById('modal-edit').classList.add('open');
}

function loadEditRows() {
  var key=document.getElementById('edit-table-select').value;
  var container=document.getElementById('edit-rows-container');
  var btnSave=document.getElementById('btn-save-edit');
  if (!key) { container.innerHTML=''; btnSave.style.display='none'; return; }
  var td=tableData[key];
  var html='<div style="overflow-x:auto;margin-top:12px;border:1px solid var(--border);border-radius:10px;overflow:hidden">';
  html+='<table class="edit-table"><thead><tr>';
  td.cols.forEach(function(c){ html+='<th style="color:var(--accent5)">'+c+' ✏️</th>'; });
  html+='</tr></thead><tbody>';
  td.rows.forEach(function(row,ri){
    html+='<tr>';
    row.forEach(function(cell,ci){
      html+='<td><input class="edit-input" data-row="'+ri+'" data-col="'+ci+'" value="'+cell.replace(/"/g,'&quot;')+'"></td>';
    });
    html+='</tr>';
  });
  html+='</tbody></table></div>';
  html+='<p style="font-size:.72rem;color:var(--muted);margin-top:8px">Edita cualquier celda y presiona Guardar Cambios.</p>';
  container.innerHTML=html;
  btnSave.style.display='inline-flex';
}

function saveEdit() {
  var key=document.getElementById('edit-table-select').value;
  if (!key) return;
  var td=tableData[key];
  document.querySelectorAll('#edit-rows-container .edit-input').forEach(function(inp){
    td.rows[parseInt(inp.dataset.row)][parseInt(inp.dataset.col)]=inp.value;
  });
  renderTableById(key);
  if (key==='carteras') { updateKPICards(); updateSummary(); }
  closeModal('modal-edit');
  showToast('💾 Tabla guardada correctamente');
}

// ═══════════════════════════════════════════════════════
// AGREGAR CUADROS
// ═══════════════════════════════════════════════════════
function openAddRowModal() {
  document.getElementById('addrow-table-select').value='';
  document.getElementById('addrow-form-container').innerHTML='';
  document.getElementById('btn-save-addrow').style.display='none';
  document.getElementById('modal-addrow').classList.add('open');
}

function addrowLiveEstado() {
  var v = parseFloat(document.getElementById('addrow-field-1') && document.getElementById('addrow-field-1').value);
  var o = parseFloat(document.getElementById('addrow-field-2') && document.getElementById('addrow-field-2').value);
  var estadoEl = document.getElementById('addrow-field-estado-preview');
  var estadoInp = document.getElementById('addrow-field-3');
  if (!estadoEl || !estadoInp) return;
  if (!isNaN(v) && !isNaN(o) && o !== 0) {
    var pct = (v / o) * 100;
    var ok = pct >= 100;
    var txt = ok ? 'Cumplido (' + pct.toFixed(1) + '%)' : 'No cumplido (' + pct.toFixed(1) + '%)';
    estadoInp.value = txt;
    estadoEl.textContent = txt;
    estadoEl.style.color = ok ? '#17a55e' : '#cc3333';
    estadoEl.style.fontWeight = '700';
    estadoEl.style.display = 'block';
  } else {
    estadoEl.style.display = 'none';
    if (estadoInp.value.match(/^(Cumplido|No cumplido)/)) estadoInp.value = '';
  }
}

function loadAddRowForm() {
  var key = document.getElementById('addrow-table-select').value;
  var container = document.getElementById('addrow-form-container');
  var btnSave = document.getElementById('btn-save-addrow');
  if (!key) { container.innerHTML=''; btnSave.style.display='none'; return; }
  var td = tableData[key];

  // Detect which columns are value/obj/estado by index convention
  var valCol  = 1;  // col index 1 = valor numérico
  var objCol  = 2;  // col index 2 = objetivo numérico
  var hasEstado = td.cols.length >= 4;

  var html = '<div style="margin-top:14px;padding:16px;background:var(--surface2);border:1px solid var(--border);border-radius:10px">';
  html += '<p style="font-size:.75rem;color:var(--muted);margin-bottom:14px;font-weight:600;text-transform:uppercase;letter-spacing:.06em">Nueva fila — completa los campos</p>';
  html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px">';

  td.cols.forEach(function(col, ci) {
    var isVal    = ci === valCol;
    var isObj    = ci === objCol;
    var isEstado = hasEstado && ci === td.cols.length - 1;
    var labelColor = isVal ? 'var(--accent1)' : isObj ? 'var(--accent5)' : isEstado ? 'var(--muted)' : 'var(--accent6)';
    var inputType  = (isVal || isObj) ? 'number' : 'text';
    var oninput    = (isVal || isObj) ? ' oninput="addrowLiveEstado()"' : '';
    var readonly   = isEstado ? ' readonly style="background:var(--surface);cursor:default;font-weight:600"' : '';

    html += '<div>';
    html += '<label style="font-size:.7rem;font-weight:600;color:'+labelColor+';text-transform:uppercase;letter-spacing:.06em;display:block;margin-bottom:5px">'+col+'</label>';
    html += '<input class="form-input" id="addrow-field-'+ci+'"'+(inputType==='number'?' type="number" step="0.01"':'')+oninput+readonly+' placeholder="'+(isEstado?'Auto...':col)+'">';
    if (isEstado) html += '<span id="addrow-field-estado-preview" style="display:none;font-size:.72rem;margin-top:4px"></span>';
    html += '</div>';
  });

  html += '</div></div>';
  html += '<p style="font-size:.72rem;color:var(--muted);margin-top:10px">La tabla tiene <strong>'+td.rows.length+'</strong> fila(s). Se agregará al final.</p>';
  container.innerHTML = html;
  btnSave.style.display = 'inline-flex';
}

function saveAddRow() {
  var key = document.getElementById('addrow-table-select').value;
  if (!key) return;
  var td = tableData[key];
  var newRow = [];
  td.cols.forEach(function(col, ci) {
    var inp = document.getElementById('addrow-field-' + ci);
    var val = inp ? inp.value.trim() : '—';
    // Auto-compute Estado for last col if val/obj are present
    var isEstado = td.cols.length >= 4 && ci === td.cols.length - 1;
    if (isEstado) {
      var v = parseFloat(document.getElementById('addrow-field-1') && document.getElementById('addrow-field-1').value);
      var o = parseFloat(document.getElementById('addrow-field-2') && document.getElementById('addrow-field-2').value);
      if (!isNaN(v) && !isNaN(o) && o !== 0) {
        var pct = (v / o) * 100;
        val = pct >= 100 ? 'Cumplido (' + pct.toFixed(1) + '%)' : 'No cumplido (' + pct.toFixed(1) + '%)';
      }
    }
    newRow.push(val || '—');
  });
  td.rows.push(newRow);
  renderTableById(key);
  if (key === 'carteras') { updateKPICards(); updateSummary(); }
  loadAddRowForm();
  showToast('✅ Fila agregada a ' + document.getElementById('addrow-table-select').options[document.getElementById('addrow-table-select').selectedIndex].text);
}

// ═══════════════════════════════════════════════════════
// CREAR TABLA con inputs dinámicos y gráfico automático
// ═══════════════════════════════════════════════════════
var selectedColor    = 'var(--accent1)';
var selectedColorHex = '#2e74e8';
var rowCounter = 0;
var colorHexMap = {
  'var(--accent1)':'#2e74e8','var(--accent2)':'#e8622a','var(--accent3)':'#17a55e',
  'var(--accent4)':'#9b4fd4','var(--accent5)':'#c89a00','var(--accent6)':'#0fa8cc'
};

function selectColor(el) {
  document.querySelectorAll('.color-opt').forEach(function(o){ o.classList.remove('selected'); });
  el.classList.add('selected');
  selectedColor    = el.getAttribute('data-color');
  selectedColorHex = colorHexMap[selectedColor]||'#2e74e8';
}

function liveEstado(inp) {
  var rowDiv=inp.closest('[id^="drow-"]');
  if (!rowDiv) return;
  var v=parseFloat(rowDiv.querySelector('[data-col="1"]').value);
  var o=parseFloat(rowDiv.querySelector('[data-col="2"]').value);
  var estadoInp=rowDiv.querySelector('[data-col="3"]');
  if (!estadoInp) return;
  if (!isNaN(v)&&!isNaN(o)&&o!==0) {
    var pct=(v/o)*100;
    estadoInp.value = pct>=100 ? 'Cumplido ('+pct.toFixed(1)+'%)' : 'No cumplido ('+pct.toFixed(1)+'%)';
    estadoInp.style.color      = pct>=100 ? '#17a55e' : '#cc3333';
    estadoInp.style.fontWeight = '700';
  } else {
    estadoInp.value=''; estadoInp.style.color=''; estadoInp.style.fontWeight='';
  }
}

function openCreateModal() {
  ['new-table-name','new-table-desc','new-col1','new-col2','new-col3','new-col4'].forEach(function(id){
    document.getElementById(id).value='';
  });
  selectedColor='var(--accent1)'; selectedColorHex='#2e74e8'; rowCounter=0;
  document.querySelectorAll('.color-opt').forEach(function(o,i){ o.classList.toggle('selected',i===0); });
  document.getElementById('dynamic-rows-container').innerHTML='';
  document.getElementById('dynamic-rows-section').style.display='none';
  document.getElementById('modal-create').classList.add('open');
}

function rebuildRowInputs() {
  var c1=document.getElementById('new-col1').value.trim()||'Col 1';
  var c2=document.getElementById('new-col2').value.trim()||'Col 2';
  var c3=document.getElementById('new-col3').value.trim()||'Col 3';
  var c4=document.getElementById('new-col4').value.trim()||'Col 4';
  var section=document.getElementById('dynamic-rows-section');
  section.style.display='block';
  var container=document.getElementById('dynamic-rows-container');
  var headers=container.querySelectorAll('.col-header');
  if (headers.length===4) { headers[0].textContent=c1; headers[1].textContent=c2; headers[2].textContent=c3; headers[3].textContent=c4; }
  if (container.children.length===0) addNewRowInput();
}

function addNewRowInput() {
  var c1=document.getElementById('new-col1').value.trim()||'Col 1';
  var c2=document.getElementById('new-col2').value.trim()||'Col 2';
  var c3=document.getElementById('new-col3').value.trim()||'Col 3';
  var c4=document.getElementById('new-col4').value.trim()||'Col 4';
  document.getElementById('dynamic-rows-section').style.display='block';
  var id=++rowCounter;
  var div=document.createElement('div');
  div.id='drow-'+id;
  div.style.cssText='background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:12px 14px;margin-bottom:10px;animation:fadeIn .2s ease';
  div.innerHTML=
    '<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr 32px;gap:8px;align-items:center">'+
    '<div><span class="col-header" style="font-size:.68rem;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;display:block;margin-bottom:4px">'+c1+'</span>'+
    '<input class="form-input" style="padding:6px 9px;font-size:.82rem" placeholder="Nombre..." data-col="0"></div>'+
    '<div><span class="col-header" style="font-size:.68rem;font-weight:600;color:var(--accent1);text-transform:uppercase;letter-spacing:.05em;display:block;margin-bottom:4px">'+c2+'</span>'+
    '<input class="form-input" style="padding:6px 9px;font-size:.82rem" placeholder="0.00" type="number" step="0.01" data-col="1" oninput="liveEstado(this)"></div>'+
    '<div><span class="col-header" style="font-size:.68rem;font-weight:600;color:var(--accent5);text-transform:uppercase;letter-spacing:.05em;display:block;margin-bottom:4px">'+c3+'</span>'+
    '<input class="form-input" style="padding:6px 9px;font-size:.82rem" placeholder="0.00" type="number" step="0.01" data-col="2" oninput="liveEstado(this)"></div>'+
    '<div><span class="col-header" style="font-size:.68rem;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;display:block;margin-bottom:4px">'+c4+'</span>'+
    '<input class="form-input" style="padding:6px 9px;font-size:.82rem" placeholder="Auto..." data-col="3"></div>'+
    '<button onclick="removeRow('+id+')" style="background:rgba(220,60,60,.1);border:1px solid rgba(220,60,60,.2);color:#cc3333;border-radius:6px;cursor:pointer;padding:4px 8px;font-size:.9rem;margin-top:18px;transition:all .2s">✕</button>'+
    '</div>';
  document.getElementById('dynamic-rows-container').appendChild(div);
}

function removeRow(id) { var el=document.getElementById('drow-'+id); if(el) el.remove(); }

function saveCreate() {
  var name =document.getElementById('new-table-name').value.trim();
  var desc =document.getElementById('new-table-desc').value.trim();
  var col1 =document.getElementById('new-col1').value.trim()||'Ítem';
  var col2 =document.getElementById('new-col2').value.trim()||'Valor';
  var col3 =document.getElementById('new-col3').value.trim()||'OBJ';
  var col4 =document.getElementById('new-col4').value.trim()||'Estado';
  if (!name) { showToast('⚠ Escribe un nombre'); return; }

  var parsedRows=[];
  document.querySelectorAll('#dynamic-rows-container > div').forEach(function(rowDiv){
    var inputs=rowDiv.querySelectorAll('input');
    var row=[];
    inputs.forEach(function(inp){ row.push(inp.value.trim()||'—'); });
    if (row.length===4&&row[0]!=='—') parsedRows.push(row);
  });

  var ts=Date.now();
  var tblId='tbl-custom-'+ts;
  var chartId='chart-custom-'+ts;
  var key='custom_'+ts;

  var rowsHtml=parsedRows.length
    ? parsedRows.map(function(r){
        var estado=r[3];
        var v=parseFloat(r[1]),o=parseFloat(r[2]);
        if (!isNaN(v)&&!isNaN(o)&&o!==0) {
          var pct=(v/o)*100;
          estado=pct>=100
            ? '<span style="color:#17a55e;font-weight:700">✅ Cumplido ('+pct.toFixed(1)+'%)</span>'
            : '<span style="color:#cc3333;font-weight:700">❌ No cumplido ('+pct.toFixed(1)+'%)</span>';
        }
        return '<tr><td>'+r[0]+'</td><td>'+r[1]+'</td><td>'+r[2]+'</td><td>'+estado+'</td></tr>';
      }).join('')
    : '<tr><td colspan="4" style="text-align:center;color:var(--muted);padding:20px">Sin filas — usa Agregar Cuadros</td></tr>';

  var cardHtml='<div class="table-card" style="animation:fadeIn .3s ease">'
    +'<div class="table-card-header">'
    +'<div class="table-card-title"><span class="dot" style="background:'+selectedColor+'"></span>'+name+(desc?' — '+desc:'')+'</div>'
    +'<span class="pill" style="background:rgba(107,230,160,.15);color:var(--accent3)">NUEVA</span>'
    +'</div>'
    +'<table id="'+tblId+'"><thead><tr>'
    +'<th>'+col1+'</th><th>'+col2+'</th><th>'+col3+'</th><th>'+col4+'</th>'
    +'</tr></thead><tbody>'+rowsHtml+'</tbody></table></div>';
  document.getElementById('custom-tables-container').insertAdjacentHTML('beforeend', cardHtml);

  var labels=parsedRows.map(function(r){ return r[0]; });
  var vals  =parsedRows.map(function(r){ return parseFloat(r[1])||0; });
  var objs  =parsedRows.map(function(r){ return parseFloat(r[2])||null; });
  var hexColor=selectedColorHex;

  var chartHtml='<div class="chart-grid full" style="animation:fadeIn .4s ease">'
    +'<div class="chart-card">'
    +'<div class="chart-card-title"><span class="dot" style="background:'+selectedColor+'"></span>'+name+'</div>'
    +'<div class="chart-card-sub">'+(desc||col2+' vs '+col3)+'</div>'
    +'<div style="position:relative;height:220px"><canvas id="'+chartId+'"></canvas></div>'
    +'</div></div>';
  document.getElementById('custom-charts-container').insertAdjacentHTML('beforeend', chartHtml);

  setTimeout(function(){
    var ctx=document.getElementById(chartId);
    if (!ctx) return;
    var def={
      responsive:true, maintainAspectRatio:false,
      animation:{ duration:800, easing:'easeInOutQuart', delay:function(ctx){ return ctx.dataIndex*60; } },
      plugins:{
        legend:{ display:false },
        tooltip:{ backgroundColor:'#fff', borderColor:'#e2e6f0', borderWidth:1, titleColor:'#1a1f2e', bodyColor:'#5a6070', padding:10, cornerRadius:8 }
      },
      scales:{
        x:{ ticks:{ color:'#8490a8', font:{size:11} }, grid:{ color:'rgba(226,230,240,0.6)' }, border:{ dash:[4,4] } },
        y:{ ticks:{ color:'#8490a8', font:{size:11}, callback:function(v){ return v.toFixed(2); } }, grid:{ color:'rgba(226,230,240,0.6)' }, border:{ dash:[4,4] } }
      }
    };
    var datasets=[{ label:col2, data:vals,
      backgroundColor: vals.map(function(v,i){ var o=objs[i]; return o?(v>=o?hexColor+'99':'#cc333399'):hexColor+'99'; }),
      borderColor: vals.map(function(v,i){ var o=objs[i]; return o?(v>=o?hexColor:'#cc3333'):hexColor; }),
      borderWidth:2, borderRadius:6, maxBarThickness:36 }];
    if (objs.some(function(v){ return v!==null; })) {
      datasets.push({ type:'line', label:col3, data:objs, borderColor:'#aaa', borderWidth:2,
        borderDash:[5,3], pointRadius:4, fill:false, tension:0 });
    }
    chartInstances['ck_'+chartId]=new Chart(ctx, { type:'bar', data:{ labels:labels, datasets:datasets }, options:def });
  }, 80);

  tableData[key]={ cols:[col1,col2,col3,col4], editable:[0,1,2,3], rows:parsedRows.length?parsedRows:[], chartId:chartId, hexColor:hexColor };
  tableIds[key]=tblId;

  ['edit-table-select','addrow-table-select'].forEach(function(selId){
    var opt=document.createElement('option');
    opt.value=key; opt.textContent=name;
    document.getElementById(selId).appendChild(opt);
  });

  closeModal('modal-create');
  setTimeout(function(){
    navigate('dashboard');
    reRenderCustomCharts();
    updateKPICards();
    updateSummary();
  }, 100);
  showToast('✅ Tabla "'+name+'" creada — gráfico en Dashboard');
}

// ═══════════════════════════════════════════════════════
// DASHBOARD — GRÁFICOS
// ═══════════════════════════════════════════════════════
var chartInstances = {};
var currentDashMonth = 'todos';

function onDashMonthChange() {
  var sel = document.getElementById('dash-month-select');
  currentDashMonth = sel ? sel.value : 'todos';
  // Sync table month filter too
  if (currentDashMonth !== 'todos') {
    var tabBtn = document.querySelector('#table-month-tabs .month-tab[onclick*="' + currentDashMonth + '"]');
    filterTablesByMonth(currentDashMonth, tabBtn);
    // Update sub
    var sub = document.getElementById('dash-sub');
    if (sub) sub.textContent = 'Visualización gráfica · ' + currentDashMonth + ' 2026';
  } else {
    var tabBtn2 = document.querySelector('#table-month-tabs .month-tab');
    filterTablesByMonth('todos', tabBtn2);
    var sub2 = document.getElementById('dash-sub');
    if (sub2) sub2.textContent = 'Visualización gráfica · 2026';
  }
  initCharts();
  updateKPICards();
  updateSummary();
}

function getChartData(key, labelCol, valueCol, objCol) {
  var rows = getMonthAwareRows(key);
  var labels=[], vals=[], objs=[];
  rows.forEach(function(row){
    var v=parseFloat(row[valueCol]), o=parseFloat(row[objCol]);
    if (!isNaN(v)) { labels.push(row[labelCol]); vals.push(v); objs.push(isNaN(o)?null:o); }
  });
  return { labels:labels, vals:vals, objs:objs };
}

function initCharts() {
  ['c1','c2','c3','c4','c5'].forEach(function(k){
    if (chartInstances[k]) { chartInstances[k].destroy(); delete chartInstances[k]; }
  });

  var animDef = { duration:900, easing:'easeInOutQuart', delay:function(ctx){ return ctx.dataIndex*60; } };

  function mkTooltip() {
    return { backgroundColor:'#fff', borderColor:'#e2e6f0', borderWidth:1,
      titleColor:'#1a1f2e', bodyColor:'#5a6070', padding:10, cornerRadius:8,
      callbacks:{ label:function(ctx){
        var objDs = ctx.chart.data.datasets[1];
        var pct = '';
        if (objDs && ctx.datasetIndex===0 && objDs.data) {
          var o = objDs.data[ctx.dataIndex];
          if (o) pct = ' ('+((ctx.raw/o)*100).toFixed(1)+'% OBJ)';
        }
        return ' '+ctx.dataset.label+': '+ctx.raw.toFixed(2)+pct;
      }}
    };
  }

  function mkScales() {
    return {
      x:{ ticks:{color:'#8490a8',font:{size:11}}, grid:{color:'rgba(226,230,240,0.6)'}, border:{dash:[4,4]} },
      y:{ ticks:{color:'#8490a8',font:{size:11},callback:function(v){return v.toFixed(2);}}, grid:{color:'rgba(226,230,240,0.6)'}, border:{dash:[4,4]} }
    };
  }

  function mkLegend(canvasId, datasets) {
    var card = document.getElementById(canvasId); if (!card) return;
    card = card.closest('.chart-card'); if (!card) return;
    var existing = card.querySelector('.chart-legend'); if (existing) existing.remove();
    var sub = card.querySelector('.chart-card-sub'); if (!sub) return;
    var div = document.createElement('div');
    div.className = 'chart-legend';
    div.style.cssText = 'display:flex;gap:14px;flex-wrap:wrap;margin-bottom:10px;font-size:11px;color:#5a6070';
    datasets.forEach(function(ds){
      var color = Array.isArray(ds.borderColor) ? ds.borderColor[0] : (ds.borderColor || '#aaa');
      var s = document.createElement('span');
      s.style.cssText = 'display:flex;align-items:center;gap:5px';
      var dash = ds.borderDash ? 'border-top:2px dashed '+color+';width:14px;height:0' : 'width:10px;height:10px;border-radius:2px;background:'+color;
      s.innerHTML = '<span style="'+dash+'"></span>'+ds.label;
      div.appendChild(s);
    });
    sub.parentNode.insertBefore(div, sub.nextSibling);
  }

  // ── C1: Carteras — horizontal bar, color por cumplimiento ──
  var dc = getChartData('carteras',0,1,2);
  var c1Ds = [
    { label:'PRO 2026', data:dc.vals,
      backgroundColor:dc.vals.map(function(v,i){ return (v>=(dc.objs[i]||1))?'rgba(23,165,94,0.75)':'rgba(204,51,51,0.7)'; }),
      borderColor:dc.vals.map(function(v,i){ return (v>=(dc.objs[i]||1))?'#17a55e':'#cc3333'; }),
      borderWidth:2, borderRadius:5, maxBarThickness:24 },
    { label:'OBJ', data:dc.objs, backgroundColor:'rgba(180,180,180,0.2)',
      borderColor:'#bbb', borderWidth:1.5, borderRadius:5, maxBarThickness:24 }
  ];
  chartInstances.c1 = new Chart(document.getElementById('chart-carteras'),{
    type:'bar',
    data:{ labels:dc.labels, datasets:c1Ds },
    options:{ responsive:true, maintainAspectRatio:false, animation:animDef,
      indexAxis:'y',
      plugins:{ legend:{display:false}, tooltip:mkTooltip() },
      scales:{
        x:{ ticks:{color:'#8490a8',font:{size:11},callback:function(v){return v.toFixed(2);}}, grid:{color:'rgba(226,230,240,0.6)'}, border:{dash:[4,4]} },
        y:{ ticks:{color:'#1a1f2e',font:{size:11,weight:'500'}}, grid:{display:false}, border:{display:false} }
      }
    }
  });
  mkLegend('chart-carteras', c1Ds);

  // ── C2: Conversión — bar + line overlay ──
  var dconv = getChartData('conversion',0,1,2);
  var c2Ds = [
    { type:'bar', label:'PRO 2026', data:dconv.vals,
      backgroundColor:'rgba(155,79,212,0.65)', borderColor:'#9b4fd4',
      borderWidth:2, borderRadius:5, maxBarThickness:32, yAxisID:'y' },
    { type:'line', label:'OBJ', data:dconv.objs,
      borderColor:'#e8622a', borderWidth:2.5, borderDash:[6,3],
      pointRadius:5, pointBackgroundColor:'#e8622a',
      fill:false, tension:0, yAxisID:'y' }
  ];
  chartInstances.c2 = new Chart(document.getElementById('chart-conversion'),{
    type:'bar',
    data:{ labels:dconv.labels, datasets:c2Ds },
    options:{ responsive:true, maintainAspectRatio:false, animation:animDef,
      plugins:{ legend:{display:false}, tooltip:mkTooltip() }, scales:mkScales() }
  });
  mkLegend('chart-conversion', c2Ds);

  // ── C3: Visitas — donut si ≤6, barras si más ──
  var dv = getChartData('visitas',0,1,2);
  var visColors = ['#2e74e8','#17a55e','#c89a00','#9b4fd4','#e8622a','#0fa8cc'];
  var isDoughnut = dv.vals.length <= 6;
  var c3Ds = isDoughnut
    ? [{ label:'Visitas 2026', data:dv.vals,
        backgroundColor:visColors.slice(0,dv.vals.length).map(function(c){ return c+'cc'; }),
        borderColor:visColors.slice(0,dv.vals.length),
        borderWidth:2, hoverOffset:10 }]
    : [
        { label:'2026', data:dv.vals, backgroundColor:'rgba(200,154,0,0.65)',
          borderColor:'#c89a00', borderWidth:2, borderRadius:5, maxBarThickness:32 },
        { label:'OBJ', data:dv.objs, backgroundColor:'rgba(180,180,180,0.2)',
          borderColor:'#bbb', borderWidth:1.5, borderRadius:5, maxBarThickness:32 }
      ];
  chartInstances.c3 = new Chart(document.getElementById('chart-visitas'),{
    type: isDoughnut ? 'doughnut' : 'bar',
    data:{ labels:dv.labels, datasets:c3Ds },
    options: isDoughnut
      ? { responsive:true, maintainAspectRatio:false, animation:animDef, cutout:'60%',
          plugins:{ legend:{display:false},
            tooltip:{ backgroundColor:'#fff', borderColor:'#e2e6f0', borderWidth:1,
              titleColor:'#1a1f2e', bodyColor:'#5a6070', padding:10, cornerRadius:8,
              callbacks:{ label:function(ctx){ return ' '+ctx.label+': '+ctx.raw.toFixed(2)+' (OBJ 1.00)'; } }
            }
          }
        }
      : { responsive:true, maintainAspectRatio:false, animation:animDef,
          plugins:{ legend:{display:false}, tooltip:mkTooltip() }, scales:mkScales() }
  });
  if (isDoughnut) {
    var visDs2 = visColors.slice(0,dv.vals.length).map(function(c,i){ return { label:dv.labels[i], borderColor:c }; });
    mkLegend('chart-visitas', visDs2);
  } else {
    mkLegend('chart-visitas', c3Ds);
  }

  // ── C4: Productividad — área con fill ──
  var labels12=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  var mMap={'Enero':0,'Febrero':1,'Marzo':2,'Abril':3,'Mayo':4,'Junio':5,'Julio':6,'Agosto':7,'Setiembre':8,'Octubre':9,'Noviembre':10,'Diciembre':11};
  var p26=Array(12).fill(null), p25=Array(12).fill(null);
  getMonthAwareRows('productividad').forEach(function(r){
    var idx=mMap[r[0]]; if(idx!==undefined){
      var v26=parseFloat(r[1]),v25=parseFloat(r[2]);
      if(!isNaN(v26)) p26[idx]=v26; if(!isNaN(v25)) p25[idx]=v25;
    }
  });
  var c4Ds = [
    { label:'PRO 2026', data:p26, borderColor:'#17a55e', backgroundColor:'rgba(23,165,94,0.12)',
      tension:0.4, fill:true, pointRadius:5, pointBackgroundColor:'#fff',
      pointBorderColor:'#17a55e', pointBorderWidth:2, pointHoverRadius:7 },
    { label:'PRO 2025', data:p25, borderColor:'#8490a8', backgroundColor:'transparent',
      tension:0.4, borderDash:[5,4], pointRadius:3, pointBackgroundColor:'#8490a8' }
  ];
  chartInstances.c4 = new Chart(document.getElementById('chart-prod'),{
    type:'line',
    data:{ labels:labels12, datasets:c4Ds },
    options:{ responsive:true, maintainAspectRatio:false, animation:animDef,
      plugins:{ legend:{display:false}, tooltip:mkTooltip() }, scales:mkScales() }
  });
  mkLegend('chart-prod', c4Ds);

  // ── C5: Radar ──
  var radarData=[
    rowAvgGlobal('carteras',1)/(rowAvgGlobal('carteras',2)||1)*100,
    rowAvgGlobal('clima',1)/0.97*100,
    rowAvgGlobal('productividad',1)/(rowAvgGlobal('productividad',2)||0.70)*100,
    rowAvgGlobal('conversion',1)/(rowAvgGlobal('conversion',2)||0.56)*100,
    rowAvgGlobal('visitas',1)*100,
    rowAvgGlobal('ventas',1)/(rowAvgGlobal('ventas',2)||1.13)*100
  ].map(function(v){ return parseFloat(v.toFixed(1)); });

  chartInstances.c5 = new Chart(document.getElementById('chart-radar'),{
    type:'radar',
    data:{
      labels:['Carteras','Clima Mandela','Productividad','Conversión','Visitas','Ventas'],
      datasets:[
        { label:'Cumplimiento (%)', data:radarData,
          backgroundColor:'rgba(46,116,232,0.12)', borderColor:'#2e74e8',
          borderWidth:2, pointBackgroundColor:'#2e74e8', pointRadius:4, pointHoverRadius:6 },
        { label:'Objetivo (100%)', data:[100,100,100,100,100,100],
          backgroundColor:'rgba(150,150,150,0.06)', borderColor:'rgba(150,150,150,0.4)',
          borderDash:[5,4], borderWidth:1.5, pointRadius:0 }
      ]
    },
    options:{
      responsive:true, maintainAspectRatio:false, animation:animDef,
      plugins:{ legend:{display:false},
        tooltip:{ backgroundColor:'#fff', borderColor:'#e2e6f0', borderWidth:1,
          titleColor:'#1a1f2e', bodyColor:'#5a6070', padding:10, cornerRadius:8 }
      },
      scales:{ r:{
        min:0, max:130,
        ticks:{ stepSize:25, color:'#8490a8', backdropColor:'transparent', font:{size:10} },
        grid:{ color:'rgba(226,230,240,0.7)' },
        pointLabels:{ color:'#1a1f2e', font:{size:12,weight:'500'} },
        angleLines:{ color:'rgba(226,230,240,0.7)' }
      }}
    }
  });
}

function reRenderCustomCharts() {
  Object.keys(tableData).forEach(function(key){
    if (!key.startsWith('custom_')) return;
    var td=tableData[key]; if (!td.chartId) return;
    var ctx=document.getElementById(td.chartId); if (!ctx) return;
    var ck='ck_'+td.chartId;
    if (chartInstances[ck]) { chartInstances[ck].destroy(); delete chartInstances[ck]; }
    var labels=td.rows.map(function(r){ return r[0]; });
    var vals  =td.rows.map(function(r){ return parseFloat(r[1])||0; });
    var objs  =td.rows.map(function(r){ return parseFloat(r[2])||null; });
    var hexColor=td.hexColor||'#2e74e8';
    var datasets=[{
      label:td.cols[1], data:vals,
      backgroundColor: vals.map(function(v,i){ var o=objs[i]; return o ? (v>=o ? hexColor+'99' : '#cc333399') : hexColor+'99'; }),
      borderColor: vals.map(function(v,i){ var o=objs[i]; return o ? (v>=o ? hexColor : '#cc3333') : hexColor; }),
      borderWidth:2, borderRadius:6, maxBarThickness:32
    }];
    if (objs.some(function(v){ return v!==null; })) {
      datasets.push({ type:'line', label:td.cols[2], data:objs,
        borderColor:'#aaa', borderWidth:2, borderDash:[5,3],
        pointRadius:4, fill:false, tension:0 });
    }
    var def={
      responsive:true, maintainAspectRatio:false,
      animation:{ duration:800, easing:'easeInOutQuart', delay:function(ctx){ return ctx.dataIndex*60; } },
      plugins:{
        legend:{display:false},
        tooltip:{ backgroundColor:'#fff', borderColor:'#e2e6f0', borderWidth:1,
          titleColor:'#1a1f2e', bodyColor:'#5a6070', padding:10, cornerRadius:8 }
      },
      scales:{
        x:{ticks:{color:'#8490a8',font:{size:11}},grid:{color:'rgba(226,230,240,0.6)'},border:{dash:[4,4]}},
        y:{ticks:{color:'#8490a8',font:{size:11},callback:function(v){return v.toFixed(2);}},grid:{color:'rgba(226,230,240,0.6)'},border:{dash:[4,4]}}
      }
    };
    chartInstances[ck]=new Chart(ctx, { type:'bar', data:{ labels:labels, datasets:datasets }, options:def });
  });
}

// ═══════════════════════════════════════════════════════
// KPI CARDS — dinámicas
// ═══════════════════════════════════════════════════════
function updateKPICards() {
  var grid=document.getElementById('kpi-grid'); if (!grid) return;
  var colors=['var(--accent1)','var(--accent2)','var(--accent3)','var(--accent4)','var(--accent5)','var(--accent6)'];
  var ci=0;
  function nc(){ return colors[ci++%colors.length]; }
  function card(label,value,sub,trend,up,color){
    return '<div class="kpi-card" style="border-top:3px solid '+color+'">'
      +'<div class="kpi-label">'+label+'</div>'
      +'<div class="kpi-value" style="color:'+color+'">'+value+'</div>'
      +'<div class="kpi-sub">'+sub+'</div>'
      +'<div class="kpi-trend '+(up?'up':'down')+'">'+trend+'</div>'
      +'</div>';
  }
  var html='';
  // Carteras
  var tdC=tableData['carteras'];
  var cartRows=getMonthAwareRows('carteras');
  var cumpl=cartRows.filter(function(r){ var p=parseFloat(r[1]),o=parseFloat(r[2])||1; return !isNaN(p)&&p>=o; }).length;
  var c=nc();
  html+=card('Carteras Activas',cumpl,cumpl+' de '+cartRows.length+' sobre objetivo',cumpl===cartRows.length?'↑ Todas cumplen OBJ':'↓ '+cumpl+'/'+cartRows.length+' cumplen',cumpl===tdC.rows.length,c);
  // Clima
  var climaV=rowAvgGlobal('clima',1); var climaD=((climaV/0.97)-1)*100; c=nc();
  html+=card('Clima Mandela',climaV.toFixed(2),'OBJ: 0.97',(climaD>=0?'↑ +':'↓ ')+climaD.toFixed(1)+'% vs OBJ',climaD>=0,c);
  // Productividad
  var pv26=rowAvgGlobal('productividad',1)||0.86; var pv25=rowAvgGlobal('productividad',2)||0.70; var pm=pv25?((pv26-pv25)/pv25)*100:0; c=nc();
  html+=card('Productividad Media',pv26.toFixed(2),'vs '+pv25.toFixed(2)+' en 2025','↑ +'+(pm.toFixed(1))+'% vs año anterior',true,c);
  // Conversión
  var convV=rowAvgGlobal('conversion',1); var convO=rowAvgGlobal('conversion',2)||0.56; var convD=((convV/convO)-1)*100; c=nc();
  html+=card('Conversión Media',convV.toFixed(2),'OBJ: '+convO.toFixed(2),(convD>=0?'↑ +':'↓ ')+convD.toFixed(1)+'% vs OBJ',convD>=0,c);
  // Visitas
  var visV=rowAvgGlobal('visitas',1); var visD=(visV-1)*100; c=nc();
  html+=card('Visitas Diarias Prom.',visV.toFixed(2),'OBJ: 1.00',(visD>=0?'↑ +':'↓ ')+visD.toFixed(1)+'% vs OBJ',visD>=0,c);
  // Ventas
  var ventV=rowAvgGlobal('ventas',1); var ventO=rowAvgGlobal('ventas',2)||1.13; var ventD=((ventV/ventO)-1)*100; c=nc();
  html+=card('Ventas Promedio',ventV.toFixed(2),'OBJ: '+ventO.toFixed(2),(ventD>=0?'↑ +':'↓ ')+ventD.toFixed(1)+'% vs OBJ',ventD>=0,c);
  // Custom tables
  Object.keys(tableData).forEach(function(key){
    if (!key.startsWith('custom_')) return;
    var td=tableData[key]; if (!td.rows.length) return;
    var avg=rowAvgGlobal(key,1); var obj=rowAvgGlobal(key,2)||1;
    var diff=((avg/obj)-1)*100;
    var cx=td.hexColor||nc();
    html+=card(td.cols[0]||key,avg.toFixed(2),obj?'OBJ: '+obj.toFixed(2):td.cols[1]+' prom.',(diff>=0?'↑ +':'↓ ')+diff.toFixed(1)+'% vs OBJ',diff>=0,cx);
  });
  grid.innerHTML=html;
}

// ═══════════════════════════════════════════════════════
// UPDATE SUMMARY — dinámico
// ═══════════════════════════════════════════════════════
function updateSummary() {
  var semaforo=document.getElementById('semaforo-tbody'); if (!semaforo) return;
  var summGrid=document.getElementById('summary-grid');

  function badge(pct,label){
    if (pct>=100) return '<span class="pill pill-up">🟢 '+label+' ('+pct.toFixed(1)+'%)</span>';
    if (pct>=90)  return '<span class="pill" style="background:rgba(200,154,0,.12);color:var(--accent5)">🟡 '+label+' ('+pct.toFixed(1)+'%)</span>';
    return '<span class="pill pill-down">🔴 '+label+' ('+pct.toFixed(1)+'%)</span>';
  }
  function pBar(pct,color){
    return '<div class="progress-bar"><div class="progress-fill" style="width:'+Math.min(pct,100).toFixed(1)+'%;background:'+color+'"></div></div>';
  }
  function bar(label,pct,color){
    return '<div class="progress-label"><span>'+label+'</span><span>'+pct.toFixed(1)+'%</span></div>'+pBar(pct,color)+'<div style="margin-top:5px"></div>';
  }

  var cartA=rowAvgGlobal('carteras',1); var cartO=rowAvgGlobal('carteras',2)||1; var cartP=(cartA/cartO)*100;
  var climA=rowAvgGlobal('clima',1);   var climP=climA?(climA/0.97)*100:0;
  var convA=rowAvgGlobal('conversion',1); var convO=rowAvgGlobal('conversion',2)||0.56; var convP=(convA/convO)*100;
  var visA =rowAvgGlobal('visitas',1); var visP=visA*100;
  var ventA=rowAvgGlobal('ventas',1); var ventO=rowAvgGlobal('ventas',2)||1.13; var ventP=(ventA/ventO)*100;
  var pv26=rowAvgGlobal('productividad',1)||0.86; var pv25=rowAvgGlobal('productividad',2)||0.70;
  var prodMej=pv25?((pv26-pv25)/pv25)*100:0;

  // semáforo rows
  var sRows=[
    ['Carteras (prom.)',   cartA.toFixed(2), cartO.toFixed(2), cartP.toFixed(1)+'%',  badge(cartP,'CARTERAS')],
    ['Clima Mandela',      climA.toFixed(2), '0.97',          climP.toFixed(1)+'%',  badge(climP,'CLIMA')],
    ['Productividad',      pv26.toFixed(2),  '—',             (prodMej>=0?'+':'')+prodMej.toFixed(1)+'% vs 2025', badge(100+prodMej,'PRODUCTIVIDAD')],
    ['Conversión (prom.)', convA.toFixed(2), convO.toFixed(2), convP.toFixed(1)+'%', badge(convP,'CONVERSIÓN')],
    ['Visitas (prom.)',    visA.toFixed(2),  '1.00',           visP.toFixed(1)+'%',  badge(visP,'VISITAS')],
    ['Ventas (prom.)',     ventA.toFixed(2), ventO.toFixed(2), ventP.toFixed(1)+'%', badge(ventP,'VENTAS')]
  ];
  Object.keys(tableData).forEach(function(key){
    if (!key.startsWith('custom_')) return;
    var td=tableData[key]; if (!td.rows.length) return;
    var avg=rowAvgGlobal(key,1); var obj=rowAvgGlobal(key,2)||1; var pct=(avg/obj)*100;
    sRows.push([td.cols[0]||key, avg.toFixed(2), obj.toFixed(2), pct.toFixed(1)+'%', badge(pct,(td.cols[0]||key).toUpperCase())]);
  });
  semaforo.innerHTML=sRows.map(function(r){ return '<tr>'+r.map(function(c){ return '<td>'+c+'</td>'; }).join('')+'</tr>'; }).join('');

  if (!summGrid) return;
  // summary cards
  function card(icon,title,text,barsHtml){
    return '<div class="summary-card"><div class="summary-icon">'+icon+'</div>'
      +'<div class="summary-title">'+title+'</div>'
      +'<div class="summary-text">'+text+'</div>'
      +'<div class="progress-bar-wrap" style="margin-top:14px">'+barsHtml+'</div></div>';
  }
  var cartRowsS=getMonthAwareRows('carteras');
  var cumpl=cartRowsS.filter(function(r){ var p=parseFloat(r[1]),o=parseFloat(r[2])||1; return !isNaN(p)&&p>=o; }).length;
  var cartBars=tableData['carteras'].rows.slice().sort(function(a,b){ return parseFloat(b[1])-parseFloat(a[1]); }).slice(0,3)
    .map(function(r){ var p=(parseFloat(r[1])/(parseFloat(r[2])||1))*100; return bar(r[0],p,'var(--accent1)'); }).join('');
  var convBars=tableData['conversion'].rows.slice().sort(function(a,b){ return parseFloat(b[1])-parseFloat(a[1]); }).slice(0,3)
    .map(function(r){ var p=(parseFloat(r[1])/(parseFloat(r[2])||1))*100; return bar(r[0],p,'var(--accent2)'); }).join('');
  var visBars=tableData['visitas'].rows.slice().sort(function(a,b){ return parseFloat(b[1])-parseFloat(a[1]); }).slice(0,3)
    .map(function(r){ var p=(parseFloat(r[1])/(parseFloat(r[2])||1))*100; return bar(r[0],p,'var(--accent5)'); }).join('');
  var ventBars=tableData['ventas'].rows.map(function(r){ var p=(parseFloat(r[1])/(parseFloat(r[2])||1))*100; return bar(r[0],p,'#e05252'); }).join('');

  var html='';
  html+=card('🏆','Fortaleza: Carteras',cumpl+' de '+cartRowsS.length+' carteras sobre objetivo. Promedio: <strong>'+cartA.toFixed(2)+'</strong>',cartBars);
  html+=card('⚠️','Alerta: Conversión','Promedio <strong>'+convA.toFixed(2)+'</strong> vs OBJ '+convO.toFixed(2)+' — '+convP.toFixed(1)+'%',convBars);
  html+=card('📈','Productividad','PRO 2026: <strong>'+pv26.toFixed(2)+'</strong> vs '+pv25.toFixed(2)+' en 2025 — '+(prodMej>=0?'+':'')+prodMej.toFixed(1)+'%',
    bar('2025',100,'var(--muted)')+bar('2026',(pv26/(pv25||1))*100,'var(--accent3)'));
  html+=card('🛒','Ventas','Promedio <strong>'+ventA.toFixed(2)+'</strong> vs OBJ '+ventO.toFixed(2)+' — '+ventP.toFixed(1)+'%',ventBars);
  html+=card('👣','Visitas Diarias','Promedio <strong>'+visA.toFixed(2)+'</strong> vs OBJ 1.00 — '+visP.toFixed(1)+'%',visBars);
  html+=card('🌡️','Clima Mandela','1er bimestre: <strong>'+climA.toFixed(2)+'</strong> vs OBJ 0.97 — '+climP.toFixed(1)+'%',bar('Clima',climP,'var(--accent2)'));
  // custom table cards
  Object.keys(tableData).forEach(function(key){
    if (!key.startsWith('custom_')) return;
    var td=tableData[key]; if (!td.rows.length) return;
    var avg=rowAvgGlobal(key,1); var obj=rowAvgGlobal(key,2)||1; var pct=(avg/obj)*100;
    var hexC=td.hexColor||'#2e74e8';
    var customBars=td.rows.slice().sort(function(a,b){ return parseFloat(b[1])-parseFloat(a[1]); }).slice(0,4)
      .map(function(r){ var p=(parseFloat(r[1])/(parseFloat(r[2])||obj))*100; return bar(r[0],p,hexC); }).join('');
    html+=card('📊',td.cols[0]||'Tabla','Promedio <strong>'+avg.toFixed(2)+'</strong> vs OBJ '+obj.toFixed(2)+' — '+pct.toFixed(1)+'%',customBars);
  });
  summGrid.innerHTML=html;
}

// ═══════════════════════════════════════════════════════
// REFRESH
// ═══════════════════════════════════════════════════════
function refreshDashboard() {
  // Sync month from select if on dashboard
  var sel = document.getElementById('dash-month-select');
  if (sel) currentDashMonth = sel.value;
  renderTableById('carteras');
  navigate('dashboard');
  initCharts();
  reRenderCustomCharts();
  updateKPICards();
  updateSummary();
  var mes = currentDashMonth !== 'todos' ? currentDashMonth + ' 2026' : '2026';
  showToast('⟳ Dashboard actualizado · ' + mes);
}

// ═══════════════════════════════════════════════════════
// TOAST
// ═══════════════════════════════════════════════════════
function showToast(msg) {
  var t=document.getElementById('toast');
  t.textContent=msg;
  t.classList.add('show');
  setTimeout(function(){ t.classList.remove('show'); }, 3000);
}

// ── Initial render ──
updateKPICards();
updateSummary();

// ═══════════════════════════════════════════════════════
// MESES — datos mensuales por indicador
// ═══════════════════════════════════════════════════════
var MESES_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Setiembre','Octubre','Noviembre','Diciembre'];

// monthlyData[mes][indicador][segmento] = { val, obj }
var monthlyData = {};
MESES_NAMES.forEach(function(m){ monthlyData[m] = {}; });

// Pre-fill from existing tableData (productividad has month rows)
tableData['productividad'].rows.forEach(function(r){
  var m = r[0];
  if (monthlyData[m]) {
    if (!monthlyData[m]['productividad']) monthlyData[m]['productividad'] = {};
    monthlyData[m]['productividad']['PRO'] = { val: parseFloat(r[1])||null, obj: parseFloat(r[2])||0.70 };
  }
});

var activeMonth = 'Enero';
var mesChartInst = {};

function initMeses() {
  var tabsEl = document.getElementById('month-tabs');
  tabsEl.innerHTML = '';
  MESES_NAMES.forEach(function(m){
    var btn = document.createElement('button');
    btn.className = 'month-tab' + (m === activeMonth ? ' active' : '') + (hasMonthData(m) ? ' has-data' : '');
    btn.textContent = m.substring(0,3);
    btn.title = m;
    btn.onclick = function() {
      activeMonth = m;
      document.querySelectorAll('.month-tab').forEach(function(b){ b.classList.remove('active'); });
      btn.classList.add('active');
      renderMonthCards();
    };
    tabsEl.appendChild(btn);
  });
  renderMonthCards();
}

function hasMonthData(m) {
  var d = monthlyData[m];
  return d && Object.keys(d).some(function(k){ return Object.keys(d[k]).length > 0; });
}

function renderMonthCards() {
  var container = document.getElementById('month-content');
  Object.values(mesChartInst).forEach(function(c){ if(c) c.destroy(); });
  mesChartInst = {};

  var indicators = [
    { key:'carteras',      label:'Carteras',       color:'var(--accent1)', hex:'#2e74e8', cols:['Cartera','PRO','OBJ'] },
    { key:'conversion',    label:'Conversión',     color:'var(--accent4)', hex:'#9b4fd4', cols:['Segmento','PRO','OBJ'] },
    { key:'visitas',       label:'Visitas Diarias',color:'var(--accent5)', hex:'#c89a00', cols:['Segmento','2026','OBJ'] },
    { key:'ventas',        label:'Ventas',         color:'var(--accent6)', hex:'#0fa8cc', cols:['Categoría','PRO','OBJ'] },
    { key:'productividad', label:'Productividad',  color:'var(--accent3)', hex:'#17a55e', cols:['Mes','PRO 2026','PRO 2025'] }
  ];

  var html = '<div class="month-grid">';
  indicators.forEach(function(ind){
    var td = tableData[ind.key];
    var mData = monthlyData[activeMonth][ind.key] || {};
    var chartId = 'mchart-' + ind.key;

    html += '<div class="month-card">';
    html += '<div class="month-card-header">';
    html += '<div class="month-card-title"><span class="dot" style="background:'+ind.color+'"></span>'+ind.label+'</div>';
    html += '<span style="font-size:.72rem;color:var(--muted)">'+activeMonth+' 2026</span>';
    html += '</div>';

    // Input rows per segment
    html += '<div>';
    td.rows.forEach(function(row, ri){
      var seg = row[0];
      var saved = mData[seg] || {};
      var v = saved.val !== undefined ? saved.val : '';
      var o = saved.obj !== undefined ? saved.obj : (parseFloat(row[2])||'');
      var pct = (!isNaN(parseFloat(v)) && !isNaN(parseFloat(o)) && parseFloat(o)>0)
        ? ((parseFloat(v)/parseFloat(o))*100).toFixed(1)+'%' : '—';
      var okColor = (!isNaN(parseFloat(v)) && !isNaN(parseFloat(o)))
        ? (parseFloat(v)>=parseFloat(o)?'#17a55e':'#cc3333') : 'var(--muted)';
      html += '<div class="month-input-row">';
      html += '<div class="month-input-cell"><div class="month-input-label">'+seg+'</div></div>';
      html += '<div class="month-input-cell">';
      html += '<div class="month-input-label">'+ind.cols[1]+'</div>';
      html += '<input class="month-input-field" type="number" step="0.01" placeholder="0.00" value="'+v+'"';
      html += ' data-month="'+activeMonth+'" data-ind="'+ind.key+'" data-seg="'+seg+'" data-type="val"';
      html += ' oninput="saveMonthInput(this)">';
      html += '</div>';
      html += '<div class="month-input-cell">';
      html += '<div class="month-input-label" style="color:'+okColor+'">'+pct+'</div>';
      html += '<input class="month-input-field" type="number" step="0.01" placeholder="OBJ" value="'+o+'"';
      html += ' data-month="'+activeMonth+'" data-ind="'+ind.key+'" data-seg="'+seg+'" data-type="obj"';
      html += ' oninput="saveMonthInput(this)">';
      html += '</div>';
      html += '</div>';
    });
    html += '</div>';

    // Mini chart
    html += '<div style="padding:12px 14px;border-top:1px solid var(--border)">';
    html += '<div style="position:relative;height:130px"><canvas id="'+chartId+'"></canvas></div>';
    html += '</div>';

    html += '</div>'; // month-card
  });
  html += '</div>';

  // Annual trend chart
  html += '<div class="table-card" style="padding:20px">';
  html += '<div style="font-family:Syne,sans-serif;font-weight:700;font-size:.95rem;margin-bottom:4px">Tendencia anual de productividad</div>';
  html += '<div style="font-size:.75rem;color:var(--muted);margin-bottom:14px">Datos ingresados mes a mes</div>';
  html += '<div style="position:relative;height:180px"><canvas id="mchart-annual"></canvas></div>';
  html += '</div>';

  container.innerHTML = html;

  // Render mini charts
  indicators.forEach(function(ind){
    var td = tableData[ind.key];
    var mData = monthlyData[activeMonth][ind.key] || {};
    var segs = td.rows.map(function(r){ return r[0]; });
    var vals = td.rows.map(function(r){ var d=mData[r[0]]; return d&&d.val!==null&&d.val!==undefined&&!isNaN(d.val)?d.val:parseFloat(r[1])||0; });
    var objs = td.rows.map(function(r){ var d=mData[r[0]]; return d&&d.obj!==null&&d.obj!==undefined&&!isNaN(d.obj)?d.obj:parseFloat(r[2])||null; });
    var ctx = document.getElementById('mchart-'+ind.key);
    if (!ctx) return;
    mesChartInst[ind.key] = new Chart(ctx, {
      type:'bar',
      data:{ labels:segs, datasets:[
        { label:'Valor', data:vals,
          backgroundColor:vals.map(function(v,i){ return objs[i]?(v>=objs[i]?ind.hex+'99':ind.hex.replace(/(..)(..)(..)/,'$1$2$3')+'55'):ind.hex+'88'; }),
          borderColor:vals.map(function(v,i){ return objs[i]?(v>=objs[i]?ind.hex:'#cc3333'):ind.hex; }),
          borderWidth:1.5, borderRadius:4, maxBarThickness:20 },
        { label:'OBJ', data:objs, backgroundColor:'rgba(150,150,150,0.15)', borderColor:'#bbb', borderWidth:1, borderRadius:4, maxBarThickness:20 }
      ]},
      options:{ responsive:true, maintainAspectRatio:false,
        animation:{ duration:600, easing:'easeInOutQuart' },
        plugins:{ legend:{display:false}, tooltip:{ backgroundColor:'#fff', borderColor:'#e2e6f0', borderWidth:1, titleColor:'#1a1f2e', bodyColor:'#5a6070', padding:8, cornerRadius:6 } },
        scales:{ x:{ticks:{color:'#8490a8',font:{size:9}},grid:{display:false},border:{display:false}}, y:{ticks:{color:'#8490a8',font:{size:9},callback:function(v){return v.toFixed(1);}},grid:{color:'rgba(0,0,0,0.04)'},border:{display:false}} }
      }
    });
  });

  // Annual trend
  var annualLabels = MESES_NAMES.map(function(m){ return m.substring(0,3); });
  var annualVals = MESES_NAMES.map(function(m){
    var d = monthlyData[m]['productividad'];
    if (!d) return null;
    var vals2 = Object.values(d).map(function(x){ return x.val; }).filter(function(v){ return !isNaN(v)&&v!==null; });
    return vals2.length ? vals2.reduce(function(a,b){return a+b;},0)/vals2.length : null;
  });
  var annualCtx = document.getElementById('mchart-annual');
  if (annualCtx) {
    mesChartInst['annual'] = new Chart(annualCtx, {
      type:'line',
      data:{ labels:annualLabels, datasets:[
        { label:'Productividad prom.', data:annualVals, borderColor:'#17a55e', backgroundColor:'rgba(23,165,94,0.10)',
          tension:0.4, fill:true, pointRadius:4, pointBackgroundColor:'#fff', pointBorderColor:'#17a55e', pointBorderWidth:2 }
      ]},
      options:{ responsive:true, maintainAspectRatio:false, animation:{duration:700},
        plugins:{ legend:{display:false}, tooltip:{ backgroundColor:'#fff', borderColor:'#e2e6f0', borderWidth:1, titleColor:'#1a1f2e', bodyColor:'#5a6070', padding:8, cornerRadius:6 } },
        scales:{ x:{ticks:{color:'#8490a8',font:{size:10}},grid:{color:'rgba(0,0,0,0.04)'},border:{dash:[4,4]}}, y:{ticks:{color:'#8490a8',font:{size:10},callback:function(v){return v.toFixed(2);}},grid:{color:'rgba(0,0,0,0.04)'},border:{dash:[4,4]}} }
      }
    });
  }
}

function saveMonthInput(inp) {
  var m   = inp.dataset.month;
  var ind = inp.dataset.ind;
  var seg = inp.dataset.seg;
  var typ = inp.dataset.type;
  // Store ONLY in monthlyData — never touch tableData
  if (!monthlyData[m])           monthlyData[m] = {};
  if (!monthlyData[m][ind])      monthlyData[m][ind] = {};
  if (!monthlyData[m][ind][seg]) monthlyData[m][ind][seg] = {};
  var parsed = parseFloat(inp.value);
  monthlyData[m][ind][seg][typ] = isNaN(parsed) ? null : parsed;

  // Live pct update in the row
  var row = inp.closest('.month-input-row');
  if (row) {
    var valInp = row.querySelector('[data-type="val"]');
    var objInp = row.querySelector('[data-type="obj"]');
    var pctLabel = objInp ? objInp.previousElementSibling : null;
    if (valInp && objInp && pctLabel) {
      var v2 = parseFloat(valInp.value), o2 = parseFloat(objInp.value);
      if (!isNaN(v2) && !isNaN(o2) && o2 > 0) {
        var p2 = (v2/o2)*100;
        pctLabel.textContent = p2.toFixed(1)+'%';
        pctLabel.style.color = p2>=100 ? '#17a55e' : '#cc3333';
      } else {
        pctLabel.textContent = '—';
        pctLabel.style.color = 'var(--muted)';
      }
    }
  }
  // Update only this indicator's mini chart (not the whole page)
  updateMiniChart(m, ind);
}

function updateMiniChart(mes, indKey) {
  var indicators = {
    carteras:      { hex:'#2e74e8' },
    conversion:    { hex:'#9b4fd4' },
    visitas:       { hex:'#c89a00' },
    ventas:        { hex:'#0fa8cc' },
    productividad: { hex:'#17a55e' }
  };
  var ind = indicators[indKey]; if (!ind) return;
  var td = tableData[indKey]; if (!td) return;
  var rows = getMonthAwareRows(indKey, mes);
  var segs = rows.map(function(r){ return r[0]; });
  var vals = rows.map(function(r){ return parseFloat(r[1])||0; });
  var objs = rows.map(function(r){ return parseFloat(r[2])||null; });
  var chartId = 'mchart-' + indKey;
  var ctx = document.getElementById(chartId); if (!ctx) return;
  if (mesChartInst[indKey]) { mesChartInst[indKey].destroy(); delete mesChartInst[indKey]; }
  mesChartInst[indKey] = new Chart(ctx, {
    type:'bar',
    data:{ labels:segs, datasets:[
      { label:'Valor', data:vals,
        backgroundColor:vals.map(function(v,i){ return objs[i]?(v>=objs[i]?ind.hex+'99':'#cc333366'):ind.hex+'88'; }),
        borderColor:vals.map(function(v,i){ return objs[i]?(v>=objs[i]?ind.hex:'#cc3333'):ind.hex; }),
        borderWidth:1.5, borderRadius:4, maxBarThickness:20 },
      { label:'OBJ', data:objs, backgroundColor:'rgba(150,150,150,0.15)',
        borderColor:'#bbb', borderWidth:1, borderRadius:4, maxBarThickness:20 }
    ]},
    options:{ responsive:true, maintainAspectRatio:false,
      animation:{ duration:400 },
      plugins:{ legend:{display:false}, tooltip:{ backgroundColor:'#fff', borderColor:'#e2e6f0', borderWidth:1, titleColor:'#1a1f2e', bodyColor:'#5a6070', padding:8, cornerRadius:6 } },
      scales:{ x:{ticks:{color:'#8490a8',font:{size:9}},grid:{display:false},border:{display:false}}, y:{ticks:{color:'#8490a8',font:{size:9},callback:function(v){return v.toFixed(1);}},grid:{color:'rgba(0,0,0,0.04)'},border:{display:false}} }
    }
  });
}

// ═══════════════════════════════════════════════════════
// COMPARACIÓN POR MES
// ═══════════════════════════════════════════════════════
var compCharts = {};

function initComparacion() {
  renderComparacion();
}

function renderComparacion() {
  var mesIdx = parseInt(document.getElementById('comp-month-select').value);
  var mes    = MESES_NAMES[mesIdx];
  var indKey = document.getElementById('comp-indicator-select').value;
  var td     = tableData[indKey];
  var mData  = monthlyData[mes][indKey] || {};

  // Gather data
  var segments = td.rows.map(function(r){ return r[0]; });
  var vals = td.rows.map(function(r){
    var d = mData[r[0]]; return (d&&!isNaN(d.val)&&d.val!==null) ? d.val : parseFloat(r[1])||0;
  });
  var objs = td.rows.map(function(r){
    var d = mData[r[0]]; return (d&&!isNaN(d.obj)&&d.obj!==null) ? d.obj : parseFloat(r[2])||1;
  });
  var pcts = vals.map(function(v,i){ return objs[i]?parseFloat(((v/objs[i])*100).toFixed(1)):0; });

  // KPI cards
  var sorted = segments.slice().map(function(s,i){ return {s:s,v:vals[i],o:objs[i],p:pcts[i]}; }).sort(function(a,b){ return b.p-a.p; });
  var top = sorted[0];
  var bot = sorted[sorted.length-1];
  var avg = vals.reduce(function(a,b){return a+b;},0)/vals.length;
  var avgObj = objs.reduce(function(a,b){return a+b;},0)/objs.length;
  var cumpled = sorted.filter(function(x){return x.v>=x.o;}).length;

  var kpiEl = document.getElementById('comp-kpis');
  kpiEl.innerHTML = [
    { label:'Mejor del mes', value:top.s, sub:top.v.toFixed(2)+' ('+top.p.toFixed(1)+'% OBJ)', color:'#17a55e' },
    { label:'Más rezagado',  value:bot.s, sub:bot.v.toFixed(2)+' ('+bot.p.toFixed(1)+'% OBJ)', color:'#cc3333' },
    { label:'Promedio del mes', value:avg.toFixed(2), sub:'OBJ promedio: '+avgObj.toFixed(2), color:'#2e74e8' },
    { label:'Cumplen meta', value:cumpled+' / '+segments.length, sub:((cumpled/segments.length)*100).toFixed(0)+'% del grupo', color: cumpled===segments.length?'#17a55e':cumpled>0?'#c89a00':'#cc3333' }
  ].map(function(k){
    return '<div class="comp-kpi" style="border-top-color:'+k.color+'">'
      +'<div class="comp-kpi-label">'+k.label+'</div>'
      +'<div class="comp-kpi-value" style="color:'+k.color+'">'+k.value+'</div>'
      +'<div class="comp-kpi-sub">'+k.sub+'</div>'
      +'</div>';
  }).join('');

  // Destroy old charts
  Object.values(compCharts).forEach(function(c){ if(c) c.destroy(); });
  compCharts = {};

  // Ranking chart (sorted)
  var rankLabels = sorted.map(function(x){ return x.s; });
  var rankVals   = sorted.map(function(x){ return x.v; });
  var rankObjs   = sorted.map(function(x){ return x.o; });
  var rankCtx = document.getElementById('comp-chart-rank');
  if (rankCtx) {
    compCharts.rank = new Chart(rankCtx, {
      type:'bar',
      data:{ labels:rankLabels, datasets:[
        { label:'Valor', data:rankVals,
          backgroundColor:rankVals.map(function(v,i){ return v>=rankObjs[i]?'rgba(23,165,94,0.75)':'rgba(204,51,51,0.7)'; }),
          borderColor:rankVals.map(function(v,i){ return v>=rankObjs[i]?'#17a55e':'#cc3333'; }),
          borderWidth:2, borderRadius:6, maxBarThickness:32 },
        { label:'OBJ', data:rankObjs, backgroundColor:'rgba(180,180,180,0.2)', borderColor:'#bbb', borderWidth:1.5, borderRadius:6, maxBarThickness:32 }
      ]},
      options:{ responsive:true, maintainAspectRatio:false,
        animation:{ duration:700, easing:'easeInOutQuart', delay:function(c){ return c.dataIndex*60; } },
        plugins:{ legend:{display:false}, tooltip:{ backgroundColor:'#fff', borderColor:'#e2e6f0', borderWidth:1, titleColor:'#1a1f2e', bodyColor:'#5a6070', padding:10, cornerRadius:8,
          callbacks:{ label:function(ctx){
            if(ctx.datasetIndex===0){
              var p=(ctx.raw/(rankObjs[ctx.dataIndex]||1)*100).toFixed(1);
              return ' '+ctx.dataset.label+': '+ctx.raw.toFixed(2)+' ('+p+'% OBJ)';
            }
            return ' OBJ: '+ctx.raw.toFixed(2);
          }}
        }},
        scales:{
          x:{ticks:{color:'#8490a8',font:{size:11}},grid:{color:'rgba(0,0,0,0.04)'},border:{dash:[4,4]}},
          y:{ticks:{color:'#8490a8',font:{size:11},callback:function(v){return v.toFixed(2);}},grid:{color:'rgba(0,0,0,0.04)'},border:{dash:[4,4]}}
        }
      }
    });
  }

  // Trend chart — monthly average of selected indicator
  var trendVals = MESES_NAMES.map(function(m){
    var md = monthlyData[m][indKey] || {};
    var vs = td.rows.map(function(r){ var d=md[r[0]]; return (d&&!isNaN(d.val)&&d.val!==null)?d.val:parseFloat(r[1])||null; }).filter(function(v){return v!==null;});
    return vs.length ? parseFloat((vs.reduce(function(a,b){return a+b;},0)/vs.length).toFixed(3)) : null;
  });
  var trendCtx = document.getElementById('comp-chart-trend');
  if (trendCtx) {
    var trendColors = trendVals.map(function(v,i){
      if (v===null) return 'rgba(150,150,150,0.3)';
      return i===mesIdx ? '#2e74e8' : 'rgba(46,116,232,0.4)';
    });
    compCharts.trend = new Chart(trendCtx, {
      type:'line',
      data:{ labels:MESES_NAMES.map(function(m){ return m.substring(0,3); }), datasets:[
        { label:'Promedio', data:trendVals, borderColor:'#2e74e8', backgroundColor:'rgba(46,116,232,0.08)',
          tension:0.4, fill:true, pointRadius:5,
          pointBackgroundColor:trendColors,
          pointBorderColor:trendVals.map(function(v,i){ return i===mesIdx?'#2e74e8':'rgba(46,116,232,0.5)'; }),
          pointBorderWidth:2, pointHoverRadius:7 }
      ]},
      options:{ responsive:true, maintainAspectRatio:false, animation:{duration:700},
        plugins:{ legend:{display:false}, tooltip:{ backgroundColor:'#fff', borderColor:'#e2e6f0', borderWidth:1, titleColor:'#1a1f2e', bodyColor:'#5a6070', padding:10, cornerRadius:8,
          callbacks:{ label:function(ctx){ return ctx.raw!==null?' Promedio: '+ctx.raw.toFixed(2):'Sin datos'; }}
        }},
        scales:{
          x:{ticks:{color:'#8490a8',font:{size:10}},grid:{color:'rgba(0,0,0,0.04)'},border:{dash:[4,4]}},
          y:{ticks:{color:'#8490a8',font:{size:10},callback:function(v){return v.toFixed(2);}},grid:{color:'rgba(0,0,0,0.04)'},border:{dash:[4,4]}}
        }
      }
    });
  }

  // Analysis text
  var body = document.getElementById('comp-analysis-body');
  var rows = [];

  // Winner
  rows.push({ icon:'🏆', title:'Mejor desempeño: '+top.s, text:top.s+' lidera en '+mes+' con '+top.v.toFixed(2)+' — '+top.p.toFixed(1)+'% del objetivo (OBJ: '+top.o.toFixed(2)+'). '+(top.p>=100?'Cumplió la meta.':'Aún por debajo del objetivo.') });

  // Who didn't reach the goal
  var noCumplidos = sorted.filter(function(x){ return x.v<x.o; });
  if (noCumplidos.length > 0) {
    rows.push({ icon:'⚠️', title:'No cumplieron la meta ('+noCumplidos.length+' de '+segments.length+')',
      text: noCumplidos.map(function(x){ return x.s+' ('+x.v.toFixed(2)+' vs OBJ '+x.o.toFixed(2)+', faltó '+(x.o-x.v).toFixed(2)+')'; }).join(' · ') });
  } else {
    rows.push({ icon:'✅', title:'Todos cumplieron la meta', text:'Todos los segmentos superaron o alcanzaron su objetivo en '+mes+'. Excelente desempeño.' });
  }

  // Gap analysis
  var maxGap = sorted[sorted.length-1];
  var gap = maxGap.o - maxGap.v;
  if (gap > 0) {
    rows.push({ icon:'📉', title:'Mayor brecha: '+maxGap.s, text:'Requiere '+gap.toFixed(2)+' unidades adicionales para alcanzar su OBJ de '+maxGap.o.toFixed(2)+'. Representa el '+(gap/maxGap.o*100).toFixed(1)+'% de distancia al objetivo.' });
  }

  // Month vs previous
  var prevIdx = mesIdx > 0 ? mesIdx-1 : null;
  if (prevIdx !== null) {
    var prevMes = MESES_NAMES[prevIdx];
    var prevData = monthlyData[prevMes][indKey] || {};
    var prevVals = td.rows.map(function(r){ var d=prevData[r[0]]; return (d&&!isNaN(d.val))?d.val:parseFloat(r[1])||0; });
    var prevAvg = prevVals.reduce(function(a,b){return a+b;},0)/prevVals.length;
    var diff = avg - prevAvg;
    rows.push({ icon: diff>=0?'📈':'📉', title:'vs '+prevMes, text:'El promedio pasó de '+prevAvg.toFixed(2)+' ('+prevMes+') a '+avg.toFixed(2)+' ('+mes+') — '+(diff>=0?'mejora':'caída')+' de '+(Math.abs(diff)).toFixed(2)+' ('+(Math.abs(diff/prevAvg)*100).toFixed(1)+'%).' });
  }

  // Top 3 summary
  rows.push({ icon:'📊', title:'Ranking top 3', text:sorted.slice(0,3).map(function(x,i){ return (i+1)+'º '+x.s+' ('+x.p.toFixed(1)+'%)'; }).join(' · ') });

  body.innerHTML = rows.map(function(r){
    return '<div class="analysis-row"><div class="analysis-icon">'+r.icon+'</div><div><div class="analysis-title">'+r.title+'</div><div class="analysis-text">'+r.text+'</div></div></div>';
  }).join('');
}

// ═══════════════════════════════════════════════════════
// FILTRO DE MES EN TABLAS
// ═══════════════════════════════════════════════════════
var currentTableMonth = 'todos';

function filterTablesByMonth(mes, btn) {
  currentTableMonth = mes;

  // Update tab styles
  document.querySelectorAll('#table-month-tabs .month-tab').forEach(function(b){
    b.classList.remove('active');
  });
  if (btn) btn.classList.add('active');

  // Update label
  var label = document.getElementById('table-month-label');
  if (label) label.textContent = mes === 'todos' ? '' : 'Mostrando datos de ' + mes + ' 2026';

  // Re-render all tables with month data
  var keys = ['carteras','clima','productividad','conversion','visitas','ventas'];
  keys.forEach(function(key){ renderTableForMonth(key, mes); });

  // Also re-render custom tables
  Object.keys(tableData).forEach(function(key){
    if (key.startsWith('custom_')) renderTableForMonth(key, mes);
  });
}

function renderTableForMonth(key, mes) {
  var el = document.getElementById(tableIds[key]);
  if (!el) return;
  var tbody = el.querySelector('tbody');
  var td = tableData[key];

  // If "todos" or no month data, show the normal table data
  if (mes === 'todos') {
    renderTableById(key);
    // Remove any month badge from header
    var header = el.closest('.table-card');
    if (header) {
      var badge = header.querySelector('.month-filter-badge');
      if (badge) badge.remove();
    }
    return;
  }

  // Get month data for this indicator
  var mData = (monthlyData[mes] && monthlyData[mes][key]) ? monthlyData[mes][key] : {};
  var hasAnyMonthData = Object.keys(mData).length > 0;

  // Show month badge in card header
  var cardEl = el.closest('.table-card');
  if (cardEl) {
    var existingBadge = cardEl.querySelector('.month-filter-badge');
    if (existingBadge) existingBadge.remove();
    var headerEl = cardEl.querySelector('.table-card-header');
    if (headerEl) {
      var badge = document.createElement('span');
      badge.className = 'pill month-filter-badge';
      badge.style.cssText = 'background:rgba(46,116,232,.12);color:var(--accent1);font-size:.68rem';
      badge.textContent = mes + ' 2026' + (hasAnyMonthData ? '' : ' — sin datos');
      headerEl.appendChild(badge);
    }
  }

  // Build rows — always fresh copies, never touch tableData
  var html = '';
  td.rows.forEach(function(baseRow) {
    var row = baseRow.slice(); // fresh copy
    var seg = row[0];
    var mSeg = mData[seg];

    if (mSeg) {
      if (mSeg.val !== undefined && mSeg.val !== null && !isNaN(mSeg.val)) row[1] = parseFloat(mSeg.val).toFixed(2);
      if (mSeg.obj !== undefined && mSeg.obj !== null && !isNaN(mSeg.obj)) row[2] = parseFloat(mSeg.obj).toFixed(2);
    }

    // Auto-compute Estado / Variación for carteras
    if (key === 'carteras') {
      var pro = parseFloat(row[1]), obj = parseFloat(row[2]);
      if (!isNaN(pro) && !isNaN(obj) && obj !== 0) {
        var diff = ((pro - obj) / obj) * 100;
        row[3] = (diff >= 0 ? '+' : '') + diff.toFixed(1) + '%';
        row[4] = pro >= obj
          ? '<span style="color:#17a55e;font-weight:700">✅ Cumplido (' + ((pro/obj)*100).toFixed(1) + '%)</span>'
          : '<span style="color:#cc3333;font-weight:700">❌ No cumplido (' + ((pro/obj)*100).toFixed(1) + '%)</span>';
      }
    }

    // Style rows: highlight if month data exists for this segment
    var rowStyle = mSeg ? 'background:rgba(46,116,232,0.04)' : '';
    html += '<tr style="' + rowStyle + '">';
    row.forEach(function(cell, ci) {
      // Add small dot indicator if this segment has month-specific data
      var indicator = (ci === 0 && mSeg) ? ' <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--accent1);margin-left:4px;vertical-align:middle"></span>' : '';
      html += '<td>' + cell + indicator + '</td>';
    });
    html += '</tr>';
  });

  if (!html) {
    html = '<tr><td colspan="' + td.cols.length + '" style="text-align:center;color:var(--muted);padding:16px">Sin datos para ' + mes + '</td></tr>';
  }

  tbody.innerHTML = html;
}


// ═══════════════════════════════════════════════════════
// ESTADÍSTICAS ANUALES POR MES
// ═══════════════════════════════════════════════════════
function showEstadisticasTodosLosMeses() {
  var panel = document.getElementById('comp-stats-panel');
  var body  = document.getElementById('comp-stats-body');
  if (!panel || !body) return;

  var indKey = document.getElementById('comp-indicator-select').value;
  var td     = tableData[indKey];
  var indLabels = {
    carteras:'Carteras', conversion:'Conversión', visitas:'Visitas Diarias',
    ventas:'Ventas', productividad:'Productividad'
  };

  // Build stats table per month
  var rows = MESES_NAMES.map(function(mes, mi) {
    var mData = (monthlyData[mes] && monthlyData[mes][indKey]) ? monthlyData[mes][indKey] : {};
    var hasData = Object.keys(mData).length > 0;

    var vals = td.rows.map(function(r) {
      var d = mData[r[0]];
      return (d && d.val !== null && !isNaN(d.val)) ? d.val : parseFloat(r[1]) || 0;
    });
    var objs = td.rows.map(function(r) {
      var d = mData[r[0]];
      return (d && d.obj !== null && !isNaN(d.obj)) ? d.obj : parseFloat(r[2]) || 1;
    });
    var pcts  = vals.map(function(v,i){ return objs[i] ? (v/objs[i])*100 : 0; });
    var avg   = vals.reduce(function(a,b){return a+b;},0) / vals.length;
    var avgPct= pcts.reduce(function(a,b){return a+b;},0) / pcts.length;
    var cumpl = vals.filter(function(v,i){ return v>=objs[i]; }).length;
    var sorted = td.rows.map(function(r,i){ return {s:r[0],p:pcts[i]}; }).sort(function(a,b){return b.p-a.p;});
    var top = sorted[0];
    var bot = sorted[sorted.length-1];

    return {
      mes: mes, hasData: hasData,
      avg: avg, avgPct: avgPct,
      cumpl: cumpl, total: td.rows.length,
      top: top, bot: bot
    };
  });

  // Summary cards at top
  var dataRows = rows.filter(function(r){ return r.hasData; });
  var bestMonth  = dataRows.length ? dataRows.reduce(function(a,b){ return a.avgPct>b.avgPct?a:b; }) : null;
  var worstMonth = dataRows.length ? dataRows.reduce(function(a,b){ return a.avgPct<b.avgPct?a:b; }) : null;
  var allAvg = dataRows.length ? dataRows.reduce(function(a,b){ return {avgPct:a.avgPct+b.avgPct}; }, {avgPct:0}).avgPct / dataRows.length : 0;

  var summaryHtml = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:14px;margin-bottom:24px">';
  if (bestMonth) {
    summaryHtml += '<div class="comp-kpi" style="border-top-color:#17a55e"><div class="comp-kpi-label">Mejor mes</div><div class="comp-kpi-value" style="color:#17a55e">'+bestMonth.mes+'</div><div class="comp-kpi-sub">Promedio '+bestMonth.avgPct.toFixed(1)+'% del OBJ</div></div>';
  }
  if (worstMonth) {
    summaryHtml += '<div class="comp-kpi" style="border-top-color:#cc3333"><div class="comp-kpi-label">Mes más bajo</div><div class="comp-kpi-value" style="color:#cc3333">'+worstMonth.mes+'</div><div class="comp-kpi-sub">Promedio '+worstMonth.avgPct.toFixed(1)+'% del OBJ</div></div>';
  }
  summaryHtml += '<div class="comp-kpi" style="border-top-color:#2e74e8"><div class="comp-kpi-label">Promedio anual</div><div class="comp-kpi-value" style="color:#2e74e8">'+allAvg.toFixed(1)+'%</div><div class="comp-kpi-sub">Del objetivo · '+dataRows.length+' meses con datos</div></div>';
  summaryHtml += '<div class="comp-kpi" style="border-top-color:#9b4fd4"><div class="comp-kpi-label">Indicador</div><div class="comp-kpi-value" style="color:#9b4fd4;font-size:1rem">'+( indLabels[indKey]||indKey)+'</div><div class="comp-kpi-sub">2026 · '+td.rows.length+' segmentos</div></div>';
  summaryHtml += '</div>';

  // Table with all months
  var tableHtml = '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:.82rem">';
  tableHtml += '<thead><tr style="background:var(--surface2)">'
    +'<th style="padding:10px 14px;text-align:left;font-size:.7rem;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);border-bottom:1px solid var(--border)">Mes</th>'
    +'<th style="padding:10px 14px;text-align:left;font-size:.7rem;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);border-bottom:1px solid var(--border)">Promedio</th>'
    +'<th style="padding:10px 14px;text-align:left;font-size:.7rem;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);border-bottom:1px solid var(--border)">% OBJ</th>'
    +'<th style="padding:10px 14px;text-align:left;font-size:.7rem;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);border-bottom:1px solid var(--border)">Cumplen meta</th>'
    +'<th style="padding:10px 14px;text-align:left;font-size:.7rem;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);border-bottom:1px solid var(--border)">Mejor</th>'
    +'<th style="padding:10px 14px;text-align:left;font-size:.7rem;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);border-bottom:1px solid var(--border)">Más bajo</th>'
    +'<th style="padding:10px 14px;text-align:left;font-size:.7rem;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);border-bottom:1px solid var(--border)">Estado</th>'
    +'</tr></thead><tbody>';

  rows.forEach(function(r) {
    var pctColor = r.avgPct >= 100 ? '#17a55e' : r.avgPct >= 90 ? '#c89a00' : '#cc3333';
    var badge = r.avgPct >= 100
      ? '<span class="pill pill-up" style="font-size:.68rem">🟢 Óptimo</span>'
      : r.avgPct >= 90
      ? '<span class="pill" style="background:rgba(200,154,0,.12);color:#c89a00;font-size:.68rem">🟡 Cerca</span>'
      : '<span class="pill pill-down" style="font-size:.68rem">🔴 Bajo</span>';
    var rowStyle = r.hasData ? '' : 'opacity:.45';
    tableHtml += '<tr style="border-bottom:1px solid var(--border);'+rowStyle+'">'
      +'<td style="padding:10px 14px;font-weight:600;color:var(--text)">'+r.mes+(r.hasData?'':' <span style="font-size:.65rem;color:var(--muted)">(sin datos)</span>')+'</td>'
      +'<td style="padding:10px 14px">'+r.avg.toFixed(2)+'</td>'
      +'<td style="padding:10px 14px;font-weight:700;color:'+pctColor+'">'+r.avgPct.toFixed(1)+'%</td>'
      +'<td style="padding:10px 14px">'+r.cumpl+' / '+r.total+'</td>'
      +'<td style="padding:10px 14px;color:#17a55e;font-weight:600">'+(r.top?r.top.s+' ('+r.top.p.toFixed(1)+'%)':'—')+'</td>'
      +'<td style="padding:10px 14px;color:#cc3333;font-weight:600">'+(r.bot?r.bot.s+' ('+r.bot.p.toFixed(1)+'%)':'—')+'</td>'
      +'<td style="padding:10px 14px">'+badge+'</td>'
      +'</tr>';
  });
  tableHtml += '</tbody></table></div>';

  body.innerHTML = summaryHtml + tableHtml;
  panel.style.display = 'block';
  panel.scrollIntoView({ behavior:'smooth', block:'start' });
}