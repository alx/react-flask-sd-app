import time
from flask import Flask
from pprint import pprint
import os
import json
import logging
import argparse
from pathlib import Path

from image_processor import ImageProcessor

CURRENT_PATH = os.path.dirname(os.path.abspath(__file__))

parser = argparse.ArgumentParser(description="Read config file path")
parser.add_argument("--config", type=str, help="Path to the configuration file")
args = parser.parse_args()

if args.config:
    config_path = os.path.abspath(args.config)
    print(f"Config file path: {config_path}")
else:
    config_path = Path(CURRENT_PATH, "config.json")
    print("No configuration file provided. Use --config [path_to_config_file] to specify one.")

with open(config_path, "r") as f:
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
    prompt = request.form.get('prompt')
    file = request.files['image']

    img = Image.open(file.stream)

    # save image in capture folder
    capture_id = uuid.uuid4()
    capture_extension = ".jpg"
    capture_filename = f"%s.%s" % (capture_id, capture_extension)
    img.save(config["capture_folder"] + capture_filename)
    logging.debug(f"Destination %s" % (capture_filename))
    capture_file = Path(
        CURRENT_PATH,
        config["capture_folder"],
        capture_filename,
    )

    img = (
        Image.open(BytesIO(response.content))
        .convert("RGB")
        .resize((512, 512))
    )
    img.save(capture_file)

    # Process the image
    capture = {"capture_id": capture_id, "extension": capture_extension}
    processed_img = processor.run(prompt, capture)

    # Convert the processed image into byte stream
    byte_io = io.BytesIO()
    processed_img.save(byte_io, 'JPEG')
    byte_io.seek(0)

    return send_file(byte_io, mimetype='image/jpeg')
