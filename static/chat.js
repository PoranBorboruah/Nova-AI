/* =========================================================
   NOVA AI - MODERN CHAT.JS
   ========================================================= */


/* =========================================================
   ELEMENTS
   ========================================================= */

const chatBox = document.getElementById("chat");
const messageInput = document.getElementById("message");
const sendButton = document.getElementById("send-btn");

const newChatButton =
    document.querySelector(".new-chat");

const sidebarSection =
    document.querySelector(".sidebar-section");

const settingsButton =
    document.querySelector(".sidebar-item:nth-child(1)");

const helpButton =
    document.querySelector(".sidebar-item:nth-child(2)");

const profileButton =
    document.querySelector(".user-profile");

const topMoreButton =
    document.querySelector(
        ".top-actions button[title='More']"
    );

const topShareButton =
    document.querySelector(
        ".top-actions button[title='Share']"
    );

const modelSelector =
    document.querySelector(".model-selector");


/* =========================================================
   STATE
   ========================================================= */

let currentChatId = null;

let isGenerating = false;


/* =========================================================
   ESCAPE HTML
   ========================================================= */

function escapeHtml(text) {

    const div =
        document.createElement("div");

    div.textContent =
        text;

    return div.innerHTML;
}


/* =========================================================
   SYNTAX HIGHLIGHTING
   ========================================================= */

function highlightCode(code, language) {

    let html =
        escapeHtml(code);

    language =
        (language || "text").toLowerCase();


    /* =====================================================
       PYTHON
       ===================================================== */

    if (
        language === "python" ||
        language === "py"
    ) {

        /* Strings */

        html = html.replace(
            /(&quot;.*?&quot;|&#039;.*?&#039;)/g,
            '<span class="syntax-string">$1</span>'
        );


        /* Comments */

        html = html.replace(
            /(#.*?)(?=<br>|$)/g,
            '<span class="syntax-comment">$1</span>'
        );


        /* Keywords */

        html = html.replace(
            /\b(def|return|if|else|elif|for|while|in|import|from|as|class|try|except|finally|with|True|False|None|and|or|not|is|lambda|pass|break|continue|yield)\b/g,
            '<span class="syntax-keyword">$1</span>'
        );


        /* Built-in functions */

        html = html.replace(
            /\b(print|len|range|input|int|str|float|list|dict|set|tuple|open|enumerate|zip|sum|min|max|abs|type)\b/g,
            '<span class="syntax-builtin">$1</span>'
        );


        /* Numbers */

        html = html.replace(
            /\b\d+(\.\d+)?\b/g,
            '<span class="syntax-number">$&</span>'
        );

    }


    /* =====================================================
       JAVASCRIPT
       ===================================================== */

    else if (
        language === "javascript" ||
        language === "js"
    ) {

        /* Strings */

        html = html.replace(
            /(&quot;.*?&quot;|&#039;.*?&#039;|`.*?`)/g,
            '<span class="syntax-string">$1</span>'
        );


        /* Comments */

        html = html.replace(
            /(\/\/.*?)(?=<br>|$)/g,
            '<span class="syntax-comment">$1</span>'
        );


        /* Keywords */

        html = html.replace(
            /\b(const|let|var|function|return|if|else|for|while|new|class|async|await|true|false|null|undefined|try|catch|finally|throw|import|from|export)\b/g,
            '<span class="syntax-keyword">$1</span>'
        );


        /* Functions */

        html = html.replace(
            /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?=\()/g,
            '<span class="syntax-function">$1</span>'
        );


        /* Numbers */

        html = html.replace(
            /\b\d+(\.\d+)?\b/g,
            '<span class="syntax-number">$&</span>'
        );

    }


    /* =====================================================
       HTML
       ===================================================== */

    else if (
        language === "html" ||
        language === "xml"
    ) {

        html = html.replace(
            /(&lt;\/?[a-zA-Z0-9-]+)/g,
            '<span class="syntax-tag">$1</span>'
        );


        html = html.replace(
            /(&gt;)/g,
            '<span class="syntax-tag">$1</span>'
        );


        html = html.replace(
            /(&quot;.*?&quot;|&#039;.*?&#039;)/g,
            '<span class="syntax-string">$1</span>'
        );

    }


    /* =====================================================
       CSS
       ===================================================== */

    else if (
        language === "css"
    ) {

        html = html.replace(
            /([a-zA-Z-]+)(\s*:)/g,
            '<span class="syntax-property">$1</span>$2'
        );


        html = html.replace(
            /([{}])/g,
            '<span class="syntax-bracket">$1</span>'
        );

    }


    /* =====================================================
       SQL
       ===================================================== */

    else if (
        language === "sql"
    ) {

        html = html.replace(
            /\b(SELECT|FROM|WHERE|INSERT|INTO|VALUES|UPDATE|DELETE|CREATE|TABLE|DROP|ALTER|JOIN|LEFT|RIGHT|INNER|OUTER|ON|AS|AND|OR|ORDER|BY|GROUP|LIMIT|NULL|PRIMARY|KEY|NOT)\b/gi,
            '<span class="syntax-keyword">$1</span>'
        );


        html = html.replace(
            /(&quot;.*?&quot;|&#039;.*?&#039;)/g,
            '<span class="syntax-string">$1</span>'
        );

    }


    return html;
}


/* =========================================================
   MARKDOWN RENDERER
   ========================================================= */

function renderMarkdown(text) {

    if (!text) {
        return "";
    }


    text =
        text.replace(
            /\r\n/g,
            "\n"
        );


    /*
       Store code blocks first.
    */

    const codeBlocks = [];


    text =
        text.replace(
            /```([\w#+.-]*)\n?([\s\S]*?)```/g,
            function(
                match,
                language,
                code
            ) {

                const index =
                    codeBlocks.length;


                codeBlocks.push({

                    language:
                        language || "text",

                    code:
                        code.trim()

                });


                return (
                    "\n@@CODE_BLOCK_" +
                    index +
                    "@@\n"
                );

            }
        );


    /*
       Escape normal HTML.
    */

    let html =
        escapeHtml(text);


    /* =====================================================
       HEADINGS
       ===================================================== */

    html =
        html.replace(
            /^### (.*?)$/gm,
            "<h4>$1</h4>"
        );


    html =
        html.replace(
            /^## (.*?)$/gm,
            "<h3>$1</h3>"
        );


    html =
        html.replace(
            /^# (.*?)$/gm,
            "<h2>$1</h2>"
        );


    /* =====================================================
       BOLD
       ===================================================== */

    html =
        html.replace(
            /\*\*(.*?)\*\*/g,
            "<strong>$1</strong>"
        );


    /* =====================================================
       ITALIC
       ===================================================== */

    html =
        html.replace(
            /(?<!\*)\*([^*\n]+)\*(?!\*)/g,
            "<em>$1</em>"
        );


    /* =====================================================
       INLINE CODE
       ===================================================== */

    html =
        html.replace(
            /`([^`\n]+)`/g,
            '<code class="inline-code">$1</code>'
        );


    /* =====================================================
       LINKS
       ===================================================== */

    html =
        html.replace(
            /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
            '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
        );


    /* =====================================================
       BULLET LIST
       ===================================================== */

    html =
        html.replace(
            /^\s*[-*•]\s+(.+)$/gm,
            '<div class="markdown-bullet"><span>•</span><span>$1</span></div>'
        );


    /* =====================================================
       NUMBERED LIST
       ===================================================== */

    html =
        html.replace(
            /^\s*(\d+)\.\s+(.+)$/gm,
            '<div class="markdown-number"><span>$1.</span><span>$2</span></div>'
        );


    /* =====================================================
       SIMPLE TABLE
       ===================================================== */

    const lines =
        html.split("\n");


    let output = [];

    let i = 0;


    while (
        i < lines.length
    ) {

        if (
            lines[i].includes("|") &&
            i + 1 < lines.length &&
            lines[i + 1].includes("|---")
        ) {

            const headerCells =
                lines[i]
                    .split("|")
                    .map(cell => cell.trim())
                    .filter(Boolean);


            i += 2;


            let rows = [];


            while (
                i < lines.length &&
                lines[i].includes("|")
            ) {

                const cells =
                    lines[i]
                        .split("|")
                        .map(cell => cell.trim())
                        .filter(Boolean);


                rows.push(cells);

                i++;

            }


            let table =
                '<div class="markdown-table-wrapper"><table><thead><tr>';


            headerCells.forEach(
                cell => {

                    table +=
                        `<th>${cell}</th>`;

                }
            );


            table +=
                "</tr></thead><tbody>";


            rows.forEach(
                row => {

                    table +=
                        "<tr>";


                    row.forEach(
                        cell => {

                            table +=
                                `<td>${cell}</td>`;

                        }
                    );


                    table +=
                        "</tr>";

                }
            );


            table +=
                "</tbody></table></div>";


            output.push(table);

        }

        else {

            output.push(
                lines[i]
            );

            i++;

        }

    }


    html =
        output.join("\n");


    /* =====================================================
       LINE BREAKS
       ===================================================== */

    html =
        html.replace(
            /\n\n/g,
            "<br><br>"
        );


    html =
        html.replace(
            /\n/g,
            "<br>"
        );


    /* =====================================================
       RESTORE CODE BLOCKS
       ===================================================== */

    codeBlocks.forEach(
        function(
            block,
            index
        ) {

            const highlighted =
                highlightCode(
                    block.code,
                    block.language
                );


            const codeHtml = `

                <div class="code-block">

                    <div class="code-header">

                        <span class="code-language">
                            ${escapeHtml(block.language)}
                        </span>

                        <button
                            type="button"
                            class="copy-code"
                            data-code="${encodeURIComponent(block.code)}"
                        >

                            <span class="copy-icon">
                                ⧉
                            </span>

                            <span>
                                Copy
                            </span>

                        </button>

                    </div>

                    <pre><code>${highlighted}</code></pre>

                </div>

            `;


            html =
                html.replace(
                    "@@CODE_BLOCK_" +
                    index +
                    "@@",
                    codeHtml
                );

        }
    );


    return html;
}


/* =========================================================
   COPY CODE
   ========================================================= */

async function copyText(text) {

    try {

        await navigator.clipboard.writeText(
            text
        );

        return true;

    }

    catch {

        try {

            const textarea =
                document.createElement(
                    "textarea"
                );


            textarea.value =
                text;


            document.body.appendChild(
                textarea
            );


            textarea.select();


            document.execCommand(
                "copy"
            );


            textarea.remove();


            return true;

        }

        catch {

            return false;

        }

    }

}


/* =========================================================
   COPY CODE BUTTON
   ========================================================= */

document.addEventListener(
    "click",
    async function(event) {

        const button =
            event.target.closest(
                ".copy-code"
            );


        if (!button) {
            return;
        }


        const code =
            decodeURIComponent(
                button.dataset.code
            );


        const success =
            await copyText(code);


        if (success) {

            button.innerHTML =
                "<span>✓</span> Copied";


            button.classList.add(
                "copied"
            );


            setTimeout(
                function() {

                    button.innerHTML =
                        '<span class="copy-icon">⧉</span><span>Copy</span>';


                    button.classList.remove(
                        "copied"
                    );

                },
                1500
            );

        }

    }
);


/* =========================================================
   ADD USER MESSAGE
   ========================================================= */

function addUserMessage(text) {

    const message =
        document.createElement(
            "div"
        );


    message.className =
        "message user";


    message.dataset.content =
        text;


    message.innerHTML = `

        <div class="message-content">

            <div class="message-text">
                ${escapeHtml(text)}
            </div>

            <div class="message-actions">

                <button
                    class="edit-message"
                    title="Edit message"
                >
                    ✎
                </button>

            </div>

        </div>

    `;


    chatBox.appendChild(
        message
    );


    scrollToBottom();


    return message;
}


/* =========================================================
   ADD BOT MESSAGE
   ========================================================= */

function addBotMessage(
    text
) {

    const message =
        document.createElement(
            "div"
        );


    message.className =
        "message bot";


    message.dataset.content =
        text;


    message.innerHTML = `

        <div class="message-avatar">
            ✦
        </div>

        <div class="message-content">

            <div class="message-name">
                Nova AI
            </div>

            <div class="message-text">
                ${renderMarkdown(text)}
            </div>

            <div class="message-actions bot-actions">

                <button
                    class="copy-response"
                    title="Copy response"
                >
                    ⧉
                </button>

                <button
                    class="regenerate-response"
                    title="Regenerate response"
                >
                    ↻
                </button>

                <button
                    class="like-response"
                    title="Good response"
                >
                    ♡
                </button>

                <button
                    class="dislike-response"
                    title="Bad response"
                >
                    ♧
                </button>

            </div>

        </div>

    `;


    chatBox.appendChild(
        message
    );


    scrollToBottom();


    return message;
}


/* =========================================================
   UPDATE BOT MESSAGE
   ========================================================= */

function updateBotMessage(
    message,
    text
) {

    const messageText =
        message.querySelector(
            ".message-text"
        );


    message.dataset.content =
        text;


    messageText.innerHTML =
        renderMarkdown(text);


    scrollToBottom();
}


/* =========================================================
   COPY ENTIRE RESPONSE
   ========================================================= */

document.addEventListener(
    "click",
    async function(event) {

        const button =
            event.target.closest(
                ".copy-response"
            );


        if (!button) {
            return;
        }


        const message =
            button.closest(
                ".message.bot"
            );


        if (!message) {
            return;
        }


        const text =
            message.dataset.content ||
            "";


        const success =
            await copyText(text);


        if (success) {

            button.textContent =
                "✓";


            setTimeout(
                function() {

                    button.textContent =
                        "⧉";

                },
                1500
            );

        }

    }
);


/* =========================================================
   EDIT USER MESSAGE
   ========================================================= */

document.addEventListener(
    "click",
    function(event) {

        const button =
            event.target.closest(
                ".edit-message"
            );


        if (!button) {
            return;
        }


        const message =
            button.closest(
                ".message.user"
            );


        if (!message) {
            return;
        }


        const text =
            message.dataset.content;


        messageInput.value =
            text;


        messageInput.focus();


        messageInput.setSelectionRange(
            messageInput.value.length,
            messageInput.value.length
        );

    }
);


/* =========================================================
   LIKE / DISLIKE
   ========================================================= */

document.addEventListener(
    "click",
    function(event) {

        const like =
            event.target.closest(
                ".like-response"
            );


        const dislike =
            event.target.closest(
                ".dislike-response"
            );


        if (like) {

            like.classList.toggle(
                "selected"
            );

        }


        if (dislike) {

            dislike.classList.toggle(
                "selected"
            );

        }

    }
);


/* =========================================================
   REGENERATE
   ========================================================= */

document.addEventListener(
    "click",
    async function(event) {

        const button =
            event.target.closest(
                ".regenerate-response"
            );


        if (!button) {
            return;
        }


        if (isGenerating) {
            return;
        }


        /*
           Find the AI message
        */

        const botMessage =
            button.closest(
                ".message.bot"
            );


        if (!botMessage) {
            return;
        }


        /*
           Find previous user message
        */

        let userMessage =
            botMessage.previousElementSibling;


        while (
            userMessage &&
            !userMessage.classList.contains(
                "user"
            )
        ) {

            userMessage =
                userMessage.previousElementSibling;

        }


        if (!userMessage) {
            return;
        }


        const text =
            userMessage.dataset.content;


        /*
           Remove old AI response
        */

        botMessage.remove();


        /*
           Put message back into input
        */

        messageInput.value =
            text;


        /*
           Send again
        */

        await sendMessage();

    }
);


/* =========================================================
   SCROLL
   ========================================================= */

function scrollToBottom() {

    chatBox.scrollTop =
        chatBox.scrollHeight;

}


/* =========================================================
   WELCOME
   ========================================================= */

function showWelcome() {

    chatBox.innerHTML = `

        <div class="welcome">

            <div class="welcome-icon">
                ✦
            </div>

            <h1>
                How can I help you?
            </h1>

            <p>
                Ask me anything, write code,
                brainstorm ideas, or learn something new.
            </p>

            <div class="suggestions">

                <button type="button">
                    <span>⌨</span>
                    Help me write code
                </button>

                <button type="button">
                    <span>✧</span>
                    Explain something
                </button>

                <button type="button">
                    <span>⚡</span>
                    Brainstorm ideas
                </button>

                <button type="button">
                    <span>◈</span>
                    Analyze a problem
                </button>

            </div>

        </div>

    `;


    attachSuggestionEvents();

}


/* =========================================================
   SEND MESSAGE
   ========================================================= */

async function sendMessage() {

    if (isGenerating) {
        return;
    }


    const text =
        messageInput.value.trim();


    if (!text) {
        return;
    }


    isGenerating = true;


    sendButton.disabled =
        true;


    /*
       Remove welcome
    */

    const welcome =
        chatBox.querySelector(
            ".welcome"
        );


    if (welcome) {
        welcome.remove();
    }


    /*
       Show user message
    */

    const userMessage =
        addUserMessage(text);


    /*
       Clear input
    */

    messageInput.value =
        "";


    /*
       Create AI message
    */

    const botMessage =
        document.createElement(
            "div"
        );


    botMessage.className =
        "message bot";


    botMessage.innerHTML = `

        <div class="message-avatar">
            ✦
        </div>

        <div class="message-content">

            <div class="message-name">
                Nova AI
            </div>

            <div class="message-text">

                <div class="typing-indicator">

                    <span></span>
                    <span></span>
                    <span></span>

                </div>

            </div>

        </div>

    `;


    chatBox.appendChild(
        botMessage
    );


    scrollToBottom();


    try {

        const response =
            await fetch(
                "/chat",
                {

                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        message: text
                    })

                }
            );


        if (!response.ok) {

            throw new Error(
                "Server error: " +
                response.status
            );

        }


        const reader =
            response.body.getReader();


        const decoder =
            new TextDecoder();


        let buffer =
            "";


        let fullResponse =
            "";


        const messageText =
            botMessage.querySelector(
                ".message-text"
            );


        while (true) {

            const {
                value,
                done
            } =
                await reader.read();


            if (done) {
                break;
            }


            buffer +=
                decoder.decode(
                    value,
                    {
                        stream: true
                    }
                );


            const events =
                buffer.split(
                    "\n\n"
                );


            buffer =
                events.pop();


            for (
                const event of events
            ) {

                const line =
                    event
                        .split("\n")
                        .find(
                            line =>
                                line.startsWith(
                                    "data:"
                                )
                        );


                if (!line) {
                    continue;
                }


                const data =
                    line
                        .replace(
                            /^data:\s*/,
                            ""
                        )
                        .trim();


                if (
                    data === "[DONE]"
                ) {
                    continue;
                }


                try {

                    const chunk =
                        JSON.parse(
                            data
                        );


                    fullResponse +=
                        chunk;


                    /*
                       Render Markdown while
                       response streams.
                    */

                    messageText.innerHTML =
                        renderMarkdown(
                            fullResponse
                        );


                    scrollToBottom();

                }

                catch (error) {

                    console.error(
                        "Stream error:",
                        error
                    );

                }

            }

        }


        /*
           Store response text
        */

        botMessage.dataset.content =
            fullResponse;


        /*
           Add action buttons after
           response finishes.
        */

        const content =
            botMessage.querySelector(
                ".message-content"
            );


        const actions =
            document.createElement(
                "div"
            );


        actions.className =
            "message-actions bot-actions";


        actions.innerHTML = `

            <button
                class="copy-response"
                title="Copy response"
            >
                ⧉
            </button>

            <button
                class="regenerate-response"
                title="Regenerate response"
            >
                ↻
            </button>

            <button
                class="like-response"
                title="Good response"
            >
                ♡
            </button>

            <button
                class="dislike-response"
                title="Bad response"
            >
                ♧
            </button>

        `;


        content.appendChild(
            actions
        );


        /*
           Refresh Recent Chats
        */

        loadRecentChats();

    }

    catch (error) {

        console.error(
            "Chat error:",
            error
        );


        botMessage.querySelector(
            ".message-text"
        ).textContent =
            "Sorry, something went wrong. Please try again.";

    }

    finally {

        isGenerating =
            false;


        sendButton.disabled =
            false;


        messageInput.focus();

    }

}


/* =========================================================
   RECENT CHATS
   ========================================================= */

async function loadRecentChats() {

    try {

        const response =
            await fetch(
                "/chats"
            );


        if (!response.ok) {
            throw new Error(
                "Could not load chats"
            );
        }


        const chats =
            await response.json();


        renderRecentChats(
            chats
        );

    }

    catch (error) {

        console.error(
            "Recent chats error:",
            error
        );

    }

}


/* =========================================================
   RENDER RECENT CHATS
   ========================================================= */

function renderRecentChats(
    chats
) {

    if (!sidebarSection) {
        return;
    }


    sidebarSection.innerHTML = `

        <div class="section-title">
            Recent
        </div>

    `;


    if (
        !chats ||
        chats.length === 0
    ) {

        const empty =
            document.createElement(
                "div"
            );


        empty.className =
            "empty-history";


        empty.textContent =
            "No conversations yet.";


        sidebarSection.appendChild(
            empty
        );


        return;

    }


    chats.forEach(
        function(chat) {

            const item =
                document.createElement(
                    "div"
                );


            item.className =
                "chat-history";


            item.dataset.chatId =
                chat.id;


            if (
                Number(currentChatId) ===
                Number(chat.id)
            ) {

                item.classList.add(
                    "active"
                );

            }


            item.innerHTML = `

                <span>◌</span>

                <span class="history-text">
                    ${escapeHtml(chat.title)}
                </span>

                <button
                    class="history-delete"
                    title="Delete chat"
                >
                    ×
                </button>

            `;


            item.addEventListener(
                "click",
                function(event) {

                    if (
                        event.target.closest(
                            ".history-delete"
                        )
                    ) {

                        return;

                    }


                    loadChat(
                        chat.id
                    );

                }
            );


            const deleteButton =
                item.querySelector(
                    ".history-delete"
                );


            deleteButton.addEventListener(
                "click",
                function(event) {

                    event.stopPropagation();


                    deleteChat(
                        chat.id
                    );

                }
            );


            sidebarSection.appendChild(
                item
            );

        }
    );

}


/* =========================================================
   LOAD CHAT
   ========================================================= */

async function loadChat(
    chatId
) {

    try {

        const response =
            await fetch(
                "/chats/" +
                chatId
            );


        if (!response.ok) {

            throw new Error(
                "Could not load chat"
            );

        }


        const chat =
            await response.json();


        currentChatId =
            chat.id;


        chatBox.innerHTML =
            "";


        if (
            !chat.messages ||
            chat.messages.length === 0
        ) {

            showWelcome();

        }

        else {

            chat.messages.forEach(
                function(message) {

                    if (
                        message.role ===
                        "user"
                    ) {

                        addUserMessage(
                            message.content
                        );

                    }

                    else if (
                        message.role ===
                        "assistant"
                    ) {

                        addBotMessage(
                            message.content
                        );

                    }

                }
            );

        }


        await loadRecentChats();


        scrollToBottom();


        messageInput.focus();

    }

    catch (error) {

        console.error(
            "Load chat error:",
            error
        );

        alert(
            "Could not load this conversation."
        );

    }

}


/* =========================================================
   NEW CHAT
   ========================================================= */

async function createNewChat() {

    try {

        const response =
            await fetch(
                "/new-chat",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    }
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                "Could not create chat"
            );

        }


        currentChatId =
            data.chat_id;


        showWelcome();


        await loadRecentChats();


        messageInput.focus();

    }

    catch (error) {

        console.error(
            "New chat error:",
            error
        );


        alert(
            "Could not create a new chat."
        );

    }

}


/* =========================================================
   DELETE CHAT
   ========================================================= */

async function deleteChat(
    chatId
) {

    if (
        !confirm(
            "Delete this conversation?"
        )
    ) {

        return;

    }


    try {

        const response =
            await fetch(
                "/chats/" +
                chatId,
                {
                    method: "DELETE"
                }
            );


        if (!response.ok) {

            throw new Error(
                "Delete failed"
            );

        }


        if (
            Number(currentChatId) ===
            Number(chatId)
        ) {

            currentChatId =
                null;


            showWelcome();

        }


        loadRecentChats();

    }

    catch (error) {

        console.error(
            "Delete error:",
            error
        );


        alert(
            "Could not delete conversation."
        );

    }

}


/* =========================================================
   SUGGESTIONS
   ========================================================= */

function attachSuggestionEvents() {

    const buttons =
        document.querySelectorAll(
            ".suggestions button"
        );


    buttons.forEach(
        function(button) {

            button.onclick =
                function() {

                    const text =
                        button.textContent.trim();


                    if (
                        text.includes(
                            "Help me write code"
                        )
                    ) {

                        messageInput.value =
                            "Help me write some code";

                    }

                    else if (
                        text.includes(
                            "Explain something"
                        )
                    ) {

                        messageInput.value =
                            "Explain something to me";

                    }

                    else if (
                        text.includes(
                            "Brainstorm ideas"
                        )
                    ) {

                        messageInput.value =
                            "Help me brainstorm some creative ideas";

                    }

                    else {

                        messageInput.value =
                            "Help me analyze a problem";

                    }


                    messageInput.focus();

                };

        }
    );

}


/* =========================================================
   SETTINGS
   ========================================================= */

function openSettings() {

    const overlay =
        document.createElement(
            "div"
        );


    overlay.className =
        "nova-modal-overlay";


    overlay.innerHTML = `

        <div class="nova-modal">

            <div class="nova-modal-header">

                <div>

                    <h2>
                        Settings
                    </h2>

                    <span>
                        Customize your Nova AI experience
                    </span>

                </div>

                <button
                    class="nova-modal-close"
                >
                    ×
                </button>

            </div>


            <div class="nova-modal-body">

                <div class="settings-card">

                    <div class="settings-icon">
                        ◐
                    </div>

                    <div class="settings-info">

                        <strong>
                            Appearance
                        </strong>

                        <p>
                            Nova AI currently uses dark mode.
                        </p>

                    </div>

                </div>


                <div class="settings-card">

                    <div class="settings-icon">
                        ✦
                    </div>

                    <div class="settings-info">

                        <strong>
                            AI Model
                        </strong>

                        <p>
                            Gemini-powered Nova AI assistant.
                        </p>

                    </div>

                </div>

            </div>

        </div>

    `;


    document.body.appendChild(
        overlay
    );


    overlay.querySelector(
        ".nova-modal-close"
    ).onclick =
        function() {

            overlay.remove();

        };


    overlay.onclick =
        function(event) {

            if (
                event.target === overlay
            ) {

                overlay.remove();

            }

        };

}


/* =========================================================
   HELP
   ========================================================= */

function openHelp() {

    const overlay =
        document.createElement(
            "div"
        );


    overlay.className =
        "nova-modal-overlay";


    overlay.innerHTML = `

        <div class="nova-modal">

            <div class="nova-modal-header">

                <div>

                    <h2>
                        Help & Information
                    </h2>

                    <span>
                        Learn how to use Nova AI
                    </span>

                </div>

                <button
                    class="nova-modal-close"
                >
                    ×
                </button>

            </div>


            <div class="nova-modal-body">

                <div class="help-card">

                    <div class="help-icon">
                        ✦
                    </div>

                    <div>

                        <strong>
                            Start a conversation
                        </strong>

                        <p>
                            Type your question and press
                            Enter or click the arrow.
                        </p>

                    </div>

                </div>


                <div class="help-card">

                    <div class="help-icon">
                        ◌
                    </div>

                    <div>

                        <strong>
                            Recent conversations
                        </strong>

                        <p>
                            Your conversations are saved
                            automatically.
                        </p>

                    </div>

                </div>


                <div class="help-card">

                    <div class="help-icon">
                        ⧉
                    </div>

                    <div>

                        <strong>
                            Copy code
                        </strong>

                        <p>
                            Use the Copy button on any
                            generated code block.
                        </p>

                    </div>

                </div>

            </div>

        </div>

    `;


    document.body.appendChild(
        overlay
    );


    overlay.querySelector(
        ".nova-modal-close"
    ).onclick =
        function() {

            overlay.remove();

        };


    overlay.onclick =
        function(event) {

            if (
                event.target === overlay
            ) {

                overlay.remove();

            }

        };

}


/* =========================================================
   BUTTON EVENTS
   ========================================================= */

if (sendButton) {

    sendButton.onclick =
        sendMessage;

}


if (messageInput) {

    messageInput.onkeydown =
        function(event) {

            if (
                event.key === "Enter" &&
                !event.shiftKey
            ) {

                event.preventDefault();

                sendMessage();

            }

        };

}


if (newChatButton) {

    newChatButton.onclick =
        createNewChat;

}


if (settingsButton) {

    settingsButton.onclick =
        openSettings;

}


if (helpButton) {

    helpButton.onclick =
        openHelp;

}


/* =========================================================
   INITIAL LOAD
   ========================================================= */

attachSuggestionEvents();

loadRecentChats();

messageInput.focus();