// ==========================================
// 📝 学習記録一覧 (record.html 用)
// ==========================================

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
                const rawText = (lastChat.text || '').replace(/<[^>]*>/g, ''); // HTMLタグ除去
                lastMessage = prefix + rawText;
            }
            
            const itemTitle = item.title || '無題の学習セッション';
            const itemDate = item.date || '';
            const itemSubject = item.subject || '学習';
            const itemIcon = item.icon || '📚';
            
            card.innerHTML = `
                <div class="row-icon">${itemIcon}</div>
                <div class="row-info">
                    <span class="row-date">📅 ${escapeHtml(itemDate)} [${escapeHtml(itemSubject)}]</span>
                    <h4 class="row-title">${escapeHtml(itemTitle)}</h4>
                    <p class="row-preview">${escapeHtml(lastMessage)}</p>
                </div>
                <div class="row-actions">
                    <button class="delete-row-btn" onclick="event.stopPropagation(); deleteSingleHistoryItem('${item.id}')" title="この記録を削除">🗑️ 削除</button>
                    <div class="row-arrow">➔</div>
                </div>
            `;
            historyList.appendChild(card);
        });
    }
}

/**
 * 記録を1件ずつ削除する関数
 */
function deleteSingleHistoryItem(id) {
    const item = studyHistory.find(h => h.id === id);
    const itemTitle = item ? item.title : 'この学習記録';
    
    if (confirm(`学習記録「${itemTitle}」を削除しますか？\n（削除した記録は元に戻せません）`)) {
        studyHistory = studyHistory.filter(h => h.id !== id);
        try {
            localStorage.setItem('ai-study-history', JSON.stringify(studyHistory));
        } catch (e) {
            console.error('Failed to save updated history:', e);
        }
        renderHistoryList();
        showToastNotification(`🗑️ 学習記録「${itemTitle}」を削除しました`);
    }
}

function showToastNotification(msg) {
    let toast = document.getElementById('toast-notification');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast-notification';
        toast.className = 'toast-notification';
        document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 2800);
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function goToDetail(id) {
    location.href = `../index.html?historyId=${id}`;
}
