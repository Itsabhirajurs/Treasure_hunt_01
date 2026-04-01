from flask import Blueprint, jsonify, request

from config import get_supabase
from services.anomaly_service import check_anomaly
from services.gemini_service import generate_hint, validate_answer
from services.scoring_service import calculate_score

game_bp = Blueprint("game", __name__)

CLUES = [
    {
        "round": 1,
        "clue": "I have cities but no houses, mountains but no trees, water but no fish, and roads but no cars. What am I?",
        "answer": "map",
        "category": "Classic Riddle",
        "difficulty": 1,
    },
    {
        "round": 2,
        "clue": "In data science, I am the middle value when you sort a dataset. Remove outliers and I stay stable, unlike my cousin the mean. What am I?",
        "answer": "median",
        "category": "Data Science",
        "difficulty": 2,
    },
    {
        "round": 3,
        "clue": "I am the pirate's most feared weapon, not a sword, not a cannon, but I can sink an entire empire. I travel faster than ships and leave no physical trace. In the digital age, I am reborn. What am I?",
        "answer": "information",
        "category": "Philosophy",
        "difficulty": 3,
    },
    {
        "round": 4,
        "clue": "Scientists call me the blueprint of life. I use only four letters to write every living story ever told. Pirates seek gold, but I am the true treasure hidden in every cell. What am I?",
        "answer": "dna",
        "category": "Biology",
        "difficulty": 4,
    },
    {
        "round": 5,
        "clue": "I was born in mathematics, grew up in statistics, and now I teach machines to see, hear, and think. I find patterns in chaos and turn data into wisdom. The future bows to me. What am I?",
        "answer": "artificial intelligence",
        "category": "AI",
        "difficulty": 5,
    },
]


def clue_for_round(round_num):
    return next((clue for clue in CLUES if clue["round"] == round_num), None)


def evaluate_badges(team, round_num, hints_used, time_elapsed_seconds):
    existing = set(team.get("badges") or [])
    earned = None

    if time_elapsed_seconds < 60:
        existing.add("Speed Demon")
    if hints_used == 0:
        existing.add("No Hints Hero")
    if round_num == 2 and time_elapsed_seconds < 45:
        existing.add("Data Pirate")

    if team.get("current_round", 1) >= 5:
        existing.add("Treasure Master")

    if len(existing) > len(team.get("badges") or []):
        earned = list(existing - set(team.get("badges") or []))[0]

    return sorted(existing), earned


@game_bp.get("/api/clue")
def get_clue():
    round_num = int(request.args.get("round", 1))
    clue = clue_for_round(round_num)
    if clue is None:
        return jsonify({"error": "Round not found"}), 404

    return jsonify(
        {
            "round": clue["round"],
            "clue": clue["clue"],
            "category": clue["category"],
            "difficulty": clue["difficulty"],
        }
    )


@game_bp.post("/api/submit")
def submit_answer():
    supabase = get_supabase()
    if supabase is None:
        return jsonify({"error": "Supabase not configured"}), 500

    payload = request.get_json(silent=True) or {}
    team_id = payload.get("team_id")
    round_num = int(payload.get("round_num", 1))
    user_answer = (payload.get("answer") or "").strip()
    time_elapsed_seconds = int(payload.get("time_elapsed_seconds", 0))
    hints_used = int(payload.get("hints_used", 0))

    clue = clue_for_round(round_num)
    if clue is None:
        return jsonify({"error": "Invalid round"}), 400

    verdict = validate_answer(clue["clue"], clue["answer"], user_answer)
    is_correct = bool(verdict.get("is_correct", False))
    score = (
        calculate_score(
            base=1000,
            time_elapsed_sec=time_elapsed_seconds,
            hints_used=hints_used,
            round_number=round_num,
        )
        if is_correct
        else 0
    )
    anomaly = check_anomaly(time_elapsed_seconds, round_num)

    supabase.table("submissions").insert(
        {
            "team_id": team_id,
            "round_num": round_num,
            "answer_submitted": user_answer,
            "is_correct": is_correct,
            "time_elapsed_seconds": time_elapsed_seconds,
            "hints_used": hints_used,
            "score_awarded": score,
            "anomaly_flagged": anomaly["suspicious"],
        }
    ).execute()

    if not is_correct:
        return jsonify(
            {
                "correct": False,
                "score": 0,
                "reason": verdict.get("reason", "Incorrect answer"),
                "anomaly_flagged": anomaly["suspicious"],
            }
        )

    team_result = supabase.table("teams").select("*").eq("id", team_id).limit(1).execute()
    if not team_result.data:
        return jsonify({"error": "Team not found"}), 404

    team = team_result.data[0]
    new_round = min(6, int(team.get("current_round", 1)) + 1)
    completed = new_round > 5
    new_score = int(team.get("total_score", 0)) + score
    new_badges, badge_earned = evaluate_badges(team, round_num, hints_used, time_elapsed_seconds)

    updated = (
        supabase.table("teams")
        .update(
            {
                "current_round": new_round,
                "total_score": new_score,
                "badges": new_badges,
                "hints_used_total": int(team.get("hints_used_total", 0)) + hints_used,
                "completed": completed,
            }
        )
        .eq("id", team_id)
        .execute()
    )

    return jsonify(
        {
            "correct": True,
            "score": score,
            "badge_earned": badge_earned,
            "anomaly_flagged": anomaly["suspicious"],
            "reason": verdict.get("reason", "Accepted"),
            "team": updated.data[0] if updated.data else None,
        }
    )


@game_bp.get("/api/hint")
def get_hint():
    round_num = int(request.args.get("round", 1))
    hint_num = int(request.args.get("hint_num", 1))
    clue = clue_for_round(round_num)
    if clue is None:
        return jsonify({"error": "Round not found"}), 404

    hint = generate_hint(clue["clue"], clue["answer"], hint_num)
    return jsonify({"hint": hint})
