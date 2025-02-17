import base64
import time
from flask import Flask, request, flash, redirect, url_for, session, send_from_directory
from flask_autoindex import AutoIndex
from werkzeug.utils import secure_filename
from pprint import pprint
import os
import json
import logging
import argparse
from pathlib import Path
import secrets
import uuid
import traceback

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

app = Flask(__name__, static_folder='../build', static_url_path='/')
AutoIndex(app, browse_root=config["capture_folder"])

secret = secrets.token_urlsafe(32)
app.secret_key = secret

# Limit upload size to 16MB
app.config['MAX_CONTENT_LENGTH'] = 16 * 1000 * 1000

# error 413 entity too large
# https://github.com/benoitc/gunicorn/issues/1733
@app.before_request
def handle_chunking():
    """
    Sets the "wsgi.input_terminated" environment flag, thus enabling
    Werkzeug to pass chunked requests as streams.  The gunicorn server
    should set this, but it's not yet been implemented.
    """

    transfer_encoding = request.headers.get("Transfer-Encoding", None)
    if transfer_encoding == u"chunked":
        request.environ["wsgi.input_terminated"] = True

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

    filename = f"%s.jpg" % (uuid.uuid4())
    data = base64.b64decode(request.form.get('file'))    
    out = open(Path(config['capture_folder'], filename), "wb")
    out.write(data)
    out.close()

    prompt = request.form.get('prompt', '')
    negative_prompt = request.form.get('negative_prompt', '')
    loras = json.loads(request.form.get('loras', []))

    try:
        processor = ImageProcessor(config, logging)
        dst_path = processor.run(
            filename,
            prompt,
            negative_prompt,
            loras
        )
        logging.debug(dst_path)
        return send_from_directory(
            config['capture_folder'],
            os.path.basename(dst_path),
            as_attachment=True
        )
    except Exception as e:
        logging.error(traceback.format_exc())
        logging.error(e)
        return "Error processing image", 500



if __name__ == "__main__":
    port = int(os.environ.get('PORT', 5005))
    app.run(host='0.0.0.0', port=port, use_reloader=False)
