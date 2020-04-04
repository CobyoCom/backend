const subscription = {
  endpoint: "...",
  keys: {
    auth: "...",
    p256dh: "..."
  }
};

webpush.sendNotification(subscription, message, { TTL: 60 });
