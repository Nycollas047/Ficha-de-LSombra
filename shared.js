// shared.js

// --- Estrutura de Dados (Conforme sua arquitetura unificada) ---
const SistemaRPG = {
    Nome: "RPG de Horror Psicológico",
    Descricao: "Um jogo de contar histórias para cinco jogadores adultos, jogado por chamada de vídeo com dados reais, focado em horror psicológico, escolhas difíceis e sobrevivência.",
    Jogadores: 5,
    TipoJogo: "Contar Histórias",
    Foco: ["Horror Psicológico", "Escolhas Difíceis", "Sobrevivência"],
    Requisitos: ["Chamada de Vídeo (Discord, Zoom, etc.)", "Dados Reais", "Ficha de Personagem (papel ou celular)"]
};

// RPGSession será simulado como um objeto único no localStorage
let currentSession = null; // Objeto que conterá currentGameState, players, etc.

// Personagem Template (para criação de novos personagens)
const PersonagemTemplate = {
    ID: "", // UUID
    OwnerUserID: "", // Referência ao UserID do jogador
    SessionID: "", // ID da sessão à qual pertence
    Nome: "",
    Personalidade: "Curioso e cauteloso",
    ImagemURL: null, // Nova propriedade para a URL da imagem
    Recursos: {
        Vida: { ValorAtual: 10, ValorMaximo: 10, ConsequenciaZero: "Morte (a ser detalhado)" },
        Sanidade: { ValorAtual: 10, ValorMaximo: 10, ConsequenciaZero: "Loucura/Colapso Mental (a ser detalhado)" },
        FragmentosEsperanca: { ValorAtual: 20 },
        Fome: {
            Pontos: 0, // 0-5
            Efeitos: {
                "1Ponto": { Forca: -1, Constituicao: -1 },
                "2Pontos": { Forca: -1, Constituicao: -1, Desvio: -1 },
                "3Pontos": { Forca: -2, Constituicao: -2, Desvio: -2, SanidadeAlvo: +1 },
                "4Pontos": { Forca: -3, Constituicao: -3, Desvio: -3, SanidadeAlvo: +2, PoderAlvo: +2 },
                "5Ponto": "Incapaz de Agir sem Sacrifício de Vida/Sanidade ou Morte"
            },
            MaximoAlcancado: "Consequências Graves (Morte por inanição, coma)"
        },
        Corrupcao: {
            Pontos: 0, // 0-5
            Efeitos: {
                "1Ponto": { SanidadeAlvo: +1, DesvioAlvo: +1 },
                "2Pontos": { SanidadeAlvo: +1, DesvioAlvo: +1, PoderAlvo: +1 },
                "3Pontos": { SanidadeAlvo: +2, DesvioAlvo: +2, PoderAlvo: +2, Ilusoes: "Chance (Mestre decide)" },
                "4Pontos": { TodosAtributosAlvo: +1, Ilusoes: "Constantes" },
                "5Ponto": "Controle sobre o Personagem pode ser perdido (NPC)"
            },
            MaximoAlcancado: "Possessão ou Transformação (a ser detalhado)"
        }
    },
    Atributos: {
        ValoresDisponiveisParaDistribuicao: [12, 10, 10, 8, 8, 6, 6, 4],
        LogicaDeDistribuicao: {
            Tipo: "Atribuição Livre e Única",
            Descricao: "Durante a criação do personagem, o jogador deve atribuir cada um dos 'ValoresDisponiveisParaDistribuicao' a um atributo diferente. Uma vez que um valor é atribuído a um atributo, ele não pode ser usado para outro atributo.",
            Validacao: [
                "Soma dos atributos deve ser 64.",
                "Cada valor em 'ValoresDisponiveisParaDistribuicao' deve ser usado exatamente uma vez."
            ]
        },
        Forca: { Valor: 0, Uso: "Esforços físicos (escalar, alvo 13)" },
        Constituicao: { Valor: 0, Uso: "Resistir a frio, veneno (alvo 14)" },
        Presenca: { Valor: 0, Uso: "Ser furtivo ou chamar atenção (alvo 13)" },
        Inteligencia: { Valor: 0, Uso: "Resolver enigmas (alvo 15)" },
        Desvio: { Valor: 0, Uso: "Esquivar ataques (alvo 13)" },
        Poder: { Valor: 0, Uso: "Resistir a ilusões (alvo 15)" },
        Aparencia: { Valor: 0, Uso: "Convencer NPCs (alvo 12)" },
        Educacao: { Valor: 0, Uso: "Conhecimento ou rituais (alvo 18)" }
    },
    Estado: {
        Condicao: ["Normal"],
        EfeitosTemporarios: [] // Ex: [{Nome: "Chá de Ervas", Efeito: "+2 Int/Poder", Duracao: "1 Teste"}]
    },
    Inventario: []
};

const MecanicasJogo = {
    Dados: {
        D2: { Proposito: "Responde 'sim ou não'", Uso: "Checar se algo é verdade (ex: NPC está mentindo?)", ComoRolar: "D2 ou moeda (cara = 1, coroa = 2)", Resultado: "1 = sim (verdadeiro), 2 = não (falso)" },
        D3: { Proposito: "Define preços do dia", Uso: "Comprar comida, itens, subornos", ComoRolar: "Mestre rola um D3 no início do dia", Resultados: { 1: "Preços caem 25%", 2: "Preços normais", 3: "Preços sobem 50%" } },
        D4: { Proposito: "Calcula dano em luta ou perda de Sanidade", Uso: "Atacar inimigos (após acerto com D6), Consequências de falha", ComoRolar: "Role um D4" },
        D6: { Proposito: "Decide acerto em luta e ordem de ação", Uso: "Atacar ou agir primeiro", ComoRolar: "Role um D6", ResultadosCombate: { InimigoFraco: "4+", InimigoMedio: "5+", InimigoForte: "6" }, OrdemAcao: "Maior resultado age primeiro" },
        D20: { Proposito: "Testa habilidades (atributos)", Uso: "Convencer, escalar, resistir a ilusões", ComoRolar: "Role um D20", NumeroAlvo: { Facil: 10, Medio: 13, Dificil: 15, MuitoDificil: 18 }, Sucesso: "Igualar ou superar o alvo", Falha: "Pode ter consequências (ex: perder Sanidade)" },
        D100: { Proposito: "Define sorte do dia", Uso: "Ganhar bônus/penalidades em um teste D20", ComoRolar: "Role dois D10 (um para dezenas, outro para unidades)", Resultados: { "1-20": "-2", "21-49": "0", "50-79": "+2", "80-100": "+5" } }
    },
    FasesDia: ["Manhã", "Tarde", "Noite"],
    TratamentoLimitesRecursos: {
        VidaMinima: 0,
        SanidadeMinima: 0,
        FomeMaxima: 5,
        CorrupcaoMaxima: 5,
        LogicaTratamento: "Valores de Vida/Sanidade não podem cair abaixo de 0. Valores de Fome/Corrupção não podem exceder seus máximos. Tentativas de ganho acima do máximo ou perda abaixo do mínimo são ignoradas ou resultam em consequências específicas."
    },
    // Funções de Lógica de Jogo
    AplicarPerdaSanidade: (personagem, dano) => {
        personagem.Recursos.Sanidade.ValorAtual = Math.max(MecanicasJogo.TratamentoLimitesRecursos.SanidadeMinima, personagem.Recursos.Sanidade.ValorAtual - dano);
        // Notificação seria enviada aqui para o jogador
    },
    CalcularPrecoAjustado: (precoBase, fator) => {
        if (fator === 1) return arredondarParaBaixo(precoBase * 0.75);
        if (fator === 3) return arredondarParaCima(precoBase * 1.5);
        return precoBase;
    }
};

const Catalogo = {
    ItensServicos: [
        { Categoria: "Comida", ItemServico: "Refeição Simples", PrecoBase: 2, Efeito: "Remove 1 fase Fome. Recupera D4 Vida." },
        { Categoria: "Comida", ItemServico: "Ração de Viagem", PrecoBase: 3, Efeito: "Remove 1 fase Fome." },
        { Categoria: "Comida", ItemServico: "Refeição Substanciosa", PrecoBase: 5, Efeito: "Remove todas fases Fome. Recupera D4 Sanidade." },
        { Categoria: "Hospedagem", ItemServico: "Noite em Taverna (Comum)", PrecoBase: 5, Efeito: "Cama barulhenta." },
        { Categoria: "Equipamentos", ItemServico: "Faca/Punhal", PrecoBase: 5, Efeito: "D4 dano em combate." },
        { Categoria: "Itens Raros", ItemServico: "Amuleto de Proteção", PrecoBase: 40, Efeito: "Evita 1 Ponto de Corrupção." },
        { Categoria: "Serviços", ItemServico: "Cura (Básica)", PrecoBase: 20, Efeito: "Recupera D4 Vida OU Sanidade (escolha do jogador)." },
        { Categoria: "Serviços", ItemServico: "Cura (Avançada)", PrecoBase: 50, Efeito: "Recupera D6 Vida OU Sanidade, remove uma condição leve (ex: Aflito)." },
        { Categoria: "Itens Raros", ItemServico: "Chá de Ervas", PrecoBase: 30, Efeito: "Concede +2 em um teste D20 de Inteligência ou Poder (1 uso)." },
        { Categoria: "Itens Raros", ItemServico: "Patuá Amaldiçoado", PrecoBase: 25, Efeito: "Concede +3 em D20 Poder. Falha no teste de Poder (com ou sem bônus) resulta em 1 Corrupção." },
        { Categoria: "Itens Raros", ItemServico: "Diário Antigo", PrecoBase: 15, Efeito: "Fornece uma pista (teste D20 Inteligência, alvo 15). Falha resulta em perda de D4 Sanidade." }
    ],
    Rituais: [
        { ID: "ritual-1", Nome: "Purificação da Alma", Requisito: { Atributo: "Educacao", Alvo: 18 }, Custo: { FragmentosEsperanca: 50, Item: "Ervas Raras" }, Efeito: "Remove 1 ponto de Corrupção.", Risco: "Falha pode gerar 1 ponto de Corrupção extra." }
    ]
};

// --- Funções de Ajuda ---
function rolarDado(lados) {
    return Math.floor(Math.random() * lados) + 1;
}

function arredondarParaBaixo(numero) {
    return Math.floor(numero);
}

function arredondarParaCima(numero) {
    return Math.ceil(numero);
}

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function getPrecoAtual(item) {
    // currentSession pode ser null se o usuário não estiver em uma sessão ativa
    if (!currentSession || !currentSession.currentGameState) {
        return item.PrecoBase; // Retorna o preço base se não houver estado de sessão
    }
    return MecanicasJogo.CalcularPrecoAjustado(item.PrecoBase, currentSession.currentGameState.PrecoDoDiaFator);
}

// --- Funções de Persistência (Simuladas com localStorage) ---
// Salva o objeto de sessão completo no localStorage
function saveRPGSessionState() {
    if (currentSession && currentSession.SessionID) {
        localStorage.setItem('rpg_session_state_' + currentSession.SessionID, JSON.stringify(currentSession));
    }
}

// Carrega o objeto de sessão completo do localStorage
function loadRPGSessionState() {
    const activeSessionId = localStorage.getItem('activeSessionId');
    if (activeSessionId) {
        const storedSessionState = localStorage.getItem('rpg_session_state_' + activeSessionId);
        if (storedSessionState) {
            currentSession = JSON.parse(storedSessionState);
        } else {
            // Se a sessão não existe no localStorage, inicializa uma nova para este ID
            currentSession = {
                SessionID: activeSessionId,
                NomeSessao: "Sessão Padrão",
                MasterUserID: "", // Será preenchido pelo Mestre
                PlayerUserIDs: [],
                currentGameState: {
                    FaseAtualIndex: 0,
                    DiasPassados: 0,
                    PrecoDoDiaFator: 2,
                    SorteDiariaBonusD20: 0,
                    ProgressoCampanha: {
                        ArcosConcluidos: [],
                        PistasResolvidas: [],
                        DesafiosSuperados: [],
                        PontosExperienciaSessao: 0
                    }
                },
                Personagens: [], // Subcoleção simulada como array
                NPCs: [],
                Locais: [],
                Pistas: [],
                Combates: [],
                Mercenarios: [],
                ArcosNarrativos: [],
                Notificacoes: [],
                LogRolagens: []
            };
            saveRPGSessionState(); // Salva a sessão recém-inicializada
        }
    } else {
        currentSession = null; // Nenhuma sessão ativa
    }
}

// --- Funções de UI/UX (Modais e Mensagens) ---
function showModal(title, message, type = 'info', onConfirm = null, onCancel = null) {
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay';
    modalOverlay.innerHTML = `
        <div class="modal-content">
            <h3>${title}</h3>
            <p>${message}</p>
            <div class="modal-actions">
                ${onConfirm ? `<button class="btn btn-primary" id="modal-confirm-btn">Confirmar</button>` : ''}
                <button class="btn btn-secondary" id="modal-close-btn">${onConfirm ? 'Cancelar' : 'Fechar'}</button>
            </div>
        </div>
    `;
    document.body.appendChild(modalOverlay);

    document.getElementById('modal-close-btn').onclick = () => {
        document.body.removeChild(modalOverlay);
        if (onCancel) onCancel();
        else if (!onConfirm) { /* If no confirm, it's just a close, do nothing more */ }
    };
    if (onConfirm) {
        document.getElementById('modal-confirm-btn').onclick = () => {
            document.body.removeChild(modalOverlay);
            onConfirm();
        };
    }
}

function showToast(message, type = 'info', duration = 3000) {
    const toastContainer = document.getElementById('toast-container') || (() => {
        const div = document.createElement('div');
        div.id = 'toast-container';
        div.style.position = 'fixed';
        div.style.bottom = '20px';
        div.style.right = '20px';
        div.style.zIndex = '1050';
        document.body.appendChild(div);
        return div;
    })();

    const toast = document.createElement('div');
    toast.className = `alert alert-${type} fade show`;
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.5s ease-in-out';
    toast.style.marginBottom = '10px';
    toast.textContent = message;
    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '1';
    }, 100);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.addEventListener('transitionend', () => toast.remove());
    }, duration);
}


// --- Funções Gemini API (Compartilhadas) ---
const API_KEY = ""; // A chave da API será fornecida pelo ambiente em tempo de execução
const MODEL_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${API_KEY}`;

async function callGeminiAPI(prompt, maxRetries = 5, delay = 1000) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            const chatHistory = [{ role: "user", parts: [{ text: prompt }] }];
            const payload = { contents: chatHistory };

            const response = await fetch(MODEL_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                if (response.status !== 429) { // 429 is Too Many Requests
                    throw new Error(`Erro HTTP: ${response.status} - ${response.statusText}`);
                }
                console.warn(`Tentativa ${i + 1} falhou com 429. Tentando novamente em ${delay / 1000}s...`);
                await new Promise(res => setTimeout(res, delay));
                delay *= 2; 
                continue;
            }

            const result = await response.json();
            if (result.candidates && result.candidates.length > 0 &&
                result.candidates[0].content && result.candidates[0].content.parts &&
                result.candidates[0].content.parts.length > 0) {
                return result.candidates[0].content.parts[0].text;
            } else {
                throw new Error("Estrutura de resposta inesperada da API Gemini.");
            }
        } catch (error) {
            console.error("Erro ao chamar a API Gemini:", error);
            if (i < maxRetries - 1) {
                console.warn(`Tentativa ${i + 1} falhou. Tentando novamente em ${delay / 1000}s...`);
                await new Promise(res => setTimeout(res, delay));
                delay *= 2;
            } else {
                throw error;
            }
        }
    }
    return null; 
}

// --- Funções de Navegação Centralizadas ---
function logout() {
    localStorage.clear();
    window.location.href = 'index.html';
}

function renderNavbar(currentPage) {
    const userRole = localStorage.getItem('userRole');
    const activeSessionId = localStorage.getItem('activeSessionId');
    const userId = localStorage.getItem('userId');

    let navHtml = `
        <nav class="navbar navbar-expand-lg navbar-light bg-light fixed-top shadow-sm">
            <div class="container-fluid">
                <a class="navbar-brand" href="index.html">RPG Pergaminho</a>
                <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
                    <span class="navbar-toggler-icon"></span>
                </button>
                <div class="collapse navbar-collapse" id="navbarNav">
                    <ul class="navbar-nav me-auto mb-2 mb-lg-0">
    `;

    if (userRole === 'Master') {
        navHtml += `
            <li class="nav-item">
                <a class="nav-link ${currentPage === 'master' ? 'active' : ''}" href="master.html">Área do Mestre</a>
            </li>
            <li class="nav-item">
                <a class="nav-link ${currentPage === 'session_management' ? 'active' : ''}" href="session_management.html">Gerenciar Sessões</a>
            </li>
        `;
    } else if (userRole === 'Player') {
        navHtml += `
            <li class="nav-item">
                <a class="nav-link ${currentPage === 'player' ? 'active' : ''}" href="player.html">Sua Ficha</a>
            </li>
            <li class="nav-item">
                <a class="nav-link ${currentPage === 'session_join' ? 'active' : ''}" href="session_join.html">Trocar Sessão</a>
            </li>
        `;
        // Only show character creation link if they are a player and don't have a character for the active session
        // This check would ideally be more robust with Firestore, but for localStorage simulation:
        const associatedCharacterId = localStorage.getItem('associatedCharacterId');
        if (activeSessionId && associatedCharacterId === 'null') {
            navHtml += `
                <li class="nav-item">
                    <a class="nav-link ${currentPage === 'character_creation' ? 'active' : ''}" href="character_creation.html">Criar Personagem</a>
                </li>
            `;
        }
    }

    navHtml += `
                    </ul>
                    <ul class="navbar-nav ms-auto">
                        <li class="nav-item">
                            <span class="navbar-text me-3">
                                ${userId ? `ID: ${userId.substring(0, 8)}...` : ''}
                                ${activeSessionId ? ` | Sessão: ${activeSessionId.substring(0, 8)}...` : ''}
                            </span>
                        </li>
                        <li class="nav-item">
                            <button class="btn btn-outline-danger" onclick="logout()">Sair</button>
                        </li>
                    </ul>
                </div>
            </div>
        </nav>
        <div style="padding-top: 70px;"></div> <!-- Offset for fixed navbar -->
    `;

    const navbarPlaceholder = document.getElementById('navbar-placeholder');
    if (navbarPlaceholder) {
        navbarPlaceholder.innerHTML = navHtml;
    }
}
