from flask import Blueprint, jsonify, request

from config import check_schema_ready, get_supabase

admin_bp = Blueprint("admin", __name__)


@admin_bp.get("/api/admin/schema-status")
def schema_status():
    return jsonify(check_schema_ready())


@admin_bp.get("/api/admin/teams")
def get_teams():
    supabase = get_supabase()
    if supabase is None:
        return jsonify({"error": "Supabase not configured"}), 500

    teams = supabase.table("teams").select("*").order("total_score", desc=True).execute()
    return jsonify({"teams": teams.data or []})


@admin_bp.get("/api/admin/stats")
def get_stats():
    supabase = get_supabase()
    if supabase is None:
        return jsonify({"error": "Supabase not configured"}), 500

    teams = supabase.table("teams").select("*").execute().data or []
    submissions = supabase.table("submissions").select("*").execute().data or []

    correct_submissions = [s for s in submissions if s.get("is_correct")]
    anomaly_count = len([s for s in submissions if s.get("anomaly_flagged")])
    avg_time = (
        round(sum((s.get("time_elapsed_seconds") or 0) for s in submissions) / len(submissions), 2)
        if submissions
        else 0
    )

    return jsonify(
        {
            "total_crews": len(teams),
            "rounds_completed": len(correct_submissions),
            "avg_answer_time": avg_time,
            "anomalies_flagged": anomaly_count,
            "teams": teams,
            "submissions": submissions,
        }
    )


def _ensure_support_table(supabase):
    # Best-effort table setup for support chat in hackathon environments.
    try:
        supabase.table("support_messages").select("id").limit(1).execute()
        return True
    except Exception:
        return False


@admin_bp.post("/api/admin/chat/send")
def admin_send_chat():
    supabase = get_supabase()
    if supabase is None:
        return jsonify({"error": "Supabase not configured"}), 500
    if not _ensure_support_table(supabase):
        return jsonify({"error": "support_messages table missing. Create it in Supabase."}), 500

    payload = request.get_json(silent=True) or {}
    team_id = payload.get("team_id")
    message = (payload.get("message") or "").strip()
    if not team_id or not message:
        return jsonify({"error": "team_id and message are required"}), 400

    row = {
        "team_id": team_id,
        "sender": "admin",
        "message": message,
    }
    inserted = supabase.table("support_messages").insert(row).execute()
    return jsonify({"message": inserted.data[0] if inserted.data else row})


@admin_bp.get("/api/admin/chat/messages")
def admin_chat_messages():
    supabase = get_supabase()
    if supabase is None:
        return jsonify({"error": "Supabase not configured"}), 500
    if not _ensure_support_table(supabase):
        return jsonify({"messages": [], "warning": "support_messages table missing"})

    messages = (
        supabase.table("support_messages")
        .select("*")
        .order("created_at", desc=True)
        .limit(100)
        .execute()
    )
    return jsonify({"messages": messages.data or []})
