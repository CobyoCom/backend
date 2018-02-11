#!/bin/bash
cd ~/frontend
git pull
npm install
node node_modules/react-scripts/scripts/build.js
rm -rf ~/build
mv ~/frontend/build ~

cd ~
git pull
npm install

