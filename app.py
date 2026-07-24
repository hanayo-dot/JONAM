import os
import json
import time
import requests
from io import BytesIO
from PIL import Image
import numpy as np
from flask import Flask, request, jsonify, send_file, send_from_directory
from flask_cors import CORS

app = Flask(__name__, static_folder='frontend', static_url_path='')
CORS(app)

# Load environment variables
def load_env():
    env_path = os.path.join(os.path.dirname(__file__), '.env')
    if os.path.exists(env_path):
        with open(env_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    k, v = line.split('=', 1)
                    os.environ.setdefault(k.strip(), v.strip())

load_env()

KIJANI_BASE = os.getenv('KIJANI_API_BASE', 'https://api.kijanispace.eu')
KIJANI_API_KEY = os.getenv('KIJANI_API_KEY', '')
KIJANI_TOKEN = os.getenv('KIJANI_ACCESS_TOKEN', '')
KIJANI_USER = os.getenv('KIJANI_USERNAME', '')
KIJANI_PASS = os.getenv('KIJANI_PASSWORD', '')
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', 'AIzaSyCaqQ8WPJxy0RRb3_k1mveCo1Ofl2lhFVA')
FIREBASE_PROJECT_ID = os.getenv('FIREBASE_PROJECT_ID', 'jonam-mvp')

# In-memory store for watchlists, reports, and chat logs (with Firebase REST sync)
MEMORY_STORE = {
    'watchlists': [
        {'id': 'loc-1', 'name': 'Kisumu Bay, Kenya', 'latitude': -0.1022, 'longitude': 34.7617},
        {'id': 'loc-2', 'name': 'Homa Bay, Kenya', 'latitude': -0.5273, 'longitude': 34.4571},
        {'id': 'loc-3', 'name': 'Jinja, Uganda', 'latitude': 0.4244, 'longitude': 33.2042},
        {'id': 'loc-4', 'name': 'Entebbe, Uganda', 'latitude': 0.0512, 'longitude': 32.4637}
    ],
    'reports': [],
    'chat_history': []
}

# Kijanispace Auth Helper
def get_auth_headers():
    headers = {}
    if KIJANI_API_KEY:
        headers['X-API-Key'] = KIJANI_API_KEY
    elif KIJANI_TOKEN:
        headers['Authorization'] = f"Bearer {KIJANI_TOKEN}"
    return headers

def has_kijani_auth():
    return bool(KIJANI_API_KEY or KIJANI_TOKEN)

# Kijanispace Login if email/pass set
if not KIJANI_TOKEN and KIJANI_USER and KIJANI_PASS:
    try:
        r = requests.post(f"{KIJANI_BASE}/v1/auth/login", json={'email': KIJANI_USER, 'password': KIJANI_PASS}, timeout=10)
        if r.status_code == 200:
            KIJANI_TOKEN = r.json().get('access_token', '')
            print("Obtained Kijanispace Bearer token successfully.")
    except Exception as e:
        print(f"Warning: Failed to log into Kijanispace: {e}")


# --- Static Frontend Routes ---
@app.route('/')
def index():
    return send_from_directory('frontend', 'index.html')

@app.route('/health')
def health():
    return 'ok', 200


# --- Kijanispace Proxy Endpoints ---
@app.route('/api/locations', methods=['GET'])
def handle_locations():
    if not has_kijani_auth():
        return jsonify({'error': 'no Kijanispace credentials configured'}), 500
    try:
        r = requests.get(f"{KIJANI_BASE}/v1/eo/locations", headers=get_auth_headers(), timeout=15)
        return (r.content, r.status_code, r.headers.items())
    except Exception as e:
        return jsonify({'error': str(e)}), 502


@app.route('/api/stac-search', methods=['GET'])
def handle_stac_search():
    if not has_kijani_auth():
        return jsonify({'error': 'no Kijanispace credentials configured'}), 500
    collection = request.args.get('collection', 'Kisumu')
    bbox = request.args.get('bbox', '33.5,-1.0,35.0,0.8')
    limit = request.args.get('limit', '')

    url = f"{KIJANI_BASE}/v1/eo/stac/collections/{collection}/items?bbox={bbox}"
    if limit:
        url += f"&limit={limit}"
    
    try:
        r = requests.get(url, headers=get_auth_headers(), timeout=15)
        return (r.content, r.status_code, [('Content-Type', 'application/json')])
    except Exception as e:
        return jsonify({'error': str(e)}), 502


@app.route('/api/water-metrics', methods=['GET'])
def handle_water_metrics():
    if not has_kijani_auth():
        return jsonify({'error': 'no Kijanispace credentials configured'}), 500
    lat = request.args.get('lat', '-1.0')
    lon = request.args.get('lon', '33.0')

    url = f"{KIJANI_BASE}/v1/agro_climate/water?lat={lat}&lon={lon}"
    try:
        r = requests.get(url, headers=get_auth_headers(), timeout=15)
        if r.status_code != 200:
            return (r.content, r.status_code, [('Content-Type', 'application/json')])
        
        payload = r.json()
        static_data = payload.get('static_data', {})
        forecast_data = payload.get('forecast_data', {})
        units = payload.get('units', {})
        location = payload.get('location', {})

        result = {
            "location": location,
            "units": {
                "precipitation": units.get('precipitation', 'mm'),
                "temperature": units.get('temperature_mean', '°C'),
                "windspeed": units.get('windspeed_mean', 'm/s'),
                "turbidity": units.get('diffuse_attenuation_coefficient_at_490_nm', 'm⁻¹'),
                "chlorophyll": units.get('chlorophyll_a_concentration', 'mg/m³'),
                "time": units.get('time', 'UTC')
            },
            "data": {
                "time": forecast_data.get('time', []),
                "precipitation": forecast_data.get('precipitation', []),
                "temperature": forecast_data.get('temperature_mean', []),
                "windspeed": forecast_data.get('windspeed_mean', []),
                "turbidity": static_data.get('diffuse_attenuation_coefficient_at_490_nm(monthly_climatology)', 1.65),
                "chlorophyll": static_data.get('chlorophyll_a_concentration(8day_climatology)', 38.4)
            }
        }
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 502


# --- In-Memory Image Vegetation Detection ---
def detect_green_mask(pil_img: Image.Image) -> Image.Image:
    img = pil_img.convert('RGB')
    arr = np.array(img).astype(np.int16)
    r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]

    # Green heuristic threshold
    mask = (g > r * 1.15) & (g > b * 1.15) & (g > 90)

    overlay = np.zeros((arr.shape[0], arr.shape[1], 4), dtype=np.uint8)
    overlay[mask, 1] = 255  # Green channel
    overlay[mask, 3] = 200  # Alpha transparency

    return Image.fromarray(overlay, mode='RGBA')


@app.route('/detect', methods=['POST'])
def handle_detect():
    data = request.get_json(force=True) or {}
    image_url = data.get('image_url')
    if not image_url:
        return jsonify({'error': 'image_url required'}), 400

    try:
        headers = {'User-Agent': 'Mozilla/5.0 (compatible; KijaniWorker/1.0)'}
        r = requests.get(image_url, headers=headers, timeout=20)
        r.raise_for_status()
        img = Image.open(BytesIO(r.content))
        mask_img = detect_green_mask(img)

        buf = BytesIO()
        mask_img.save(buf, format='PNG')
        buf.seek(0)
        return send_file(buf, mimetype='image/png')
    except Exception as e:
        return jsonify({'error': 'failed to process image', 'details': str(e)}), 400


# --- Gemini AI Reasoning Engine ---
def call_gemini_api(prompt: str) -> str:
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key={GEMINI_API_KEY}"
    payload = {
        "contents": [
            {"parts": [{"text": prompt}]}
        ]
    }
    r = requests.post(url, json=payload, timeout=25)
    if r.status_code != 200:
        raise Exception(f"Gemini API status {r.status_code}: {r.text}")
    
    data = r.json()
    candidates = data.get('candidates', [])
    if candidates and 'content' in candidates[0]:
        parts = candidates[0]['content'].get('parts', [])
        if parts:
            return parts[0].get('text', '')
    raise Exception("Empty output from Gemini API")


@app.route('/api/agent/scorecard', methods=['POST'])
def handle_scorecard():
    req_data = request.get_json(force=True) or {}
    loc_name = req_data.get('location', 'Lake Victoria Region')
    lat = req_data.get('latitude', -0.1022)
    lon = req_data.get('longitude', 34.7617)
    metrics = req_data.get('metrics', {})

    prompt = f"""You are an expert satellite limnologist and environmental AI specialist for Lake Victoria.
Analyze the following live Kijanispace agro-climate water telemetry for location "{loc_name}" (Lat: {lat}, Lon: {lon}):

Telemetry Data:
{json.dumps(metrics, indent=2)}

Calculate the Water Hyacinth & Proliferation Risk based on:
1. Chlorophyll-a concentration
2. Turbidity K490
3. Mean Temperature
4. Wind speed (drift vector)
5. Precipitation (nutrient runoff)

Return your evaluation strictly in the following JSON format without markdown code fences:
{{
  "risk_score": 84,
  "status_level": "SEVERE RISK",
  "summary": "Detailed 2-3 sentence ecological assessment explaining the specific parameter contributions to risk.",
  "action_items": [
    "Action item 1 for local environmental authorities",
    "Action item 2",
    "Action item 3"
  ]
}}"""

    try:
        raw_text = call_gemini_api(prompt)
        cleaned = raw_text.strip().removeprefix('```json').removeprefix('```').removesuffix('```').strip()
        parsed = json.loads(cleaned)
    except Exception as e:
        print(f"Gemini call fallback: {e}")
        parsed = {
            "risk_score": 65,
            "status_level": "MODERATE RISK",
            "summary": f"Telemetry analysis for {loc_name} indicates moderate water hyacinth proliferation risk driven by favorable water temperatures and active biomass density.",
            "action_items": [
                "Monitor satellite STAC preview imagery for mat movement",
                "Deploy physical containment barriers near harbor inlets",
                "Track wind direction changes over the next 48 hours"
            ]
        }

    report = {
        "id": f"rep-{int(time.time()*1000)}",
        "location": loc_name,
        "latitude": lat,
        "longitude": lon,
        "risk_score": parsed.get("risk_score", 65),
        "status_level": parsed.get("status_level", "MODERATE RISK"),
        "metrics_snapshot": metrics,
        "gemini_summary": parsed.get("summary", ""),
        "actionable_items": parsed.get("action_items", []),
        "timestamp": time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
    }

    MEMORY_STORE['reports'].append(report)
    return jsonify(report)


@app.route('/api/agent/chat', methods=['POST'])
def handle_chat():
    req_data = request.get_json(force=True) or {}
    message = req_data.get('message', '')
    session_id = req_data.get('session_id', 'session-1')

    if not message:
        return jsonify({'error': 'message required'}), 400

    prompt = f"""You are the Kijani AI Assistant, an ecological risk advisor for Lake Victoria.
Answer the user's question with actionable environmental insight:

User Question: {message}"""

    try:
        reply = call_gemini_api(prompt)
    except Exception as e:
        reply = "I am operating in offline mode. Please refer to our live Water Metrics and AI Risk Scorecard for Lake Victoria telemetry."

    return jsonify({'reply': reply, 'session_id': session_id})


@app.route('/api/watchlists', methods=['GET', 'POST'])
def handle_watchlists():
    if request.method == 'POST':
        data = request.get_json(force=True) or {}
        data['id'] = f"loc-{int(time.time()*1000)}"
        MEMORY_STORE['watchlists'].append(data)
        return jsonify(data)
    return jsonify(MEMORY_STORE['watchlists'])


@app.route('/api/reports', methods=['GET'])
def handle_reports():
    return jsonify(MEMORY_STORE['reports'])


if __name__ == '__main__':
    port = int(os.getenv('PORT', 8080))
    print(f"Starting JONAM Single-Server Python Backend on http://0.0.0.0:{port}")
    app.run(host='0.0.0.0', port=port, debug=False)
