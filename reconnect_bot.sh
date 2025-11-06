#!/usr/bin/env bash

cd /home/yasbot/Desktop/yasbot || exit 1

pm2 delete yasbot

yarn reconnect

yarn start:prod
