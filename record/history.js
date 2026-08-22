// ==========================================
// 📝 学習記録一覧 (record.html 用)
// ==========================================

// デフォルトの履歴データ（サンプルデータは全削除し、実際に行った学習のみ記録されます）
const defaultHistory = [];

let studyHistory = [];

window.addEventListener('DOMContentLoaded', () => {
    loadHistory();
    renderHistoryList();
});

function isSampleItem(item) {
    if (!item || typeof item !== 'object') return true;
    if (!item.id) return true;
    const sampleIds = ['h1', 'h2', 'h3', 'h4', 'h5'];
    if (sampleIds.includes(String(item.id)) || String(item.id).startsWith('h_sample') || String(item.id).startsWith('sample_')) {
        return true;
    }
    if (!String(item.id).startsWith('h_session_')) {
        const sampleTitles = [
            '漢文の訓読',
            '二次関数のグラフ',
            '植物の呼吸',
            '世界の気候区分',
            '不規則動詞の過去形',
            '数学：二次関数の最大・最小',
            '数学：二次関数の基礎計算'
        ];
        if (item.title && sampleTitles.some(st => item.title.includes(st))) {
            return true;
        }
    }
    return false;
}

function loadHistory() {
    const saved = localStorage.getItem('ai-study-history');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) {
                studyHistory = parsed.filter(item => !isSampleItem(item));
            } else {
                studyHistory = [];
            }
        } catch (e) {
            console.error('Failed to parse history from localStorage', e);
            studyHistory = [];
        }
    } else {
        studyHistory = [];
        localStorage.setItem('ai-study-history', JSON.stringify([]));
    }
}

function renderHistoryList() {
    const historyList = document.getElementById('history-list');
    const emptyMessage = document.getElementById('empty-history-message');
    
    if (!historyList) return;
    
    historyList.innerHTML = '';
    
    if (studyHistory.length === 0) {
        if (emptyMessage) emptyMessage.classList.remove('hidden');
    } else {
        if (emptyMessage) emptyMessage.classList.add('hidden');
        
        studyHistory.forEach(item => {
            const card = document.createElement('div');
            card.className = 'history-item-row';
            card.style.cursor = 'pointer';
            card.setAttribute('onclick', `goToDetail('${item.id}')`);
            
            // 最新のやり取りを取得してプレビュー表示
            let lastMessage = '';
            if (item.chat && item.chat.length > 0) {
                const lastChat = item.chat[item.chat.length - 1];
                const prefix = lastChat.sender === 'ai' ? '🤖 AI: ' : '👤 あなた: ';
                lastMessage = prefix + lastChat.text.replace(/<[^>]*>/g, ''); // HTMLタグ除去
            }
            
            card.innerHTML = `
                <div class="row-icon">${item.icon}</div>
                <div class="row-info">
                    <span class="row-date">📅 ${item.date} [${item.subject}]</span>
                    <h4 class="row-title">${item.title}</h4>
                    <p class="row-preview">${lastMessage}</p>
                </div>
                <div class="row-arrow">➔</div>
            `;
            historyList.appendChild(card);
        });
    }
}

function goToDetail(id) {
    location.href = `../index.html?historyId=${id}`;
}
