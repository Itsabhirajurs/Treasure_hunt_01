import json

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
    response = model.generate_content(prompt)
    return response.text.strip()
