from flask import (
    Flask,
    render_template,
    request,
    jsonify,
    Response,
    stream_with_context,
    session
)

import os
import json

import psycopg
from psycopg.rows import dict_row

from dotenv import load_dotenv
from openai import OpenAI


# =========================================================
# CONFIGURATION
# =========================================================

# Get the folder where app.py is located
BASE_DIR = os.path.dirname(os.path.abspath(__file__))


# ---------------------------------------------------------
# LOAD ENVIRONMENT VARIABLES
# ---------------------------------------------------------

# Load .env from inside .venv
ENV_FILE = os.path.join(BASE_DIR, ".env")

# Load .env.local for Vercel/local development variables
ENV_LOCAL_FILE = os.path.join(BASE_DIR, ".env.local")

load_dotenv(ENV_FILE)
load_dotenv(ENV_LOCAL_FILE, override=True)


# ---------------------------------------------------------
# NEON POSTGRESQL DATABASE
# ---------------------------------------------------------

DATABASE_URL = os.getenv("DATABASE_URL")


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

    if not DATABASE_URL:
        raise RuntimeError(
            "DATABASE_URL is not configured."
        )

    return psycopg.connect(
        DATABASE_URL,
        row_factory=dict_row
    )


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

            id SERIAL PRIMARY KEY,

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

            id SERIAL PRIMARY KEY,

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

    cursor.close()
    connection.close()


# Initialize database when application starts
init_db()


# =========================================================
# CREATE NEW CHAT
# =========================================================

def create_chat(title="New conversation"):

    connection = get_db()

    cursor = connection.cursor()


    cursor.execute("""
        INSERT INTO chats (title)

        VALUES (%s)

        RETURNING id
    """, (title,))


    chat_id = cursor.fetchone()["id"]


    connection.commit()

    cursor.close()
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

        VALUES (%s, %s, %s)
    """, (
        chat_id,
        role,
        content
    ))


    # Update chat's last activity time
    cursor.execute("""
        UPDATE chats

        SET updated_at = CURRENT_TIMESTAMP

        WHERE id = %s
    """, (chat_id,))


    connection.commit()

    cursor.close()
    connection.close()


# =========================================================
# UPDATE CHAT TITLE
# =========================================================

def update_chat_title(chat_id, title):

    connection = get_db()

    cursor = connection.cursor()


    cursor.execute("""
        UPDATE chats

        SET title = %s,
            updated_at = CURRENT_TIMESTAMP

        WHERE id = %s
    """, (
        title,
        chat_id
    ))


    connection.commit()

    cursor.close()
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

    cursor.close()
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


    # -----------------------------------------------------
    # GET CHAT
    # -----------------------------------------------------

    cursor.execute("""
        SELECT
            id,
            title,
            created_at,
            updated_at

        FROM chats

        WHERE id = %s
    """, (chat_id,))


    chat = cursor.fetchone()


    if chat is None:

        cursor.close()
        connection.close()

        return jsonify({
            "error": "Chat not found"
        }), 404


    # -----------------------------------------------------
    # GET MESSAGES
    # -----------------------------------------------------

    cursor.execute("""
        SELECT
            id,
            role,
            content,
            created_at

        FROM messages

        WHERE chat_id = %s

        ORDER BY id ASC
    """, (chat_id,))


    messages = cursor.fetchall()


    cursor.close()
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


    # -----------------------------------------------------
    # DELETE MESSAGES
    # -----------------------------------------------------

    cursor.execute("""
        DELETE FROM messages

        WHERE chat_id = %s
    """, (chat_id,))


    # -----------------------------------------------------
    # DELETE CHAT
    # -----------------------------------------------------

    cursor.execute("""
        DELETE FROM chats

        WHERE id = %s
    """, (chat_id,))


    connection.commit()

    cursor.close()
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


    # -----------------------------------------------------
    # EMPTY MESSAGE
    # -----------------------------------------------------

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

        WHERE id = %s
    """, (chat_id,))


    chat = cursor.fetchone()


    cursor.close()
    connection.close()


    # -----------------------------------------------------
    # CREATE TITLE FROM FIRST MESSAGE
    # -----------------------------------------------------

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


    # =====================================================
    # RETURN STREAM
    # =====================================================

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

    print("")
    print("====================================")
    print("        NOVA AI CHATBOT")
    print("====================================")
    print("")


    print(
        "Database:",
        "Neon PostgreSQL" if DATABASE_URL else "Missing"
    )


    print(
        "Gemini API:",
        "Connected"
        if os.getenv("GEMINI_API_KEY")
        else "Missing"
    )


    print("")
    print("Starting Flask server...")
    print("")


    app.run(
        debug=True
    )