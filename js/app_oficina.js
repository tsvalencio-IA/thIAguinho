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

// Credenciais dinâmicas ESTABELECIDAS (NÃO ALTERAR)
app.CLOUDINARY_CLOUD_NAME = sessionStorage.getItem('t_cloudName') || 'dmuvm1o6m'; 
app.CLOUDINARY_UPLOAD_PRESET = sessionStorage.getItem('t_cloudPreset') || 'evolution'; 
app.t_id = sessionStorage.getItem('t_id');
app.t_nome = sessionStorage.getItem('t_nome');
app.t_role = sessionStorage.getItem('t_role'); 
app.user_nome = sessionStorage.getItem('f_nome');
app.user_comissao_mo = parseFloat(sessionStorage.getItem('f_comissao') || 0); 
app.user_comissao_pecas = parseFloat(sessionStorage.getItem('f_comissao_pecas') || 0);

// Variáveis Globais de Estado
app.bancoOS = [];
app.bancoOSCompleto = [];
app.bancoClientes = [];
app.bancoEstoque = [];
app.bancoFinanceiro = [];
app.bancoIA = [];
app.equipe = [];
app.chatClienteAtual = null;
app.osAtual = null;

// =====================================================================
// 2. INICIALIZAÇÃO E CONTROLE DE ACESSO (RBAC)
// =====================================================================
document.addEventListener('DOMContentLoaded', () => {
    if (!app.t_id) { window.location.href = 'index.html'; return; }
    
    document.getElementById('lblEmpresa').innerText = app.t_nome;
    document.getElementById('lblUsuario').innerText = app.user_nome || 'Gestor Master';
    
    app.aplicarRBAC();
    app.montarMenu();
    app.iniciarEscutasGlobais();
    
    // Mostra o Dashboard (Pátio) por padrão
    app.navegar('tela_os', 'Dashboard Pátio');
});

app.sair = function() {
    sessionStorage.clear();
    window.location.href = 'index.html';
};

app.showToast = function(msg, tipo = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const bg = tipo === 'success' ? 'bg-success' : (tipo === 'error' ? 'bg-danger' : (tipo === 'warning' ? 'bg-warning text-dark' : 'bg-info text-dark'));
    const toastHtml = `
        <div class="toast align-items-center ${bg} text-white border-0 mb-2 shadow" role="alert" aria-live="assertive" aria-atomic="true" style="opacity:1; display:block; min-width:250px;">
            <div class="d-flex">
                <div class="toast-body fw-bold">${msg}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" onclick="this.parentElement.parentElement.remove()"></button>
            </div>
        </div>`;
    container.insertAdjacentHTML('beforeend', toastHtml);
    const elements = container.querySelectorAll('.toast');
    const newToast = elements[elements.length - 1];
    setTimeout(() => { if (newToast) newToast.remove(); }, 4000);
};

app.aplicarRBAC = function() {
    const isAdmin = (!app.t_role || app.t_role === 'gerente' || app.t_role === 'admin');
    
    document.querySelectorAll('.admin-only').forEach(el => el.style.display = isAdmin ? 'block' : 'none');
    document.querySelectorAll('.gestao-only').forEach(el => el.style.display = isAdmin ? 'block' : 'none');
    document.querySelectorAll('.mecanico-only').forEach(el => el.style.display = !isAdmin ? 'block' : 'none');
    
    if(!isAdmin && document.getElementById('lblComissaoUser')) {
        document.getElementById('lblComissaoUser').innerText = `Comissão: ${app.user_comissao_mo}% (M.O) | ${app.user_comissao_pecas}% (Peças)`;
    }
};

app.montarMenu = function() {
    const menu = document.getElementById('menuLateral');
    const isAdmin = (!app.t_role || app.t_role === 'gerente' || app.t_role === 'admin');
    
    let html = `
        <a class="nav-link active" onclick="app.navegar('tela_os', 'Dashboard Pátio', this)"><i class="bi bi-kanban"></i> Pátio Ativo (O.S)</a>
        <a class="nav-link" onclick="app.navegar('tela_jarvis', 'Inteligência Automotiva', this)"><i class="bi bi-robot text-info"></i> Assistente J.A.R.V.I.S</a>
        <a class="nav-link" onclick="app.navegar('tela_chat_interno', 'Comunicação da Equipe', this)"><i class="bi bi-headset text-warning"></i> Chat Interno</a>
    `;
    
    if(isAdmin) {
        html += `
            <a class="nav-link" onclick="app.navegar('tela_chat', 'Atendimento aos Clientes', this)"><i class="bi bi-chat-dots"></i> Chat c/ Clientes</a>
            <a class="nav-link" onclick="app.navegar('tela_crm', 'Base de Clientes', this)"><i class="bi bi-people"></i> CRM / Clientes</a>
            <a class="nav-link" onclick="app.navegar('tela_estoque', 'Gestão de Estoque', this)"><i class="bi bi-box-seam"></i> Estoque e Compras</a>
            <a class="nav-link text-success" onclick="app.navegar('tela_financeiro', 'DRE e Financeiro', this)"><i class="bi bi-bank"></i> Fluxo de Caixa / DRE</a>
            <a class="nav-link" onclick="app.navegar('tela_equipe', 'RH e Pagamentos', this)"><i class="bi bi-person-badge"></i> Equipe e RH</a>
            <a class="nav-link text-warning" onclick="app.navegar('tela_arquivo', 'Histórico de O.S.', this)"><i class="bi bi-archive"></i> Arquivo Morto</a>
            <a class="nav-link text-info" onclick="app.navegar('tela_ia', 'Base de Conhecimento RAG', this)"><i class="bi bi-database-fill-up"></i> Treinamento IA (RAG)</a>
        `;
    }
    menu.innerHTML = html;
};

app.navegar = function(telaId, titulo, elementoClicado = null) {
    document.querySelectorAll('.modulo-tela').forEach(t => t.style.display = 'none');
    const tela = document.getElementById(telaId);
    if(tela) tela.style.display = 'block';
    
    document.getElementById('tituloPagina').innerText = titulo;
    
    if(elementoClicado) {
        document.querySelectorAll('.nav-sidebar .nav-link').forEach(l => l.classList.remove('active'));
        elementoClicado.classList.add('active');
    }
    
    if (window.innerWidth < 992) {
        document.getElementById('sidebar').classList.add('collapsed');
    }
    
    // Traz a chave do LocalStorage pro input visual caso abra a tela de IA
    if(telaId === 'tela_ia') {
        const keyLocal = localStorage.getItem('gemini_local_' + app.t_id);
        if(keyLocal) document.getElementById('localGeminiKey').value = keyLocal;
    }
};

app.filtrarGlobal = function() {
    const termo = document.getElementById('buscaGeral').value.toLowerCase();
    
    // Pátio
    document.querySelectorAll('.os-card').forEach(card => {
        const texto = card.innerText.toLowerCase();
        card.style.display = texto.includes(termo) ? 'block' : 'none';
    });
    
    // Arquivo Morto
    document.querySelectorAll('#tabelaArquivoCorpo tr').forEach(tr => {
        const texto = tr.innerText.toLowerCase();
        tr.style.display = texto.includes(termo) ? '' : 'none';
    });
    
    // CRM
    document.querySelectorAll('#tabelaCrmCorpo tr').forEach(tr => {
        const texto = tr.innerText.toLowerCase();
        tr.style.display = texto.includes(termo) ? '' : 'none';
    });
    
    // Estoque
    document.querySelectorAll('#tabelaEstoqueCorpo tr').forEach(tr => {
        const texto = tr.innerText.toLowerCase();
        tr.style.display = texto.includes(termo) ? '' : 'none';
    });
};

app.iniciarEscutasGlobais = function() {
    // Escuta Clientes (CRM)
    app.db.collection('clientes_base').where('tenantId', '==', app.t_id).onSnapshot(snap => {
        app.bancoClientes = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        app.renderizarTabelaCRM();
        app.atualizarDatalistClientes();
        app.renderizarListaChatClientes();
    });

    // Escuta Equipe
    app.carregarEquipe();

    // Escuta Ordens de Serviço Ativas
    app.db.collection('ordens_servico').where('tenantId', '==', app.t_id).onSnapshot(snap => {
        app.bancoOSCompleto = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        app.bancoOS = app.bancoOSCompleto.filter(os => os.status !== 'entregue' && os.status !== 'cancelada');
        app.renderizarKanban();
        app.renderizarArquivoMorto();
    });

    // Escuta Lixeira de O.S (Auditoria Soft Delete)
    app.db.collection('ordens_servico_apagadas').where('tenantId', '==', app.t_id).onSnapshot(snap => {
        const tbody = document.getElementById('tabelaLixeiraCorpo');
        if(!tbody) return;
        if(snap.empty) { tbody.innerHTML = '<tr><td colspan="4" class="text-center text-white-50">Lixeira vazia.</td></tr>'; return; }
        tbody.innerHTML = snap.docs.map(doc => {
            const d = doc.data();
            return `<tr><td>${new Date(d.dataExclusao).toLocaleString('pt-BR')}</td><td class="fw-bold text-warning">${d.placa}</td><td>${d.usuarioQueApagou}</td><td class="text-white-50">${d.motivoExclusao}</td></tr>`;
        }).join('');
    });

    // Escuta Estoque
    app.db.collection('estoque').where('tenantId', '==', app.t_id).onSnapshot(snap => {
        app.bancoEstoque = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        app.renderizarEstoque();
        app.atualizarSelectEstoqueOS();
    });

    // Escuta Financeiro
    app.db.collection('financeiro').where('tenantId', '==', app.t_id).onSnapshot(snap => {
        app.bancoFinanceiro = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        app.filtrarFinanceiro();
    });

    // Escuta Mensagens Globais do Chat
    app.db.collection('mensagens').where('tenantId', '==', app.t_id).onSnapshot(() => {
        app.renderizarListaChatClientes();
        if(app.chatClienteAtual) app.abrirChatCliente(app.chatClienteAtual.id, app.chatClienteAtual.nome);
    });
    
    // Escuta Chat Interno Equipe
    app.db.collection('chat_interno').where('tenantId', '==', app.t_id).orderBy('timestamp', 'asc').onSnapshot(snap => {
        const cx = document.getElementById('chatAreaMsgInterno');
        if(!cx) return;
        if(snap.empty) { cx.innerHTML = '<div class="text-center text-white-50 my-auto">Nenhuma mensagem da equipe ainda.</div>'; return; }
        
        cx.innerHTML = snap.docs.map(doc => {
            const m = doc.data();
            const isAdmin = m.role === 'admin' || m.role === 'gerente';
            const cssCor = isAdmin ? 'text-info fw-bold' : 'text-warning';
            const dataHora = m.timestamp ? new Date(m.timestamp.toDate()).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'}) : '';
            return `<div class="mb-3 border-bottom border-secondary pb-2"><small class="${cssCor} me-2">${m.nome}</small><small class="text-white-50" style="font-size:0.7rem;">${dataHora}</small><div class="text-white mt-1">${m.text}</div></div>`;
        }).join('');
        cx.scrollTop = cx.scrollHeight;
    });

    app.iniciarEscutaIA();
};

// =====================================================================
// 3. CRM E PORTAL WEB
// =====================================================================
app.abrirModalCRM = function(tipo, id = null) {
    const form = document.getElementById('formCrm');
    form.reset();
    document.getElementById('crm_id').value = '';
    
    if (tipo === 'nova') {
        const passGerada = Math.floor(100000 + Math.random() * 900000).toString();
        document.getElementById('c_pass').value = passGerada;
    } else if (tipo === 'editar' && id) {
        const cliente = app.bancoClientes.find(c => c.id === id);
        if(cliente) {
            document.getElementById('crm_id').value = cliente.id;
            document.getElementById('c_nome').value = cliente.nome || '';
            document.getElementById('c_doc').value = cliente.documento || '';
            document.getElementById('c_tel').value = cliente.telefone || '';
            document.getElementById('c_email').value = cliente.email || '';
            document.getElementById('c_cep').value = cliente.cep || '';
            document.getElementById('c_rua').value = cliente.rua || '';
            document.getElementById('c_num').value = cliente.numero || '';
            document.getElementById('c_bairro').value = cliente.bairro || '';
            document.getElementById('c_cidade').value = cliente.cidade || '';
            document.getElementById('c_user').value = cliente.usuario || '';
            document.getElementById('c_pass').value = cliente.senha || '';
            document.getElementById('c_notas').value = cliente.notas || '';
        }
    }
    new bootstrap.Modal(document.getElementById('modalCrm')).show();
};

app.salvarClienteCRM = async function(e) {
    e.preventDefault();
    const id = document.getElementById('crm_id').value;
    const nome = document.getElementById('c_nome').value;
    const user = document.getElementById('c_user').value;
    
    if(!user) { app.showToast("Crie um login de portal para o cliente.", "warning"); return; }
    
    const userExiste = app.bancoClientes.find(c => c.usuario === user && c.id !== id);
    if(userExiste) { app.showToast("Este usuário de portal já existe.", "error"); return; }

    const dados = {
        tenantId: app.t_id,
        nome: nome,
        documento: document.getElementById('c_doc').value,
        telefone: document.getElementById('c_tel').value,
        email: document.getElementById('c_email').value,
        cep: document.getElementById('c_cep').value,
        rua: document.getElementById('c_rua').value,
        numero: document.getElementById('c_num').value,
        bairro: document.getElementById('c_bairro').value,
        cidade: document.getElementById('c_cidade').value,
        usuario: user,
        senha: document.getElementById('c_pass').value,
        notas: document.getElementById('c_notas').value,
        ultimaAtualizacao: new Date().toISOString()
    };

    try {
        if (id) {
            await app.db.collection('clientes_base').doc(id).update(dados);
            app.showToast("Ficha atualizada no CRM.", "success");
        } else {
            await app.db.collection('clientes_base').add(dados);
            app.showToast("Novo Cliente salvo. Portal ativado.", "success");
        }
        bootstrap.Modal.getInstance(document.getElementById('modalCrm')).hide();
    } catch (err) {
        console.error(err);
        app.showToast("Erro ao gravar cliente.", "error");
    }
};

app.renderizarTabelaCRM = function() {
    const tbody = document.getElementById('tabelaCrmCorpo');
    if (!tbody) return;
    
    const isAdmin = (!app.t_role || app.t_role === 'gerente' || app.t_role === 'admin');

    if (app.bancoClientes.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${isAdmin ? 5 : 4}" class="text-center text-white-50">Nenhum cliente na base CRM.</td></tr>`;
        return;
    }

    tbody.innerHTML = app.bancoClientes.map(c => {
        let btnAdmin = isAdmin ? `<td class="text-end"><button class="btn btn-sm btn-info shadow-sm fw-bold" onclick="app.abrirModalCRM('editar', '${c.id}')"><i class="bi bi-pencil-square"></i> Editar</button></td>` : '';
        return `
            <tr>
                <td class="fw-bold text-white">${c.nome}</td>
                <td class="text-warning font-monospace">${c.documento || '-'}</td>
                <td class="text-success fw-bold"><i class="bi bi-whatsapp"></i> ${c.telefone}</td>
                <td><span class="bg-dark px-2 py-1 rounded text-info border border-secondary">${c.usuario}</span></td>
                ${btnAdmin}
            </tr>
        `;
    }).join('');
};

app.atualizarDatalistClientes = function() {
    const dl = document.getElementById('listaClientesCRM');
    if(dl) {
        dl.innerHTML = app.bancoClientes.map(c => `<option value="${c.nome}" data-id="${c.id}" data-tel="${c.telefone}" data-doc="${c.documento}">`).join('');
    }
};

app.buscarCEP = async function(cep) {
    const limpo = cep.replace(/\D/g, '');
    if(limpo.length === 8) {
        try {
            const res = await fetch(`https://viacep.com.br/ws/${limpo}/json/`);
            const data = await res.json();
            if(!data.erro) {
                document.getElementById('c_rua').value = data.logradouro;
                document.getElementById('c_bairro').value = data.bairro;
                document.getElementById('c_cidade').value = `${data.localidade} / ${data.uf}`;
                document.getElementById('c_num').focus();
            }
        } catch(e) { console.log("Erro CEP", e); }
    }
};

// =====================================================================
// 4. KANBAN E ORDEM DE SERVIÇO (PRONTUÁRIO)
// =====================================================================
app.renderizarKanban = function() {
    ['patio', 'orcamento', 'aprovacao', 'box', 'pronto'].forEach(st => {
        const col = document.getElementById(`col_${st}`);
        const count = document.getElementById(`count_${st}`);
        if(!col) return;
        
        const list = app.bancoOS.filter(o => o.status === st).sort((a,b) => new Date(b.ultimaAtualizacao) - new Date(a.ultimaAtualizacao));
        count.innerText = list.length;
        
        col.innerHTML = list.map(os => {
            let infoEquipe = '';
            if(os.status === 'box' && os.equipeNomes) {
                infoEquipe = `<div class="mt-2 pt-2 border-top border-secondary text-info small"><i class="bi bi-tools"></i> ${os.equipeNomes.join(', ')} <br><i class="bi bi-geo-alt"></i> ${os.boxDestino||''}</div>`;
            }

            return `
            <div class="os-card shadow-sm" onclick="app.abrirModalOS('editar', '${os.id}')">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <span class="badge bg-dark border border-secondary text-warning fs-6 text-uppercase">${os.placa}</span>
                    <span class="text-white-50 small" style="font-size:0.7rem;">${new Date(os.ultimaAtualizacao).toLocaleDateString('pt-BR')}</span>
                </div>
                <div class="fw-bold text-white text-truncate mb-1">${os.veiculo}</div>
                <div class="text-white-50 small mb-2 text-truncate"><i class="bi bi-person"></i> ${os.cliente}</div>
                <div class="text-success fw-bold text-end w-100 fs-5 mt-2">R$ ${(os.total||0).toFixed(2)}</div>
                ${infoEquipe}
                
                <div class="fast-actions admin-only" onclick="event.stopPropagation()">
                    <button class="btn btn-sm btn-success" onclick="app.moverOSRapido('${os.id}', '${os.status}', 1)" title="Avançar"><i class="bi bi-arrow-right"></i></button>
                </div>
            </div>`;
        }).join('');
    });
};

app.moverOSRapido = async function(id, statusAtual, direcao) {
    const fluxo = ['patio', 'orcamento', 'aprovacao', 'box', 'pronto'];
    const idx = fluxo.indexOf(statusAtual);
    const novoIdx = idx + direcao;
    if(novoIdx >= 0 && novoIdx < fluxo.length) {
        const novoStatus = fluxo[novoIdx];
        if(novoStatus === 'box') {
            app.prepararAtribuicaoBox(id);
            return;
        }
        await app.db.collection('ordens_servico').doc(id).update({ status: novoStatus, ultimaAtualizacao: new Date().toISOString() });
        app.registrarAuditoria(id, `Moveu O.S. para a fase: ${novoStatus.toUpperCase()}`);
        if(novoStatus === 'pronto') { app.prepararNotificacaoWhatsApp(id, 'pronto'); }
    }
};

app.abrirModalOS = function(tipo, id = null) {
    const form = document.getElementById('formOS');
    form.reset();
    document.getElementById('os_id').value = '';
    document.getElementById('header_placa').innerText = 'Nova Recepção';
    document.getElementById('listaPecasCorpo').innerHTML = '';
    document.getElementById('galeriaFotosOS').innerHTML = '';
    document.getElementById('listaHistorico').innerHTML = '';
    document.getElementById('os_total_geral').innerText = 'R$ 0,00';
    document.getElementById('alertaLinkCliente').classList.add('d-none');
    
    const isAdmin = (!app.t_role || app.t_role === 'gerente' || app.t_role === 'admin');
    const btnDel = document.getElementById('btnDeletarOS');
    const btnFat = document.getElementById('btnFaturar');
    const btnPdf = document.getElementById('btnGerarPDF');
    if(btnDel) btnDel.classList.add('d-none');
    if(btnFat) btnFat.classList.add('d-none');
    if(btnPdf) btnPdf.classList.add('d-none');

    document.getElementById('laudo-tab').click(); 

    if (tipo === 'editar' && id) {
        const os = app.bancoOSCompleto.find(o => o.id === id);
        if(os) {
            app.osAtual = JSON.parse(JSON.stringify(os)); 
            
            document.getElementById('os_id').value = os.id;
            document.getElementById('header_placa').innerText = os.placa.toUpperCase();
            document.getElementById('os_placa').value = os.placa;
            document.getElementById('os_veiculo').value = os.veiculo;
            document.getElementById('os_cliente').value = os.cliente;
            document.getElementById('os_cliente_id').value = os.clienteId || '';
            document.getElementById('os_cliente_cpf').value = os.clienteCpf || '';
            document.getElementById('os_celular').value = os.celular || '';
            document.getElementById('os_status').value = os.status;
            
            document.getElementById('os_diagnostico').value = os.diagnostico || '';
            document.getElementById('os_relato_cliente').value = os.relatoCliente || '';
            
            if(os.checklist) {
                document.getElementById('chk_combustivel').checked = os.checklist.combustivel || false;
                document.getElementById('chk_arranhado').checked = os.checklist.arranhado || false;
                document.getElementById('chk_bateria').checked = os.checklist.bateria || false;
                document.getElementById('chk_pneus').checked = os.checklist.pneus || false;
            }

            app.renderizarPecasOS(os.pecas || []);
            app.renderizarFotosOS(os.fotos || []);
            app.renderizarHistoricoOS(os.historico || []);
            
            app.verificarStatusLink();

            if(isAdmin && btnDel) btnDel.classList.remove('d-none');
            if(btnPdf) btnPdf.classList.remove('d-none');
            if(isAdmin && btnFat && (os.status === 'pronto' || os.status === 'entregue')) btnFat.classList.remove('d-none');
        }
    } else {
        app.osAtual = null;
        app.verificarStatusLink();
    }
    new bootstrap.Modal(document.getElementById('modalOS')).show();
};

app.aoSelecionarClienteOS = function() {
    const val = document.getElementById('os_cliente').value;
    const opt = document.querySelector(`#listaClientesCRM option[value="${val}"]`);
    if(opt) {
        document.getElementById('os_cliente_id').value = opt.getAttribute('data-id');
        document.getElementById('os_cliente_cpf').value = opt.getAttribute('data-doc');
        document.getElementById('os_celular').value = opt.getAttribute('data-tel');
    } else {
        document.getElementById('os_cliente_id').value = '';
        document.getElementById('os_cliente_cpf').value = '';
    }
};

app.editarClienteRapido = function() {
    const id = document.getElementById('os_cliente_id').value;
    if(id) {
        bootstrap.Modal.getInstance(document.getElementById('modalOS')).hide();
        app.abrirModalCRM('editar', id);
    } else {
        app.showToast("Selecione um cliente válido da lista primeiro.", "warning");
    }
};

app.verificarStatusLink = function() {
    const st = document.getElementById('os_status').value;
    const alerta = document.getElementById('alertaLinkCliente');
    if(!alerta) return;
    
    if(st === 'aprovacao') alerta.classList.remove('d-none');
    else alerta.classList.add('d-none');
    
    if(st === 'box' && app.osAtual && app.osAtual.status !== 'box') {
        app.prepararAtribuicaoBox(app.osAtual.id);
    }
};

// =====================================================================
// 5. MÓDULO DE FOTOS (CLOUDINARY) E CHECKLIST
// =====================================================================
document.getElementById('btnUploadCloudinary').addEventListener('click', function() {
    cloudinary.openUploadWidget({
        cloudName: app.CLOUDINARY_CLOUD_NAME,
        uploadPreset: app.CLOUDINARY_UPLOAD_PRESET,
        sources: ['local', 'camera'],
        multiple: true,
        maxFiles: 5,
        clientAllowedFormats: ['jpg', 'png', 'jpeg', 'webp', 'mp4'],
        language: "pt",
        text: { pt: { menu: { files: 'Ficheiros Locais', camera: 'Câmera' } } }
    }, (error, result) => {
        if (!error && result && result.event === "success") {
            app.adicionarFotoOS(result.info.secure_url);
        }
    });
});

app.adicionarFotoOS = function(url) {
    if(!app.osAtual) app.osAtual = {};
    if(!app.osAtual.fotos) app.osAtual.fotos = [];
    app.osAtual.fotos.push(url);
    app.renderizarFotosOS(app.osAtual.fotos);
    app.showToast("Mídia indexada ao Laudo.", "success");
    if(document.getElementById('os_id').value) app.registrarAuditoria(document.getElementById('os_id').value, "Capturou nova evidência fotográfica.");
};

app.renderizarFotosOS = function(fotos) {
    const div = document.getElementById('galeriaFotosOS');
    if(!div) return;
    if(fotos.length === 0) { div.innerHTML = '<span class="text-white-50 p-2 my-auto mx-auto"><i class="bi bi-camera-slash me-2"></i> Sem evidências anexadas.</span>'; return; }
    
    div.innerHTML = fotos.map((f, index) => {
        const isVideo = f.includes('.mp4') || f.includes('.webm');
        const media = isVideo ? `<video src="${f}" style="width:100%; height:100%; object-fit:cover;"></video><i class="bi bi-play-circle-fill position-absolute text-white fs-3" style="top:50%; left:50%; transform:translate(-50%,-50%);"></i>` : `<img src="${f}" style="width:100%; height:100%; object-fit:cover;">`;
        return `
        <div class="position-relative shadow-sm rounded overflow-hidden border border-secondary" style="width: 140px; height: 140px;">
            ${media}
            <button type="button" class="btn btn-sm btn-danger position-absolute top-0 end-0 m-1 rounded-circle" style="padding: 2px 6px;" onclick="app.removerFotoOS(${index})" data-html2canvas-ignore><i class="bi bi-x"></i></button>
            <button type="button" class="btn btn-sm btn-dark position-absolute bottom-0 end-0 m-1 rounded-circle border-secondary" onclick="window.open('${f}')" data-html2canvas-ignore><i class="bi bi-arrows-fullscreen"></i></button>
        </div>`;
    }).join('');
};

app.removerFotoOS = function(index) {
    if(confirm("Remover esta evidência do prontuário?")) {
        app.osAtual.fotos.splice(index, 1);
        app.renderizarFotosOS(app.osAtual.fotos);
        if(document.getElementById('os_id').value) app.registrarAuditoria(document.getElementById('os_id').value, "Removeu uma evidência fotográfica.");
    }
};

// =====================================================================
// 6. PEÇAS, ORÇAMENTO E VALORES (DENTRO DA O.S.)
// =====================================================================
app.atualizarSelectEstoqueOS = function() {
    const sel = document.getElementById('selectProdutoEstoque');
    if(!sel) return;
    sel.innerHTML = '<option value="">Buscar peça no Estoque Físico...</option>' + 
        app.bancoEstoque.map(p => `<option value="${p.id}" data-desc="${p.descricao}" data-custo="${p.custo}" data-venda="${p.venda}" data-ncm="${p.ncm}" data-cfop="${p.cfop}">[Qtd: ${p.qtd}] ${p.sku} - ${p.descricao} (R$ ${p.venda.toFixed(2)})</option>`).join('');
};

app.adicionarDoEstoque = function() {
    const sel = document.getElementById('selectProdutoEstoque');
    const opt = sel.options[sel.selectedIndex];
    if(!opt || !opt.value) return;
    
    app.inserirLinhaPecaOS({
        tipo: 'peca',
        idEstoque: opt.value,
        desc: opt.getAttribute('data-desc'),
        ncm: opt.getAttribute('data-ncm') || '',
        cfop: opt.getAttribute('data-cfop') || '',
        custo: parseFloat(opt.getAttribute('data-custo')),
        venda: parseFloat(opt.getAttribute('data-venda')),
        qtd: 1
    });
    sel.value = '';
};

app.adicionarMaoDeObra = function() {
    app.inserirLinhaPecaOS({ tipo: 'servico', desc: 'Mão de Obra Mecânica / Serviço', ncm: '00', cfop: '00', custo: 0, venda: 0, qtd: 1 });
};

app.inserirLinhaPecaOS = function(p) {
    if(!app.osAtual) app.osAtual = {};
    if(!app.osAtual.pecas) app.osAtual.pecas = [];
    app.osAtual.pecas.push(p);
    app.renderizarPecasOS(app.osAtual.pecas);
};

app.renderizarPecasOS = function(pecas) {
    const tbody = document.getElementById('listaPecasCorpo');
    if(!tbody) return;
    
    const isAdmin = (!app.t_role || app.t_role === 'gerente' || app.t_role === 'admin');
    let html = '';
    let totalGer = 0;
    
    pecas.forEach((p, i) => {
        const subtotal = (p.qtd * p.venda);
        totalGer += subtotal;
        
        const colCusto = isAdmin ? `<td><input type="number" step="0.01" class="form-control bg-dark text-danger form-control-sm border-secondary" value="${p.custo}" onchange="app.attPecaOS(${i}, 'custo', this.value)"></td>` : '<td class="gestao-only"></td>';
        
        const icon = p.tipo === 'servico' ? '<i class="bi bi-person-workspace text-info me-2" title="Mão de Obra"></i>' : '<i class="bi bi-box me-2 text-warning" title="Peça Física"></i>';

        html += `
        <tr>
            <td class="ps-3"><div class="d-flex align-items-center">${icon} <input type="text" class="form-control bg-dark text-white form-control-sm border-secondary w-100" value="${p.desc}" onchange="app.attPecaOS(${i}, 'desc', this.value)"></div></td>
            <td><input type="text" class="form-control bg-dark text-white form-control-sm border-secondary text-center" value="${p.ncm}" title="NCM/CFOP" onchange="app.attPecaOS(${i}, 'ncm', this.value)"></td>
            <td><input type="number" class="form-control bg-dark text-white form-control-sm border-secondary text-center fw-bold" value="${p.qtd}" min="0.1" step="0.1" onchange="app.attPecaOS(${i}, 'qtd', this.value)"></td>
            ${colCusto}
            <td><input type="number" step="0.01" class="form-control bg-dark text-success fw-bold form-control-sm border-secondary" value="${p.venda}" onchange="app.attPecaOS(${i}, 'venda', this.value)"></td>
            <td class="text-success fw-bold align-middle">R$ ${subtotal.toFixed(2)}</td>
            <td data-html2canvas-ignore><button type="button" class="btn btn-sm btn-danger rounded-circle" onclick="app.removerPecaOS(${i})"><i class="bi bi-trash"></i></button></td>
        </tr>`;
    });
    
    tbody.innerHTML = html;
    document.getElementById('os_total_geral').innerText = `R$ ${totalGer.toFixed(2)}`;
};

app.attPecaOS = function(i, campo, val) {
    if(campo==='qtd' || campo==='custo' || campo==='venda') app.osAtual.pecas[i][campo] = parseFloat(val)||0;
    else app.osAtual.pecas[i][campo] = val;
    app.renderizarPecasOS(app.osAtual.pecas);
};

app.removerPecaOS = function(i) {
    app.osAtual.pecas.splice(i, 1);
    app.renderizarPecasOS(app.osAtual.pecas);
};

// =====================================================================
// 7. HISTÓRICO, AUDITORIA E SALVAMENTO O.S.
// =====================================================================
app.registrarAuditoria = async function(osId, acao) {
    const op = document.getElementById('lblUsuario').innerText;
    const log = { data: new Date().toISOString(), acao: acao, usuario: op };
    
    try {
        await app.db.collection('ordens_servico').doc(osId).update({
            historico: firebase.firestore.FieldValue.arrayUnion(log),
            ultimaAtualizacao: new Date().toISOString()
        });
    } catch(e) { console.log("Auditoria silenciosa falhou", e); }
};

app.renderizarHistoricoOS = function(hist) {
    const ul = document.getElementById('listaHistorico');
    if(!ul) return;
    if(hist.length === 0) { ul.innerHTML = '<li>Nenhum registro de auditoria encontrado.</li>'; return; }
    
    ul.innerHTML = [...hist].sort((a,b) => new Date(b.data) - new Date(a.data)).map(h => 
        `<li class="timeline-item">
            <div class="timeline-item-header">
                <strong class="text-info">${new Date(h.data).toLocaleString('pt-BR')}</strong>
                <span class="badge bg-dark border border-secondary text-white-50"><i class="bi bi-person-fill"></i> ${h.usuario}</span>
            </div>
            <div class="timeline-item-body">${h.acao}</div>
        </li>`
    ).join('');
};

app.salvarOS = async function() {
    const id = document.getElementById('os_id').value;
    const placa = document.getElementById('os_placa').value.toUpperCase().trim();
    if(!placa) { app.showToast("Placa é obrigatória.", "error"); return; }
    
    const totText = document.getElementById('os_total_geral').innerText.replace('R$ ', '');
    const totalCalc = parseFloat(totText) || 0;
    
    const dados = {
        tenantId: app.t_id,
        placa: placa,
        veiculo: document.getElementById('os_veiculo').value,
        cliente: document.getElementById('os_cliente').value,
        clienteId: document.getElementById('os_cliente_id').value,
        clienteCpf: document.getElementById('os_cliente_cpf').value,
        celular: document.getElementById('os_celular').value,
        status: document.getElementById('os_status').value,
        diagnostico: document.getElementById('os_diagnostico').value,
        relatoCliente: document.getElementById('os_relato_cliente').value,
        pecas: app.osAtual ? (app.osAtual.pecas || []) : [],
        fotos: app.osAtual ? (app.osAtual.fotos || []) : [],
        total: totalCalc,
        ultimaAtualizacao: new Date().toISOString(),
        checklist: {
            combustivel: document.getElementById('chk_combustivel').checked,
            arranhado: document.getElementById('chk_arranhado').checked,
            bateria: document.getElementById('chk_bateria').checked,
            pneus: document.getElementById('chk_pneus').checked
        }
    };
    
    if(app.t_role === 'equipe' && !id) {
        dados.criadoPorMecanicoId = sessionStorage.getItem('f_id');
        dados.criadoPorNome = app.user_nome;
    }

    try {
        if(id) {
            await app.db.collection('ordens_servico').doc(id).update(dados);
            app.registrarAuditoria(id, `Alterou dados da O.S. (Status: ${dados.status})`);
            app.showToast("O.S. Atualizada com sucesso no Kanban.", "success");
        } else {
            dados.dataCriacao = new Date().toISOString();
            const logInit = [{ data: new Date().toISOString(), acao: "Criação da Ordem de Serviço na Fase: Avaliação", usuario: app.user_nome }];
            dados.historico = logInit;
            await app.db.collection('ordens_servico').add(dados);
            app.showToast("Nova O.S. Injetada no Pátio.", "success");
        }
        bootstrap.Modal.getInstance(document.getElementById('modalOS')).hide();
    } catch(err) {
        console.error(err);
        app.showToast("Falha estrutural ao salvar a O.S.", "error");
    }
};

app.apagarOS = async function() {
    const id = document.getElementById('os_id').value;
    const placa = document.getElementById('os_placa').value;
    if(!id) return;
    
    const motivo = prompt("SEGURANÇA: Esta ação moverá a OS para a Lixeira de Auditoria. Descreva o motivo da exclusão:");
    if(motivo === null || motivo.trim() === '') { app.showToast("Exclusão abortada. Motivo é obrigatório.", "warning"); return; }
    
    try {
        await app.db.collection('ordens_servico_apagadas').add({
            tenantId: app.t_id,
            osIdOriginal: id,
            placa: placa,
            dataExclusao: new Date().toISOString(),
            usuarioQueApagou: app.user_nome,
            motivoExclusao: motivo,
            dadosCompletosOS: app.osAtual
        });
        
        await app.db.collection('ordens_servico').doc(id).update({ status: 'cancelada', ultimaAtualizacao: new Date().toISOString() });
        app.showToast("O.S. abortada e enviada para a Lixeira de Auditoria.", "success");
        bootstrap.Modal.getInstance(document.getElementById('modalOS')).hide();
    } catch(e) { app.showToast("Erro ao apagar", "error"); }
};

// =====================================================================
// 8. ATRIBUIÇÃO DE BOX, FATURAMENTO E WHATSAPP
// =====================================================================
app.prepararAtribuicaoBox = function(osId) {
    document.getElementById('atrib_os_id').value = osId;
    
    const div = document.getElementById('atrib_mecanicos_list');
    if(app.equipe.length === 0) {
        div.innerHTML = '<span class="text-danger fw-bold">Você não tem equipe cadastrada. Impossível atribuir box. Vá no menu RH.</span>';
    } else {
        div.innerHTML = app.equipe.map(f => `
            <div class="form-check form-switch mb-2">
                <input class="form-check-input border-warning" type="checkbox" id="chk_mec_${f.id}" value="${f.id}" data-nome="${f.nome}">
                <label class="form-check-label text-white fw-bold ms-2" for="chk_mec_${f.id}">${f.nome} <span class="badge bg-dark border border-secondary text-info ms-2">${f.cargo}</span></label>
            </div>
        `).join('');
    }
    
    bootstrap.Modal.getInstance(document.getElementById('modalOS')).hide();
    new bootstrap.Modal(document.getElementById('modalAtribuicaoBox')).show();
};

app.confirmarAtribuicaoBox = async function() {
    const osId = document.getElementById('atrib_os_id').value;
    const box = document.getElementById('atrib_box').value;
    
    const mecSelecionados = [];
    const mecNomes = [];
    
    app.equipe.forEach(f => {
        const chk = document.getElementById(`chk_mec_${f.id}`);
        if(chk && chk.checked) {
            mecSelecionados.push(f.id);
            mecNomes.push(chk.getAttribute('data-nome'));
        }
    });
    
    if(mecSelecionados.length === 0) { app.showToast("Selecione pelo menos um profissional para a execução.", "error"); return; }
    
    try {
        await app.db.collection('ordens_servico').doc(osId).update({
            status: 'box',
            boxDestino: box,
            equipeIds: mecSelecionados,
            equipeNomes: mecNomes,
            ultimaAtualizacao: new Date().toISOString()
        });
        
        app.registrarAuditoria(osId, `Aprovou e transferiu para o [${box}]. Equipe designada: ${mecNomes.join(', ')}.`);
        app.showToast("Veículo despachado para execução com sucesso!", "success");
        bootstrap.Modal.getInstance(document.getElementById('modalAtribuicaoBox')).hide();
    } catch(e) { app.showToast("Erro ao atribuir box.", "error"); }
};

app.abrirFaturamentoOS = function() {
    const totText = document.getElementById('os_total_geral').innerText;
    document.getElementById('fat_valor_total').innerText = totText;
    document.getElementById('fat_metodo').value = 'Pix';
    document.getElementById('fat_parcelas').value = '1';
    
    bootstrap.Modal.getInstance(document.getElementById('modalOS')).hide();
    new bootstrap.Modal(document.getElementById('modalFaturamento')).show();
};

app.processarFaturamentoCompleto = async function() {
    if(!app.osAtual || !app.osAtual.id) return;
    
    const osId = app.osAtual.id;
    const valorTotalStr = document.getElementById('fat_valor_total').innerText.replace('R$ ', '');
    const valorTotal = parseFloat(valorTotalStr) || 0;
    const metodo = document.getElementById('fat_metodo').value;
    const nParcelas = parseInt(document.getElementById('fat_parcelas').value) || 1;
    
    const pecas = app.osAtual.pecas || [];
    const equipeIds = app.osAtual.equipeIds || [];
    
    if(valorTotal <= 0) { app.showToast("O.S sem valor não gera faturamento.", "warning"); return; }

    try {
        const batch = app.db.batch();
        
        const descBase = `Receita O.S. [${app.osAtual.placa}] - Cliente: ${app.osAtual.cliente}`;
        const valParcela = valorTotal / nParcelas;
        
        let dataVenc = new Date();
        for(let i=1; i<=nParcelas; i++) {
            const isPago = (i===1 && (metodo === 'Pix' || metodo === 'Dinheiro')); 
            const finRef = app.db.collection('financeiro').doc();
            batch.set(finRef, {
                tenantId: app.t_id,
                tipo: 'receita',
                descricao: descBase,
                valor: valParcela,
                metodo: metodo,
                parcela: `${i}/${nParcelas}`,
                status: isPago ? 'pago' : 'pendente',
                dataVencimento: dataVenc.toISOString().split('T')[0],
                osIdOrigem: osId,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            dataVenc.setMonth(dataVenc.getMonth() + 1); 
        }

        let custoTotalPecas = 0;
        pecas.forEach(p => {
            if(p.tipo === 'peca' && p.idEstoque) {
                const estRef = app.db.collection('estoque').doc(p.idEstoque);
                batch.update(estRef, { qtd: firebase.firestore.FieldValue.increment(-Math.abs(p.qtd)) });
                custoTotalPecas += (p.custo * p.qtd);
            }
        });

        if(equipeIds.length > 0) {
            let totMoOS = 0; let totPecasVendaOS = 0;
            pecas.forEach(p => { if(p.tipo === 'servico') totMoOS += (p.venda * p.qtd); else totPecasVendaOS += (p.venda * p.qtd); });
            
            const parteMoIndividual = totMoOS / equipeIds.length;
            const partePecasIndividual = totPecasVendaOS / equipeIds.length;
            
            for (const mId of equipeIds) {
                const docM = await app.db.collection('funcionarios').doc(mId).get();
                if(docM.exists) {
                    const dadosM = docM.data();
                    const percMo = parseFloat(dadosM.comissao_mo) || 0;
                    const percPeca = parseFloat(dadosM.comissao_pecas) || 0;
                    
                    const comissaoGanharMo = parteMoIndividual * (percMo / 100);
                    const comissaoGanharPeca = partePecasIndividual * (percPeca / 100);
                    const comissaoTotal = comissaoGanharMo + comissaoGanharPeca;
                    
                    if(comissaoTotal > 0) {
                        const comRef = app.db.collection('funcionarios').doc(mId).collection('comissoes').doc();
                        batch.set(comRef, {
                            osId: osId,
                            placa: app.osAtual.placa,
                            data: new Date().toISOString(),
                            valorTotalOS: valorTotal,
                            comissaoGanha: comissaoTotal,
                            status: 'pendente_pagamento_rh' 
                        });
                    }
                }
            }
        }

        const osRef = app.db.collection('ordens_servico').doc(osId);
        batch.update(osRef, {
            status: 'entregue',
            dataFaturamento: new Date().toISOString(),
            infoPagamento: { metodo: metodo, parcelas: nParcelas, valorFaturado: valorTotal },
            ultimaAtualizacao: new Date().toISOString(),
            historico: firebase.firestore.FieldValue.arrayUnion({ data: new Date().toISOString(), acao: "O.S Faturada e Concluída.", usuario: app.user_nome })
        });

        await batch.commit();
        
        app.showToast("Sucesso! Estoque deduzido, Financeiro gerado e Comissões calculadas.", "success");
        bootstrap.Modal.getInstance(document.getElementById('modalFaturamento')).show(); 
        bootstrap.Modal.getInstance(document.getElementById('modalFaturamento')).hide();
        
    } catch(e) {
        console.error(e);
        app.showToast("Erro crítico durante o Faturamento.", "error");
    }
};

app.renderizarArquivoMorto = function() {
    const tbody = document.getElementById('tabelaArquivoCorpo');
    if(!tbody) return;
    
    const entregues = app.bancoOSCompleto.filter(o => o.status === 'entregue').sort((a,b) => new Date(b.ultimaAtualizacao) - new Date(a.ultimaAtualizacao));
    const isAdmin = (!app.t_role || app.t_role === 'gerente' || app.t_role === 'admin');

    if(entregues.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${isAdmin ? 6 : 5}" class="text-center text-white-50">Nenhum veículo entregue/faturado ainda.</td></tr>`;
        return;
    }

    tbody.innerHTML = entregues.map(os => {
        const dFat = os.dataFaturamento ? new Date(os.dataFaturamento).toLocaleDateString('pt-BR') : new Date(os.ultimaAtualizacao).toLocaleDateString('pt-BR');
        const colFat = isAdmin ? `<td class="text-success fw-bold">R$ ${(os.total||0).toFixed(2)}</td>` : '';
        return `
            <tr>
                <td><i class="bi bi-calendar-check text-success me-2"></i> ${dFat}</td>
                <td class="fw-bold text-warning">${os.placa}</td>
                <td>${os.veiculo}</td>
                <td class="text-white-50"><i class="bi bi-person"></i> ${os.cliente}</td>
                ${colFat}
                <td class="text-center">
                    <button class="btn btn-sm btn-outline-info" onclick="app.abrirModalOS('editar', '${os.id}')"><i class="bi bi-eye"></i> Visualizar Laudo</button>
                </td>
            </tr>
        `;
    }).join('');
};

app.prepararNotificacaoWhatsApp = function(osId, tipo) {
    const os = app.bancoOSCompleto.find(o => o.id === osId);
    if(!os || !os.celular) {
        app.showToast("Cliente sem celular cadastrado. Impossível notificar.", "warning");
        return;
    }
    
    document.getElementById('whats_os_id').value = osId;
    document.getElementById('whats_tipo_msg').value = tipo;
    
    const titulo = document.getElementById('whatsTituloModal');
    const texto = document.getElementById('whatsTextoModal');
    
    if(tipo === 'aprovacao') {
        titulo.innerText = "Aprovação de Orçamento";
        titulo.className = "text-warning fw-bold mb-3";
        texto.innerText = `Deseja enviar o link seguro para o cliente [${os.cliente}] aprovar o orçamento da placa [${os.placa}] no valor de R$ ${(os.total||0).toFixed(2)}?`;
    } else {
        titulo.innerText = "Veículo Pronto!";
        titulo.className = "text-success fw-bold mb-3";
        texto.innerText = `O veículo [${os.placa}] de [${os.cliente}] já está na fase final. Deseja avisá-lo para retirar?`;
    }
    
    new bootstrap.Modal(document.getElementById('modalNotificaWhatsApp')).show();
};

app.enviarWhatsAppAprovacao = function() {
    if(!app.osAtual) return;
    app.prepararNotificacaoWhatsApp(app.osAtual.id, 'aprovacao');
};

app.dispararWhatsAppAtivo = function() {
    const id = document.getElementById('whats_os_id').value;
    const tipo = document.getElementById('whats_tipo_msg').value;
    const os = app.bancoOSCompleto.find(o => o.id === id);
    if(!os) return;

    let num = os.celular.replace(/\D/g, '');
    if(num.length === 10 || num.length === 11) num = '55' + num;
    
    let msg = '';
    const linkPortal = window.location.origin + window.location.pathname.replace('painel_oficina.html', 'clientes/projeto_oficina.html');

    if(tipo === 'aprovacao') {
        msg = `Olá *${os.cliente}*, tudo bem?\nA Oficina *${app.t_nome}* acabou de finalizar a avaliação do seu veículo placa *${os.placa}*.\n\nO diagnóstico e as fotos das peças já estão disponíveis no seu Painel Privado.\n\n*Acesse para ver os detalhes e autorizar o serviço:*\n🔗 ${linkPortal}\n\n*Aguardamos sua aprovação para iniciarmos os trabalhos no box!* 🛠️`;
    } else {
        msg = `✅ Olá *${os.cliente}*, excelente notícia!\nO serviço no seu veículo placa *${os.placa}* foi concluído com sucesso pela equipe da *${app.t_nome}*.\n\nEle já encontra-se liberado e pronto para retirada.\nQualquer dúvida, estamos à disposição aqui no chat ou pelo Portal!\n🔗 ${linkPortal}`;
    }

    const url = `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
    
    app.showToast("WhatsApp Web Aberto.", "info");
    bootstrap.Modal.getInstance(document.getElementById('modalNotificaWhatsApp')).hide();
};

// =====================================================================
// 9. GESTÃO DE ESTOQUE E ENTRADA DE NOTA FISCAL XML
// =====================================================================
app.abrirModalNF = function() {
    document.getElementById('formNF').reset();
    document.getElementById('corpoItensNF').innerHTML = '';
    app.verificarPgtoCompraNF();
    new bootstrap.Modal(document.getElementById('modalNF')).show();
};

app.verificarPgtoCompraNF = function() {
    const met = document.getElementById('nf_metodo_pagamento').value;
    const divP = document.getElementById('nf_div_parcelas');
    if(met.includes('Parcelado')) { divP.style.display = 'block'; }
    else { divP.style.display = 'none'; document.getElementById('nf_parcelas').value = '1x'; }
};

app.adicionarLinhaNF = function(item = null) {
    const tbody = document.getElementById('corpoItensNF');
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td><input type="text" class="form-control bg-dark text-warning fw-bold form-control-sm border-secondary nf-sku" value="${item ? item.sku : ''}" placeholder="Cód/SKU" required></td>
        <td><input type="text" class="form-control bg-dark text-white form-control-sm border-secondary nf-desc" value="${item ? item.desc : ''}" required></td>
        <td><input type="text" class="form-control bg-dark text-white form-control-sm border-secondary nf-ncm" value="${item ? item.ncm : ''}"></td>
        <td><input type="text" class="form-control bg-dark text-white form-control-sm border-secondary nf-cfop" value="${item ? item.cfop : ''}"></td>
        <td><input type="number" class="form-control bg-dark text-white fw-bold form-control-sm border-secondary nf-qtd text-center" value="${item ? item.qtd : 1}" step="0.1" required></td>
        <td><input type="number" step="0.01" class="form-control bg-dark text-danger fw-bold form-control-sm border-secondary nf-custo" value="${item ? item.custo : 0}" required></td>
        <td><input type="number" step="0.01" class="form-control bg-dark text-success fw-bold form-control-sm border-secondary nf-venda" value="${item ? item.venda : 0}" required></td>
        <td><button type="button" class="btn btn-sm btn-danger rounded-circle" onclick="this.parentElement.parentElement.remove()"><i class="bi bi-trash"></i></button></td>
    `;
    tbody.appendChild(tr);
};

app.processarXML = function(event) {
    const file = event.target.files[0];
    if(!file) return;
    app.showToast("Mágica iniciada: Lendo XML e cruzando dados...", "info");
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(e.target.result, "text/xml");
            
            const fornecedor = xmlDoc.getElementsByTagName("xNome")[0]?.childNodes[0]?.nodeValue || 'Fornecedor XML';
            const numNota = xmlDoc.getElementsByTagName("nNF")[0]?.childNodes[0]?.nodeValue || '';
            const dataEmissaoRaw = xmlDoc.getElementsByTagName("dhEmi")[0]?.childNodes[0]?.nodeValue || '';
            
            document.getElementById('nf_fornecedor').value = fornecedor;
            document.getElementById('nf_numero').value = numNota;
            if(dataEmissaoRaw) document.getElementById('nf_data').value = dataEmissaoRaw.split('T')[0];
            
            const detNodes = xmlDoc.getElementsByTagName("det");
            document.getElementById('corpoItensNF').innerHTML = ''; 
            
            for(let i=0; i<detNodes.length; i++) {
                const prod = detNodes[i].getElementsByTagName("prod")[0];
                const item = {
                    sku: prod.getElementsByTagName("cProd")[0]?.childNodes[0]?.nodeValue || '',
                    desc: prod.getElementsByTagName("xProd")[0]?.childNodes[0]?.nodeValue || '',
                    ncm: prod.getElementsByTagName("NCM")[0]?.childNodes[0]?.nodeValue || '',
                    cfop: prod.getElementsByTagName("CFOP")[0]?.childNodes[0]?.nodeValue || '',
                    qtd: parseFloat(prod.getElementsByTagName("qCom")[0]?.childNodes[0]?.nodeValue) || 0,
                    custo: parseFloat(prod.getElementsByTagName("vUnCom")[0]?.childNodes[0]?.nodeValue) || 0,
                    venda: (parseFloat(prod.getElementsByTagName("vUnCom")[0]?.childNodes[0]?.nodeValue) || 0) * 1.5 
                };
                app.adicionarLinhaNF(item);
            }
            app.showToast(`Importação concluída. ${detNodes.length} itens extraídos. Revise os preços de venda (PVP).`, "success");
        } catch(err) {
            console.error(err);
            app.showToast("Falha na interpretação do arquivo XML. Estrutura inválida.", "error");
        }
    };
    reader.readAsText(file);
};

app.salvarEntradaEstoque = async function(e) {
    e.preventDefault();
    const fornecedor = document.getElementById('nf_fornecedor').value;
    const nota = document.getElementById('nf_numero').value;
    const dataNota = document.getElementById('nf_data').value;
    const gerarFin = document.getElementById('nf_gerar_financeiro').checked;
    
    const linhas = document.querySelectorAll('#corpoItensNF tr');
    if(linhas.length === 0) { app.showToast("Não há produtos listados para entrada.", "warning"); return; }
    
    let totalCustoEntrada = 0;
    const batch = app.db.batch();
    
    linhas.forEach(tr => {
        const sku = tr.querySelector('.nf-sku').value;
        const desc = tr.querySelector('.nf-desc').value;
        const ncm = tr.querySelector('.nf-ncm').value;
        const cfop = tr.querySelector('.nf-cfop').value;
        const qtd = parseFloat(tr.querySelector('.nf-qtd').value) || 0;
        const custo = parseFloat(tr.querySelector('.nf-custo').value) || 0;
        const venda = parseFloat(tr.querySelector('.nf-venda').value) || 0;
        
        totalCustoEntrada += (custo * qtd);
        
        const itemExistente = app.bancoEstoque.find(i => i.sku === sku);
        if(itemExistente) {
            const ref = app.db.collection('estoque').doc(itemExistente.id);
            batch.update(ref, {
                qtd: firebase.firestore.FieldValue.increment(qtd),
                custo: custo, venda: venda, ultimaEntrada: dataNota, ncm: ncm, cfop: cfop
            });
        } else {
            const ref = app.db.collection('estoque').doc();
            batch.set(ref, {
                tenantId: app.t_id,
                sku: sku, descricao: desc, ncm: ncm, cfop: cfop,
                qtd: qtd, custo: custo, venda: venda,
                dataCadastro: new Date().toISOString(),
                ultimaEntrada: dataNota
            });
        }
    });
    
    if(gerarFin && totalCustoEntrada > 0) {
        const metodo = document.getElementById('nf_metodo_pagamento').value;
        let pNum = 1;
        if(metodo.includes('Parcelado')) { pNum = parseInt(document.getElementById('nf_parcelas').value.replace('x','')) || 1; }
        
        const valorParcela = totalCustoEntrada / pNum;
        let dataVenc = new Date(dataNota + 'T12:00:00');
        
        for(let i=1; i<=pNum; i++) {
            const isPago = (i===1 && (metodo === 'Pix' || metodo === 'Dinheiro'));
            const finRef = app.db.collection('financeiro').doc();
            batch.set(finRef, {
                tenantId: app.t_id,
                tipo: 'despesa',
                descricao: `Pagamento Fornecedor: ${fornecedor} (NF: ${nota||'Avulsa'})`,
                valor: valorParcela,
                metodo: metodo,
                parcela: `${i}/${pNum}`,
                status: isPago ? 'pago' : 'pendente',
                dataVencimento: dataVenc.toISOString().split('T')[0],
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            dataVenc.setMonth(dataVenc.getMonth() + 1);
        }
    }
    
    try {
        await batch.commit();
        app.showToast("Estoque e Financeiro injetados com sucesso!", "success");
        bootstrap.Modal.getInstance(document.getElementById('modalNF')).hide();
    } catch(err) {
        console.error(err);
        app.showToast("Erro ao gravar lote de estoque.", "error");
    }
};

app.renderizarEstoque = function() {
    const tbody = document.getElementById('tabelaEstoqueCorpo');
    if(!tbody) return;
    
    const isAdmin = (!app.t_role || app.t_role === 'gerente' || app.t_role === 'admin');
    
    if(app.bancoEstoque.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${isAdmin ? 8 : 6}" class="text-center text-white-50">Estoque Vazio. Importe notas ou cadastre manual.</td></tr>`;
        return;
    }
    
    tbody.innerHTML = app.bancoEstoque.map(p => {
        const corQtd = p.qtd <= 2 ? 'text-danger fw-bold' : 'text-white fw-bold';
        const isAdminCols = isAdmin ? `
            <td class="text-danger fw-bold">R$ ${(p.custo||0).toFixed(2)}</td>
            <td class="text-success fw-bold">R$ ${(p.venda||0).toFixed(2)}</td>
            <td class="text-end"><button class="btn btn-sm btn-outline-danger border-0" onclick="app.excluirItemEstoque('${p.id}')"><i class="bi bi-trash"></i></button></td>
        ` : `<td class="text-success fw-bold">R$ ${(p.venda||0).toFixed(2)}</td>`;
        
        return `
        <tr>
            <td class="text-white-50 small"><i class="bi bi-calendar"></i> ${p.ultimaEntrada ? new Date(p.ultimaEntrada).toLocaleDateString('pt-BR') : '-'}</td>
            <td class="text-warning font-monospace fw-bold">${p.sku}</td>
            <td class="text-white-50">${p.ncm||'-'} / ${p.cfop||'-'}</td>
            <td class="text-white fw-bold">${p.descricao}</td>
            <td class="${corQtd} fs-6">${p.qtd}</td>
            ${isAdminCols}
        </tr>`;
    }).join('');
};

app.excluirItemEstoque = async function(id) {
    if(confirm("Deseja apagar este item do estoque definitivamente?")) {
        await app.db.collection('estoque').doc(id).delete();
        app.showToast("Item apagado.", "success");
    }
};

// =====================================================================
// 10. FINANCEIRO (DRE GERENCIAL)
// =====================================================================
app.abrirModalFinanceiro = function(tipoAcao, tipoLanc) {
    document.getElementById('formFinanceiro').reset();
    document.getElementById('fin_id').value = '';
    document.getElementById('fin_tipo').value = tipoLanc;
    
    const titulo = document.getElementById('fin_titulo');
    if(tipoLanc === 'despesa') {
        titulo.innerHTML = '<i class="bi bi-dash-circle text-danger me-2"></i> Lançar Despesa de Caixa (Contas a Pagar)';
        document.getElementById('modalFinContent').className = 'modal-content bg-dark border-danger';
    } else {
        titulo.innerHTML = '<i class="bi bi-plus-circle text-success me-2"></i> Lançar Receita Avulsa (Contas a Receber)';
        document.getElementById('modalFinContent').className = 'modal-content bg-dark border-success';
    }
    
    document.getElementById('fin_data').value = new Date().toISOString().split('T')[0];
    document.getElementById('divStatusEdit').style.display = 'none';
    app.verificarPgtoFinManual();
    new bootstrap.Modal(document.getElementById('modalFin')).show();
};

app.verificarPgtoFinManual = function() {
    const met = document.getElementById('fin_metodo').value;
    const div = document.getElementById('divParcelas');
    if(met.includes('Parcelado')) div.style.display = 'block';
    else { div.style.display = 'none'; document.getElementById('fin_parcelas').value = '1'; }
};

app.salvarLancamentoFinanceiro = async function(e) {
    e.preventDefault();
    const id = document.getElementById('fin_id').value;
    const tipo = document.getElementById('fin_tipo').value;
    const valorTotal = parseFloat(document.getElementById('fin_valor').value);
    const metodo = document.getElementById('fin_metodo').value;
    const dt = document.getElementById('fin_data').value;
    
    if(id) {
        await app.db.collection('financeiro').doc(id).update({
            status: document.getElementById('fin_status').value,
            metodo: metodo,
            descricao: document.getElementById('fin_desc').value,
            valor: valorTotal,
            dataVencimento: dt
        });
        app.showToast("Título atualizado com sucesso.", "success");
        bootstrap.Modal.getInstance(document.getElementById('modalFin')).hide();
        return;
    }
    
    let nParc = 1;
    if(metodo.includes('Parcelado')) nParc = parseInt(document.getElementById('fin_parcelas').value) || 1;
    
    const valParcela = valorTotal / nParc;
    let dtCalc = new Date(dt + 'T12:00:00');
    const batch = app.db.batch();
    
    for(let i=1; i<=nParc; i++) {
        const isPago = (i===1 && (metodo === 'Pix' || metodo === 'Dinheiro'));
        const fRef = app.db.collection('financeiro').doc();
        batch.set(fRef, {
            tenantId: app.t_id,
            tipo: tipo,
            descricao: document.getElementById('fin_desc').value,
            valor: valParcela,
            metodo: metodo,
            parcela: `${i}/${nParc}`,
            status: isPago ? 'pago' : 'pendente',
            dataVencimento: dtCalc.toISOString().split('T')[0],
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        dtCalc.setMonth(dtCalc.getMonth() + 1);
    }
    
    await batch.commit();
    app.showToast(`Lançamento (${tipo}) realizado no DRE com sucesso.`, "success");
    bootstrap.Modal.getInstance(document.getElementById('modalFin')).hide();
};

app.editarTituloFinanceiro = function(id) {
    const tit = app.bancoFinanceiro.find(f => f.id === id);
    if(!tit) return;
    
    document.getElementById('fin_id').value = tit.id;
    document.getElementById('fin_tipo').value = tit.tipo;
    document.getElementById('fin_desc').value = tit.descricao;
    document.getElementById('fin_valor').value = tit.valor;
    document.getElementById('fin_data').value = tit.dataVencimento;
    document.getElementById('fin_metodo').value = tit.metodo;
    document.getElementById('fin_status').value = tit.status;
    
    document.getElementById('divStatusEdit').style.display = 'block';
    document.getElementById('divParcelas').style.display = 'none'; 
    
    const titulo = document.getElementById('fin_titulo');
    if(tit.tipo === 'despesa') {
        titulo.innerHTML = '<i class="bi bi-pencil-square text-danger me-2"></i> Editar Título a Pagar';
        document.getElementById('modalFinContent').className = 'modal-content bg-dark border-danger';
    } else {
        titulo.innerHTML = '<i class="bi bi-pencil-square text-success me-2"></i> Editar Título a Receber';
        document.getElementById('modalFinContent').className = 'modal-content bg-dark border-success';
    }
    
    new bootstrap.Modal(document.getElementById('modalFin')).show();
};

app.filtrarFinanceiro = function() {
    const dtIn = document.getElementById('filtroFinInicio')?.value;
    const dtFim = document.getElementById('filtroFinFim')?.value;
    
    let dadosFiltrados = app.bancoFinanceiro;
    
    if(dtIn && dtFim) {
        const i = new Date(dtIn + 'T00:00:00'); const f = new Date(dtFim + 'T23:59:59');
        dadosFiltrados = dadosFiltrados.filter(fin => {
            const dtFin = new Date(fin.dataVencimento + 'T12:00:00');
            return dtFin >= i && dtFin <= f;
        });
    }

    let totReceitas = 0; let totDespesas = 0; let totComissoes = 0;
    
    const tbPag = document.getElementById('tabelaPagarCorpo');
    const tbRec = document.getElementById('tabelaReceberCorpo');
    if(!tbPag || !tbRec) return;
    
    let htmlP = ''; let htmlR = '';
    
    dadosFiltrados.sort((a,b) => new Date(a.dataVencimento) - new Date(b.dataVencimento)).forEach(f => {
        const st = f.status === 'pago' ? '<span class="badge bg-success">QUITADO</span>' : '<span class="badge bg-warning text-dark">PENDENTE</span>';
        const dFormat = new Date(f.dataVencimento + 'T12:00:00').toLocaleDateString('pt-BR');
        
        // Abate DRE do RH
        if(f.tipo === 'despesa' && (f.descricao.includes('Comissão') || f.descricao.includes('Salário') || f.descricao.includes('Vale RH') || f.descricao.includes('Pagamento RH'))) {
            totComissoes += f.valor;
        }

        const btnEd = `<td class="text-end"><button class="btn btn-sm btn-outline-info shadow-sm fw-bold" onclick="app.editarTituloFinanceiro('${f.id}')">Gerenciar</button></td>`;
        
        const tr = `<tr>
            <td>${dFormat}</td>
            <td class="fw-bold">${f.descricao}</td>
            <td class="text-white-50">${f.parcela || '1/1'}</td>
            <td class="text-white-50">${f.metodo}</td>
            <td class="fw-bold ${f.tipo==='receita'?'text-success':'text-danger'}">R$ ${f.valor.toFixed(2)}</td>
            <td>${st}</td>
            ${btnEd}
        </tr>`;
        
        if(f.tipo === 'receita') { htmlR += tr; totReceitas += f.valor; }
        else { htmlP += tr; totDespesas += f.valor; }
    });
    
    tbRec.innerHTML = htmlR || '<tr><td colspan="7" class="text-center text-white-50">Nenhuma receita no período.</td></tr>';
    tbPag.innerHTML = htmlP || '<tr><td colspan="7" class="text-center text-white-50">Nenhuma despesa no período.</td></tr>';
    
    const lucro = totReceitas - totDespesas; 
    
    document.getElementById('dreReceitas').innerText = `R$ ${totReceitas.toFixed(2)}`;
    document.getElementById('dreDespesas').innerText = `R$ ${totDespesas.toFixed(2)}`;
    document.getElementById('dreComissoes').innerText = `R$ ${totComissoes.toFixed(2)}`;
    document.getElementById('dreLucro').innerText = `R$ ${lucro.toFixed(2)}`;
    
    document.getElementById('dreLucro').className = lucro < 0 ? 'text-danger mb-0 fw-bold' : 'text-info mb-0 fw-bold';
};

app.exportarRelatorioFinanceiro = function() {
    app.showToast("Função de Exportação Excel ativada nas versões Premium.", "info");
};

// =====================================================================
// 11. CHATS (GLOBAL COM CLIENTES E INTERNO EQUIPE)
// =====================================================================
app.renderizarListaChatClientes = function() {
    const list = document.getElementById('chatListaClientesCRM');
    if(!list) return;
    
    list.innerHTML = app.bancoClientes.map(c => {
        return `<button class="list-group-item list-group-item-action bg-transparent text-white border-bottom border-secondary p-3 d-flex justify-content-between align-items-center" onclick="app.abrirChatCliente('${c.id}', '${c.nome}')">
            <div><i class="bi bi-person-circle text-info me-2 fs-5"></i><span class="fw-bold">${c.nome}</span><br><small class="text-white-50 font-monospace">${c.telefone}</small></div>
            <i class="bi bi-chevron-right text-white-50"></i>
        </button>`;
    }).join('');
};

app.abrirChatCliente = function(cId, cNome) {
    app.chatClienteAtual = { id: cId, nome: cNome };
    document.getElementById('chatNomeCliente').innerHTML = `<i class="bi bi-person-check-fill text-warning me-2"></i> Conversando com: <strong>${cNome}</strong>`;
    document.getElementById('chatAreaInputGlobal').style.display = 'flex';
    
    app.db.collection('mensagens').where('tenantId', '==', app.t_id).where('clienteId', '==', cId).orderBy('timestamp', 'asc').onSnapshot(snap => {
        const cx = document.getElementById('chatAreaMsgGlobal');
        if(snap.empty) { cx.innerHTML = '<div class="text-center text-white-50 my-auto">Nenhuma mensagem com este cliente. Mande um \"Olá\".</div>'; return; }
        
        cx.innerHTML = snap.docs.map(doc => {
            const m = doc.data();
            if(m.sender === 'cliente' && !m.lidaAdmin) { app.db.collection('mensagens').doc(doc.id).update({lidaAdmin:true}); }
            
            let cnt = m.text;
            const css = m.sender === 'admin' ? 'admin' : 'cliente';
            const dataHora = m.timestamp ? new Date(m.timestamp.toDate()).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'}) : '';
            
            if(m.fileUrl) {
                if(m.fileType === 'video' || m.fileUrl.includes('.mp4')) cnt += `<br><video src="${m.fileUrl}" controls class="mw-100 rounded mt-2 shadow" style="max-height:200px;"></video>`;
                else if(m.fileType === 'audio' || m.fileUrl.includes('.webm') || m.fileUrl.includes('.mp3')) cnt += `<br><audio src="${m.fileUrl}" controls class="mw-100 mt-2 shadow"></audio>`;
                else if(m.fileUrl.includes('.pdf')) cnt += `<br><a href="${m.fileUrl}" target="_blank" class="btn btn-sm btn-light mt-2 text-dark"><i class="bi bi-file-pdf text-danger"></i> Abrir Arquivo</a>`;
                else cnt += `<br><img src="${m.fileUrl}" class="mw-100 rounded mt-2 shadow" style="cursor:pointer;" onclick="window.open('${m.fileUrl}')">`;
            }
            return `<div class="message ${css}">${cnt}<div class="text-end" style="font-size:0.65rem; opacity:0.6; margin-top:5px;">${dataHora} ${m.sender === 'admin' && m.lidaCliente ? '<i class="bi bi-check2-all"></i>' : ''}</div></div>`;
        }).join('');
        cx.scrollTop = cx.scrollHeight;
    });
};

app.enviarMensagemChatGlobal = async function() {
    const inp = document.getElementById('inputChatGlobal');
    if(!inp.value.trim() || !app.chatClienteAtual) return;
    await app.db.collection('mensagens').add({ tenantId: app.t_id, clienteId: app.chatClienteAtual.id, sender: 'admin', text: inp.value.trim(), lidaCliente: false, timestamp: firebase.firestore.FieldValue.serverTimestamp() });
    inp.value = '';
};
document.getElementById("inputChatGlobal").addEventListener("keyup", function(event) { if (event.key === "Enter") app.enviarMensagemChatGlobal(); });

app.enviarAnexoChatGlobal = async function() {
    const input = document.getElementById('chatFileInputGlobal'); 
    if(!input.files[0] || !app.chatClienteAtual) return;
    
    app.showToast("Enviando anexo para o cliente. Aguarde...", "info");
    try {
        const fd = new FormData(); fd.append('file', input.files[0]); fd.append('upload_preset', app.CLOUDINARY_UPLOAD_PRESET);
        const res = await fetch(`https://api.cloudinary.com/v1_1/${app.CLOUDINARY_CLOUD_NAME}/auto/upload`, {method:'POST', body:fd});
        const data = await res.json();
        if(data.secure_url) {
            await app.db.collection('mensagens').add({ tenantId: app.t_id, clienteId: app.chatClienteAtual.id, sender: 'admin', text: "📎 Arquivo / Mídia:", fileUrl: data.secure_url, fileType: data.resource_type, lidaCliente: false, timestamp: firebase.firestore.FieldValue.serverTimestamp() });
            input.value = ''; app.showToast("Anexo enviado no chat!", "success");
        }
    } catch(e) { app.showToast("Erro ao enviar anexo via chat.", "error"); }
};

app.enviarMensagemInterna = async function() {
    const inp = document.getElementById('inputChatInterno');
    if(!inp.value.trim()) return;
    await app.db.collection('chat_interno').add({ tenantId: app.t_id, nome: app.user_nome, role: app.t_role, text: inp.value.trim(), timestamp: firebase.firestore.FieldValue.serverTimestamp() });
    inp.value = '';
};
document.getElementById("inputChatInterno").addEventListener("keyup", function(event) { if (event.key === "Enter") app.enviarMensagemInterna(); });

// =====================================================================
// 12. GESTÃO DE RH, COMISSÕES, VALES E INTEGRAÇÃO DRE
// =====================================================================
app.abrirModalEquipe = function() {
    document.getElementById('formEquipe').reset();
    document.getElementById('f_id').value = '';
    new bootstrap.Modal(document.getElementById('modalEquipe')).show();
};

app.salvarFuncionario = async function(e) {
    e.preventDefault();
    const dados = {
        tenantId: app.t_id,
        nome: document.getElementById('f_nome').value,
        cargo: document.getElementById('f_cargo').options[document.getElementById('f_cargo').selectedIndex].text,
        role: document.getElementById('f_cargo').value,
        comissao_mo: parseFloat(document.getElementById('f_comissao_mo').value),
        comissao_pecas: parseFloat(document.getElementById('f_comissao_pecas').value),
        usuario: document.getElementById('f_user').value,
        senha: document.getElementById('f_pass').value,
        status: 'Ativo'
    };
    
    try {
        await app.db.collection('funcionarios').add(dados);
        app.showToast("Profissional cadastrado na equipe.", "success");
        bootstrap.Modal.getInstance(document.getElementById('modalEquipe')).hide();
    } catch(err) { app.showToast("Erro ao salvar funcionário.", "error"); }
};

app.carregarEquipe = function() {
    app.db.collection('funcionarios').where('tenantId', '==', app.t_id).onSnapshot(async snap => {
        app.equipe = snap.docs.map(d => ({id:d.id, ...d.data()}));
        
        const tbody = document.getElementById('tabelaEquipe');
        if(!tbody) return;
        
        const isAdmin = (!app.t_role || app.t_role === 'gerente' || app.t_role === 'admin');
        
        if(app.equipe.length === 0) {
            tbody.innerHTML = `<tr><td colspan="${isAdmin ? 6 : 5}" class="text-center text-white-50">Você ainda não cadastrou equipe de produção.</td></tr>`;
            return;
        }

        let html = '';
        let somaMinhasComissoes = 0; 

        for(const f of app.equipe) {
            let saldo = 0;
            const comSnap = await app.db.collection('funcionarios').doc(f.id).collection('comissoes').where('status','==','pendente_pagamento_rh').get();
            comSnap.forEach(d => saldo += d.data().comissaoGanha);
            
            let totalValesPendentes = 0;
            const extratoSnap = await app.db.collection('funcionarios').doc(f.id).collection('extrato').where('statusVales','==','pendente_abate').get();
            extratoSnap.forEach(d => totalValesPendentes += d.data().valor);
            
            const saldoLiquidoAReceber = saldo - totalValesPendentes;

            if(app.t_role === 'equipe' && sessionStorage.getItem('f_id') === f.id) {
                somaMinhasComissoes = saldoLiquidoAReceber;
                const kpi = document.getElementById('kpiMinhaComissao');
                if(kpi) kpi.innerText = `R$ ${somaMinhasComissoes.toFixed(2)}`;
            }

            const corSaldo = saldoLiquidoAReceber > 0 ? 'text-info fw-bold' : (saldoLiquidoAReceber < 0 ? 'text-danger fw-bold' : 'text-white-50');
            const btnsRH = isAdmin ? `
                <td class="text-end text-nowrap">
                    <button class="btn btn-sm btn-warning fw-bold shadow-sm me-1" onclick="app.abrirModalValeRH('${f.id}', '${f.nome}')" title="Lançar Vale"><i class="bi bi-cash-stack"></i> Vales</button>
                    <button class="btn btn-sm btn-success fw-bold shadow-sm" onclick="app.abrirModalPagamentoRH('${f.id}', '${f.nome}', ${saldoLiquidoAReceber})" title="Quitar e Zerar"><i class="bi bi-check-circle-fill"></i> Liquidar</button>
                </td>
            ` : '';

            html += `<tr>
                <td class="fw-bold text-white"><i class="bi bi-person-fill text-success me-2"></i> ${f.nome}</td>
                <td><span class="badge bg-dark border border-secondary text-white-50">${f.cargo}</span></td>
                <td class="text-warning">${f.comissao_mo}% M.O. <br> ${f.comissao_pecas}% Peças</td>
                <td class="${corSaldo} fs-6">R$ ${saldoLiquidoAReceber.toFixed(2)}</td>
                <td class="font-monospace text-white-50 small"><i class="bi bi-key"></i> ${f.usuario}</td>
                ${btnsRH}
            </tr>`;
        }
        tbody.innerHTML = html;
    });
};

app.abrirModalValeRH = function(idFunc, nomeFunc) {
    document.getElementById('formValeRH').reset();
    document.getElementById('vale_id_func').value = idFunc;
    document.getElementById('vale_nome_func').value = nomeFunc;
    document.getElementById('lblNomeValeFunc').innerText = nomeFunc;
    new bootstrap.Modal(document.getElementById('modalValeRH')).show();
};

app.confirmarValeRH = async function(e) {
    e.preventDefault();
    const idFunc = document.getElementById('vale_id_func').value;
    const nomeFunc = document.getElementById('vale_nome_func').value;
    const valor = parseFloat(document.getElementById('vale_valor').value);
    const motivo = document.getElementById('vale_motivo').value;

    if(valor <= 0) return;

    try {
        const batch = app.db.batch();
        
        const funcRef = app.db.collection('funcionarios').doc(idFunc).collection('extrato').doc();
        batch.set(funcRef, {
            tipo: 'vale',
            valor: valor,
            data: new Date().toISOString(),
            desc: motivo,
            statusVales: 'pendente_abate' 
        });

        // Integração DRE Imediata
        const finRef = app.db.collection('financeiro').doc();
        batch.set(finRef, {
            tenantId: app.t_id,
            tipo: 'despesa',
            descricao: `Vale/Adiantamento (RH) - ${nomeFunc} | Motivo: ${motivo}`,
            valor: valor,
            dataVencimento: new Date().toISOString().split('T')[0],
            metodo: 'Dinheiro', 
            parcela: '1/1',
            status: 'pago',
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        await batch.commit();
        app.showToast(`Vale de R$ ${valor.toFixed(2)} lançado com sucesso e integrado ao DRE.`, "success");
        bootstrap.Modal.getInstance(document.getElementById('modalValeRH')).hide();
    } catch(err) {
        console.error(err);
        app.showToast("Falha ao lançar vale na folha.", "error");
    }
};

app.abrirModalPagamentoRH = function(idFunc, nomeFunc, saldoLiquido) {
    if(saldoLiquido <= 0) {
        app.showToast(`O colaborador ${nomeFunc} não possui saldo a receber ou está negativo.`, "warning");
        return;
    }
    
    document.getElementById('pag_id_func').value = idFunc;
    document.getElementById('pag_nome_func').value = nomeFunc;
    document.getElementById('pag_valor_real').value = saldoLiquido;
    document.getElementById('lblNomePagFunc').innerText = nomeFunc;
    document.getElementById('pag_valor_exibicao').innerText = `R$ ${saldoLiquido.toFixed(2)}`;
    
    new bootstrap.Modal(document.getElementById('modalPagamentoRH')).show();
};

app.confirmarPagamentoRH = async function(e) {
    e.preventDefault();
    const idFunc = document.getElementById('pag_id_func').value;
    const nomeFunc = document.getElementById('pag_nome_func').value;
    const valorPagar = parseFloat(document.getElementById('pag_valor_real').value);
    const metodo = document.getElementById('pag_metodo').value;

    try {
        const batch = app.db.batch();

        const comSnap = await app.db.collection('funcionarios').doc(idFunc).collection('comissoes').where('status','==','pendente_pagamento_rh').get();
        comSnap.forEach(docComissao => {
            batch.update(docComissao.ref, { status: 'pago_rh', dataPagamento: new Date().toISOString() });
        });

        const valesSnap = await app.db.collection('funcionarios').doc(idFunc).collection('extrato').where('statusVales','==','pendente_abate').get();
        valesSnap.forEach(docVale => {
            batch.update(docVale.ref, { statusVales: 'abatido', dataFechamento: new Date().toISOString() });
        });

        const extratoPagRef = app.db.collection('funcionarios').doc(idFunc).collection('extrato').doc();
        batch.set(extratoPagRef, {
            tipo: 'pagamento_salario',
            valor: valorPagar,
            data: new Date().toISOString(),
            metodo: metodo,
            desc: 'Liquidação Final de Folha (Comissões deduzindo Vales)'
        });

        // Integração DRE Imediata
        const finRef = app.db.collection('financeiro').doc();
        batch.set(finRef, {
            tenantId: app.t_id,
            tipo: 'despesa',
            descricao: `Pagamento Salário/Comissões (RH) - ${nomeFunc}`,
            valor: valorPagar,
            dataVencimento: new Date().toISOString().split('T')[0],
            metodo: metodo,
            parcela: '1/1',
            status: 'pago',
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        await batch.commit();
        app.showToast(`Pagamento de Folha finalizado e DRE atualizado!`, "success");
        bootstrap.Modal.getInstance(document.getElementById('modalPagamentoRH')).hide();
    } catch(err) {
        console.error(err);
        app.showToast("Falha estrutural ao realizar o fechamento do funcionário.", "error");
    }
};

// =====================================================================
// 13. CÉREBRO DA I.A. (LOCALSTORAGE EXCLUSIVO)
// =====================================================================
app.iaTrabalhando = false; 

app.salvarKeyLocal = function() {
    const key = document.getElementById('localGeminiKey').value.trim();
    if(!key) { app.showToast("Cole uma Chave API válida.", "warning"); return; }
    localStorage.setItem('gemini_local_' + app.t_id, key);
    app.showToast("Chave da IA salva de forma segura apenas neste navegador!", "success");
    setTimeout(() => { document.getElementById('localGeminiKey').value = '**************************'; }, 1000);
};

app.iniciarEscutaIA = function() {
    app.db.collection('conhecimento_ia').where('tenantId', '==', app.t_id).onSnapshot(snap => {
        app.bancoIA = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        app.renderizarListaIA();
    });
};

app.renderizarListaIA = function() {
    const div = document.getElementById('listaConhecimentosIA'); if(!div) return;
    if(app.bancoIA.length === 0) { div.innerHTML = '<p class="text-white-50 text-center mt-3">A Mente Cognitiva (RAG) está vazia. Importe dados.</p>'; return; }
    div.innerHTML = app.bancoIA.map(ia => `<div class="d-flex justify-content-between align-items-center bg-dark p-3 mb-2 rounded border border-secondary shadow-sm"><span class="text-white-50 text-truncate fw-bold" style="max-width: 85%;">${ia.texto}</span><button class="btn btn-sm btn-outline-danger border-0" onclick="app.apagarConhecimentoIA('${ia.id}')"><i class="bi bi-trash-fill"></i></button></div>`).join('');
};

app.salvarConhecimentoIA = async function(textoAvulso = null) {
    const textarea = document.getElementById('iaConhecimentoTexto'); const valor = textoAvulso || (textarea ? textarea.value.trim() : '');
    if(!valor) { app.showToast("O input de dados não pode ser vazio.", "warning"); return; }
    await app.db.collection('conhecimento_ia').add({ tenantId: app.t_id, texto: valor, dataImportacao: new Date().toISOString() });
    app.showToast("Conhecimento gravado.", "success"); if(textarea && !textoAvulso) textarea.value = '';
};

app.apagarConhecimentoIA = async function(id) {
    if(confirm("Deseja apagar esta memória?")) {
        await app.db.collection('conhecimento_ia').doc(id).delete(); app.showToast("Memória apagada.", "success");
    }
};

app.processarArquivoParaIA = function(event) {
    const file = event.target.files[0]; if(!file) return;
    const statusLabel = document.getElementById('iaFileStatus');
    if(statusLabel) { statusLabel.className = "text-warning fw-bold d-block text-center"; statusLabel.innerText = "Lendo matriz física do arquivo e traduzindo para RAG..."; }
    
    const reader = new FileReader();
    reader.onload = async function(e) {
        const text = e.target.result; const txtLimpo = text.substring(0, 10000);
        await app.salvarConhecimentoIA(`[ARQUIVO IMPORTADO: ${file.name}]\n\n${txtLimpo}`);
        if(statusLabel) { statusLabel.className = "text-success fw-bold d-block text-center"; statusLabel.innerText = "Aquisição concluída!"; setTimeout(() => { statusLabel.innerText = ""; }, 5000); }
    };
    reader.readAsText(file); 
};

app.chamarGemini = async function(prompt, sysInstruction) {
    const key = localStorage.getItem('gemini_local_' + app.t_id);
    
    if(!key || key.includes('*')) { 
        app.showToast("Vá no menu Treinamento IA (RAG) e ative a sua chave da API.", "error"); 
        return "Erro: Google Gemini API Key ausente no navegador desta oficina."; 
    }

    const payloadOptions = {
        method: 'POST', 
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            systemInstruction: { parts: [{ text: sysInstruction }] },
            generationConfig: { temperature: 0.1 }
        })
    };

    try {
        let res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, payloadOptions);
        
        if (!res.ok) {
            console.warn("Rota 2.5-flash bloqueada. Acionando fallback...");
            res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`, payloadOptions);
        }

        const data = await res.json(); 
        if(data.error) throw new Error(data.error.message);
        return data.candidates[0].content.parts[0].text;
    } catch(e) { 
        console.error(e);
        return "A I.A. bloqueou a requisição. Aguarde um minuto ou verifique se colou a chave corretamente. Erro: " + e.message; 
    }
};

app.perguntarJarvis = async function() {
    if(app.iaTrabalhando) return; 
    
    const inp = document.getElementById('jarvisInput'); const resDiv = document.getElementById('jarvisResposta');
    if(!inp || !inp.value) return; 
    
    app.iaTrabalhando = true; 
    resDiv.classList.remove('d-none'); 
    resDiv.innerHTML = '<span class="spinner-border text-info spinner-border-sm me-2"></span> J.A.R.V.I.S está analisando...';

    const ctx = { 
        manuais: app.bancoIA.map(ia => ia.texto), 
        patio: app.bancoOSCompleto.filter(o=>o.status !== 'entregue').map(o => ({placa: o.placa, def: o.relatoCliente, st: o.status})) 
    };
    
    const sys = `Você é o J.A.R.V.I.S, o consultor virtual da oficina "${app.t_nome}".\nDADOS DA OFICINA: ${JSON.stringify(ctx)}\nRegra absoluta: Responda de forma direta e COMPROVE as fontes se basear em algum manual. Não invente dados.`;
    
    const resposta = await app.chamarGemini(inp.value, sys);
    resDiv.innerHTML = resposta.replace(/\n/g, '<br>');
    
    inp.value = '';
    app.iaTrabalhando = false; 
};

app.perguntarJarvisMecanico = async function() {
    if(app.iaTrabalhando) return;
    
    const inp = document.getElementById('jarvisInputMecanico'); const resDiv = document.getElementById('jarvisRespostaMecanico');
    if(!inp || !inp.value) return; 
    
    app.iaTrabalhando = true;
    resDiv.classList.remove('d-none'); 
    resDiv.innerHTML = '<span class="spinner-border text-info spinner-border-sm me-2"></span> Procurando nos manuais...';

    const ctx = { manuais: app.bancoIA.map(ia => ia.texto) };
    const sys = `Você atua como Mecânico Chefe da oficina "${app.t_nome}".\nMANUAIS (RAG): ${JSON.stringify(ctx)}\nRegra: Responda direto e CITE a fonte se usar um manual. Jamais invente especificações.`;
    
    const resposta = await app.chamarGemini(inp.value, sys);
    resDiv.innerHTML = resposta.replace(/\n/g, '<br>');
    
    inp.value = '';
    app.iaTrabalhando = false;
};

app.jarvisAnalisarRevisoes = async function() {
    if(app.iaTrabalhando) {
        app.showToast("Aguarde a IA terminar a tarefa atual.", "warning");
        return;
    }
    
    const div = document.getElementById('jarvisCRMInsights'); if(!div) return;
    
    app.iaTrabalhando = true;
    div.innerHTML = '<span class="spinner-border text-warning spinner-border-sm me-2"></span> Escaneando Histórico...';
    
    const historicoMorto = app.bancoOSCompleto.filter(o => o.status === 'entregue');
    if(historicoMorto.length === 0) { 
        div.innerHTML = '<span class="text-white-50">Não há registros suficientes.</span>'; 
        app.iaTrabalhando = false;
        return; 
    }
    
    const ctx = { 
        historico: historicoMorto.slice(-50).map(o => ({ dt: new Date(o.ultimaAtualizacao).toLocaleDateString('pt-BR'), cli: o.cliente, pl: o.placa })) 
    };

    const sys = `Gestor de Remarketing da oficina ${app.t_nome}.\nBASE:\n${JSON.stringify(ctx)}\nTarefa: Encontre clientes para telefonarmos HOJE oferecendo revisão. Devolva em HTML <li> com o motivo técnico.`;
    
    const resposta = await app.chamarGemini("Analise o histórico e me dê os clientes para remarketing.", sys);
    div.innerHTML = resposta;
    app.iaTrabalhando = false;
};

// =====================================================================
// 14. EXPORTAÇÃO PDF (MÓDULO MENECHELLI)
// =====================================================================
app.exportarPDFMenechelli = async function() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'pt', 'a4');
    
    app.showToast("Gerando PDF Oficial da Oficina... Aguarde.", "info");

    const btnG = document.getElementById('btnGerarPDF'); btnG.innerHTML = 'Gerando...'; btnG.disabled = true;

    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, 595, 80, 'F');
    doc.setFont("helvetica", "bold"); doc.setFontSize(22); doc.setTextColor(255, 255, 255);
    doc.text(app.t_nome.toUpperCase(), 40, 45);
    doc.setFontSize(10); doc.setTextColor(200, 200, 200);
    doc.text("DOCUMENTO OFICIAL DE PRONTUÁRIO", 40, 65);
    doc.setFontSize(14); doc.setTextColor(255, 255, 255);
    doc.text(`O.S: ${app.osAtual.placa.toUpperCase()}`, 555, 50, { align: "right" });

    doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(0, 0, 0);
    doc.text("DADOS DO CLIENTE E VEÍCULO", 40, 110);
    doc.setLineWidth(1); doc.line(40, 115, 555, 115);

    doc.setFont("helvetica", "normal"); doc.setFontSize(10);
    doc.text(`Cliente: ${app.osAtual.cliente}`, 40, 135);
    doc.text(`Contato: ${app.osAtual.celular || 'N/I'}`, 350, 135);
    doc.text(`Veículo: ${app.osAtual.veiculo}`, 40, 155);
    doc.text(`Placa: ${app.osAtual.placa.toUpperCase()}`, 350, 155);

    doc.setFont("helvetica", "bold"); doc.setFontSize(12);
    doc.text("RECLAMAÇÃO / CHECKLIST DE ENTRADA", 40, 190);
    doc.setLineWidth(1); doc.line(40, 195, 555, 195);
    
    doc.setFont("helvetica", "normal"); doc.setFontSize(10);
    doc.text(`Queixa: ${app.osAtual.relatoCliente || 'Não informada.'}`, 40, 215, { maxWidth: 500 });
    
    let chkY = 235;
    if(app.osAtual.checklist) {
        doc.text(`[ ${app.osAtual.checklist.combustivel ? 'X' : ' '} ] Luz Reserva Acesa`, 40, chkY);
        doc.text(`[ ${app.osAtual.checklist.arranhado ? 'X' : ' '} ] Carroceria Arranhada`, 200, chkY);
        doc.text(`[ ${app.osAtual.checklist.bateria ? 'X' : ' '} ] Bateria Arriada`, 360, chkY);
    }

    let nextY = 265;
    if(app.osAtual.diagnostico) {
        doc.setFont("helvetica", "bold"); doc.setFontSize(12);
        doc.text("DIAGNÓSTICO TÉCNICO", 40, nextY);
        doc.line(40, nextY+5, 555, nextY+5);
        doc.setFont("helvetica", "normal"); doc.setFontSize(10);
        doc.text(app.osAtual.diagnostico, 40, nextY+25, { maxWidth: 515 });
        nextY += 70;
    }

    doc.setFont("helvetica", "bold"); doc.setFontSize(12);
    doc.text("ORÇAMENTO / RELAÇÃO DE PEÇAS", 40, nextY);
    
    if(app.osAtual.pecas && app.osAtual.pecas.length > 0) {
        const tableData = app.osAtual.pecas.map(p => [p.desc, p.qtd.toString(), `R$ ${p.venda.toFixed(2)}`, `R$ ${(p.qtd*p.venda).toFixed(2)}`]);
        doc.autoTable({
            startY: nextY + 15,
            head: [['Descrição do Item/Serviço', 'Qtd', 'Venda Un.', 'Subtotal']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [30, 41, 59] },
            styles: { fontSize: 9 }
        });
        nextY = doc.lastAutoTable.finalY + 30;
    } else {
        doc.setFont("helvetica", "normal"); doc.setFontSize(10);
        doc.text("Nenhuma peça ou serviço orçado ainda.", 40, nextY + 20);
        nextY += 40;
    }

    doc.setFont("helvetica", "bold"); doc.setFontSize(14); doc.setTextColor(0, 150, 0);
    doc.text(`TOTAL GERAL: R$ ${(app.osAtual.total || 0).toFixed(2)}`, 555, nextY, { align: "right" });

    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(100, 100, 100);
    doc.text("Reconheço e aprovo a execução dos serviços acima descritos.", 40, nextY + 60);
    doc.line(40, nextY + 110, 250, nextY + 110);
    doc.text(`Assinatura Cliente: ${app.osAtual.cliente}`, 40, nextY + 125);

    doc.line(300, nextY + 110, 555, nextY + 110);
    doc.text(`Assinatura Oficina: ${app.t_nome}`, 300, nextY + 125);

    doc.save(`Orçamento_${app.osAtual.placa}_${app.osAtual.cliente.replace(/ /g, '_')}.pdf`);
    
    btnG.innerHTML = '<i class="bi bi-file-pdf-fill me-1"></i> Exportar Laudo e Auditoria'; btnG.disabled = false;
};