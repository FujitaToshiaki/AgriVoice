// Service Worker for AgriVoice App
const CACHE_NAME = 'agri-voice-v1.0.0';
const urlsToCache = [
    '/',
    '/index.html',
    '/css/styles.css',
    '/js/app.js',
    '/js/voice-recognition.js',
    '/js/data-manager.js',
    '/js/location-manager.js',
    '/manifest.json'
];

// インストール時の処理
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
});

// フェッチ時の処理
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // キャッシュにある場合はそれを返す
                if (response) {
                    return response;
                }
                
                // キャッシュにない場合はネットワークからフェッチ
                return fetch(event.request)
                    .then((response) => {
                        // レスポンスが有効でない場合はそのまま返す
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }
                        
                        // レスポンスをクローンしてキャッシュに保存
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(event.request, responseToCache);
                            });
                        
                        return response;
                    })
                    .catch(() => {
                        // ネットワークエラーの場合、オフラインページを返す
                        if (event.request.mode === 'navigate') {
                            return caches.match('/index.html');
                        }
                    });
            })
    );
});

// アップデート時の処理
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// バックグラウンド同期（データの同期）
self.addEventListener('sync', (event) => {
    if (event.tag === 'data-sync') {
        event.waitUntil(syncData());
    }
});

async function syncData() {
    try {
        // オフラインで蓄積されたデータをサーバーに同期
        const pendingData = await getPendingData();
        
        if (pendingData.length > 0) {
            await uploadDataToServer(pendingData);
            await clearPendingData();
        }
    } catch (error) {
        console.error('データ同期エラー:', error);
    }
}

function getPendingData() {
    return new Promise((resolve) => {
        // IndexedDBから保留中のデータを取得
        // 実際の実装では、IndexedDBを使用してデータを管理
        resolve([]);
    });
}

function uploadDataToServer(data) {
    // サーバーへのデータアップロード
    return fetch('/api/sync', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });
}

function clearPendingData() {
    // 同期済みデータをクリア
    return Promise.resolve();
}

// プッシュ通知の処理
self.addEventListener('push', (event) => {
    const options = {
        body: event.data ? event.data.text() : '新しい通知があります',
        icon: '/assets/icon-192.png',
        badge: '/assets/icon-192.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'explore',
                title: '確認',
                icon: '/assets/checkmark.png'
            },
            {
                action: 'close',
                title: '閉じる',
                icon: '/assets/close.png'
            }
        ]
    };

    event.waitUntil(
        self.registration.showNotification('AgriVoice', options)
    );
});

// 通知クリック時の処理
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'explore') {
        // アプリを開く
        event.waitUntil(
            clients.openWindow('/')
        );
    } else if (event.action === 'close') {
        // 何もしない（通知を閉じるだけ）
    } else {
        // 通知本体がクリックされた場合
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});

// メッセージの処理
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// 定期的なデータ同期
setInterval(() => {
    if (navigator.onLine) {
        syncData();
    }
}, 300000); // 5分間隔