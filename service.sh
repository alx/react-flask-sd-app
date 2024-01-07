#!/bin/bash

PIDFILE=/var/run/photomaton.pid

case $1 in
        start)
                source /workspace/.venv/bin/activate
                # Launch your program as a detached process
                export HF_HOME=/workspace/.cache/huggingface/
                python3 /workspace/react-flask-sd-app/api/api.py --config /workspace/react-flask-sd-app/config.runpod.
json >> /workspace/photomaton.log &
                # Get its PID and store it
                echo $! > ${PIDFILE}
                ;;
        stop)
                kill `cat ${PIDFILE}`
                # Now that it's killed, don't forget to remove the PID file
                rm ${PIDFILE}
                ;;
        *)
                echo "usage: /workspace/react-flask-sd-app/service.sh {start|stop}" ;;
esac
exit 0
