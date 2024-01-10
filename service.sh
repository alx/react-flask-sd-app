#!/bin/bash

PIDFILE=/var/run/photomaton.pid

case $1 in
        start)
                export PIP_CACHE_DIR=/workspace/.cache/
                export TRANSFORMERS_CACHE=/workspace/.cache/
                export HF_HOME=/workspace/.cache/huggingface/
                source /workspace/.venv/bin/activate
                pip3 --cache-dir "/workspace/.cache" install -r /workspace/react-flask-sd-app/api/requirements.txt
                python3 /workspace/react-flask-sd-app/api/api.py --config /workspace/react-flask-sd-app/config.runpod.json >> /workspace/photomaton.log &
                echo $! > ${PIDFILE}
                ;;
        stop)
                kill `cat ${PIDFILE}`
                rm ${PIDFILE}
                ;;
        *)
                echo "usage: /workspace/react-flask-sd-app/service.sh {start|stop}" ;;
esac
exit 0
