import time
from flask import Flask, request, flash, redirect, url_for, session
from flask_session import Session
from werkzeug.utils import secure_filename
from pprint import pprint
import os
import json
import logging
import argparse
from pathlib import Path

from image_processor import ImageProcessor

CURRENT_PATH = os.path.dirname(os.path.abspath(__file__))

parser = argparse.ArgumentParser(description="Read config file path")
parser.add_argument(
    "--config",
    type=str,
    default="/app/config.json",
    help="Path to the configuration file"
)
args = parser.parse_args()

with open(args.config, "r") as f:
    config = json.load(f)

if not os.path.exists(config["capture_folder"]):
    os.makedirs(config["capture_folder"])

LOG_FILENAME = Path(CURRENT_PATH, config["log_filename"])
logging.basicConfig(
    format="%(asctime)s %(levelname)s %(message)s",
    filename=LOG_FILENAME,
    level=logging.DEBUG,
    datefmt="%Y-%m-%d %H:%M:%S",
)
logging.getLogger().addHandler(logging.StreamHandler())

processor = ImageProcessor(config, logging)

app = Flask(__name__, static_folder='../build', static_url_path='/')
app.secret_key = "super secret key"
Session(app)

# Limit upload size to 16MB
app.config['MAX_CONTENT_LENGTH'] = 16 * 1000 * 1000

@app.errorhandler(404)
def not_found(e):
    return app.send_static_file('index.html')


@app.route('/')
def index():
    return app.send_static_file('index.html')


@app.route('/api/time')
def get_current_time():
    return {'time': time.time()}

@app.route('/api/processing', methods=['POST'])
def process_image():

    if 'file' not in request.files:
        flash('No file part')
        return redirect(request.url)

    filename = f"%s.jpg" % (uuid.uuid4())
    file = request.files['file']
    file.save(Path(config['capture_folder'], filename))

    prompt = request.form.get('prompt')

    processed_img = processor.run(prompt, filename)

    # Convert the processed image into byte stream
    byte_io = io.BytesIO()
    processed_img.save(byte_io, 'JPEG')
    byte_io.seek(0)

    return send_file(byte_io, mimetype='image/jpeg')

if __name__ == "__main__":
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=True, host='0.0.0.0', port=port)
