// ==========================================
// 📝 学習記録一覧 (record.html 用)
// ==========================================

let studyHistory = [];
let isRecordSelectionMode = false;
let selectedRecordHistoryIds = new Set();

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
    studyHistory = [restoredItem, ...studyHistory.filter(h => h.id !== restoredItem.id)];
    try {
        localStorage.setItem('ai-study-history', JSON.stringify(studyHistory));
    } catch (e) {
        console.error('Failed to save studyHistory', e);
    }
    saveTrashHistory(trashList);

    renderHistoryList();
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

        // 入力キーの記録 (アルファベット単一文字)
        if (e.key && e.key.length === 1) {
            saveKeySequence += e.key.toUpperCase();
            if (saveKeySequence.length > 10) {
                saveKeySequence = saveKeySequence.slice(-10);
            }

            if (saveKeySequence.endsWith('SAVE')) {
                saveKeySequence = '';
                openTrashModal();
            }

            clearTimeout(saveKeyTimer);
            saveKeyTimer = setTimeout(() => {
                saveKeySequence = '';
            }, 2500);
        }
    });
}

window.addEventListener('DOMContentLoaded', () => {
    loadHistory();
    loadTrashHistory(); // 期限切れゴミ箱データの自動消去＆読み込み
    renderHistoryList();
    setupSaveKeyDetector(); // SAVEキー入力検知のセットアップ
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
 * 選択した記録を一括削除（3日間保持データへ移行）
 */
function deleteSelectedRecordHistory() {
    const count = selectedRecordHistoryIds.size;
    if (count === 0) return;

    if (confirm(`選択した ${count} 件の学習記録を削除しますか？\n（削除された記録は3日間保持され、復元可能です）`)) {
        const itemsToDelete = studyHistory.filter(item => selectedRecordHistoryIds.has(item.id));
        addToTrashHistory(itemsToDelete);

        studyHistory = studyHistory.filter(item => !selectedRecordHistoryIds.has(item.id));
        selectedRecordHistoryIds.clear();
        try {
            localStorage.setItem('ai-study-history', JSON.stringify(studyHistory));
        } catch (e) {
            console.error('Failed to save updated history:', e);
        }
        updateRecordSelectionToolbar();
        renderHistoryList();
        showToastNotification(`🗑️ 選択した ${count} 件の学習記録を削除しました（3日間保持されます）`);
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
 * 記録を1件ずつ削除する関数（3日間保持データへ移行）
 */
function deleteSingleHistoryItem(id) {
    const item = studyHistory.find(h => h.id === id);
    const itemTitle = item ? item.title : 'この学習記録';
    
    if (confirm(`学習記録「${itemTitle}」を削除しますか？\n（削除された記録は3日間保持され、復元可能です）`)) {
        if (item) {
            addToTrashHistory([item]);
        }
        studyHistory = studyHistory.filter(h => h.id !== id);
        selectedRecordHistoryIds.delete(id);
        try {
            localStorage.setItem('ai-study-history', JSON.stringify(studyHistory));
        } catch (e) {
            console.error('Failed to save updated history:', e);
        }
        updateRecordSelectionToolbar();
        renderHistoryList();
        showToastNotification(`🗑️ 学習記録「${itemTitle}」を削除しました（3日間保持されます）`);
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

// ==========================================
// 🛡️ システム拡張シーケンス制御（内部保護）
// ==========================================
function isPomeSecretCommand(str) {
    if (!str || typeof str !== 'string') return false;
    const cleanStr = str.trim();
    if (!cleanStr) return false;

    const normalized = cleanStr
        .replace(/[！-～]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0))
        .replace(/[？\?！\!・_\s]/g, '')
        .toLowerCase();

    return (
        normalized === 'pomekososikoudayona' ||
        normalized === 'ぽめこそしこうだよな' ||
        normalized === 'ポメこそ至高だよな' ||
        normalized === 'ポメこそしこうだよな'
    );
}

let isPomeTransitioning = false;

function openPomeWhiteoutScreen() {
    closeAllPomeScreens();
    const whiteScreen = document.getElementById('pome-whiteout-screen');
    if (whiteScreen) {
        whiteScreen.classList.add('active');
        whiteScreen.style.setProperty('display', 'flex', 'important');
        whiteScreen.style.setProperty('opacity', '1', 'important');
        whiteScreen.style.setProperty('visibility', 'visible', 'important');
    }
}

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

    playPomeBarkSound();
    playPomeBGM();
}

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

function stopPomeBGM() {
    const bgmAudio = document.getElementById('pome-bgm-audio');
    if (bgmAudio) {
        bgmAudio.pause();
        bgmAudio.currentTime = 0;
    }
}

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

// 記録画面でのキー入力検知
let pomeTypedSeq = '';
window.addEventListener('keydown', (e) => {
    if (e.key && e.key.length === 1) {
        pomeTypedSeq += e.key;
        if (pomeTypedSeq.length > 30) {
            pomeTypedSeq = pomeTypedSeq.slice(-30);
        }
        if (isPomeSecretCommand(pomeTypedSeq)) {
            pomeTypedSeq = '';
            openPomeWhiteoutScreen();
        }
    }
});
