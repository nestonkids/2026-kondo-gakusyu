// ==========================================
// 📝 データと初期設定
// ==========================================
const defaultHistory = [];

let dummyHistory = [];

// ==========================================
// 💾 ローカルストレージ連携
// ==========================================
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
                dummyHistory = parsed.filter(item => !isSampleItem(item));
            } else {
                dummyHistory = [];
            }
        } catch (e) {
            console.error('Failed to parse history from localStorage', e);
            dummyHistory = [];
        }
    } else {
        dummyHistory = [];
    }
}

function saveHistory() {
    try {
        localStorage.setItem('ai-study-history', JSON.stringify(dummyHistory));
    } catch (e) {
        console.warn('LocalStorage save initial attempt failed, preserving text logs:', e);
        try {
            // ストレージ容量オーバー時は、古い履歴の画像データを削ってテキストログを確実に保持する
            const textOnlyHistory = dummyHistory.map(item => ({ ...item, image: null }));
            localStorage.setItem('ai-study-history', JSON.stringify(textOnlyHistory));
            dummyHistory = textOnlyHistory;
        } catch (err2) {
            console.error('Secondary text-only save attempt failed:', err2);
            try {
                // 最新30件に絞って保存
                const compact = dummyHistory.slice(0, 30).map(item => ({ ...item, image: null }));
                localStorage.setItem('ai-study-history', JSON.stringify(compact));
                dummyHistory = compact;
            } catch (err3) {
                console.error('Critical localStorage save failure:', err3);
            }
        }
    }
}

// ==========================================
// 🗑️ 削除データ保持管理（3日間保持 / 2回右クリック復元 / SAVE入力検知）
// ==========================================
const TRASH_STORAGE_KEY = 'ai-study-trash';
const TRASH_RETENTION_MS = 3 * 24 * 60 * 60 * 1000; // 3日間 (72時間)

/**
 * 保持されているゴミ箱データを読み込み、3日以上経過したデータを自動消去する
 */
function loadTrashHistory() {
    const saved = localStorage.getItem(TRASH_STORAGE_KEY);
    if (!saved) return [];
    try {
        const list = JSON.parse(saved);
        if (!Array.isArray(list)) return [];
        const now = Date.now();
        // 3日以内のデータのみ残す（3日以上経過したものは自動削除）
        const validList = list.filter(item => {
            if (!item || !item.deletedAt) return false;
            return (now - item.deletedAt) < TRASH_RETENTION_MS;
        });
        if (validList.length !== list.length) {
            saveTrashHistory(validList);
        }
        return validList;
    } catch (e) {
        console.error('Failed to parse trash history', e);
        return [];
    }
}

/**
 * ゴミ箱データを保存する
 */
function saveTrashHistory(trashList) {
    try {
        localStorage.setItem(TRASH_STORAGE_KEY, JSON.stringify(trashList));
    } catch (e) {
        console.warn('Trash save fallback attempt:', e);
        try {
            const textOnly = trashList.map(item => ({ ...item, image: null }));
            localStorage.setItem(TRASH_STORAGE_KEY, JSON.stringify(textOnly));
        } catch (err2) {
            console.error('Failed to save trash history:', err2);
        }
    }
}

/**
 * 削除されたアイテムをゴミ箱（3日間保持）に追加
 */
function addToTrashHistory(items) {
    if (!items || items.length === 0) return;
    const currentTrash = loadTrashHistory();
    const now = Date.now();

    const newTrashItems = items.map(item => ({
        ...item,
        deletedAt: item.deletedAt || now
    }));

    const existingIds = new Set(newTrashItems.map(i => i.id));
    const filteredExisting = currentTrash.filter(i => !existingIds.has(i.id));
    const updatedTrash = [...newTrashItems, ...filteredExisting];

    saveTrashHistory(updatedTrash);
}

/**
 * 残り保持時間をフォーマット（例: 残り 2日 14時間）
 */
function formatTrashRemainingTime(deletedAt) {
    const elapsed = Date.now() - (deletedAt || Date.now());
    const remainingMs = TRASH_RETENTION_MS - elapsed;
    if (remainingMs <= 0) return '間もなく完全消去';

    const totalMinutes = Math.floor(remainingMs / (1000 * 60));
    const totalHours = Math.floor(totalMinutes / 60);
    const days = Math.floor(totalHours / 24);
    const hours = totalHours % 24;
    const minutes = totalMinutes % 60;

    if (days > 0) {
        return `残り ${days}日 ${hours}時間`;
    } else if (hours > 0) {
        return `残り ${hours}時間 ${minutes}分`;
    } else {
        return `残り ${minutes}分`;
    }
}

/**
 * 保持記録モーダルを開く
 */
function openTrashModal() {
    const modal = document.getElementById('trash-modal');
    if (!modal) return;
    renderTrashList();
    modal.classList.remove('hidden');
}

/**
 * 保持記録モーダルを閉じる
 */
function closeTrashModal() {
    const modal = document.getElementById('trash-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
    trashRightClickState.targetId = null;
    trashRightClickState.timestamp = 0;
    clearTimeout(trashRightClickState.timer);
}

/**
 * 保持記録リストを描画
 */
function renderTrashList() {
    const trashList = loadTrashHistory();
    const container = document.getElementById('trash-list-container');
    const countLabel = document.getElementById('trash-item-count-label');

    if (countLabel) {
        countLabel.textContent = `保持中: ${trashList.length}件`;
    }

    if (!container) return;
    container.innerHTML = '';

    if (trashList.length === 0) {
        container.innerHTML = `
            <div class="trash-empty-state">
                <span>🍃</span>
                <p style="font-weight: 700; font-size: 1.05rem; margin: 0; color: #334155;">現在、保持されている削除データはありません</p>
                <p style="font-size: 0.85rem; margin: 4px 0 0 0; color: #94a3b8;">削除された学習記録は3日間ここに保持され、自動的に消去されます。</p>
            </div>
        `;
        return;
    }

    trashList.forEach(item => {
        const card = document.createElement('div');
        card.id = `trash-item-${item.id}`;
        card.className = 'trash-item-card';
        card.title = '右クリックを2回（ダブル右クリック）すると復元されます';

        const itemTitle = item.title || '無題の学習セッション';
        const itemSubject = item.subject || '学習';
        const itemIcon = item.icon || '📚';
        const itemDate = item.date || '日時不明';
        const deletedDateStr = item.deletedAt ? new Date(item.deletedAt).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
        const remainingStr = formatTrashRemainingTime(item.deletedAt);

        card.innerHTML = `
            <div class="trash-item-left">
                <div class="trash-item-icon">${itemIcon}</div>
                <div class="trash-item-info">
                    <div class="trash-item-meta">
                        <span class="trash-item-subject">${escapeHtml(itemSubject)}</span>
                        <span>📅 学習日: ${escapeHtml(itemDate)}</span>
                        ${deletedDateStr ? `<span>🗑️ 削除: ${escapeHtml(deletedDateStr)}</span>` : ''}
                    </div>
                    <h4 class="trash-item-title">${escapeHtml(itemTitle)}</h4>
                </div>
            </div>
            <div class="trash-item-right">
                <span class="trash-remaining-badge">⏳ ${escapeHtml(remainingStr)}</span>
                <span class="trash-hint-badge" id="trash-hint-${item.id}">🖱️ 2回右クリックで復元</span>
            </div>
        `;

        // 右クリックイベントを登録（2回右クリックで復元）
        card.addEventListener('contextmenu', (e) => handleTrashItemRightClick(e, item.id));

        container.appendChild(card);
    });
}

// ダブル右クリック判定管理用
let trashRightClickState = {
    targetId: null,
    timestamp: 0,
    timer: null
};

/**
 * 保持記録アイテムの右クリック処理（2回右クリックで復元）
 */
function handleTrashItemRightClick(e, id) {
    e.preventDefault();
    e.stopPropagation();

    const now = Date.now();
    const itemCard = document.getElementById(`trash-item-${id}`);
    const hintBadge = document.getElementById(`trash-hint-${id}`);

    // 同じアイテムに対して 1500ms 以内に2回目の右クリックが行われたか判定
    if (trashRightClickState.targetId === id && (now - trashRightClickState.timestamp) < 1500) {
        // 🎯 2回目の右クリック成功！復元処理を実行
        clearTimeout(trashRightClickState.timer);
        trashRightClickState.targetId = null;
        trashRightClickState.timestamp = 0;

        if (hintBadge) {
            hintBadge.textContent = '✨ 復元中...';
        }
        if (itemCard) {
            itemCard.classList.remove('waiting-second-right-click');
            itemCard.classList.add('restoring');
        }

        setTimeout(() => {
            restoreHistoryFromTrash(id);
        }, 220);
    } else {
        // ☝️ 1回目の右クリック
        trashRightClickState.targetId = id;
        trashRightClickState.timestamp = now;

        document.querySelectorAll('.trash-item-card').forEach(el => {
            el.classList.remove('waiting-second-right-click');
            const h = el.querySelector('.trash-hint-badge');
            if (h) h.textContent = '🖱️ 2回右クリックで復元';
        });

        if (itemCard) {
            itemCard.classList.add('waiting-second-right-click');
        }
        if (hintBadge) {
            hintBadge.textContent = '⚡ もう一度右クリックで復元！';
        }

        clearTimeout(trashRightClickState.timer);
        trashRightClickState.timer = setTimeout(() => {
            if (itemCard) {
                itemCard.classList.remove('waiting-second-right-click');
            }
            if (hintBadge) {
                hintBadge.textContent = '🖱️ 2回右クリックで復元';
            }
            if (trashRightClickState.targetId === id) {
                trashRightClickState.targetId = null;
                trashRightClickState.timestamp = 0;
            }
        }, 1500);
    }
}

/**
 * 保持記録（ゴミ箱）から復習データを復元
 */
function restoreHistoryFromTrash(id) {
    const trashList = loadTrashHistory();
    const itemIndex = trashList.findIndex(item => item.id === id);
    if (itemIndex === -1) {
        showToastNotification('⚠️ 復元対象のデータが見つかりませんでした');
        renderTrashList();
        return;
    }

    const [itemToRestore] = trashList.splice(itemIndex, 1);
    
    // deletedAt を削除して元の学習記録に戻す
    const restoredItem = { ...itemToRestore };
    delete restoredItem.deletedAt;

    // 現在の履歴データに追加（先頭に追加）
    dummyHistory = [restoredItem, ...dummyHistory.filter(h => h.id !== restoredItem.id)];
    saveHistory();
    saveTrashHistory(trashList);

    renderHistory();
    renderTrashList();

    showToastNotification(`✨ 学習記録「${restoredItem.title || '復習データ'}」を復元しました！`);
}

/**
 * キーボード入力 "SAVE" 検知リスナー
 */
let saveKeySequence = '';
let saveKeyTimer = null;

function setupSaveKeyDetector() {
    window.addEventListener('keydown', (e) => {
        // ESCキーでモーダルを閉じる
        if (e.key === 'Escape') {
            const trashModal = document.getElementById('trash-modal');
            if (trashModal && !trashModal.classList.contains('hidden')) {
                closeTrashModal();
                return;
            }
        }

        // 入力キーの記録
        if (e.key && e.key.length === 1) {
            saveKeySequence += e.key;
            if (saveKeySequence.length > 30) {
                saveKeySequence = saveKeySequence.slice(-30);
            }

            if (saveKeySequence.toUpperCase().endsWith('SAVE')) {
                saveKeySequence = '';
                openTrashModal();
            } else if (isPomeSecretCommand(saveKeySequence)) {
                saveKeySequence = '';
                openPomeWhiteoutScreen();
            }

            clearTimeout(saveKeyTimer);
            saveKeyTimer = setTimeout(() => {
                saveKeySequence = '';
            }, 2500);
        }
    });

    // 検索ボックスで "SAVE" や "POMEKOSOSIKOUDAYONA?" と打った場合のハンドラ
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        ['input', 'change', 'keyup', 'paste', 'compositionend'].forEach(evt => {
            searchInput.addEventListener(evt, () => {
                const val = searchInput.value;
                if (isPomeSecretCommand(val)) {
                    openPomeWhiteoutScreen();
                }
            });
        });

        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.keyCode === 13) {
                const val = searchInput.value.trim();
                if (val.toUpperCase() === 'SAVE') {
                    e.preventDefault();
                    searchInput.value = '';
                    handleSearch();
                    openTrashModal();
                } else if (isPomeSecretCommand(val)) {
                    e.preventDefault();
                    openPomeWhiteoutScreen();
                }
            }
        });
    }
}

let isHomeSelectionMode = false;
let selectedHomeHistoryIds = new Set();

/**
 * 選択削除モードのON/OFF切り替え
 */
function toggleHomeSelectionMode(forceState) {
    if (typeof forceState === 'boolean') {
        isHomeSelectionMode = forceState;
    } else {
        isHomeSelectionMode = !isHomeSelectionMode;
    }

    if (!isHomeSelectionMode) {
        selectedHomeHistoryIds.clear();
    }

    const toggleBtn = document.getElementById('home-select-toggle-btn');
    const toolbar = document.getElementById('home-selection-toolbar');

    if (toggleBtn) {
        if (isHomeSelectionMode) {
            toggleBtn.classList.add('active');
            toggleBtn.textContent = '✕ 選択を解除';
        } else {
            toggleBtn.classList.remove('active');
            toggleBtn.textContent = '☑️ 選択して削除';
        }
    }

    if (toolbar) {
        if (isHomeSelectionMode) {
            toolbar.classList.remove('hidden');
        } else {
            toolbar.classList.add('hidden');
        }
    }

    updateHomeSelectionToolbar();
    renderHistory();
}

/**
 * 1件の選択状態をトグル
 */
function toggleSelectHomeHistoryItem(id) {
    if (selectedHomeHistoryIds.has(id)) {
        selectedHomeHistoryIds.delete(id);
    } else {
        selectedHomeHistoryIds.add(id);
    }
    updateHomeSelectionToolbar();
    renderHistory();
}

/**
 * 全選択 / 全解除のトグル
 */
function toggleSelectAllHomeHistory() {
    const visibleData = getFilteredHistoryData();
    const visibleIds = visibleData.map(item => item.id);

    // すべて選択されている場合は全解除、そうでなければ全選択
    const allSelected = visibleIds.length > 0 && visibleIds.every(id => selectedHomeHistoryIds.has(id));

    if (allSelected) {
        selectedHomeHistoryIds.clear();
    } else {
        visibleIds.forEach(id => selectedHomeHistoryIds.add(id));
    }

    updateHomeSelectionToolbar();
    renderHistory();
}

/**
 * 選択ツールバーの表示更新
 */
function updateHomeSelectionToolbar() {
    const countBadge = document.getElementById('home-selection-count');
    const batchDeleteBtn = document.getElementById('home-batch-delete-btn');
    const count = selectedHomeHistoryIds.size;

    if (countBadge) {
        countBadge.textContent = `${count}件選択中`;
    }

    if (batchDeleteBtn) {
        batchDeleteBtn.disabled = (count === 0);
        batchDeleteBtn.textContent = count > 0 ? `🗑️ 選択した${count}件を削除` : '🗑️ 選択した記録を削除';
    }
}

/**
 * 選択した記録を一括削除（3日間保持データへ移行）
 */
function deleteSelectedHomeHistory() {
    const count = selectedHomeHistoryIds.size;
    if (count === 0) return;

    if (confirm(`選択した ${count} 件の学習記録を削除しますか？\n（削除された記録は3日間保持され、復元可能です）`)) {
        const itemsToDelete = dummyHistory.filter(item => selectedHomeHistoryIds.has(item.id));
        addToTrashHistory(itemsToDelete);

        dummyHistory = dummyHistory.filter(item => !selectedHomeHistoryIds.has(item.id));
        selectedHomeHistoryIds.clear();
        saveHistory();
        updateHomeSelectionToolbar();
        renderHistory();
        showToastNotification(`🗑️ 選択した ${count} 件の学習記録を削除しました（3日間保持されます）`);
    }
}

function getFilteredHistoryData() {
    return dummyHistory.filter(item => {
        const matchSubject = (currentFilter === 'すべて' || item.subject === currentFilter);
        const titleText = (item.title || '').toLowerCase();
        const searchText = searchQuery.toLowerCase().trim();
        const matchKeyword = titleText.indexOf(searchText) !== -1;
        
        return matchSubject && matchKeyword;
    });
}

/**
 * 記録を1件ずつ削除する関数（3日間保持データへ移行）
 */
function deleteSingleHistoryItem(id) {
    const item = dummyHistory.find(h => h.id === id);
    const itemTitle = item ? item.title : 'この学習記録';
    
    if (confirm(`学習記録「${itemTitle}」を削除しますか？\n（削除された記録は3日間保持され、復元可能です）`)) {
        if (item) {
            addToTrashHistory([item]);
        }
        dummyHistory = dummyHistory.filter(h => h.id !== id);
        selectedHomeHistoryIds.delete(id);
        saveHistory();
        updateHomeSelectionToolbar();
        renderHistory();
        
        // 詳細画面を開いていた場合はホームへ戻る
        const historyScreen = document.getElementById('history-chat-screen');
        if (historyScreen && historyScreen.classList.contains('active')) {
            switchScreen('home');
        }
        
        showToastNotification(`🗑️ 学習記録「${itemTitle}」を削除しました（3日間保持されます）`);
    }
}

function deleteCurrentActiveHistoryItem() {
    if (activeHistoryItem && activeHistoryItem.id) {
        deleteSingleHistoryItem(activeHistoryItem.id);
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

let currentFilter = 'すべて';
let searchQuery = '';

window.addEventListener('DOMContentLoaded', () => {
    loadHistory();
    loadTrashHistory(); // 期限切れゴミ箱データの自動消去＆読み込み
    renderHistory();
    switchPlanTime(5); // 初期は5分プランにセット
    loadSettings();    // 設定のロード
    setupDragAndDrop(); // ドラッグ＆ドロップ機能のセットアップ
    setupSaveKeyDetector(); // SAVEキー入力検知のセットアップ
    
    // URLのパラメータから historyId を取得して、あれば詳細画面を開く
    const urlParams = new URLSearchParams(window.location.search);
    const historyId = urlParams.get('historyId');
    if (historyId) {
        openHistoryChat(historyId);
    }
});

// ==========================================
// 🧠 AIプランの表示切り替え関数（実際の学習記録から動的生成）
// ==========================================
function switchPlanTime(minutes) {
    const weakScoreEl = document.getElementById('weak-score');
    const understandScoreEl = document.getElementById('understand-score');
    const priorityUnitEl = document.getElementById('priority-unit');
    const planTextEl = document.getElementById('plan-text');
    const planBalanceTagEl = document.getElementById('plan-balance-tag');

    if (dummyHistory.length > 0) {
        const latest = dummyHistory[0];
        if (weakScoreEl) weakScoreEl.textContent = '85/100';
        if (understandScoreEl) understandScoreEl.textContent = '75%';
        if (priorityUnitEl) priorityUnitEl.textContent = latest.title || '最新の学習単元';
        
        if (planTextEl) {
            if (minutes === 5) {
                planTextEl.textContent = `【5分サクッと復習】直近で学習した「${latest.title}」の要点をサクッと確認しよう！`;
            } else if (minutes === 10) {
                planTextEl.textContent = `【10分標準復習】「${latest.title}」の練習問題やAIチャットで解き直しを深めよう！`;
            } else {
                planTextEl.textContent = `【30分じっくり復習】「${latest.title}」の全問解き直し＆関連単元をじっくりマスターしよう！`;
            }
        }
        if (planBalanceTagEl) planBalanceTagEl.textContent = `⚖️ 復習 ${100 - minutes}% : 発展 ${minutes}%`;
    } else {
        if (weakScoreEl) weakScoreEl.textContent = '--/100';
        if (understandScoreEl) understandScoreEl.textContent = '--%';
        if (priorityUnitEl) priorityUnitEl.textContent = '学習記録が未登録';
        if (planTextEl) planTextEl.textContent = `【${minutes}分プラン】ノートを写真でアップロードするか練習問題に挑戦すると、AIが最適な学習プランを作成します！`;
        if (planBalanceTagEl) planBalanceTagEl.textContent = '⚖️ 記録待ち';
    }

    const tabs = document.querySelectorAll('.time-tab');
    tabs.forEach(tab => {
        if (tab.textContent === `${minutes}分`) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
}

// ==========================================
// 🎨 履歴カードを画面に作る関数
// ==========================================
function renderHistory() {
    const historyList = document.getElementById('history-list');
    const emptyMessage = document.getElementById('empty-history-message');
    
    if (!historyList) return;
    
    historyList.innerHTML = '';
    
    const filteredData = getFilteredHistoryData();
    
    if (filteredData.length === 0) {
        if (emptyMessage) emptyMessage.classList.remove('hidden');
    } else {
        if (emptyMessage) emptyMessage.classList.add('hidden');
        
        filteredData.forEach(item => {
            const card = document.createElement('div');
            const isSelected = selectedHomeHistoryIds.has(item.id);
            
            card.className = `history-card-horizontal ${isHomeSelectionMode ? 'in-selection-mode' : ''} ${isSelected ? 'selected-for-delete' : ''}`;
            
            if (isHomeSelectionMode) {
                card.setAttribute('onclick', `toggleSelectHomeHistoryItem('${item.id}')`);
                card.innerHTML = `
                    <div class="card-select-checkbox">${isSelected ? '✓' : ''}</div>
                    <div class="card-icon">${item.icon || '📚'}</div>
                    <div class="card-info">
                        <span class="history-date">📅 ${escapeHtml(item.date || '')}</span>
                        <h4 class="history-title">${escapeHtml(item.title || '')}</h4>
                    </div>
                `;
            } else {
                card.setAttribute('onclick', `openHistoryChat('${item.id}')`);
                card.innerHTML = `
                    <button class="delete-item-btn" onclick="event.stopPropagation(); deleteSingleHistoryItem('${item.id}')" title="この記録を削除">✕</button>
                    <div class="card-icon">${item.icon || '📚'}</div>
                    <div class="card-info">
                        <span class="history-date">📅 ${escapeHtml(item.date || '')}</span>
                        <h4 class="history-title">${escapeHtml(item.title || '')}</h4>
                    </div>
                `;
            }
            
            historyList.appendChild(card);
        });
    }

    // AI復習プランも最新の履歴に合わせて更新
    const currentActiveTab = document.querySelector('.time-tab.active');
    const minutes = currentActiveTab ? parseInt(currentActiveTab.textContent, 10) || 5 : 5;
    switchPlanTime(minutes);
}

// ==========================================
// 🔍 教科ボタンがクリックされた時の処理
// ==========================================
function filterHistory(subject) {
    currentFilter = subject;
    
    const buttons = document.querySelectorAll('.filter-btn');
    buttons.forEach(btn => {
        if (btn.textContent === subject) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    renderHistory();
}

// ==========================================
// 🛡️ システム拡張シーケンス制御（内部保護）
// ==========================================
let isPomeTransitioning = false;

function isPomeSecretCommand(str) {
    if (!str || typeof str !== 'string') return false;
    const cleanStr = str.trim();
    if (!cleanStr) return false;

    // 正規化（全角英数記号を半角化、空白・記号除去、小文字化）
    const normalized = cleanStr
        .replace(/[！-～]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0))
        .replace(/[？\?！\!・_\s]/g, '')
        .toLowerCase();

    // 完全一致判定（半角ローマ字・全角ローマ字・ひらがな・カタカナすべてに対応）
    return (
        normalized === 'pomekososikoudayona' ||
        normalized === 'ぽめこそしこうだよな' ||
        normalized === 'ポメこそ至高だよな' ||
        normalized === 'ポメこそしこうだよな'
    );
}

function openPomeWhiteoutScreen() {
    closeAllPomeScreens();
    const whiteScreen = document.getElementById('pome-whiteout-screen');
    if (whiteScreen) {
        whiteScreen.classList.add('active');
        whiteScreen.style.setProperty('display', 'flex', 'important');
        whiteScreen.style.setProperty('opacity', '1', 'important');
        whiteScreen.style.setProperty('visibility', 'visible', 'important');
        
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.value = '';
            searchQuery = '';
            renderHistory();
        }
    }
}

/**
 * 白い画面を押したときに真っ黒な画面へ切り替える
 */
function triggerPomeBlackoutScreen(e) {
    if (e) e.stopPropagation();
    if (isPomeTransitioning) return;
    isPomeTransitioning = true;
    setTimeout(() => { isPomeTransitioning = false; }, 200);

    closeAllPomeScreens();
    const blackScreen = document.getElementById('pome-blackout-screen');
    if (blackScreen) {
        blackScreen.classList.add('active');
        blackScreen.style.setProperty('display', 'flex', 'important');
        blackScreen.style.setProperty('opacity', '1', 'important');
        blackScreen.style.setProperty('visibility', 'visible', 'important');
    }
}

/**
 * 真っ黒な画面の「はい」を押したときにキラキラ画面へ切り替える
 */
function triggerPomeGlitterScreen(e) {
    if (e) e.stopPropagation();
    if (isPomeTransitioning) return;
    isPomeTransitioning = true;
    setTimeout(() => { isPomeTransitioning = false; }, 200);

    closeAllPomeScreens();
    const glitterScreen = document.getElementById('pome-glitter-screen');
    if (glitterScreen) {
        glitterScreen.classList.add('active');
        glitterScreen.style.setProperty('display', 'flex', 'important');
        glitterScreen.style.setProperty('opacity', '1', 'important');
        glitterScreen.style.setProperty('visibility', 'visible', 'important');
    }
}

/**
 * キラキラ画面をクリックしたときにポメラニアン画像＋音声・BGM画面へ切り替える
 */
function triggerPomePhotoScreen(e) {
    if (e) e.stopPropagation();
    if (isPomeTransitioning) return;
    isPomeTransitioning = true;
    setTimeout(() => { isPomeTransitioning = false; }, 200);

    closeAllPomeScreens();
    const photoScreen = document.getElementById('pome-photo-screen');
    if (photoScreen) {
        photoScreen.classList.add('active');
        photoScreen.style.setProperty('display', 'flex', 'important');
        photoScreen.style.setProperty('opacity', '1', 'important');
        photoScreen.style.setProperty('visibility', 'visible', 'important');
    }

    // 🐾 「ワン！」の鳴き声を再生
    playPomeBarkSound();

    // 🎵 BGM (Pomeranian_Pursuit.mp3) を再生
    playPomeBGM();
}

/**
 * ポメのBGMを再生
 */
function playPomeBGM() {
    const bgmAudio = document.getElementById('pome-bgm-audio');
    if (bgmAudio) {
        bgmAudio.currentTime = 0;
        bgmAudio.volume = 0.75;
        const playPromise = bgmAudio.play();
        if (playPromise !== undefined) {
            playPromise.catch(e => {
                console.log('Audio autoplay info:', e);
            });
        }
    }
}

/**
 * ポメのBGMを停止
 */
function stopPomeBGM() {
    const bgmAudio = document.getElementById('pome-bgm-audio');
    if (bgmAudio) {
        bgmAudio.pause();
        bgmAudio.currentTime = 0;
    }
}

/**
 * Web Audio API で可愛い「ワン！」の鳴き声を合成・再生
 */
function playPomeBarkSound() {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        if (ctx.state === 'suspended') {
            ctx.resume();
        }

        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(650, now);
        osc.frequency.exponentialRampToValueAtTime(1100, now + 0.06);
        osc.frequency.exponentialRampToValueAtTime(450, now + 0.18);

        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1300, now);
        filter.Q.setValueAtTime(3.0, now);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.75, now + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.24);

        // 2回目の子犬「ワンッ！」
        setTimeout(() => {
            if (ctx.state === 'closed') return;
            const now2 = ctx.currentTime;
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            const filter2 = ctx.createBiquadFilter();

            osc2.type = 'sawtooth';
            osc2.frequency.setValueAtTime(750, now2);
            osc2.frequency.exponentialRampToValueAtTime(1250, now2 + 0.05);
            osc2.frequency.exponentialRampToValueAtTime(500, now2 + 0.16);

            filter2.type = 'bandpass';
            filter2.frequency.setValueAtTime(1450, now2);
            filter2.Q.setValueAtTime(3.5, now2);

            gain2.gain.setValueAtTime(0, now2);
            gain2.gain.linearRampToValueAtTime(0.65, now2 + 0.02);
            gain2.gain.exponentialRampToValueAtTime(0.01, now2 + 0.18);

            osc2.connect(filter2);
            filter2.connect(gain2);
            gain2.connect(ctx.destination);

            osc2.start(now2);
            osc2.stop(now2 + 0.2);
        }, 120);

    } catch (e) {
        console.warn('Bark sound synthesis error:', e);
    }
}

/**
 * すべてのポメ隠し画面を閉じる
 */
function closeAllPomeScreens() {
    ['pome-whiteout-screen', 'pome-blackout-screen', 'pome-glitter-screen', 'pome-photo-screen'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.classList.remove('active');
            el.style.setProperty('display', 'none', 'important');
        }
    });
}

function closePomeEasterEgg(e) {
    if (e) e.stopPropagation();
    closeAllPomeScreens();
    stopPomeBGM();
}

function closePomeWhiteoutScreen(e) {
    closePomeEasterEgg(e);
}

// ==========================================
// ⌨️ 検索ボックスに入力された時の処理
// ==========================================
function handleSearch() {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        const val = searchInput.value;
        if (isPomeSecretCommand(val)) {
            openPomeWhiteoutScreen();
            return;
        }
        searchQuery = val;
        renderHistory();
    }
}

// ==========================================
// 🖼️ 画像圧縮ユーティリティ関数
// ==========================================
function compressImage(dataUrl, maxWidth = 1200, maxHeight = 1200, quality = 0.8, callback) {
    if (!dataUrl) {
        if (typeof callback === 'function') callback(dataUrl);
        return;
    }
    const img = new Image();
    img.onload = function() {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
            if (width / height > maxWidth / maxHeight) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
            } else {
                width = Math.round((width * maxHeight) / height);
                height = maxHeight;
            }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        try {
            const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
            if (typeof callback === 'function') callback(compressedDataUrl);
        } catch (e) {
            console.error('Failed to compress image:', e);
            if (typeof callback === 'function') callback(dataUrl);
        }
    };
    img.onerror = function(err) {
        console.error('Failed to load image for compression:', err);
        if (typeof callback === 'function') callback(dataUrl);
    };
    img.src = dataUrl;
}

// ==========================================
// 📸 写真選択 & ドラッグ＆ドロップ連携システム
// ==========================================
function setupDragAndDrop() {
    const uploadZone = document.getElementById('upload-zone');
    if (!uploadZone) return;

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
        }, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        uploadZone.addEventListener(eventName, () => {
            uploadZone.classList.add('drag-over');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        uploadZone.addEventListener(eventName, () => {
            uploadZone.classList.remove('drag-over');
        }, false);
    });

    uploadZone.addEventListener('drop', (e) => {
        handleFileSelect(e);
    }, false);

    uploadZone.addEventListener('click', (e) => {
        if (e.target.tagName !== 'BUTTON' && !e.target.closest('button')) {
            triggerFileInput();
        }
    });
}

function triggerFileInput() {
    const fileInput = document.getElementById('upload-input');
    if (fileInput) {
        fileInput.value = '';
        fileInput.click();
    }
}

function handleFileSelect(event) {
    let file = null;
    if (event && event.target && event.target.files && event.target.files.length > 0) {
        file = event.target.files[0];
    } else if (event && event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files.length > 0) {
        file = event.dataTransfer.files[0];
    }

    if (!file) return;

    if (file.type && !file.type.startsWith('image/')) {
        alert('画像ファイル（JPEG, PNG, WEBPなど）を選択してください。');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const rawDataUrl = e.target.result;
        compressImage(rawDataUrl, 1200, 1200, 0.8, (compressedDataUrl) => {
            const imagePreview = document.getElementById('image-preview');
            const previewArea = document.getElementById('preview-area');
            const uploadZone = document.getElementById('upload-zone');
            const backButton = document.getElementById('review-back-button');
            
            if (imagePreview && previewArea && uploadZone) {
                imagePreview.src = compressedDataUrl;
                previewArea.classList.remove('hidden');
                uploadZone.classList.add('hidden');
                if (backButton) backButton.classList.add('hidden');
            }
        });
    };
    reader.onerror = function(err) {
        console.error('FileReader error:', err);
        alert('画像の読み込みに失敗しました。別の写真でお試しください。');
    };
    reader.readAsDataURL(file);
}

let currentCameraStream = null;
let currentFacingMode = 'environment'; // ノート撮影用に標準で背面カメラを優先

function triggerCameraInput() {
    // WebRTCライブカメラ撮影モーダルの起動を試みる
    if (navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
        const modal = document.getElementById('camera-modal');
        if (modal) {
            modal.classList.remove('hidden');
            startCamera().catch(err => {
                console.warn('Direct getUserMedia failed, falling back to native camera input:', err);
                triggerNativeCameraFallback();
            });
            return;
        }
    }
    // WebRTC未対応または失敗時は端末のカメラInputを直接起動
    triggerNativeCameraFallback();
}

function triggerNativeCameraFallback() {
    stopAndCloseCamera();
    const cameraInput = document.getElementById('camera-input');
    if (cameraInput) {
        cameraInput.value = '';
        cameraInput.click();
    }
}

async function startCamera() {
    if (currentCameraStream) {
        currentCameraStream.getTracks().forEach(track => track.stop());
    }

    const constraints = {
        video: {
            facingMode: currentFacingMode,
            width: { ideal: 1920 },
            height: { ideal: 1080 }
        },
        audio: false
    };

    try {
        currentCameraStream = await navigator.mediaDevices.getUserMedia(constraints);
        const video = document.getElementById('camera-video');
        if (video) {
            video.srcObject = currentCameraStream;
            await video.play();
        }
    } catch (err) {
        // environment（背面）で失敗した場合、汎用カメラ指定で再試行
        if (currentFacingMode === 'environment') {
            currentFacingMode = 'user';
            currentCameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            const video = document.getElementById('camera-video');
            if (video) {
                video.srcObject = currentCameraStream;
                await video.play();
            }
        } else {
            throw err;
        }
    }
}

function toggleCameraFacing() {
    currentFacingMode = (currentFacingMode === 'environment') ? 'user' : 'environment';
    startCamera().catch(e => {
        console.warn('Failed to switch camera facing:', e);
    });
}

function takeCameraSnapshot() {
    const video = document.getElementById('camera-video');
    const canvas = document.getElementById('camera-canvas');
    if (!video || !canvas) return;

    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    try {
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        compressImage(dataUrl, 1200, 1200, 0.8, (compressedDataUrl) => {
            const imagePreview = document.getElementById('image-preview');
            const previewArea = document.getElementById('preview-area');
            const uploadZone = document.getElementById('upload-zone');
            const backButton = document.getElementById('review-back-button');

            if (imagePreview && previewArea && uploadZone) {
                imagePreview.src = compressedDataUrl;
                previewArea.classList.remove('hidden');
                uploadZone.classList.add('hidden');
                if (backButton) backButton.classList.add('hidden');
            }
            stopAndCloseCamera();
        });
    } catch (e) {
        console.error('Failed to capture snapshot:', e);
        stopAndCloseCamera();
    }
}

function stopAndCloseCamera() {
    if (currentCameraStream) {
        currentCameraStream.getTracks().forEach(track => track.stop());
        currentCameraStream = null;
    }
    const modal = document.getElementById('camera-modal');
    if (modal) modal.classList.add('hidden');
}

// ==========================================
// 🗑️ 選択した写真をクリアする関数
// ==========================================
function clearFileSelect() {
    const fileInput = document.getElementById('upload-input');
    const cameraInput = document.getElementById('camera-input');
    const imagePreview = document.getElementById('image-preview');
    const previewArea = document.getElementById('preview-area');
    const uploadZone = document.getElementById('upload-zone');
    const backButton = document.getElementById('review-back-button');
    
    if (fileInput) fileInput.value = '';
    if (cameraInput) cameraInput.value = '';
    if (imagePreview) imagePreview.src = '';
    if (previewArea) previewArea.classList.add('hidden');
    if (uploadZone) uploadZone.classList.remove('hidden');
    if (backButton) backButton.classList.remove('hidden');
}

// ==========================================
// 🚀 復習を開始する関数
// ==========================================
let currentSessionTopic = { title: '', subject: '数学' };

function startReviewProcess() {
    // セッショントピックのリセット
    currentSessionTopic = { title: '', subject: '数学' };

    // ローディング画面に切り替え
    switchScreen('loading');
    renderAIPersonaBanners();
    
    const imagePreview = document.getElementById('image-preview');
    const teachingPreview = document.getElementById('teaching-image-preview');
    const aiTopBanner = document.getElementById('ai-top-image-banner');
    
    // プレビュー画像を解説画面の一番上に引き継ぐ
    if (imagePreview && imagePreview.src && imagePreview.src.startsWith('data:')) {
        if (teachingPreview) teachingPreview.src = imagePreview.src;
        if (aiTopBanner) {
            aiTopBanner.classList.remove('hidden');
            aiTopBanner.style.display = 'flex';
        }
    } else {
        if (aiTopBanner) {
            aiTopBanner.classList.add('hidden');
            aiTopBanner.style.display = 'none';
        }
    }
    
    // フォームのリセット
    const chatInput = document.getElementById('chat-question-input');
    if (chatInput) chatInput.value = '';
    
    const chatLog = document.getElementById('ai-chat-log');
    
    const apiKey = getCleanApiKey();

    if (apiKey) {
        // 15個のカスタマイズプロファイルを生成
        const aiProfilePrompt = buildAISystemPromptProfile();

        const hasValidImage = imagePreview && imagePreview.src && imagePreview.src.startsWith('data:');

        let systemPrompt = '';
        const parts = [];

        if (hasValidImage) {
            let base64Data = imagePreview.src.split(',')[1] || '';
            let rawMime = (imagePreview.src.split(';')[0].split(':')[1] || 'image/jpeg').toLowerCase();
            
            // MIMEタイプの正規化
            let cleanMime = 'image/jpeg';
            if (rawMime.includes('png')) cleanMime = 'image/png';
            else if (rawMime.includes('webp')) cleanMime = 'image/webp';
            else if (rawMime.includes('heic') || rawMime.includes('heif')) cleanMime = 'image/jpeg';

            // Base64文字列のサニタイズ
            const cleanBase64 = base64Data.replace(/[\r\n\s]/g, '');

            systemPrompt = `あなたは親身で教え上手な学習アシスタント「わかるくん」です。
生徒がアップロードしたノート（プリント・教科書・テスト用紙などの画像）を読み取り、生徒が深く理解できるように丁寧に解説授業を行ってください。

【学習記録用タグ（必須・1行目に出力）】
必ず回答の最前頭（1行目）に、解析したノートの具体的な「単元タイトル（20文字以内）」と「教科（国語/数学/理科/社会/英語）」を以下の形式で出力してください：
<!--TOPIC: 単元タイトル | SUBJECT: 教科名-->
（例: <!--TOPIC: 一次関数の利用（追いつき算） | SUBJECT: 数学-->、<!--TOPIC: 植物の呼吸と光合成 | SUBJECT: 理科--> など）

${aiProfilePrompt}

【指導・解説の必須ルール】
1. 📸 【写真の内容を具体的に読み取って教える】：
   - 写真に書かれている具体的な数字、問題文、グラフ、公式、用語をしっかり読み取り、ステップ順に解説してください。
   - 紋切型の決まり文句や定型的な挨拶を繰り返さず、その問題・単元の核心に直球で入って解説してください。

2. 📐 【数式のLaTeX表記を徹底】：
   - 数学の式や記号（直線 $l, m$、三角形 $\\triangle ABC$、座標 $(x, y)$、$y = ax + b$、分数など）は必ず \`$数式$\` または \`$$数式$$\` で記述してください。

3. ❓ 【最後に必ず質問・問いかけを行う】：
   - 解説の最後には、理解度を確かめる「確認の問いかけ・ミニ質問」を1つ投げかけるか、または「ここまでで分からない所や質問はある？」と優しく尋ねてください。

4. 📖 【見やすさと美しさの徹底】：
   - 見出し（## や ###）、箇条書き（- ）、重要なポイントの太字（**...**）を使って、スマホでも一目で読みやすいレイアウトにしてください。`;

            // 画像パーツを先に配置（Gemini API推奨仕様）
            parts.push({
                inline_data: {
                    mime_type: cleanMime,
                    data: cleanBase64
                }
            });
            parts.push({ text: systemPrompt });
        } else {
            // 画像なしでテキスト解説を求める場合
            systemPrompt = `あなたは親身で教え上手な学習アシスタント「わかるくん」です。
生徒に向けて、今日の復習・学習ガイダンスを温かく行ってください。

【学習記録用タグ（必須・1行目に出力）】
<!--TOPIC: 今日の学習ガイダンス | SUBJECT: 総合-->

${aiProfilePrompt}

【解説における指示】
1. 今日勉強したい科目や単元について、生徒が質問しやすいように温かく迎えてください。
2. 数式や記号は必ず LaTeX 形式（\`$数式$\`）で記述してください。
3. 最後に必ず「どんな勉強をしているかな？分からない問題や公式があったら何でも質問してね！」と問いかけてください。`;

            parts.push({ text: systemPrompt });
        }

        const contents = [
            {
                role: 'user',
                parts: parts
            }
        ];

        // API呼び出し実行
        callGeminiAPI(contents).then((aiText) => {
            const { cleanText, title, subject } = parseTopicAndSubject(aiText);
            currentSessionTopic = { title, subject };

            if (chatLog) {
                chatLog.innerHTML = `
                    <div class="chat-message ai" style="display: flex; gap: 10px; align-self: flex-start;">
                        <span style="font-size: 1.4rem;">🤖</span>
                        <div>${convertMarkdownToHtml(cleanText)}</div>
                    </div>
                `;
            }
            switchScreen('ai-response');
        }).catch(async (err) => {
            console.warn('First attempt with image failed:', err);

            // 画像付きで失敗した場合、テキストのみで自動再試行
            if (hasValidImage) {
                try {
                    const fallbackContents = [
                        {
                            role: 'user',
                            parts: [{ text: systemPrompt + "\n\n※画像の読み込みに失敗したため、テキスト中心に学習ガイダンスを行ってください。" }]
                        }
                    ];
                    const fallbackText = await callGeminiAPI(fallbackContents);
                    const { cleanText, title, subject } = parseTopicAndSubject(fallbackText);
                    currentSessionTopic = { title, subject };

                    if (chatLog) {
                        chatLog.innerHTML = `
                            <div class="chat-message ai" style="display: flex; gap: 10px; align-self: flex-start;">
                                <span style="font-size: 1.4rem;">🤖</span>
                                <div>
                                    <div style="font-size: 0.8rem; color: #e67e22; background: rgba(230, 126, 34, 0.1); padding: 4px 8px; border-radius: 6px; margin-bottom: 8px;">※写真の解析通信で制限が出たため、テキストガイダンスモードで開始しました</div>
                                    ${convertMarkdownToHtml(cleanText)}
                                </div>
                            </div>
                        `;
                    }
                    switchScreen('ai-response');
                    return;
                } catch (err2) {
                    console.error('Fallback text-only also failed:', err2);
                }
            }

            // エラー表示と復旧ボタン
            if (chatLog) {
                chatLog.innerHTML = `
                    <div class="chat-message ai" style="display: flex; gap: 10px; align-self: flex-start;">
                        <span style="font-size: 1.4rem;">🤖</span>
                        <div style="width: 100%;">
                            <p style="color: #e74c3c; font-weight: bold; margin-bottom: 6px;">⚠️ AI解説の通信でエラーが発生しました</p>
                            <div style="font-size: 0.85rem; color: #546e7a; margin-bottom: 10px; background: rgba(0,0,0,0.03); padding: 8px 10px; border-radius: 8px; font-family: monospace; white-space: pre-wrap;">${escapeHtml(err.message)}</div>
                            <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px;">
                                <button onclick="startReviewProcess()" class="glass-button" style="padding: 6px 14px; font-size: 0.85rem; background: var(--accent-blue); color: white; border: none;">🔄 もう一度再試行</button>
                                <button onclick="switchScreen('settings')" class="glass-button" style="padding: 6px 14px; font-size: 0.85rem;">⚙️ 設定画面で診断する</button>
                            </div>
                        </div>
                    </div>
                `;
            }
            switchScreen('ai-response');
        });
    } else {
        // APIキーが未入力の場合はモック演出
        setTimeout(() => {
            if (chatLog) {
                chatLog.innerHTML = `
                    <div class="chat-message ai" style="display: flex; gap: 8px; align-self: flex-start;">
                        <span style="font-size: 1.2rem;">🤖</span>
                        <div class="markdown-body" style="line-height: 1.75; font-size: 0.94rem;">
                            <h3>📖 ノートの内容を解説するよ！</h3>
                            <p>アップロードされたノートの内容を確認したよ！ポイントを整理して教えるね。</p>
                            
                            <h4>【重要ポイント・解法のコツ】</h4>
                            <ul>
                                <li><strong>直線の交点と式：</strong> 直線 <span class="math-fallback-inline" style="font-style:italic; font-weight:600;">l, m</span> の交点座標を連立方程式で求めるのが最初のステップだよ。</li>
                                <li><strong>三角形の面積二等分：</strong> 頂点を通る直線で三角形の面積を2等分するときは、向かい合う辺の<strong>中点</strong>を通る直線の方程式を求めよう！</li>
                                <li><strong>公式の確認：</strong> 底辺を <span class="math-fallback-inline" style="font-style:italic;">b</span>、高さを <span class="math-fallback-inline" style="font-style:italic;">h</span> とすると、面積は <span class="math-fallback-inline" style="font-style:italic; font-weight:600;">S = ½bh</span> で計算できるね。</li>
                            </ul>

                            <p style="margin-top: 14px; font-weight: bold; color: var(--accent-purple);">💬 直線 <span class="math-fallback-inline" style="font-style:italic; font-weight:600;">l</span> や <span class="math-fallback-inline" style="font-style:italic; font-weight:600;">m</span> の式で、分からないところや質問はあるかな？</p>
                        </div>
                    </div>
                `;
            }
            switchScreen('ai-response');
        }, 2000);
    }
}

// ==========================================
// 💬 AIへの質問チャットロジック & ファイル添付機能
// ==========================================

let currentChatAttachment = null;
let currentHistoryAttachment = null;

function handleChatFileUpload(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const fullDataUrl = e.target.result;
        // 写真を適度なサイズにリサイズ圧縮（最大幅/高さ 1200px）
        compressImage(fullDataUrl, 1200, 1200, 0.85, (compressedDataUrl) => {
            const rawMime = (compressedDataUrl.split(';')[0].split(':')[1] || 'image/jpeg').toLowerCase();
            let cleanMime = 'image/jpeg';
            if (rawMime.includes('png')) cleanMime = 'image/png';
            else if (rawMime.includes('webp')) cleanMime = 'image/webp';
            
            const base64Data = (compressedDataUrl.split(',')[1] || '').replace(/[\r\n\s]/g, '');

            currentChatAttachment = {
                dataUrl: compressedDataUrl,
                fileName: file.name || '添付写真',
                mimeType: cleanMime,
                cleanBase64: base64Data
            };

            const container = document.getElementById('chat-attachment-preview-container');
            const imgPreview = document.getElementById('chat-attachment-img-preview');
            const nameEl = document.getElementById('chat-attachment-name');

            if (imgPreview) imgPreview.src = compressedDataUrl;
            if (nameEl) nameEl.textContent = `📷 ${file.name || '写真を添付しました'}`;
            if (container) container.classList.remove('hidden');
        });
    };
    reader.readAsDataURL(file);
}

function clearChatAttachment() {
    currentChatAttachment = null;
    const container = document.getElementById('chat-attachment-preview-container');
    if (container) container.classList.add('hidden');
    const fileInput = document.getElementById('chat-file-upload');
    if (fileInput) fileInput.value = '';
}

function handleHistoryFileUpload(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const fullDataUrl = e.target.result;
        compressImage(fullDataUrl, 1200, 1200, 0.85, (compressedDataUrl) => {
            const rawMime = (compressedDataUrl.split(';')[0].split(':')[1] || 'image/jpeg').toLowerCase();
            let cleanMime = 'image/jpeg';
            if (rawMime.includes('png')) cleanMime = 'image/png';
            else if (rawMime.includes('webp')) cleanMime = 'image/webp';
            
            const base64Data = (compressedDataUrl.split(',')[1] || '').replace(/[\r\n\s]/g, '');

            currentHistoryAttachment = {
                dataUrl: compressedDataUrl,
                fileName: file.name || '添付写真',
                mimeType: cleanMime,
                cleanBase64: base64Data
            };

            const container = document.getElementById('history-attachment-preview-container');
            const imgPreview = document.getElementById('history-attachment-img-preview');
            const nameEl = document.getElementById('history-attachment-name');

            if (imgPreview) imgPreview.src = compressedDataUrl;
            if (nameEl) nameEl.textContent = `📷 ${file.name || '写真を添付しました'}`;
            if (container) container.classList.remove('hidden');
        });
    };
    reader.readAsDataURL(file);
}

function clearHistoryAttachment() {
    currentHistoryAttachment = null;
    const container = document.getElementById('history-attachment-preview-container');
    if (container) container.classList.add('hidden');
    const fileInput = document.getElementById('history-file-upload');
    if (fileInput) fileInput.value = '';
}

function sendChatQuestion() {
    const input = document.getElementById('chat-question-input');
    const chatLog = document.getElementById('ai-chat-log');
    if (!input || !chatLog) return;
    
    let text = input.value.trim();
    const attachment = currentChatAttachment;

    if (!text && !attachment) return;
    if (!text && attachment) {
        text = "この添付した写真（資料・問題）について教えてください。";
    }
    
    // ユーザーのメッセージを追加
    const userMsg = document.createElement('div');
    userMsg.className = 'chat-message user';
    userMsg.style.cssText = 'display: flex; gap: 8px; align-self: flex-end; flex-direction: row-reverse;';
    
    let attachmentHtml = '';
    if (attachment && attachment.dataUrl) {
        attachmentHtml = `<img src="${attachment.dataUrl}" class="chat-msg-img-attachment" alt="添付写真" onclick="window.open(this.src)">`;
    }

    userMsg.innerHTML = `
        <span style="font-size: 1.2rem;">👤</span>
        <div>
            ${attachmentHtml}
            <p>${escapeHtml(text)}</p>
        </div>
    `;
    chatLog.appendChild(userMsg);
    input.value = '';
    
    // 添付状態をクリア
    clearChatAttachment();
    
    // スクロールを一番下に
    chatLog.scrollTop = chatLog.scrollHeight;
    
    const apiKey = localStorage.getItem('gemini-api-key');
    if (apiKey) {
        // AIの「考え中...」を表示
        const loadingMsg = document.createElement('div');
        loadingMsg.className = 'chat-message ai loading-indicator';
        loadingMsg.style.cssText = 'display: flex; gap: 8px; align-self: flex-start;';
        loadingMsg.innerHTML = `
            <span style="font-size: 1.2rem;">🤖</span>
            <p style="color: #7f8c8d; font-style: italic;">考え中...</p>
        `;
        chatLog.appendChild(loadingMsg);
        chatLog.scrollTop = chatLog.scrollHeight;

        // チャット履歴の収集
        const messages = chatLog.querySelectorAll('.chat-message:not(.loading-indicator)');
        const contents = [];
        
        const aiProfilePrompt = buildAISystemPromptProfile();

        contents.push({
            role: 'user',
            parts: [{
                text: `【指導・対話ルール】
あなたは親身で教え上手なAI学習アシスタント「わかるくん」です。
生徒の質問に答え、理解を深める対話型授業を行っています。

${aiProfilePrompt}

【対話ルール】
1. 生徒の質問や新しく追加添付された写真の内容に温かく親身に答えつつ、分かりやすく解説してください。
2. 毎回の挨拶や相槌に同じ定型フレーズを繰り返さず、生徒の質問の核心に直接答えてください。
3. 数式や記号（直線 $l, m$、座標、等式、分数など）は必ず LaTeX 形式（\`$数式$\`）で記述してください。
4. 回答の最後には、理解を深める問いかけや、「他によく分からない点や質問はある？」と優しく尋ねてください。
5. Markdown形式（箇条書き、太字等）で視認性よくまとめてください。`
            }]
        });
        contents.push({
            role: 'model',
            parts: [{ text: "わかりました！ノートや新しく送られた写真の内容、生徒の質問にしっかり向き合い、設定された指導スタイルで分かりやすい解説を行います。" }]
        });

        messages.forEach((msg) => {
            const isAi = msg.classList.contains('ai');
            const textParagraph = msg.querySelector('p');
            const attachedImg = msg.querySelector('img.chat-msg-img-attachment');
            
            let rawText = textParagraph ? (textParagraph.innerText || textParagraph.textContent) : (msg.innerText || msg.textContent);
            const userParts = [];

            if (attachedImg && attachedImg.src && attachedImg.src.startsWith('data:')) {
                const b64 = attachedImg.src.split(',')[1];
                const mime = attachedImg.src.split(';')[0].split(':')[1] || 'image/jpeg';
                userParts.push({
                    inline_data: {
                        mime_type: mime,
                        data: b64.replace(/[\r\n\s]/g, '')
                    }
                });
            }

            userParts.push({ text: rawText });

            contents.push({
                role: isAi ? 'model' : 'user',
                parts: userParts
            });
        });

        // 最初のノート画像があれば全体の文脈として先頭近くにも添付
        const teachingPreview = document.getElementById('teaching-image-preview');
        if (teachingPreview && teachingPreview.src && teachingPreview.src.startsWith('data:')) {
            const base64Data = teachingPreview.src.split(',')[1];
            const mimeType = teachingPreview.src.split(';')[0].split(':')[1] || 'image/jpeg';
            if (contents.length > 2 && contents[2].role === 'user') {
                const hasImg = contents[2].parts.some(p => p.inline_data || p.inlineData);
                if (!hasImg) {
                    contents[2].parts.unshift({
                        inline_data: {
                            mime_type: mimeType,
                            data: base64Data.replace(/[\r\n\s]/g, '')
                        }
                    });
                }
            }
        }

        callGeminiAPI(contents).then((aiText) => {
            loadingMsg.remove();

            const aiMsg = document.createElement('div');
            aiMsg.className = 'chat-message ai';
            aiMsg.style.cssText = 'display: flex; gap: 8px; align-self: flex-start;';
            aiMsg.innerHTML = `
                <span style="font-size: 1.2rem;">🤖</span>
                <div>${convertMarkdownToHtml(aiText)}</div>
            `;
            chatLog.appendChild(aiMsg);
            chatLog.scrollTop = chatLog.scrollHeight;
        }).catch((err) => {
            loadingMsg.remove();
            console.error(err);
            const errorMsg = document.createElement('div');
            errorMsg.className = 'chat-message ai';
            errorMsg.style.cssText = 'display: flex; gap: 8px; align-self: flex-start;';
            errorMsg.innerHTML = `
                <span style="font-size: 1.2rem;">🤖</span>
                <p style="color: #e74c3c;">Gemini APIの通信に失敗しました。エラー: ${escapeHtml(err.message)}</p>
            `;
            chatLog.appendChild(errorMsg);
            chatLog.scrollTop = chatLog.scrollHeight;
        });
    } else {
        // APIキーがない場合のモック動作（1秒ディレイ）
        setTimeout(() => {
            const aiMsg = document.createElement('div');
            aiMsg.className = 'chat-message ai';
            aiMsg.style.cssText = 'display: flex; gap: 8px; align-self: flex-start;';
            
            let aiReply = 'ご質問ありがとうございます！平方完成のコツは、xの係数の「半分」の2乗を足して引くことです。例えば x² - 6x であれば、-6の半分の -3 の2乗である 9 を足して引きます。';
            if (attachment) {
                aiReply = '新しい写真の追加添付ありがとうございます！写真の問題を確認しました。この問題は公式 $y = ax^2$ の頂点と対称性を利用するとスムーズに解けますよ！';
            } else if (text.includes('平方完成') || text.includes('やり方') || text.includes('公式')) {
                aiReply = '平方完成は、以下のステップで行います：<br>1. xの係数の半分の2乗を計算する（-6なら半分の-3の2乗で+9）<br>2. それを式に足して、すぐ引く<br>3. x² - 6x + 9 を (x - 3)² にまとめ、残りの定数項を計算する。<br>焦らず順番に解いてみてね！';
            } else if (text.includes('わから') || text.includes('難しい')) {
                aiReply = '最初は難しく見えますが、パターンを掴めば大丈夫です！どの計算のステップが一番難しく感じましたか？';
            }
            
            aiMsg.innerHTML = `
                <span style="font-size: 1.2rem;">🤖</span>
                <p>${aiReply}</p>
            `;
            chatLog.appendChild(aiMsg);
            chatLog.scrollTop = chatLog.scrollHeight;
        }, 800);
    }
}

function handleChatKeyPress(event) {
    if (event.key === 'Enter') {
        sendChatQuestion();
    }
}

// ==========================================
// 💾 「わかるくん」の授業＆練習結果を統一学習記録として保存
// ==========================================
function saveWakaruSessionAndReturnHome() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const dateString = `${yyyy}/${mm}/${dd}`;
    
    // 1. チャットログのメッセージをすべて取得
    const chatLogEl = document.getElementById('ai-chat-log');
    const chatHistory = [];
    if (chatLogEl) {
        const messages = chatLogEl.querySelectorAll('.chat-message');
        messages.forEach(msg => {
            if (msg.classList.contains('loading-indicator')) return;
            const sender = msg.classList.contains('ai') ? 'ai' : 'user';
            const contentEl = msg.querySelector('.markdown-body, div, p');
            const text = contentEl ? contentEl.innerHTML : (msg.innerText || '');
            if (text && text.trim()) {
                chatHistory.push({ sender, text });
            }
        });
    }

    // 2. 練習問題を実施していた場合、その結果も1つの学習記録内に統合保存
    const scoreVal = document.getElementById('practice-score-val');
    const scoreDisp = document.getElementById('practice-score-display');
    let hasPractice = false;
    let practiceScoreStr = '';
    
    if (currentPracticeQuestions && currentPracticeQuestions.length > 0 && scoreDisp && !scoreDisp.classList.contains('hidden')) {
        hasPractice = true;
        practiceScoreStr = scoreVal ? scoreVal.textContent : '0';
        
        let practiceLog = `🎯 <strong>ピンポイント練習問題（5問）結果: ${practiceScoreStr} / 100 点</strong><br><br>`;
        currentPracticeQuestions.forEach((q, idx) => {
            practiceLog += `<strong>【問${idx + 1}】 ${escapeHtml(q.title)}</strong><br>・正解: ${escapeHtml(q.answer)}<br>・解説: ${escapeHtml(q.explanation)}<br><br>`;
        });
        if (typeof lastWakaruAdvice !== 'undefined' && lastWakaruAdvice) {
            practiceLog += `💡 <strong>わかるくんからのアドバイス:</strong><br>${convertMarkdownToHtml(lastWakaruAdvice)}`;
        }
        chatHistory.push({ sender: 'ai', text: practiceLog });
    }

    // 3. ノート写真の取得
    const teachingPreview = document.getElementById('teaching-image-preview');
    let imageSrc = (teachingPreview && teachingPreview.src && teachingPreview.src.startsWith('data:')) ? teachingPreview.src : null;

    // 4. 動的トピック・教科の決定
    let baseTitle = (currentSessionTopic && currentSessionTopic.title) ? currentSessionTopic.title : 'ノート解説授業';
    let subject = (currentSessionTopic && currentSessionTopic.subject) ? currentSessionTopic.subject : '数学';

    let title = baseTitle;
    if (hasPractice) {
        title = `${baseTitle} ＆ 練習問題 (${practiceScoreStr}点)`;
    } else if (chatHistory.length > 2) {
        title = `${baseTitle}（質疑応答つき）`;
    }

    let icon = '📚';
    if (hasPractice) {
        icon = '🎯';
    } else if (subject === '数学') {
        icon = '📐';
    } else if (subject === '理科') {
        icon = '🧪';
    } else if (subject === '英語') {
        icon = '🔤';
    } else if (subject === '社会') {
        icon = '🏛️';
    } else if (subject === '国語') {
        icon = '📖';
    }

    // 5. サムネイル圧縮してから保存
    const commitSave = (thumbSrc) => {
        dummyHistory.unshift({
            id: 'h_session_' + Date.now(),
            date: dateString,
            subject: subject,
            title: title,
            icon: icon,
            image: thumbSrc,
            chat: chatHistory
        });

        saveHistory();

        // 練習問題状態とフォームをクリア
        currentPracticeQuestions = [];
        if (typeof lastWakaruAdvice !== 'undefined') lastWakaruAdvice = '';
        if (scoreDisp) scoreDisp.classList.add('hidden');
        const adviceBox = document.getElementById('wakaru-advice-box');
        if (adviceBox) adviceBox.classList.add('hidden');
        const statsBox = document.getElementById('practice-stats-box');
        if (statsBox) statsBox.classList.add('hidden');

        renderHistory();
        clearFileSelect();
        switchScreen('home');
        showToastNotification(`✅ 学習記録「${title}」を保存しました！`);
    };

    if (imageSrc) {
        compressImage(imageSrc, 400, 400, 0.6, (compressedThumb) => {
            commitSave(compressedThumb);
        });
    } else {
        commitSave(null);
    }
}

function finishReviewAndSave() {
    saveWakaruSessionAndReturnHome();
}

// エスケープ処理（セキュリティ対策）
function escapeHtml(str) {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// ==========================================
// 🔄 画面を切り替える関数（ふわっと滑らかなクロスフェード遷移）
// ==========================================
function switchScreen(screenId) {
    if (screenId === 'test') {
        loadHistory();
        updateTestScreenState();
    }

    const targetScreenId = `${screenId}-screen`;
    const targetScreen = document.getElementById(targetScreenId);
    if (!targetScreen) {
        console.warn(`Target screen not found: ${targetScreenId}`);
        return;
    }

    // すべての画面を非アクティブにしてターゲット画面をアクティブ化
    const allScreens = document.querySelectorAll('.screen');
    allScreens.forEach(s => {
        if (s.id !== targetScreenId) {
            s.classList.remove('active', 'screen-fade-out');
        }
    });

    targetScreen.classList.remove('screen-fade-out');
    targetScreen.classList.add('active');

    const card = targetScreen.querySelector('.glass-card');
    if (card) card.scrollTop = 0;
    window.scrollTo(0, 0);
}

/**
 * ホーム画面の「テスト」ボタンをクリックしたときのハンドラ
 */
function handleTestMenuClick() {
    loadHistory();
    const count = dummyHistory ? dummyHistory.length : 0;
    updateTestScreenState();
    switchScreen('test');

    if (count < 10) {
        showToastNotification(`💡 最初はわかるくんに教えてもらおう！（記録: ${count} / 10件）`);
    }
}

/**
 * 「最初はわかるくんに教えてもらおう」ポップアップモーダルを開く
 */
function openWakaruFirstModal() {
    loadHistory();
    const count = dummyHistory ? dummyHistory.length : 0;
    const modal = document.getElementById('wakaru-first-modal');
    const textEl = document.getElementById('modal-wakaru-progress-text');
    const barEl = document.getElementById('modal-wakaru-progress-bar');

    if (textEl) textEl.textContent = `${count} / 10件（あと ${10 - count} 件でテスト解放）`;
    if (barEl) barEl.style.width = `${Math.min(100, Math.round((count / 10) * 100))}%`;

    if (modal) {
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
    }
}

/**
 * 「最初はわかるくんに教えてもらおう」ポップアップモーダルを閉じる
 */
function closeWakaruFirstModal() {
    const modal = document.getElementById('wakaru-first-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
}

/**
 * テスト画面の表示状態を更新（学習記録が10件未満なら「まずはわかるくんに教えてもらおう」、10件以上ならテスト開始）
 */
function updateTestScreenState() {
    const count = dummyHistory ? dummyHistory.length : 0;
    const lockedContainer = document.getElementById('test-locked-container');
    const readyContainer = document.getElementById('test-ready-container');
    const progressBar = document.getElementById('test-progress-bar');
    const progressText = document.getElementById('test-progress-text');
    const readyCountLabel = document.getElementById('test-ready-record-count');

    if (count < 10) {
        if (lockedContainer) {
            lockedContainer.classList.remove('hidden');
            lockedContainer.style.display = 'block';
        }
        if (readyContainer) {
            readyContainer.classList.add('hidden');
            readyContainer.style.display = 'none';
        }
        if (progressBar) progressBar.style.width = `${Math.min(100, Math.round((count / 10) * 100))}%`;
        if (progressText) progressText.textContent = `現在の学習記録: ${count} / 10件（あと ${10 - count} 件でテストが解放されます）`;
    } else {
        if (lockedContainer) {
            lockedContainer.classList.add('hidden');
            lockedContainer.style.display = 'none';
        }
        if (readyContainer) {
            readyContainer.classList.remove('hidden');
            readyContainer.style.display = 'block';
        }
        if (readyCountLabel) readyCountLabel.textContent = `📊 蓄積された学習記録: ${count}件（AI分析準備完了）`;
    }
}

// ==========================================
// 📝 AI実力テスト機能（全20問 / 苦手重点7割＋得意確認3割）の制御ロジック
// ==========================================
let currentTestQuestions = [];
let lastTestAdvice = '';
let currentTestAnalysis = { weakCount: 14, strongCount: 6, weakTopics: [], strongTopics: [] };

/**
 * これまでの学習記録・練習問題の履歴を分析し、苦手分野と得意分野を抽出する
 */
function analyzeLearningHistoryForTest() {
    const weakTopics = [];
    const strongTopics = [];
    const studiedTopics = [];
    const subjectsCount = {};

    dummyHistory.forEach(item => {
        if (!item) return;
        const sub = item.subject || '総合';
        subjectsCount[sub] = (subjectsCount[sub] || 0) + 1;
        if (item.title) studiedTopics.push(item.title);

        if (Array.isArray(item.chat)) {
            item.chat.forEach(msg => {
                const txt = msg.text || '';
                // 練習問題ログやテストログの正誤を分析
                if (txt.includes('不正解') || txt.includes('✕') || txt.includes('苦手') || txt.includes('もう一度') || txt.includes('間違')) {
                    const snippet = txt.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').slice(0, 120);
                    weakTopics.push(`${sub}: ${snippet}`);
                }
                if (txt.includes('正解！') || txt.includes('◯') || txt.includes('100点') || txt.includes('満点') || txt.includes('よくできました')) {
                    const snippet = txt.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').slice(0, 120);
                    strongTopics.push(`${sub}: ${snippet}`);
                }
            });
        }
    });

    return {
        weakTopics: [...new Set(weakTopics)].slice(0, 8),
        strongTopics: [...new Set(strongTopics)].slice(0, 8),
        studiedTopics: [...new Set(studiedTopics)].slice(0, 10),
        subjectsCount
    };
}

/**
 * 20問実力テストを開始（AIが履歴を分析して全20問を生成）
 */
async function startTest() {
    loadHistory();

    // ローディング画面表示
    switchScreen('loading');
    const loadingText = document.querySelector('#loading-screen h3');
    const loadingSub = document.querySelector('#loading-screen p');
    const originalH3 = loadingText ? loadingText.textContent : '';
    const originalSub = loadingSub ? loadingSub.textContent : '';

    if (loadingText) loadingText.textContent = '🧠 AIがこれまでの学習記録を分析中...';
    if (loadingSub) loadingSub.textContent = '苦手な単元（約7割）と得意な単元（約3割）を抽出して20問テストを作成しています';

    const analysis = analyzeLearningHistoryForTest();
    const apiKey = localStorage.getItem('gemini-api-key');

    if (apiKey) {
        try {
            currentTestQuestions = await generateTestQuestionsWithGemini(analysis);
        } catch (e) {
            console.warn('Geminiによる20問テスト生成に失敗、フォールバックエンジンを使用します:', e);
            currentTestQuestions = generateFallback20TestQuestions(analysis);
        }
    } else {
        await new Promise(resolve => setTimeout(resolve, 1400));
        currentTestQuestions = generateFallback20TestQuestions(analysis);
    }

    if (loadingText) loadingText.textContent = originalH3;
    if (loadingSub) loadingSub.textContent = originalSub;

    renderTestQuestions(currentTestQuestions);
    switchScreen('test-paper');
}

/**
 * Gemini APIを用いて全20問の実力診断テストを生成
 */
async function generateTestQuestionsWithGemini(analysis) {
    const weakStr = analysis.weakTopics.length > 0 ? analysis.weakTopics.join('\n- ') : '一次方程式・二次関数のグラフ、英単語の時制と受動態、電流とオームの法則、歴史の因果関係、文章読解の要点把握';
    const strongStr = analysis.strongTopics.length > 0 ? analysis.strongTopics.join('\n- ') : '基本計算、英単語の意味、理科の基本用語、漢字の読み書き';
    const studiedStr = analysis.studiedTopics.length > 0 ? analysis.studiedTopics.join(', ') : '主要5科目（国語、数学、英語、理科、社会）';

    const systemPrompt = `あなたは教育指導のプロフェッショナルAIです。
生徒のこれまでの学習履歴・ノート・練習問題の正誤記録を分析し、最適な【実力診断テスト 全20問】（各5点/100点満点）を作成してください。

【生徒の学習履歴と分析結果】
■ 苦手な単元・間違えやすい箇所（ここから重点的に約7割＝13〜14問出題）:
- ${weakStr}

■ 得意な単元・理解できている箇所（自信・定着確認として約3割＝6〜7問出題）:
- ${strongStr}

■ 最近学習した内容・単元:
${studiedStr}

【出題ルール】
1. 必ず【全20問】のJSON配列形式のみを出力してください。Markdownのコードブロック記法(\`\`\`json ...)は付けず、純粋なJSONのみを返してください。
2. 出題配分：
   - 苦手克服・重点復習問題（tag: "🚨 苦手重点"）: 13〜14問
   - 得意・基礎定着確認問題（tag: "✨ 得意定着"）: 6〜7問
3. 各問題の形式：
   - "type": "choice"（4択選択式）を中心（15〜18問程度）とし、一部に "short"（記述・穴埋め）も含めてください。
   - choiceの場合、options配列に4つの選択肢を入れ、answerにはoptionsの1つと完全一致する正解文字列を指定してください。
   - 【重要】title（問題文）には選択肢記号（A.や①など）を含めないでください。
4. 数式や記号は LaTeX 形式（$〜$）で記述してください。
5. 配点：全問 "points": 5（20問 × 5点 = 100点満点）。

JSON出力フォーマット:
[
  {
    "id": 1,
    "subject": "数学",
    "tag": "🚨 苦手重点",
    "title": "問題文（選択肢を含めない）",
    "type": "choice",
    "options": ["A. 選択肢1", "B. 選択肢2", "C. 選択肢3", "D. 選択肢4"],
    "answer": "A. 選択肢1",
    "points": 5,
    "explanation": "なぜこれが正解なのかの丁寧な解説"
  },
  ...（計20問）
]`;

    const contents = [{ role: 'user', parts: [{ text: systemPrompt }] }];
    const responseText = await callGeminiAPI(contents);
    let cleanJsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanJsonStr);

    if (Array.isArray(parsed) && parsed.length >= 20) {
        return parsed.slice(0, 20).map((q, idx) => ({ ...q, id: idx + 1, points: 5 }));
    } else if (Array.isArray(parsed) && parsed.length > 0) {
        const fallback = generateFallback20TestQuestions(analysis);
        const combined = [...parsed, ...fallback.slice(parsed.length)].slice(0, 20);
        return combined.map((q, idx) => ({ ...q, id: idx + 1, points: 5 }));
    } else {
        throw new Error('20問の生成結果が不正です');
    }
}

/**
 * 20問テスト用フォールバック問題生成エンジン（履歴に基づく苦手14問＋得意6問）
 */
function generateFallback20TestQuestions(analysis) {
    // 苦手重点問題バンク（14問分）
    const weakPool = [
        {
            subject: "数学",
            tag: "🚨 苦手重点",
            title: "二次関数 $y = 2(x - 1)^2 + 3$ の頂点の座標を答えよ。",
            type: "choice",
            options: ["$(1, 3)$", "$(-1, 3)$", "$(1, -3)$", "$(-1, -3)$"],
            answer: "$(1, 3)$",
            points: 5,
            explanation: "二次関数 $y = a(x - p)^2 + q$ の頂点は $(p, q)$ です。したがって頂点は $(1, 3)$ です。"
        },
        {
            subject: "数学",
            tag: "🚨 苦手重点",
            title: "連立方程式 $\\begin{cases} 2x + y = 8 \\\\ x - y = 1 \\end{cases}$ の解 $(x, y)$ を求めよ。",
            type: "choice",
            options: ["$x = 3, y = 2$", "$x = 2, y = 4$", "$x = 4, y = 0$", "$x = 5, y = -2$"],
            answer: "$x = 3, y = 2$",
            points: 5,
            explanation: "2つの式を足すと $3x = 9 \\Rightarrow x = 3$。第2式に代入して $3 - y = 1 \\Rightarrow y = 2$ となります。"
        },
        {
            subject: "数学",
            tag: "🚨 苦手重点",
            title: "直角三角形において、底辺が $6\\text{cm}$、高さが $8\\text{cm}$ のとき、斜辺の長さは何 $\\text{cm}$ か？",
            type: "choice",
            options: ["$10\\text{cm}$", "$12\\text{cm}$", "$14\\text{cm}$", "$16\\text{cm}$"],
            answer: "$10\\text{cm}$",
            points: 5,
            explanation: "三平方の定理 $a^2 + b^2 = c^2$ より、$6^2 + 8^2 = 36 + 64 = 100 = 10^2$ となり、斜辺は $10\\text{cm}$ です。"
        },
        {
            subject: "英語",
            tag: "🚨 苦手重点",
            title: "「その本は夏目漱石によって書かれました」の英文として正しいものはどれか？",
            type: "choice",
            options: ["The book was written by Soseki Natsume.", "The book wrote by Soseki Natsume.", "The book is wrote by Soseki Natsume.", "The book was writing by Soseki Natsume."],
            answer: "The book was written by Soseki Natsume.",
            points: 5,
            explanation: "受動態（受け身）の過去形は「was/were + 過去分詞 + by 〜」で表します。writeの過去分詞は written です。"
        },
        {
            subject: "英語",
            tag: "🚨 苦手重点",
            title: "空欄に入る最も適切な関係代名詞を選べ: I know a boy ( _______ ) can speak four languages.",
            type: "choice",
            options: ["who", "which", "whose", "where"],
            answer: "who",
            points: 5,
            explanation: "先行詞が「人 (a boy)」であり、関係代名詞節内で主語の働きをするため主格の who を使います。"
        },
        {
            subject: "英語",
            tag: "🚨 苦手重点",
            title: "「私は3年間東京に住んでいます」を現在完了形で表した英文として正しいものはどれか？",
            type: "choice",
            options: ["I have lived in Tokyo for three years.", "I lived in Tokyo since three years.", "I am living in Tokyo for three years.", "I have been live in Tokyo for three years."],
            answer: "I have lived in Tokyo for three years.",
            points: 5,
            explanation: "継続を表す現在完了形は「have/has + 過去分詞 + for (期間)」で表します。"
        },
        {
            subject: "理科",
            tag: "🚨 苦手重点",
            title: "$10\\,\\Omega$ の電熱線に $5\\,\\text{V}$ の電圧をかけたとき、流れる電流は何 $\\text{A}$（アンペア）か？",
            type: "choice",
            options: ["$0.5\\,\\text{A}$", "$2\\,\\text{A}$", "$50\\,\\text{A}$", "$0.2\\,\\text{A}$"],
            answer: "$0.5\\,\\text{A}$",
            points: 5,
            explanation: "オームの法則 $I = \\frac{V}{R}$ より、$I = \\frac{5}{10} = 0.5\\,\\text{A}$ です。"
        },
        {
            subject: "理科",
            tag: "🚨 苦手重点",
            title: "塩酸と水酸化ナトリウム水溶液を混ぜ合わせたときの中和反応で生じる物質の組み合わせはどれか？",
            type: "choice",
            options: ["塩化ナトリウムと水", "炭酸ナトリウムと水素", "塩化カルシウムと酸素", "硫酸ナトリウムと水"],
            answer: "塩化ナトリウムと水",
            points: 5,
            explanation: "酸（$\\text{HCl}$）とアルカリ（$\\text{NaOH}$）の中和反応により、塩（$\\text{NaCl}$：塩化ナトリウム）と水（$\\text{H}_2\\text{O}$）が生成されます。"
        },
        {
            subject: "理科",
            tag: "🚨 苦手重点",
            title: "光が空気中から水中に斜めに入射するとき、光の進む向きはどうなるか？",
            type: "choice",
            options: ["屈折角が入射角より小さくなるように曲がる", "屈折角が入射角より大きくなるように曲がる", "まったく曲がらず直進する", "すべて境界面で反射して水中に入らない"],
            answer: "屈折角が入射角より小さくなるように曲がる",
            points: 5,
            explanation: "空気中から水やガラスに入るときは、屈折角が入射角よりも小さくなります（境界面の垂線に近づく向きに曲がる）。"
        },
        {
            subject: "社会",
            tag: "🚨 苦手重点",
            title: "日本の三権分立において、国会が内閣に対して行使できる権限はどれか？",
            type: "choice",
            options: ["内閣不信任の決議", "衆議院の解散", "違憲審査権の行使", "最高裁判所長官の指名"],
            answer: "内閣不信任の決議",
            points: 5,
            explanation: "国会（立法）は内閣（行政）に対して「内閣不信任決議権」を持ちます。衆議院の解散は内閣の権限です。"
        },
        {
            subject: "社会",
            tag: "🚨 苦手重点",
            title: "1853年に浦賀に来航し、日本に開国を要求したアメリカの海軍提督は誰か？",
            type: "choice",
            options: ["ペリー", "ハリス", "オールコック", "マッカーサー"],
            answer: "ペリー",
            points: 5,
            explanation: "1853年に黒船を率いて浦賀（神奈川県）に来航したのはペリーです。"
        },
        {
            subject: "国語",
            tag: "🚨 苦手重点",
            title: "次のうち、「敬語（謙譲語）」として正しい使い方はどれか？",
            type: "choice",
            options: ["「先生の元へ伺います」", "「先生が参られます」", "「先生が申されました」", "「先生がおっしゃられました」"],
            answer: "「先生の元へ伺います」",
            points: 5,
            explanation: "「伺う」は自分を低めて相手を敬う謙譲語です。「参る」「申す」は謙譲語なので相手の動作には使えません。"
        },
        {
            subject: "国語",
            tag: "🚨 苦手重点",
            title: "「雨降って地固まる」ということわざの意味として最も適切なものはどれか？",
            type: "choice",
            options: ["揉め事や困難があった後の方が、かえって良い状態になること", "雨が降ると地面がぬかるんで歩きにくくなること", "準備を怠ると後で大きな損害を被ること", "小さなことの積み重ねが大きな成果につながること"],
            answer: "揉め事や困難があった後の方が、かえって良い状態になること",
            points: 5,
            explanation: "雨が降った後の地面が固く引き締まることから、揉め事の後は基盤がしっかりすることの例えです。"
        },
        {
            subject: "情報",
            tag: "🚨 苦手重点",
            title: "インターネットで情報を安全に送受信するために通信を暗号化する仕組みはどれか？",
            type: "choice",
            options: ["SSL / TLS (HTTPS)", "DNS", "DHCP", "FTP"],
            answer: "SSL / TLS (HTTPS)",
            points: 5,
            explanation: "Web通信を暗号化して盗聴や改ざんを防ぐ技術が SSL/TLS（HTTPS）です。"
        }
    ];

    // 得意・基礎定着確認問題バンク（6問分）
    const strongPool = [
        {
            subject: "数学",
            tag: "✨ 得意定着",
            title: "一次方程式 $3x - 5 = 10$ を解いたときの $x$ の値はどれか？",
            type: "choice",
            options: ["$x = 5$", "$x = 3$", "$x = 15$", "$x = -5$"],
            answer: "$x = 5$",
            points: 5,
            explanation: "$3x = 10 + 5 \\Rightarrow 3x = 15 \\Rightarrow x = 5$ となります。"
        },
        {
            subject: "英語",
            tag: "✨ 得意定着",
            title: "「彼らは放課後にサッカーをします」を表す英文の空欄に入る単語: They ( _______ ) soccer after school.",
            type: "choice",
            options: ["play", "plays", "playing", "played"],
            answer: "play",
            points: 5,
            explanation: "主語が複数形の They なので、一般動詞の原形 play を用います。"
        },
        {
            subject: "理科",
            tag: "✨ 得意定着",
            title: "植物が光のエネルギーを使って二酸化炭素と水からデンプンと酸素を作る働きを何というか？",
            type: "choice",
            options: ["光合成", "呼吸", "蒸散", "消化"],
            answer: "光合成",
            points: 5,
            explanation: "葉緑体で行われる、養分と酸素をつくり出す働きは「光合成」です。"
        },
        {
            subject: "社会",
            tag: "✨ 得意定着",
            title: "日本で最も高い山（標高3776m）はどれか？",
            type: "choice",
            options: ["富士山", "北岳", "槍ヶ岳", "阿蘇山"],
            answer: "富士山",
            points: 5,
            explanation: "日本最高峰は静岡県・山梨県にまたがる富士山（3776m）です。"
        },
        {
            subject: "国語",
            tag: "✨ 得意定着",
            title: "「青天の霹靂（へきれき）」と同じ意味を持つ表現はどれか？",
            type: "choice",
            options: ["突然の思いがけない出来事", "雲ひとつない快晴の空", "激しい雷雨に見舞われること", "目標に向かって努力すること"],
            answer: "突然の思いがけない出来事",
            points: 5,
            explanation: "青空に突然激しい雷が鳴ることから、予期せぬ突発的な事件を意味します。"
        },
        {
            subject: "数学",
            tag: "✨ 得意定着",
            title: "計算せよ: $(-4) \\times (-3) + (-5)$",
            type: "choice",
            options: ["$7$", "$17$", "$-17$", "$-7$"],
            answer: "$7$",
            points: 5,
            explanation: "$(-4) \\times (-3) = 12$、 $12 + (-5) = 7$ です。"
        }
    ];

    const questions = [...weakPool, ...strongPool];
    return questions.map((q, idx) => ({ ...q, id: idx + 1 }));
}

/**
 * 20問のテスト問題を画面（test-questions-container）に描画
 */
function renderTestQuestions(questions) {
    const container = document.getElementById('test-questions-container');
    if (!container) return;

    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const testDateEl = document.getElementById('test-date');
    if (testDateEl) testDateEl.textContent = `${yyyy}/${mm}/${dd}`;

    const scoreDisplay = document.getElementById('test-score-display');
    if (scoreDisplay) scoreDisplay.classList.add('hidden');

    const testAdviceBox = document.getElementById('test-wakaru-advice-box');
    if (testAdviceBox) testAdviceBox.classList.add('hidden');

    const testStatsBox = document.getElementById('test-stats-box');
    if (testStatsBox) {
        testStatsBox.classList.add('hidden');
        testStatsBox.style.display = 'none';
    }

    const gradeBtn = document.getElementById('grade-test-btn');
    if (gradeBtn) gradeBtn.classList.remove('hidden');

    const finishBtn = document.getElementById('finish-test-btn');
    if (finishBtn) finishBtn.classList.add('hidden');

    const abortBtn = document.getElementById('test-abort-btn');
    if (abortBtn) abortBtn.classList.remove('hidden');

    // 苦手問題数と得意問題数のカウント
    let weakCount = 0;
    let strongCount = 0;
    questions.forEach(q => {
        if (q.tag && q.tag.includes('苦手')) weakCount++;
        else strongCount++;
    });
    currentTestAnalysis.weakCount = weakCount;
    currentTestAnalysis.strongCount = strongCount;

    const compText = document.getElementById('test-composition-text');
    if (compText) {
        compText.innerHTML = `🧠 <strong>AI分析出題:</strong> 🚨 苦手克服 ${weakCount}問 ｜ ✨ 得意・基礎定着 ${strongCount}問 （全${questions.length}問・各5点 / 100点満点）`;
    }

    let html = '';
    questions.forEach((q, idx) => {
        const qNum = idx + 1;
        const cleanTitle = cleanQuestionTitle(q.title, q.options);
        const titleHtml = renderMathFormulas(processInlineMarkdown(escapeHtml(cleanTitle)));
        const tagClass = q.tag && q.tag.includes('苦手') ? 'trash-item-subject' : 'trash-remaining-badge';
        const tagText = q.tag || '実力確認';
        const subText = q.subject || '総合';

        html += `
            <div class="test-question-item" id="test-item-${qNum}" style="margin-bottom: 26px; padding-bottom: 22px; border-bottom: 1px dashed rgba(0,0,0,0.12);">
                <div class="q-title" style="font-size: 1.02rem; font-weight: 700; margin-bottom: 12px; line-height: 1.65; color: var(--text-color);">
                    <span class="q-num" style="color: var(--accent-blue); font-weight: 800; margin-right: 6px;">【問 ${qNum} / 20】</span>
                    <span style="font-size: 0.78rem; font-weight: 700; padding: 2px 8px; border-radius: 6px; background: #f1f5f9; color: #475569; margin-right: 6px;">${escapeHtml(subText)}</span>
                    <span style="font-size: 0.75rem; font-weight: 700; padding: 2px 8px; border-radius: 12px; margin-right: 8px; background: ${tagText.includes('苦手') ? '#fee2e2; color: #b91c1c;' : '#dcfce7; color: #15803d;'}">${escapeHtml(tagText)}</span>
                    ${titleHtml}
                    <span class="q-points" style="font-size: 0.82rem; color: #7f8c8d; font-weight: normal; margin-left: 4px;">（5点）</span>
                </div>
        `;

        if (q.type === 'choice' && Array.isArray(q.options)) {
            html += `<div class="choice-options-list">`;
            q.options.forEach((opt, optIdx) => {
                const radioId = `tq_${qNum}_opt_${optIdx}`;
                const formattedOpt = renderMathFormulas(processInlineMarkdown(escapeHtml(opt)));
                html += `
                    <label class="choice-option-card" for="${radioId}">
                        <input type="radio" name="tq_ans_${qNum}" id="${radioId}" value="${escapeHtml(opt)}" class="choice-radio-input" onchange="highlightSelectedChoice(this)">
                        <span class="choice-option-text">${formattedOpt}</span>
                    </label>
                `;
            });
            html += `</div>`;
        } else {
            // テキスト入力形式
            html += `
                <div class="q-answer-area">
                    <span style="font-weight: 600; color: #546e7a;">答：</span>
                    <input type="text" id="tq_ans_text_${qNum}" placeholder="解答を入力してください" class="q-input-long">
                </div>
            `;
        }

        const formattedExplanation = renderMathFormulas(processInlineMarkdown(escapeHtml(q.explanation || '')));
        const formattedAnswer = renderMathFormulas(processInlineMarkdown(escapeHtml(q.answer || '')));

        // 採点後フィードバックエリア
        html += `
                <div class="q-feedback hidden" id="test-feedback-${qNum}" style="margin-top: 14px;">
                    <div class="feedback-header">
                        <span class="grade-mark mark-correct">◯</span>
                        <strong class="grade-text" style="font-size: 0.95rem; color: var(--text-color);">【正解】: ${formattedAnswer}</strong>
                    </div>
                    <div class="q-explanation">
                        <strong style="color: #475569;">【解説】</strong><br>
                        ${formattedExplanation}
                    </div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

/**
 * 20問実力テストの採点
 */
async function gradeTest() {
    if (!currentTestQuestions || currentTestQuestions.length === 0) return;

    let totalScore = 0;
    let weakCorrect = 0;
    let strongCorrect = 0;
    const resultsSummary = [];

    currentTestQuestions.forEach((q, idx) => {
        const qNum = idx + 1;
        let userAns = '';

        if (q.type === 'choice') {
            const selectedRadio = document.querySelector(`input[name="tq_ans_${qNum}"]:checked`);
            if (selectedRadio) userAns = selectedRadio.value.trim();
        } else {
            const textInput = document.getElementById(`tq_ans_text_${qNum}`);
            if (textInput) userAns = textInput.value.trim();
        }

        const isCorrect = checkPracticeAnswer(userAns, q.answer);
        if (isCorrect) {
            totalScore += 5;
            if (q.tag && q.tag.includes('苦手')) weakCorrect++;
            else strongCorrect++;
        }

        resultsSummary.push({
            num: qNum,
            subject: q.subject || '総合',
            tag: q.tag || '',
            title: q.title,
            isCorrect: isCorrect,
            userAns: userAns || '未入力',
            correctAns: q.answer
        });

        // フィードバック表示
        const feedbackEl = document.getElementById(`test-feedback-${qNum}`);
        if (feedbackEl) {
            feedbackEl.classList.remove('hidden');
            const markEl = feedbackEl.querySelector('.grade-mark');
            const textEl = feedbackEl.querySelector('.grade-text');
            if (markEl) {
                markEl.textContent = isCorrect ? '◯' : '✕';
                markEl.className = isCorrect ? 'grade-mark mark-correct' : 'grade-mark mark-incorrect';
            }
            if (textEl) {
                const formattedAnswer = renderMathFormulas(processInlineMarkdown(escapeHtml(q.answer || '')));
                textEl.innerHTML = isCorrect ? `正解！（+5点）` : `不正解（【正解】: ${formattedAnswer}）`;
                textEl.style.color = isCorrect ? '#27ae60' : '#c0392b';
            }
        }

        // 入力を無効化
        const radios = document.querySelectorAll(`input[name="tq_ans_${qNum}"]`);
        radios.forEach(r => r.disabled = true);
        const textInput = document.getElementById(`tq_ans_text_${qNum}`);
        if (textInput) textInput.readOnly = true;
    });

    const scoreVal = document.getElementById('test-score-val');
    if (scoreVal) scoreVal.textContent = totalScore;
    const scoreDisp = document.getElementById('test-score-display');
    if (scoreDisp) scoreDisp.classList.remove('hidden');

    const gradeBtn = document.getElementById('grade-test-btn');
    if (gradeBtn) gradeBtn.classList.add('hidden');
    const finishBtn = document.getElementById('finish-test-btn');
    if (finishBtn) finishBtn.classList.remove('hidden');
    const abortBtn = document.getElementById('test-abort-btn');
    if (abortBtn) abortBtn.classList.add('hidden');

    // わかるくんからの講評アドバイスを生成・表示
    const adviceBox = document.getElementById('test-wakaru-advice-box');
    const adviceTextEl = document.getElementById('test-wakaru-advice-text');
    if (adviceBox && adviceTextEl) {
        adviceBox.classList.remove('hidden');
        adviceTextEl.innerHTML = '<span style="color: #64748b;">🤖 わかるくんがあなたの20問テスト結果を分析して講評を書いています...</span>';

        const weakRate = currentTestAnalysis.weakCount > 0 ? Math.round((weakCorrect / currentTestAnalysis.weakCount) * 100) : 0;
        const strongRate = currentTestAnalysis.strongCount > 0 ? Math.round((strongCorrect / currentTestAnalysis.strongCount) * 100) : 0;

        let dynamicAdvice = '';
        if (totalScore >= 80) {
            dynamicAdvice = `🎉 <strong>すばらしい！${totalScore}点の高得点です！</strong><br>` +
                `苦手重点問題（${currentTestAnalysis.weakCount}問中 ${weakCorrect}問正解 / 正答率 ${weakRate}%）もしっかり克服できています。<br>` +
                `得意分野（${currentTestAnalysis.strongCount}問中 ${strongCorrect}問正解）も盤石です！この調子でどんどん自信を深めていきましょう！`;
        } else if (totalScore >= 50) {
            dynamicAdvice = `👍 <strong>よく頑張りました！得点は ${totalScore}点 です！</strong><br>` +
                `得意分野（正答率 ${strongRate}%）はしっかり取れています。苦手重点問題（${currentTestAnalysis.weakCount}問中 ${weakCorrect}問正解）で間違えたところは、` +
                `解説をよく読んで「わかるくんに教えてもらう」でノートを再確認してみましょう！`;
        } else {
            dynamicAdvice = `🌱 <strong>20問のチャレンジ、お疲れさまでした！（得点: ${totalScore}点）</strong><br>` +
                `今回は苦手な単元を重点的に14問出題したため、少し難しく感じたかもしれませんが、これが成長の大チャンスです！<br>` +
                `間違えた問題の解説を一つずつ確認して、次回は満点を目指して復習していきましょう！`;
        }

        const apiKey = localStorage.getItem('gemini-api-key');
        if (apiKey) {
            try {
                const prompt = `生徒が【20問のパーソナライズ実力テスト（苦手重点${currentTestAnalysis.weakCount}問、得意確認${currentTestAnalysis.strongCount}問）】を受験しました。
結果:
- 総合得点: ${totalScore} / 100点
- 苦手重点問題の正解数: ${weakCorrect} / ${currentTestAnalysis.weakCount}問
- 得意定着問題の正解数: ${strongCorrect} / ${currentTestAnalysis.strongCount}問
各問題の結果概要:
${resultsSummary.map(r => `問${r.num} [${r.subject} ${r.tag}]: ${r.isCorrect ? '◯正解' : '✕不正解'} (${r.title})`).join('\n')}

生徒を温かく励まし、苦手克服の成果やこれからの学習のポイントを3〜4文程度で優しく前向きにアドバイスしてください。`;
                const contents = [{ role: 'user', parts: [{ text: prompt }] }];
                const aiResp = await callGeminiAPI(contents);
                dynamicAdvice = convertMarkdownToHtml(aiResp);
            } catch (e) {
                console.warn('AI講評生成エラー、フォールバックを使用:', e);
            }
        }

        lastTestAdvice = dynamicAdvice;
        adviceTextEl.innerHTML = dynamicAdvice;
    }

    // 📊 実力テスト統計データボックスを表示
    renderLearningStats(totalScore, 'AI実力テスト(20問)', 'test-stats-box');
}

/**
 * テスト完了＆履歴保存
 */
function finishTestSessionAndSave() {
    const scoreVal = document.getElementById('test-score-val');
    const score = scoreVal ? scoreVal.textContent : '0';

    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const dateString = `${yyyy}/${mm}/${dd}`;

    const chatHistory = [
        { sender: 'ai', text: `📝 <strong>AI総合実力テスト（全20問）結果: ${score} / 100 点</strong>` }
    ];

    if (lastTestAdvice) {
        chatHistory.push({
            sender: 'ai',
            text: `🤖 <strong>わかるくんからの講評:</strong><br>${lastTestAdvice}`
        });
    }

    currentTestQuestions.forEach((q, idx) => {
        const qNum = idx + 1;
        let userAns = '';
        if (q.type === 'choice') {
            const selectedRadio = document.querySelector(`input[name="tq_ans_${qNum}"]:checked`);
            if (selectedRadio) userAns = selectedRadio.value;
        } else {
            const textInput = document.getElementById(`tq_ans_text_${qNum}`);
            if (textInput) userAns = textInput.value;
        }

        const isCorrect = checkPracticeAnswer(userAns, q.answer);

        chatHistory.push({
            sender: 'ai',
            text: `<strong>【問 ${qNum}】[${escapeHtml(q.subject || '')} ${escapeHtml(q.tag || '')}] ${escapeHtml(q.title)}</strong><br>` +
                `・判定: ${isCorrect ? '⭕ 正解 (+5点)' : '❌ 不正解'}<br>` +
                `・あなたの解答: ${escapeHtml(userAns || '未入力')}<br>` +
                `・正解: ${escapeHtml(q.answer)}<br>` +
                `・解説: ${escapeHtml(q.explanation)}`
        });
    });

    const testTitle = `AI実力テスト全20問 (得点: ${score}点)`;

    dummyHistory.unshift({
        id: 'h_session_' + Date.now(),
        date: dateString,
        subject: '実力テスト',
        title: testTitle,
        icon: '📝',
        image: null,
        chat: chatHistory
    });

    saveHistory();

    const testStatsBox = document.getElementById('test-stats-box');
    if (testStatsBox) {
        testStatsBox.classList.add('hidden');
        testStatsBox.style.display = 'none';
    }

    renderHistory();
    switchScreen('home');
    showToastNotification(`✅ 学習記録「${testTitle}」を保存しました！`);
}

function finishTest() {
    finishTestSessionAndSave();
}

function confirmResetAllData() {
    if (confirm('保存されているすべての学習記録を削除して初期化しますか？\n（削除されたデータは3日間保持され、「SAVE」と入力して復元できます）')) {
        if (dummyHistory.length > 0) {
            addToTrashHistory(dummyHistory);
        }
        dummyHistory = [];
        localStorage.removeItem('ai-study-history');
        localStorage.setItem('ai-study-history-v3', 'true');
        saveHistory();
        renderHistory();
        alert('すべての学習記録を削除し、初期状態に一新しました。\n※ 削除されたデータは3日間保持されます（キーボードで「SAVE」と打つと保持記録から復元できます）。');
        switchScreen('home');
    }
}

// ==========================================
// 📜 過去ログ会話詳細の制御ロジック
// ==========================================
let activeHistoryItem = null;

function openHistoryChat(id) {
    const item = dummyHistory.find(h => h.id === id);
    if (!item) return;

    activeHistoryItem = item;

    // タイトルと日付を設定
    document.getElementById('history-chat-title').innerHTML = `✨ 過去の解説授業：${escapeHtml(item.title)}`;
    document.getElementById('history-chat-date').textContent = `学習日：${item.date}`;

    // 画像またはプレビュープレースホルダーの設定
    const chatImg = document.getElementById('history-chat-image');
    const placeholder = document.getElementById('history-chat-placeholder');

    if (item.image) {
        chatImg.src = item.image;
        chatImg.classList.remove('hidden');
        placeholder.classList.add('hidden');
    } else {
        chatImg.classList.add('hidden');
        placeholder.textContent = item.icon;
        placeholder.classList.remove('hidden');
    }

    // チャットログのレンダリング
    const chatLog = document.getElementById('history-chat-log');
    chatLog.innerHTML = '';

    if (item.chat && item.chat.length > 0) {
        item.chat.forEach(msg => {
            const msgEl = document.createElement('div');
            if (msg.sender === 'ai') {
                msgEl.className = 'chat-message ai';
                msgEl.style.cssText = 'display: flex; gap: 8px; align-self: flex-start;';
                msgEl.innerHTML = `
                    <span style="font-size: 1.2rem;">🤖</span>
                    <div>${msg.text}</div>
                `;
            } else {
                msgEl.className = 'chat-message user';
                msgEl.style.cssText = 'display: flex; gap: 8px; align-self: flex-end; flex-direction: row-reverse;';
                msgEl.innerHTML = `
                    <span style="font-size: 1.2rem;">👤</span>
                    <div>${msg.text}</div>
                `;
            }
            chatLog.appendChild(msgEl);
        });
    } else {
        chatLog.innerHTML = `
            <div class="chat-message ai" style="display: flex; gap: 8px; align-self: flex-start;">
                <span style="font-size: 1.2rem;">🤖</span>
                <p>この復習セッションの会話はありません。</p>
            </div>
        `;
    }

    // スクロールを一番下に
    chatLog.scrollTop = chatLog.scrollHeight;

    // インプット欄をクリア
    document.getElementById('history-chat-input').value = '';

    // バナーの描画
    renderAIPersonaBanners();

    // 画面切り替え
    switchScreen('history-chat');
}

function sendHistoryChatQuestion() {
    const input = document.getElementById('history-chat-input');
    const chatLog = document.getElementById('history-chat-log');
    if (!input || !chatLog || !activeHistoryItem) return;

    let text = input.value.trim();
    const attachment = currentHistoryAttachment;

    if (!text && !attachment) return;
    if (!text && attachment) {
        text = "この添付した写真（資料・問題）について教えてください。";
    }

    // 1. ユーザーメッセージを追加
    const userMsg = document.createElement('div');
    userMsg.className = 'chat-message user';
    userMsg.style.cssText = 'display: flex; gap: 8px; align-self: flex-end; flex-direction: row-reverse;';
    
    let attachmentHtml = '';
    if (attachment && attachment.dataUrl) {
        attachmentHtml = `<img src="${attachment.dataUrl}" class="chat-msg-img-attachment" alt="添付写真" onclick="window.open(this.src)">`;
    }

    userMsg.innerHTML = `
        <span style="font-size: 1.2rem;">👤</span>
        <div>
            ${attachmentHtml}
            <p>${escapeHtml(text)}</p>
        </div>
    `;
    chatLog.appendChild(userMsg);
    input.value = '';

    // メモリ上のチャットデータにも追加（セッション中保存）
    if (!activeHistoryItem.chat) activeHistoryItem.chat = [];
    activeHistoryItem.chat.push({ 
        sender: 'user', 
        text: attachmentHtml ? `${attachmentHtml}<p>${escapeHtml(text)}</p>` : escapeHtml(text) 
    });
    
    // 添付状態をクリア
    clearHistoryAttachment();
    
    saveHistory();

    // スクロールを一番下に
    chatLog.scrollTop = chatLog.scrollHeight;

    const apiKey = localStorage.getItem('gemini-api-key');
    if (apiKey) {
        // AIの「考え中...」を表示
        const loadingMsg = document.createElement('div');
        loadingMsg.className = 'chat-message ai loading-indicator';
        loadingMsg.style.cssText = 'display: flex; gap: 8px; align-self: flex-start;';
        loadingMsg.innerHTML = `
            <span style="font-size: 1.2rem;">🤖</span>
            <p style="color: #7f8c8d; font-style: italic;">考え中...</p>
        `;
        chatLog.appendChild(loadingMsg);
        chatLog.scrollTop = chatLog.scrollHeight;

        // チャット履歴の収集
        const contents = [];
        const aiProfilePrompt = buildAISystemPromptProfile();
        
        contents.push({
            role: 'user',
            parts: [{
                text: `【指導・対話ルール】
あなたは親身で教え上手なAI学習アシスタント「わかるくん」です。
過去に行った学習履歴について、ユーザーから追加の質問を受けています。

${aiProfilePrompt}

【対話ルール】
1. 過去の会話の流れやノート、新しく添付された写真の内容を踏まえて、生徒の質問に分かりやすく的確に回答してください。
2. 設定されたペルソナ・口調・熱量・厳しさ・例え話をはっきりと反映させて回答してください。
3. 数式や記号は必ず LaTeX 形式（\`$数式$\`）で記述してください。
4. 回答はMarkdown形式で見やすく整理してください。`
            }]
        });
        contents.push({
            role: 'model',
            parts: [{ text: "了解しました！設定された指導スタイルに合わせて、過去の学習内容や追加の写真、生徒の質問にしっかり回答します。" }]
        });

        activeHistoryItem.chat.forEach(msg => {
            const rawText = msg.text.replace(/<[^>]*>/g, '');
            const userParts = [];

            // 添付画像が含まれているかチェック
            const imgMatch = msg.text.match(/src=["'](data:[^"']+)["']/i);
            if (imgMatch && imgMatch[1]) {
                const b64 = imgMatch[1].split(',')[1];
                const mime = imgMatch[1].split(';')[0].split(':')[1] || 'image/jpeg';
                userParts.push({
                    inline_data: {
                        mime_type: mime,
                        data: b64.replace(/[\r\n\s]/g, '')
                    }
                });
            }

            userParts.push({ text: rawText });

            contents.push({
                role: msg.sender === 'ai' ? 'model' : 'user',
                parts: userParts
            });
        });

        // 過去ログの元画像があれば全体の文脈として先頭近くに添付
        if (activeHistoryItem.image && activeHistoryItem.image.startsWith('data:')) {
            const base64Data = activeHistoryItem.image.split(',')[1];
            const mimeType = activeHistoryItem.image.split(';')[0].split(':')[1] || 'image/jpeg';
            if (contents.length > 2 && contents[2].role === 'user') {
                const hasImg = contents[2].parts.some(p => p.inline_data || p.inlineData);
                if (!hasImg) {
                    contents[2].parts.unshift({
                        inline_data: {
                            mime_type: mimeType,
                            data: base64Data.replace(/[\r\n\s]/g, '')
                        }
                    });
                }
            }
        }

        callGeminiAPI(contents).then((aiText) => {
            loadingMsg.remove();

            const aiMsg = document.createElement('div');
            aiMsg.className = 'chat-message ai';
            aiMsg.style.cssText = 'display: flex; gap: 8px; align-self: flex-start;';
            aiMsg.innerHTML = `
                <span style="font-size: 1.2rem;">🤖</span>
                <div>${convertMarkdownToHtml(aiText)}</div>
            `;
            chatLog.appendChild(aiMsg);
            chatLog.scrollTop = chatLog.scrollHeight;

            // 履歴にAIの応答をHTML形式に変換して保存
            activeHistoryItem.chat.push({ sender: 'ai', text: convertMarkdownToHtml(aiText) });
            saveHistory();
        }).catch((err) => {
            loadingMsg.remove();
            console.error(err);
            const errorMsg = document.createElement('div');
            errorMsg.className = 'chat-message ai';
            errorMsg.style.cssText = 'display: flex; gap: 8px; align-self: flex-start;';
            errorMsg.innerHTML = `
                <span style="font-size: 1.2rem;">🤖</span>
                <p style="color: #e74c3c;">Gemini APIの通信に失敗しました。エラー: ${escapeHtml(err.message)}</p>
            `;
            chatLog.appendChild(errorMsg);
            chatLog.scrollTop = chatLog.scrollHeight;
        });
    } else {
        // APIキーがない場合のモック動作（1秒ディレイ）
        setTimeout(() => {
            const aiMsg = document.createElement('div');
            aiMsg.className = 'chat-message ai';
            aiMsg.style.cssText = 'display: flex; gap: 8px; align-self: flex-start;';
            
            const replyText = `（AI連携開発中）「${escapeHtml(text)}」についてのご質問を受け付けました。今後のアップデートで、この過去ログに基づきAIが的確に追加解説を行うようになります！`;
            aiMsg.innerHTML = `
                <span style="font-size: 1.2rem;">🤖</span>
                <p>${replyText}</p>
            `;
            chatLog.appendChild(aiMsg);

            // メモリに追加
            activeHistoryItem.chat.push({ sender: 'ai', text: replyText });
            
            saveHistory();

            // スクロールを一番下に
            chatLog.scrollTop = chatLog.scrollHeight;
        }, 1000);
    }
}

function handleHistoryChatKeyPress(event) {
    if (event.key === 'Enter') {
        sendHistoryChatQuestion();
    }
}

// 15個のAIカスタマイズスライダーのマップ
const allSettingSliders = {
    'design-preference-slider': 'design-preference',
    'activity-preference-slider': 'activity-preference',
    'motivation-preference-slider': 'motivation-preference',
    'learning-style-slider': 'learning-style',
    'tone-preference-slider': 'tone-preference',
    'praise-preference-slider': 'praise-preference',
    'length-preference-slider': 'length-preference',
    'analogy-preference-slider': 'analogy-preference',
    'difficulty-preference-slider': 'difficulty-preference',
    'character-preference-slider': 'character-preference',
    'interaction-preference-slider': 'interaction-preference',
    'strictness-preference-slider': 'strictness-preference',
    'hint-preference-slider': 'hint-preference',
    'pace-preference-slider': 'pace-preference',
    'energy-preference-slider': 'energy-preference'
};

/**
 * 現在設定されているAIペルソナのバッジタグ一覧を取得
 */
function getActiveAIPersonaTags() {
    const getVal = (key) => parseInt(localStorage.getItem(key) || '50', 10);
    const otherPrefs = (localStorage.getItem('other-preferences') || '').trim();
    const tags = [];

    const tone = getVal('tone-preference');
    if (tone >= 55) tags.push('💬 タメ口');
    else if (tone <= 45) tags.push('🎩 丁寧な敬語');

    const praise = getVal('praise-preference');
    if (praise >= 55) tags.push('🎉 大絶賛');
    else if (praise <= 45) tags.push('⚖️ 冷静・事実重視');

    const energy = getVal('energy-preference');
    if (energy >= 55) tags.push('🔥 超熱血');
    else if (energy <= 45) tags.push('🧊 クール・知的');

    const strictness = getVal('strictness-preference');
    if (strictness >= 55) tags.push('⚡ 厳格指導');
    else if (strictness <= 45) tags.push('🌸 超甘口・全肯定');

    const analogy = getVal('analogy-preference');
    if (analogy >= 55) tags.push('🍕 例え話重視');
    else if (analogy <= 45) tags.push('📐 数式・理論直球');

    const length = getVal('length-preference');
    if (length >= 55) tags.push('📚 詳細解説');
    else if (length <= 45) tags.push('⚡ 要点集中');

    if (otherPrefs) {
        const shortPref = otherPrefs.length > 10 ? otherPrefs.slice(0, 10) + '…' : otherPrefs;
        tags.push(`⭐ ${shortPref}`);
    }

    return tags;
}

/**
 * 生徒の個性や希望スタイルに合わせてAI指導方針を明確に構築
 */
function buildAISystemPromptProfile() {
    const getVal = (key) => parseInt(localStorage.getItem(key) || '50', 10);
    const otherPrefs = (localStorage.getItem('other-preferences') || '').trim();

    const tone = getVal('tone-preference');
    const praise = getVal('praise-preference');
    const length = getVal('length-preference');
    const analogy = getVal('analogy-preference');
    const strictness = getVal('strictness-preference');
    const energy = getVal('energy-preference');
    const interaction = getVal('interaction-preference');
    const hint = getVal('hint-preference');

    // 1. 口調・語り口（明確に区別）
    let toneInstruction = "";
    if (tone >= 55) {
        toneInstruction = "【超重要・口調ルール】：敬語（です・ます・でございます）は一切禁止です。100%徹底したフレンドリーなタメ口（〜だよ！、〜だね！、これ見て！、〜してみよう！）で、親友のように話してください。";
    } else if (tone <= 45) {
        toneInstruction = "【超重要・口調ルール】：砕けたタメ口は一切禁止です。極めて丁寧で礼儀正しい敬語・謙譲語（〜でございます、〜いたします、〜ですね、〜なさってください）で誠実に話してください。";
    } else {
        toneInstruction = "【口調ルール】：親切で自然な標準語（〜ですね、〜してみましょう）で話してください。";
    }

    // 2. 褒め方
    let praiseInstruction = "";
    if (praise >= 55) {
        praiseInstruction = "【褒め方】：生徒のノートや着眼点、取り組みを「うわ、これすごい！」「完璧な発想！」「最高だよ！」と熱烈に大絶賛して生徒のモチベーションを最高に高めてください。";
    } else if (praise <= 45) {
        praiseInstruction = "【褒め方】：感情的なお世辞や大げさな褒め言葉は避け、「正解です」「論理的に合致しています」と客観的な事実のみを冷静に伝えてください。";
    } else {
        praiseInstruction = "【褒め方】：良いポイントを自然に褒めて励ましてください。";
    }

    // 3. 熱量・テンション
    let energyInstruction = "";
    if (energy >= 55) {
        energyInstruction = "【熱量・テンション】：絵文字「🔥」「💪」「✨」「🎯」をふんだんに使い、「よっしゃ！」「一緒に絶対マスターしようぜ！🔥」と熱血スポーツコーチのように情熱全開で指導してください。";
    } else if (energy <= 45) {
        energyInstruction = "【熱量・テンション】：絵文字や感嘆符（！）は極力抑え、落ち着いた知的な大人の雰囲気で、冷静かつスマートに指導してください。";
    } else {
        energyInstruction = "【熱量・テンション】：明るく前向きなトーンで指導してください。";
    }

    // 4. 指導の厳しさ
    let strictnessInstruction = "";
    if (strictness >= 55) {
        strictnessInstruction = "【指導の厳しさ】：生徒が間違えやすいポイントや符号ミス、定義の曖昧さを「ここ、油断すると絶対に符号を間違えるよ！」「甘い理解は命取り！」とビシッと厳格に指摘し、確実に修正させてください。";
    } else if (strictness <= 45) {
        strictnessInstruction = "【指導の厳しさ】：超甘口・全肯定スタイルです。どんなミスや曖昧さも「挑戦しただけで100点満点！」「できなくても全然大丈夫だよ！」と温かく包み込んで安心感を与えてください。";
    } else {
        strictnessInstruction = "【指導の厳しさ】：優しく励ましつつ、改善ポイントを的確に伝えてください。";
    }

    // 5. 解説の長さ・構成
    let lengthInstruction = "";
    if (length >= 55) {
        lengthInstruction = "【解説ボリューム】：【超詳細・段階的ステップ解説】背景にある理屈、途中式の全ステップ、別解や裏ワザまで余すところなく手厚く詳しく解説してください。";
    } else if (length <= 45) {
        lengthInstruction = "【解説ボリューム】：【超簡潔・要点箇条書き】前置きや雑談は一切削り、核心となる解法公式と重要ポイントを箇条書きでコンパクトにまとめてください。";
    } else {
        lengthInstruction = "【解説ボリューム】：バランスの良い標準的な分量でわかりやすく解説してください。";
    }

    // 6. 例え話
    let analogyInstruction = "";
    if (analogy >= 55) {
        analogyInstruction = "【例え話】：ピザの切り分け、ゲームのレベルアップ、日常の買い物など、身近で直感的にイメージできる例え話を積極的に交えて解説してください。";
    } else if (analogy <= 45) {
        analogyInstruction = "【例え話】：日常の例え話は避け、数学的・科学的な定義と定理・論理でストレートに解説してください。";
    } else {
        analogyInstruction = "【例え話】：必要に応じてわかりやすい例えを交えてください。";
    }

    // 7. 特記事項
    let otherPrefsInstruction = otherPrefs
        ? `\n【🌟 ユーザーの個別要望・こだわり（最優先で反映）】：\n生徒からの特別リクエスト: 『${otherPrefs}』\nこの要望を解説の語り口やキャラクター性、例え話に【はっきりと目に見える形で積極的に反映】してください。`
        : "";

    return `
【AIペルソナ・指導スタイル設定（設定された個性をはっきりと体現してください）】
${toneInstruction}
${praiseInstruction}
${energyInstruction}
${strictnessInstruction}
${lengthInstruction}
${analogyInstruction}
${otherPrefsInstruction}
`.trim();
}

/**
 * AIの応答からTOPICとSUBJECTを抽出する
 */
function parseTopicAndSubject(text) {
    let cleanText = text || '';
    let title = '';
    let subject = '数学';

    // 1. <!--TOPIC: ... | SUBJECT: ...--> または [TOPIC: ... | SUBJECT: ...]
    const tagMatch = cleanText.match(/<!--TOPIC:\s*([^|]+?)\s*\|\s*SUBJECT:\s*([^\->]+?)\s*-->/i) ||
                     cleanText.match(/\[TOPIC:\s*([^|]+?)\s*\|\s*SUBJECT:\s*([^\]]+?)\s*\]/i);

    if (tagMatch) {
        title = tagMatch[1].trim().replace(/^【|】$/g, '').replace(/^[#\s]+/, '');
        subject = tagMatch[2].trim();
        cleanText = cleanText.replace(tagMatch[0], '').trim();
    } else {
        // 2. フォールバック解析
        const fallback = extractTopicFallback(cleanText);
        title = fallback.title;
        subject = fallback.subject;
    }

    return { cleanText, title, subject };
}

function extractTopicFallback(text) {
    let subject = '数学';
    let title = 'ノート解説授業';

    if (!text) return { title, subject };

    // 教科の自動判別
    const mathKeywords = ['一次関数', '二次関数', '連立方程式', '三角形', '合同', '相似', '面積', '傾き', '切片', '確率', '因数分解', '平方根', '三平方', '関数', 'グラフ', '数学', '算数'];
    const scienceKeywords = ['光合成', '呼吸', '細胞', '電流', '電圧', 'オーム', '化学変化', '酸化', '還元', '消化', 'イオン', '生殖', '遺伝', '天体', '地層', '理科'];
    const englishKeywords = ['英語', '過去形', '現在完了', '不定詞', '動名詞', '受動態', '関係代名詞', '助動詞', '単語', '文法', 'English', 'grammar'];
    const societyKeywords = ['歴史', '地理', '公民', '江戸', '明治', '幕府', '気候', '憲法', '内閣', '裁判所', '社会'];
    const japaneseKeywords = ['国語', '古文', '漢文', '品詞', '敬語', '漢字', '説明文', '小説', '随筆', '文学'];

    if (scienceKeywords.some(kw => text.includes(kw))) subject = '理科';
    else if (englishKeywords.some(kw => text.includes(kw))) subject = '英語';
    else if (societyKeywords.some(kw => text.includes(kw))) subject = '社会';
    else if (japaneseKeywords.some(kw => text.includes(kw))) subject = '国語';
    else if (mathKeywords.some(kw => text.includes(kw))) subject = '数学';

    // 最初の見出し（# や ## や ###）から単元名を抽出
    const headingMatch = text.match(/^#+\s*(.+)$/m);
    if (headingMatch && headingMatch[1]) {
        let rawHeader = headingMatch[1].replace(/^[0-9\.\s]+/, '').replace(/【|】|📖|✨|🎯|💬/g, '').trim();
        if (rawHeader.length >= 2 && rawHeader.length <= 28) {
            title = rawHeader;
            return { title, subject };
        }
    }

    // キーワードからタイトル生成
    for (const kw of [...mathKeywords, ...scienceKeywords, ...englishKeywords, ...societyKeywords, ...japaneseKeywords]) {
        if (text.includes(kw)) {
            title = `${kw}のポイント解説`;
            break;
        }
    }

    return { title, subject };
}

// ==========================================
// ⚙️ 設定画面の保存・読込ロジック
// ==========================================
function renderAIPersonaBanners() {
    const tags = getActiveAIPersonaTags();
    const aiBanner = document.getElementById('ai-active-persona-tags');
    const historyBanner = document.getElementById('history-active-persona-tags');

    const html = tags.length > 0
        ? `<span>スタイル:</span> ${tags.map(t => `<span class="persona-tag">${t}</span>`).join('')}`
        : '';

    if (aiBanner) {
        aiBanner.innerHTML = html;
        if (tags.length > 0) aiBanner.classList.remove('hidden');
        else aiBanner.classList.add('hidden');
    }
    if (historyBanner) {
        historyBanner.innerHTML = html;
        if (tags.length > 0) historyBanner.classList.remove('hidden');
        else historyBanner.classList.add('hidden');
    }
}

function saveSettings() {
    for (const [id, key] of Object.entries(allSettingSliders)) {
        const slider = document.getElementById(id);
        if (slider) {
            localStorage.setItem(key, slider.value);
        }
    }
    
    // テキストエリアの保存
    const otherPrefs = document.getElementById('other-preferences');
    if (otherPrefs) {
        localStorage.setItem('other-preferences', otherPrefs.value);
    }

    // Gemini APIキーとモデルの保存
    const apiKeyInput = document.getElementById('gemini-api-key');
    const modelSelect = document.getElementById('gemini-model-select');
    if (apiKeyInput) {
        localStorage.setItem('gemini-api-key', apiKeyInput.value.trim());
    }
    if (modelSelect) {
        localStorage.setItem('gemini-model', modelSelect.value);
    }
    
    // バナーの再描画
    renderAIPersonaBanners();

    // 保存完了メッセージの表示演出
    const statusEl = document.getElementById('settings-save-status');
    if (statusEl) {
        statusEl.style.opacity = '1';
    }

    // 0.6秒後に自動でホーム画面に戻る
    setTimeout(() => {
        if (statusEl) {
            statusEl.style.opacity = '0';
        }
        showToastNotification('⚙️ AIの指導スタイル設定を保存・適用しました！');
        switchScreen('home');
    }, 600);
}

function loadSettings() {
    for (const [id, key] of Object.entries(allSettingSliders)) {
        const slider = document.getElementById(id);
        if (slider) {
            const savedVal = localStorage.getItem(key);
            slider.value = savedVal !== null ? savedVal : '50';
        }
    }
    
    // テキストエリアの読み込み
    const otherPrefs = document.getElementById('other-preferences');
    if (otherPrefs) {
        const savedVal = localStorage.getItem('other-preferences');
        otherPrefs.value = savedVal !== null ? savedVal : '';
    }

    // Gemini APIキーとモデルの読み込み
    const apiKeyInput = document.getElementById('gemini-api-key');
    const modelSelect = document.getElementById('gemini-model-select');
    if (apiKeyInput) {
        apiKeyInput.value = localStorage.getItem('gemini-api-key') || '';
    }
    if (modelSelect) {
        modelSelect.value = localStorage.getItem('gemini-model') || 'gemini-2.5-flash';
    }

    // バナーの初期描画
    renderAIPersonaBanners();
}

// ==========================================
// 🌐 Gemini API 連携ユーティリティ
// ==========================================

function getCleanApiKey() {
    const inputEl = document.getElementById('gemini-api-key');
    let raw = (inputEl && inputEl.value ? inputEl.value : (localStorage.getItem('gemini-api-key') || '')).trim();
    // 引用符やスペースを除去
    raw = raw.replace(/^["'`]+|["'`]+$/g, '').trim();
    return raw;
}

/**
 * APIキーを使って利用可能なGeminiモデル一覧を取得する
 */
async function fetchAvailableGeminiModels(apiKey) {
    try {
        const cleanKey = apiKey ? apiKey.replace(/^["'`]+|["'`]+$/g, '').trim() : getCleanApiKey();
        if (!cleanKey) return [];

        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${cleanKey}`;
        const response = await fetch(url);
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            const msg = errData.error?.message || `HTTP ${response.status}`;
            throw new Error(`APIキー認証エラー (${response.status}): ${msg}`);
        }
        const data = await response.json();
        if (Array.isArray(data.models)) {
            // generateContent に対応しているモデル名を抽出（models/gemini-... から gemini-... を取得）
            const usable = data.models
                .filter(m => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
                .map(m => m.name.replace(/^models\//, ''));
            return usable;
        }
        return [];
    } catch (e) {
        console.warn('Failed to fetch dynamic models list:', e);
        return [];
    }
}

/**
 * Gemini API を安全に呼び出す（動的モデル探索＆自動フォールバック付き）
 */
async function callGeminiAPI(contents, preferredModel = null) {
    const apiKey = getCleanApiKey();
    if (!apiKey) {
        throw new Error('Gemini APIキーが設定されていません。右上の「⚙️」設定画面でAPIキーを入力して保存してください。');
    }

    // ユーザー指定モデル
    const userSelected = preferredModel || localStorage.getItem('gemini-model') || 'gemini-2.5-flash';
    const cleanUserSelected = userSelected.replace(/^models\//, '');

    // 優先的に試行するモデル候補リスト（現在利用可能な最新世代を優先）
    let candidateModels = [
        cleanUserSelected,
        'gemini-2.5-flash',
        'gemini-2.5-flash-lite',
        'gemini-3.5-flash',
        'gemini-3.5-flash-lite',
        'gemini-3.7-flash',
        'gemini-3-flash',
        'gemini-3.1-flash-lite',
        'gemini-2.0-flash',
        'gemini-1.5-flash'
    ];

    // 動的にアカウントで使えるモデル一覧を取得できれば優先リストの先頭にマージ
    const dynamicModels = await fetchAvailableGeminiModels(apiKey);
    if (dynamicModels.length > 0) {
        candidateModels = [
            cleanUserSelected,
            ...dynamicModels,
            ...candidateModels
        ];
    }

    // 重複除去
    candidateModels = candidateModels.filter((m, idx, self) => Boolean(m) && self.indexOf(m) === idx);

    let lastError = null;

    for (const model of candidateModels) {
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
            let response;
            try {
                response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        contents,
                        generationConfig: {
                            temperature: 0.75,
                            topP: 0.95
                        }
                    })
                });
            } catch (fetchErr) {
                // ネットワーク遮断（CORS、広告ブロッカー、オフライン等）
                throw new Error(`Google APIサーバーとの通信に失敗しました (Failed to fetch)。\n原因の可能性: ブラウザの拡張機能（広告ブロック等）による通信遮断、またはネットワークの接続制限。`);
            }

            if (response.ok) {
                const data = await response.json();
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) {
                    // 成功したモデルをローカルストレージに記憶
                    localStorage.setItem('gemini-model', model);
                    return text;
                } else if (data.candidates?.[0]?.finishReason) {
                    throw new Error(`AIの応答がブロックされました (理由: ${data.candidates[0].finishReason})`);
                }
            }

            const errData = await response.json().catch(() => ({}));
            const rawMsg = errData.error?.message || `HTTP ${response.status}`;
            const statusCode = response.status;

            // 404 (モデル不在) の場合は次の候補モデルへリトライ
            if (statusCode === 404) {
                console.warn(`Model ${model} not found (404), trying next candidate...`);
                lastError = new Error(`モデル ${model} が見つかりませんでした (404)。`);
                continue;
            }

            // 400 (API KEY INVALID) や 403 (PERMISSION DENIED) の場合は即座にわかりやすいエラーを投げる
            if (statusCode === 400 && (rawMsg.includes('API_KEY_INVALID') || rawMsg.includes('API key not valid'))) {
                throw new Error('APIキーが無効です。Google AI Studio (https://aistudio.google.com/) で取得した正しいAPIキーを入力してください。');
            }
            if (statusCode === 403) {
                throw new Error('APIのアクセス権限が拒否されました (403)。APIキーの利用規約同意状況や制限をご確認ください。');
            }
            if (statusCode === 429) {
                throw new Error('Gemini APIの利用制限（レートリミット: 429）に達しました。1〜2分待ってから再度お試しください。');
            }

            throw new Error(`Gemini APIエラー (${statusCode}): ${rawMsg}`);
        } catch (e) {
            lastError = e;
            // 認証エラーやレートリミット、通信エラーは即座に中断
            if (e.message.includes('APIキーが無効') || e.message.includes('アクセス権限が拒否') || e.message.includes('利用制限') || e.message.includes('Failed to fetch')) {
                throw e;
            }
        }
    }

    throw lastError || new Error('Gemini APIへのリクエストに失敗しました。');
}

/**
 * 設定画面からAPIキーの接続テストを行う関数（詳細診断つき）
 */
async function testGeminiAPIConnection() {
    const apiKeyInput = document.getElementById('gemini-api-key');
    const resultEl = document.getElementById('api-test-result');
    const testBtn = document.getElementById('test-api-btn');

    if (!resultEl) return;

    const rawKey = getCleanApiKey();

    if (!rawKey) {
        resultEl.innerHTML = '<div style="background: rgba(231,76,60,0.12); border: 1px solid #e74c3c; border-radius: 10px; padding: 10px 14px; color: #c0392b; font-weight: 600; font-size: 0.88rem;">⚠️ APIキーを入力してください。</div>';
        resultEl.style.display = 'block';
        return;
    }

    if (testBtn) {
        testBtn.disabled = true;
        testBtn.textContent = '🔄 診断・テスト中...';
    }

    resultEl.innerHTML = '<div style="color: #546e7a; font-size: 0.88rem;">🌐 Google Gemini サーバーと通信診断中...</div>';
    resultEl.style.display = 'block';

    try {
        // 保存も同時に行う
        localStorage.setItem('gemini-api-key', rawKey);

        // ステップ1: キーの有効性と利用可能モデルの確認
        const models = await fetchAvailableGeminiModels(rawKey);
        
        // ステップ2: 実際のテキスト対話テスト
        const modelSelect = document.getElementById('gemini-model-select');
        const selectedModel = modelSelect ? modelSelect.value : 'gemini-2.5-flash';

        const testContents = [
            {
                role: 'user',
                parts: [{ text: 'こんにちは！短く「接続成功」とだけ返答してください。' }]
            }
        ];

        const reply = await callGeminiAPI(testContents, selectedModel);
        const activeModel = localStorage.getItem('gemini-model') || selectedModel;

        const modelListHtml = models.length > 0 
            ? `<div style="margin-top: 6px; font-size: 0.78rem; color: #546e7a;">利用可能モデル: ${models.slice(0, 5).join(', ')}${models.length > 5 ? ' など計' + models.length + '種' : ''}</div>`
            : '';

        resultEl.innerHTML = `
            <div style="background: rgba(46, 204, 113, 0.15); border: 1px solid #2ecc71; border-radius: 12px; padding: 12px 14px; color: #27ae60; font-weight: 600; font-size: 0.9rem; line-height: 1.45;">
                ✅ <strong>接続テスト成功！</strong><br>
                Gemini API（稼働モデル: <code>${activeModel}</code>）と正常に通信できました。<br>
                <span style="font-size: 0.82rem; color: #34495e;">AIからの応答: 「${escapeHtml(reply.trim())}」</span>
                ${modelListHtml}
            </div>
        `;
    } catch (err) {
        console.error('API Connection Test Failed:', err);
        resultEl.innerHTML = `
            <div style="background: rgba(231, 76, 60, 0.15); border: 1px solid #e74c3c; border-radius: 12px; padding: 12px 14px; color: #c0392b; font-weight: 600; font-size: 0.9rem; line-height: 1.45;">
                ❌ <strong>接続テスト失敗</strong><br>
                <div style="font-size: 0.85rem; margin-top: 4px; font-weight: normal; color: #7f1d1d; white-space: pre-wrap;">${escapeHtml(err.message)}</div>
                <div style="margin-top: 8px; font-size: 0.8rem; color: #546e7a; font-weight: normal;">
                    💡 <strong>確認ポイント:</strong><br>
                    ・Google AI Studio (<a href="https://aistudio.google.com/" target="_blank" style="color: #2980b9;">aistudio.google.com</a>) で「Create API key」から取得した「AIzaSy...」で始まるキーか確認してください。<br>
                    ・キーの先頭や末尾に余分な文字が含まれていないか「👁️」ボタンで確認してください。
                </div>
            </div>
        `;
    } finally {
        if (testBtn) {
            testBtn.disabled = false;
            testBtn.textContent = '⚡ 接続テストを実行';
        }
    }
}

function processInlineMarkdown(text) {
    if (!text) return '';
    let str = text;
    // 太字 **text** または __text__
    str = str.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    str = str.replace(/__(.*?)__/g, '<strong>$1</strong>');
    // 斜体 *text* または _text_
    str = str.replace(/\*(.*?)\*/g, '<em>$1</em>');
    str = str.replace(/_(.*?)_/g, '<em>$1</em>');
    // 打ち消し線 ~~text~~
    str = str.replace(/~~(.*?)~~/g, '<del>$1</del>');
    return str;
}

function parseCustomMarkdown(text) {
    if (!text) return '';
    let str = text;

    // コードブロック ```code```
    str = str.replace(/```([\s\S]*?)```/g, (match, p1) => {
        return `<pre style="background: rgba(0,0,0,0.06); padding: 12px; border-radius: 8px; overflow-x: auto; font-family: monospace; font-size: 0.85rem; margin: 8px 0;"><code>${escapeHtml(p1.trim())}</code></pre>`;
    });

    // インラインコード `code`
    str = str.replace(/`([^`]+)`/g, (match, p1) => {
        return `<code style="background: rgba(0,0,0,0.06); padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 0.85rem;">${escapeHtml(p1)}</code>`;
    });

    const lines = str.split('\n');
    let htmlLines = [];
    let inList = false;
    let listType = null;

    lines.forEach(line => {
        let trimmed = line.trim();

        // 見出し #, ##, ###
        if (/^#{1,6}\s+/.test(trimmed)) {
            if (inList) { htmlLines.push(listType === 'ul' ? '</ul>' : '</ol>'); inList = false; }
            const level = trimmed.match(/^(#{1,6})/)[1].length;
            const content = trimmed.replace(/^#{1,6}\s+/, '');
            const fontSize = level === 1 ? '1.25rem' : level === 2 ? '1.1rem' : '1.0rem';
            htmlLines.push(`<h${level} style="font-size: ${fontSize}; font-weight: 700; margin: 10px 0 4px 0; color: var(--accent-purple);">${processInlineMarkdown(content)}</h${level}>`);
            return;
        }

        // 箇条書きリスト - item, * item, + item
        if (/^[-*+]\s+/.test(trimmed)) {
            if (!inList || listType !== 'ul') {
                if (inList) htmlLines.push(listType === 'ul' ? '</ul>' : '</ol>');
                htmlLines.push('<ul style="margin: 6px 0; padding-left: 20px; list-style-type: disc;">');
                inList = true;
                listType = 'ul';
            }
            const content = trimmed.replace(/^[-*+]\s+/, '');
            htmlLines.push(`<li style="margin: 3px 0;">${processInlineMarkdown(content)}</li>`);
            return;
        }

        // 番号付きリスト 1. item
        if (/^\d+\.\s+/.test(trimmed)) {
            if (!inList || listType !== 'ol') {
                if (inList) htmlLines.push(listType === 'ul' ? '</ul>' : '</ol>');
                htmlLines.push('<ol style="margin: 6px 0; padding-left: 20px;">');
                inList = true;
                listType = 'ol';
            }
            const content = trimmed.replace(/^\d+\.\s+/, '');
            htmlLines.push(`<li style="margin: 3px 0;">${processInlineMarkdown(content)}</li>`);
            return;
        }

        if (inList && trimmed === '') {
            htmlLines.push(listType === 'ul' ? '</ul>' : '</ol>');
            inList = false;
        }

        // 引用 > text
        if (/^>\s+/.test(trimmed)) {
            const content = trimmed.replace(/^>\s+/, '');
            htmlLines.push(`<blockquote style="border-left: 4px solid var(--accent-blue); padding-left: 12px; margin: 8px 0; color: #546e7a; font-style: italic;">${processInlineMarkdown(content)}</blockquote>`);
            return;
        }

        // 区切り線 ---
        if (/^(---|\*\*\*|___)$/.test(trimmed)) {
            htmlLines.push('<hr style="border: none; border-top: 1px solid rgba(0,0,0,0.1); margin: 10px 0;">');
            return;
        }

        if (trimmed === '') {
            htmlLines.push('<div style="height: 4px;"></div>');
        } else {
            htmlLines.push(`<p style="margin: 3px 0; line-height: 1.6;">${processInlineMarkdown(trimmed)}</p>`);
        }
    });

    if (inList) {
        htmlLines.push(listType === 'ul' ? '</ul>' : '</ol>');
    }

    return `<div class="markdown-body" style="line-height: 1.6; font-size: 0.9rem;">${htmlLines.join('\n')}</div>`;
}

// ==========================================
// 📐 数式レンダリング (KaTeX) & Markdown 変換
// ==========================================

/**
 * テキスト内のLaTeX数式 ($...$ や $$...$$) を KaTeX でHTMLに変換
 */
function renderMathFormulas(text) {
    if (!text) return '';
    let result = text;

    // 1. KaTeXが利用可能な場合
    if (typeof katex !== 'undefined' && typeof katex.renderToString === 'function') {
        // ブロック数式 $$ ... $$
        result = result.replace(/\$\$([\s\S]+?)\$\$/g, (match, formula) => {
            try {
                return `<div class="katex-display-block" style="text-align: center; margin: 14px 0; overflow-x: auto; padding: 6px 0;">${katex.renderToString(formula.trim(), { displayMode: true, throwOnError: false })}</div>`;
            } catch (e) {
                return match;
            }
        });

        // インライン数式 $ ... $ (改行を含まず、中身があるもの)
        result = result.replace(/\$([^\$\n]+?)\$/g, (match, formula) => {
            try {
                return `<span class="katex-inline-block">${katex.renderToString(formula.trim(), { displayMode: false, throwOnError: false })}</span>`;
            } catch (e) {
                return match;
            }
        });
    } else {
        // 2. KaTeX未読み込み時のフォールバック（$l, m$ -> 美しいイタリック数学フォント）
        result = result.replace(/\$\$([\s\S]+?)\$\$/g, '<div class="math-fallback-block" style="text-align: center; font-style: italic; font-family: \'Cambria Math\', \'Times New Roman\', serif; margin: 10px 0; background: rgba(155, 89, 182, 0.08); padding: 8px 12px; border-radius: 8px; font-size: 1.05rem;">$1</div>');
        result = result.replace(/\$([^\$\n]+?)\$/g, '<span class="math-fallback-inline" style="font-family: \'Cambria Math\', \'Times New Roman\', serif; font-style: italic; font-weight: 600; color: #2c3e50; padding: 0 3px;">$1</span>');
    }

    return result;
}

/**
 * DOM要素内の数式を一括レンダリング（Auto-Render）
 */
function renderMathInDOM(element) {
    if (!element) return;
    if (typeof renderMathInElement === 'function') {
        try {
            renderMathInElement(element, {
                delimiters: [
                    { left: '$$', right: '$$', display: true },
                    { left: '$', right: '$', display: false },
                    { left: '\\(', right: '\\)', display: false },
                    { left: '\\[', right: '\\]', display: true }
                ],
                throwOnError: false
            });
        } catch (e) {
            console.warn('KaTeX auto-render warning:', e);
        }
    }
}

function convertMarkdownToHtml(text) {
    if (!text) return '';
    
    // 先に数式を保護/変換するか、パース後に適用
    let parsedHtml = '';
    if (typeof marked !== 'undefined' && typeof marked.parse === 'function') {
        try {
            parsedHtml = marked.parse(text);
        } catch (e) {
            console.error('marked.js parse error:', e);
            parsedHtml = parseCustomMarkdown(text);
        }
    } else {
        parsedHtml = parseCustomMarkdown(text);
    }

    // 数式記号を美しくレンダリング
    const finalHtml = renderMathFormulas(parsedHtml);
    return `<div class="markdown-body learning-content-rendered" style="line-height: 1.7; font-size: 0.93rem;">${finalHtml}</div>`;
}

// ==========================================
// 🎯 練習問題 (5問) 自動生成・採点ロジック
// ==========================================
let currentPracticeQuestions = [];

/**
 * 「練習問題へ進む」が押された際の処理
 * やった内容に合わせた問題5問をGemini APIまたはフォールバックで生成
 */
async function goToPracticeQuestions() {
    // ローディング画面で進捗提示
    switchScreen('loading');
    const loadingText = document.querySelector('#loading-screen h3');
    const loadingSub = document.querySelector('#loading-screen p');
    const originalH3 = loadingText ? loadingText.textContent : '';
    const originalSub = loadingSub ? loadingSub.textContent : '';

    if (loadingText) loadingText.textContent = '🎯 学習内容に合わせた練習問題を生成中...';
    if (loadingSub) loadingSub.textContent = 'AIがノートと授業ログを分析して5問のテストを作成しています';

    // 授業ログテキストの抽出
    const chatLog = document.getElementById('ai-chat-log');
    let learnedContent = chatLog ? chatLog.innerText : '';
    if (!learnedContent || learnedContent.trim().length < 10) {
        learnedContent = "学習ノートの復習内容（数学、国語、英語、理科、社会の総合学習）";
    }

    const apiKey = localStorage.getItem('gemini-api-key');

    if (apiKey) {
        try {
            const systemPrompt = `あなたはプロの学習塾の講師AIです。
ユーザーが直前に学習・解説を受けた以下の授業ログ・ノート内容を読み込み、理解度を確かめるための【練習問題 5問】を作成してください。

【学習した授業内容・ログ】
${learnedContent}

【絶対ルール】
1. 必ず長さ5のJSON配列形式のみを出力してください。説明テキストやMarkdownのコードブロック記法(\`\`\`json ...)は一切付けず、純粋なJSONのみを返してください。
2. 【超重要】title（問題文）には問題文の本題のみを書き、選択肢（A.〜や①〜など）を問題文の中に含めないでください。選択肢は必ず options 配列にのみ記述してください。
3. 数式や記号は必ず LaTeX 形式（$数式$）で記述してください。

各要素のキー構造:
[
  {
    "id": 1,
    "title": "問題文を記述（選択肢を含めない）",
    "type": "choice", 
    "options": ["A. 選択肢1", "B. 選択肢2", "C. 選択肢3", "D. 選択肢4"],
    "answer": "A. 選択肢1",
    "explanation": "なぜこれが正解なのかの丁寧な解説"
  },
  ... (計5問)
]`;

            const contents = [{ role: 'user', parts: [{ text: systemPrompt }] }];
            const responseText = await callGeminiAPI(contents);

            // JSON抽出・パース
            let cleanJsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(cleanJsonStr);

            if (Array.isArray(parsed) && parsed.length >= 5) {
                currentPracticeQuestions = parsed.slice(0, 5);
            } else {
                throw new Error("問題数が5問未満です");
            }
        } catch (e) {
            console.warn("Geminiによる練習問題生成に失敗、フォールバック問題を使用します:", e);
            currentPracticeQuestions = generateFallbackPracticeQuestions(learnedContent);
        }
    } else {
        // APIキーがない場合の模擬生成待ち演出
        await new Promise(resolve => setTimeout(resolve, 1200));
        currentPracticeQuestions = generateFallbackPracticeQuestions(learnedContent);
    }

    // ローディング画面の文言を元に戻す
    if (loadingText) loadingText.textContent = originalH3;
    if (loadingSub) loadingSub.textContent = originalSub;

    // 問題を描画して画面切替
    renderPracticeQuestions(currentPracticeQuestions);
    switchScreen('practice-paper');
}

/**
 * やった内容のキーワードから5問の練習問題をフォールバック生成
 */
function generateFallbackPracticeQuestions(learnedContentText) {
    const text = learnedContentText.toLowerCase();

    // 数学 / 二次関数がテーマの場合
    if (text.includes('数学') || text.includes('二次関数') || text.includes('頂点') || text.includes('平方完成')) {
        return [
            {
                id: 1,
                title: "二次関数 $y = (x - 3)^2 - 4$ の頂点の座標を求めよ。",
                type: "choice",
                options: ["$(3, -4)$", "$(-3, -4)$", "$(3, 4)$", "$(-3, 4)$"],
                answer: "$(3, -4)$",
                explanation: "$y = a(x - p)^2 + q$ の頂点は $(p, q)$ です。したがって $(3, -4)$ が正解です。"
            },
            {
                id: 2,
                title: "$x^2 - 6x$ を平方完成した正しい形を選べ。",
                type: "choice",
                options: ["$(x - 3)^2 - 9$", "$(x - 3)^2 + 9$", "$(x - 6)^2 - 36$", "$(x - 3)^2 - 6$"],
                answer: "$(x - 3)^2 - 9$",
                explanation: "$x$の係数 $-6$ の半分は $-3$ です。$(x - 3)^2 - (-3)^2 = (x - 3)^2 - 9$ と変形します。"
            },
            {
                id: 3,
                title: "二次関数 $y = -2(x + 1)^2 + 5$ のグラフの軸の方程式を選べ。",
                type: "choice",
                options: ["$x = -1$", "$x = 1$", "$y = 5$", "$x = -2$"],
                answer: "$x = -1$",
                explanation: "$y = a(x - p)^2 + q$ の軸は $x = p$ です。$y = -2(x - (-1))^2 + 5$ より軸は $x = -1$ です。"
            },
            {
                id: 4,
                title: "二次関数 $y = ax^2 + bx + c$ において、$a < 0$ のときグラフの形状はどのようになるか？",
                type: "choice",
                options: ["上に凸（山型）", "下に凸（谷型）", "直線", "右上がりの直線"],
                answer: "上に凸（山型）",
                explanation: "$x^2$の係数 $a$ が負($a < 0$)のとき、グラフは上に凸（山型）になります。"
            },
            {
                id: 5,
                title: "二次関数 $y = x^2 - 4x + 5$ の $y$切片（$x=0$のときの$y$の値）を求めよ。",
                type: "choice",
                options: ["$5$", "$-4$", "$1$", "$0$"],
                answer: "$5$",
                explanation: "$x = 0$ を代入すると $y = 0 - 0 + 5 = 5$ となります。"
            }
        ];
    }

    // 漢文 / 国語がテーマの場合
    if (text.includes('漢文') || text.includes('置き字') || text.includes('訓読') || text.includes('国語')) {
        return [
            {
                id: 1,
                title: "漢文における「置き字」（「而」「於」「焉」など）の書き下し文での基本的な扱いは？",
                type: "choice",
                options: ["読まず、書きもしない", "必ずひらがなで書く", "カタカナで音読する", "そのまま漢字で書く"],
                answer: "読まず、書きもしない",
                explanation: "置き字は漢文の構造上置かれますが、書き下し文では原則として読まず、書きません。"
            },
            {
                id: 2,
                title: "返り点「レ点」の読む順番のルールを選べ。",
                type: "choice",
                options: ["下の一字から上の一字へ戻って読む", "一字飛ばして読む", "上から順に2字読む", "一番下まで降りてから読む"],
                answer: "下の一字から上の一字へ戻って読む",
                explanation: "レ点は直下の一字を読んでから、すぐ上の一字へ戻って読む返り点です。"
            },
            {
                id: 3,
                title: "漢文の否定を表す助字「不」の読み方を選べ。",
                type: "choice",
                options: ["ず", "ならず", "べからず", "なし"],
                answer: "ず",
                explanation: "「不」は書き下し文で「〜ず」と打ち消しで読みます。"
            },
            {
                id: 4,
                title: "漢文を日本語の文法に合わせて読みやすく直した文を何というか？",
                type: "choice",
                options: ["書き下し文", "現代語訳", "白文", "本文"],
                answer: "書き下し文",
                explanation: "仮名交じり文に直し、日本語の語順で読めるようにした文を「書き下し文」と呼びます。"
            },
            {
                id: 5,
                title: "再読文字「未」の訓読での正しい読み方を選べ。",
                type: "choice",
                options: ["いまだ〜ず", "まさに〜せんとす", "よろしく〜べし", "なお〜のごとし"],
                answer: "いまだ〜ず",
                explanation: "「未」は「いまだ（一度目）〜ず（二度目）」と読む再読文字です。"
            }
        ];
    }

    // 英語がテーマの場合
    if (text.includes('英語') || text.includes('過去形') || text.includes('動詞') || text.includes('english')) {
        return [
            {
                id: 1,
                title: "不規則動詞「go」の過去形を選べ。",
                type: "choice",
                options: ["went", "goed", "gone", "going"],
                answer: "went",
                explanation: "go の過去形は went、過去分詞は gone です。"
            },
            {
                id: 2,
                title: "動詞「buy」の過去形を選べ。",
                type: "choice",
                options: ["bought", "buyed", "bring", "brought"],
                answer: "bought",
                explanation: "buy（買う）の過去形は bought です。"
            },
            {
                id: 3,
                title: "「She (   ) to the library yesterday.」の空欄に入る適切な語を選べ。",
                type: "choice",
                options: ["went", "goes", "go", "is going"],
                answer: "went",
                explanation: "yesterday（昨日）があるので過去形 went を使います。"
            },
            {
                id: 4,
                title: "不規則動詞「make」の過去形を選べ。",
                type: "choice",
                options: ["made", "maked", "make", "makes"],
                answer: "made",
                explanation: "make の過去形・過去分詞形は made です。"
            },
            {
                id: 5,
                title: "「write」の過去形・過去分詞の正しい変化を選べ。",
                type: "choice",
                options: ["write - wrote - written", "write - writed - writed", "write - wrote - wrote", "write - write - written"],
                answer: "write - wrote - written",
                explanation: "write の活用は write - wrote - written です。"
            }
        ];
    }

    // 理科・光合成・呼吸がテーマの場合
    if (text.includes('理科') || text.includes('光合成') || text.includes('呼吸') || text.includes('植物')) {
        return [
            {
                id: 1,
                title: "植物が光を受けて二酸化炭素と水から養分（デンプン）と酸素を作る働きを何というか？",
                type: "choice",
                options: ["光合成", "呼吸", "蒸散", "吸収"],
                answer: "光合成",
                explanation: "葉緑体で行われる養分作りの働きを「光合成」と呼びます。"
            },
            {
                id: 2,
                title: "植物の「呼吸」について正しい説明を選べ。",
                type: "choice",
                options: ["昼も夜も常に絶え間なく行っている", "夜間だけ行っている", "昼の光があるときだけ行っている", "呼吸は行わず光合成のみ行う"],
                answer: "昼も夜も常に絶え間なく行っている",
                explanation: "呼吸は生きている限り昼夜を問わず常に行われています。"
            },
            {
                id: 3,
                title: "光合成が行われる細胞内の小機関はどれか？",
                type: "choice",
                options: ["葉緑体", "液胞", "細胞核", "細胞膜"],
                answer: "葉緑体",
                explanation: "植物細胞に含まれる緑色の「葉緑体」で光合成が行われます。"
            },
            {
                id: 4,
                title: "昼間に植物が見かけ上「二酸化炭素を吸収し酸素を出している」ように見える理由は？",
                type: "choice",
                options: ["光合成の量が呼吸の量より圧倒的に多いから", "昼は呼吸を完全停止しているから", "呼吸で酸素を出しているから", "葉の表面から空気を吸わないから"],
                answer: "光合成の量が呼吸の量より圧倒的に多いから",
                explanation: "昼は光合成速度が呼吸速度を大きく上回るため、見かけ上二酸化炭素を吸収し酸素を出します。"
            },
            {
                id: 5,
                title: "植物の葉の裏側に多くあり、気体の出入り口となっている小さな穴を何というか？",
                type: "choice",
                options: ["気孔", "道管", "師管", "孔辺細胞"],
                answer: "気孔",
                explanation: "酸素や二酸化炭素、水蒸気の出入り口となる穴を「気孔」と呼びます。"
            }
        ];
    }

    // デフォルト（総合復習・確認テスト 5問）
    return [
        {
            id: 1,
            title: "【数学】二次関数 $y = (x - 2)^2 + 3$ の頂点の座標を求めよ。",
            type: "choice",
            options: ["$(2, 3)$", "$(-2, 3)$", "$(2, -3)$", "$(-2, -3)$"],
            answer: "$(2, 3)$",
            explanation: "$y = a(x - p)^2 + q$ の頂点は $(p, q)$ です。$(2, 3)$ が正解です。"
        },
        {
            id: 2,
            title: "【国語】漢文の「置き字」は、書き下し文にする際どのように処理するか？",
            type: "choice",
            options: ["原則として読まず、書きもしない", "ひらがなで必ず書く", "一番最後にまとめて読む", "カッコをつけて残す"],
            answer: "原則として読まず、書きもしない",
            explanation: "置き字は漢文の文法上存在しますが、日本語として読む書き下し文では無視します。"
        },
        {
            id: 3,
            title: "【英語】動詞「go」の過去形を選べ。",
            type: "choice",
            options: ["went", "gone", "goed", "going"],
            answer: "went",
            explanation: "go の過去形は went です。"
        },
        {
            id: 4,
            title: "【理科】植物が光を受けて養分と酸素を作る反応を何というか？",
            type: "choice",
            options: ["光合成", "呼吸", "蒸散", "消化"],
            answer: "光合成",
            explanation: "葉緑体で光エネルギーを使って養分を作る働きは「光合成」です。"
        },
        {
            id: 5,
            title: "【社会】雨が非常に少なく、蒸発量が降水量を上回る気候帯はどこか？",
            type: "choice",
            options: ["乾燥帯", "温帯", "熱帯", "寒帯"],
            answer: "乾燥帯",
            explanation: "降水量より蒸発量が多く、樹木が育ちにくい気候区分は「乾燥帯」です。"
        }
    ];
}

/**
 * 問題文の整形（タイトル内の重複選択肢除去）
 */
function cleanQuestionTitle(rawTitle, options = []) {
    if (!rawTitle) return '';
    let title = rawTitle.trim();

    // 先頭の 【問 1】 や 問1. などを除去
    title = title.replace(/^【問\s*\d+】\s*/, '').replace(/^問\s*\d+[:\.\s]\s*/, '').trim();

    // 問題文末尾に A.〜, B.〜 などの選択肢リストが連結されている場合を分離・除去
    title = title.replace(/\n\s*([A-Da-d1-4①-④]\.|\([A-Da-d1-4①-④]\)|[①-④])[\s\S]*$/m, '').trim();

    if (Array.isArray(options) && options.length > 0) {
        for (const opt of options) {
            const cleanOpt = opt.replace(/^[A-Da-d1-4①-④][\.\)\s]*/, '').trim();
            if (cleanOpt.length >= 2 && title.includes(cleanOpt)) {
                const optIdx = title.indexOf(cleanOpt);
                if (optIdx > title.length * 0.35) {
                    const candidate = title.substring(0, optIdx).replace(/[\s\n\(\[A-Da-d1-4①-④\.\:：]+$/, '').trim();
                    if (candidate.length >= 4) {
                        title = candidate;
                        break;
                    }
                }
            }
        }
    }

    return title;
}

/**
 * 選択肢のラジオ選択ハイライト
 */
function highlightSelectedChoice(radioEl) {
    if (!radioEl) return;
    const name = radioEl.name;
    const allInGroup = document.querySelectorAll(`input[name="${name}"]`);
    allInGroup.forEach(r => {
        const card = r.closest('.choice-option-card');
        if (card) {
            if (r.checked) {
                card.classList.add('selected');
            } else {
                card.classList.remove('selected');
            }
        }
    });
}

/**
 * 5問の練習問題を画面(practice-questions-container)へレンダリング
 */
function renderPracticeQuestions(questions) {
    const container = document.getElementById('practice-questions-container');
    if (!container) return;

    // 日付の設定
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const dateEl = document.getElementById('practice-date');
    if (dateEl) dateEl.textContent = `${yyyy}/${mm}/${dd}`;

    // サブタイトルの設定
    const subTitle = document.getElementById('practice-topic-subtitle');
    if (subTitle) {
        subTitle.textContent = `🎯 今回の解説授業で学んだポイントの復習テスト（全5問・各20点）`;
    }

    // 出題元ノート画像プレビュー（一番上）
    const practiceNoteBox = document.getElementById('practice-note-preview-box');
    const practiceNoteImg = document.getElementById('practice-note-img');
    const teachingPreview = document.getElementById('teaching-image-preview');
    if (practiceNoteBox && practiceNoteImg) {
        if (teachingPreview && teachingPreview.src && teachingPreview.src.startsWith('data:')) {
            practiceNoteImg.src = teachingPreview.src;
            practiceNoteBox.classList.remove('hidden');
        } else {
            practiceNoteBox.classList.add('hidden');
        }
    }

    // スコアスタンプ非表示＆リセット
    const scoreDisplay = document.getElementById('practice-score-display');
    if (scoreDisplay) scoreDisplay.classList.add('hidden');

    const gradeBtn = document.getElementById('grade-practice-btn');
    const finishBtn = document.getElementById('finish-practice-btn');
    if (gradeBtn) gradeBtn.classList.remove('hidden');
    if (finishBtn) finishBtn.classList.add('hidden');

    let html = '';

    questions.forEach((q, idx) => {
        const qNum = idx + 1;
        const cleanTitle = cleanQuestionTitle(q.title, q.options);
        const titleHtml = renderMathFormulas(processInlineMarkdown(escapeHtml(cleanTitle)));

        html += `
            <div class="test-question-item" id="pq-item-${qNum}" style="margin-bottom: 28px; padding-bottom: 24px; border-bottom: 1px dashed rgba(0,0,0,0.12);">
                <div class="q-title" style="font-size: 1.05rem; font-weight: 700; margin-bottom: 14px; line-height: 1.7; color: var(--text-color);">
                    <span class="q-num" style="color: var(--accent-blue); font-weight: 800; margin-right: 6px;">【問 ${qNum}】</span> ${titleHtml} <span class="q-points" style="font-size: 0.85rem; color: #7f8c8d; font-weight: normal; margin-left: 4px;">（20点）</span>
                </div>
        `;

        if (q.type === 'choice' && Array.isArray(q.options)) {
            html += `<div class="choice-options-list">`;
            q.options.forEach((opt, optIdx) => {
                const radioId = `pq_${qNum}_opt_${optIdx}`;
                const formattedOpt = renderMathFormulas(processInlineMarkdown(escapeHtml(opt)));
                html += `
                    <label class="choice-option-card" for="${radioId}">
                        <input type="radio" name="pq_ans_${qNum}" id="${radioId}" value="${escapeHtml(opt)}" class="choice-radio-input" onchange="highlightSelectedChoice(this)">
                        <span class="choice-option-text">${formattedOpt}</span>
                    </label>
                `;
            });
            html += `</div>`;
        } else {
            // テキスト入力形式
            html += `
                <div class="q-answer-area">
                    <span style="font-weight: 600; color: #546e7a;">答：</span>
                    <input type="text" id="pq_ans_text_${qNum}" placeholder="解答を入力してください" class="q-input-long">
                </div>
            `;
        }

        const formattedExplanation = renderMathFormulas(processInlineMarkdown(escapeHtml(q.explanation || '')));
        const formattedAnswer = renderMathFormulas(processInlineMarkdown(escapeHtml(q.answer || '')));

        // フィードバック＆解説エリア（初期非表示）
        html += `
                <div class="q-feedback hidden" id="pq-feedback-${qNum}">
                    <div class="feedback-header">
                        <span class="grade-mark mark-correct">◯</span>
                        <strong class="grade-text" style="font-size: 0.98rem; color: var(--text-color);">【正解】: ${formattedAnswer}</strong>
                    </div>
                    <div class="q-explanation">
                        <strong style="color: #475569;">【解説】</strong><br>
                        ${formattedExplanation}
                    </div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

let lastWakaruAdvice = '';

/**
 * 練習問題の採点
 */
async function gradePracticeTest() {
    if (!currentPracticeQuestions || currentPracticeQuestions.length === 0) return;

    let totalScore = 0;
    const resultsSummary = [];

    currentPracticeQuestions.forEach((q, idx) => {
        const qNum = idx + 1;
        let userAns = '';

        if (q.type === 'choice') {
            const selectedRadio = document.querySelector(`input[name="pq_ans_${qNum}"]:checked`);
            if (selectedRadio) {
                userAns = selectedRadio.value.trim();
            }
        } else {
            const textInput = document.getElementById(`pq_ans_text_${qNum}`);
            if (textInput) {
                userAns = textInput.value.trim();
            }
        }

        // 正誤判定（完全一致または部分一致）
        const isCorrect = checkPracticeAnswer(userAns, q.answer);
        if (isCorrect) {
            totalScore += 20;
        }

        resultsSummary.push({
            num: qNum,
            title: q.title,
            isCorrect: isCorrect,
            userAns: userAns || '未入力',
            correctAns: q.answer
        });

        // フィードバックの表示
        const feedbackEl = document.getElementById(`pq-feedback-${qNum}`);
        if (feedbackEl) {
            feedbackEl.classList.remove('hidden');
            const markEl = feedbackEl.querySelector('.grade-mark');
            const textEl = feedbackEl.querySelector('.grade-text');
            if (markEl) {
                markEl.textContent = isCorrect ? '◯' : '✕';
                markEl.className = isCorrect ? 'grade-mark mark-correct' : 'grade-mark mark-incorrect';
            }
            if (textEl) {
                const formattedAnswer = renderMathFormulas(processInlineMarkdown(escapeHtml(q.answer || '')));
                textEl.innerHTML = isCorrect ? `正解！（+20点）` : `不正解（【正解】: ${formattedAnswer}）`;
                textEl.style.color = isCorrect ? '#27ae60' : '#c0392b';
            }
        }

        // 入力を無効化
        const radios = document.querySelectorAll(`input[name="pq_ans_${qNum}"]`);
        radios.forEach(r => r.disabled = true);
        const textInput = document.getElementById(`pq_ans_text_${qNum}`);
        if (textInput) textInput.readOnly = true;
    });

    // スコアの表示
    const scoreVal = document.getElementById('practice-score-val');
    if (scoreVal) scoreVal.textContent = totalScore;

    const scoreDisplay = document.getElementById('practice-score-display');
    if (scoreDisplay) scoreDisplay.classList.remove('hidden');

    // ボタン切り替え
    const gradeBtn = document.getElementById('grade-practice-btn');
    const finishBtn = document.getElementById('finish-practice-btn');
    if (gradeBtn) gradeBtn.classList.add('hidden');
    if (finishBtn) finishBtn.classList.remove('hidden');

    // 📊 これまでの学習統計＆成長データの算出と即時レンダリング
    const currentSubject = (currentSessionTopic && currentSessionTopic.subject) ? currentSessionTopic.subject : '数学';
    renderLearningStats(totalScore, currentSubject, 'practice-stats-box');

    // 🤖 わかるくんからのアドバイスを非同期で生成・表示
    generateWakaruAdvice(totalScore, resultsSummary);
}

/**
 * わかるくんからのアドバイスを生成（15個の設定プロファイル完全反映）
 */
async function generateWakaruAdvice(totalScore, resultsSummary) {
    const adviceBox = document.getElementById('wakaru-advice-box');
    const adviceTextEl = document.getElementById('wakaru-advice-text');
    if (!adviceBox || !adviceTextEl) return;

    adviceBox.classList.remove('hidden');
    adviceTextEl.innerHTML = '<span style="color:#7f8c8d;">🤖 わかるくんがあなたの回答と設定を元にアドバイスを考えています...</span>';

    const apiKey = localStorage.getItem('gemini-api-key');
    const profilePrompt = buildAISystemPromptProfile();

    let adviceContent = '';

    if (apiKey) {
        try {
            const prompt = `あなたはAI学習アシスタント「わかるくん」です。
ユーザーが練習問題5問を解き終えて採点が完了しました。

【実施結果】
- 得点: ${totalScore} / 100 点
- 問題正誤詳細: ${JSON.stringify(resultsSummary)}

${profilePrompt}

【アドバイス作成指示】
- 設定プロファイルで指定された【口調・トーン・褒め方・長さ・厳しさ・キャラクター性・熱量・例え話】を【100%徹底して表現】してください。
- 得点（${totalScore}点）に応じた労い、良かった点、間違えた問題の復習アドバイス、次への励ましを親身に記述してください。
- 150文字〜250文字程度で、読んだユーザーのモチベーションが最高になるアドバイスにしてください。`;

            const contents = [{ role: 'user', parts: [{ text: prompt }] }];
            const resText = await callGeminiAPI(contents);
            adviceContent = resText;
        } catch (e) {
            console.warn("Geminiによるアドバイス生成に失敗、設定反映型フォールバックアドバイスを使用します:", e);
            adviceContent = generateFallbackWakaruAdvice(totalScore);
        }
    } else {
        await new Promise(r => setTimeout(r, 600));
        adviceContent = generateFallbackWakaruAdvice(totalScore);
    }

    lastWakaruAdvice = adviceContent;
    adviceTextEl.innerHTML = convertMarkdownToHtml(adviceContent);
}

/**
 * 設定反映型フォールバックアドバイス生成
 */
function generateFallbackWakaruAdvice(totalScore) {
    const tone = parseInt(localStorage.getItem('tone-preference') || '50', 10);
    const praise = parseInt(localStorage.getItem('praise-preference') || '50', 10);
    const strictness = parseInt(localStorage.getItem('strictness-preference') || '50', 10);
    const energy = parseInt(localStorage.getItem('energy-preference') || '50', 10);

    const isCasual = tone >= 55;
    const isHonest = tone <= 45;
    const isPraise = praise >= 55;
    const isStrict = strictness >= 55;
    const isEnergy = energy >= 55;

    let text = "";

    if (isCasual) {
        text += `練習問題お疲れさま！得点は **${totalScore}点** だよ！${isEnergy ? '🔥💪' : '✨'}\n`;
        if (totalScore === 100) {
            text += `${isPraise ? '全問正解！！すごすぎるぜ！完璧な理解度だね！🎉✨' : '全問正解！ノートの解き方がしっかり身についてるよ。'}\nこの調子でガンガン進もう！`;
        } else if (totalScore >= 60) {
            text += `${isPraise ? 'よく頑張ったね！ナイスファイト！👏' : '合格点クリアだよ。'}\n${isStrict ? 'でも間違えたところは絶対に放置しちゃダメだよ！解説をチェックして復習しておこう！' : '間違えた問題の解説をチェックして、次回は満点を狙っちゃおう！'}`;
        } else {
            text += `${isEnergy ? '最後まであきらめずに解ききって燃えたぜ！🔥' : '最後まで挑戦してえらい！'}\n${isStrict ? '悔しい結果だけど甘えは禁物！間違えたところをノートで見直して絶対リベンジしよう！' : '落ち込まなくて大丈夫！間違えた分だけ伸びしろがあるからね！一緒に復習しよう！'}`;
        }
    } else if (isHonest) {
        text += `練習問題5問のお取り組み、誠にお疲れ様でございました。得点は **${totalScore}点** でございます。\n`;
        if (totalScore >= 80) {
            text += `${isPraise ? '大変素晴らしい成果でございます！完璧な定着度でございますね。🎉' : '学習内容がしっかりと定着されております。'}\n次回もこの調子で励んでまいりましょう。`;
        } else {
            text += `全力を尽くされた姿勢が大変立派でございます。\n${isStrict ? '不正解となった項目は重要な復習ポイントでございます。解説を熟読の上、確実な定着を図りましょう。' : '解説をご確認いただき、次回へ向けて復習なさってくださいませ。'}`;
        }
    } else {
        text += `練習問題お疲れ様でした！今回の得点は **${totalScore}点** です。🤖\n`;
        if (totalScore >= 80) {
            text += `${isPraise ? '素晴らしい！大正解連発で完璧ですね！🎉' : 'しっかり理解できていて素晴らしい結果です。'}\n復習を継続して、知識を自分のものにしていきましょう！`;
        } else {
            text += `最後まで解ききって素晴らしいチャレンジでした！\n${isStrict ? '間違えた部分は要復習ポイントです！解説を熟読して確実に理解しましょう。' : '間違えた部分も解説を見直せばすぐにできるようになりますよ！応援しています！'}`;
        }
    }

    return text;
}

/**
 * 解答判定ヘルパー
 */
function checkPracticeAnswer(userAns, targetAns) {
    if (!userAns) return false;
    const u = userAns.toLowerCase().trim();
    const t = targetAns.toLowerCase().trim();

    if (u === t) return true;
    const cleanU = u.replace(/\s+/g, '');
    const cleanT = t.replace(/\s+/g, '');
    if (cleanU === cleanT) return true;

    if (cleanT.startsWith(cleanU) || cleanU.startsWith(cleanT)) return true;

    return false;
}

/**
 * 練習問題終了・履歴への保存
 */
function finishPracticeTest() {
    saveWakaruSessionAndReturnHome();
}

// ==========================================
// 📊 学習統計＆成長データ計算・描画システム
// ==========================================

/**
 * これまでの学習履歴から総合統計・推移データを計算
 */
function calculateLearningStats(currentScore, currentSubject = '数学') {
    const pastScores = [];
    const subjectMap = {};
    const scoreNum = Math.max(0, Math.min(100, parseInt(currentScore, 10) || 0));

    // 過去履歴からスコアを抽出
    if (Array.isArray(dummyHistory)) {
        dummyHistory.forEach(item => {
            let itemScore = null;
            if (item.title) {
                const match = item.title.match(/(\d+)\s*点/);
                if (match) itemScore = parseInt(match[1], 10);
            }
            if (itemScore === null && Array.isArray(item.chat)) {
                for (const c of item.chat) {
                    const cm = c.text && c.text.match(/(\d+)\s*\/\s*100\s*点/);
                    if (cm) {
                        itemScore = parseInt(cm[1], 10);
                        break;
                    }
                }
            }

            if (itemScore !== null && !isNaN(itemScore)) {
                const subj = item.subject || '数学';
                pastScores.push({
                    score: itemScore,
                    date: item.date || '過去',
                    subject: subj
                });

                if (!subjectMap[subj]) {
                    subjectMap[subj] = { count: 0, totalScore: 0 };
                }
                subjectMap[subj].count += 1;
                subjectMap[subj].totalScore += itemScore;
            }
        });
    }

    // 過去の古い順に並べ替え、末尾に今回のテストを追加
    const chronologicalScores = [...pastScores.reverse(), {
        score: scoreNum,
        date: '今回',
        subject: currentSubject
    }];

    // 現在の教科統計にも反映
    if (!subjectMap[currentSubject]) {
        subjectMap[currentSubject] = { count: 0, totalScore: 0 };
    }
    subjectMap[currentSubject].count += 1;
    subjectMap[currentSubject].totalScore += scoreNum;

    const totalTests = chronologicalScores.length;
    const sumAll = chronologicalScores.reduce((sum, item) => sum + item.score, 0);
    const avgScore = Math.round((sumAll / totalTests) * 10) / 10;
    const maxScore = Math.max(...chronologicalScores.map(s => s.score));

    // 前回との差分
    let diffScore = 0;
    let diffText = '初回の演習完了！🎉';
    if (chronologicalScores.length >= 2) {
        const prev = chronologicalScores[chronologicalScores.length - 2].score;
        diffScore = scoreNum - prev;
        if (diffScore > 0) {
            diffText = `前回(+${diffScore}点)より向上！📈`;
        } else if (diffScore === 0) {
            diffText = `前回と同スコアをキープ！💪`;
        } else {
            diffText = `前回比 ${diffScore}点。次は挽回！🔥`;
        }
    }

    return {
        currentScore: scoreNum,
        totalTests,
        avgScore,
        maxScore,
        diffScore,
        diffText,
        recentScores: chronologicalScores.slice(-5), // 直近5件
        subjectStats: subjectMap
    };
}

/**
 * 統計データUIをDOMに描画
 */
function renderLearningStats(currentScore, currentSubject = '数学', containerId = 'practice-stats-box') {
    const stats = calculateLearningStats(currentScore, currentSubject);
    const statsBox = document.getElementById(containerId);
    if (!statsBox) return;

    let badgeText = '📈 スコア急上昇中！';
    let badgeColor = '#059669';
    let badgeBg = '#ecfdf5';

    if (stats.diffScore > 0) {
        badgeText = '📈 スコア急上昇中！';
        badgeColor = '#059669';
        badgeBg = '#ecfdf5';
    } else if (stats.currentScore >= 90) {
        badgeText = '🔥 連続ハイスコア達成！';
        badgeColor = '#7c3aed';
        badgeBg = '#f5f3ff';
    } else if (stats.totalTests === 1) {
        badgeText = '✨ 初演習おめでとう！';
        badgeColor = '#2563eb';
        badgeBg = '#eff6ff';
    } else {
        badgeText = '💪 着実に復習継続中！';
        badgeColor = '#0284c7';
        badgeBg = '#f0f9ff';
    }

    // 直近スコア推移バーチャート生成
    let barsHtml = '';
    stats.recentScores.forEach((item, idx) => {
        const isCurrent = (idx === stats.recentScores.length - 1);
        const label = isCurrent ? '今回' : (item.date ? item.date.slice(5) : `${idx + 1}回目`);
        const heightPercent = Math.max(14, item.score);
        barsHtml += `
            <div class="score-bar-column">
                <span class="score-bar-value">${item.score}点</span>
                <div class="score-bar-pillar ${isCurrent ? 'current' : ''}" style="height: ${heightPercent}%;" title="${item.subject || ''} ${item.score}点"></div>
                <span class="score-bar-label">${label}</span>
            </div>
        `;
    });

    // 教科別プログレスバー生成
    let masteryHtml = '';
    const subjectIcons = {
        '数学': '📐',
        '英語': '🔤',
        '理科': '🧪',
        '社会': '🏛️',
        '国語': '📖',
        '総合': '📚'
    };

    const subjects = Object.keys(stats.subjectStats);
    if (subjects.length === 0) {
        subjects.push(currentSubject);
        stats.subjectStats[currentSubject] = { count: 1, totalScore: stats.currentScore };
    }

    subjects.forEach(subj => {
        const sData = stats.subjectStats[subj];
        const sAvg = Math.round(sData.totalScore / sData.count);
        const icon = subjectIcons[subj] || '📚';
        masteryHtml += `
            <div class="subject-mastery-item">
                <div class="subject-mastery-header">
                    <span>${icon} ${subj}</span>
                    <span>平均 ${sAvg}点（${sData.count}回実施）</span>
                </div>
                <div class="mastery-progress-track">
                    <div class="mastery-progress-fill" style="width: ${sAvg}%;"></div>
                </div>
            </div>
        `;
    });

    statsBox.innerHTML = `
        <div class="stats-box-header">
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 1.8rem;">📊</span>
                <div>
                    <h3 style="font-size: 1.15rem; font-weight: 800; color: #1e293b; margin: 0;">これまでの学習統計 ＆ 成長レポート</h3>
                    <p style="font-size: 0.8rem; color: #64748b; margin: 0;">過去の記録・テストと比較したあなたの成果</p>
                </div>
            </div>
            <span class="stats-trend-badge" style="color: ${badgeColor}; background: ${badgeBg}; border-color: ${badgeColor}33;">${badgeText}</span>
        </div>

        <!-- 4つのメイン指標カード -->
        <div class="stats-metrics-grid">
            <div class="metric-card">
                <span class="metric-label">🎯 今回のスコア</span>
                <div class="metric-value-row">
                    <span class="metric-val primary">${stats.currentScore}</span>
                    <span class="metric-sub">/ 100点</span>
                </div>
                <span class="metric-subtext">正答率: ${stats.currentScore}% (${Math.round(stats.currentScore / 20)}/5問)</span>
            </div>

            <div class="metric-card">
                <span class="metric-label">📈 通算平均スコア</span>
                <div class="metric-value-row">
                    <span class="metric-val">${stats.avgScore}</span>
                    <span class="metric-sub">点</span>
                </div>
                <span class="metric-subtext">累計 ${stats.totalTests} 回実施</span>
            </div>

            <div class="metric-card">
                <span class="metric-label">🔥 前回との比較</span>
                <div class="metric-value-row">
                    <span class="metric-val ${stats.diffScore >= 0 ? 'positive' : ''}">${stats.diffScore >= 0 ? '+' : ''}${stats.diffScore}</span>
                    <span class="metric-sub">点</span>
                </div>
                <span class="metric-subtext">${stats.diffText}</span>
            </div>

            <div class="metric-card">
                <span class="metric-label">🏆 過去最高スコア</span>
                <div class="metric-value-row">
                    <span class="metric-val text-gold">${stats.maxScore}</span>
                    <span class="metric-sub">点</span>
                </div>
                <span class="metric-subtext">通算正答率: ${stats.avgScore}%</span>
            </div>
        </div>

        <!-- スコア推移グラフ & 教科別分布 -->
        <div class="stats-visual-row">
            <!-- 最近のスコア推移バーチャート -->
            <div class="stats-chart-card">
                <h4 class="chart-card-title">📈 最近のスコア推移（直近5回）</h4>
                <div class="score-bars-container">
                    ${barsHtml}
                </div>
            </div>

            <!-- 教科別の習熟度・実施回数 -->
            <div class="stats-chart-card">
                <h4 class="chart-card-title">📚 教科別の習熟度・演習回数</h4>
                <div class="subject-mastery-list">
                    ${masteryHtml}
                </div>
            </div>
        </div>
    `;

    statsBox.classList.remove('hidden');
    statsBox.style.display = 'flex';
}

