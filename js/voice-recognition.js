class VoiceRecognition {
    constructor() {
        this.recognition = null;
        this.isRecording = false;
        this.currentText = '';
        this.isSupported = false;
        this.agriculturalTerms = [];
        this.init();
    }

    init() {
        if ('webkitSpeechRecognition' in window) {
            this.recognition = new webkitSpeechRecognition();
            this.isSupported = true;
        } else if ('SpeechRecognition' in window) {
            this.recognition = new SpeechRecognition();
            this.isSupported = true;
        } else {
            console.warn('音声認識がサポートされていません');
            this.showUnsupportedMessage();
            return;
        }

        this.setupRecognition();
        this.loadAgriculturalTerms();
    }

    setupRecognition() {
        if (!this.recognition) return;

        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'ja-JP';
        this.recognition.maxAlternatives = 3;

        this.recognition.onstart = () => {
            console.log('音声認識開始');
            this.isRecording = true;
            this.showListeningIndicator();
            this.playAudioFeedback('start');
        };

        this.recognition.onresult = (event) => {
            let interimText = '';
            let finalText = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                
                if (event.results[i].isFinal) {
                    finalText += transcript;
                } else {
                    interimText += transcript;
                }
            }

            this.currentText = finalText;
            this.displayRecognitionResult(finalText + interimText);
            
            if (finalText) {
                this.processAgriculturalTerms(finalText);
                this.autoFillForm(finalText);
            }
        };

        this.recognition.onerror = (event) => {
            console.error('音声認識エラー:', event.error);
            this.handleRecognitionError(event.error);
        };

        this.recognition.onend = () => {
            console.log('音声認識終了');
            this.isRecording = false;
            this.hideListeningIndicator();
            this.playAudioFeedback('end');
        };
    }

    loadAgriculturalTerms() {
        this.agriculturalTerms = [
            // 作物名
            { term: 'いね', normalized: '稲', category: 'crop' },
            { term: 'こめ', normalized: '稲', category: 'crop' },
            { term: 'むぎ', normalized: '麦', category: 'crop' },
            { term: 'とうもろこし', normalized: 'トウモロコシ', category: 'crop' },
            { term: 'だいず', normalized: '大豆', category: 'crop' },
            { term: 'じゃがいも', normalized: 'ジャガイモ', category: 'crop' },
            { term: 'とまと', normalized: 'トマト', category: 'crop' },
            { term: 'きゃべつ', normalized: 'キャベツ', category: 'crop' },
            { term: 'れたす', normalized: 'レタス', category: 'crop' },
            
            // 作業名
            { term: 'はしゅ', normalized: '播種', category: 'work' },
            { term: 'たねまき', normalized: '播種', category: 'work' },
            { term: 'うえつけ', normalized: '植付', category: 'work' },
            { term: 'しひ', normalized: '施肥', category: 'work' },
            { term: 'ひりょう', normalized: '施肥', category: 'work' },
            { term: 'のうやく', normalized: '農薬散布', category: 'work' },
            { term: 'さんぷ', normalized: '農薬散布', category: 'work' },
            { term: 'じょそう', normalized: '除草', category: 'work' },
            { term: 'くさとり', normalized: '除草', category: 'work' },
            { term: 'しゅうかく', normalized: '収穫', category: 'work' },
            { term: 'かり', normalized: '収穫', category: 'work' },
            { term: 'てんけん', normalized: '点検', category: 'work' },
            
            // 病害虫
            { term: 'いもち', normalized: 'いもち病', category: 'disease' },
            { term: 'あぶらむし', normalized: 'アブラムシ', category: 'pest' },
            { term: 'うどんこ', normalized: 'うどんこ病', category: 'disease' },
            { term: 'あかだに', normalized: 'ハダニ', category: 'pest' },
            
            // 数量表現
            { term: 'きろ', normalized: 'kg', category: 'unit' },
            { term: 'キロ', normalized: 'kg', category: 'unit' },
            { term: 'へくたーる', normalized: 'ha', category: 'unit' },
            { term: 'アール', normalized: 'a', category: 'unit' },
            { term: 'たん', normalized: '反', category: 'unit' },
            { term: 'つぼ', normalized: '坪', category: 'unit' }
        ];
    }

    processAgriculturalTerms(text) {
        let processedText = text;
        
        this.agriculturalTerms.forEach(term => {
            const regex = new RegExp(term.term, 'gi');
            processedText = processedText.replace(regex, term.normalized);
        });

        if (processedText !== text) {
            console.log('農業用語変換:', text, '->', processedText);
            this.currentText = processedText;
            this.displayRecognitionResult(processedText);
        }
    }

    autoFillForm(text) {
        const lowerText = text.toLowerCase();
        
        // 作業種類の自動推定
        if (lowerText.includes('播種') || lowerText.includes('種まき')) {
            document.getElementById('workType').value = 'seeding';
        } else if (lowerText.includes('植付') || lowerText.includes('植え付け')) {
            document.getElementById('workType').value = 'planting';
        } else if (lowerText.includes('施肥') || lowerText.includes('肥料')) {
            document.getElementById('workType').value = 'fertilizing';
        } else if (lowerText.includes('農薬') || lowerText.includes('散布')) {
            document.getElementById('workType').value = 'pesticide';
        } else if (lowerText.includes('除草') || lowerText.includes('草取り')) {
            document.getElementById('workType').value = 'weeding';
        } else if (lowerText.includes('収穫') || lowerText.includes('刈り')) {
            document.getElementById('workType').value = 'harvesting';
        } else if (lowerText.includes('点検') || lowerText.includes('確認')) {
            document.getElementById('workType').value = 'inspection';
        }

        // 作物の自動推定
        if (lowerText.includes('稲') || lowerText.includes('米')) {
            document.getElementById('cropType').value = 'rice';
        } else if (lowerText.includes('麦')) {
            document.getElementById('cropType').value = 'wheat';
        } else if (lowerText.includes('トウモロコシ')) {
            document.getElementById('cropType').value = 'corn';
        } else if (lowerText.includes('大豆')) {
            document.getElementById('cropType').value = 'soybean';
        } else if (lowerText.includes('ジャガイモ')) {
            document.getElementById('cropType').value = 'potato';
        } else if (lowerText.includes('トマト')) {
            document.getElementById('cropType').value = 'tomato';
        } else if (lowerText.includes('キャベツ')) {
            document.getElementById('cropType').value = 'cabbage';
        } else if (lowerText.includes('レタス')) {
            document.getElementById('cropType').value = 'lettuce';
        }

        // 圃場名の抽出
        const fieldMatch = text.match(/(\d+)([号圃場|圃場|号])/);
        if (fieldMatch) {
            document.getElementById('fieldName').value = `第${fieldMatch[1]}圃場`;
        }

        // 数量の抽出
        const quantityMatch = text.match(/(\d+(?:\.\d+)?)\s*(kg|キロ|ha|ヘクタール|a|アール|反|坪)/);
        if (quantityMatch) {
            document.getElementById('quantity').value = `${quantityMatch[1]}${quantityMatch[2]}`;
        }

        // 作業詳細に音声認識結果を設定
        const workDetailsField = document.getElementById('workDetails');
        if (workDetailsField.value.trim() === '') {
            workDetailsField.value = text;
        }
    }

    startRecording() {
        if (!this.isSupported) {
            this.showUnsupportedMessage();
            return;
        }

        if (!this.isRecording && this.recognition) {
            this.currentText = '';
            this.recognition.start();
        }
    }

    stopRecording() {
        if (this.isRecording && this.recognition) {
            this.recognition.stop();
        }
    }

    displayRecognitionResult(text) {
        const resultElement = document.getElementById('recognizedText');
        if (resultElement) {
            resultElement.textContent = text || 'ここに音声認識結果が表示されます';
        }
    }

    showListeningIndicator() {
        const indicator = document.getElementById('listeningIndicator');
        if (indicator) {
            indicator.classList.add('active');
        }
    }

    hideListeningIndicator() {
        const indicator = document.getElementById('listeningIndicator');
        if (indicator) {
            indicator.classList.remove('active');
        }
    }

    playAudioFeedback(type) {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        if (type === 'start') {
            oscillator.frequency.value = 800;
        } else {
            oscillator.frequency.value = 400;
        }
        
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.2);
    }

    showUnsupportedMessage() {
        const resultElement = document.getElementById('recognizedText');
        if (resultElement) {
            resultElement.textContent = 'このブラウザでは音声認識がサポートされていません。Chrome、Safari、Edgeをご利用ください。';
        }
    }

    handleRecognitionError(error) {
        let message = '音声認識エラーが発生しました: ';
        
        switch (error) {
            case 'no-speech':
                message += '音声が検出されませんでした。';
                break;
            case 'audio-capture':
                message += 'マイクへのアクセスができませんでした。';
                break;
            case 'not-allowed':
                message += 'マイクの使用が許可されていません。';
                break;
            case 'network':
                message += 'ネットワークエラーが発生しました。';
                break;
            default:
                message += error;
        }
        
        this.displayRecognitionResult(message);
        this.hideListeningIndicator();
    }
}

// グローバル変数として音声認識インスタンスを作成
let voiceRecognition;