// ==========================================
// 📝 学習記録一覧 (record.html 用)
// ==========================================

let studyHistory = [];
let isRecordSelectionMode = false;
let selectedRecordHistoryIds = new Set();

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

/**
 * 選択削除モードのON/OFF切り替え
 */
function toggleRecordSelectionMode(forceState) {
    if (typeof forceState === 'boolean') {
        isRecordSelectionMode = forceState;
    } else {
        isRecordSelectionMode = !isRecordSelectionMode;
    }

    if (!isRecordSelectionMode) {
        selectedRecordHistoryIds.clear();
    }

    const toggleBtn = document.getElementById('record-select-toggle-btn');
    const toolbar = document.getElementById('record-selection-toolbar');

    if (toggleBtn) {
        if (isRecordSelectionMode) {
            toggleBtn.classList.add('active');
            toggleBtn.textContent = '✕ 選択を解除';
        } else {
            toggleBtn.classList.remove('active');
            toggleBtn.textContent = '☑️ 選択して削除';
        }
    }

    if (toolbar) {
        if (isRecordSelectionMode) {
            toolbar.classList.remove('hidden');
        } else {
            toolbar.classList.add('hidden');
        }
    }

    updateRecordSelectionToolbar();
    renderHistoryList();
}

/**
 * 1行の選択状態をトグル
 */
function toggleSelectRecordItem(id) {
    if (selectedRecordHistoryIds.has(id)) {
        selectedRecordHistoryIds.delete(id);
    } else {
        selectedRecordHistoryIds.add(id);
    }
    updateRecordSelectionToolbar();
    renderHistoryList();
}

/**
 * 全選択 / 全解除
 */
function toggleSelectAllRecordHistory() {
    const allIds = studyHistory.map(item => item.id);
    const allSelected = allIds.length > 0 && allIds.every(id => selectedRecordHistoryIds.has(id));

    if (allSelected) {
        selectedRecordHistoryIds.clear();
    } else {
        allIds.forEach(id => selectedRecordHistoryIds.add(id));
    }

    updateRecordSelectionToolbar();
    renderHistoryList();
}

/**
 * ツールバーの選択件数と削除ボタン状態を更新
 */
function updateRecordSelectionToolbar() {
    const countBadge = document.getElementById('record-selection-count');
    const batchDeleteBtn = document.getElementById('record-batch-delete-btn');
    const count = selectedRecordHistoryIds.size;

    if (countBadge) {
        countBadge.textContent = `${count}件選択中`;
    }

    if (batchDeleteBtn) {
        batchDeleteBtn.disabled = (count === 0);
        batchDeleteBtn.textContent = count > 0 ? `🗑️ 選択した${count}件を削除` : '🗑️ 選択した記録を削除';
    }
}

/**
 * 選択した記録を一括削除（パッと消す）
 */
function deleteSelectedRecordHistory() {
    const count = selectedRecordHistoryIds.size;
    if (count === 0) return;

    if (confirm(`選択した ${count} 件の学習記録をまとめて削除しますか？\n（削除した記録は元に戻せません）`)) {
        studyHistory = studyHistory.filter(item => !selectedRecordHistoryIds.has(item.id));
        selectedRecordHistoryIds.clear();
        try {
            localStorage.setItem('ai-study-history', JSON.stringify(studyHistory));
        } catch (e) {
            console.error('Failed to save updated history:', e);
        }
        updateRecordSelectionToolbar();
        renderHistoryList();
        showToastNotification(`🗑️ 選択した ${count} 件の学習記録を削除しました`);
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
            const isSelected = selectedRecordHistoryIds.has(item.id);

            card.className = `history-item-row ${isSelected ? 'selected-for-delete' : ''}`;
            card.style.cursor = 'pointer';
            
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
            
            if (isRecordSelectionMode) {
                card.setAttribute('onclick', `toggleSelectRecordItem('${item.id}')`);
                card.innerHTML = `
                    <div class="row-select-checkbox">${isSelected ? '✓' : ''}</div>
                    <div class="row-icon">${itemIcon}</div>
                    <div class="row-info">
                        <span class="row-date">📅 ${escapeHtml(itemDate)} [${escapeHtml(itemSubject)}]</span>
                        <h4 class="row-title">${escapeHtml(itemTitle)}</h4>
                        <p class="row-preview">${escapeHtml(lastMessage)}</p>
                    </div>
                `;
            } else {
                card.setAttribute('onclick', `goToDetail('${item.id}')`);
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
            }
            
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
        selectedRecordHistoryIds.delete(id);
        try {
            localStorage.setItem('ai-study-history', JSON.stringify(studyHistory));
        } catch (e) {
            console.error('Failed to save updated history:', e);
        }
        updateRecordSelectionToolbar();
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
