#!/bin/bash

zip lambda.zip index.js
aws s3 cp lambda.zip s3://cobyo.frontend/lambda.zip
sam deploy --template-file deploy.yaml --stack cobyo --capabilities CAPABILITY_IAM
aws dynamodb put-item --table-name Events --item '{"id":{"S":"1"},"placeId":{"S":"ChIJ7VHBwnZ644kRKRWP5Qe27v4"},"eventName":{"S":"Royale"},"eventTime":{"S":"'"`date '+%Y-%m-%d %r'`"'"}}'

# Test process

