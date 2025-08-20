/**
 * カレンダー機能管理クラス
 */
class CalendarManager {
    constructor() {
        this.currentDate = new Date();
        this.selectedDate = null;
        this.calendar = null;
        this.workDateInput = null;
        this.currentMonthSpan = null;
        this.calendarDaysContainer = null;
        
        this.init();
    }

    init() {
        this.calendar = document.getElementById('calendar');
        this.workDateInput = document.getElementById('workDate');
        this.currentMonthSpan = document.getElementById('currentMonth');
        this.calendarDaysContainer = document.getElementById('calendarDays');
        
        this.bindEvents();
        this.setCurrentDate();
        this.renderCalendar();
    }

    bindEvents() {
        // カレンダーを開くボタン
        document.getElementById('openCalendar').addEventListener('click', () => {
            this.toggleCalendar();
        });

        // 前月・次月ボタン
        document.getElementById('prevMonth').addEventListener('click', () => {
            this.previousMonth();
        });

        document.getElementById('nextMonth').addEventListener('click', () => {
            this.nextMonth();
        });

        // カレンダー外をクリックしたら閉じる
        document.addEventListener('click', (e) => {
            if (!this.calendar.contains(e.target) && 
                !e.target.closest('.date-input-container')) {
                this.hideCalendar();
            }
        });

        // 今日の日付をデフォルトで設定
        this.setTodayAsDefault();
    }

    toggleCalendar() {
        if (this.calendar.classList.contains('hidden')) {
            this.showCalendar();
        } else {
            this.hideCalendar();
        }
    }

    showCalendar() {
        this.calendar.classList.remove('hidden');
        this.renderCalendar();
    }

    hideCalendar() {
        this.calendar.classList.add('hidden');
    }

    setCurrentDate() {
        const today = new Date();
        this.currentDate = new Date(today.getFullYear(), today.getMonth(), 1);
    }

    setTodayAsDefault() {
        const today = new Date();
        this.selectedDate = today;
        this.workDateInput.value = this.formatDate(today);
    }

    previousMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() - 1);
        this.renderCalendar();
    }

    nextMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() + 1);
        this.renderCalendar();
    }

    renderCalendar() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        
        // 月表示を更新
        this.currentMonthSpan.textContent = `${year}年${month + 1}月`;
        
        // カレンダーの日付を生成
        this.generateCalendarDays(year, month);
    }

    generateCalendarDays(year, month) {
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());
        
        const endDate = new Date(lastDay);
        endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()));
        
        this.calendarDaysContainer.innerHTML = '';
        
        const today = new Date();
        const currentDate = new Date(startDate);
        
        while (currentDate <= endDate) {
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day';
            dayElement.textContent = currentDate.getDate();
            
            // 今月以外の日付
            if (currentDate.getMonth() !== month) {
                dayElement.classList.add('other-month');
            }
            
            // 今日の日付
            if (this.isSameDate(currentDate, today)) {
                dayElement.classList.add('today');
            }
            
            // 選択された日付
            if (this.selectedDate && this.isSameDate(currentDate, this.selectedDate)) {
                dayElement.classList.add('selected');
            }
            
            // 日付クリックイベント
            dayElement.addEventListener('click', () => {
                this.selectDate(currentDate);
            });
            
            this.calendarDaysContainer.appendChild(dayElement);
            currentDate.setDate(currentDate.getDate() + 1);
        }
    }

    selectDate(date) {
        this.selectedDate = date;
        this.workDateInput.value = this.formatDate(date);
        this.hideCalendar();
        this.renderCalendar(); // 選択状態を更新
    }

    isSameDate(date1, date2) {
        return date1.getFullYear() === date2.getFullYear() &&
               date1.getMonth() === date2.getMonth() &&
               date1.getDate() === date2.getDate();
    }

    formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    getSelectedDate() {
        return this.selectedDate;
    }

    getSelectedDateString() {
        return this.selectedDate ? this.formatDate(this.selectedDate) : '';
    }
}

// カレンダーマネージャーを初期化
document.addEventListener('DOMContentLoaded', () => {
    window.calendarManager = new CalendarManager();
});
