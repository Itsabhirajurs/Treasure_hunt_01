from flask import Blueprint, jsonify, request

from config import get_supabase

auth_bp = Blueprint("auth", __name__)


@auth_bp.post("/api/register")
def register():
    supabase = get_supabase()
    if supabase is None:
        return jsonify({"error": "Supabase not configured"}), 500

    payload = request.get_json(silent=True) or {}
    name = (payload.get("name") or "").strip()
    password_hash = (payload.get("password_hash") or "").strip()

    if not name or not password_hash:
        return jsonify({"error": "name and password_hash are required"}), 400

    try:
        existing = supabase.table("teams").select("id").eq("name", name).limit(1).execute()
        if existing.data:
            return jsonify({"error": "Crew name already taken"}), 409

        insert_payload = {
            "name": name,
            "password_hash": password_hash,
            "current_round": 1,
            "total_score": 0,
            "badges": [],
        }
        created = supabase.table("teams").insert(insert_payload).execute()
        return jsonify({"team": created.data[0]}), 201
    except Exception as exc:
        return jsonify({"error": "Database operation failed", "details": str(exc)}), 500


@auth_bp.post("/api/login")
def login():
    supabase = get_supabase()
    if supabase is None:
        return jsonify({"error": "Supabase not configured"}), 500

    payload = request.get_json(silent=True) or {}
    name = (payload.get("name") or "").strip()
    password_hash = (payload.get("password_hash") or "").strip()

    if not name or not password_hash:
        return jsonify({"error": "name and password_hash are required"}), 400

    try:
        result = (
            supabase.table("teams")
            .select("*")
            .eq("name", name)
            .eq("password_hash", password_hash)
            .limit(1)
            .execute()
        )
        if not result.data:
            return jsonify({"error": "Invalid credentials"}), 401

        return jsonify({"team": result.data[0]})
    except Exception as exc:
        return jsonify({"error": "Database operation failed", "details": str(exc)}), 500
