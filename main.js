// ==========================================
// 📝 データと初期設定
// ===========================// デフォルトの履歴データ（サンプルデータは削除し、実際にやったことのみ記録されます）
const defaultHistory = [];

let dummyHistory = [];

// ==========================================
// 💾 ローカルストレージ連携
// ==========================================
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
    if (!String(item.id).startsWith('h_session_')) {
        const sampleTitles = [
            '漢文の訓読',
            '二次関数のグラフ',
            '植物の呼吸',
            '世界の気候区分',
            '不規則動詞の過去形',
            '数学：二次関数の最大・最小',
            '数学：二次関数の基礎計算',
            '二次関数'
        ];
        if (item.title && sampleTitles.some(st => item.title.includes(st))) {
            return true;
        }
    }
    return false;
}

function loadHistory() {
    const versionKey = 'ai-study-history-v3';
    const isUpgraded = localStorage.getItem(versionKey);

    if (!isUpgraded) {
        // バージョン更新に伴い過去の全データを完全に削除し、まっさらな状態からスタート
        localStorage.removeItem('ai-study-history');
        localStorage.setItem(versionKey, 'true');
        dummyHistory = [];
        saveHistory();
        return;
    }

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
    saveHistory();
}

function saveHistory() {
    try {
        localStorage.setItem('ai-study-history', JSON.stringify(dummyHistory));
    } catch (e) {
        console.error('Failed to save history to localStorage:', e);
        if (e.name === 'QuotaExceededError' || e.code === 22) {
            // ストレージ容量オーバー時は、古い履歴の画像データを削ってテキストログを確実に保持する
            try {
                const compactHistory = dummyHistory.map((item, idx) => {
                    if (idx > 0 && item.image) {
                        return { ...item, image: null };
                    }
                    return item;
                });
                localStorage.setItem('ai-study-history', JSON.stringify(compactHistory));
            } catch (err2) {
                console.error('Secondary save attempt failed:', err2);
            }
        }
    }
}

let currentFilter = 'すべて';
let searchQuery = '';

window.addEventListener('DOMContentLoaded', () => {
    loadHistory();
    renderHistory();
    switchPlanTime(5); // 初期は5分プランにセット
    loadSettings();    // 設定のロード
    setupDragAndDrop(); // ドラッグ＆ドロップ機能のセットアップ
    
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
    
    const filteredData = dummyHistory.filter(item => {
        const matchSubject = (currentFilter === 'すべて' || item.subject === currentFilter);
        const titleText = item.title.toLowerCase();
        const searchText = searchQuery.toLowerCase().trim();
        const matchKeyword = titleText.indexOf(searchText) !== -1;
        
        return matchSubject && matchKeyword;
    });
    
    if (filteredData.length === 0) {
        emptyMessage.classList.remove('hidden');
    } else {
        emptyMessage.classList.add('hidden');
        
        filteredData.forEach(item => {
            const card = document.createElement('div');
            card.className = 'history-card-horizontal';
            card.style.cursor = 'pointer';
            card.setAttribute('onclick', `openHistoryChat('${item.id}')`);
            card.innerHTML = `
                <div class="card-icon">${item.icon}</div>
                <div class="card-info">
                    <span class="history-date">📅 ${item.date}</span>
                    <h4 class="history-title">${item.title}</h4>
                </div>
            `;
            historyList.appendChild(card);
        });
    }
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
// ⌨️ 検索ボックスに入力された時の処理
// ==========================================
function handleSearch() {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchQuery = searchInput.value;
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

// ==========================================
// 🗑️ 選択した写真をクリアする関数
// ==========================================
function clearFileSelect() {
    const fileInput = document.getElementById('upload-input');
    const imagePreview = document.getElementById('image-preview');
    const previewArea = document.getElementById('preview-area');
    const uploadZone = document.getElementById('upload-zone');
    const backButton = document.getElementById('review-back-button');
    
    if (fileInput) fileInput.value = '';
    if (imagePreview) imagePreview.src = '';
    if (previewArea) previewArea.classList.add('hidden');
    if (uploadZone) uploadZone.classList.remove('hidden');
    if (backButton) backButton.classList.remove('hidden');
}

// ==========================================
// 🚀 復習を開始する関数
// ==========================================
function startReviewProcess() {
    const apiKey = localStorage.getItem('gemini-api-key');
    
    // ローディング画面に切り替え
    switchScreen('loading');
    
    const imagePreview = document.getElementById('image-preview');
    const teachingPreview = document.getElementById('teaching-image-preview');
    
    // プレビュー画像を解説画面に引き継ぐ
    if (imagePreview && teachingPreview) {
        teachingPreview.src = imagePreview.src;
    }
    
    // フォームのリセット
    const chatInput = document.getElementById('chat-question-input');
    if (chatInput) chatInput.value = '';
    
    const chatLog = document.getElementById('ai-chat-log');
    
    const rawApiKey = localStorage.getItem('gemini-api-key') || '';
    const apiKey = rawApiKey.trim();

    if (apiKey) {
        // 15個のカスタマイズプロファイルを生成
        const aiProfilePrompt = buildAISystemPromptProfile();

        const hasValidImage = imagePreview && imagePreview.src && imagePreview.src.startsWith('data:');

        let systemPrompt = '';
        const parts = [];

        if (hasValidImage) {
            const base64Data = imagePreview.src.split(',')[1];
            const mimeType = imagePreview.src.split(';')[0].split(':')[1] || 'image/jpeg';

            systemPrompt = `あなたは親切でわかりやすい学習アシスタント「わかるくん」です。
ユーザーがアップロードした勉強用ノート（またはプリント・教科書などの画像）を読み取り、生徒が深く理解できるように丁寧に解説授業を行ってください。

${aiProfilePrompt}

【絶対に守るべき必須解説指示】
1. 📸 【写真の内容を網羅して丁寧に教える】：
   - 写真に写っているノートやプリントの文字・問題・板書・公式・図表・要点をしっかりと読み取り、写真の内容をほぼ漏れなく、ステップごとに分かりやすく解説してください。
   - 単なる数行の短い概要で終わらせず、「このノートに書かれているポイント」「重要公式や定義の解説」「解法の流れや考え方のコツ」を生徒がスラスラ理解できるように具体的に教えてください。

2. ❓ 【最後に必ず質問・問いかけを行う】：
   - 解説の最後には、必ず生徒の理解を深めるための「確認の問いかけ・ミニ質問（例：〜の場合はどうなると思う？）」を1つ投げかけるか、または「ここまでで分からない所や、もっと詳しく聞きたい質問はある？何でも聞いてね！」と優しく質問の有無を尋ねて対話を促してください。

3. 🎨 【フォーマットとキャラクター設定の遵守】：
   - Markdown形式（見出し ##、箇条書き、太字、数式など）を使って視認性抜群にレイアウトしてください。
   - ユーザーが設定したキャラクタープロファイル（口調、熱量、褒め方、例え話など）を100%忠実に守ってください。`;

            parts.push({ text: systemPrompt });
            parts.push({
                inline_data: {
                    mime_type: mimeType,
                    data: base64Data
                }
            });
        } else {
            // 画像なしでテキスト解説を求める場合
            systemPrompt = `あなたは親切でわかりやすい学習アシスタント「わかるくん」です。
生徒に向けて、今日の復習・学習ガイダンスを親身に行ってください。

${aiProfilePrompt}

【解説における指示】
1. 今日勉強したい科目や単元について、生徒が質問しやすいように温かく迎えてください。
2. 最後に必ず「どんな勉強をしているかな？分からない問題や公式があったら何でも質問してね！」と問いかけてください。
3. Markdown形式で見やすく記述してください。`;

            parts.push({ text: systemPrompt });
        }

        const contents = [
            {
                role: 'user',
                parts: parts
            }
        ];

        callGeminiAPI(contents).then((aiText) => {
            if (chatLog) {
                chatLog.innerHTML = `
                    <div class="chat-message ai" style="display: flex; gap: 8px; align-self: flex-start;">
                        <span style="font-size: 1.2rem;">🤖</span>
                        <div>${convertMarkdownToHtml(aiText)}</div>
                    </div>
                `;
            }
            switchScreen('ai-response');
        }).catch((err) => {
            console.error('Gemini Review Error:', err);
            if (chatLog) {
                chatLog.innerHTML = `
                    <div class="chat-message ai" style="display: flex; gap: 8px; align-self: flex-start;">
                        <span style="font-size: 1.2rem;">🤖</span>
                        <div>
                            <p style="color: #e74c3c; font-weight: bold; margin-bottom: 8px;">⚠️ Gemini APIによる解説の取得に失敗しました</p>
                            <p style="font-size: 0.88rem; color: #546e7a; margin-bottom: 10px;">${escapeHtml(err.message)}</p>
                            <div style="font-size: 0.82rem; background: rgba(0,0,0,0.04); padding: 8px 12px; border-radius: 8px;">
                                💡 <strong>対処法:</strong> 右上の「⚙️」設定画面を開き、APIキーが正しいか確認するか、「⚡ 接続テストを実行」ボタンで通信状態をチェックしてください。
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
                        <div>
                            <h3>📖 ノートの内容を解説するよ！（模擬モード）</h3>
                            <p>アップロードされたノートの内容を確認しました！ここに書かれている重要ポイントを教えるね。</p>
                            <ul>
                                <li><strong>基本公式・定義：</strong> ノートに書かれた公式や重要語句の成り立ちと使い方をマスターしよう！</li>
                                <li><strong>解き方のステップ：</strong> 途中の式変形や思考の手順を1つずつ確認して進めるのがコツだよ。</li>
                                <li><strong>よくあるミス：</strong> 符号のミスや条件の見落としに注意しよう！</li>
                            </ul>
                            <p style="margin-top: 10px; font-weight: bold; color: var(--accent-purple);">💬 ここまでで分からないところや、もっと詳しく知りたい質問はある？何でも聞いてね！</p>
                            <p style="margin-top: 8px; font-size: 0.8rem; color: #7f8c8d;">※本物のAIであなたのノート専用のリアルタイム解説を受けるには、右上の「⚙️」からGemini APIキーを設定してください。</p>
                        </div>
                    </div>
                `;
            }
            switchScreen('ai-response');
        }, 2000);
    }
}

// ==========================================
// 💬 AIへの質問チャットロジック
// ==========================================
function sendChatQuestion() {
    const input = document.getElementById('chat-question-input');
    const chatLog = document.getElementById('ai-chat-log');
    if (!input || !chatLog) return;
    
    const text = input.value.trim();
    if (!text) return;
    
    // ユーザーのメッセージを追加
    const userMsg = document.createElement('div');
    userMsg.className = 'chat-message user';
    userMsg.style.cssText = 'display: flex; gap: 8px; align-self: flex-end; flex-direction: row-reverse;';
    userMsg.innerHTML = `
        <span style="font-size: 1.2rem;">👤</span>
        <p>${escapeHtml(text)}</p>
    `;
    chatLog.appendChild(userMsg);
    input.value = '';
    
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
                text: `【対話指示】
あなたはAI学習アシスタント「わかるくん」です。
アップロードされた学習ノートに関して対話型授業を行っています。

${aiProfilePrompt}

【対話ルール】
1. 生徒の質問に親切・丁寧に答えつつ、写真のノートや問題の内容と関連付けて分かりやすく解説してください。
2. 回答の最後には、「〜についてどう思う？」「次はここを解いてみる？」などの確認クイズ・問いかけを投げかけるか、または「他によく分からない点や質問はある？」と優しく尋ねて対話を継続させてください。
3. 設定プロファイルで指示された【口調・トーン・褒め方・長さ・厳しさ・キャラクター性・熱量】を100%徹底してください。
4. Markdown形式（箇条書き、太字等）で読みやすくまとめてください。`
            }]
        });
        contents.push({
            role: 'model',
            parts: [{ text: "了解しました！質問に分かりやすく答え、設定されたキャラクター性を守りながら、最後に質問や問いかけを入れて対話を深めます！" }]
        });

        messages.forEach(msg => {
            const isAi = msg.classList.contains('ai');
            const textParagraph = msg.querySelector('p, div');
            if (textParagraph) {
                let rawText = textParagraph.innerText || textParagraph.textContent;
                contents.push({
                    role: isAi ? 'model' : 'user',
                    parts: [{ text: rawText }]
                });
            }
        });

        // ノート画像を添付する
        const teachingPreview = document.getElementById('teaching-image-preview');
        if (teachingPreview && teachingPreview.src && teachingPreview.src.startsWith('data:')) {
            const base64Data = teachingPreview.src.split(',')[1];
            const mimeType = teachingPreview.src.split(';')[0].split(':')[1] || 'image/jpeg';
            if (contents.length > 0 && contents[contents.length - 1].role === 'user') {
                contents[contents.length - 1].parts.push({
                    inline_data: {
                        mime_type: mimeType,
                        data: base64Data
                    }
                });
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
            if (text.includes('平方完成') || text.includes('やり方') || text.includes('公式')) {
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
        }, 1000);
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
            const sender = msg.classList.contains('ai') ? 'ai' : 'user';
            const contentEl = msg.querySelector('div, p');
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

    let title = 'わかるくんの解説授業';
    if (hasPractice) {
        title = `わかるくん解説授業 ＆ 練習問題 (得点: ${practiceScoreStr}点)`;
    } else if (chatHistory.length > 1) {
        title = 'わかるくんのノート解説＆質疑応答';
    }

    // 4. 1つの学習記録オブジェクトとして保存
    dummyHistory.unshift({
        id: 'h_session_' + Date.now(),
        date: dateString,
        subject: '数学',
        title: title,
        icon: hasPractice ? '🎯' : '📚',
        image: imageSrc,
        chat: chatHistory
    });

    saveHistory();

    // 練習問題状態とフォームをクリア
    currentPracticeQuestions = [];
    if (typeof lastWakaruAdvice !== 'undefined') lastWakaruAdvice = '';
    if (scoreDisp) scoreDisp.classList.add('hidden');
    const adviceBox = document.getElementById('wakaru-advice-box');
    if (adviceBox) adviceBox.classList.add('hidden');

    renderHistory();
    clearFileSelect();
    switchScreen('home');
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
// 🔄 画面を切り替える関数
// ==========================================
function switchScreen(screenId) {
    const screens = document.querySelectorAll('.screen');
    screens.forEach(screen => {
        if (screen.id === `${screenId}-screen`) {
            screen.classList.add('active');
            const card = screen.querySelector('.glass-card');
            if (card) card.scrollTop = 0;
        } else {
            screen.classList.remove('active');
        }
    });
    window.scrollTo(0, 0);
}

// ==========================================
// 📝 テスト機能の制御ロジック
// ==========================================
let currentTestQuestions = [];

function startTest() {
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

    const gradeBtn = document.getElementById('grade-test-btn');
    if (gradeBtn) gradeBtn.classList.remove('hidden');

    const finishBtn = document.getElementById('finish-test-btn');
    if (finishBtn) finishBtn.classList.add('hidden');

    const abortBtn = document.getElementById('test-abort-btn');
    if (abortBtn) abortBtn.classList.remove('hidden');

    let subjectName = '総合';
    if (dummyHistory.length > 0) {
        subjectName = dummyHistory[0].subject || '総合';
    }

    currentTestQuestions = [
        {
            title: `【問 1】 (${subjectName}) 次の計算に答えよ: 15 × 6 - 25`,
            answer: '65',
            type: 'short',
            points: 30,
            explanation: '15 × 6 = 90、90 - 25 = 65 です。'
        },
        {
            title: `【問 2】 (英語) 「私は昨日勉強しました」の英文の空欄に入る単語を答えよ: I ( _______ ) yesterday.`,
            answer: 'studied',
            type: 'short',
            points: 35,
            explanation: 'study の過去形は studied です。'
        },
        {
            title: `【問 3】 (学習法) 間違えた問題を復習する際、最も効果的な行動はどれか？`,
            answer: '解き直し',
            keywords: ['解き直し', '復習', '確認', 'やり直し', '反復', '自分で解く'],
            type: 'short',
            points: 35,
            explanation: '解説を読むだけでなく、自分の力で解き直すことが最も大切です。'
        }
    ];

    container.innerHTML = '';
    currentTestQuestions.forEach((q, idx) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'test-question-item';
        itemDiv.style.marginBottom = '20px';
        itemDiv.innerHTML = `
            <div class="q-title" style="font-weight: bold; margin-bottom: 8px;">
                ${escapeHtml(q.title)} <span class="q-points" style="color: #7f8c8d; font-size: 0.85rem;">（${q.points}点）</span>
            </div>
            <div class="q-answer-area" style="margin-bottom: 8px;">
                答：<input type="text" id="test-q-${idx}" placeholder="解答を入力" class="q-input-medium" style="padding: 8px 12px; border-radius: 8px; border: 1px solid var(--glass-border); width: 100%; max-width: 320px; font-size: 16px; box-sizing: border-box;">
            </div>
            <div class="q-feedback hidden" id="test-fb-${idx}" style="padding: 10px; border-radius: 10px; background: rgba(255,255,255,0.6); margin-top: 6px;">
                <span class="grade-mark" style="font-weight: bold; font-size: 1.2rem; margin-right: 8px;"></span>
                <span class="q-explanation" style="font-size: 0.9rem; color: #34495e;">${q.explanation}</span>
            </div>
        `;
        container.appendChild(itemDiv);
    });

    switchScreen('test-paper');
}

function gradeTest() {
    let score = 0;
    currentTestQuestions.forEach((q, idx) => {
        const inputEl = document.getElementById(`test-q-${idx}`);
        const userAns = inputEl ? inputEl.value.trim() : '';
        const fbEl = document.getElementById(`test-fb-${idx}`);
        
        let isCorrect = false;
        if (q.keywords && Array.isArray(q.keywords)) {
            isCorrect = q.keywords.some(kw => userAns.includes(kw));
        } else {
            isCorrect = (userAns.toLowerCase() === q.answer.toLowerCase());
        }

        if (isCorrect) score += q.points;

        if (fbEl) {
            fbEl.classList.remove('hidden');
            const markEl = fbEl.querySelector('.grade-mark');
            if (markEl) {
                markEl.textContent = isCorrect ? '◯ 正解' : '✗ 不正解';
                markEl.style.color = isCorrect ? '#2ecc71' : '#e74c3c';
            }
        }
        if (inputEl) inputEl.readOnly = true;
    });

    const scoreVal = document.getElementById('test-score-val');
    if (scoreVal) scoreVal.textContent = score;
    const scoreDisp = document.getElementById('test-score-display');
    if (scoreDisp) scoreDisp.classList.remove('hidden');

    const gradeBtn = document.getElementById('grade-test-btn');
    if (gradeBtn) gradeBtn.classList.add('hidden');
    const finishBtn = document.getElementById('finish-test-btn');
    if (finishBtn) finishBtn.classList.remove('hidden');
    const abortBtn = document.getElementById('test-abort-btn');
    if (abortBtn) abortBtn.classList.add('hidden');
}

function finishTestSessionAndSave() {
    const scoreVal = document.getElementById('test-score-val');
    const score = scoreVal ? scoreVal.textContent : '0';

    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const dateString = `${yyyy}/${mm}/${dd}`;

    const chatHistory = [
        { sender: 'ai', text: `📝 <strong>実力診断テスト結果: ${score} / 100 点</strong>` }
    ];

    currentTestQuestions.forEach((q, idx) => {
        const inputEl = document.getElementById(`test-q-${idx}`);
        const userAns = inputEl ? inputEl.value : '';
        chatHistory.push({
            sender: 'ai',
            text: `<strong>${escapeHtml(q.title)}</strong><br>・あなたの解答: ${escapeHtml(userAns || '未入力')}<br>・解説: ${escapeHtml(q.explanation)}`
        });
    });

    dummyHistory.unshift({
        id: 'h_session_' + Date.now(),
        date: dateString,
        subject: '実力テスト',
        title: `実力診断テスト (得点: ${score}点)`,
        icon: '📝',
        image: null,
        chat: chatHistory
    });

    saveHistory();
    renderHistory();
    switchScreen('home');
}

function finishTest() {
    finishTestSessionAndSave();
}

function confirmResetAllData() {
    if (confirm('保存されているすべての学習記録を完全に削除して初期化しますか？')) {
        dummyHistory = [];
        localStorage.removeItem('ai-study-history');
        localStorage.setItem('ai-study-history-v3', 'true');
        saveHistory();
        renderHistory();
        alert('すべての学習記録を削除し、初期状態に一新しました。');
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

    // 画面切り替え
    switchScreen('history-chat');
}

function sendHistoryChatQuestion() {
    const input = document.getElementById('history-chat-input');
    const chatLog = document.getElementById('history-chat-log');
    if (!input || !chatLog || !activeHistoryItem) return;

    const text = input.value.trim();
    if (!text) return;

    // 1. ユーザーメッセージを追加
    const userMsg = document.createElement('div');
    userMsg.className = 'chat-message user';
    userMsg.style.cssText = 'display: flex; gap: 8px; align-self: flex-end; flex-direction: row-reverse;';
    userMsg.innerHTML = `
        <span style="font-size: 1.2rem;">👤</span>
        <p>${escapeHtml(text)}</p>
    `;
    chatLog.appendChild(userMsg);
    input.value = '';

    // メモリ上のチャットデータにも追加（セッション中保存）
    if (!activeHistoryItem.chat) activeHistoryItem.chat = [];
    activeHistoryItem.chat.push({ sender: 'user', text: escapeHtml(text) });
    
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
        
        contents.push({
            role: 'user',
            parts: [{
                text: `システム指示:
あなたは親しみやすいAI学習アシスタントです。
過去に行った学習履歴について、ユーザーから追加の質問を受けています。
過去の会話の流れを踏まえて、わかりやすく的確に回答してください。
回答はMarkdown形式でフォーマットして読みやすくしてください。`
            }]
        });
        contents.push({
            role: 'model',
            parts: [{ text: "了解しました。過去の学習履歴を踏まえ、ユーザーからの追加質問に対してわかりやすく回答します。" }]
        });

        activeHistoryItem.chat.forEach(msg => {
            // エスケープされているテキストからHTMLタグを除去してプレーンテキストにする
            let rawText = msg.text.replace(/<[^>]*>/g, '');
            contents.push({
                role: msg.sender === 'ai' ? 'model' : 'user',
                parts: [{ text: rawText }]
            });
        });

        // 過去ログに画像があれば添付する
        if (activeHistoryItem.image && activeHistoryItem.image.startsWith('data:')) {
            const base64Data = activeHistoryItem.image.split(',')[1];
            const mimeType = activeHistoryItem.image.split(';')[0].split(':')[1] || 'image/jpeg';
            if (contents.length > 0 && contents[contents.length - 1].role === 'user') {
                contents[contents.length - 1].parts.push({
                    inlineData: {
                        mimeType: mimeType,
                        data: base64Data
                    }
                });
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
 * 15個の設定スライダーとテキストからAI用のカスタマイズプロンプトを構築
 */
function buildAISystemPromptProfile() {
    const getVal = (key) => parseInt(localStorage.getItem(key) || '50', 10);
    const otherPrefs = localStorage.getItem('other-preferences') || '';

    const design = getVal('design-preference');
    const activity = getVal('activity-preference');
    const motivation = getVal('motivation-preference');
    const learning = getVal('learning-style');
    const tone = getVal('tone-preference');
    const praise = getVal('praise-preference');
    const length = getVal('length-preference');
    const analogy = getVal('analogy-preference');
    const difficulty = getVal('difficulty-preference');
    const character = getVal('character-preference');
    const interaction = getVal('interaction-preference');
    const strictness = getVal('strictness-preference');
    const hint = getVal('hint-preference');
    const pace = getVal('pace-preference');
    const energy = getVal('energy-preference');

    // 15のプロンプト要素生成
    let toneText = tone >= 66 ? "語尾は完全フレンドリーなタメ口（〜だよ！〜ね！〜してみよう！）で親しみやすく話してください。" : (tone <= 35 ? "超丁寧な敬語（〜でございます、〜でしょうか、ご説明いたします）で礼儀正しく話してください。" : "標準的で親切な言葉遣い（〜ですね、〜してみましょう）で話してください。");
    
    let praiseText = praise >= 66 ? "正解や頑張りを大絶賛してください！『天才！すごすぎる！大正解！🎉✨』とハイテンションで大袈裟なくらい褒めて盛り上げてください。" : (praise <= 35 ? "静かに落ち着いて『よくできました』『正解です』と優しく褒めてください。" : "『素晴らしいですね！大正解です』と適度に褒めてください。");
    
    let lengthText = length >= 66 ? "解説やメッセージは背景や補足知識を含めて手厚く長めにしっかり説明してください。" : (length <= 35 ? "解説やメッセージは要点のみを2〜3行で極めて簡潔・スッキリまとめてください。" : "長すぎず短すぎず、分かりやすい標準的な長さで解説してください。");
    
    let analogyText = analogy >= 66 ? "日常生活、アニメ、ゲーム、スポーツなどの具体的な例え話を必ず1つ以上取り入れて説明してください。" : (analogy <= 35 ? "例え話は使わず、教科書通りの論理的で厳密な言葉で説明してください。" : "必要に応じて分かりやすい例え話を交えて説明してください。");
    
    let characterText = character >= 66 ? "頼れる『先生』というよりは、隣で一緒に悩んで成長する『友達・相棒・パートナー』のキャラクターとして振る舞ってください。" : (character <= 35 ? "導いてくれる頼もしく知的で権威のある『先生・講師』のキャラクターとして振る舞ってください。" : "優しく親しみやすいAI学習アシスタントとして振る舞ってください。");
    
    let strictnessText = strictness >= 66 ? "甘やかさず、間違えた箇所や弱点をズバッと指摘し『ここは絶対復習しよう！次回は逃さないぞ！』と熱血スパルタに指導してください。" : (strictness <= 35 ? "全肯定スタイルで、間違えても『大丈夫！素晴らしい挑戦だよ！次回頑張ろう』と優しく包み込んでください。" : "優しく励ましつつ、改善点も的確に伝えるスタイルで指導してください。");
    
    let energyText = energy >= 66 ? "パッション溢れる熱血エネルギッシュなキャラで、『燃えてきたぞ！全力で突き進もう！🔥』とパッション全開で接してください。" : (energy <= 35 ? "落ち着いた知性派・クールなキャラで、冷静かつスマートに接してください。" : "元気で前向きなトーンで接してください。");

    let interactionText = interaction >= 66
        ? "解説の最後には『ここはどうなると思う？』と理解度を深めるミニクイズや問いかけを積極的に投げかけてください。"
        : "解説の最後には『ここまでで分からない所や他に質問はあるかな？』と優しく質問の有無を確認してください。";
    
    let hintText = hint >= 66 ? "すぐに答えは教えず、『まずはここに着目してみてごらん！』と段階的なヒントを出して考えさせてください。" : "迷わせずダイレクトに正解と手順を直球提示してください。";

    let difficultyText = difficulty >= 66 ? "基礎だけでなく、一歩踏み込んだ応用・発展的な視点や裏技・応用知識も紹介してください。" : "難易度の高い用語は避け、基礎の基礎から優しく丁寧に教えてください。";

    let interestText = activity >= 66 ? "ユーザーはアウトドア派（スポーツ、旅行、アクティビティ好き）です。" : "ユーザーはインドア派（読書、ゲーム、室内趣味好き）です。";
    
    let otherText = otherPrefs ? `ユーザーのその他の興味・得意分野: "${otherPrefs}"。これを会話や例え話に自然に取り入れてください。` : "";

    return `
【ユーザーが設定した15個のAIカスタマイズプロファイル（※以下の指示を100%厳密に反映してください）】
1. 口調・トーン: ${toneText}
2. 褒め方の強さ: ${praiseText}
3. 解説の長さ: ${lengthText}
4. 例え話の多さ: ${analogyText}
5. キャラクター性: ${characterText}
6. アドバイスの厳しさ: ${strictnessText}
7. キャラクターの熱量: ${energyText}
8. 問いかけ頻度: ${interactionText}
9. ヒントの出し方: ${hintText}
10. 発展難易度: ${difficultyText}
11. 興味ジャンル: ${interestText}
12. モチベーションタイプ: ${motivation >= 66 ? '競争・ゲーム感覚でスコア獲得を目指す型' : '自分のペース重視型'}
13. 学習アプローチ: ${learning >= 66 ? 'まず問題を解いてみる実践型' : '理論をじっくり理解する型'}
14. 画面の雰囲気好み: ${design >= 66 ? '賑やか・カラフル' : '落ち着いたシンプル'}
15. その他情報: ${otherText}
`.trim();
}

// ==========================================
// ⚙️ 設定画面の保存・読込ロジック
// ==========================================
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
        modelSelect.value = localStorage.getItem('gemini-model') || 'gemini-1.5-flash';
    }
}

// ==========================================
// 🌐 Gemini API 連携ユーティリティ
// ==========================================

/**
 * APIキーを使って利用可能なGeminiモデル一覧を取得する
 */
async function fetchAvailableGeminiModels(apiKey) {
    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
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
    const rawApiKey = localStorage.getItem('gemini-api-key') || '';
    const apiKey = rawApiKey.trim();
    if (!apiKey) {
        throw new Error('Gemini APIキーが設定されていません。右上の「⚙️」設定画面でAPIキーを入力して保存してください。');
    }

    // ユーザー指定モデル
    const userSelected = preferredModel || localStorage.getItem('gemini-model') || 'gemini-2.0-flash';
    const cleanUserSelected = userSelected.replace(/^models\//, '');

    // 優先的に試行するモデル候補リスト
    let candidateModels = [
        cleanUserSelected,
        'gemini-2.0-flash',
        'gemini-1.5-flash',
        'gemini-1.5-flash-latest',
        'gemini-1.5-pro',
        'gemini-2.0-flash-exp',
        'gemini-2.5-flash'
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
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ contents })
            });

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
            // 認証エラーやレートリミットは即座に中断
            if (e.message.includes('APIキーが無効') || e.message.includes('アクセス権限が拒否') || e.message.includes('利用制限')) {
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

    const rawKey = apiKeyInput ? apiKeyInput.value.trim() : (localStorage.getItem('gemini-api-key') || '').trim();

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
        // ステップ1: キーの有効性と利用可能モデルの確認
        const models = await fetchAvailableGeminiModels(rawKey);
        
        // ステップ2: 実際のテキスト対話テスト
        const modelSelect = document.getElementById('gemini-model-select');
        const selectedModel = modelSelect ? modelSelect.value : 'gemini-2.0-flash';

        const testContents = [
            {
                role: 'user',
                parts: [{ text: 'こんにちは！短く「接続成功」とだけ返答してください。' }]
            }
        ];

        localStorage.setItem('gemini-api-key', rawKey);
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
                <div style="font-size: 0.85rem; margin-top: 4px; font-weight: normal; color: #7f1d1d;">${escapeHtml(err.message)}</div>
                <div style="margin-top: 8px; font-size: 0.8rem; color: #546e7a; font-weight: normal;">
                    💡 <strong>確認ポイント:</strong><br>
                    ・Google AI Studio (<a href="https://aistudio.google.com/" target="_blank" style="color: #2980b9;">aistudio.google.com</a>) で「Create API key」から取得したキーか確認してください。<br>
                    ・キーの先頭や末尾に不要な文字や余白が含まれていないか「👁️」ボタンで確認してください。
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

function convertMarkdownToHtml(text) {
    if (!text) return '';
    if (typeof marked !== 'undefined' && typeof marked.parse === 'function') {
        try {
            return `<div class="markdown-body" style="line-height: 1.6; font-size: 0.9rem;">${marked.parse(text)}</div>`;
        } catch (e) {
            console.error('marked.js parse error:', e);
        }
    }
    return parseCustomMarkdown(text);
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
必ず長さ5のJSON配列形式のみを出力してください。説明テキストやMarkdownのコードブロック記法(\`\`\`json ...)は一切付けず、純粋なJSONのみを返してください。

各要素のキー構造:
[
  {
    "id": 1,
    "title": "問題文を記述",
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
                title: "二次関数 y = (x - 3)² - 4 の頂点の座標を求めよ。",
                type: "choice",
                options: ["(3, -4)", "(-3, -4)", "(3, 4)", "(-3, 4)"],
                answer: "(3, -4)",
                explanation: "y = a(x - p)² + q の頂点は (p, q) です。したがって (3, -4) が正解です。"
            },
            {
                id: 2,
                title: "x² - 6x を平方完成した正しい形を選べ。",
                type: "choice",
                options: ["(x - 3)² - 9", "(x - 3)² + 9", "(x - 6)² - 36", "(x - 3)² - 6"],
                answer: "(x - 3)² - 9",
                explanation: "xの係数-6の半分は-3です。(x - 3)² - (-3)² = (x - 3)² - 9 と変形します。"
            },
            {
                id: 3,
                title: "二次関数 y = -2(x + 1)² + 5 のグラフの軸の方程式を選べ。",
                type: "choice",
                options: ["x = -1", "x = 1", "y = 5", "x = -2"],
                answer: "x = -1",
                explanation: "y = a(x - p)² + q の軸は x = p です。y = -2(x - (-1))² + 5 より軸は x = -1 です。"
            },
            {
                id: 4,
                title: "二次関数 y = ax² + bx + c において、a < 0 のときグラフの形状はどのようになるか？",
                type: "choice",
                options: ["上に凸（山型）", "下に凸（谷型）", "直線", "右上がりの直線"],
                answer: "上に凸（山型）",
                explanation: "x²の係数 a が負(a < 0)のとき、グラフは上に凸（山型）になります。"
            },
            {
                id: 5,
                title: "二次関数 y = x² - 4x + 5 の y切片（x=0のときのyの値）を求めよ。",
                type: "choice",
                options: ["5", "-4", "1", "0"],
                answer: "5",
                explanation: "x = 0 を代入すると y = 0 - 0 + 5 = 5 となります。"
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
            title: "【数学】二次関数 y = (x - 2)² + 3 の頂点の座標を求めよ。",
            type: "choice",
            options: ["(2, 3)", "(-2, 3)", "(2, -3)", "(-2, -3)"],
            answer: "(2, 3)",
            explanation: "y = a(x - p)² + q の頂点は (p, q) です。(2, 3) が正解です。"
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
        html += `
            <div class="test-question-item" id="pq-item-${qNum}" style="margin-bottom: 25px; padding-bottom: 20px; border-bottom: 1px dashed #e0e0e0;">
                <div class="q-title" style="font-size: 1.05rem; font-weight: bold; margin-bottom: 12px; line-height: 1.5;">
                    <span class="q-num" style="color: #2980b9;">【問 ${qNum}】</span> ${escapeHtml(q.title)} <span class="q-points" style="font-size: 0.85rem; color: #7f8c8d;">（20点）</span>
                </div>
        `;

        if (q.type === 'choice' && Array.isArray(q.options)) {
            html += `<div class="q-answer-area" style="display: flex; flex-direction: column; gap: 8px; margin-top: 10px; width: 100%;">`;
            q.options.forEach((opt, optIdx) => {
                const radioId = `pq_${qNum}_opt_${optIdx}`;
                html += `
                    <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; font-size: 0.95rem; background: rgba(245,247,250,0.85); padding: 10px 14px; border-radius: 10px; border: 1px solid #e2e8f0; transition: all 0.2s; width: 100%; box-sizing: border-box;">
                        <input type="radio" name="pq_ans_${qNum}" id="${radioId}" value="${escapeHtml(opt)}" style="transform: scale(1.15); cursor: pointer; flex-shrink: 0;">
                        <span style="flex: 1; word-break: break-word;">${escapeHtml(opt)}</span>
                    </label>
                `;
            });
            html += `</div>`;
        } else {
            // テキスト入力形式
            html += `
                <div class="q-answer-area" style="margin-top: 10px; width: 100%;">
                    答：<input type="text" id="pq_ans_text_${qNum}" placeholder="解答を入力してください" class="q-input-long" style="width: 100%; max-width: 400px; padding: 8px 12px; font-size: 16px; border-radius: 8px; border: 1px solid #cbd5e1; box-sizing: border-box;">
                </div>
            `;
        }

        // フィードバック＆解説エリア（初期非表示）
        html += `
                <div class="q-feedback hidden" id="pq-feedback-${qNum}" style="margin-top: 12px; padding: 12px; border-radius: 8px; background: rgba(241, 245, 249, 0.9); border-left: 4px solid #3b82f6;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span class="grade-mark mark-correct" style="font-size: 1.4rem; font-weight: bold;">◯</span>
                        <strong style="font-size: 0.95rem;">【正解】: ${escapeHtml(q.answer)}</strong>
                    </div>
                    <div class="q-explanation" style="margin-top: 6px; font-size: 0.9rem; color: #334155; line-height: 1.5;">
                        <strong>【解説】</strong><br>
                        ${escapeHtml(q.explanation)}
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
            if (markEl) {
                if (isCorrect) {
                    markEl.textContent = '◯';
                    markEl.className = 'grade-mark mark-correct';
                    markEl.style.color = '#2ecc71';
                } else {
                    markEl.textContent = '✕';
                    markEl.className = 'grade-mark mark-incorrect';
                    markEl.style.color = '#e74c3c';
                }
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

    // 🤖 わかるくんからのアドバイスを生成・表示
    await generateWakaruAdvice(totalScore, resultsSummary);
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

    const isCasual = tone >= 66;
    const isHonest = tone <= 35;
    const isPraise = praise >= 66;
    const isStrict = strictness >= 66;
    const isEnergy = energy >= 66;

    let text = "";

    if (isCasual && isEnergy) {
        text += `練習問題お疲れさま！得点は **${totalScore}点** だよ！🔥\n`;
        if (totalScore === 100) {
            text += `全問正解！！すごすぎるぜ！ノートの成果が完璧に出てるね！🎉✨\nこの勢いで次の単元もバリバリ突き進もう！`;
        } else if (totalScore >= 60) {
            text += `よく頑張ったね！高得点ゲットだよ！💪\n間違えた問題の解説をしっかりチェックして、次回は満点を狙っちゃおう！`;
        } else {
            text += `最後まであきらめずに解ききって燃えたぜ！🔥\n${isStrict ? '悔しい結果だけど甘えは禁物！間違えたところをノートで見直して絶対リベンジしよう！' : '落ち込まなくて大丈夫！間違えた分だけ伸びしろがあるからね！一緒に復習しよう！'}`;
        }
    } else if (isHonest) {
        text += `練習問題5問のお取り組み、誠にお疲れ様でございました。得点は **${totalScore}点** でございます。\n`;
        if (totalScore >= 80) {
            text += `大変素晴らしい成果でございます。学習内容がしっかりと定着されておりますね。次回もこの調子で励んでまいりましょう。`;
        } else {
            text += `全力を尽くされた姿勢が大変立派でございます。解説をご確認いただき、次回へ向けて復習なさってくださいませ。`;
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

