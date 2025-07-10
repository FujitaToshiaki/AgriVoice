class LocationManager {
    constructor() {
        this.currentLocation = null;
        this.isSupported = 'geolocation' in navigator;
        this.watchId = null;
        this.options = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000 // 5分
        };
    }

    getCurrentLocation() {
        return new Promise((resolve, reject) => {
            if (!this.isSupported) {
                reject(new Error('位置情報がサポートされていません'));
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    this.currentLocation = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                        accuracy: position.coords.accuracy,
                        timestamp: new Date().toISOString()
                    };
                    resolve(this.currentLocation);
                },
                (error) => {
                    reject(this.handleLocationError(error));
                },
                this.options
            );
        });
    }

    watchPosition() {
        if (!this.isSupported) {
            console.warn('位置情報がサポートされていません');
            return;
        }

        this.watchId = navigator.geolocation.watchPosition(
            (position) => {
                this.currentLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                    timestamp: new Date().toISOString()
                };
                this.updateLocationDisplay();
            },
            (error) => {
                console.error('位置情報の監視エラー:', this.handleLocationError(error));
            },
            this.options
        );
    }

    stopWatchingPosition() {
        if (this.watchId !== null) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
        }
    }

    handleLocationError(error) {
        let message = '位置情報の取得に失敗しました: ';
        
        switch (error.code) {
            case error.PERMISSION_DENIED:
                message += '位置情報の使用が許可されていません。';
                break;
            case error.POSITION_UNAVAILABLE:
                message += '位置情報が利用できません。';
                break;
            case error.TIMEOUT:
                message += '位置情報の取得がタイムアウトしました。';
                break;
            default:
                message += '不明なエラーが発生しました。';
        }
        
        return new Error(message);
    }

    updateLocationDisplay() {
        const locationResult = document.getElementById('locationResult');
        if (locationResult && this.currentLocation) {
            locationResult.innerHTML = `
                <div class="location-info">
                    <p><strong>緯度:</strong> ${this.currentLocation.lat.toFixed(6)}</p>
                    <p><strong>経度:</strong> ${this.currentLocation.lng.toFixed(6)}</p>
                    <p><strong>精度:</strong> ±${this.currentLocation.accuracy.toFixed(0)}m</p>
                    <p><strong>取得時刻:</strong> ${new Date(this.currentLocation.timestamp).toLocaleTimeString('ja-JP')}</p>
                </div>
            `;
        }
    }

    formatLocationForDisplay(location) {
        if (!location) return '位置情報なし';
        
        return `緯度: ${location.lat.toFixed(6)}, 経度: ${location.lng.toFixed(6)}`;
    }

    calculateDistance(lat1, lng1, lat2, lng2) {
        const R = 6371; // 地球の半径（km）
        const dLat = this.toRad(lat2 - lat1);
        const dLng = this.toRad(lng2 - lng1);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
                  Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    toRad(degrees) {
        return degrees * (Math.PI / 180);
    }

    // 既知の圃場位置を管理
    getKnownFields() {
        const fields = localStorage.getItem('agri-voice-fields');
        return fields ? JSON.parse(fields) : [];
    }

    saveKnownField(fieldName, location) {
        const fields = this.getKnownFields();
        const existingIndex = fields.findIndex(f => f.name === fieldName);
        
        if (existingIndex !== -1) {
            fields[existingIndex] = { name: fieldName, location: location };
        } else {
            fields.push({ name: fieldName, location: location });
        }
        
        localStorage.setItem('agri-voice-fields', JSON.stringify(fields));
    }

    findNearestField(currentLocation) {
        const fields = this.getKnownFields();
        if (fields.length === 0) return null;

        let nearestField = null;
        let minDistance = Infinity;

        fields.forEach(field => {
            const distance = this.calculateDistance(
                currentLocation.lat,
                currentLocation.lng,
                field.location.lat,
                field.location.lng
            );

            if (distance < minDistance) {
                minDistance = distance;
                nearestField = field;
            }
        });

        // 100m以内の圃場を候補とする
        return minDistance < 0.1 ? nearestField : null;
    }

    suggestFieldName(location) {
        const nearestField = this.findNearestField(location);
        if (nearestField) {
            return nearestField.name;
        }
        return null;
    }

    // 位置情報を住所に変換（簡易版）
    async reverseGeocode(lat, lng) {
        try {
            // 実際の実装では、Google Maps API等を使用
            // ここでは簡易的な実装
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=ja`);
            const data = await response.json();
            return data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        } catch (error) {
            console.error('住所の取得に失敗:', error);
            return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        }
    }

    // 天気情報との連携（オプション）
    async getWeatherForLocation(lat, lng) {
        // 実際の実装では、天気APIを使用
        // ここでは簡易的な実装
        try {
            const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=YOUR_API_KEY&units=metric&lang=ja`);
            const data = await response.json();
            return {
                temperature: data.main.temp,
                description: data.weather[0].description,
                humidity: data.main.humidity
            };
        } catch (error) {
            console.error('天気情報の取得に失敗:', error);
            return null;
        }
    }

    // 位置情報の精度チェック
    isLocationAccurate(location, requiredAccuracy = 50) {
        return location.accuracy <= requiredAccuracy;
    }

    // 位置情報の記録
    recordLocationHistory(location, workType) {
        const history = JSON.parse(localStorage.getItem('agri-voice-location-history') || '[]');
        history.push({
            location: location,
            workType: workType,
            timestamp: new Date().toISOString()
        });
        
        // 最新100件のみ保持
        if (history.length > 100) {
            history.shift();
        }
        
        localStorage.setItem('agri-voice-location-history', JSON.stringify(history));
    }

    // 位置情報の統計
    getLocationStatistics() {
        const history = JSON.parse(localStorage.getItem('agri-voice-location-history') || '[]');
        const stats = {
            totalRecords: history.length,
            workTypesByLocation: {},
            averageAccuracy: 0
        };

        if (history.length > 0) {
            let totalAccuracy = 0;
            history.forEach(record => {
                totalAccuracy += record.location.accuracy;
                
                const key = `${record.location.lat.toFixed(4)},${record.location.lng.toFixed(4)}`;
                if (!stats.workTypesByLocation[key]) {
                    stats.workTypesByLocation[key] = [];
                }
                stats.workTypesByLocation[key].push(record.workType);
            });
            
            stats.averageAccuracy = totalAccuracy / history.length;
        }

        return stats;
    }
}

// グローバル変数として作成
let locationManager;