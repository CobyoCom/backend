# backend

1. Event Creation
: POST: /api/events
: Body: destination=[]&time=[]
: Return {eventID}

2. Show Event description
: GET /api/events/:id
: Return {destination, time}

3. Join Event + Login Event + Get most updated event
: POST: /api/events/:id
: Body: username=[]&ETA=[]&LUT=[]
: Return {":username" : {ETA, LUT}, ..., }}

4. Example

URL=cobyo.com/events/:id
  GET "/api/events/:id"
  Return Event[Name, Destination, Time]
RENDER + FORM [Enter your username:?]
  POST "/api/events/:id"
  Body username=[]&ETA=[]&LUT=[]
  Returns Userlist

[Tables]
<Events> "id" | destination | time 
<UsersOfEvents> (eventid,username) | ETA | LUT

