from flask import (
    Flask,
    render_template,
    request,
    jsonify,
    Response,
    stream_with_context,
    session
)

import sqlite3
import os
import json

from dotenv import load_dotenv
from openai import OpenAI


# =========================================================
# CONFIGURATION
# =========================================================

# Get the folder where app.py is located
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Load .env from inside .venv
ENV_FILE = os.path.join(BASE_DIR, ".env")
load_dotenv(ENV_FILE)


# SQLite database
DATABASE = os.path.join(BASE_DIR, "chatbot.db")


# =========================================================
# FLASK APP
# =========================================================

app = Flask(__name__)

# Used for Flask sessions
app.secret_key = os.getenv(
    "FLASK_SECRET_KEY",
    "nova-ai-development-key"
)


# =========================================================
# GEMINI CLIENT
# =========================================================

client = OpenAI(
    api_key=os.getenv("GEMINI_API_KEY"),
    base_url="https://generativelanguage.googleapis.com/v1beta/openai/"
)


# =========================================================
# DATABASE CONNECTION
# =========================================================

def get_db():

    connection = sqlite3.connect(DATABASE)

    # Allows us to access columns by name
    connection.row_factory = sqlite3.Row

    return connection


# =========================================================
# CREATE DATABASE TABLES
# =========================================================

def init_db():

    connection = get_db()

    cursor = connection.cursor()


    # -----------------------------------------------------
    # CHATS TABLE
    # -----------------------------------------------------

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS chats (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            title TEXT NOT NULL,

            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

        )
    """)


    # -----------------------------------------------------
    # MESSAGES TABLE
    # -----------------------------------------------------

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS messages (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            chat_id INTEGER NOT NULL,

            role TEXT NOT NULL,

            content TEXT NOT NULL,

            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY (chat_id)
                REFERENCES chats(id)
                ON DELETE CASCADE

        )
    """)


    connection.commit()

    connection.close()


# =========================================================
# CREATE NEW CHAT
# =========================================================

def create_chat(title="New conversation"):

    connection = get_db()

    cursor = connection.cursor()


    cursor.execute("""
        INSERT INTO chats (title)
        VALUES (?)
    """, (title,))


    chat_id = cursor.lastrowid

    connection.commit()

    connection.close()


    return chat_id


# =========================================================
# SAVE MESSAGE
# =========================================================

def save_message(chat_id, role, content):

    connection = get_db()

    cursor = connection.cursor()


    cursor.execute("""
        INSERT INTO messages
        (chat_id, role, content)

        VALUES (?, ?, ?)
    """, (
        chat_id,
        role,
        content
    ))


    # Update chat's last activity time
    cursor.execute("""
        UPDATE chats

        SET updated_at = CURRENT_TIMESTAMP

        WHERE id = ?
    """, (chat_id,))


    connection.commit()

    connection.close()


# =========================================================
# UPDATE CHAT TITLE
# =========================================================

def update_chat_title(chat_id, title):

    connection = get_db()

    cursor = connection.cursor()


    cursor.execute("""
        UPDATE chats

        SET title = ?,
            updated_at = CURRENT_TIMESTAMP

        WHERE id = ?
    """, (
        title,
        chat_id
    ))


    connection.commit()

    connection.close()


# =========================================================
# HOME PAGE
# =========================================================

@app.route("/")
def index():

    return render_template("index.html")


# =========================================================
# CREATE NEW CHAT API
# =========================================================

@app.route("/new-chat", methods=["POST"])
def new_chat():

    # Create a new chat
    chat_id = create_chat()


    # Store current chat in session
    session["chat_id"] = chat_id


    return jsonify({
        "success": True,
        "chat_id": chat_id
    })


# =========================================================
# GET RECENT CHATS
# =========================================================

@app.route("/chats", methods=["GET"])
def get_chats():

    connection = get_db()

    cursor = connection.cursor()


    cursor.execute("""
        SELECT
            id,
            title,
            created_at,
            updated_at

        FROM chats

        ORDER BY updated_at DESC

        LIMIT 30
    """)


    chats = cursor.fetchall()

    connection.close()


    result = []


    for chat in chats:

        result.append({
            "id": chat["id"],
            "title": chat["title"],
            "created_at": chat["created_at"],
            "updated_at": chat["updated_at"]
        })


    return jsonify(result)


# =========================================================
# GET SINGLE CHAT
# =========================================================

@app.route("/chats/<int:chat_id>", methods=["GET"])
def get_chat(chat_id):

    connection = get_db()

    cursor = connection.cursor()


    # Get chat
    cursor.execute("""
        SELECT
            id,
            title,
            created_at,
            updated_at

        FROM chats

        WHERE id = ?
    """, (chat_id,))


    chat = cursor.fetchone()


    if chat is None:

        connection.close()

        return jsonify({
            "error": "Chat not found"
        }), 404


    # Get messages
    cursor.execute("""
        SELECT
            id,
            role,
            content,
            created_at

        FROM messages

        WHERE chat_id = ?

        ORDER BY id ASC
    """, (chat_id,))


    messages = cursor.fetchall()

    connection.close()


    result_messages = []


    for message in messages:

        result_messages.append({
            "id": message["id"],
            "role": message["role"],
            "content": message["content"],
            "created_at": message["created_at"]
        })


    # Make this the current chat
    session["chat_id"] = chat_id


    return jsonify({

        "id": chat["id"],

        "title": chat["title"],

        "created_at": chat["created_at"],

        "updated_at": chat["updated_at"],

        "messages": result_messages

    })


# =========================================================
# DELETE CHAT
# =========================================================

@app.route("/chats/<int:chat_id>", methods=["DELETE"])
def delete_chat(chat_id):

    connection = get_db()

    cursor = connection.cursor()


    # Delete messages first
    cursor.execute("""
        DELETE FROM messages

        WHERE chat_id = ?
    """, (chat_id,))


    # Delete chat
    cursor.execute("""
        DELETE FROM chats

        WHERE id = ?
    """, (chat_id,))


    connection.commit()

    connection.close()


    # If deleted chat was current chat
    if session.get("chat_id") == chat_id:

        session.pop("chat_id", None)


    return jsonify({
        "success": True
    })


# =========================================================
# CHAT WITH GEMINI
# =========================================================

@app.route("/chat", methods=["POST"])
def chat():

    data = request.get_json()

    message = data.get(
        "message",
        ""
    ).strip()


    # Empty message
    if not message:

        return jsonify({
            "reply": "Please type a message."
        })


    # -----------------------------------------------------
    # GET CURRENT CHAT
    # -----------------------------------------------------

    chat_id = session.get("chat_id")


    # If there is no current chat,
    # automatically create one
    if chat_id is None:

        chat_id = create_chat()

        session["chat_id"] = chat_id


    print(
        f"Chat {chat_id} | User said:",
        message
    )


    # -----------------------------------------------------
    # SAVE USER MESSAGE
    # -----------------------------------------------------

    save_message(
        chat_id,
        "user",
        message
    )


    # -----------------------------------------------------
    # SET CHAT TITLE
    # -----------------------------------------------------

    connection = get_db()

    cursor = connection.cursor()


    cursor.execute("""
        SELECT title

        FROM chats

        WHERE id = ?
    """, (chat_id,))


    chat = cursor.fetchone()


    connection.close()


    # Create title from first message
    if chat and chat["title"] == "New conversation":

        title = message.strip()

        # Keep title short
        if len(title) > 40:

            title = title[:40].rstrip() + "..."


        update_chat_title(
            chat_id,
            title
        )


    # =====================================================
    # STREAM GEMINI RESPONSE
    # =====================================================

    @stream_with_context
    def generate():

        full_response = ""


        try:

            response = client.chat.completions.create(

                model="gemini-3.5-flash-lite",

                messages=[

                    {
                        "role": "system",

                        "content":
                            "You are Nova AI, a helpful "
                            "and friendly AI assistant."
                    },

                    {
                        "role": "user",

                        "content": message
                    }

                ],

                stream=True
            )


            # -------------------------------------------------
            # STREAM RESPONSE
            # -------------------------------------------------

            for chunk in response:

                content = chunk.choices[0].delta.content


                if content:

                    full_response += content


                    # Send chunk to browser
                    yield (
                        f"data: "
                        f"{json.dumps(content)}"
                        f"\n\n"
                    )


            # -------------------------------------------------
            # SAVE COMPLETE AI RESPONSE
            # -------------------------------------------------

            if full_response:

                save_message(
                    chat_id,
                    "assistant",
                    full_response
                )


            # Tell browser we're finished
            yield "data: [DONE]\n\n"


        except Exception as e:

            print(
                "Gemini Error:",
                e
            )


            error_message = (
                "Sorry, I couldn't get a response "
                "from the AI."
            )


            yield (
                f"data: "
                f"{json.dumps(error_message)}"
                f"\n\n"
            )


            yield "data: [DONE]\n\n"


    # -----------------------------------------------------
    # RETURN STREAM
    # -----------------------------------------------------

    return Response(

        generate(),

        mimetype="text/event-stream",

        headers={

            "Cache-Control": "no-cache",

            "X-Accel-Buffering": "no-cache"
        }
    )


# =========================================================
# START APPLICATION
# =========================================================

if __name__ == "__main__":

    # Create database/tables
    init_db()


    print("")
    print("====================================")
    print("        NOVA AI CHATBOT")
    print("====================================")
    print("")
    print("Database:", DATABASE)
    print("Gemini API:", "Connected" if os.getenv("GEMINI_API_KEY") else "Missing")
    print("")
    print("Starting Flask server...")
    print("")


    app.run(
        debug=True
    )