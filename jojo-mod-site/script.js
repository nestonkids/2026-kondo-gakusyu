function enterSite() {
    document.getElementById('landing').style.display = 'none';
    document.getElementById('main-content').style.display = 'block';
}

let enterCount = 0;
const input = document.getElementById('messageInput');
const messageList = document.getElementById('messageList');

// ページ読み込み時に保存されたメッセージを表示
window.onload = () => {
    const savedMessages = JSON.parse(localStorage.getItem('jojoModMessages') || '[]');
    savedMessages.forEach(msg => renderMessage(msg));
};

input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        enterCount++;
        if (enterCount === 2) {
            e.preventDefault();
            const text = input.value;
            if (text.trim()) {
                const messageObj = { id: Date.now(), text: text };
                saveMessage(messageObj);
                renderMessage(messageObj);
            }
            input.value = '';
            enterCount = 0;
        }
    } else {
        enterCount = 0;
    }
});

function saveMessage(msg) {
    const messages = JSON.parse(localStorage.getItem('jojoModMessages') || '[]');
    messages.push(msg);
    localStorage.setItem('jojoModMessages', JSON.stringify(messages));
}

function renderMessage(msg) {
    const div = document.createElement('div');
    div.className = 'message-item';
    div.dataset.id = msg.id;
    div.innerHTML = `
        <span class="msg-text">${msg.text}</span>
        <div>
            <button onclick="editMessage(this)">編集</button>
            <button onclick="deleteMessage(this)">削除</button>
        </div>
    `;
    messageList.appendChild(div);
}

function deleteMessage(btn) {
    const div = btn.parentElement.parentElement;
    const id = parseInt(div.dataset.id);
    
    // localStorageから削除
    let messages = JSON.parse(localStorage.getItem('jojoModMessages') || '[]');
    messages = messages.filter(m => m.id !== id);
    localStorage.setItem('jojoModMessages', JSON.stringify(messages));
    
    div.remove();
}

function editMessage(btn) {
    const div = btn.parentElement.parentElement;
    const id = parseInt(div.dataset.id);
    const span = div.querySelector('.msg-text');
    const newText = prompt("内容を編集:", span.innerText);
    
    if (newText !== null) {
        span.innerText = newText;
        // localStorageを更新
        const messages = JSON.parse(localStorage.getItem('jojoModMessages') || '[]');
        const target = messages.find(m => m.id === id);
        if (target) {
            target.text = newText;
            localStorage.setItem('jojoModMessages', JSON.stringify(messages));
        }
    }
}
