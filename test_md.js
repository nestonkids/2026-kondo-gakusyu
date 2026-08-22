function escapeHtml(str) {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function convertMarkdownToHtml(text) {
    let html = escapeHtml(text);

    // 見出し
    html = html.replace(/^### (.*?)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.*?)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.*?)$/gm, '<h1>$1</h1>');

    // 箇条書き (bullet points)
    html = html.replace(/^\s*[-*+]\s+(.*?)$/gm, '<li>$1</li>');
    // Wrap lists in <ul>
    html = html.replace(/(<li>.*?<\/li>)/gs, '<ul>$1</ul>');
    // The previous replace might wrap multiple <ul>. Need to merge them.
    html = html.replace(/<\/ul>\s*<ul>/g, '');

    // 太字 **text** -> <strong>text</strong>
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // 改行をbrに変換
    html = html.replace(/\n/g, '<br>');

    return `<div style="line-height: 1.5; font-size: 0.88rem;">${html}</div>`;
}

const testText = `
# Header
**Bold Text**
*Em Text*
- List 1
- List 2
`;
console.log(convertMarkdownToHtml(testText));
