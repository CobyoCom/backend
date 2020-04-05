function push_subscribe() {
  navigator.serviceWorker.ready.then(registration => {
    return registration.pushManager.getSubscription().then(subscription => {
      if (subscription) return subscription;
      return registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: new Uint8Array([
          0x4,  0xbf, 0xe6, 0x54, 0xd,  0x6e, 0xed, 0xca,
          0x91, 0x66, 0x46, 0xf9, 0x73, 0x1,  0x77, 0x7d,
          0xc4, 0xff, 0xdf, 0xbd, 0x72, 0xad, 0xd5, 0xea,
          0x7,  0x5,  0xe5, 0x40, 0xce, 0x63, 0x4d, 0x2,
          0xf6, 0xca, 0xfa, 0xc6, 0xd1, 0x3c, 0x9a, 0xda,
          0x11, 0x1,  0xc5, 0xaf, 0xf6, 0x0,  0x79, 0xed,
          0x32, 0x37, 0xcc, 0x6c, 0x40, 0xe,  0xbb, 0x4d,
          0xb4, 0xbb, 0x58, 0x8a, 0x9f, 0xb4, 0x71, 0xf9,
          0x47,
        ]),
      });
    }).then(function(subscription) {
      console.log(subscription.toJSON())
      //TODO REST push subscription
    });
  });
}