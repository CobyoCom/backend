# backend

1. Event Creation
: POST:   /api/events
: Body:   placeId=&time=
: Return: eventId

2. Event Preview
: GET:    /api/events/:eventId
: Return: placeId, time

3. Join Event / Login Event / Get Most Updated Event
: POST:   /api/events/:eventId
: Body:   userName=&estimatedArrivalTime=&lastUpdatedTime=
: Return: Listof {userName, estimatedArrivalTime, lastUpdatedTime}

4. Example
: [URL=cobyo.com/events/:eventId]
: GET "/api/events/:eventId"
:   Return  event.placeId, event.time
: RENDER + FORM [Enter your username?]
: POST "/api/events/:eventId"
:   Body    userName=&estimatedArrivalTime=&lastUpdatedTime=
:   Return  event.userList {userName, estimatedArrivalTime, lastUpdatedTime}

5. DB Tables
: <Events> eventId | placeId | time
: <EventUsers> (eventId, userName) | estimatedArrivalTime | lastUpdatedTime

