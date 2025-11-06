#!/usr/bin/env bash
# start_bot.sh — inicia o bot WhatsApp e mantém logs visíveis

cd /home/yasbot/Desktop/yasbot || exit 1

# inicia o bot em modo produção e mostra logs
yarn start:prod
