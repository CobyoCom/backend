#!/bin/bash

sudo docker run --rm -p 9520:8000 amazon/dynamodb-local &
PID=$!
trap "sudo kill -TERM $PID" TERM INT
AWS_REGION=foobar AWS_ACCESS_KEY_ID=foobar AWS_SECRET_ACCESS_KEY=foobar aws --endpoint-url http://localhost:9520 dynamodb create-table --table-name Table --attribute-definitions AttributeName=userId,AttributeType=S AttributeName=groupId,AttributeType=S --key-schema AttributeName=userId,KeyType=HASH AttributeName=groupId,KeyType=RANGE --global-secondary-index IndexName=Group,KeySchema='[{AttributeName=groupId,KeyType=HASH},{AttributeName=userId,KeyType=RANGE}]',Projection='{ProjectionType=ALL}',ProvisionedThroughput='{ReadCapacityUnits=1,WriteCapacityUnits=1}' --provisioned-throughput ReadCapacityUnits=1,WriteCapacityUnits=1 >/dev/null
AWS_REGION=foobar AWS_ACCESS_KEY_ID=foobar AWS_SECRET_ACCESS_KEY=foobar aws --endpoint-url http://localhost:9520 dynamodb put-item --table-name Table --item '{"userId":{"S":"Event-1"},"groupId":{"S":"Event-1"},"code":{"S":"1"},"place":{"M":{"googlePlaceId":{"S":"ChIJ7VHBwnZ644kRKRWP5Qe27v4"}}},"eventName":{"S":"Royale"}}' > /dev/null
# rm -rf node_modules package-lock.json
npm install graphql fs uuid https web-push cryptr express aws-sdk
API_PATH=/graphql DEV_API_PORT=3001 ALLOW_ORIGIN=http://localhost:3000 AWS_REGION=foobar AWS_ACCESS_KEY_ID=foobar AWS_SECRET_ACCESS_KEY=foobar DYNAMODB_ENDPOINT=http://localhost:9520 TABLE_NAME=Table SESSION_KEY=dev node dev_server.js
