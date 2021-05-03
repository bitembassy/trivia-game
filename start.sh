#!/bin/bash

export NODE_ENV=production
export SECRET_KEY=1234
node server.js | tee -a trivia.log
