// ==========================================
// 📝 データと初期設定
// ===========================// デフォルトの履歴データ
const defaultHistory = [
    { 
        id: 'h1',
        date: '2026/06/06', 
        subject: '国語', 
        title: '国語：漢文の訓読と置き字', 
        icon: '📜',
        image: null,
        chat: [
            { sender: 'ai', text: '漢文の訓読や置き字について復習しましょう！特に「而」や「於」などの置き字の役割について理解できていますか？' },
            { sender: 'user', text: '置き字ってなんで書くのに読まないんですか？' },
            { sender: 'ai', text: '良い質問ですね！置き字は中国語（漢文）の文法（接続詞や前置詞など）を示すために元の文章には必要ですが、日本語の語順で読む（訓読する）際には、送り仮名や助詞などで補えるため、直接読まなくても意味が通じるからです。' },
            { sender: 'user', text: 'なるほど、日本語の文脈に直すから読まなくて良いんですね。納得しました！' },
            { sender: 'ai', text: 'その通りです！素晴らしい理解力ですね。またわからない部分があったらいつでも聞いてください！' }
        ]
    },
    { 
        id: 'h2',
        date: '2026/06/05', 
        subject: '数学', 
        title: '数学：二次関数のグラフ', 
        icon: '📊',
        image: null,
        chat: [
            { sender: 'ai', text: '二次関数 y = a(x - p)² + q のグラフの形と頂点 (p, q) について復習しましょう！' },
            { sender: 'user', text: '平方完成のやり方を忘れてしまいました。' },
            { sender: 'ai', text: '平方完成の基本は、xの係数の「半分」の2乗を作ることです。例えば x² - 6x なら、半分の -3 の2乗である +9 を作ります。 x² - 6x = (x - 3)² - 9 と変形できます。' },
            { sender: 'user', text: '半分にして2乗して、引くのですね！' },
            { sender: 'ai', text: 'そうです！ (x - 半分)² - (半分の2乗) と覚えるとスムーズですよ。' }
        ]
    },
    { 
        id: 'h3',
        date: '2026/06/04', 
        subject: '理科', 
        title: '理科：植物の呼吸と光合成', 
        icon: '🌱',
        image: null,
        chat: [
            { sender: 'ai', text: '理科の「植物の呼吸と光合成」についてです。昼と夜で、気体の出入りはどう変化するか説明できますか？' },
            { sender: 'user', text: '昼は光合成をするから酸素を出して、夜は二酸化炭素を出すんですよね？' },
            { sender: 'ai', text: '惜しいです！呼吸は昼も夜も「常に」行っています。昼は光合成の量が呼吸の量より圧倒的に多いため、見かけ上「二酸化炭素を吸収し、酸素を出している」ように見えます。しかし、呼吸そのものは昼も稼働していることに注意しましょう。' },
            { sender: 'user', text: 'あ、呼吸はずっとしてるのか！引っかかりやすいところですね。' },
            { sender: 'ai', text: 'その通りです！テストでも非常によく狙われるポイントなので、覚えておきましょう。' }
        ]
    },
    { 
        id: 'h4',
        date: '2026/06/03', 
        subject: '社会', 
        title: '社会：世界の気候区分', 
        icon: '🌍',
        image: null,
        chat: [
            { sender: 'ai', text: '世界の気候区分（ケッペンの気候区分）について学びましょう。熱帯、乾燥帯、温帯、亜寒帯、寒帯の5つの大区分は大丈夫ですか？' },
            { sender: 'user', text: '温帯と乾燥帯の違いは雨の量ですか？' },
            { sender: 'ai', text: '大正解です！乾燥帯は蒸発量が降水量を上回るため、樹木が育ちません。温帯は適度な雨が降り樹木が育ちます。気候区分は「気温」と「降水量」の2軸で決まることを覚えておくと良いですよ。' }
        ]
    },
    { 
        id: 'h5',
        date: '2026/06/02', 
        subject: '英語', 
        title: '英語：不規則動詞の過去形', 
        icon: '🔤',
        image: null,
        chat: [
            { sender: 'ai', text: '不規則変化動詞の過去形についてです。例えば write や buy の過去形はすぐに答えられますか？' },
            { sender: 'user', text: 'writeはwroteで、buyはboughtですよね？' },
            { sender: 'ai', text: '素晴らしい！両方とも大正解です。不規則変化動詞は声に出してリズムで覚えるのが一番の近道です。 write-wrote-written, buy-bought-bought と口ずさんでみましょう！' }
        ]
    }
];

let dummyHistory = [];

// ==========================================
// 💾 ローカルストレージ連携
// ==========================================
function loadHistory() {
    const saved = localStorage.getItem('ai-study-history');
    if (saved) {
        try {
            dummyHistory = JSON.parse(saved);
        } catch (e) {
            console.error('Failed to parse history from localStorage', e);
            dummyHistory = JSON.parse(JSON.stringify(defaultHistory));
        }
    } else {
        dummyHistory = JSON.parse(JSON.stringify(defaultHistory));
        saveHistory();
    }
}

function saveHistory() {
    try {
        localStorage.setItem('ai-study-history', JSON.stringify(dummyHistory));
    } catch (e) {
        console.error('Failed to save history to localStorage', e);
        if (e.name === 'QuotaExceededError') {
            alert('保存容量の上限に達したため、古い履歴を整理するか画像のサイズを小さくしてください。');
        }
    }
}

// ==========================================
// 📸 画像圧縮ユーティリティ
// ==========================================
function compressImage(dataUrl, maxWidth, maxHeight, quality, callback) {
    const img = new Image();
    img.onload = function() {
        let width = img.width;
        let height = img.height;
        
        if (width > height) {
            if (width > maxWidth) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
            }
        } else {
            if (height > maxHeight) {
                width = Math.round((width * maxHeight) / height);
                height = maxHeight;
            }
        }
        
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        callback(compressedDataUrl);
    };
    img.onerror = function() {
        callback(dataUrl);
    };
    img.src = dataUrl;
}

// AIプランナーの時間別ダミーデータ
const aiPlanData = {
    5: {
        weakScore: '78/100',
        understandScore: '45%',
        unit: '数学：二次関数',
        text: '【5分サクッと復習】今日間違えた「二次関数の基礎計算」を1問だけ集中して解き直そう！',
        balance: '⚖️ 今日の復習 90% : 明日の予習 10%'
    },
    10: {
        weakScore: '65/100',
        understandScore: '55%',
        unit: '理科：植物の呼吸',
        text: '【10分標準復習】光合成と呼吸の仕組みの違いの解説を読み、確認クイズを3問解こう！',
        balance: '⚖️ 今日の復習 70% : 明日の予習 30%'
    },
    30: {
        weakScore: '85/100',
        understandScore: '30%',
        unit: '数学＆理科セット',
        text: '【30分じっくり復習】弱点優先！二次関数のグラフ作成と、植物の呼吸のまとめノートをまとめてクリアしよう！',
        balance: '⚖️ 今日の復習 50% : 明日の予習 50%'
    }
};

let currentFilter = 'すべて';
let searchQuery = '';

window.addEventListener('DOMContentLoaded', () => {
    loadHistory();
    renderHistory();
    switchPlanTime(5); // 初期は5分プランにセット
    loadSettings();    // 設定のロード
    
    // URLのパラメータから historyId を取得して、あれば詳細画面を開く
    const urlParams = new URLSearchParams(window.location.search);
    const historyId = urlParams.get('historyId');
    if (historyId) {
        openHistoryChat(historyId);
    }
});

// ==========================================
// 🧠 AIプランの表示切り替え関数
// ==========================================
function switchPlanTime(minutes) {
    const data = aiPlanData[minutes];
    if (!data) return;

    document.getElementById('weak-score').textContent = data.weakScore;
    document.getElementById('understand-score').textContent = data.understandScore;
    document.getElementById('priority-unit').textContent = data.unit;
    document.getElementById('plan-text').textContent = data.text;
    document.getElementById('plan-balance-tag').textContent = data.balance;

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
// 📸 写真選択の連動システム
// ==========================================
function triggerFileInput() {
    const fileInput = document.getElementById('upload-input');
    if (fileInput) {
        fileInput.click();
    }
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            compressImage(e.target.result, 600, 600, 0.7, (compressedDataUrl) => {
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
        }
        reader.readAsDataURL(file);
    }
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
    
    if (apiKey && imagePreview && imagePreview.src && imagePreview.src.startsWith('data:')) {
        // APIキーがあり、画像が選択されている場合はGeminiを呼び出す
        const base64Data = imagePreview.src.split(',')[1];
        const mimeType = imagePreview.src.split(';')[0].split(':')[1] || 'image/jpeg';
        
        // ユーザーのプロファイル（設定）を読み込んでプロンプトに反映する
        const designPref = localStorage.getItem('design-preference') || '50';
        const activityPref = localStorage.getItem('activity-preference') || '50';
        const motivationPref = localStorage.getItem('motivation-preference') || '50';
        const learningStyle = localStorage.getItem('learning-style') || '50';
        const otherPrefs = localStorage.getItem('other-preferences') || '';

        const systemPrompt = `あなたは優秀で親しみやすいAI学習アシスタントです。
ユーザーがアップロードした勉強用ノート（またはプリントなどの画像）を分析してください。

【ユーザーの学習スタイル・プロフィール設定】
- 好みのデザインや雰囲気 (静か←50→派手): ${designPref}/100
- 興味のあるジャンル (インドア←50→アウトドア): ${activityPref}/100
- モチベーションのタイプ (マイペース←50→競争ゲーム型): ${motivationPref}/100
- 新しいことを学ぶアプローチ (じっくり理解型←50→まずやってみる型): ${learningStyle}/100
- その他の好みや趣味: "${otherPrefs}"

【指示】
1. ノートの画像を認識し、学習している科目（例：数学、国語、英語、理科、社会等）と、具体的な「単元名」や「学習トピック」を特定してください。
2. 画像から読み取れる内容を、優しく分かりやすく2〜3文で要約してください。
3. 学習スタイルや好みの趣味をふまえ、親しみやすい言葉遣いで、最初の挨拶と分析結果を伝えてください。
4. 最後に「今日はこのノートについてどんなことが知りたい？」「何から説明してほしい？」などの具体的な問いかけを行ってください。
5. Markdown形式（箇条書き、太字等。HTMLタグではなくMarkdown）を使って見やすくフォーマットしてください。`;

        const contents = [
            {
                role: 'user',
                parts: [
                    { text: systemPrompt },
                    {
                        inlineData: {
                            mimeType: mimeType,
                            data: base64Data
                        }
                    }
                ]
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
            console.error(err);
            if (chatLog) {
                chatLog.innerHTML = `
                    <div class="chat-message ai" style="display: flex; gap: 8px; align-self: flex-start;">
                        <span style="font-size: 1.2rem;">🤖</span>
                        <p style="color: #e74c3c;">Gemini APIの呼び出しに失敗しました。<br>エラー: ${escapeHtml(err.message)}<br><br>※設定画面でAPIキーが正しいか確認してください。一時的にダミーチャットを開始します。</p>
                    </div>
                `;
            }
            switchScreen('ai-response');
        });
    } else {
        // APIキーがない場合、または画像がない場合は、従来の2.5秒ロード待ち（モック演出）
        setTimeout(() => {
            if (chatLog) {
                chatLog.innerHTML = `
                    <div class="chat-message ai" style="display: flex; gap: 8px; align-self: flex-start;">
                        <span style="font-size: 1.2rem;">🤖</span>
                        <p>アップロードされたノートについて何でも聞いてね！わからない部分や解説してほしい所があれば質問してください。</p>
                    </div>
                `;
            }
            // 解説画面へ
            switchScreen('ai-response');
        }, 2500);
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
        
        const designPref = localStorage.getItem('design-preference') || '50';
        const activityPref = localStorage.getItem('activity-preference') || '50';
        const motivationPref = localStorage.getItem('motivation-preference') || '50';
        const learningStyle = localStorage.getItem('learning-style') || '50';
        const otherPrefs = localStorage.getItem('other-preferences') || '';

        contents.push({
            role: 'user',
            parts: [{
                text: `システム指示:
あなたは親しみやすいAI学習アシスタントです。
アップロードされた学習ノートに関して対話型授業を行っています。
ユーザーの質問に対し、わかりやすく丁寧に回答してください。

【ユーザープロフィール】
- 好みのデザインや雰囲気: ${designPref}/100
- 興味のあるジャンル: ${activityPref}/100
- モチベーションのタイプ: ${motivationPref}/100
- 学習アプローチ: ${learningStyle}/100
- その他: "${otherPrefs}"

※回答はMarkdown形式（箇条書き、太字等）でフォーマットして読みやすくしてください。
※これまでのチャット履歴に従って、自然に対話を継続してください。`
            }]
        });
        contents.push({
            role: 'model',
            parts: [{ text: "了解しました。プロフィールをふまえ、学習を最大限にサポートする対話を継続します。" }]
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
// 🎯 復習を完了して履歴に保存してホームへ
// ==========================================
function finishReviewAndSave() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const dateString = `${yyyy}/${mm}/${dd}`;
    
    // チャットログの全メッセージを取得
    const chatLogEl = document.getElementById('ai-chat-log');
    const chatHistory = [];
    if (chatLogEl) {
        const messages = chatLogEl.querySelectorAll('.chat-message');
        messages.forEach(msg => {
            const sender = msg.classList.contains('ai') ? 'ai' : 'user';
            const textParagraph = msg.querySelector('p');
            const text = textParagraph ? textParagraph.innerHTML : '';
            chatHistory.push({ sender, text });
        });
    }

    // アップロードした画像を取得
    const teachingPreview = document.getElementById('teaching-image-preview');
    const imageSrc = teachingPreview ? teachingPreview.src : null;

    // 履歴データに新規追加（先頭に挿入）
    dummyHistory.unshift({
        id: 'h_' + Date.now(),
        date: dateString,
        subject: '数学',
        title: '数学：二次関数の最大・最小',
        icon: '📊',
        image: imageSrc,
        chat: chatHistory
    });
    
    saveHistory();
    
    // 履歴カードを再描画
    renderHistory();
    
    // ファイル選択をリセット
    clearFileSelect();
    
    // ホームへ戻る
    switchScreen('home');
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
        } else {
            screen.classList.remove('active');
        }
    });
}

// ==========================================
// 📝 テスト機能の制御ロジック
// ==========================================
function startTest() {
    // 解答欄の初期化
    document.getElementById('q1-ans-x').value = '';
    document.getElementById('q1-ans-y').value = '';
    document.getElementById('q2-ans').value = '';
    document.getElementById('q3-ans').value = '';

    // 編集可能にする
    document.getElementById('q1-ans-x').readOnly = false;
    document.getElementById('q1-ans-y').readOnly = false;
    document.getElementById('q2-ans').readOnly = false;
    document.getElementById('q3-ans').readOnly = false;

    // フィードバックと得点表示の非表示化
    document.getElementById('q1-feedback').classList.add('hidden');
    document.getElementById('q2-feedback').classList.add('hidden');
    document.getElementById('q3-feedback').classList.add('hidden');
    document.getElementById('test-score-display').classList.add('hidden');
    
    // ボタン表示のリセット
    document.getElementById('grade-test-btn').classList.remove('hidden');
    document.getElementById('finish-test-btn').classList.add('hidden');
    document.getElementById('test-abort-btn').classList.remove('hidden');

    // 実施日の設定
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    document.getElementById('test-date').textContent = `${yyyy}/${mm}/${dd}`;

    // テスト用紙画面へ切り替え
    switchScreen('test-paper');
}

function gradeTest() {
    const q1X = document.getElementById('q1-ans-x').value.trim();
    const q1Y = document.getElementById('q1-ans-y').value.trim();
    const q2 = document.getElementById('q2-ans').value.trim();
    const q3 = document.getElementById('q3-ans').value.trim().toLowerCase();

    let score = 0;
    
    // 問1 採点 (30点) - xが3かつyが-4
    const q1Correct = (q1X === '3' && q1Y === '-4');
    if (q1Correct) score += 30;
    
    // 問2 採点 (35点) - 置き字を読まない/書かない旨のキーワードが含まれているか
    const q2Correct = (q2.includes('読ま') || q2.includes('書かない') || q2.includes('訳さない') || q2.includes('無視') || q2.includes('処理しない') || q2.includes('書き下さない'));
    if (q2Correct) score += 35;
    
    // 問3 採点 (35点) - went
    const q3Correct = (q3 === 'went');
    if (q3Correct) score += 35;

    // 各問のフィードバック表示
    displayQuestionFeedback('q1-feedback', q1Correct);
    displayQuestionFeedback('q2-feedback', q2Correct);
    displayQuestionFeedback('q3-feedback', q3Correct);

    // 得点の表示
    const scoreVal = document.getElementById('test-score-val');
    if (scoreVal) {
        scoreVal.textContent = score;
    }
    const scoreDisplay = document.getElementById('test-score-display');
    if (scoreDisplay) {
        scoreDisplay.classList.remove('hidden');
    }

    // ボタンの表示切替
    document.getElementById('grade-test-btn').classList.add('hidden');
    document.getElementById('finish-test-btn').classList.remove('hidden');
    document.getElementById('test-abort-btn').classList.add('hidden'); // 採点後は途中で戻れなくし、完了ボタンで戻らせる

    // 入力欄を読み取り専用にする
    document.getElementById('q1-ans-x').readOnly = true;
    document.getElementById('q1-ans-y').readOnly = true;
    document.getElementById('q2-ans').readOnly = true;
    document.getElementById('q3-ans').readOnly = true;
}

function displayQuestionFeedback(feedbackId, isCorrect) {
    const feedbackEl = document.getElementById(feedbackId);
    if (!feedbackEl) return;

    feedbackEl.classList.remove('hidden');
    const markEl = feedbackEl.querySelector('.grade-mark');
    if (markEl) {
        if (isCorrect) {
            markEl.textContent = '◯';
            markEl.className = 'grade-mark mark-correct';
        } else {
            markEl.textContent = '✗';
            markEl.className = 'grade-mark mark-incorrect';
        }
    }
}

function finishTest() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const dateString = `${yyyy}/${mm}/${dd}`;
    
    const scoreVal = document.getElementById('test-score-val');
    const score = scoreVal ? scoreVal.textContent : '0';
    
    // テスト解答内容を元にチャット履歴風のログを作成
    const q1X = document.getElementById('q1-ans-x').value.trim();
    const q1Y = document.getElementById('q1-ans-y').value.trim();
    const q2 = document.getElementById('q2-ans').value.trim();
    const q3 = document.getElementById('q3-ans').value.trim();
    
    const chatHistory = [
        { sender: 'ai', text: `実力診断テストを解きました！得点は <strong>${score} / 100 点</strong> です。` },
        { sender: 'user', text: `【解答内容】<br>問1 (x, y): (${q1X || '未入力'}, ${q1Y || '未入力'})<br>問2: ${q2 || '未入力'}<br>問3: ${q3 || '未入力'}` },
        { sender: 'ai', text: `今回の弱点分析：<br>・問1 (二次関数の頂点)：${q1X === '3' && q1Y === '-4' ? '正解！平方完成がしっかりできています。' : '不正解。y = (x-3)² - 4 と変形する部分を確認しましょう。'}<br>・問2 (漢文の置き字)：${(q2.includes('読ま') || q2.includes('書かない') || q2.includes('訳さない') || q2.includes('無視') || q2.includes('処理しない')) ? '正解！置き字の性質が頭に入っています。' : '不正解。置き字は書き下し文では「読まない」のが基本ルールです。'}<br>・問3 (goの過去形)：${q3.toLowerCase().trim() === 'went' ? '正解！不規則変化動詞もバッチリです。' : '不正解。go の過去形は went です。'}` }
    ];

    // 学習履歴にテスト結果を保存
    dummyHistory.unshift({
        id: 'h_' + Date.now(),
        date: dateString,
        subject: 'すべて',
        title: `実力診断テスト（得点: ${score}点）`,
        icon: '📝',
        image: null,
        chat: chatHistory
    });
    
    saveHistory();
    
    // 履歴を再描画してホーム画面へ
    renderHistory();
    switchScreen('home');
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
                    <p>${msg.text}</p>
                `;
            } else {
                msgEl.className = 'chat-message user';
                msgEl.style.cssText = 'display: flex; gap: 8px; align-self: flex-end; flex-direction: row-reverse;';
                msgEl.innerHTML = `
                    <span style="font-size: 1.2rem;">👤</span>
                    <p>${msg.text}</p>
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

// ==========================================
// ⚙️ 設定画面の保存・読込ロジック
// ==========================================
function saveSettings() {
    const sliders = {
        'design-preference-slider': 'design-preference',
        'activity-preference-slider': 'activity-preference',
        'motivation-preference-slider': 'motivation-preference',
        'learning-style-slider': 'learning-style'
    };

    for (const [id, key] of Object.entries(sliders)) {
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
    const sliders = {
        'design-preference-slider': 'design-preference',
        'activity-preference-slider': 'activity-preference',
        'motivation-preference-slider': 'motivation-preference',
        'learning-style-slider': 'learning-style'
    };

    for (const [id, key] of Object.entries(sliders)) {
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
async function callGeminiAPI(contents) {
    const apiKey = localStorage.getItem('gemini-api-key');
    const model = localStorage.getItem('gemini-model') || 'gemini-1.5-flash';
    if (!apiKey) {
        throw new Error('API key is missing');
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ contents })
    });

    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const errMsg = errData.error?.message || `HTTP error! status: ${response.status}`;
        throw new Error(errMsg);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
        throw new Error('AIからの返答を読み取れませんでした。');
    }
    return text;
}

function convertMarkdownToHtml(text) {
    let html = escapeHtml(text);
    // 改行をbrに変換
    html = html.replace(/\n/g, '<br>');
    // 太字 **text** -> <strong>text</strong>
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    // 箇条書き
    html = html.replace(/^(?:\s*[-*+]\s+)(.*?)$/gm, '• $1');
    return `<div style="line-height: 1.5; font-size: 0.88rem;">${html}</div>`;
}
