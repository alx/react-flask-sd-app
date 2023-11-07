This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

A Flask based API backend was added in the *api* directory.

Read my [tutorial](https://blog.miguelgrinberg.com/post/how-to-create-a-react--flask-project) on how to create Flask + React combined projects.

# commands

``` sh
docker run -t \
    --runtime nvidia -e NVIDIA_VISIBLE_DEVICES=all \
    -p 5000:5000 \
    -v ./config.json:/app/config.json \
    -v ./log.txt:/app/log.txt \
    -v ./captures/:/app/captures/ \
    -v /home/user/checkpoints/:/app/checkpoints/ \
    -v /home/user/.cache/:/root/.cache/ \
    react-flask-sd-app-api \
    tail -f /dev/null
```

``` sh
docker exec -it \
    react-flask-sd-app-api \
    /bin/bash
```
