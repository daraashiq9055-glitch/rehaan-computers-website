/* Notifications only: no fetch interception, caching or payment handling. */
self.addEventListener('notificationclick',event=>{
 event.notification.close();let path=event.notification.data?.path||'/';
 let url;try{url=new URL(path,self.location.origin);if(url.origin!==self.location.origin)url=new URL('/',self.location.origin);}catch{url=new URL('/',self.location.origin);}
 event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(windows=>{const existing=windows.find(client=>new URL(client.url).origin===url.origin);return existing?existing.navigate(url.href).then(()=>existing.focus()):clients.openWindow(url.href);}));
});
importScripts('https://www.gstatic.com/firebasejs/12.2.1/firebase-app-compat.js','https://www.gstatic.com/firebasejs/12.2.1/firebase-messaging-compat.js');
firebase.initializeApp({apiKey:'AIzaSyBXRQvUZBPP_E3Q0SZBYTsOc6sfzAEiqpE',projectId:'rehaan-computers',messagingSenderId:'292017935720',appId:'1:292017935720:web:d767adbf23823fbf5c72dd'});
firebase.messaging().onBackgroundMessage(payload=>{
 const data=payload.data||{};return self.registration.showNotification(String(data.title||'Rehaan Computers').slice(0,100),{body:String(data.body||'').slice(0,240),icon:'/visitor/assets/rehaan-notification-192.png',badge:'/visitor/assets/rehaan-notification-badge.png',tag:'rehaan-institute-update',renotify:false,timestamp:Date.now(),actions:[{action:'open',title:'Open website'}],data:{path:data.path||'/'}});
});
