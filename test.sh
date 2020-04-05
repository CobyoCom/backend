#!/bin/bash

function test_post {
  echo "$1 $2 $3"
  ADDSPACE1=${3//\{/ \{ }
  ADDSPACE2=${ADDSPACE1//\}/ \} }
  ADDSPACE3=${ADDSPACE2//\,/\, }
  echo "Request:"$ADDSPACE3
  curl $1 -XPOST -H "Cookie: SESSION_ID=$2" -d '{"query":"'$3'"}' 2>/dev/null | jq .
  echo ""
}

if [ $# -eq 0 ]; then
  echo "Usage: $0 SERVER"
  echo ""
  echo "$0 http://localhost:3001"
  echo "$0 https://api.cobyo.me"
  exit 0
fi

echo "==========================================================================="
echo "Check POST with wrong endpoint"
curl -i $1/random -XPOST 2>/dev/null

echo "==========================================================================="
echo "Check OPTIONS with no data"
curl -i $1/graphql -XOPTIONS 2>/dev/null

echo "==========================================================================="
echo "Check POST with no data"
curl -i $1/graphql -XPOST 2>/dev/null
echo ""

echo "==========================================================================="
echo "Check POST with empty data sets SESSION_ID"
SESSION_ID=$(curl -i $1/graphql -XPOST -d '{}' 2>/dev/null | grep -i set-cookie | cut -d'=' -f2 | cut -d';' -f1)
if [ -z $SESSION_ID ]; then
  echo "SESSION_ID NOT RETURNED"
  exit
fi
echo ""
echo "SESSION_ID=$SESSION_ID"

echo "==========================================================================="
test_post $1/graphql $SESSION_ID '{me{name}}'

echo "==========================================================================="
test_post $1/graphql $SESSION_ID '{event(code:\"1\"){code,name,endedTime,scheduledTime,place{googlePlaceId,address,latitude,longitude,photoUrl},me{duration,updatedTime,travelMode,hasLeft,user{name}},numAttendees,eventUsers{duration,updatedTime,travelMode,hasLeft,user{name}},notifications{message,createdTime,reactions{emoji,user{name}}}}}'

echo "==========================================================================="
test_post $1/graphql $SESSION_ID 'mutation{editMe(user:{name:\"Jay2\"}){name}}'

echo "==========================================================================="
test_post $1/graphql $SESSION_ID 'mutation{createEvent(event:{place:{googlePlaceId:\"hi\"}}){code,name,endedTime,scheduledTime,place{googlePlaceId,address,latitude,longitude,photoUrl}}}'

echo "==========================================================================="
test_post $1/graphql $SESSION_ID 'mutation{joinEvent(code:\"1\"){user{name},duration,updatedTime,travelMode,hasLeft}}'

echo "==========================================================================="
test_post $1/graphql $SESSION_ID 'mutation{editEvent(code:\"1\",event:{place:{address:\"hi\"},name:\"royale2\",scheduledTime:\"123\"}){code,name,endedTime,scheduledTime,place{address}}}'

echo "==========================================================================="
test_post $1/graphql $SESSION_ID 'mutation{updateEventUser(eventCode:\"1\",eventUser:{duration:250,updatedTime:\"'$(date +%s)'\",travelMode:\"DRIVING\",hasLeft:true}){user{name},duration,updatedTime,travelMode,hasLeft}}'

echo "==========================================================================="
test_post $1/graphql $SESSION_ID 'mutation{endEvent(code:\"1\"){endedTime}}'

echo "==========================================================================="
test_post $1/graphql $SESSION_ID '{me{name}}'

echo "==========================================================================="
test_post $1/graphql $SESSION_ID '{event(code:\"1\"){code,name,endedTime,scheduledTime,place{googlePlaceId,address,latitude,longitude,photoUrl},me{duration,updatedTime,travelMode,hasLeft,user{name}},numAttendees,eventUsers{duration,updatedTime,travelMode,hasLeft,user{name}},notifications{message,createdTime,reactions{emoji,user{name}}}}}'

echo "==========================================================================="
#test_post $1/graphql 'mutation{createReaction(eventCode:\"1\",notificationIndex:0,reaction:{emoji:\"Hi\"}){user{name},emoji}}'
#test_post $1/graphql 'mutation{deleteReaction(eventCode:\"1\",notificationIndex:0,reaction:{emoji:\"Hi\"}){user{name},emoji}}'
