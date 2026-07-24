from flask import Flask, request, send_file, jsonify
import requests
from io import BytesIO
from PIL import Image
import numpy as np

app = Flask(__name__)


def detect_green_mask(pil_img: Image.Image) -> Image.Image:
    # Simple RGB-based green detection heuristic.
    img = pil_img.convert('RGB')
    arr = np.array(img).astype(np.int16)
    r = arr[:, :, 0]
    g = arr[:, :, 1]
    b = arr[:, :, 2]

    # Green if G is significantly higher than R and B and above a threshold
    mask = (g > r * 1.15) & (g > b * 1.15) & (g > 90)

    # Create RGBA overlay with transparent background and green for mask
    overlay = np.zeros((arr.shape[0], arr.shape[1], 4), dtype=np.uint8)
    overlay[mask, 1] = 255  # G channel
    overlay[mask, 3] = 200  # alpha

    return Image.fromarray(overlay, mode='RGBA')


@app.route('/process', methods=['POST'])
def process():
    data = request.get_json(force=True)
    image_url = data.get('image_url')
    if not image_url:
        return jsonify({'error': 'image_url required'}), 400

    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (compatible; KijaniWorker/1.0; +https://github.com)'
        }
        r = requests.get(image_url, timeout=20, headers=headers)
        r.raise_for_status()
    except Exception as e:
        return jsonify({'error': 'failed to download image', 'details': str(e)}), 400

    try:
        img = Image.open(BytesIO(r.content))
    except Exception as e:
        return jsonify({'error': 'invalid image', 'details': str(e)}), 400

    mask_img = detect_green_mask(img)

    buf = BytesIO()
    mask_img.save(buf, format='PNG')
    buf.seek(0)
    return send_file(buf, mimetype='image/png')


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8081)
