# backend

- POST /api/events {placeId, eventTime, eventName} => {id, ...}
- GET /api/events/:id => {id, ...}
- GET /api/events/:eventId/users?sortBy=userName&exclude=name => [{userName, ..}, ..]
- PUT /api/events/:eventId/users/:userName {...} => {eventId, userName, ..}
- GET /log/dump => { events: [rows..], eventUsers: [rows..] }
- GET /log/ssh.log
- GET /log/server.log

- <events> eventId | placeId | eventTime | eventName
- <eventUsers> (eventId, userName) | duration | lastUpdated | hasLeft | travelMode


