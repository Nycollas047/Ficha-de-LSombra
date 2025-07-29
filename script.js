// Variáveis globais
let characterData = {};
let diceHistory = [];
let currentLuckBonus = null;
let characterImage = null;
const validAttributeValues = [12, 10, 10, 8, 8, 6, 6, 4];

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    validateAttributes();
    loadAutoSave();
});

// ===== SISTEMA DE UPLOAD DE IMAGEM =====

function handleImageUpload(event) {
    const file = event.target.files[0];
    if (file) {
        processImageFile(file);
    }
}

function handleDragOver(event) {
    event.preventDefault();
}

function handleDragEnter(event) {
    event.preventDefault();
    document.querySelector('.image-upload-area').classList.add('drag-over');
}

function handleDragLeave(event) {
    event.preventDefault();
    document.querySelector('.image-upload-area').classList.remove('drag-over');
}

function handleImageDrop(event) {
    event.preventDefault();
    document.querySelector('.image-upload-area').classList.remove('drag-over');
    
    const files = event.dataTransfer.files;
    if (files.length > 0) {
        const file = files[0];
        if (file.type.startsWith('image/')) {
            processImageFile(file);
        } else {
            showToast('Por favor, selecione apenas arquivos de imagem!', true);
        }
    }
}

function processImageFile(file) {
    // Verifica o tamanho do arquivo (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        showToast('Arquivo muito grande! Máximo 5MB permitido.', true);
        return;
    }

    // Verifica se é uma imagem
    if (!file.type.startsWith('image/')) {
        showToast('Por favor, selecione apenas arquivos de imagem!', true);
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        characterImage = e.target.result;
        displayImage(characterImage);
        showToast('Imagem carregada com sucesso! 📸');
    };
    reader.readAsDataURL(file);
}

function displayImage(imageSrc) {
    const imagePreview = document.getElementById('imagePreview');
    imagePreview.innerHTML = `
        <img src="${imageSrc}" alt="Personagem" class="character-image">
        <div class="image-controls">
            <button class="btn btn-small" onclick="changeImage()">🔄 Trocar</button>
            <button class="btn btn-small btn-danger" onclick="removeImage()">🗑️ Remover</button>
        </div>
    `;
}

function changeImage() {
    document.getElementById('imageInput').click();
}

function removeImage() {
    characterImage = null;
    const imagePreview = document.getElementById('imagePreview');
    imagePreview.innerHTML = `
        <div class="upload-placeholder">📸 Clique ou arraste uma imagem aqui</div>
        <div class="upload-hint">Suporta: JPG, PNG, GIF, WebP (max 5MB)</div>
    `;
    showToast('Imagem removida!');
}

// Função para alternar seções
function toggleSection(header) {
    const section = header.parentElement;
    section.classList.toggle('collapsed');
}

// ===== SISTEMA DE DADOS =====

// D2 - Sim ou Não
function rollD2() {
    const result = Math.floor(Math.random() * 2) + 1;
    const answer = result === 1 ? "SIM ✅" : "NÃO ❌";
    const rollText = `❓ D2 - Sim/Não: ${answer}`;
    
    addToHistory(rollText);
    showDiceModal("❓ Resposta Sim/Não", `${result} - ${answer}`, "Use para checar se algo é verdadeiro ou falso");
}

// D3 - Preço do Dia  
function rollD3() {
    const result = Math.floor(Math.random() * 3) + 1;
    let priceText = "";
    let description = "";
    
    switch(result) {
        case 1:
            priceText = "📉 Preços Baixos (-25%)";
            description = "Todos os preços hoje têm 25% de desconto! Subornos são mais fáceis (+2 no D20).";
            break;
        case 2:
            priceText = "⚖️ Preços Normais";
            description = "Os preços estão normais hoje. Nenhuma modificação.";
            break;
        case 3:
            priceText = "📈 Preços Altos (+50%)";
            description = "Todos os preços hoje têm 50% de aumento! Subornos são mais difíceis (-2 no D20).";
            break;
    }
    
    const rollText = `💰 D3 - Preços: ${result} (${priceText})`;
    addToHistory(rollText);
    showDiceModal("💰 Preço do Dia", `${result} - ${priceText}`, description);
}

// D4 - Dano em Combate
function rollD4Combat() {
    const result = Math.floor(Math.random() * 4) + 1;
    const rollText = `⚔️ D4 - Dano: ${result}`;
    
    addToHistory(rollText);
    
    let damageInfo = `Dano Básico: ${result}\n\n`;
    damageInfo += "Modificadores por Tipo de Inimigo:\n";
    damageInfo += `• Inimigo Fraco: ${result} de dano\n`;
    damageInfo += `• Inimigo Médio: ${result + 1} de dano\n`;
    damageInfo += `• Inimigo Forte: ${result + 5} de dano\n\n`;
    damageInfo += "Subtraia da Vida do inimigo!";
    
    showDiceModal("⚔️ Dano de Combate", `Resultado: ${result}`, damageInfo);
}

// D6 - Ataque e Ordem
function rollD6Attack() {
    const result = Math.floor(Math.random() * 6) + 1;
    const rollText = `🥊 D6 - Ataque/Ordem: ${result}`;
    
    addToHistory(rollText);
    
    let attackInfo = `Resultado: ${result}\n\n`;
    attackInfo += "Acerto por Tipo de Inimigo:\n";
    attackInfo += `• Inimigo Fraco (4+): ${result >= 4 ? "✅ ACERTOU!" : "❌ Errou"}\n`;
    attackInfo += `• Inimigo Médio (5+): ${result >= 5 ? "✅ ACERTOU!" : "❌ Errou"}\n`;
    attackInfo += `• Inimigo Forte (6): ${result >= 6 ? "✅ ACERTOU!" : "❌ Errou"}\n\n`;
    attackInfo += "Se acertou, role D4 para dano!\nTambém usado para ordem de iniciativa.";
    
    showDiceModal("🥊 Ataque e Ordem", `Resultado: ${result}`, attackInfo);
}

// D20 - Teste de Habilidade
function rollD20Skill() {
    const result = Math.floor(Math.random() * 20) + 1;
    let finalResult = result;
    let luckText = "";
    
    // Aplica bônus de sorte se existir
    if (currentLuckBonus !== null && currentLuckBonus !== 0) {
        finalResult = result + currentLuckBonus;
        luckText = ` (${result} + ${currentLuckBonus >= 0 ? '+' : ''}${currentLuckBonus} sorte = ${finalResult})`;
    }
    
    const rollText = `🎯 D20 - Habilidade: ${finalResult}${luckText}`;
    addToHistory(rollText);
    
    let skillInfo = `Resultado: ${finalResult}${luckText}\n\n`;
    skillInfo += "Compare com a dificuldade:\n";
    skillInfo += "• Fácil: 10+\n• Normal: 13+\n• Difícil: 15+\n• Muito Difícil: 18+\n\n";
    skillInfo += "Use seus atributos como base!";
    
    showDiceModal("🎯 Teste de Habilidade", `Resultado: ${finalResult}`, skillInfo);
}

// D100 - Sorte do Dia
function rollD100Luck() {
    const d10_1 = Math.floor(Math.random() * 10); // 0-9 (dezenas)
    const d10_2 = Math.floor(Math.random() * 10) + 1; // 1-10 (unidades)
    let result = (d10_1 * 10) + d10_2;
    if (result > 100) result = 100;
    if (result === 0) result = 100;
    
    let bonus = 0;
    let bonusText = "";
    let description = "";
    
    if (result >= 1 && result <= 20) {
        bonus = -2;
        bonusText = "-2";
        description = "😣 Dia de azar! -2 em um teste D20 à sua escolha.";
    } else if (result >= 21 && result <= 49) {
        bonus = 0;
        bonusText = "0";
        description = "⚖️ Dia normal, sem modificadores especiais.";
    } else if (result >= 50 && result <= 79) {
        bonus = 2;
        bonusText = "+2";
        description = "😊 Dia de sorte! +2 em um teste D20 à sua escolha.";
    } else if (result >= 80 && result <= 100) {
        bonus = 5;
        bonusText = "+5";
        description = "😄 Dia de muita sorte! +5 em um teste D20 à sua escolha.";
    }
    
    // Atualiza a sorte atual
    currentLuckBonus = bonus;
    updateLuckDisplay();
    
    const rollText = `🍀 D100 - Sorte: ${result} (${bonusText})`;
    addToHistory(rollText);
    
    showDiceModal("🍀 Sorte do Dia", `${result} - Bônus: ${bonusText}`, description);
}

// Função para atualizar display da sorte
function updateLuckDisplay() {
    const luckDisplay = document.getElementById('luckDisplay');
    const currentLuck = document.getElementById('currentLuck');
    
    if (currentLuckBonus !== null && currentLuckBonus !== 0) {
        luckDisplay.style.display = 'block';
        const bonusText = currentLuckBonus >= 0 ? `+${currentLuckBonus}` : `${currentLuckBonus}`;
        currentLuck.textContent = `${bonusText} em um teste D20 à sua escolha`;
        
        if (currentLuckBonus < 0) {
            currentLuck.style.color = '#dc143c';
        } else if (currentLuckBonus > 0) {
            currentLuck.style.color = '#32cd32';
        } else {
            currentLuck.style.color = '#daa520';
        }
    } else {
        luckDisplay.style.display = 'none';
    }
}

// Função auxiliar para adicionar ao histórico
function addToHistory(rollText) {
    const timestamp = new Date().toLocaleTimeString();
    const historyEntry = `[${timestamp}] ${rollText}`;
    diceHistory.unshift(historyEntry);
    if (diceHistory.length > 20) {
        diceHistory.pop();
    }
    updateDiceHistory();
}

// Função para mostrar modal customizado
function showDiceModal(title, result, description) {
    document.getElementById('diceTitle').textContent = title;
    document.getElementById('diceResult').innerHTML = `${result}<br><br><small style="font-size: 14px; color: #cd853f;">${description}</small>`;
    document.getElementById('diceModal').style.display = 'block';
}

function closeDiceModal() {
    document.getElementById('diceModal').style.display = 'none';
}

function updateDiceHistory() {
    const historyDiv = document.getElementById('diceHistory');
    if (diceHistory.length === 0) {
        historyDiv.innerHTML = '<div class="history-item">Nenhuma rolagem ainda...</div>';
    } else {
        historyDiv.innerHTML = diceHistory.map(roll => 
            `<div class="history-item">${roll}</div>`
        ).join('');
    }
}

function clearHistory() {
    diceHistory = [];
    currentLuckBonus = null;
    updateDiceHistory();
    updateLuckDisplay();
    showToast('Histórico limpo!');
}

// ===== VALIDAÇÃO DE ATRIBUTOS =====

function validateAttributes() {
    const attributeItems = document.querySelectorAll('.attribute-item');
    const usedValues = {};
    const availableValues = {};
    
    // Conta valores disponíveis
    validAttributeValues.forEach(val => {
        availableValues[val] = (availableValues[val] || 0) + 1;
    });
    
    // Coleta valores usados
    attributeItems.forEach(item => {
        const input = item.querySelector('input');
        const value = parseInt(input.value);
        if (!isNaN(value)) {
            usedValues[value] = (usedValues[value] || 0) + 1;
        }
    });
    
    // Valida cada atributo
    attributeItems.forEach(item => {
        const input = item.querySelector('input');
        const errorMsg = item.querySelector('.error-msg');
        const value = parseInt(input.value);
        
        item.classList.remove('error');
        errorMsg.textContent = '';
        
        if (input.value !== '' && isNaN(value)) {
            item.classList.add('error');
            errorMsg.textContent = 'Digite um número válido.';
        } else if (!isNaN(value)) {
            if (!availableValues[value]) {
                item.classList.add('error');
                errorMsg.textContent = 'Valor não permitido. Use: 12, 10, 10, 8, 8, 6, 6, 4';
            } else if (usedValues[value] > availableValues[value]) {
                item.classList.add('error');
                errorMsg.textContent = 'Valor já usado o máximo de vezes.';
            }
        }
    });
    
    // Atualiza pontos disponíveis
    const remainingPoints = {...availableValues};
    Object.keys(usedValues).forEach(val => {
        if (remainingPoints[val]) {
            remainingPoints[val] -= usedValues[val];
        }
    });
    
    const remainingList = [];
    Object.keys(remainingPoints).sort((a, b) => b - a).forEach(val => {
        for (let i = 0; i < remainingPoints[val]; i++) {
            remainingList.push(val);
        }
    });
    
    document.getElementById('availablePoints').textContent = 
        'Pontos Disponíveis: ' + (remainingList.length > 0 ? remainingList.join(', ') : 'Todos utilizados ✅');
}

function resetAttributes() {
    document.querySelectorAll('.attribute-item input').forEach(input => {
        input.value = '';
    });
    validateAttributes();
    showToast('Atributos resetados!');
}

// ===== GERENCIAMENTO DE DADOS =====

function collectCharacterData() {
    const data = {
        name: document.getElementById('characterName').value,
        personality: document.getElementById('personality').value,
        background: document.getElementById('background').value,
        image: characterImage,
        attributes: {},
        resources: {
            vida: {
                atual: document.getElementById('vida-atual').value,
                max: document.getElementById('vida-max').value
            },
            sanidade: {
                atual: document.getElementById('sanidade-atual').value,
                max: document.getElementById('sanidade-max').value
            },
            esperanca: document.getElementById('esperanca-atual').value,
            fome: document.getElementById('fome-atual').value,
            corrupcao: document.getElementById('corrupcao-atual').value
        },
        xp: document.getElementById('xp-atual').value,
        inventory: document.getElementById('inventory').value,
        notes: document.getElementById('notes').value,
        abilities: document.getElementById('abilities').value,
        diceHistory: diceHistory,
        currentLuckBonus: currentLuckBonus,
        timestamp: new Date().toISOString()
    };

    // Coleta atributos
    const attributeItems = document.querySelectorAll('.attribute-item');
    attributeItems.forEach(item => {
        const label = item.querySelector('label').textContent.replace(/[💪🛡️🕵️🧠🏃✨😊📚]/g, '').trim();
        const input = item.querySelector('input');
        data.attributes[label] = input.value;
    });

    return data;
}

function loadCharacterData(data) {
    if (!data) return;
    
    document.getElementById('characterName').value = data.name || '';
    document.getElementById('personality').value = data.personality || '';
    document.getElementById('background').value = data.background || '';

    // Carrega imagem
    if (data.image) {
        characterImage = data.image;
        displayImage(characterImage);
    }

    // Carrega atributos
    if (data.attributes) {
        const attributeItems = document.querySelectorAll('.attribute-item');
        attributeItems.forEach(item => {
            const label = item.querySelector('label').textContent.replace(/[💪🛡️🕵️🧠🏃✨😊📚]/g, '').trim();
            const input = item.querySelector('input');
            input.value = data.attributes[label] || '';
        });
        validateAttributes();
    }

    // Carrega recursos
    if (data.resources) {
        if (data.resources.vida) {
            document.getElementById('vida-atual').value = data.resources.vida.atual || '10';
            document.getElementById('vida-max').value = data.resources.vida.max || '10';
        }
        if (data.resources.sanidade) {
            document.getElementById('sanidade-atual').value = data.resources.sanidade.atual || '10';
            document.getElementById('sanidade-max').value = data.resources.sanidade.max || '10';
        }
        document.getElementById('esperanca-atual').value = data.resources.esperanca || '20';
        document.getElementById('fome-atual').value = data.resources.fome || '0';
        document.getElementById('corrupcao-atual').value = data.resources.corrupcao || '0';
    }

    document.getElementById('xp-atual').value = data.xp || '0';
    document.getElementById('inventory').value = data.inventory || '';
    document.getElementById('notes').value = data.notes || '';
    document.getElementById('abilities').value = data.abilities || '';
    
    if (data.diceHistory) {
        diceHistory = data.diceHistory;
        updateDiceHistory();
    }
    
    if (data.currentLuckBonus !== undefined) {
        currentLuckBonus = data.currentLuckBonus;
        updateLuckDisplay();
    }
}

// ===== FUNÇÕES PRINCIPAIS =====

function showToast(message, isError = false) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = 'toast' + (isError ? ' error' : '');
    toast.style.display = 'block';
    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}

function saveCharacter() {
    try {
        const data = collectCharacterData();
        characterData = data;
        
        // Simula localStorage usando variável global
        window.savedCharacter = JSON.stringify(data);
        showToast('Ficha salva com sucesso! 💾');
    } catch (error) {
        showToast('Erro ao salvar ficha: ' + error.message, true);
    }
}

function loadCharacter() {
    try {
        const saved = window.savedCharacter;
        if (saved) {
            const data = JSON.parse(saved);
            loadCharacterData(data);
            showToast('Ficha carregada com sucesso! 📂');
        } else {
            showToast('Nenhuma ficha salva encontrada!', true);
        }
    } catch (error) {
        showToast('Erro ao carregar ficha: ' + error.message, true);
    }
}

function exportCharacter() {
    try {
        const data = collectCharacterData();
        const dataStr = JSON.stringify(data, null, 2);
        
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ficha_${data.name.replace(/[^a-zA-Z0-9]/g, '_') || 'personagem'}_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showToast('Ficha exportada com sucesso! 📤');
    } catch (error) {
        showToast('Erro ao exportar ficha: ' + error.message, true);
    }
}

function importCharacter() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const data = JSON.parse(e.target.result);
                    loadCharacterData(data);
                    showToast('Ficha importada com sucesso! 📥');
                } catch (error) {
                    showToast('Erro ao importar ficha: ' + error.message, true);
                }
            };
            reader.readAsText(file);
        }
    };
    input.click();
}

function printSheet() {
    window.print();
}

function clearCharacter() {
    if (confirm('Tem certeza que deseja criar uma nova ficha? Esta ação irá limpar todos os dados atuais.')) {
        // Limpa todos os campos
        document.getElementById('characterName').value = '';
        document.getElementById('personality').value = '';
        document.getElementById('background').value = '';
        
        // Remove imagem
        removeImage();
        
        // Limpa atributos
        document.querySelectorAll('.attribute-item input').forEach(input => {
            input.value = '';
        });
        validateAttributes();
        
        // Restaura recursos padrão
        document.getElementById('vida-atual').value = '10';
        document.getElementById('vida-max').value = '10';
        document.getElementById('sanidade-atual').value = '10';
        document.getElementById('sanidade-max').value = '10';
        document.getElementById('esperanca-atual').value = '20';
        document.getElementById('fome-atual').value = '0';
        document.getElementById('corrupcao-atual').value = '0';
        document.getElementById('xp-atual').value = '0';
        
        // Limpa campos de texto
        document.getElementById('inventory').value = '';
        document.getElementById('notes').value = '';
        document.getElementById('abilities').value = '';
        
        // Limpa histórico
        clearHistory();
        
        showToast('Nova ficha criada! 🗑️');
    }
}

// Auto-save
function autoSave() {
    try {
        const data = collectCharacterData();
        window.autoSavedCharacter = JSON.stringify(data);
    } catch (error) {
        console.log('Erro no auto-save:', error);
    }
}

function loadAutoSave() {
    try {
        const saved = window.autoSavedCharacter || window.savedCharacter;
        if (saved) {
            const data = JSON.parse(saved);
            loadCharacterData(data);
        }
    } catch (error) {
        console.log('Erro ao carregar auto-save:', error);
    }
}

// Auto-save a cada 30 segundos
setInterval(autoSave, 30000);

// Eventos de teclado
document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        saveCharacter();
    }
    if (e.ctrlKey && e.key === 'o') {
        e.preventDefault();
        loadCharacter();
    }
});

// Fechar modal ao clicar fora
document.getElementById('diceModal').addEventListener('click', function(e) {
    if (e.target === this) {
        closeDiceModal();
    }
});

// Auto-save quando há mudanças
document.addEventListener('input', function() {
    clearTimeout(window.autoSaveTimeout);
    window.autoSaveTimeout = setTimeout(autoSave, 2000);
});

// Previne comportamento padrão do drag and drop no documento
document.addEventListener('dragover', function(e) {
    e.preventDefault();
});

document.addEventListener('drop', function(e) {
    e.preventDefault();
});

// Melhorias de acessibilidade
document.addEventListener('keydown', function(e) {
    // ESC para fechar modal
    if (e.key === 'Escape') {
        const modal = document.getElementById('diceModal');
        if (modal.style.display === 'block') {
            closeDiceModal();
        }
    }
    
    // Enter para confirmar no modal
    if (e.key === 'Enter') {
        const modal = document.getElementById('diceModal');
        if (modal.style.display === 'block') {
            closeDiceModal();
        }
    }
});

// Função para ajustar altura automática dos textareas
function adjustTextareaHeight(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
}

// Aplica auto-resize para todos os textareas
document.querySelectorAll('textarea').forEach(textarea => {
    textarea.addEventListener('input', function() {
        adjustTextareaHeight(this);
    });
    // Ajusta na inicialização
    adjustTextareaHeight(textarea);
});

// Função para validar entrada de números nos recursos
function validateResourceInput(input) {
    const value = parseInt(input.value);
    const min = parseInt(input.min);
    const max = parseInt(input.max);
    
    if (isNaN(value)) {
        input.value = min || 0;
    } else if (max && value > max) {
        input.value = max;
    } else if (value < min) {
        input.value = min;
    }
}

// Aplica validação aos inputs de recursos
document.querySelectorAll('input[type="number"]').forEach(input => {
    input.addEventListener('blur', function() {
        validateResourceInput(this);
    });
});

// Notificação de boas-vindas
setTimeout(() => {
    if (!window.savedCharacter && !window.autoSavedCharacter) {
        showToast('Bem-vindo! Crie seu personagem e use Ctrl+S para salvar. 🎮');
    }
}, 1000);