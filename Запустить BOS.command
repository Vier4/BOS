#!/bin/bash
# Двойной щелчок по этому файлу запускает BOS как программу для компьютера.
cd "$(dirname "$0")" || exit 1
if [ ! -d node_modules/electron ]; then
  echo "Первый запуск: устанавливаю Electron, это займёт минуту..."
  npm install --no-audit --no-fund || exit 1
fi
npm start
