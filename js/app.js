// メインアプリケーションクラス
class AgriVoiceApp {
    constructor() {
        this.isInitialized = false;
        this.currentRecord = null;
        this.init();
    }

    async init() {
        try {
            console.log('AgriVoiceアプリを初期化中...');
            
            // 各マネージャーの初期化
            voiceRecognition = new VoiceRecognition();
            dataManager = new DataManager();
            locationManager = new LocationManager();
            
            // イベントリスナーの設定
            this.setupEventListeners();
            
            // UIの初期化
            this.initializeUI();
            
            // サービスワーカーの登録（オフライン対応）
            this.registerServiceWorker();
            
            this.isInitialized = true;
            console.log('AgriVoiceアプリの初期化完了');
            
        } catch (error) {
            console.error('アプリの初期化に失敗:', error);
            this.showError('アプリの初期化に失敗しました');
        }
    }

    setupEventListeners() {
        // 音声認識ボタン
        const startButton = document.getElementById('startRecording');
        const stopButton = document.getElementById('stopRecording');
        
        if (startButton) {
            startButton.addEventListener('click', () => {
                this.startVoiceRecognition();
            });
        }
        
        if (stopButton) {
            stopButton.addEventListener('click', () => {
                this.stopVoiceRecognition();
            });
        }

        // 作業記録フォーム
        const workForm = document.getElementById('workRecordForm');
        if (workForm) {
            workForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveWorkRecord();
            });
        }

        // 位置情報取得ボタン
        const locationButton = document.getElementById('getLocation');
        if (locationButton) {
            locationButton.addEventListener('click', () => {
                this.getCurrentLocation();
            });
        }

        // 履歴表示ボタン
        const historyButton = document.getElementById('showHistory');
        if (historyButton) {
            historyButton.addEventListener('click', () => {
                this.showHistory();
            });
        }

        // データ出力ボタン
        const exportButton = document.getElementById('exportData');
        if (exportButton) {
            exportButton.addEventListener('click', () => {
                this.exportData();
            });
        }

        // キーボードショートカット
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'r':
                        e.preventDefault();
                        this.toggleVoiceRecognition();
                        break;
                    case 's':
                        e.preventDefault();
                        this.saveWorkRecord();
                        break;
                    case 'l':
                        e.preventDefault();
                        this.getCurrentLocation();
                        break;
                }
            }
        });

        // ページが非表示になった時の処理
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && voiceRecognition && voiceRecognition.isRecording) {
                this.stopVoiceRecognition();
            }
        });
    }

    initializeUI() {
        // 音声認識サポート状況の確認
        if (!voiceRecognition.isSupported) {
            this.showError('このブラウザでは音声認識がサポートされていません');
            document.getElementById('startRecording').disabled = true;
        }

        // 位置情報サポート状況の確認
        if (!locationManager.isSupported) {
            this.showWarning('位置情報がサポートされていません');
            document.getElementById('getLocation').disabled = true;
        }

        // 現在時刻の表示
        this.updateCurrentTime();
        setInterval(() => this.updateCurrentTime(), 1000);

        // 統計情報の表示
        this.displayStatistics();
    }

    startVoiceRecognition() {
        if (!voiceRecognition.isSupported) {
            this.showError('音声認識がサポートされていません');
            return;
        }

        try {
            voiceRecognition.startRecording();
            this.updateRecordingButtons(true);
            this.showInfo('音声認識を開始しました');
        } catch (error) {
            console.error('音声認識の開始に失敗:', error);
            this.showError('音声認識の開始に失敗しました');
        }
    }

    stopVoiceRecognition() {
        try {
            voiceRecognition.stopRecording();
            this.updateRecordingButtons(false);
            this.showInfo('音声認識を停止しました');
        } catch (error) {
            console.error('音声認識の停止に失敗:', error);
        }
    }

    toggleVoiceRecognition() {
        if (voiceRecognition.isRecording) {
            this.stopVoiceRecognition();
        } else {
            this.startVoiceRecognition();
        }
    }

    updateRecordingButtons(isRecording) {
        const startButton = document.getElementById('startRecording');
        const stopButton = document.getElementById('stopRecording');
        
        if (startButton) {
            startButton.disabled = isRecording;
        }
        if (stopButton) {
            stopButton.disabled = !isRecording;
        }
    }

    async saveWorkRecord() {
        try {
            const formData = this.getFormData();
            
            if (!this.validateFormData(formData)) {
                return;
            }

            // 現在の位置情報を取得
            if (locationManager.currentLocation) {
                formData.location = locationManager.currentLocation;
            }

            // 音声認識結果を含める
            if (voiceRecognition.currentText) {
                formData.voiceInput = voiceRecognition.currentText;
            }

            // データを保存
            const record = dataManager.addRecord(formData);
            
            // 位置情報履歴に記録
            if (formData.location) {
                locationManager.recordLocationHistory(formData.location, formData.workType);
            }

            this.showSuccess('作業記録を保存しました');
            this.clearForm();
            this.displayStatistics();

        } catch (error) {
            console.error('作業記録の保存に失敗:', error);
            this.showError('作業記録の保存に失敗しました');
        }
    }

    getFormData() {
        return {
            workType: document.getElementById('workType').value,
            cropType: document.getElementById('cropType').value,
            fieldName: document.getElementById('fieldName').value,
            workDetails: document.getElementById('workDetails').value,
            quantity: document.getElementById('quantity').value
        };
    }

    validateFormData(formData) {
        if (!formData.workType) {
            this.showError('作業種類を選択してください');
            return false;
        }
        if (!formData.cropType) {
            this.showError('作物を選択してください');
            return false;
        }
        return true;
    }

    clearForm() {
        document.getElementById('workRecordForm').reset();
        document.getElementById('recognizedText').textContent = 'ここに音声認識結果が表示されます';
        voiceRecognition.currentText = '';
    }

    async getCurrentLocation() {
        try {
            this.showInfo('位置情報を取得中...');
            const location = await locationManager.getCurrentLocation();
            locationManager.updateLocationDisplay();
            
            // 近くの圃場を提案
            const suggestedField = locationManager.suggestFieldName(location);
            if (suggestedField) {
                document.getElementById('fieldName').value = suggestedField;
                this.showInfo(`近くの圃場「${suggestedField}」を設定しました`);
            }
            
            this.showSuccess('位置情報を取得しました');
            
        } catch (error) {
            console.error('位置情報の取得に失敗:', error);
            this.showError(error.message);
        }
    }

    showHistory() {
        try {
            dataManager.displayRecords();
            this.showInfo('作業履歴を表示しました');
        } catch (error) {
            console.error('履歴の表示に失敗:', error);
            this.showError('履歴の表示に失敗しました');
        }
    }

    exportData() {
        try {
            dataManager.exportToCSV();
            this.showSuccess('データを出力しました');
        } catch (error) {
            console.error('データの出力に失敗:', error);
            this.showError('データの出力に失敗しました');
        }
    }

    displayStatistics() {
        const stats = dataManager.getStatistics();
        
        // 統計情報を表示する要素があれば更新
        const statsElement = document.getElementById('statistics');
        if (statsElement) {
            statsElement.innerHTML = `
                <div class="stats-summary">
                    <h3>作業統計</h3>
                    <p>総記録数: ${stats.totalRecords}件</p>
                    <p>過去1週間: ${stats.lastWeekRecords}件</p>
                    <p>使用圃場数: ${stats.fieldsUsed.length}箇所</p>
                </div>
            `;
        }
    }

    updateCurrentTime() {
        const timeElement = document.getElementById('currentTime');
        if (timeElement) {
            const now = new Date();
            timeElement.textContent = now.toLocaleString('ja-JP');
        }
    }

    // 通知メソッド
    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showWarning(message) {
        this.showNotification(message, 'warning');
    }

    showInfo(message) {
        this.showNotification(message, 'info');
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 5px;
            color: white;
            font-weight: bold;
            z-index: 1000;
            animation: slideIn 0.3s ease-out;
        `;

        // 背景色を設定
        switch (type) {
            case 'success':
                notification.style.backgroundColor = '#4CAF50';
                break;
            case 'error':
                notification.style.backgroundColor = '#f44336';
                break;
            case 'warning':
                notification.style.backgroundColor = '#ff9800';
                break;
            default:
                notification.style.backgroundColor = '#2196F3';
        }

        document.body.appendChild(notification);

        // 3秒後に自動削除
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    // サービスワーカーの登録
    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js');
                console.log('Service Worker registered:', registration);
            } catch (error) {
                console.error('Service Worker registration failed:', error);
            }
        }
    }
}

// DOM読み込み完了後にアプリを初期化
document.addEventListener('DOMContentLoaded', () => {
    window.agriVoiceApp = new AgriVoiceApp();
});

// グローバル関数（HTML内から呼び出し用）
function editRecord(id) {
    const record = dataManager.records.find(r => r.id === id);
    if (record) {
        document.getElementById('workType').value = record.workType;
        document.getElementById('cropType').value = record.cropType;
        document.getElementById('fieldName').value = record.fieldName || '';
        document.getElementById('workDetails').value = record.workDetails || '';
        document.getElementById('quantity').value = record.quantity || '';
        
        // 編集モードの表示
        window.agriVoiceApp.showInfo('記録を編集モードで読み込みました');
    }
}

function deleteRecord(id) {
    if (confirm('この記録を削除しますか？')) {
        if (dataManager.deleteRecord(id)) {
            dataManager.displayRecords();
            window.agriVoiceApp.showSuccess('記録を削除しました');
        } else {
            window.agriVoiceApp.showError('記録の削除に失敗しました');
        }
    }
}

// アニメーション用CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);