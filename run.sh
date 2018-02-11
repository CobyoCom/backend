#!/bin/bash

sudo kill $(ps aux | grep '[n]ode server.js' | awk '{print $2}') &> /dev/null
NODE_ENV=production node server.js &> log/server.log &

