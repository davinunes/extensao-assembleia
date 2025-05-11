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
    container.style.maxHeight = '80vh';
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
    chatContainer.style.maxHeight = '70vh';
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
    reportsContainer.style.maxHeight = '70vh';
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
    const quorumAtingido = totalVotos >= quorumMinimo;
    const votosFaltantes = Math.max(0, quorumMinimo - totalVotos);
    const percentualAtingido = ((totalVotos / quorumMinimo) * 100).toFixed(1);

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
        
        <div class="quorum" style="margin: 15px 0; padding: 12px; background: ${quorumAtingido ? '#e8f5e9' : '#ffebee'}; border-radius: 6px; border-left: 4px solid ${quorumAtingido ? '#4caf50' : '#f44336'};">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <strong>Quórum de Votação</strong>
                <span style="font-weight: bold; color: ${quorumAtingido ? '#4caf50' : '#f44336'};">
                    ${quorumAtingido ? '✅ Atingido' : '❌ Não Atingido'}
                </span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 0.9em;">
                <div>
                    <span>Total de votos: <strong>${totalVotos}</strong></span><br>
                    <span>Mínimo necessário: <strong>${quorumMinimo}</strong></span>
                </div>
                <div style="text-align: right;">
                    <span>${percentualAtingido}% do quórum</span><br>
                    <span>Faltam: <strong>${votosFaltantes}</strong> votos</span>
                </div>
            </div>
            ${!quorumAtingido ? `
            <div style="margin-top: 8px; background: #fff3e0; padding: 8px; border-radius: 4px; font-size: 0.85em;">
                <span style="color: #e65100;">⚠️ A assembleia precisa de mais ${votosFaltantes} votos para atingir o quórum mínimo</span>
            </div>
            ` : ''}
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
        logError('Container do chat não encontrado!');
        return;
    }

    // Função auxiliar para parse e validação da data
    const parseDateTime = (dateTimeStr) => {
        try {
            const [datePart, timePart] = dateTimeStr.split(' ');
            const [day, month, year] = datePart.split('/');
            const [hours, minutes, seconds] = timePart.split(':');
            
            return new Date(
                parseInt(year),
                parseInt(month) - 1,
                parseInt(day),
                parseInt(hours),
                parseInt(minutes),
                parseInt(seconds)
            );
        } catch (e) {
            logError('Erro ao parsear data:', dateTimeStr, e);
            return new Date(); // Retorna data atual como fallback
        }
    };

    // 1. Converter e ordenar mensagens por timestamp
    const mensagensOrdenadas = mensagens
        .filter(msg => msg.dt_resposta_pau) // Filtra mensagens com data válida
        .map(msg => {
            return {
                ...msg,
                timestamp: parseDateTime(msg.dt_resposta_pau).getTime()
            };
        })
        .sort((a, b) => a.timestamp - b.timestamp);

    // 2. Limpar e adicionar mensagens ordenadas
    chatContainer.innerHTML = '';

    mensagensOrdenadas.forEach(msg => {
        try {
            const messageElement = document.createElement('div');
            messageElement.style.marginBottom = '10px';
            messageElement.style.padding = '8px 12px';
            messageElement.style.borderRadius = '18px';
            messageElement.style.background = '#ffffff';
            messageElement.style.boxShadow = '0 1px 1px rgba(0,0,0,0.1)';
            
            // Formatação da data/hora no padrão brasileiro
            const [data, hora] = msg.dt_resposta_pau.split(' ');
            const [mes, dia] = data.split('/');
            const [horas, minutos] = hora.split(':');
            const dataHora = `${dia}/${mes} ${horas}:${minutos}`;
            
            // Remetente formatado (Bloco + Unidade)
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
            
            chatContainer.appendChild(messageElement);
        } catch (e) {
            logError('Erro ao exibir mensagem:', msg, e);
        }
    });
    
    chatContainer.scrollTop = chatContainer.scrollHeight;
}