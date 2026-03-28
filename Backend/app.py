# ═══════════════════════════════════════════════════════════════
# DataLens — app.py  (Flask Backend)
# Routes: POST /api/analyze  |  GET /api/health
# Run:    python app.py
# ═══════════════════════════════════════════════════════════════

from flask import Flask, request, jsonify
from flask_cors import CORS
from analyzer import analyze_csv   # our analysis module

app = Flask(__name__)
CORS(app)   # allow browser requests from frontend (localhost)


# ── Health Check ────────────────────────────────────────────────
@app.route('/api/health', methods=['GET'])
def health():
    """Simple ping to verify the backend is running."""
    return jsonify({"status": "ok", "message": "DataLens backend is running"})


# ── Main Analysis Endpoint ───────────────────────────────────────
@app.route('/api/analyze', methods=['POST'])
def analyze():
    """
    Accepts JSON: { "csv": "<raw csv string>" }
    Returns:      { "stats": {...}, "trend": {...}, "summary": "..." }
    """
    body = request.get_json(force=True)

    if not body or 'csv' not in body:
        return jsonify({"error": "Missing 'csv' field in request body"}), 400

    csv_text = body['csv']

    try:
        result = analyze_csv(csv_text)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── Run Server ───────────────────────────────────────────────────
if __name__ == '__main__':
    print("=" * 50)
    print("  DataLens Backend  —  Flask Server")
    print("  Running at:  http://localhost:5000")
    print("  Health:      http://localhost:5000/api/health")
    print("=" * 50)
    app.run(debug=True, port=5000)


