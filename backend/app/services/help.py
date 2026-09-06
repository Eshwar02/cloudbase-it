"""Cloudbase help knowledge base.

Powers the Help chatbot. When the Mistral key is configured the topics below are
injected into the system prompt for grounded answers; otherwise a lightweight
keyword matcher returns the best-fitting topic answer so the assistant still
works offline.
"""
from __future__ import annotations

import re

# Each topic: keywords used for the offline matcher + a canonical answer.
TOPICS: list[dict] = [
    {
        "title": "Upload files",
        "keywords": ["upload", "add file", "import", "drag", "drop"],
        "answer": (
            "Click the New button in the sidebar and choose Upload files, or drag "
            "files straight onto the file area. Progress shows under the toolbar and "
            "the list refreshes when each upload finishes."
        ),
    },
    {
        "title": "Create a folder",
        "keywords": ["folder", "new folder", "create folder", "make folder"],
        "answer": (
            "Click New in the sidebar and pick New folder, then type a name in the "
            "dialog and press Create. The folder appears in the current location."
        ),
    },
    {
        "title": "Recover a deleted file",
        "keywords": ["delete", "deleted", "recover", "restore", "trash", "undo"],
        "answer": (
            "Deleting a file moves it to Trash rather than removing it. Open Trash "
            "from the sidebar and click Restore, or press Undo on the notification "
            "right after deleting."
        ),
    },
    {
        "title": "Delete files permanently",
        "keywords": ["permanent", "forever", "empty trash", "remove for good"],
        "answer": (
            "In Trash, use Delete forever to permanently remove an item. If deletion "
            "confirmation is on in Settings you will be asked to confirm first."
        ),
    },
    {
        "title": "Share a file or folder",
        "keywords": ["share", "shared", "collaborate", "link", "permission"],
        "answer": (
            "Open the item's ⋮ menu and choose Share. You can invite people by email "
            "as viewer or editor, or create a link. Items shared with you appear "
            "under Shared."
        ),
    },
    {
        "title": "Manage your storage",
        "keywords": ["storage", "quota", "space", "full", "gb"],
        "answer": (
            "Your storage meter is in the sidebar and on the Settings page. Free up "
            "space by permanently deleting large items from Trash."
        ),
    },
    {
        "title": "Star important items",
        "keywords": ["star", "starred", "favourite", "favorite", "bookmark"],
        "answer": (
            "Use the ⋮ menu and choose Add to starred. Starred files and folders are "
            "collected under Starred in the sidebar for quick access."
        ),
    },
    {
        "title": "Search your Drive",
        "keywords": ["search", "find", "look for", "semantic"],
        "answer": (
            "Use the search bar at the top. Toggle AI for meaning-based (semantic) "
            "search that finds files even when the wording differs."
        ),
    },
    {
        "title": "Change appearance and settings",
        "keywords": ["dark", "theme", "appearance", "settings", "density", "view"],
        "answer": (
            "Open Settings from the gear icon or your avatar menu. You can switch "
            "between light and dark, choose comfortable or compact density, set the "
            "default list/grid view, and toggle deletion confirmation."
        ),
    },
    {
        "title": "Update your profile or password",
        "keywords": ["profile", "name", "password", "account", "change password"],
        "answer": (
            "Open Profile from your avatar menu to edit your display name or change "
            "your password."
        ),
    },
]

SYSTEM_PROMPT = (
    "You are the Cloudbase help assistant. Cloudbase is a cloud file-storage app "
    "with folders, upload/download, trash with restore, sharing, starring, search "
    "(including AI semantic search), and per-user settings. Answer concisely and "
    "practically, only about using Cloudbase. If asked something unrelated, gently "
    "steer back to Cloudbase. Reference this feature guide:\n"
    + "\n".join(f"- {t['title']}: {t['answer']}" for t in TOPICS)
)


def faq_answer(message: str) -> str:
    """Best-effort offline answer via keyword overlap scoring."""
    text = message.lower()
    words = set(re.findall(r"[a-z]+", text))
    best, best_score = None, 0
    for topic in TOPICS:
        score = 0
        for kw in topic["keywords"]:
            if kw in text:
                score += 2
            elif set(kw.split()) & words:
                score += 1
        if score > best_score:
            best, best_score = topic, score
    if best is None or best_score == 0:
        titles = ", ".join(t["title"].lower() for t in TOPICS[:6])
        return (
            "I can help with Cloudbase — for example: " + titles + ". "
            "Try asking about one of those, or rephrase your question."
        )
    return best["answer"]
