import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")

has_valid_supabase = (
	isinstance(SUPABASE_URL, str)
	and SUPABASE_URL.startswith("http")
	and "your_url" not in SUPABASE_URL
	and isinstance(SUPABASE_KEY, str)
	and SUPABASE_KEY
	and "your_service_role_key" not in SUPABASE_KEY
)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY) if has_valid_supabase else None


def get_supabase():
	global supabase
	if supabase is not None:
		return supabase

	if has_valid_supabase:
		supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
		return supabase

	return None


def check_schema_ready():
	client = get_supabase()
	if client is None:
		return {"ready": False, "reason": "Supabase client is not configured"}

	try:
		client.table("teams").select("id").limit(1).execute()
		client.table("submissions").select("id").limit(1).execute()
		return {"ready": True, "reason": "teams and submissions tables are accessible"}
	except Exception as exc:
		return {"ready": False, "reason": str(exc)}
