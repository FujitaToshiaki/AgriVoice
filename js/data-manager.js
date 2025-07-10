class DataManager {
    constructor() {
        this.storageKey = 'agri-voice-records';
        this.records = [];
        this.loadRecords();
    }

    loadRecords() {
        try {
            const savedRecords = localStorage.getItem(this.storageKey);
            if (savedRecords) {
                this.records = JSON.parse(savedRecords);
            }
        } catch (error) {
            console.error('データの読み込みエラー:', error);
            this.records = [];
        }
    }

    saveRecords() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.records));
            return true;
        } catch (error) {
            console.error('データの保存エラー:', error);
            return false;
        }
    }

    addRecord(recordData) {
        const record = {
            id: this.generateId(),
            timestamp: new Date().toISOString(),
            date: new Date().toLocaleDateString('ja-JP'),
            time: new Date().toLocaleTimeString('ja-JP'),
            ...recordData
        };

        this.records.unshift(record);
        this.saveRecords();
        return record;
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    getRecords(filter = null) {
        if (!filter) {
            return this.records;
        }

        return this.records.filter(record => {
            if (filter.workType && record.workType !== filter.workType) {
                return false;
            }
            if (filter.cropType && record.cropType !== filter.cropType) {
                return false;
            }
            if (filter.fieldName && !record.fieldName.includes(filter.fieldName)) {
                return false;
            }
            if (filter.dateFrom && new Date(record.timestamp) < new Date(filter.dateFrom)) {
                return false;
            }
            if (filter.dateTo && new Date(record.timestamp) > new Date(filter.dateTo)) {
                return false;
            }
            return true;
        });
    }

    deleteRecord(id) {
        const index = this.records.findIndex(record => record.id === id);
        if (index !== -1) {
            this.records.splice(index, 1);
            this.saveRecords();
            return true;
        }
        return false;
    }

    updateRecord(id, updateData) {
        const index = this.records.findIndex(record => record.id === id);
        if (index !== -1) {
            this.records[index] = { ...this.records[index], ...updateData };
            this.saveRecords();
            return this.records[index];
        }
        return null;
    }

    exportToCSV() {
        if (this.records.length === 0) {
            alert('出力するデータがありません。');
            return;
        }

        const headers = [
            '日時',
            '作業種類',
            '作物',
            '圃場名',
            '作業詳細',
            '数量',
            '位置情報'
        ];

        const csvContent = [
            headers.join(','),
            ...this.records.map(record => [
                `"${record.date} ${record.time}"`,
                `"${this.getWorkTypeLabel(record.workType)}"`,
                `"${this.getCropTypeLabel(record.cropType)}"`,
                `"${record.fieldName || ''}"`,
                `"${(record.workDetails || '').replace(/"/g, '""')}"`,
                `"${record.quantity || ''}"`,
                `"${record.location ? `${record.location.lat},${record.location.lng}` : ''}"`
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `agri-voice-records-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    getWorkTypeLabel(workType) {
        const labels = {
            'seeding': '播種',
            'planting': '植付',
            'fertilizing': '施肥',
            'pesticide': '農薬散布',
            'weeding': '除草',
            'harvesting': '収穫',
            'inspection': '点検'
        };
        return labels[workType] || workType;
    }

    getCropTypeLabel(cropType) {
        const labels = {
            'rice': '稲',
            'wheat': '麦',
            'corn': 'トウモロコシ',
            'soybean': '大豆',
            'potato': 'ジャガイモ',
            'tomato': 'トマト',
            'cabbage': 'キャベツ',
            'lettuce': 'レタス'
        };
        return labels[cropType] || cropType;
    }

    displayRecords() {
        const historyList = document.getElementById('historyList');
        if (!historyList) return;

        if (this.records.length === 0) {
            historyList.innerHTML = '<p>記録がありません。</p>';
            return;
        }

        const recordsHTML = this.records.map(record => `
            <div class="history-item" data-id="${record.id}">
                <div class="record-header">
                    <h4>${this.getWorkTypeLabel(record.workType)} - ${this.getCropTypeLabel(record.cropType)}</h4>
                    <span class="timestamp">${record.date} ${record.time}</span>
                </div>
                <div class="record-details">
                    <p><strong>圃場:</strong> ${record.fieldName || '未設定'}</p>
                    <p><strong>数量:</strong> ${record.quantity || '未設定'}</p>
                    <p><strong>詳細:</strong> ${record.workDetails || '未設定'}</p>
                    ${record.location ? `<p><strong>位置:</strong> ${record.location.lat.toFixed(6)}, ${record.location.lng.toFixed(6)}</p>` : ''}
                </div>
                <div class="record-actions">
                    <button class="btn-edit" onclick="editRecord('${record.id}')">編集</button>
                    <button class="btn-delete" onclick="deleteRecord('${record.id}')">削除</button>
                </div>
            </div>
        `).join('');

        historyList.innerHTML = recordsHTML;
    }

    getStatistics() {
        const stats = {
            totalRecords: this.records.length,
            workTypes: {},
            cropTypes: {},
            fieldsUsed: new Set(),
            lastWeekRecords: 0
        };

        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        this.records.forEach(record => {
            // 作業種類別集計
            const workType = this.getWorkTypeLabel(record.workType);
            stats.workTypes[workType] = (stats.workTypes[workType] || 0) + 1;

            // 作物別集計
            const cropType = this.getCropTypeLabel(record.cropType);
            stats.cropTypes[cropType] = (stats.cropTypes[cropType] || 0) + 1;

            // 圃場の使用状況
            if (record.fieldName) {
                stats.fieldsUsed.add(record.fieldName);
            }

            // 過去1週間の記録数
            if (new Date(record.timestamp) >= oneWeekAgo) {
                stats.lastWeekRecords++;
            }
        });

        stats.fieldsUsed = Array.from(stats.fieldsUsed);
        return stats;
    }

    backup() {
        const backupData = {
            version: '1.0',
            timestamp: new Date().toISOString(),
            records: this.records
        };

        const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `agri-voice-backup-${new Date().toISOString().split('T')[0]}.json`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    restore(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const backupData = JSON.parse(e.target.result);
                    if (backupData.records && Array.isArray(backupData.records)) {
                        this.records = backupData.records;
                        this.saveRecords();
                        resolve(backupData.records.length);
                    } else {
                        reject('無効なバックアップファイルです。');
                    }
                } catch (error) {
                    reject('バックアップファイルの読み込みに失敗しました。');
                }
            };
            reader.readAsText(file);
        });
    }

    searchRecords(query) {
        const searchTerm = query.toLowerCase();
        return this.records.filter(record => {
            return (
                (record.workDetails || '').toLowerCase().includes(searchTerm) ||
                (record.fieldName || '').toLowerCase().includes(searchTerm) ||
                this.getWorkTypeLabel(record.workType).toLowerCase().includes(searchTerm) ||
                this.getCropTypeLabel(record.cropType).toLowerCase().includes(searchTerm)
            );
        });
    }
}

// グローバル変数として作成
let dataManager;