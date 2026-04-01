from difflib import SequenceMatcher

SYNONYM_GROUPS = [
    {"artificial intelligence", "ai", "machine intelligence"},
    {"map", "atlas", "cartography map"},
    {"information", "data", "knowledge"},
    {"dna", "deoxyribonucleic acid"},
    {"median", "middle value"},
]


def _normalize(text):
    return " ".join((text or "").strip().lower().split())


def _is_synonym_match(user_answer, correct_answer):
    ua = _normalize(user_answer)
    ca = _normalize(correct_answer)
    for group in SYNONYM_GROUPS:
        if ua in group and ca in group:
            return True
    return False


def validate_answer(clue_text, correct_answer, user_answer):
    normalized_user = _normalize(user_answer)
    normalized_correct = _normalize(correct_answer)

    if normalized_user == normalized_correct:
        return {"is_correct": True, "reason": "Exact match"}

    if _is_synonym_match(normalized_user, normalized_correct):
        return {"is_correct": True, "reason": "Accepted semantic synonym"}

    fuzzy = SequenceMatcher(None, normalized_user, normalized_correct).ratio()
    if fuzzy >= 0.84:
        return {"is_correct": True, "reason": "Accepted close spelling/semantic match"}

    return {"is_correct": False, "reason": "Not close enough to expected answer"}


def answer_closeness(user_answer, correct_answer):
    ua = _normalize(user_answer)
    ca = _normalize(correct_answer)
    if not ua or not ca:
        return 0.0
    return round(SequenceMatcher(None, ua, ca).ratio(), 3)


def generate_hint(clue_text, correct_answer, hint_number):
    safe_letter = (correct_answer or "?").strip()[:1].upper() or "?"
    hints = [
        "Seek the central concept in the clue, not a specific object.",
        f"The answer starts with '{safe_letter}' and matches the clue theme.",
        "Think of the textbook term that best fits every line of the clue.",
    ]
    return hints[min(max(hint_number - 1, 0), 2)]
