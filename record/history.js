// ==========================================
// 📝 学習記録一覧 (record.html 用)
// ==========================================

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

let studyHistory = [];

window.addEventListener('DOMContentLoaded', () => {
    loadHistory();
    renderHistoryList();
});

function loadHistory() {
    const saved = localStorage.getItem('ai-study-history');
    if (saved) {
        try {
            studyHistory = JSON.parse(saved);
        } catch (e) {
            console.error('Failed to parse history from localStorage', e);
            studyHistory = JSON.parse(JSON.stringify(defaultHistory));
        }
    } else {
        studyHistory = JSON.parse(JSON.stringify(defaultHistory));
        localStorage.setItem('ai-study-history', JSON.stringify(studyHistory));
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
