// Variável global para controle
let intervaloAtualizacao;
let ultimasPautasConhecidas = [];
let tipoAssembleia;
// Estilos pré-definidos
const estilosLog = {
    info: 'color: #3498db; font-weight: bold;',
    success: 'color: #2ecc71; font-weight: bold;',
    warning: 'color: #f39c12; font-weight: bold;',
    error: 'color: #e74c3c; font-weight: bold;',
    debug: 'color: #9b59b6;',
    default: 'color: #333;'
};

// Funções auxiliares
const cacheVotos = {};

// Variáveis globais para controle do chat
let chatMensagensCache = {};
let cacheChats = {};
let intervaloChat;
const intervaloAtualizacaoChat = 10000; // 10 segundos

// Container do chat
let chatContainer;

// Estilos para o chat
const chatStyles = {
    container: `
        max-height: 300px;
        overflow-y: auto;
        border: 1px solid #ddd;
        border-radius: 8px;
        padding: 10px;
        margin-top: 15px;
        background: #f9f9f9;
    `,
    message: `
        margin-bottom: 10px;
        padding: 8px 12px;
        border-radius: 18px;
        max-width: 80%;
        word-wrap: break-word;
        position: relative;
    `,
    userMessage: `
        background: #e3f2fd;
        margin-left: auto;
        border-bottom-right-radius: 0;
    `,
    otherMessage: `
        background: #ffffff;
        margin-right: auto;
        border-bottom-left-radius: 0;
        box-shadow: 0 1px 1px rgba(0,0,0,0.1);
    `,
    messageHeader: `
        font-size: 0.8em;
        color: #666;
        margin-bottom: 4px;
        display: flex;
        justify-content: space-between;
    `,
    messageContent: `
        font-size: 0.95em;
        line-height: 1.4;
    `
};


// 1. Verifica se a página já está carregada
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    iniciarExtensao();
} else {
    document.addEventListener('DOMContentLoaded', iniciarExtensao);
}



async function iniciarExtensao() {
    logSuccess('Extensão iniciada!');
    
    // Cria o container principal
    const container = criarContainer();
    
    // Inicia a verificação periódica
    iniciarMonitoramento(container);
}

// Funções de log colorido
function logInfo(mensagem, dados = '') {
    console.log(`%cℹ INFO: ${mensagem}`, estilosLog.info, dados);
}

function logSuccess(mensagem, dados = '') {
    console.log(`%c✓ SUCESSO: ${mensagem}`, estilosLog.success, dados);
}

function logWarning(mensagem, dados = '') {
    console.log(`%c⚠ ALERTA: ${mensagem}`, estilosLog.warning, dados);
}

function logError(mensagem, dados = '') {
    console.log(`%c✗ ERRO: ${mensagem}`, estilosLog.error, dados);
}

function logDebug(mensagem, dados = '') {
    console.log(`%c🐛 DEBUG: ${mensagem}`, estilosLog.debug, dados);
}

function criarContainer() {
    // Remove containers existentes
    const existingContainers = document.querySelectorAll('#extensao-container, #chat-container-standalone');
    existingContainers.forEach(el => el.remove());

    // Cria o container principal
    const container = document.createElement('div');
    container.id = 'extensao-container';
    container.style.position = 'fixed';
    container.style.bottom = '20px';
    container.style.right = '20px';
    container.style.zIndex = '10000';
    container.style.maxHeight = '85vh';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.background = 'transparent';
    document.body.appendChild(container);

    // Cabeçalho com todos os controles
    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    header.style.padding = '10px';
    header.style.background = 'white';
    header.style.borderRadius = '8px 8px 0 0';
    header.style.boxShadow = '0 2px 5px rgba(0,0,0,0.1)';
    header.style.width = '650px'; // Largura combinada dos dois painéis
    
    header.innerHTML = `
        <strong style="font-size: 1.1em;">Monitor de Assembleia</strong>
        <div>
            <button id="atualizar-agora" style="padding: 5px 10px; margin-right: 5px; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer;">
                Atualizar
            </button>
            <button id="pausar-monitoramento" style="padding: 5px 10px; margin-right: 5px; background: #f39c12; color: white; border: none; border-radius: 4px; cursor: pointer;">
                Pausar
            </button>
            <button id="minimizar-chat" style="padding: 5px 10px; margin-right: 5px; background: #7f8c8d; color: white; border: none; border-radius: 4px; cursor: pointer;">
                Ocultar Chat
            </button>
            <button id="minimizar-relatorios" style="padding: 5px 10px; background: #7f8c8d; color: white; border: none; border-radius: 4px; cursor: pointer;">
                Ocultar Relatórios
            </button>
        </div>
    `;
    
    container.appendChild(header);
    
    // Container para os painéis (chat + relatórios)
    const panelsContainer = document.createElement('div');
    panelsContainer.id = 'panels-container';
    panelsContainer.style.display = 'flex';
    panelsContainer.style.gap = '10px';
    panelsContainer.style.background = 'white';
    panelsContainer.style.padding = '15px';
    panelsContainer.style.borderRadius = '0 0 8px 8px';
    panelsContainer.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
    panelsContainer.style.width = 'fit-content'; // 600 + 600 + 20 (gap)
    panelsContainer.style.maxWidth = '100%'; // Para responsividade
    container.appendChild(panelsContainer);

    // Container do chat - Largura reduzida
    const chatContainer = document.createElement('div');
    chatContainer.id = 'chat-container';
    chatContainer.style.width = '600px';
    chatContainer.style.maxWidth = '100%';
    chatContainer.style.flexShrink = '1';
    chatContainer.style.maxHeight = '80vh';
    chatContainer.style.overflowY = 'auto';
    chatContainer.style.padding = '10px';
    chatContainer.style.background = '#f9f9f9';
    chatContainer.style.borderRadius = '6px';
    panelsContainer.appendChild(chatContainer);

    // Container dos relatórios - Largura reduzida
    const reportsContainer = document.createElement('div');
    reportsContainer.id = 'reports-container';
    reportsContainer.style.width = '600px';
    reportsContainer.style.maxWidth = '100%';
    reportsContainer.style.maxHeight = '80vh';
    reportsContainer.style.flexShrink = '1';
    reportsContainer.style.overflowY = 'auto';
    reportsContainer.style.padding = '10px';
    reportsContainer.style.background = '#f9f9f9';
    reportsContainer.style.borderRadius = '6px';
    panelsContainer.appendChild(reportsContainer);

    // Adiciona listeners
    document.getElementById('atualizar-agora').addEventListener('click', () => verificarPautas(container, true));
    document.getElementById('pausar-monitoramento').addEventListener('click', toggleMonitoramento);
    
    document.getElementById('minimizar-chat').addEventListener('click', function() {
        const chat = document.getElementById('chat-container');
        if (chat.style.display === 'none') {
            chat.style.display = 'block';
            this.textContent = 'Ocultar Chat';
        } else {
            chat.style.display = 'none';
            this.textContent = 'Mostrar Chat';
        }
    });
    
    document.getElementById('minimizar-relatorios').addEventListener('click', function() {
        const reports = document.getElementById('reports-container');
        if (reports.style.display === 'none') {
            reports.style.display = 'block';
            this.textContent = 'Ocultar Relatórios';
        } else {
            reports.style.display = 'none';
            this.textContent = 'Mostrar Relatórios';
        }
    });

    return container;
}

// Função para alternar entre minimizar/maximizar
function toggleMinimizar(containerId, buttonId) {
    const container = document.getElementById(containerId);
    const button = document.getElementById(buttonId);
    
    if (container.style.display === 'none') {
        container.style.display = 'block';
        button.textContent = 'Minimizar';
        
        // Reorganiza os containers após restaurar
        reorganizarContainers();
    } else {
        container.style.display = 'none';
        button.textContent = 'Maximizar';
    }
}

function reorganizarContainers() {
    const chatContainer = document.getElementById('chat-container-standalone');
    const mainContainer = document.getElementById('extensao-container');
    
    if (!chatContainer || !mainContainer) return;
    
    // Remove qualquer posicionamento absoluto/relativo que possa estar causando o problema
    chatContainer.style.position = 'fixed';
    chatContainer.style.bottom = '20px';
    chatContainer.style.right = '20px';
    
    mainContainer.style.position = 'fixed';
    mainContainer.style.bottom = '20px';
    mainContainer.style.right = '20px';
    
    // Calcula a posição correta baseada no estado dos containers
    const chatVisible = document.getElementById('chat-container-body').style.display !== 'none';
    const reportsVisible = document.getElementById('reports-container').style.display !== 'none';
    
    if (chatVisible && reportsVisible) {
        // Ambos visíveis - chat acima, relatórios abaixo
        chatContainer.style.bottom = (mainContainer.offsetHeight + 30) + 'px';
        mainContainer.style.bottom = '20px';
    } else if (chatVisible) {
        // Só chat visível
        chatContainer.style.bottom = '20px';
    } else if (reportsVisible) {
        // Só relatórios visível
        mainContainer.style.bottom = '20px';
    }
}

// Função para tornar um elemento arrastável
function makeDraggable(header, container) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    
    header.onmousedown = dragMouseDown;
    
    function dragMouseDown(e) {
        e = e || window.event;
        e.preventDefault();
        // get the mouse cursor position at startup:
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        // call a function whenever the cursor moves:
        document.onmousemove = elementDrag;
    }
    
    function elementDrag(e) {
        e = e || window.event;
        e.preventDefault();
        // calculate the new cursor position:
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        // set the element's new position:
        container.style.top = (container.offsetTop - pos2) + "px";
        container.style.left = (container.offsetLeft - pos1) + "px";
        container.style.right = 'auto';
        container.style.bottom = 'auto';
    }
    
    function closeDragElement() {
        // stop moving when mouse button is released:
        document.onmouseup = null;
        document.onmousemove = null;
    }
}

function iniciarMonitoramento(container) {
    // Verifica imediatamente
    verificarPautas(container);
    
    // Configura o intervalo para verificar a cada 30 segundos
    intervaloAtualizacao = setInterval(() => {
        verificarPautas(container);
    }, 30000); // 30 segundos
}

function toggleMonitoramento() {
    const botao = document.getElementById('pausar-monitoramento');
    if (intervaloAtualizacao) {
        clearInterval(intervaloAtualizacao);
        intervaloAtualizacao = null;
        botao.textContent = 'Retomar';
        botao.style.background = '#2ecc71';
    } else {
        iniciarMonitoramento(document.getElementById('extensao-container'));
        botao.textContent = 'Pausar';
        botao.style.background = '#f39c12';
    }
}

// Modifique a função verificarPautas()
async function verificarPautas(container, forcarAtualizacao = false) {
    logInfo('Verificando pautas e votos...');
    
    try {
        const assembleiaInfo = obterIdAssembleia();
        if (!assembleiaInfo) return;

        const { id: idAssembleia, passada } = assembleiaInfo;

        const tipo = passada ? 'passadas' : 'proximas';
        const urlPautas = `https://solucoesdf.superlogica.net/areadocondomino/atual/assembleiasv2/index?assembleias=${tipo}&id=${idAssembleia}&comPautas=1`;

        const response = await fetch(urlPautas, { credentials: 'include' });
        const data = await response.json();

        if (!data.data?.[0]?.pautas) {
            logWarning('Nenhuma pauta encontrada.');
            return;
        }

        const pautasAtuais = data.data[0].pautas;
        tipoAssembleia = data.data[0].tipo_assembleia;

        let precisaAtualizar = forcarAtualizacao || JSON.stringify(pautasAtuais) !== JSON.stringify(ultimasPautasConhecidas);

        if (!precisaAtualizar && ultimasPautasConhecidas.length > 0) {
            for (const pauta of pautasAtuais) {
                const idPauta = pauta.id_pauta_pau;
                const urlVotos = `https://solucoesdf.superlogica.net/areadocondomino/atual/pautasv2/votos?idPauta=${idPauta}&comOpcaoDeVoto=true&comQuantidadeFavoritos=true&idContato=0`;
                const responseVotos = await fetch(urlVotos, { credentials: 'include' });
                const votosData = await responseVotos.json();
                
                const totalVotosAtual = votosData.data?.length || 0;
                const totalVotosAnterior = obterTotalVotosAnterior(idPauta);
                
                if (totalVotosAtual !== totalVotosAnterior) {
                    logDebug(`Votos da pauta ${idPauta} mudaram: ${totalVotosAnterior} → ${totalVotosAtual}`);
                    precisaAtualizar = true;
                    break;
                }
            }
        }

        if (precisaAtualizar) {
            logSuccess('Atualizando relatórios...');
            ultimasPautasConhecidas = pautasAtuais;
            
            const reportsCol = document.getElementById('reports-container');
            if (reportsCol) reportsCol.innerHTML = '';
            
            iniciarMonitoramentoChat(pautasAtuais);

            for (const pauta of pautasAtuais) {
                const idPauta = pauta.id_pauta_pau;
                const descPauta = pauta.st_titulo_pau;
                
                const urlVotos = `https://solucoesdf.superlogica.net/areadocondomino/atual/pautasv2/votos?idPauta=${idPauta}&comOpcaoDeVoto=true&comQuantidadeFavoritos=true&idContato=0`;
                const responseVotos = await fetch(urlVotos, { credentials: 'include' });
                const votosData = await responseVotos.json();
                
                armazenarTotalVotos(idPauta, votosData.data?.length || 0);
                
                await gerarRelatorio(idPauta, container, descPauta);
            }

            const timestamp = document.createElement('div');
            timestamp.style.textAlign = 'right';
            timestamp.style.fontSize = '0.8em';
            timestamp.style.color = '#7f8c8d';
            timestamp.textContent = `Última atualização: ${new Date().toLocaleTimeString()}`;
            if (reportsCol) reportsCol.appendChild(timestamp);
        } else {
            logInfo('Nenhuma alteração nas pautas ou votos detectada.');
        }
    } catch (error) {
        logError('Erro ao verificar pautas:', error);
    }
}


function armazenarTotalVotos(idPauta, total) {
    cacheVotos[idPauta] = total;
}

function obterTotalVotosAnterior(idPauta) {
    return cacheVotos[idPauta] || 0;
}

async function buscarResultadoVotacao(idPauta) {
    const url = `https://solucoesdf.superlogica.net/areadocondomino/atual/pautasv2/resultadovotacao?idPauta=${idPauta}`;
    const response = await fetch(url, { credentials: 'include' });
    return await response.json();
}

function obterIdAssembleia() {
    const linkFilho = document.querySelector('#link-meeting a[id_assembleia]');
    const urlAtual = window.location.href;

    if (linkFilho) {
        const id = linkFilho.getAttribute('id_assembleia');
        logDebug("Assembleia encontrada via elemento: ", id);
        return { id, passada: false };
    }

    const match = urlAtual.match(/\/id\/(\d+)/);
    const isPassada = urlAtual.includes('assembleias=passadas');

    if (match && match[1]) {
        logDebug("Assembleia encontrada via URL: ", match[1]);
        return { id: match[1], passada: isPassada };
    }

    return null;
}


// Função para gerar relatório de uma pauta
async function gerarRelatorio(idPauta, container, descPauta) {
    try {
        // A. Busca votos individuais
        const urlVotos = `https://solucoesdf.superlogica.net/areadocondomino/atual/pautasv2/votos?idPauta=${idPauta}&comOpcaoDeVoto=true&comQuantidadeFavoritos=true&idContato=0`;
        const votosData = await (await fetch(urlVotos, { credentials: 'include' })).json();

        // B. Busca resultado consolidado
        const urlResultado = `https://solucoesdf.superlogica.net/areadocondomino/atual/pautasv2/resultadovotacao?idPauta=${idPauta}`;
        const resultadoData = await (await fetch(urlResultado, { credentials: 'include' })).json();

        // C. Calcula votos por torre/bloco
        const votosPorTorre = calcularVotosPorTorre(votosData);

        // D. Exibe os dados no container
        exibirPainel(votosData, resultadoData, votosPorTorre, idPauta, container, descPauta);
    } catch (error) {
        console.error(`Erro ao processar pauta ${idPauta}:`, error);
    }
}

// Função para calcular votos por torre/bloco
function calcularVotosPorTorre(votosData) {
    const contagem = {};
    
    votosData.data?.forEach(item => {
        const torre = item.st_bloco_uni1 || 'Sem torre';
        contagem[torre] = (contagem[torre] || 0) + 1;
    });

    return contagem;
}

// Função para injetar o painel na página
function exibirPainel(votosData, resultadoData, votosPorTorre, idPauta, container, descPauta) {
    const reportsContainer = document.getElementById('reports-container');
    if (!reportsContainer) {
        logError('Container de relatórios não encontrado!');
        return;
    }

    const painel = document.createElement('div');
    painel.className = 'painel-relatorio';
    painel.style.background = 'white';
    painel.style.padding = '15px';
    painel.style.marginBottom = '15px';
    painel.style.borderRadius = '6px';
    painel.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';

    // Cálculos
    const totalVotos = votosData.data?.length || 0;
    const quorumMinimo = 880;

    // Opção mais votada
    const opcoes = resultadoData.data?.opcoes_voto || [];
    const opcaoMaisVotada = opcoes.reduce((max, curr) => curr.qtd_votos > (max?.qtd_votos || 0) ? curr : max, null);

    // Quórum Qualificado: opção mais votada atingiu o mínimo?
    const votosMaisVotada = opcaoMaisVotada?.qtd_votos || 0;
    const quorumQualificadoAtingido = votosMaisVotada >= quorumMinimo;
    const percentualQualificado = ((votosMaisVotada / quorumMinimo) * 100).toFixed(1);
    const votosFaltantesQualificado = Math.max(0, quorumMinimo - votosMaisVotada);

    // Maioria Simples: a mais votada tem mais votos que as outras?
    const maioriaSimplesAtingida = opcoes.every(opcao => {
        if (opcao.st_nome_vot === opcaoMaisVotada?.st_nome_vot) return true;
        return opcaoMaisVotada?.qtd_votos > opcao.qtd_votos;
    });


    // Formata a contagem por torre
    const torresLista = Object.entries(votosPorTorre)
        .sort(([torreA], [torreB]) => torreA.localeCompare(torreB))
        .map(([torre, quantidade]) => 
            `<li style="margin-bottom: 5px;">
                <span style="font-weight: 600;">${torre}:</span> 
                <span>${quantidade} ${quantidade === 1 ? 'voto' : 'votos'}</span>
            </li>`
        )
        .join('');

    painel.innerHTML = `
        <h3 style="margin-top: 0; color: #2c3e50;">Relatório da Pauta #${idPauta}</h3>
        <h4 style="margin: 10px 0;
                  font-size: 1em;
                  color: #555;
                  max-width: 100%;
                  overflow: hidden;
                  text-overflow: ellipsis;
                  display: -webkit-box;
                  -webkit-line-clamp: 3; /* Limite de 3 linhas */
                  -webkit-box-orient: vertical;
                  word-break: break-word;
                  line-height: 1.4;">
            ${descPauta}
        </h4>
        
        <div class="quorum" style="margin: 15px 0; padding: 12px; background: #f1f1f1; border-radius: 6px;">
            
            <!-- Quórum Qualificado -->
            <div style="padding: 10px; margin-bottom: 10px; background: ${quorumQualificadoAtingido ? '#e8f5e9' : '#ffebee'}; border-left: 4px solid ${quorumQualificadoAtingido ? '#4caf50' : '#f44336'};">
                <strong>Quórum Qualificado</strong><br>
                <span>Opção mais votada: <strong>${opcaoMaisVotada?.st_nome_vot || 'N/A'}</strong></span><br>
                <span>Votos: <strong>${votosMaisVotada}</strong> / ${quorumMinimo} (${percentualQualificado}%)</span><br>
                ${!quorumQualificadoAtingido ? `<span style="color: #e65100;">⚠️ Faltam ${votosFaltantesQualificado} votos para atingir o quórum qualificado</span>` : `<span style="color: #4caf50;">✅ Quórum qualificado atingido</span>`}
            </div>

            <!-- Maioria Simples -->
            <div style="padding: 10px; background: ${maioriaSimplesAtingida ? '#e8f5e9' : '#ffebee'}; border-left: 4px solid ${maioriaSimplesAtingida ? '#4caf50' : '#f44336'};">
                <strong>Maioria Simples</strong><br>
                ${maioriaSimplesAtingida 
                    ? `<span style="color: #4caf50;">✅ Maioria simples atingida com <strong>${opcaoMaisVotada?.st_nome_vot}</strong></span>` 
                    : `<span style="color: #f44336;">❌ Nenhuma opção obteve maioria simples</span>`}
            </div>
        </div>
        
        <div style="margin: 15px 0;">
            <strong style="display: block; margin-bottom: 8px;">Votos por Torre/Bloco:</strong>
            <div style="background: #f8f9fa; padding: 12px; border-radius: 6px;">
                <ul style="margin: 0; padding-left: 20px; list-style-type: none;">
                    ${torresLista || '<li style="color: #777;">Nenhum dado disponível</li>'}
                </ul>
            </div>
        </div>
        
        <div style="margin: 15px 0;">
            <strong style="display: block; margin-bottom: 8px;">Resultados:</strong>
            <ul style="margin: 0; padding-left: 20px;">
                ${resultadoData.data?.opcoes_voto?.map(opcao => `
                    <li style="margin-bottom: 5px;">
                        ${opcao.st_nome_vot}: 
                        <strong>${opcao.qtd_votos}</strong> votos 
                        <span style="color: #3498db;">(${opcao.porcentagem}%)</span>
                    </li>
                `).join('') || '<li style="color: #777;">Nenhum dado disponível</li>'}
            </ul>
        </div>
        
        <button style="padding: 8px 15px; background: #e74c3c; color: white; border: none; 
                      border-radius: 4px; cursor: pointer; margin-top: 10px;" 
                onclick="this.parentNode.remove()">
            Fechar Relatório
        </button>

    `;

    const btnAta = document.createElement('button');
    btnAta.textContent = 'Gerar Ata';
    btnAta.style.cssText = `
    padding: 8px 15px;
    background: #2c3e50;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    margin-left: 10px;
    `;

    btnAta.addEventListener('click', () => gerarTextoAta(idPauta));
    
    const btnVotosPorBlocoAndar = document.createElement('button');
    btnVotosPorBlocoAndar.textContent = 'Votos Por Andar';
    btnVotosPorBlocoAndar.style.cssText = `
    padding: 8px 15px;
    background: #2c3e50;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    margin-left: 10px;
    `;

    btnVotosPorBlocoAndar.addEventListener('click', () => gerarRelatorioTotalVotosTorreAndar(idPauta));

    painel.appendChild(btnAta);
    painel.appendChild(btnVotosPorBlocoAndar);


    reportsContainer.appendChild(painel);
    reportsContainer.scrollTop = reportsContainer.scrollHeight;
}


// Função para iniciar o monitoramento do chat
function iniciarMonitoramentoChat(pautas) {
    if (intervaloChat) {
        clearInterval(intervaloChat);
    }

    // O container do chat já foi criado na função criarContainer()
    
    // Verificação imediata
    verificarChats(pautas);
    
    // Configura o intervalo
    intervaloChat = setInterval(() => verificarChats(pautas), intervaloAtualizacaoChat);
}

// Função para verificar atualizações nos chats
async function verificarChats(pautas) {
    try {
        for (const pauta of pautas) {
            const idPauta = pauta.id_pauta_pau;
            const urlChat = `https://solucoesdf.superlogica.net/areadocondomino/atual/pautasv2/listardiscussao?daPauta=${idPauta}`;
            
            const response = await fetch(urlChat, { credentials: 'include' });
            const data = await response.json();
            
            if (data.data && Array.isArray(data.data)) {
                const mensagensAtuais = data.data;
                const ultimasMensagens = cacheChats[idPauta] || [];
                
                // Verifica se há novas mensagens
                if (mensagensAtuais.length > ultimasMensagens.length) {
                    const novasMensagens = mensagensAtuais.slice(ultimasMensagens.length);
                    exibirNovasMensagens(novasMensagens, idPauta);
                    
                    // Atualiza o cache
                    cacheChats[idPauta] = mensagensAtuais;
                }
            }
        }
    } catch (error) {
        logError('Erro ao verificar chats:', error);
    }
}


// Função para exibir novas mensagens
function exibirNovasMensagens(mensagens, idPauta) {
    const chatContainer = document.getElementById('chat-container');
    if (!chatContainer) {
        console.error('Container do chat não encontrado!');
        return;
    }

    const novasMensagensParaExibir = [];

    // 1. Identificar e armazenar novas mensagens
    mensagens.forEach(msg => {
        const mensagemId = msg.id_resposta_pau;
        if (!chatMensagensCache[mensagemId]) {
            chatMensagensCache[mensagemId] = msg;
            novasMensagensParaExibir.push(msg);
        }
    });

    // 2. Ordenar as novas mensagens por timestamp
    const novasMensagensOrdenadas = novasMensagensParaExibir.sort((a, b) => {
        const timestampA = new Date(a.dt_resposta_pau.replace(/(\d+)\/(\d+)\/(\d+)/, '$3-$2-$1').replace(' ', 'T') + 'Z').getTime();
        const timestampB = new Date(b.dt_resposta_pau.replace(/(\d+)\/(\d+)\/(\d+)/, '$3-$2-$1').replace(' ', 'T') + 'Z').getTime();
        return timestampA - timestampB;
    });

    // 3. Inserir as novas mensagens no DOM na ordem correta
    novasMensagensOrdenadas.forEach(novaMsg => {
        const novaMensagemElement = criarElementoMensagem(novaMsg); // Reutilizamos a função de criação

        let inserido = false;
        for (let i = 0; i < chatContainer.children.length; i++) {
            const elementoExistente = chatContainer.children[i];
            const timestampExistente = parseInt(elementoExistente.dataset.timestamp);
            const timestampNovaMsg = new Date(novaMsg.dt_resposta_pau.replace(/(\d+)\/(\d+)\/(\d+)/, '$3-$2-$1').replace(' ', 'T') + 'Z').getTime();

            if (timestampNovaMsg < timestampExistente) {
                chatContainer.insertBefore(novaMensagemElement, elementoExistente);
                inserido = true;
                break;
            }
        }

        if (!inserido) {
            chatContainer.appendChild(novaMensagemElement);
        }
    });

    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function criarElementoMensagem(msg) {
    const messageElement = document.createElement('div');
    messageElement.dataset.mensagemId = msg.id_resposta_pau; // Anotação do ID
    messageElement.dataset.timestamp = new Date(msg.dt_resposta_pau.replace(/(\d+)\/(\d+)\/(\d+)/, '$3-$2-$1').replace(' ', 'T') + 'Z').getTime(); // Anotação do timestamp para ordenação

    messageElement.style.marginBottom = '10px';
    messageElement.style.padding = '8px 12px';
    messageElement.style.borderRadius = '18px';
    messageElement.style.background = '#ffffff';
    messageElement.style.boxShadow = '0 1px 1px rgba(0,0,0,0.1)';

    const [data, hora] = msg.dt_resposta_pau.split(' ');
    const [mes, dia] = data.split('/');
    const [horas, minutos] = hora.split(':');
    const dataHora = `${dia}/${mes} ${horas}:${minutos}`;

    const bloco = msg.st_bloco_uni1 || msg.st_bloco_uni || '';
    const unidade = msg.st_unidade_uni1 || msg.st_unidade_uni || '';
    const remetente = `${msg.st_nome_con || 'Anônimo'} (${bloco}${unidade})`;

    messageElement.innerHTML = `
        <div style="font-size: 0.8em; color: #666; margin-bottom: 4px; display: flex; justify-content: space-between;">
            <span>${remetente}</span>
            <span>${dataHora}</span>
        </div>
        <div style="font-size: 0.95em; line-height: 1.4;">
            ${msg.st_resposta_pau || ''}
        </div>
    `;

    return messageElement;
}

async function gerarTextoAta(idPauta) {
    try {
        const response = await fetch(`https://solucoesdf.superlogica.net/areadocondomino/atual/pautasv2/resultadovotacao?idPauta=${idPauta}`);
        const resultado = await response.json();

        const opcoes = resultado.data.opcoes_voto;
        const resultadoFinal = resultado.data.resultado_final;

        const textoPrincipal = `Foi encerrada a votação tendo como resultado a opção "${resultadoFinal.resultado}" com ${resultadoFinal.detalhes[0].qtd_votos} votos (${resultadoFinal.detalhes[0].porcentagem}%) [${resultadoFinal.detalhes[0].lista_unidades}].`;

        const outrasOpcoes = opcoes
            .filter(op => op.st_nome_vot !== resultadoFinal.resultado)
            .map(op => ` ${op.qtd_votos} votos (${op.porcentagem}%) [${op.lista_unidades}] da opção "${op.st_nome_vot}"`)
            .join(' e');

        const textoCompleto = textoPrincipal + (outrasOpcoes ? ' Contra' + outrasOpcoes + '.' : '');

        // Criar o modal dinamicamente
        const modal = document.createElement('div');
        modal.id = 'modal-ata';
        modal.style.position = 'fixed';
        modal.style.top = '50%';
        modal.style.left = '50%';
        modal.style.transform = 'translate(-50%, -50%)';
        modal.style.backgroundColor = '#f9f9f9';
        modal.style.padding = '20px';
        modal.style.border = '1px solid #ccc';
        modal.style.borderRadius = '5px';
        modal.style.zIndex = '10001';
        modal.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
        modal.style.textAlign = 'center';

        const titulo = document.createElement('h2');
        titulo.textContent = 'Resultado da Votação';
        titulo.style.marginBottom = '10px';

        const textoAtaElement = document.createElement('p');
        textoAtaElement.textContent = textoCompleto;
        textoAtaElement.style.marginBottom = '15px';
        textoAtaElement.style.lineHeight = '1.6';

        const botaoFechar = document.createElement('button');
        botaoFechar.textContent = 'Fechar';
        botaoFechar.style.padding = '10px 15px';
        botaoFechar.style.backgroundColor = '#007bff';
        botaoFechar.style.color = 'white';
        botaoFechar.style.border = 'none';
        botaoFechar.style.borderRadius = '5px';
        botaoFechar.style.cursor = 'pointer';
        botaoFechar.addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        modal.appendChild(titulo);
        modal.appendChild(textoAtaElement);
        modal.appendChild(botaoFechar);

        // Adicionar o modal ao body
        document.body.appendChild(modal);
    } catch (err) {
        console.error('Erro ao buscar resultados:', err);
        alert('Falha ao buscar resultado da votação.');
    }
}

async function gerarRelatorioTotalVotosTorreAndar(idPauta) {
    try {
        const urlVotos = `https://solucoesdf.superlogica.net/areadocondomino/atual/pautasv2/votos?idPauta=${idPauta}&comOpcaoDeVoto=true&comQuantidadeFavoritos=true&idContato=0`;
        const responseVotos = await fetch(urlVotos, { credentials: 'include' });
        const votosData = await responseVotos.json();
        const votos = votosData.data;

        if (!votos || votos.length === 0) {
            alert('Nenhum voto registrado para esta pauta.');
            return;
        }

        const totalVotosPorTorreAndar = {};

        votos.forEach(voto => {
            const torre = voto.st_bloco_uni1 || voto.st_bloco_uni;
            const unidade = voto.st_unidade_uni1 || voto.st_unidade_uni;
            const andar = unidade ? unidade.substring(0, 2).padStart(2, '0') : 'N/A';

            if (torre) {
                if (!totalVotosPorTorreAndar[torre]) {
                    totalVotosPorTorreAndar[torre] = {};
                }
                if (!totalVotosPorTorreAndar[torre][andar]) {
                    totalVotosPorTorreAndar[torre][andar] = 0;
                }
                totalVotosPorTorreAndar[torre][andar]++;
            }
        });

        // Criar o modal para exibir o relatório
        const modalRelatorio = document.createElement('div');
        modalRelatorio.id = 'modal-relatorio-total-votos';
        modalRelatorio.style.position = 'fixed';
        modalRelatorio.style.top = '50%';
        modalRelatorio.style.left = '50%';
        modalRelatorio.style.transform = 'translate(-50%, -50%)';
        modalRelatorio.style.backgroundColor = '#f9f9f9';
        modalRelatorio.style.padding = '20px';
        modalRelatorio.style.border = '1px solid #ccc';
        modalRelatorio.style.borderRadius = '5px';
        modalRelatorio.style.zIndex = '1000';
        modalRelatorio.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
        modalRelatorio.style.textAlign = 'left';
        modalRelatorio.style.maxHeight = '80vh';
        modalRelatorio.style.overflowY = 'auto';

        const tituloRelatorio = document.createElement('h2');
        tituloRelatorio.textContent = 'Total de Votos por Torre e Andar';
        tituloRelatorio.style.marginBottom = '15px';
        modalRelatorio.appendChild(tituloRelatorio);

        const torresOrdenadas = Object.keys(totalVotosPorTorreAndar).sort();

        torresOrdenadas.forEach(torre => {
            const tituloTorre = document.createElement('h3');
            tituloTorre.textContent = `Torre ${torre}`;
            tituloTorre.style.marginTop = '10px';
            tituloTorre.style.marginBottom = '5px';
            modalRelatorio.appendChild(tituloTorre);

            const andaresLista = document.createElement('ul');
            andaresLista.style.listStyleType = 'none';
            andaresLista.style.paddingLeft = '10px';

            const andaresOrdenados = Object.keys(totalVotosPorTorreAndar[torre]).sort((a, b) => parseInt(a) - parseInt(b));

            andaresOrdenados.forEach(andar => {
                const andarItem = document.createElement('li');
                andarItem.textContent = `Andar ${andar}: ${totalVotosPorTorreAndar[torre][andar]} votos`;
                andaresLista.appendChild(andarItem);
            });
            modalRelatorio.appendChild(andaresLista);
        });

        const botaoFecharRelatorio = document.createElement('button');
        botaoFecharRelatorio.textContent = 'Fechar';
        botaoFecharRelatorio.style.padding = '10px 15px';
        botaoFecharRelatorio.style.backgroundColor = '#28a745';
        botaoFecharRelatorio.style.color = 'white';
        botaoFecharRelatorio.style.border = 'none';
        botaoFecharRelatorio.style.borderRadius = '5px';
        botaoFecharRelatorio.style.cursor = 'pointer';
        botaoFecharRelatorio.style.marginTop = '20px';
        botaoFecharRelatorio.addEventListener('click', () => {
            document.body.removeChild(modalRelatorio);
            const overlay = document.getElementById('modal-overlay');
            if (overlay) {
                document.body.removeChild(overlay);
            }
        });
        modalRelatorio.appendChild(botaoFecharRelatorio);

        const overlay = document.getElementById('modal-overlay') || criarOverlay();
        document.body.appendChild(modalRelatorio);

    } catch (err) {
        console.error('Erro ao buscar votos:', err);
        alert('Falha ao buscar os votos para gerar o relatório.');
    }
}

function criarOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'modal-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    overlay.style.zIndex = '999';
    document.body.appendChild(overlay);
    return overlay;
}