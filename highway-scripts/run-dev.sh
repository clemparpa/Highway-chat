#!/bin/bash

docker compose -f ${PWD}/docker-compose.mongo-for-dev.yml up -d &&
cd ${PWD} &&
npm run frontend