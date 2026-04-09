window.app = {};

// =====================================================================
// 1. CONFIGURAÇÃO NUVEM E SESSÃO (MULTI-TENANT)
// =====================================================================
app.firebaseConfig = {
    apiKey: "AIzaSyBqIuCsHHuy_f-mBWV4JBkbyOorXpqQvqg",
    authDomain: "hub-thiaguinho.firebaseapp.com",
    projectId: "hub-thiaguinho",
    storageBucket: "hub-thiaguinho.firebasestorage.app",
    messagingSenderId: "453508098543",
    appId: "1:453508098543:web:305f4d48edd9be40bd6e1a"
};

if (!firebase.apps.length) firebase.initializeApp(app.firebaseConfig);
app.db = firebase.firestore();

app.CLOUDINARY_CLOUD_NAME = sessionStorage.getItem('t_cloudName') || 'dmuvm1o6m'; 
app.CLOUDINARY_UPLOAD_PRESET = sessionStorage.getItem('t_cloudPreset') || 'evolution'; 
app.API_KEY_GEMINI = sessionStorage.getItem('t_gemini');
app.t_id = sessionStorage.getItem('t_id');
app.t_nome = sessionStorage.getItem('t_nome');
app.t_role = sessionStorage.getItem('t_role'); // admin, gerente ou equipe
app.user_nome = sessionStorage.getItem('f_nome');
app.user_comissao = parseFloat(sessionStorage.getItem('f_comissao') || 0);
app.t_mods = JSON.parse(sessionStorage.getItem('t_mods') || '{}');

if (!app.t_id) window.location.replace('index.html');

app.bancoOSCompleto = [];
app.bancoEstoque = [];
app.bancoFin = [];
app.bancoCrm = [];
app.bancoIA = [];
app.bancoMensagens = [];
app.fotosOSAtual = [];
app.historicoOSAtual = [];
app.chatActiveClienteId = null;

// =====================================================================
// 2. INICIALIZAÇÃO E CONTROLE DE ACESSO (RBAC)
// =====================================================================
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('lblEmpresa').innerText = app.t_nome;
    document.getElementById('lblUsuario').innerText = app.user_nome;
    
    const style = document.createElement('style');
    if (app.t_role === 'equipe') {
        style.innerHTML = '.admin-only, .gestao-only { display: none !important; } .mecanico-only { display: flex !important;}';
        document.getElementById('lblComissaoUser').innerText = `Mecânico - Produção: ${app.user_comissao}%`;
    } else if (app.t_role === 'gerente') {
        style.innerHTML = '.admin-only, .mecanico-only { display: none !important; } .gestao-only { display: block !important;} tr .gestao-only { display: table-cell !important; }';
        document.getElementById('lblComissaoUser').innerText = `Gestor / Vendedor`;
    } else {
        style.innerHTML = '.mecanico-only { display: none !important;}';
        document.getElementById('lblComissaoUser').innerText = `Admin Proprietário`;
    }
    document.head.appendChild(style);

    app.construirMenuLateral();
    app.mostrarTela('tela_jarvis', 'Inteligência Automotiva', document.querySelector('.nav-link'));
    
    app.iniciarEscutaOS();
    app.iniciarEscutaCrm();
    app.iniciarEscutaMensagens();
    
    if(app.t_role === 'admin' || app.t_role === 'gerente') {
        app.iniciarEscutaEstoque();
        app.iniciarEscutaFinanceiro();
    }
    if(app.t_role === 'admin') {
        app.iniciarEscutaEquipe();
        app.iniciarEscutaLixeira();
        app.iniciarEscutaIA();
    }
    app.configurarCloudinary();
});

app.construirMenuLateral = function() {
    const menu = document.getElementById('menuLateral');
    if (!menu) return;
    let html = `<a class="nav-link active" onclick="app.mostrarTela('tela_jarvis', 'Central J.A.R.V.I.S', this)"><i class="bi bi-robot"></i> Central J.A.R.V.I.S</a>`;
    html += `<a class="nav-link" onclick="app.mostrarTela('tela_os', 'Pátio Kanban', this)"><i class="bi bi-kanban text-info"></i> Pátio Kanban</a>`;
    html += `<a class="nav-link" onclick="app.mostrarTela('tela_arquivo', 'Arquivo Morto', this); app.renderizarTabelaArquivo();"><i class="bi bi-archive text-warning"></i> Arquivo Morto</a>`;
    if (app.t_role !== 'equipe') {
        html += `<a class="nav-link" onclick="app.mostrarTela('tela_crm', 'Base CRM', this)"><i class="bi bi-person-vcard text-info"></i> CRM e Clientes</a>`;
        html += `<a class="nav-link" onclick="app.mostrarTela('tela_chat', 'Chat CRM Global', this)"><i class="bi bi-chat-dots-fill text-primary"></i> Chat Global <span id="chatBadgeGlobal" class="badge bg-danger badge-nav d-none">0</span></a>`;
        html += `<a class="nav-link" onclick="app.mostrarTela('tela_estoque', 'Almoxarifado', this)"><i class="bi bi-box-seam text-primary"></i> Estoque Físico</a>`;
        html += `<a class="nav-link" onclick="app.mostrarTela('tela_financeiro', 'DRE e Caixa', this)"><i class="bi bi-bank text-success"></i> Financeiro (Caixa)</a>`;
    }
    if (app.t_role === 'admin') {
        html += `<a class="nav-link" onclick="app.mostrarTela('tela_ia', 'Treinamento I.A.', this)"><i class="bi bi-database-fill-up text-warning"></i> Treinamento I.A.</a>`;
        html += `<a class="nav-link" onclick="app.mostrarTela('tela_equipe', 'Gestão da Equipe', this)"><i class="bi bi-people-fill text-success"></i> Equipe e Acessos</a>`;
    }
    menu.innerHTML = html;
};

app.showToast = function(msg, type='success') {
    const bg = type === 'success' ? 'bg-success' : type === 'error' ? 'bg-danger' : 'bg-warning text-dark';
    const t = document.createElement('div');
    t.innerHTML = `<div class="toast align-items-center text-white ${bg} border-0 show p-3 mt-2 shadow-lg rounded-3"><div class="d-flex"><div class="toast-body fw-bold">${msg}</div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button></div></div>`;
    document.getElementById('toastContainer').appendChild(t.firstChild);
    setTimeout(() => { if(t.firstChild) t.firstChild.remove() }, 5000);
};

app.sair = function() { sessionStorage.clear(); window.location.href = 'index.html'; };

app.mostrarTela = function(id, titulo, btn) {
    document.querySelectorAll('.modulo-tela').forEach(t => t.style.display = 'none');
    const tela = document.getElementById(id);
    if(tela) tela.style.display = 'block';
    document.getElementById('tituloPagina').innerText = titulo;
    if(btn) { document.querySelectorAll('.nav-link').forEach(b => b.classList.remove('active')); btn.classList.add('active'); }
};

// =====================================================================
// 3. CRM, PORTAL DO CLIENTE E WHATSAPP (ENDEREÇOS E EDIÇÃO)
// =====================================================================
app.buscarCEP = function(cep) {
    cep = cep.replace(/\D/g, ''); if(cep.length !== 8) return;
    fetch(`https://viacep.com.br/ws/${cep}/json/`).then(res => res.json()).then(data => {
        if(!data.erro) {
            document.getElementById('c_rua').value = data.logradouro;
            document.getElementById('c_bairro').value = data.bairro;
            document.getElementById('c_cidade').value = data.localidade;
        }
    });
};

app.validarDocUI = function(input) {
    const val = input.value.replace(/\D/g, '');
    if(val.length > 0) {
        input.classList.remove('border-danger'); input.classList.add('border-success');
    }
};

app.iniciarEscutaCrm = function() {
    app.db.collection('clientes_base').where('tenantId', '==', app.t_id).onSnapshot(snap => {
        app.bancoCrm = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const tb = document.getElementById('tabelaCrmCorpo');
        if(tb) {
            tb.innerHTML = app.bancoCrm.map(c => `<tr><td><strong class="text-white">${c.nome}</strong></td><td>${c.telefone}</td><td>${c.documento||'-'}</td><td><span class="text-info">${c.usuario || 'Sem Acesso'}</span></td><td class="gestao-only text-end"><button class="btn btn-sm btn-outline-info me-1 border-0" onclick="app.abrirModalCRM('edit', '${c.id}')"><i class="bi bi-pencil"></i> Editar</button><button class="btn btn-sm btn-outline-danger border-0 admin-only" onclick="app.apagarCliente('${c.id}')"><i class="bi bi-trash"></i></button></td></tr>`).join('');
        }
        const list = document.getElementById('listaClientesCRM');
        if(list) list.innerHTML = app.bancoCrm.map(c => `<option value="${c.nome}" data-id="${c.id}">Tel: ${c.telefone}</option>`).join('');
        app.renderListaChatCRM();
    });
};

app.abrirModalCRM = function(mode = 'nova', id = '') {
    document.getElementById('c_id').value = '';
    ['c_nome', 'c_tel', 'c_doc', 'c_email', 'c_cep', 'c_rua', 'c_num', 'c_bairro', 'c_cidade', 'c_user', 'c_notas'].forEach(e => document.getElementById(e).value = '');
    document.getElementById('c_pass').value = Math.random().toString(36).slice(-6);
    
    if(mode === 'edit') {
        const c = app.bancoCrm.find(x => x.id === id);
        if(c) {
            document.getElementById('c_id').value = c.id; 
            document.getElementById('c_nome').value = c.nome || ''; document.getElementById('c_tel').value = c.telefone || ''; 
            document.getElementById('c_doc').value = c.documento || ''; document.getElementById('c_email').value = c.email || '';
            document.getElementById('c_cep').value = c.cep || ''; document.getElementById('c_rua').value = c.rua || '';
            document.getElementById('c_num').value = c.num || ''; document.getElementById('c_bairro').value = c.bairro || '';
            document.getElementById('c_cidade').value = c.cidade || '';
            document.getElementById('c_user').value = c.usuario || ''; document.getElementById('c_pass').value = c.senha || ''; 
            document.getElementById('c_notas').value = c.anotacoes || '';
        }
    }
    new bootstrap.Modal(document.getElementById('modalCrm')).show();
};

app.salvarClienteCRM = async function(e) {
    e.preventDefault();
    const id = document.getElementById('c_id').value;
    const payload = { 
        tenantId: app.t_id, nome: document.getElementById('c_nome').value, telefone: document.getElementById('c_tel').value, 
        documento: document.getElementById('c_doc').value.replace(/\D/g, ''), email: document.getElementById('c_email').value,
        cep: document.getElementById('c_cep').value, rua: document.getElementById('c_rua').value, num: document.getElementById('c_num').value,
        bairro: document.getElementById('c_bairro').value, cidade: document.getElementById('c_cidade').value,
        usuario: document.getElementById('c_user').value.trim(), senha: document.getElementById('c_pass').value.trim(), anotacoes: document.getElementById('c_notas').value || '' 
    };
    
    if(id) { await app.db.collection('clientes_base').doc(id).update(payload); app.showToast("Ficha atualizada."); } 
    else { await app.db.collection('clientes_base').add(payload); app.showToast("Novo cliente cadastrado."); }
    e.target.reset(); bootstrap.Modal.getInstance(document.getElementById('modalCrm')).hide();
};

app.apagarCliente = async function(id) {
    if(app.t_role !== 'admin') { app.showToast("Apenas proprietário pode apagar cliente.", "error"); return; }
    if(confirm("Apagar cliente? A base de dados será impactada.")) { await app.db.collection('clientes_base').doc(id).delete(); app.showToast("Removido.", "success"); }
};

app.aoSelecionarClienteOS = function() {
    const nomeDigitado = document.getElementById('os_cliente').value.trim();
    const cliente = app.bancoCrm.find(c => c.nome.toLowerCase() === nomeDigitado.toLowerCase());
    if(cliente) { document.getElementById('os_celular').value = cliente.telefone || ''; document.getElementById('os_cliente_id').value = cliente.id; }
};

app.enviarWhatsAppAprovacao = function() {
    const nome = document.getElementById('os_cliente').value;
    const cel = document.getElementById('os_celular').value;
    const cZ = app.bancoCrm.find(x => x.nome === nome);
    if(!cel) return app.showToast("Celular não informado.", "error");
    const u = window.location.origin + window.location.pathname.replace('painel_oficina.html', 'clientes/projeto_oficina.html');
    let txt = `Olá ${nome}! A O.S. do seu veículo foi atualizada na *${app.t_nome}*.\nAcesse o portal para ver fotos, orçamento e aprovar:\n👉 ${u}`;
    if(cZ && cZ.usuario) { txt += `\n\nLogin: ${cZ.usuario}\nPIN: ${cZ.senha}`; }
    window.open(`https://wa.me/55${cel.replace(/\D/g, '')}?text=${encodeURIComponent(txt)}`, '_blank');
};

// =====================================================================
// 4. CHAT GLOBAL CRM (COLEÇÃO: MENSAGENS)
// =====================================================================
app.iniciarEscutaMensagens = function() {
    app.db.collection('mensagens').where('tenantId', '==', app.t_id).onSnapshot(snap => {
        app.bancoMensagens = snap.docs.map(d => ({id: d.id, ...d.data()}));
        app.bancoMensagens.sort((a,b) => (a.timestamp?.toMillis()||0) - (b.timestamp?.toMillis()||0));
        let nL = 0; app.bancoMensagens.forEach(m => { if(m.sender === 'cliente' && !m.lidaAdmin) nL++; });
        const badge = document.getElementById('chatBadgeGlobal');
        if(badge) { if(nL > 0) { badge.innerText = nL; badge.classList.remove('d-none'); } else { badge.classList.add('d-none'); } }
        app.renderListaChatCRM();
        if(app.chatActiveClienteId) app.abrirChatCRM(app.chatActiveClienteId, document.getElementById('chatNomeCliente').innerText.replace('Ativo com: ', ''));
    });
};

app.renderListaChatCRM = function() {
    const lista = document.getElementById('chatListaClientesCRM'); if(!lista) return;
    lista.innerHTML = app.bancoCrm.map(c => {
        const naoLidas = app.bancoMensagens.filter(m => m.clienteId === c.id && m.sender === 'cliente' && !m.lidaAdmin).length;
        const bHtml = naoLidas > 0 ? `<span class="badge bg-danger ms-2">${naoLidas}</span>` : '';
        return `<button class="list-group-item list-group-item-action bg-transparent text-white border-secondary py-3" onclick="app.abrirChatCRM('${c.id}', '${c.nome}')">
            <i class="bi bi-person-circle text-primary me-2"></i> ${c.nome}${bHtml}</button>`;
    }).join('');
};

app.abrirChatCRM = function(clienteId, nomeCliente) {
    app.chatActiveClienteId = clienteId;
    document.getElementById('chatNomeCliente').innerHTML = `Ativo com: <b class="text-accent">${nomeCliente}</b>`;
    document.getElementById('chatAreaInputGlobal').style.display = 'flex';
    const area = document.getElementById('chatAreaMsgGlobal'); if(!area) return;
    area.innerHTML = '';
    const mD = app.bancoMensagens.filter(x => x.clienteId === clienteId);
    mD.forEach(x => {
        if(x.sender === 'cliente' && !x.lidaAdmin) app.db.collection('mensagens').doc(x.id).update({lidaAdmin: true});
        const t = x.timestamp ? new Date(x.timestamp.toDate()).toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'}) : '...';
        let content = x.text;
        if(x.fileUrl) {
            if(x.fileType==='video'||x.fileUrl.includes('.mp4')) content += `<br><video src="${x.fileUrl}" controls class="mw-100 rounded mt-2"></video>`;
            else if(x.fileType==='audio'||x.fileUrl.includes('.mp3')) content += `<br><audio src="${x.fileUrl}" controls class="mw-100 mt-2"></audio>`;
            else content += `<br><img src="${x.fileUrl}" class="mw-100 rounded mt-2 shadow-sm" onclick="window.open('${x.fileUrl}')">`;
        }
        area.innerHTML += `<div class="message ${x.sender === 'admin' ? 'admin' : 'cliente'}">${content}<small class="d-block text-end opacity-50">${t}</small></div>`;
    });
    area.scrollTop = area.scrollHeight;
};

app.enviarMensagemChatGlobal = async function() {
    const input = document.getElementById('inputChatGlobal');
    if(!input.value.trim() || !app.chatActiveClienteId) return;
    await app.db.collection('mensagens').add({ tenantId: app.t_id, clienteId: app.chatActiveClienteId, sender: 'admin', text: input.value.trim(), lidaCliente: false, timestamp: firebase.firestore.FieldValue.serverTimestamp() });
    input.value = '';
};

app.enviarAnexoChatGlobal = async function() {
    const inp = document.getElementById('chatFileInputGlobal'); if(!inp.files[0]) return;
    app.showToast("Enviando mídia...", "warning");
    const fd = new FormData(); fd.append('file', inp.files[0]); fd.append('upload_preset', app.CLOUDINARY_UPLOAD_PRESET);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${app.CLOUDINARY_CLOUD_NAME}/auto/upload`, {method:'POST', body:fd});
    const data = await res.json();
    await app.db.collection('mensagens').add({ tenantId: app.t_id, clienteId: app.chatActiveClienteId, sender: 'admin', text: "📎 Mídia enviada:", fileUrl: data.secure_url, fileType: data.resource_type, lidaCliente: false, timestamp: firebase.firestore.FieldValue.serverTimestamp() });
    app.showToast("Enviado!");
};

// =====================================================================
// 5. ESTOQUE E ENTRADA XML REAL (INFINITA)
// =====================================================================
app.abrirModalNF = function(mode='nova', id='') {
    document.getElementById('formNF').reset();
    document.getElementById('corpoItensNF').innerHTML = '';
    document.getElementById('p_id').value = '';
    document.getElementById('nf_data').value = new Date().toISOString().split('T')[0];
    
    if(mode === 'edit') {
        const p = app.bancoEstoque.find(x => x.id === id);
        if(p) {
            document.getElementById('p_id').value = p.id;
            document.getElementById('nf_fornecedor').value = p.fornecedor || '';
            document.getElementById('nf_numero').value = p.nf || '';
            document.getElementById('nf_data').value = p.dataEntrada ? p.dataEntrada.split('T')[0] : new Date().toISOString().split('T')[0];
            app.adicionarLinhaNF(p.desc, p.ncm, p.cfop, p.qtd, p.custo, p.venda);
        }
    } else {
        app.adicionarLinhaNF('', '', '', 1, 0, 0); // Sempre inicia com 1 linha vazia
    }
    new bootstrap.Modal(document.getElementById('modalNF')).show();
};

app.processarXML = function(event) {
    const file = event.target.files[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const parser = new DOMParser(); const xmlDoc = parser.parseFromString(e.target.result, "text/xml");
        const emit = xmlDoc.getElementsByTagName("emit")[0]; if(emit) document.getElementById('nf_fornecedor').value = emit.getElementsByTagName("xNome")[0].textContent;
        const ide = xmlDoc.getElementsByTagName("ide")[0]; if(ide) document.getElementById('nf_numero').value = ide.getElementsByTagName("nNF")[0].textContent;
        const det = xmlDoc.getElementsByTagName("det");
        
        document.getElementById('corpoItensNF').innerHTML = ''; // Limpa linhas manuais
        for(let i=0; i<det.length; i++) {
            const p = det[i].getElementsByTagName("prod")[0];
            app.adicionarLinhaNF(p.getElementsByTagName("xProd")[0].textContent, p.getElementsByTagName("NCM")[0].textContent, p.getElementsByTagName("CFOP")[0].textContent, parseFloat(p.getElementsByTagName("qCom")[0].textContent), parseFloat(p.getElementsByTagName("vUnCom")[0].textContent), parseFloat(p.getElementsByTagName("vUnCom")[0].textContent)*1.8);
        }
        app.showToast("XML Importado com sucesso!");
    };
    reader.readAsText(file);
};

app.adicionarLinhaNF = function(desc='', ncm='', cfop='', qtd=1, custo=0, venda=0) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td><input type="text" class="form-control form-control-sm bg-dark text-white it-desc" value="${desc}" required></td><td><input type="text" class="form-control form-control-sm bg-dark text-white it-ncm" value="${ncm}"></td><td><input type="text" class="form-control form-control-sm bg-dark text-white it-cfop" value="${cfop}"></td><td><input type="number" class="form-control form-control-sm bg-dark text-white it-qtd" value="${qtd}" min="1"></td><td><input type="number" step="0.01" class="form-control form-control-sm bg-dark text-danger it-custo" value="${custo}"></td><td><input type="number" step="0.01" class="form-control form-control-sm bg-dark text-success it-venda fw-bold" value="${venda}"></td><td><button type="button" class="btn btn-sm btn-outline-danger p-0 px-2" onclick="this.closest('tr').remove()">X</button></td>`;
    document.getElementById('corpoItensNF').appendChild(tr);
};

app.verificarPgtoCompraNF = function() {
    const f = document.getElementById('nf_metodo_pagamento').value;
    const d = document.getElementById('nf_div_parcelas');
    if(d) d.style.display = f.includes('Parcelado') ? 'block' : 'none';
};

app.salvarEntradaEstoque = async function(e) {
    e.preventDefault();
    const id = document.getElementById('p_id').value;
    const fornecedor = document.getElementById('nf_fornecedor').value; 
    const nf = document.getElementById('nf_numero').value;
    const fp = document.getElementById('nf_metodo_pagamento').value; 
    const dtBase = document.getElementById('nf_data').value;
    const parc = document.getElementById('nf_parcelas').value;
    const gerarFinanceiro = document.getElementById('nf_gerar_financeiro').checked;
    
    const batch = app.db.batch(); let totalNF = 0;
    
    if(id) {
        const tr = document.querySelector('#corpoItensNF tr');
        if(tr) {
            batch.update(app.db.collection('estoque').doc(id), {
                fornecedor, nf, desc: tr.querySelector('.it-desc').value, qtd: parseFloat(tr.querySelector('.it-qtd').value), custo: parseFloat(tr.querySelector('.it-custo').value), venda: parseFloat(tr.querySelector('.it-venda').value), ncm: tr.querySelector('.it-ncm').value, cfop: tr.querySelector('.it-cfop').value
            });
        }
    } else {
        document.querySelectorAll('#corpoItensNF tr').forEach(tr => {
            const d = tr.querySelector('.it-desc').value; const q = parseFloat(tr.querySelector('.it-qtd').value); const c = parseFloat(tr.querySelector('.it-custo').value); const v = parseFloat(tr.querySelector('.it-venda').value);
            if(d && q > 0) {
                totalNF += (q * c);
                batch.set(app.db.collection('estoque').doc(), { tenantId: app.t_id, fornecedor, nf, desc: d, qtd: q, custo: c, venda: v, ncm: tr.querySelector('.it-ncm').value, cfop: tr.querySelector('.it-cfop').value, usuarioEntrada: app.user_nome, dataEntrada: new Date().toISOString() });
            }
        });

        if(gerarFinanceiro && totalNF > 0) {
            let nP = 1; if(fp.includes('Parcelado')) { if(parc.includes('2x')) nP=2; else if(parc.includes('3x')) nP=3; else if(parc.includes('4x')) nP=4; else if(parc.includes('6x')) nP=6; }
            const vP = totalNF / nP; 
            const sts = (fp.includes('Pix')||fp.includes('Dinheiro')) ? 'pago' : 'pendente';
            for(let i=0; i<nP; i++) { 
                let dV = new Date(dtBase); if(nP>1 || sts==='pendente') dV.setDate(dV.getDate() + (i*30)); 
                batch.set(app.db.collection('financeiro').doc(), { tenantId: app.t_id, tipo: 'despesa', desc: nP>1 ? `NF: ${nf} (${fornecedor}) - Parc ${i+1}/${nP}` : `NF: ${nf} (${fornecedor})`, valor: vP, parcelaAtual: i+1, totalParcelas: nP, metodo: fp, vencimento: dV.toISOString().split('T')[0], status: sts }); 
            }
        }
    }

    await batch.commit(); app.showToast("Estoque Atualizado!"); bootstrap.Modal.getInstance(document.getElementById('modalNF')).hide();
};

app.apagarProduto = async function(id) {
    if(app.t_role !== 'admin') { app.showToast("Apenas administrador pode excluir.", "error"); return; }
    if(confirm("Excluir produto do estoque?")) { await app.db.collection('estoque').doc(id).delete(); }
};

// =====================================================================
// 6. MOTOR KANBAN E O.S. (PEÇAS INFINITAS)
// =====================================================================
app.iniciarEscutaOS = function() {
    app.db.collection('ordens_servico').where('tenantId', '==', app.t_id).onSnapshot(snap => {
        app.bancoOSCompleto = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        app.renderizarKanban(); app.renderizarTabelaArquivo();
    });
};

app.renderizarKanban = function() {
    const t = document.getElementById('buscaGeral').value.toLowerCase();
    const cols = { patio: '', orcamento: '', aprovacao: '', box: '', pronto: '' };
    const counts = { patio: 0, orcamento: 0, aprovacao: 0, box: 0, pronto: 0 };
    
    app.bancoOSCompleto.filter(os => os.status !== 'entregue').forEach(os => {
        if(t && !os.placa.toLowerCase().includes(t) && !os.cliente.toLowerCase().includes(t)) return;
        counts[os.status]++;
        cols[os.status] += `<div class="os-card border-start border-4 ${os.status==='pronto'?'border-success':'border-info'}" onclick="app.abrirModalOS('edit', '${os.id}')">
            <div class="fast-actions"><button class="btn btn-sm btn-dark" onclick="event.stopPropagation(); app.mudarStatusRapido('${os.id}','${os.status}')">></button></div>
            <span class="badge bg-dark border border-secondary mb-2">${os.placa}</span>
            <h6 class="text-white mb-1">${os.veiculo}</h6><small class="text-white-50">${os.cliente}</small></div>`;
    });
    Object.keys(cols).forEach(k => { document.getElementById('col_'+k).innerHTML = cols[k]; document.getElementById('count_'+k).innerText = counts[k]; });
};

app.mudarStatusRapido = async function(id, novoStatus) {
    const osRef = app.db.collection('ordens_servico').doc(id);
    const doc = await osRef.get();
    let h = doc.data().historico || [];
    h.push({ data: new Date().toISOString(), usuario: app.user_nome, acao: `Status alterado para: ${novoStatus.toUpperCase()}` });
    await osRef.update({ status: novoStatus, historico: h, ultimaAtualizacao: new Date().toISOString() });
};

app.abrirModalOS = function(mode = 'nova', id = '') {
    document.getElementById('formOS').reset();
    document.getElementById('listaPecasCorpo').innerHTML = ''; // Zera Tabela de Peças
    app.fotosOSAtual = []; app.historicoOSAtual = [];
    document.getElementById('header_placa').innerText = '';
    document.getElementById('listaHistorico').innerHTML = '';
    
    const btnFat = document.getElementById('btnFaturar'); if(btnFat) btnFat.classList.add('d-none');
    const btnPdf = document.getElementById('btnGerarPDF'); if(btnPdf) btnPdf.classList.add('d-none');
    const btnDel = document.getElementById('btnDeletarOS'); if(btnDel) btnDel.classList.add('d-none');
    
    ['chk_combustivel', 'chk_arranhado', 'chk_bateria', 'chk_pneus'].forEach(i => { const chk = document.getElementById(i); if(chk) chk.checked = false; });

    if (mode === 'edit') {
        const os = app.bancoOSCompleto.find(x => x.id === id);
        if (os) {
            document.getElementById('os_id').value = os.id;
            document.getElementById('os_placa').value = os.placa || '';
            document.getElementById('header_placa').innerText = `[${os.placa}]`;
            document.getElementById('os_veiculo').value = os.veiculo || '';
            document.getElementById('os_cliente').value = os.cliente || '';
            document.getElementById('os_cliente_id').value = os.clienteId || ''; 
            
            const cZ = app.bancoCrm.find(c => c.nome === os.cliente);
            document.getElementById('os_celular').value = cZ ? cZ.telefone : (os.celular || '');
            
            document.getElementById('os_status').value = os.status || 'patio';
            document.getElementById('os_relato_cliente').value = os.relatoCliente || '';
            document.getElementById('os_diagnostico').value = os.diagnostico || '';
            
            if(os.chk_combustivel) document.getElementById('chk_combustivel').checked = true;
            if(os.chk_arranhado) document.getElementById('chk_arranhado').checked = true;
            if(os.chk_bateria) document.getElementById('chk_bateria').checked = true;
            if(os.chk_pneus) document.getElementById('chk_pneus').checked = true;
            
            if (os.fotos) { app.fotosOSAtual = os.fotos; app.renderizarGaleria(); }
            if (os.historico) { app.historicoOSAtual = os.historico; app.renderizarHistorico(); }
            
            if (os.pecas) os.pecas.forEach(p => app.adicionarLinhaPeca(p.desc, p.qtd, p.custo, p.venda, p.idEstoque, p.isMaoObra));
            
            if(btnPdf) btnPdf.classList.remove('d-none');
            if (os.status === 'pronto' && (app.t_role === 'admin' || app.t_role === 'gerente') && btnFat) btnFat.classList.remove('d-none');
            if (app.t_role === 'admin' && btnDel) btnDel.classList.remove('d-none');
        }
    } else {
        app.adicionarMaoDeObra();
    }
    app.verificarStatusLink();
    new bootstrap.Modal(document.getElementById('modalOS')).show();
};

app.adicionarDoEstoque = function() {
    const sel = document.getElementById('selectProdutoEstoque'); if(!sel || !sel.value) return;
    const opt = sel.options[sel.selectedIndex];
    app.adicionarLinhaPeca(opt.dataset.desc, 1, parseFloat(opt.dataset.custo), parseFloat(opt.dataset.venda), sel.value, false);
    sel.value = '';
};

app.adicionarMaoDeObra = function() { app.adicionarLinhaPeca("Serviço / Mão de Obra", 1, 0, 0, null, true); };

app.adicionarLinhaPeca = function(desc, qtd, custo, venda, idEstoque, isMaoObra) {
    const tr = document.createElement('tr');
    const mo = isMaoObra ? `data-maoobra="true"` : '';
    const est = idEstoque ? `data-idestoque="${idEstoque}" readonly` : '';
    tr.innerHTML = `<td><input type="text" class="form-control form-control-sm bg-dark text-white border-secondary peca-desc p-2" value="${desc}" ${est} ${mo}></td>
        <td><input type="number" class="form-control form-control-sm bg-dark text-white border-secondary peca-qtd p-2" value="${qtd}" min="1" onchange="app.calcularTotalOS()"></td>
        <td class="gestao-only"><input type="number" step="0.01" class="form-control form-control-sm bg-dark text-danger border-secondary peca-custo p-2" value="${custo}" onchange="app.calcularTotalOS()"></td>
        <td><input type="number" step="0.01" class="form-control form-control-sm bg-dark text-success border-secondary peca-venda p-2 fw-bold" value="${venda}" onchange="app.calcularTotalOS()"></td>
        <td><input type="text" class="form-control form-control-sm bg-black text-white border-0 peca-total fw-bold p-2" readonly value="${(qtd*venda).toFixed(2)}"></td>
        <td class="text-center"><button type="button" class="btn btn-sm btn-outline-danger border-0 mt-1" onclick="this.closest('tr').remove(); app.calcularTotalOS()"><i class="bi bi-trash"></i></button></td>`;
    document.getElementById('listaPecasCorpo').appendChild(tr);
    app.calcularTotalOS();
};

app.calcularTotalOS = function() {
    let t = 0; let tc = 0;
    document.querySelectorAll('#listaPecasCorpo tr').forEach(tr => {
        const q = parseFloat(tr.querySelector('.peca-qtd').value)||0;
        const v = parseFloat(tr.querySelector('.peca-venda').value)||0;
        const c = parseFloat(tr.querySelector('.peca-custo').value)||0;
        tr.querySelector('.peca-total').value = (q*v).toFixed(2);
        t += (q*v); tc += (q*c);
    });
    const divGeral = document.getElementById('os_total_geral'); if(divGeral) divGeral.innerText = `R$ ${t.toFixed(2).replace('.',',')}`;
    return t;
};

app.salvarOS = async function() {
    const id = document.getElementById('os_id').value;
    let pecasArray = []; let tVenda = 0; let tCusto = 0; let tMO = 0;
    const clienteOS = document.getElementById('os_cliente').value.trim();
    const telOS = document.getElementById('os_celular').value.trim();

    let cId = document.getElementById('os_cliente_id').value;
    if(clienteOS && !app.bancoCrm.find(c => c.nome.toLowerCase() === clienteOS.toLowerCase())) {
        const p = { tenantId: app.t_id, nome: clienteOS, telefone: telOS, usuario: '', senha: '' };
        const d = await app.db.collection('clientes_base').add(p);
        cId = d.id;
    }

    document.querySelectorAll('#listaPecasCorpo tr').forEach(tr => {
        const descInput = tr.querySelector('.peca-desc'); const desc = descInput.value.trim();
        const idEstoque = descInput.dataset.idestoque || null; const isMaoObra = descInput.dataset.maoobra === "true";
        const q = parseFloat(tr.querySelector('.peca-qtd').value)||1; const c = parseFloat(tr.querySelector('.peca-custo').value)||0; const v = parseFloat(tr.querySelector('.peca-venda').value)||0;
        if (desc !== '') { pecasArray.push({ desc, qtd:q, custo:c, venda:v, idEstoque, isMaoObra }); tVenda += (q*v); tCusto += (q*c); if(isMaoObra) tMO += (q*v); }
    });
    
    app.historicoOSAtual.push({ data: new Date().toISOString(), usuario: app.user_nome, acao: id ? "O.S e Orçamento atualizados." : "O.S. Técnica Aberta." });
    
    const payload = {
        tenantId: app.t_id, placa: document.getElementById('os_placa').value.toUpperCase(),
        veiculo: document.getElementById('os_veiculo').value, cliente: clienteOS, clienteId: cId, celular: telOS,
        status: document.getElementById('os_status').value, relatoCliente: document.getElementById('os_relato_cliente').value,
        diagnostico: document.getElementById('os_diagnostico').value,
        chk_combustivel: document.getElementById('chk_combustivel') ? document.getElementById('chk_combustivel').checked : false, 
        chk_arranhado: document.getElementById('chk_arranhado') ? document.getElementById('chk_arranhado').checked : false,
        chk_bateria: document.getElementById('chk_bateria') ? document.getElementById('chk_bateria').checked : false, 
        chk_pneus: document.getElementById('chk_pneus') ? document.getElementById('chk_pneus').checked : false,
        pecas: pecasArray, total: tVenda, custoTotal: tCusto, maoObraTotal: tMO, fotos: app.fotosOSAtual,
        historico: app.historicoOSAtual, ultimaAtualizacao: new Date().toISOString()
    };
    
    if (!id) payload.mecanico = app.user_nome;
    
    if (document.getElementById('os_status').value === 'entregue') { app.showToast("Para fechar e entregar, use o botão Verde de FATURAR.", "warning"); return; }
    
    if (id) await app.db.collection('ordens_servico').doc(id).update(payload);
    else await app.db.collection('ordens_servico').add(payload);
    
    app.showToast("Ficha salva no Pátio.", "success");
    bootstrap.Modal.getInstance(document.getElementById('modalOS')).hide();
};

// =====================================================================
// 7. FATURAMENTO EVOLUTION (DRE INTEGRADO COM STATUS)
// =====================================================================
app.processarFaturamentoCompleto = async function() {
    if(!app.osParaFaturar) return;
    const fp = document.getElementById('fat_metodo').value; const parc = document.getElementById('fat_parcelas').value;
    const batch = app.db.batch();
    
    let nP = 1; 
    if(fp.includes('Parcelado')) {
        if(parc.includes('2x') || parc.includes('30/60')) nP = 2;
        else if(parc.includes('3x') || parc.includes('90')) nP = 3;
        else if(parc.includes('4x')) nP = 4; else if(parc.includes('5x')) nP = 5; else if(parc.includes('6x')) nP = 6;
        else if(parc.includes('10x')) nP = 10; else if(parc.includes('12x')) nP = 12;
    }
    const vP = app.osParaFaturar.total / nP;
    const sts = (fp.includes('Boleto') || fp.includes('Pendente') || fp.includes('Parcelado') || fp.includes('Crédito')) ? 'pendente' : 'pago';
    
    for(let i=0; i<nP; i++) {
        let dV = new Date(); if(nP>1 || sts==='pendente') dV.setDate(dV.getDate() + (i*30));
        batch.set(app.db.collection('financeiro').doc(), { tenantId: app.t_id, tipo: 'receita', desc: nP>1 ? `O.S: ${app.osParaFaturar.placa} - Parc ${i+1}/${nP}` : `O.S: ${app.osParaFaturar.placa}`, valor: vP, parcelaAtual: i+1, totalParcelas: nP, metodo: fp, vencimento: dV.toISOString().split('T')[0], status: sts });
    }
    
    if(app.osParaFaturar.pecas && !app.osParaFaturar.baixaEstoqueFeita) {
        for (const p of app.osParaFaturar.pecas) {
            if (p.idEstoque) {
                const estRef = app.db.collection('estoque').doc(p.idEstoque);
                const estDoc = await estRef.get();
                if(estDoc.exists) batch.update(estRef, { qtd: Math.max(0, estDoc.data().qtd - p.qtd) });
            }
        }
    }
    
    let h = app.osParaFaturar.historico || [];
    h.push({ data: new Date().toISOString(), usuario: "Caixa Master", acao: `O.S. Faturada: ${fp} (${nP}x). Estoque Baixado.` });
    batch.update(app.db.collection('ordens_servico').doc(app.osParaFaturar.id), { status: 'entregue', baixaEstoqueFeita: true, historico: h, ultimaAtualizacao: new Date().toISOString() });
    
    await batch.commit(); app.showToast("Entrega Registrada no DRE!", "success"); 
    bootstrap.Modal.getInstance(document.getElementById('modalFaturamento')).hide();
    const modalOS = bootstrap.Modal.getInstance(document.getElementById('modalOS')); if(modalOS) modalOS.hide();
};

// =====================================================================
// 8. FINANCEIRO AVULSO (EDIÇÃO E INSERÇÃO)
// =====================================================================
app.abrirModalFinanceiro = function(mode='nova', tipo='', id='') {
    document.getElementById('formFinanceiro').reset();
    document.getElementById('fin_id').value = '';
    document.getElementById('fin_tipo').value = tipo;
    document.getElementById('fin_titulo').innerHTML = tipo === 'receita' ? '<i class="bi bi-plus-circle text-success me-2"></i> Receita' : '<i class="bi bi-dash-circle text-danger me-2"></i> Despesa';
    document.getElementById('fin_data').value = new Date().toISOString().split('T')[0];
    document.getElementById('divStatusEdit').style.display = 'none';
    
    if(mode === 'edit') {
        const f = app.bancoFin.find(x => x.id === id);
        if(f) {
            document.getElementById('fin_id').value = f.id;
            document.getElementById('fin_desc').value = f.desc;
            document.getElementById('fin_valor').value = f.valor;
            document.getElementById('fin_data').value = f.vencimento.split('T')[0];
            document.getElementById('fin_metodo').value = f.metodo;
            document.getElementById('fin_status').value = f.status;
            document.getElementById('divParcelas').style.display = 'none'; // Não parcela na edição, edita título único
            document.getElementById('divStatusEdit').style.display = 'block'; // Permite forçar o status
        }
    } else {
        app.verificarPgtoFinManual();
    }
    new bootstrap.Modal(document.getElementById('modalFin')).show();
};

app.salvarLancamentoFinanceiro = async function(e) {
    e.preventDefault();
    const id = document.getElementById('fin_id').value;
    const tipo = document.getElementById('fin_tipo').value; 
    const desc = document.getElementById('fin_desc').value;
    const valor = parseFloat(document.getElementById('fin_valor').value); 
    const dataVenc = document.getElementById('fin_data').value;
    const fp = document.getElementById('fin_metodo').value; 
    
    if(id) {
        await app.db.collection('financeiro').doc(id).update({ desc, valor, vencimento: dataVenc, metodo: fp, status: document.getElementById('fin_status').value });
        app.showToast("Título financeiro atualizado.", "success");
    } else {
        const parcelasText = document.getElementById('fin_parcelas').value;
        const batch = app.db.batch();
        let nP = 1; if(fp.includes('Parcelado')) nP = parseInt(parcelasText);
        const vP = valor / nP; 
        const stsPgto = (fp.includes('Boleto') || fp.includes('Pendente') || fp.includes('Parcelado') || fp.includes('Crédito')) ? 'pendente' : 'pago';

        for(let i=0; i<nP; i++) {
            let v = new Date(dataVenc); if(nP>1 || stsPgto==='pendente') v.setMonth(v.getMonth() + i);
            batch.set(app.db.collection('financeiro').doc(), { tenantId: app.t_id, tipo: tipo, desc: nP>1 ? `${desc} - Parc ${i+1}/${nP}`: desc, valor: vP, parcelaAtual: i+1, totalParcelas: nP, metodo: fp, vencimento: v.toISOString().split('T')[0], status: stsPgto });
        }
        await batch.commit(); app.showToast("Lançamento processado no DRE.", "success");
    }
    bootstrap.Modal.getInstance(document.getElementById('modalFin')).hide();
};

// =====================================================================
// 9. LAUDO PDF COM MINIATURAS E CLOUDINARY
// =====================================================================
async function carregarImagemBase64(url) {
    const res = await fetch(url); const blob = await res.blob();
    return new Promise((resolve) => {
        const reader = new FileReader(); reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
    });
}

app.exportarPDFMenechelli = async function() {
    const btn = document.getElementById('btnGerarPDF'); btn.innerHTML = 'Processando...'; btn.disabled = true;
    try {
        const { jsPDF } = window.jspdf; const doc = new jsPDF(); let y = 20;
        doc.setFontSize(22); doc.text(app.t_nome, 105, y, {align:'center'}); y+=15;
        doc.setFontSize(12); doc.text(`Laudo Técnico - Placa: ${document.getElementById('os_placa').value}`, 20, y); y+=10;
        
        const rows = []; document.querySelectorAll('#listaPecasCorpo tr').forEach(tr => rows.push([tr.querySelector('.peca-desc').value, tr.querySelector('.peca-qtd').value, tr.querySelector('.peca-venda').value, tr.querySelector('.peca-total').value]));
        doc.autoTable({ startY: y, head: [['Peça/Serviço', 'Qtd', 'Unit', 'Total']], body: rows });
        y = doc.lastAutoTable.finalY + 15;

        if(app.fotosOSAtual.length > 0) {
            doc.text("Evidências Fotográficas:", 20, y); y+=5;
            let x = 20;
            for(const url of app.fotosOSAtual) {
                try {
                    const b64 = await carregarImagemBase64(url);
                    if(x > 160) { x = 20; y += 45; }
                    if(y > 250) { doc.addPage(); y = 20; }
                    doc.addImage(b64, 'JPEG', x, y, 40, 40); x += 45;
                } catch(e) { console.error("Erro na imagem"); }
            }
        }
        doc.save(`OS_${document.getElementById('os_placa').value}.pdf`);
    } catch(e) { app.showToast("Erro ao gerar PDF", "error"); }
    btn.innerHTML = 'Imprimir Laudo com Fotos'; btn.disabled = false;
};

// =====================================================================
// 10. J.A.R.V.I.S E IA (GEMINI 2.5 FLASH)
// =====================================================================
app.chamarGemini = async function(prompt) {
    if(!app.API_KEY_GEMINI) return "IA Desativada. Chave não configurada no Master Hub.";
    try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${app.API_KEY_GEMINI}`, {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        const data = await res.json(); return data.candidates[0].content.parts[0].text;
    } catch(e) { return "Erro na conexão com a Inteligência Artificial."; }
};

app.perguntarJarvis = async function() {
    const inp = document.getElementById('jarvisInput'); const resDiv = document.getElementById('jarvisResposta');
    if(!inp.value) return; resDiv.classList.remove('d-none'); resDiv.innerHTML = '<span class="spinner-border text-info spinner-border-sm me-2"></span> J.A.R.V.I.S está processando...';
    
    const ctx = app.bancoIA.map(i => i.texto).join('\n');
    const dadosOS = app.bancoOSCompleto.filter(o=>o.status !== 'entregue').map(o => `[Placa: ${o.placa} | Cliente: ${o.cliente} | Veículo: ${o.veiculo} | Status: ${o.status} | Problema: ${o.relatoCliente || ''}]`).join('\n');
    
    const prompt = `Você é o J.A.R.V.I.S, assistente virtual automotivo da oficina "${app.t_nome}". Responda de forma direta e técnica.
    MANUAIS DA OFICINA: ${ctx}
    VEÍCULOS NO PÁTIO: ${dadosOS}
    PERGUNTA: ${inp.value}`;
    
    resDiv.innerHTML = await app.chamarGemini(prompt);
};
