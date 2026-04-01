from flask import Flask, jsonify
from flask_cors import CORS

from config import FRONTEND_ORIGIN
from routes.auth import auth_bp
from routes.game import game_bp
from routes.admin import admin_bp


def create_app():
    app = Flask(__name__)
    allowed_origins = [
        FRONTEND_ORIGIN,
        "http://localhost:5173",
        "http://localhost:5175",
        "http://localhost:5176",
    ]
    CORS(app, resources={r"/api/*": {"origins": allowed_origins}})

    app.register_blueprint(auth_bp)
    app.register_blueprint(game_bp)
    app.register_blueprint(admin_bp)

    @app.get("/api/health")
    def health_check():
        return jsonify({"status": "ok"})

    @app.errorhandler(Exception)
    def handle_unexpected_error(error):
        return jsonify({"error": "Internal server error", "details": str(error)}), 500

    return app


app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
