// Variável global para controle
let intervaloAtualizacao;
let ultimasPautasConhecidas = [];


// 1. Verifica se a página já está carregada
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    iniciarExtensao();
} else {
    document.addEventListener('DOMContentLoaded', iniciarExtensao);
}



async function iniciarExtensao() {
    console.log('Extensão iniciada!');
    
    // Cria o container principal
    const container = criarContainer();
    
    // Inicia a verificação periódica
    iniciarMonitoramento(container);
}

function criarContainer() {
    let container = document.getElementById('extensao-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'extensao-container';
        container.style.position = 'fixed';
        container.style.bottom = '20px';
        container.style.right = '20px';
        container.style.zIndex = '9999';
        container.style.maxHeight = '80vh';
        container.style.overflowY = 'auto';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '15px';
        container.style.background = 'white';
        container.style.padding = '15px';
        container.style.borderRadius = '8px';
        container.style.boxShadow = '0 0 20px rgba(0,0,0,0.2)';
        document.body.appendChild(container);
        
        // Adiciona botão de controle
        const controle = document.createElement('div');
        controle.style.display = 'flex';
        controle.style.justifyContent = 'space-between';
        controle.style.marginBottom = '10px';
        controle.style.alignItems = 'center';
        
        controle.innerHTML = `
            <strong style="font-size: 1.1em;">Relatórios de Votação</strong>
            <div>
                <button id="atualizar-agora" style="padding: 5px 10px; margin-right: 5px; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    Atualizar Agora
                </button>
                <button id="pausar-monitoramento" style="padding: 5px 10px; background: #f39c12; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    Pausar
                </button>
            </div>
        `;
        
        container.prepend(controle);
        
        // Adiciona listeners aos botões
        document.getElementById('atualizar-agora').addEventListener('click', () => {
            verificarPautas(container, true);
        });
        
        document.getElementById('pausar-monitoramento').addEventListener('click', toggleMonitoramento);
    }
    return container;
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

async function verificarPautas(container, forcarAtualizacao = false) {
    console.log('Verificando pautas...');
    
    try {
        const idAssembleia = obterIdAssembleia();
        if (!idAssembleia) return;

        const urlPautas = `https://solucoesdf.superlogica.net/areadocondomino/atual/assembleiasv2/index?assembleias=proximas&id=${idAssembleia}&comPautas=1`;
        const response = await fetch(urlPautas, { credentials: 'include' });
        const data = await response.json();

        if (!data.data?.[0]?.pautas) {
            console.log('Nenhuma pauta encontrada.');
            return;
        }

        const pautasAtuais = data.data[0].pautas;
        
        // Verifica se houve mudanças ou se é uma atualização forçada
        if (forcarAtualizacao || JSON.stringify(pautasAtuais) !== JSON.stringify(ultimasPautasConhecidas)) {
            console.log('Atualizando relatórios...');
            ultimasPautasConhecidas = pautasAtuais;
            
            // Limpa relatórios antigos (exceto o cabeçalho)
            const container = document.getElementById('extensao-container');
            Array.from(container.children).forEach(child => {
                if (!child.querySelector('#atualizar-agora')) {
                    child.remove();
                }
            });
            
            // Processa cada pauta
            for (const pauta of pautasAtuais) {
                const idPauta = pauta.id_pauta_pau;
                const descPauta = pauta.st_titulo_pau;
                await gerarRelatorio(idPauta, container, descPauta);
            }
            
            // Adiciona timestamp da última atualização
            const timestamp = document.createElement('div');
            timestamp.style.textAlign = 'right';
            timestamp.style.fontSize = '0.8em';
            timestamp.style.color = '#7f8c8d';
            timestamp.textContent = `Última atualização: ${new Date().toLocaleTimeString()}`;
            container.appendChild(timestamp);
        } else {
            console.log('Nenhuma alteração nas pautas detectada.');
        }
    } catch (error) {
        console.error('Erro ao verificar pautas:', error);
    }
}

function obterIdAssembleia() {
    const linkFilho = document.querySelector('#link-meeting a[id_assembleia]');
    if (linkFilho) {
        return linkFilho.getAttribute('id_assembleia');
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
    const painel = document.createElement('div');
    painel.className = 'painel-relatorio';
    painel.style.background = 'white';
    painel.style.padding = '15px';
    painel.style.borderRadius = '8px';
    painel.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
    painel.style.marginBottom = '10px';
    painel.style.maxWidth = '600px';

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
        
        <div style="margin: 15px 0; padding: 12px; background: ${quorumAtingido ? '#e8f5e9' : '#ffebee'}; border-radius: 6px; border-left: 4px solid ${quorumAtingido ? '#4caf50' : '#f44336'};">
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

    container.appendChild(painel);
}