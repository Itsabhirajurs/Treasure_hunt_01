import json
from difflib import SequenceMatcher

import google.generativeai as genai

from config import GEMINI_API_KEY

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel("gemini-1.5-flash")
else:
    model = None


def validate_answer(clue_text, correct_answer, user_answer):
    normalized_user = (user_answer or "").strip().lower()
    normalized_correct = (correct_answer or "").strip().lower()

    if normalized_user == normalized_correct:
        return {"is_correct": True, "reason": "Exact match"}

    if model is None:
        return {"is_correct": False, "reason": "Gemini unavailable and exact match failed"}

    prompt = f'''
Riddle: "{clue_text}"
Correct answer: "{correct_answer}"
User's answer: "{user_answer}"

Is the user's answer essentially correct? Accept synonyms,
common abbreviations (for example "AI" for "artificial intelligence"),
and minor spelling errors. Be generous but not too lenient.

Respond ONLY with valid JSON, nothing else:
{{"is_correct": true or false, "reason": "one sentence explanation"}}
'''

    response = model.generate_content(prompt)
    try:
        return json.loads(response.text.strip())
    except Exception:
        fallback = normalized_user in {"ai", "artificial intelligence"} and normalized_correct in {
            "ai",
            "artificial intelligence",
        }
        return {
            "is_correct": bool(fallback),
            "reason": "Fallback semantic check",
        }


def answer_closeness(user_answer, correct_answer):
    ua = (user_answer or "").strip().lower()
    ca = (correct_answer or "").strip().lower()
    if not ua or not ca:
        return 0.0
    return round(SequenceMatcher(None, ua, ca).ratio(), 3)


def generate_hint(clue_text, correct_answer, hint_number):
    levels = ["extremely cryptic and vague", "somewhat helpful", "quite direct but not obvious"]
    level = levels[min(max(hint_number - 1, 0), 2)]

    if model is None:
        fallbacks = [
            "Seek the broad concept, not a specific object.",
            "Think of the central idea this clue points to.",
            f"It strongly relates to: {correct_answer[0]}...",
        ]
        return fallbacks[min(max(hint_number - 1, 0), 2)]

    prompt = f'''
You are a pirate oracle. For this riddle: "{clue_text}"
The answer is "{correct_answer}".
Give a {level} hint. Under 20 words. Pirate flavor.
Do NOT say the answer directly. Return only the hint text.
'''
    try:
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception:
        fallbacks = [
            "Look for the core concept, matey.",
            "Focus on the subject this clue describes.",
            f"It begins like this: {correct_answer[:2]}...",
        ]
        return fallbacks[min(max(hint_number - 1, 0), 2)]


def chatbot_reply(user_message, round_number, team_name):
    if model is None:
        return "Oracle offline. Use hints and read the clue carefully, captain."

    prompt = f'''
You are the OJAS Treasure Hunt Pirate Assistant.
Team: {team_name}
Current round: {round_number}
User asked: "{user_message}"

Rules:
- Never reveal direct final answers.
- Give concise, motivating guidance.
- If user asks strategy, provide 3 short actionable tips.
- Keep pirate tone but clear.
'''
    try:
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception:
        return "Stormy seas in the oracle channel. Try again in a moment."
