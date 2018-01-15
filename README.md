# backend

1. Event Creation

[REQUEST]
POST /api/events
{
  placeId: $placeId,
  eventTime: $eventTime
}

[Response]
{
  eventId: $eventId
}

2. Event Preview

[REQUEST]
GET /api/events/:eventId

[RESPONSE]
{
  placeId: $placeId,
  eventTime: $eventTime
}

3. Join Event / Login Event / Get Most Updated Event

[REQUEST]
POST /api/events/:eventId
{
  userName: $userName,
  estimatedArrivalTime: $estimatedArrivalTime, 
  lastUpdatedTime: $lastUpdatedTime
}

[RESPONSE]
{
  placeId: $placeId, 
  eventTime: $eventTime, 
  users: 
  {
    $userName: 
    {
      estimatedArrivalTime: $estimatedArrivalTime, 
      lastUpdatedTIme: $lastUpdatedTime
    }
    ...
  }
}

4. Example 1: Create Event

- URL="cobyo.com/" (or "/events")
- RENDER + FORM "Event place & time?"
- POST "/api/events" / (placeId, eventTime) => eventId
- REDIRECT URL="cobyo.com/events/:eventId"
- RENDER + FORM "Enter your username?"
- POST "/api/events/:eventId" / (userName, estimatedArrivalTime, lastUpdatedTime)
  => placeId, eventTime, users: {userName: estimatedArrivalTime, lastUpdatedTime}
- RENDER Event page


5. Example 2: Follow straight to event URL
- URL="cobyo.com/events/:eventId"
- GET "/api/events/:eventId" => placeId, eventTime
- RENDER + FORM "Enter your username?"
- POST "/api/events/:eventId" / (userName, estimatedArrivalTime, lastUpdatedTime)
  => placeId, eventTime, users: {userName: estimatedArrivalTime, lastUpdatedTime}
- RENDER Event page


6. DB Tables
- <Events> eventId | placeId | eventTime
- <EventUsers> (eventId, userName) | estimatedArrivalTime | lastUpdatedTime

