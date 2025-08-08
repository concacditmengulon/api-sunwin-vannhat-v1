const express = require('express');
const axios = require('axios');
const app = express();
const port = process.env.PORT || 3000;

// Middleware to parse JSON requests
app.use(express.json());

// HistoricalDataManager and PredictionEngine classes (as provided)
const modelPredictions = {
    trend: {},
    short: {},
    mean: {},
    switch: {},
    bridge: {},
    vannhat: {},
    deepcycle: {},
    aihtdd: {},
    supernova: {},
    trader_x: {},
    phapsu_ai: {},
    thanluc_ai: {}
};

class HistoricalDataManager {
    constructor(maxHistoryLength = 5000) {
        this.history = [];
        this.maxHistoryLength = maxHistoryLength;
    }

    addSession(newData) {
        if (!newData || !newData.Phien) return false;
        if (this.history.some(item => item.Phien === newData.Phien)) return false;
        this.history.push(newData);
        if (this.history.length > this.maxHistoryLength) {
            this.history = this.history.slice(this.history.length - this.maxHistoryLength);
        }
        this.history.sort((a, b) => a.Phien - b.Phien);
        return true;
    }

    getHistory() {
        return [...this.history];
    }
}

class PredictionEngine {
    constructor(historyMgr) {
        this.historyMgr = historyMgr;
        this.mlModel = null;
        this.deepLearningModel = null;
        this.divineModel = null;
        this.trainModels();
    }

    trainModels() {
        const history = this.historyMgr.getHistory();
        if (history.length < 500) {
            this.mlModel = null;
            this.deepLearningModel = null;
            this.divineModel = null;
            return;
        }

        const taiData = history.filter(h => h.Ket_qua === 'Tài');
        const xiuData = history.filter(h => h.Ket_qua === 'Xỉu');
        
        const taiFreq = taiData.length / history.length;
        const xiuFreq = xiuData.length / history.length;
        
        const taiStreakAvg = taiData.reduce((sum, h, i) => {
            if (i > 0 && taiData[i-1].Phien === h.Phien - 1) return sum + 1;
            return sum;
        }, 0) / taiData.length;

        const xiuStreakAvg = xiuData.reduce((sum, h, i) => {
            if (i > 0 && xiuData[i-1].Phien === h.Phien - 1) return sum + 1;
            return sum;
        }, 0) / xiuData.length;
        
        this.mlModel = { taiFreq, xiuFreq, taiStreakAvg, xiuStreakAvg };
        
        const last100 = history.slice(-100);
        const last100Results = last100.map(h => h.Ket_qua);
        const last100Scores = last100.map(h => h.Tong || 0);
        this.deepLearningModel = {
            taiDominance: last100Results.filter(r => r === 'Tài').length > last100.length * 0.6,
            xiuDominance: last100Results.filter(r => r === 'Xỉu').length > last100.length * 0.6,
            highVariance: last100Scores.some(score => score > 14 || score < 6)
        };
        
        const last200 = history.slice(-200);
        const uniquePatterns = {};
        for(let i = 0; i < last200.length - 5; i++){
            const pattern = last200.slice(i, i+5).map(h => h.Ket_qua).join(',');
            uniquePatterns[pattern] = (uniquePatterns[pattern] || 0) + 1;
        }
        const commonPattern = Object.entries(uniquePatterns).filter(([p, count]) => count > 1);
        this.divineModel = {
            hasRepeatedPattern: commonPattern.length > 0,
            mostCommonPattern: commonPattern[0]?.[0]
        };
    }

    traderX(history) {
        if (!this.mlModel || history.length < 500) {
            return { prediction: 'Chờ đợi', reason: '[TRADER X] Chưa đủ dữ liệu để huấn luyện Trader X' };
        }
        const last10 = history.slice(-10).map(h => h.Ket_qua);
        const currentStreak = this.detectStreakAndBreak(history).streak;
        const taiInLast10 = last10.filter(r => r === 'Tài').length;
        const xiuInLast10 = last10.filter(r => r === 'Xỉu').length;
        if (taiInLast10 / 10 > this.mlModel.taiFreq * 1.5 && currentStreak >= this.mlModel.taiStreakAvg + 1) {
            return { prediction: 'Xỉu', reason: '[TRADER X] Mẫu Tài đang quá mức trung bình, dự đoán đảo chiều Xỉu' };
        }
        if (xiuInLast10 / 10 > this.mlModel.xiuFreq * 1.5 && currentStreak >= this.mlModel.xiuStreakAvg + 1) {
            return { prediction: 'Tài', reason: '[TRADER X] Mẫu Xỉu đang quá mức trung bình, dự đoán đảo chiều Tài' };
        }
        return { prediction: 'Chờ đợi', reason: '[TRADER X] Không phát hiện mẫu đặc biệt từ Học máy' };
    }

    phapsuAI(history) {
        if (!this.deepLearningModel || history.length < 500) {
            return { prediction: 'Chờ đợi', reason: '[PHÁP SƯ AI] Chưa đủ dữ liệu để kích hoạt Pháp Sư AI' };
        }
        const last3 = history.slice(-3).map(h => h.Ket_qua);
        const last5Scores = history.slice(-5).map(h => h.Tong || 0);
        const avgScore = last5Scores.reduce((sum, score) => sum + score, 0) / last5Scores.length;
        if (this.deepLearningModel.taiDominance && last3.join(',') === 'Tài,Tài,Tài') {
            return { prediction: 'Xỉu', reason: '[PHÁP SƯ AI] Phát hiện lỗi liên tiếp 3 Tài trong chu kỳ Tài thống trị, dự đoán bẻ cầu' };
        }
        if (this.deepLearningModel.xiuDominance && last3.join(',') === 'Xỉu,Xỉu,Xỉu') {
            return { prediction: 'Tài', reason: '[PHÁP SƯ AI] Phát hiện lỗi liên tiếp 3 Xỉu trong chu kỳ Xỉu thống trị, dự đoán bẻ cầu' };
        }
        if (this.deepLearningModel.highVariance && avgScore > 13) {
            return { prediction: 'Xỉu', reason: '[PHÁP SƯ AI] Phát hiện lỗi điểm số cao bất thường trong chu kỳ biến động lớn' };
        }
        if (this.deepLearningModel.highVariance && avgScore < 7) {
            return { prediction: 'Tài', reason: '[PHÁP SƯ AI] Phát hiện lỗi điểm số thấp bất thường trong chu kỳ biến động lớn' };
        }
        return { prediction: 'Chờ đợi', reason: '[PHÁP SƯ AI] Không tìm thấy lỗi hệ thống' };
    }

    thanlucAI(history) {
        if (!this.divineModel || history.length < 500) {
            return { prediction: 'Chờ đợi', reason: '[THẦN LỰC AI] Chưa đủ dữ liệu để kích hoạt Thần Lực AI' };
        }
        const { streak, currentResult } = this.detectStreakAndBreak(history);
        const last5 = history.slice(-5).map(h => h.Ket_qua).join(',');

        if(this.divineModel.hasRepeatedPattern && this.divineModel.mostCommonPattern === last5) {
             const patternArray = this.divineModel.mostCommonPattern.split(',');
             const nextPred = patternArray.length > 0 ? (patternArray[patternArray.length-1] === 'Tài' ? 'Xỉu' : 'Tài') : 'Chờ đợi';
             return { prediction: nextPred, reason: `[THẦN LỰC AI] Phát hiện chuỗi lặp ${last5} → dự đoán đảo chiều`, source: 'THẦN LỰC' };
        }
        if (streak >= 7) {
            return { prediction: currentResult === 'Tài' ? 'Xỉu' : 'Tài', reason: `[THẦN LỰC AI] Chuỗi ${currentResult} kéo dài quá giới hạn ${streak} lần, chắc chắn bẻ cầu!`, source: 'THẦN LỰC' };
        }
        return { prediction: 'Chờ đợi', reason: '[THẦN LỰC AI] Không phát hiện tín hiệu siêu nhiên', source: 'THẦN LỰC' };
    }

    detectStreakAndBreak(history) {
        if (!history || history.length === 0) return { streak: 0, currentResult: null, breakProb: 0.0 };
        let streak = 1;
        const currentResult = history[history.length - 1].Ket_qua;
        for (let i = history.length - 2; i >= 0; i--) {
            if (history[i].Ket_qua === currentResult) {
                streak++;
            } else {
                break;
            }
        }
        const last15 = history.slice(-15).map(h => h.Ket_qua);
        if (!last15.length) return { streak, currentResult, breakProb: 0.0 };
        const switches = last15.slice(1).reduce((count, curr, idx) => count + (curr !== last15[idx] ? 1 : 0), 0);
        const taiCount = last15.filter(r => r === 'Tài').length;
        const xiuCount = last15.length - taiCount;
        const imbalance = Math.abs(taiCount - xiuCount) / last15.length;
        let breakProb = 0.0;
        if (streak >= 6) {
            breakProb = Math.min(0.8 + (switches / 15) + imbalance * 0.3, 0.95);
        } else if (streak >= 4) {
            breakProb = Math.min(0.5 + (switches / 12) + imbalance * 0.25, 0.9);
        } else if (streak >= 2 && switches >= 5) {
            breakProb = 0.45;
        } else if (streak === 1 && switches >= 6) {
            breakProb = 0.3;
        }
        return { streak, currentResult, breakProb };
    }

    evaluateModelPerformance(history, modelName, lookback = 10) {
        if (!modelPredictions[modelName] || history.length < 2) return 1.0;
        lookback = Math.min(lookback, history.length - 1);
        let correctCount = 0;
        for (let i = 0; i < lookback; i++) {
            const historyIndex = history.length - (i + 2);
            const pred = modelPredictions[modelName][history[historyIndex].Phien];
            const actual = history[history.length - (i + 1)].Ket_qua;
            if (pred && ((pred === 'Tài' && actual === 'Tài') || (pred === 'Xỉu' && actual === 'Xỉu'))) {
                correctCount++;
            }
        }
        const accuracy = lookback > 0 ? correctCount / lookback : 0.5;
        const performanceScore = 1.0 + (accuracy - 0.5);
        return Math.max(0.0, Math.min(2.0, performanceScore));
    }

    supernovaAI(history) {
        const historyLength = history.length;
        if (historyLength < 100) return { prediction: 'Chờ đợi', reason: 'Không đủ dữ liệu cho Supernova AI', source: 'SUPERNOVA' };
        const last30Scores = history.slice(-30).map(h => h.Tong || 0);
        const avgScore = last30Scores.reduce((sum, score) => sum + score, 0) / 30;
        const scoreStdDev = Math.sqrt(last30Scores.map(x => Math.pow(x - avgScore, 2)).reduce((a, b) => a + b) / 30);
        const lastScore = last30Scores[last30Scores.length - 1];
        if (lastScore > avgScore + scoreStdDev * 2) {
            return { prediction: 'Xỉu', reason: `[SUPERNOVA] Điểm số gần đây (${lastScore}) quá cao so với trung bình, dự đoán đảo chiều`, source: 'SUPERNOVA' };
        }
        if (lastScore < avgScore - scoreStdDev * 2) {
            return { prediction: 'Tài', reason: `[SUPERNOVA] Điểm số gần đây (${lastScore}) quá thấp so với trung bình, dự đoán đảo chiều`, source: 'SUPERNOVA' };
        }
        const last6 = history.slice(-6).map(h => h.Ket_qua);
        if (last6.join(',') === 'Tài,Xỉu,Tài,Xỉu,Tài,Xỉu' || last6.join(',') === 'Xỉu,Tài,Xỉu,Tài,Xỉu,Tài') {
            const nextPred = last6[last6.length - 1] === 'Tài' ? 'Xỉu' : 'Tài';
            return { prediction: nextPred, reason: `[SUPERNOVA] Phát hiện cầu 1-1 dài hạn, dự đoán theo mẫu`, source: 'SUPERNOVA' };
        }
        return { prediction: 'Chờ đợi', reason: '[SUPERNOVA] Không phát hiện tín hiệu siêu chuẩn', source: 'SUPERNOVA' };
    }
    
    deepCycleAI(history) {
        const historyLength = history.length;
        if (historyLength < 50) return { prediction: 'Chờ đợi', reason: 'Không đủ dữ liệu cho DeepCycleAI' };
        const last50 = history.slice(-50).map(h => h.Ket_qua);
        const last15 = history.slice(-15).map(h => h.Ket_qua);
        const taiCounts = [];
        const xiuCounts = [];
        for (let i = 0; i < last50.length - 10; i++) {
            const subArray = last50.slice(i, i + 10);
            taiCounts.push(subArray.filter(r => r === 'Tài').length);
            xiuCounts.push(subArray.filter(r => r === 'Xỉu').length);
        }
        const avgTai = taiCounts.reduce((sum, count) => sum + count, 0) / taiCounts.length;
        const avgXiu = xiuCounts.reduce((sum, count) => sum + count, 0) / xiuCounts.length;
        const currentTaiCount = last15.filter(r => r === 'Tài').length;
        const currentXiuCount = last15.filter(r => r === 'Xỉu').length;
        if (currentTaiCount > avgTai + 3) {
            return { prediction: 'Xỉu', reason: '[DeepCycleAI] Chu kỳ Tài đang đạt đỉnh, dự đoán đảo chiều về Xỉu.' };
        }
        if (currentXiuCount > avgXiu + 3) {
            return { prediction: 'Tài', reason: '[DeepCycleAI] Chu kỳ Xỉu đang đạt đỉnh, dự đoán đảo chiều về Tài.' };
        }
        return { prediction: 'Chờ đợi', reason: '[DeepCycleAI] Không phát hiện chu kỳ rõ ràng.' };
    }

    aihtddLogic(history) {
        if (!history || history.length < 3) {
            return { prediction: 'Chờ đợi', reason: '[AI VANNHAT] Không đủ lịch sử để phân tích chuyên sâu', source: 'AI VANNHAT' };
        }
        const last5Results = history.slice(-5).map(item => item.Ket_qua);
        const last5Scores = history.slice(-5).map(item => item.Tong || 0);
        const taiCount = last5Results.filter(result => result === 'Tài').length;
        const xiuCount = last5Results.filter(result => result === 'Xỉu').length;
        if (history.length >= 3) {
            const last3Results = history.slice(-3).map(item => item.Ket_qua);
            if (last3Results.join(',') === 'Tài,Xỉu,Tài') {
                return { prediction: 'Xỉu', reason: '[AI VANNHAT] Phát hiện mẫu 1T1X → nên đánh Xỉu', source: 'AI VANNHAT' };
            } else if (last3Results.join(',') === 'Xỉu,Tài,Xỉu') {
                return { prediction: 'Tài', reason: '[AI VANNHAT] Phát hiện mẫu 1X1T → nên đánh Tài', source: 'AI VANNHAT' };
            }
        }
        if (history.length >= 4) {
            const last4Results = history.slice(-4).map(item => item.Ket_qua);
            if (last4Results.join(',') === 'Tài,Tài,Xỉu,Xỉu') {
                return { prediction: 'Tài', reason: '[AI VANNHAT] Phát hiện mẫu 2T2X → nên đánh Tài', source: 'AI VANNHAT' };
            } else if (last4Results.join(',') === 'Xỉu,Xỉu,Tài,Tài') {
                return { prediction: 'Xỉu', reason: '[AI VANNHAT] Phát hiện mẫu 2X2T → nên đánh Xỉu', source: 'AI VANNHAT' };
            }
        }
        if (history.length >= 9 && history.slice(-6).every(item => item.Ket_qua === 'Tài')) {
            return { prediction: 'Xỉu', reason: '[AI VANNHAT] Chuỗi Tài quá dài (6 lần) → dự đoán Xỉu', source: 'AI VANNHAT' };
        } else if (history.length >= 9 && history.slice(-6).every(item => item.Ket_qua === 'Xỉu')) {
            return { prediction: 'Tài', reason: '[AI VANNHAT] Chuỗi Xỉu quá dài (6 lần) → dự đoán Tài', source: 'AI VANNHAT' };
        }
        const avgScore = last5Scores.reduce((sum, score) => sum + score, 0) / (last5Scores.length || 1);
        if (avgScore > 10) {
            return { prediction: 'Tài', reason: `[AI VANNHAT] Điểm trung bình cao (${avgScore.toFixed(1)}) → dự đoán Tài`, source: 'AI VANNHAT' };
        } else if (avgScore < 8) {
            return { prediction: 'Xỉu', reason: `[AI VANNHAT] Điểm trung bình thấp (${avgScore.toFixed(1)}) → dự đoán Xỉu`, source: 'AI VANNHAT' };
        }
        if (taiCount > xiuCount + 1) {
            return { prediction: 'Xỉu', reason: `[AI VANNHAT] Tài chiếm đa số (${taiCount}/${last5Results.length}) → dự đoán Xỉu`, source: 'AI VANNHAT' };
        } else if (xiuCount > taiCount + 1) {
            return { prediction: 'Tài', reason: `[AI VANNHAT] Xỉu chiếm đa số (${xiuCount}/${last5Results.length}) → dự đoán Tài`, source: 'AI VANNHAT' };
        } else {
            const overallTai = history.filter(h => h.Ket_qua === 'Tài').length;
            const overallXiu = history.filter(h => h.Ket_qua === 'Xỉu').length;
            if (overallTai > overallXiu) {
                return { prediction: 'Xỉu', reason: '[Bẻ Cầu Thông Minh] Tổng thể Tài nhiều hơn → dự đoán Xỉu', source: 'AI VANNHAT' };
            } else {
                return { prediction: 'Tài', reason: '[Theo Cầu Thông Minh] Tổng thể Xỉu nhiều hơn hoặc bằng → dự đoán Tài', source: 'AI VANNHAT' };
            }
        }
    }

    smartBridgeBreak(history) {
        if (!history || history.length < 5) return { prediction: 'Chờ đợi', breakProb: 0.0, reason: 'Không đủ dữ liệu để theo/bẻ cầu' };
        const { streak, currentResult, breakProb } = this.detectStreakAndBreak(history);
        const last20 = history.slice(-20).map(h => h.Ket_qua);
        const lastScores = history.slice(-20).map(h => h.Tong || 0);
        let breakProbability = breakProb;
        let reason = '';
        const avgScore = lastScores.reduce((sum, score) => sum + score, 0) / (lastScores.length || 1);
        const scoreDeviation = lastScores.reduce((sum, score) => sum + Math.abs(score - avgScore), 0) / (lastScores.length || 1);
        const last5 = last20.slice(-5);
        const patternCounts = {};
        for (let i = 0; i <= last20.length - 2; i++) {
            const pattern = last20.slice(i, i + 2).join(',');
            patternCounts[pattern] = (patternCounts[pattern] || 0) + 1;
        }
        const mostCommonPattern = Object.entries(patternCounts).sort((a, b) => b[1] - a[1])[0];
        const isStablePattern = mostCommonPattern && mostCommonPattern[1] >= 3;
        if (streak >= 3 && scoreDeviation < 2.0 && !isStablePattern) {
            breakProbability = Math.max(breakProbability - 0.25, 0.1);
            reason = `[Theo Cầu Thông Minh] Chuỗi ${streak} ${currentResult} ổn định, tiếp tục theo cầu`;
        } else if (streak >= 6) {
            breakProbability = Math.min(breakProbability + 0.3, 0.95);
            reason = `[Bẻ Cầu Thông Minh] Chuỗi ${streak} ${currentResult} quá dài, khả năng bẻ cầu cao`;
        } else if (streak >= 3 && scoreDeviation > 3.5) {
            breakProbability = Math.min(breakProbability + 0.25, 0.9);
            reason = `[Bẻ Cầu Thông Minh] Biến động điểm số lớn (${scoreDeviation.toFixed(1)}), khả năng bẻ cầu tăng`;
        } else if (isStablePattern && last5.every(r => r === currentResult)) {
            breakProbability = Math.min(breakProbability + 0.2, 0.85);
            reason = `[Bẻ Cầu Thông Minh] Phát hiện mẫu lặp ${mostCommonPattern[0]}, có khả năng bẻ cầu`;
        } else {
            breakProbability = Math.max(breakProbability - 0.2, 0.1);
            reason = `[Theo Cầu Thông Minh] Không phát hiện mẫu bẻ mạnh, tiếp tục theo cầu`;
        }
        let prediction = breakProbability > 0.5 ? (currentResult === 'Tài' ? 'Xỉu' : 'Tài') : currentResult;
        return { prediction, breakProb: breakProbability, reason };
    }

    trendAndProb(history) {
        const { streak, currentResult, breakProb } = this.detectStreakAndBreak(history);
        if (streak >= 3) {
            if (breakProb > 0.6) return { prediction: currentResult === 'Tài' ? 'Xỉu' : 'Tài', reason: 'Dự đoán đảo chiều' };
            return { prediction: currentResult, reason: 'Dự đoán theo trend' };
        }
        const last15 = history.slice(-15).map(h => h.Ket_qua);
        if (!last15.length) return { prediction: 'Chờ đợi', reason: 'Không đủ dữ liệu' };
        const weights = last15.map((_, i) => Math.pow(1.3, i));
        const taiWeighted = weights.reduce((sum, w, i) => sum + (last15[i] === 'Tài' ? w : 0), 0);
        const xiuWeighted = weights.reduce((sum, w, i) => sum + (last15[i] === 'Xỉu' ? w : 0), 0);
        const totalWeight = taiWeighted + xiuWeighted;
        const last10 = last15.slice(-10);
        const patterns = [];
        if (last10.length >= 4) {
            for (let i = 0; i <= last10.length - 4; i++) {
                patterns.push(last10.slice(i, i + 4).join(','));
            }
        }
        const patternCounts = patterns.reduce((acc, p) => { acc[p] = (acc[p] || 0) + 1; return acc; }, {});
        const mostCommon = Object.entries(patternCounts).sort((a, b) => b[1] - a[1])[0];
        if (mostCommon && mostCommon[1] >= 3) {
            const pattern = mostCommon[0].split(',');
            const pred = pattern[pattern.length - 1] === last10[last10.length - 1] ? 'Tài' : 'Xỉu';
            return { prediction: pred, reason: 'Phát hiện mẫu lặp lại' };
        } else if (totalWeight > 0 && Math.abs(taiWeighted - xiuWeighted) / totalWeight >= 0.25) {
            const pred = taiWeighted > xiuWeighted ? 'Tài' : 'Xỉu';
            return { prediction: pred, reason: 'Dự đoán theo trọng số' };
        }
        const pred = last15[last15.length - 1] === 'Xỉu' ? 'Tài' : 'Xỉu';
        return { prediction: pred, reason: 'Dự đoán đảo chiều cơ bản' };
    }

    shortPattern(history) {
        const { streak, currentResult, breakProb } = this.detectStreakAndBreak(history);
        if (streak >= 2) {
            if (breakProb > 0.6) return { prediction: currentResult === 'Tài' ? 'Xỉu' : 'Tài', reason: 'Dự đoán đảo chiều' };
            return { prediction: currentResult, reason: 'Dự đoán theo trend' };
        }
        const last8 = history.slice(-8).map(h => h.Ket_qua);
        if (!last8.length) return { prediction: 'Chờ đợi', reason: 'Không đủ dữ liệu' };
        const patterns = [];
        if (last8.length >= 2) {
            for (let i = 0; i <= last8.length - 2; i++) {
                patterns.push(last8.slice(i, i + 2).join(','));
            }
        }
        const patternCounts = patterns.reduce((acc, p) => { acc[p] = (acc[p] || 0) + 1; return acc; }, {});
        const mostCommon = Object.entries(patternCounts).sort((a, b) => b[1] - a[1])[0];
        if (mostCommon && mostCommon[1] >= 2) {
            const pattern = mostCommon[0].split(',');
            const pred = pattern[pattern.length - 1] === last8[last8.length - 1] ? 'Tài' : 'Xỉu';
            return { prediction: pred, reason: 'Phát hiện mẫu lặp lại ngắn' };
        }
        const pred = last8[last8.length - 1] === 'Xỉu' ? 'Tài' : 'Xỉu';
        return { prediction: pred, reason: 'Dự đoán đảo chiều cơ bản' };
    }

    meanDeviation(history) {
        const { streak, currentResult, breakProb } = this.detectStreakAndBreak(history);
        if (streak >= 2) {
            if (breakProb > 0.6) return { prediction: currentResult === 'Tài' ? 'Xỉu' : 'Tài', reason: 'Dự đoán đảo chiều' };
            return { prediction: currentResult, reason: 'Dự đoán theo trend' };
        }
        const last12 = history.slice(-12).map(h => h.Ket_qua);
        if (!last12.length) return { prediction: 'Chờ đợi', reason: 'Không đủ dữ liệu' };
        const taiCount = last12.filter(r => r === 'Tài').length;
        const xiuCount = last12.length - taiCount;
        const deviation = Math.abs(taiCount - xiuCount) / last12.length;
        if (deviation < 0.2) {
            const pred = last12[last12.length - 1] === 'Xỉu' ? 'Tài' : 'Xỉu';
            return { prediction: pred, reason: 'Phân phối đều, dự đoán đảo chiều' };
        }
        const pred = xiuCount > taiCount ? 'Tài' : 'Xỉu';
        return { prediction: pred, reason: 'Lệch về một phía, dự đoán theo chiều ngược lại' };
    }

    recentSwitch(history) {
        const { streak, currentResult, breakProb } = this.detectStreakAndBreak(history);
        if (streak >= 2) {
            if (breakProb > 0.6) return { prediction: currentResult === 'Tài' ? 'Xỉu' : 'Tài', reason: 'Dự đoán đảo chiều' };
            return { prediction: currentResult, reason: 'Dự đoán theo trend' };
        }
        const last10 = history.slice(-10).map(h => h.Ket_qua);
        if (!last10.length) return { prediction: 'Chờ đợi', reason: 'Không đủ dữ liệu' };
        const switches = last10.slice(1).reduce((count, curr, idx) => count + (curr !== last10[idx] ? 1 : 0), 0);
        const pred = switches >= 4 ? (last10[last10.length - 1] === 'Xỉu' ? 'Tài' : 'Xỉu') : (last10[last10.length - 1] === 'Xỉu' ? 'Tài' : 'Xỉu');
        return { prediction: pred, reason: switches >= 4 ? 'Thị trường biến động, dự đoán đảo chiều' : 'Thị trường ổn định, dự đoán theo cầu' };
    }

    isBadPattern(history) {
        const last15 = history.slice(-15).map(h => h.Ket_qua);
        if (!last15.length) return false;
        const switches = last15.slice(1).reduce((count, curr, idx) => count + (curr !== last15[idx] ? 1 : 0), 0);
        const { streak } = this.detectStreakAndBreak(history);
        return switches >= 6 || streak >= 7;
    }

    aiVannhatLogic(history) {
        const recentHistory = history.slice(-5).map(h => h.Ket_qua);
        const recentScores = history.slice(-5).map(h => h.Tong || 0);
        const taiCount = recentHistory.filter(r => r === 'Tài').length;
        const xiuCount = recentHistory.filter(r => r === 'Xỉu').length;
        const { streak, currentResult } = this.detectStreakAndBreak(history);
        if (streak >= 2 && streak <= 4) {
            return { prediction: currentResult, reason: `[Theo Cầu Thông Minh] Chuỗi ngắn ${streak} ${currentResult}, tiếp tục theo cầu`, source: 'AI VANNHAT' };
        }
        if (history.length >= 3) {
            const last3 = history.slice(-3).map(h => h.Ket_qua);
            if (last3.join(',') === 'Tài,Xỉu,Tài') {
                return { prediction: 'Xỉu', reason: '[Bẻ Cầu Thông Minh] Phát hiện mẫu 1T1X → tiếp theo nên đánh Xỉu', source: 'AI VANNHAT' };
            } else if (last3.join(',') === 'Xỉu,Tài,Xỉu') {
                return { prediction: 'Tài', reason: '[Bẻ Cầu Thông Minh] Phát hiện mẫu 1X1T → tiếp theo nên đánh Tài', source: 'AI VANNHAT' };
            }
        }
        if (history.length >= 4) {
            const last4 = history.slice(-4).map(h => h.Ket_qua);
            if (last4.join(',') === 'Tài,Tài,Xỉu,Xỉu') {
                return { prediction: 'Tài', reason: '[Theo Cầu Thông Minh] Phát hiện mẫu 2T2X → tiếp theo nên đánh Tài', source: 'AI VANNHAT' };
            } else if (last4.join(',') === 'Xỉu,Xỉu,Tài,Tài') {
                return { prediction: 'Xỉu', reason: '[Theo Cầu Thông Minh] Phát hiện mẫu 2X2T → tiếp theo nên đánh Xỉu', source: 'AI VANNHAT' };
            }
        }
        if (history.length >= 7 && history.slice(-7).every(h => h.Ket_qua === 'Xỉu')) {
            return { prediction: 'Tài', reason: '[Bẻ Cầu Thông Minh] Chuỗi Xỉu quá dài (7 lần) → dự đoán Tài', source: 'AI VANNHAT' };
        } else if (history.length >= 7 && history.slice(-7).every(h => h.Ket_qua === 'Tài')) {
            return { prediction: 'Xỉu', reason: '[Bẻ Cầu Thông Minh] Chuỗi Tài quá dài (7 lần) → dự đoán Xỉu', source: 'AI VANNHAT' };
        }
        const avgScore = recentScores.reduce((sum, score) => sum + score, 0) / (recentScores.length || 1);
        if (avgScore > 11) {
            return { prediction: 'Tài', reason: `[Theo Cầu Thông Minh] Điểm trung bình cao (${avgScore.toFixed(1)}) → dự đoán Tài`, source: 'AI VANNHAT' };
        } else if (avgScore < 7) {
            return { prediction: 'Xỉu', reason: `[Theo Cầu Thông Minh] Điểm trung bình thấp (${avgScore.toFixed(1)}) → dự đoán Xỉu`, source: 'AI VANNHAT' };
        }
        if (taiCount > xiuCount + 1) {
            return { prediction: 'Xỉu', reason: `[Bẻ Cầu Thông Minh] Tài chiếm đa số (${taiCount}/${recentHistory.length}) → dự đoán Xỉu`, source: 'AI VANNHAT' };
        } else if (xiuCount > taiCount + 1) {
            return { prediction: 'Tài', reason: `[Bẻ Cầu Thông Minh] Xỉu chiếm đa số (${xiuCount}/${recentHistory.length}) → dự đoán Tài`, source: 'AI VANNHAT' };
        } else {
            const overallTai = history.filter(h => h.Ket_qua === 'Tài').length;
            const overallXiu = history.filter(h => h.Ket_qua === 'Xỉu').length;
            if (overallTai > overallXiu) {
                return { prediction: 'Xỉu', reason: '[Bẻ Cầu Thông Minh] Tổng thể Tài nhiều hơn → dự đoán Xỉu', source: 'AI VANNHAT' };
            } else {
                return { prediction: 'Tài', reason: '[Theo Cầu Thông Minh] Tổng thể Xỉu nhiều hơn hoặc bằng → dự đoán Tài', source: 'AI VANNHAT' };
            }
        }
    }

    buildResult(du_doan, do_tin_cay, giai_thich, pattern, status = "Thường") {
        return {
            du_doan: du_doan,
            do_tin_cay: parseFloat(do_tin_cay.toFixed(2)),
            giai_thich: giai_thich,
            pattern_nhan_dien: pattern,
            status_phan_tich: status
        };
    }

    predict() {
        const history = this.historyMgr.getHistory();
        const historyLength = history.length;
        
        if (historyLength < 10) {
            return this.buildResult("Chờ đợi", 10, 'Không đủ lịch sử để phân tích. Vui lòng chờ thêm.', 'Chưa đủ dữ liệu', 'Rủi ro cao');
        }

        if (historyLength < 500) {
            const { prediction, reason } = this.aiVannhatLogic(history);
            return this.buildResult(prediction, 45, reason, 'Phân tích cơ bản', 'Rủi ro cao');
        }

        this.trainModels();

        const trendPred = this.trendAndProb(history);
        const shortPred = this.shortPattern(history);
        const meanPred = this.meanDeviation(history);
        const switchPred = this.recentSwitch(history);
        const bridgePred = this.smartBridgeBreak(history);
        const aiVannhatPred = this.aiVannhatLogic(history);
        const deepCyclePred = this.deepCycleAI(history);
        const aiHtddPred = this.aihtddLogic(history);
        const supernovaPred = this.supernovaAI(history);
        const traderXPred = this.traderX(history);
        const phapsuPred = this.phapsuAI(history);
        const thanlucPred = this.thanlucAI(history);

        const currentIndex = history[history.length - 1].Phien;
        modelPredictions.trend[currentIndex] = trendPred.prediction;
        modelPredictions.short[currentIndex] = shortPred.prediction;
        modelPredictions.mean[currentIndex] = meanPred.prediction;
        modelPredictions.switch[currentIndex] = switchPred.prediction;
        modelPredictions.bridge[currentIndex] = bridgePred.prediction;
        modelPredictions.vannhat[currentIndex] = aiVannhatPred.prediction;
        modelPredictions.deepcycle[currentIndex] = deepCyclePred.prediction;
        modelPredictions.aihtdd[currentIndex] = aiHtddPred.prediction;
        modelPredictions.supernova[currentIndex] = supernovaPred.prediction;
        modelPredictions.trader_x[currentIndex] = traderXPred.prediction;
        modelPredictions.phapsu_ai[currentIndex] = phapsuPred.prediction;
        modelPredictions.thanluc_ai[currentIndex] = thanlucPred.prediction;

        const modelScores = {
            trend: this.evaluateModelPerformance(history, 'trend'),
            short: this.evaluateModelPerformance(history, 'short'),
            mean: this.evaluateModelPerformance(history, 'mean'),
            switch: this.evaluateModelPerformance(history, 'switch'),
            bridge: this.evaluateModelPerformance(history, 'bridge'),
            vannhat: this.evaluateModelPerformance(history, 'vannhat'),
            deepcycle: this.evaluateModelPerformance(history, 'deepcycle'),
            aihtdd: this.evaluateModelPerformance(history, 'aihtdd'),
            supernova: this.evaluateModelPerformance(history, 'supernova'),
            trader_x: this.evaluateModelPerformance(history, 'trader_x'),
            phapsu_ai: this.evaluateModelPerformance(history, 'phapsu_ai'),
            thanluc_ai: this.evaluateModelPerformance(history, 'thanluc_ai')
        };

        const baseWeights = {
            trend: 0.05,
            short: 0.05,
            mean: 0.05,
            switch: 0.05,
            bridge: 0.1,
            vannhat: 0.1,
            deepcycle: 0.1,
            aihtdd: 0.1,
            supernova: 0.2,
            trader_x: 0.2,
            phapsu_ai: 0.3,
            thanluc_ai: 0.5
        };

        let taiScore = 0;
        let xiuScore = 0;
        const allPredictions = [
            { pred: trendPred.prediction, weight: baseWeights.trend * modelScores.trend, model: 'trend' },
            { pred: shortPred.prediction, weight: baseWeights.short * modelScores.short, model: 'short' },
            { pred: meanPred.prediction, weight: baseWeights.mean * modelScores.mean, model: 'mean' },
            { pred: switchPred.prediction, weight: baseWeights.switch * modelScores.switch, model: 'switch' },
            { pred: bridgePred.prediction, weight: baseWeights.bridge * modelScores.bridge, model: 'bridge' },
            { pred: aiVannhatPred.prediction, weight: baseWeights.vannhat * modelScores.vannhat, model: 'vannhat' },
            { pred: deepCyclePred.prediction, weight: baseWeights.deepcycle * modelScores.deepcycle, model: 'deepcycle' },
            { pred: aiHtddPred.prediction, weight: baseWeights.aihtdd * modelScores.aihtdd, model: 'aihtdd' },
            { pred: supernovaPred.prediction, weight: baseWeights.supernova * modelScores.supernova, model: 'supernova' },
            { pred: traderXPred.prediction, weight: baseWeights.trader_x * modelScores.trader_x, model: 'trader_x' },
            { pred: phapsuPred.prediction, weight: baseWeights.phapsu_ai * modelScores.phapsu_ai, model: 'phapsu_ai' },
            { pred: thanlucPred.prediction, weight: baseWeights.thanluc_ai * modelScores.thanluc_ai, model: 'thanluc_ai' }
        ].filter(p => p.pred !== 'Chờ đợi');

        const taiConsensus = allPredictions.filter(p => p.pred === 'Tài').length;
        const xiuConsensus = allPredictions.filter(p => p.pred === 'Xỉu').length;

        allPredictions.forEach(p => {
            if (p.pred === 'Tài') taiScore += p.weight;
            else if (p.p
System: You are Grok 3 built by xAI.

The code you provided is incomplete, as it cuts off in the middle of the `predict` method of the `PredictionEngine` class. However, I understand your goal is to create an API that integrates with the external API (`https://apigame-wy0p.onrender.com/api/suưnin`) to fetch historical game session data, process it using the provided `HistoricalDataManager` and `PredictionEngine` classes, and return a prediction for the next session with the specified fields: `phien`, `xuc_xac`, `tong`, `ket_qua`, `phien_sau`, `du_doan`, `do_tin_cay`, `giai_thich`, and `tong_phien_du_doan`.

Since the code is incomplete and to avoid redundancy, I'll assume the remaining logic in the `predict` method follows the provided structure and completes the weighted prediction aggregation as shown in the earlier parts of the code. Below, I’ll provide a complete Node.js API implementation using Express.js that:
1. Fetches data from the external API.
2. Uses the provided `HistoricalDataManager` and `PredictionEngine` classes.
3. Returns the required response format.
4. Handles cases with insufficient historical data, as the algorithm is designed to provide predictions even with limited sessions.

### API Implementation

```javascript
const express = require('express');
const axios = require('axios');
const app = express();
const port = process.env.PORT || 3000;

// Middleware to parse JSON requests
app.use(express.json());

// HistoricalDataManager and PredictionEngine classes (as provided)
const modelPredictions = {
    trend: {},
    short: {},
    mean: {},
    switch: {},
    bridge: {},
    vannhat: {},
    deepcycle: {},
    aihtdd: {},
    supernova: {},
    trader_x: {},
    phapsu_ai: {},
    thanluc_ai: {}
};

class HistoricalDataManager {
    constructor(maxHistoryLength = 5000) {
        this.history = [];
        this.maxHistoryLength = maxHistoryLength;
    }

    addSession(newData) {
        if (!newData || !newData.Phien) return false;
        if (this.history.some(item => item.Phien === newData.Phien)) return false;
        this.history.push(newData);
        if (this.history.length > this.maxHistoryLength) {
            this.history = this.history.slice(this.history.length - this.maxHistoryLength);
        }
        this.history.sort((a, b) => a.Phien - b.Phien);
        return true;
    }

    getHistory() {
        return [...this.history];
    }
}

class PredictionEngine {
    constructor(historyMgr) {
        this.historyMgr = historyMgr;
        this.mlModel = null;
        this.deepLearningModel = null;
        this.divineModel = null;
        this.trainModels();
    }

    // [Include all methods as provided: trainModels, traderX, phapsuAI, thanlucAI, detectStreakAndBreak, evaluateModelPerformance, supernovaAI, deepCycleAI, aihtddLogic, smartBridgeBreak, trendAndProb, shortPattern, meanDeviation, recentSwitch, isBadPattern, aiVannhatLogic, buildResult]

    // Complete predict method (based on provided logic)
    predict() {
        const history = this.historyMgr.getHistory();
        const historyLength = history.length;

        if (historyLength < 10) {
            return this.buildResult("Chờ đợi", 10, 'Không đủ lịch sử để phân tích. Vui lòng chờ thêm.', 'Chưa đủ dữ liệu', 'Rủi ro cao');
        }

        if (historyLength < 500) {
            const { prediction, reason } = this.aiVannhatLogic(history);
            return this.buildResult(prediction, 45, reason, 'Phân tích cơ bản', 'Rủi ro cao');
        }

        this.trainModels();

        const trendPred = this.trendAndProb(history);
        const shortPred = this.shortPattern(history);
        const meanPred = this.meanDeviation(history);
        const switchPred = this.recentSwitch(history);
        const bridgePred = this.smartBridgeBreak(history);
        const aiVannhatPred = this.aiVannhatLogic(history);
        const deepCyclePred = this.deepCycleAI(history);
        const aiHtddPred = this.aihtddLogic(history);
        const supernovaPred = this.supernovaAI(history);
        const traderXPred = this.traderX(history);
        const phapsuPred = this.phapsuAI(history);
        const thanlucPred = this.thanlucAI(history);

        const currentIndex = history[history.length - 1].Phien;
        modelPredictions.trend[currentIndex] = trendPred.prediction;
        modelPredictions.short[currentIndex] = shortPred.prediction;
        modelPredictions.mean[currentIndex] = meanPred.prediction;
        modelPredictions.switch[currentIndex] = switchPred.prediction;
        modelPredictions.bridge[currentIndex] = bridgePred.prediction;
        modelPredictions.vannhat[currentIndex] = aiVannhatPred.prediction;
        modelPredictions.deepcycle[currentIndex] = deepCyclePred.prediction;
        modelPredictions.aihtdd[currentIndex] = aiHtddPred.prediction;
        modelPredictions.supernova[currentIndex] = supernovaPred.prediction;
        modelPredictions.trader_x[currentIndex] = traderXPred.prediction;
        modelPredictions.phapsu_ai[currentIndex] = phapsuPred.prediction;
        modelPredictions.thanluc_ai[currentIndex] = thanlucPred.prediction;

        const modelScores = {
            trend: this.evaluateModelPerformance(history, 'trend'),
            short: this.evaluateModelPerformance(history, 'short'),
            mean: this.evaluateModelPerformance(history, 'mean'),
            switch: this.evaluateModelPerformance(history, 'switch'),
            bridge: this.evaluateModelPerformance(history, 'bridge'),
            vannhat: this.evaluateModelPerformance(history, 'vannhat'),
            deepcycle: this.evaluateModelPerformance(history, 'deepcycle'),
            aihtdd: this.evaluateModelPerformance(history, 'aihtdd'),
            supernova: this.evaluateModelPerformance(history, 'supernova'),
            trader_x: this.evaluateModelPerformance(history, 'trader_x'),
            phapsu_ai: this.evaluateModelPerformance(history, 'phapsu_ai'),
            thanluc_ai: this.evaluateModelPerformance(history, 'thanluc_ai')
        };

        const baseWeights = {
            trend: 0.05,
            short: 0.05,
            mean: 0.05,
            switch: 0.05,
            bridge: 0.1,
            vannhat: 0.1,
            deepcycle: 0.1,
            aihtdd: 0.1,
            supernova: 0.2,
            trader_x: 0.2,
            phapsu_ai: 0.3,
            thanluc_ai: 0.5
        };

        let taiScore = 0;
        let xiuScore = 0;
        const allPredictions = [
            { pred: trendPred.prediction, weight: baseWeights.trend * modelScores.trend, model: 'trend' },
            { pred: shortPred.prediction, weight: baseWeights.short * modelScores.short, model: 'short' },
            { pred: meanPred.prediction, weight: baseWeights.mean * modelScores.mean, model: 'mean' },
            { pred: switchPred.prediction, weight: baseWeights.switch * modelScores.switch, model: 'switch' },
            { pred: bridgePred.prediction, weight: baseWeights.bridge * modelScores.bridge, model: 'bridge' },
            { pred: aiVannhatPred.prediction, weight: baseWeights.vannhat * modelScores.vannhat, model: 'vannhat' },
            { pred: deepCyclePred.prediction, weight: baseWeights.deepcycle * modelScores.deepcycle, model: 'deepcycle' },
            { pred: aiHtddPred.prediction, weight: baseWeights.aihtdd * modelScores.aihtdd, model: 'aihtdd' },
            { pred: supernovaPred.prediction, weight: baseWeights.supernova * modelScores.supernova, model: 'supernova' },
            { pred: traderXPred.prediction, weight: baseWeights.trader_x * modelScores.trader_x, model: 'trader_x' },
            { pred: phapsuPred.prediction, weight: baseWeights.phapsu_ai * modelScores.phapsu_ai, model: 'phapsu_ai' },
            { pred: thanlucPred.prediction, weight: baseWeights.thanluc_ai * modelScores.thanluc_ai, model: 'thanluc_ai' }
        ].filter(p => p.pred !== 'Chờ đợi');

        const taiConsensus = allPredictions.filter(p => p.pred === 'Tài').length;
        const xiuConsensus = allPredictions.filter(p => p.pred === 'Xỉu').length;

        allPredictions.forEach(p => {
            if (p.pred === 'Tài') taiScore += p.weight;
            else if (p.pred === 'Xỉu') xiuScore += p.weight;
        });

        if (taiConsensus >= 6) taiScore += 0.5;
        if (xiuConsensus >= 6) xiuScore += 0.5;

        const dominantModels = [traderXPred, supernovaPred, phapsuPred, thanlucPred].filter(p => p.prediction !== 'Chờ đợi');
        if (dominantModels.length >= 4 && dominantModels.every(p => p.prediction === dominantModels[0].prediction)) {
            if (dominantModels[0].prediction === 'Tài') taiScore *= 4;
            else xiuScore *= 4;
        } else if (dominantModels.length >= 3 && dominantModels.every(p => p.prediction === dominantModels[0].prediction)) {
            if (dominantModels[0].prediction === 'Tài') taiScore *= 3;
            else xiuScore *= 3;
        } else if (traderXPred.prediction !== 'Chờ đợi' && traderXPred.prediction === supernovaPred.prediction) {
            if (traderXPred.prediction === 'Tài') taiScore *= 2;
            else xiuScore *= 2;
        }

        if (this.isBadPattern(history)) {
            taiScore *= 0.5;
            xiuScore *= 0.5;
        }

        if (bridgePred.breakProb > 0.6) {
            if (bridgePred.prediction === 'Tài') taiScore += 0.3;
            else if (bridgePred.prediction === 'Xỉu') xiuScore += 0.3;
        }

        const totalScore = taiScore + xiuScore;
        let finalPrediction = "Chờ đợi";
        let finalScore = 0;
        let confidence = 0;
        let explanations = [];

        if (taiScore > xiuScore && taiScore / totalScore > 0.55) {
            finalPrediction = 'Tài';
            finalScore = taiScore;
        } else if (xiuScore > taiScore && xiuScore / totalScore > 0.55) {
            finalPrediction = 'Xỉu';
            finalScore = xiuScore;
        } else {
            explanations.push("Các thuật toán đang mâu thuẫn hoặc không có tín hiệu rõ ràng. Vui lòng chờ phiên sau.");
            return this.buildResult("Chờ đợi", 35, explanations.join(" | "), "Thị trường không ổn định", "Rủi ro trung bình");
        }

        confidence = (finalScore / totalScore) * 100;
        confidence = Math.min(99.99, Math.max(10, confidence));

        const predictionLog = {
            phien: currentIndex + 1,
            du_doan: finalPrediction,
            do_tin_cay: confidence,
            models: allPredictions.map(p => ({ model: p.model, pred: p.pred, weight: p.weight.toFixed(2) }))
        };
        console.log(`[LOG DỰ ĐOÁN] ${JSON.stringify(predictionLog)}`);

        explanations.push(thanlucPred.reason);
        explanations.push(phapsuPred.reason);
        explanations.push(traderXPred.reason);
        explanations.push(supernovaPred.reason);
        explanations.push(aiVannhatPred.reason);
        explanations.push(bridgePred.reason);
        if (deepCyclePred.prediction !== 'Chờ đợi') {
            explanations.push(deepCyclePred.reason);
        }

        const mostInfluentialModel = allPredictions.sort((a, b) => b.weight - a.weight)[0];
        if (mostInfluentialModel) {
            explanations.push(`Mô hình mạnh nhất: ${mostInfluentialModel.model} với trọng số ${mostInfluentialModel.weight.toFixed(2)}.`);
        }

        let status = "Cao";
        if (dominantModels.length >= 4 && dominantModels.every(p => p.prediction === dominantModels[0].prediction)) {
            status = "Thần Lực - Vô Hạn";
        } else if (dominantModels.length >= 3 && dominantModels.every(p => p.prediction === dominantModels[0].prediction)) {
            status = "Thần Lực - Tuyệt đối";
        } else if (confidence > 99) {
            status = "Auto Win - CỰC PHẨM";
        } else if (confidence > 95) {
            status = "Tuyệt Mật - Supernova";
        } else if (confidence > 90) {
            status = "Siêu VIP";
        } else if (confidence > 80) {
            status = "Tuyệt đối";
        }

        return this.buildResult(finalPrediction, confidence, explanations.join(" | "), "Tổng hợp", status);
    }
}

// Initialize HistoricalDataManager and PredictionEngine
const historyManager = new HistoricalDataManager();
const predictionEngine = new PredictionEngine(historyManager);

// API endpoint to get prediction
app.get('/api/predict', async (req, res) => {
    try {
        // Fetch historical data from external API
        const response = await axios.get('https://apigame-wy0p.onrender.com/api/suưnin');
        const sessions = response.data;

        // Validate and add sessions to history
        sessions.forEach(session => {
            const formattedSession = {
                Phien: session.phien,
                Xuc_xac: session.xuc_xac,
                Tong: session.tong,
                Ket_qua: session.ket_qua
            };
            historyManager.addSession(formattedSession);
        });

        // Get the latest session
        const history = historyManager.getHistory();
        const latestSession = history[history.length - 1];

        // Generate prediction
        const predictionResult = predictionEngine.predict();

        // Prepare response
        const responseData = {
            phien: latestSession.Phien,
            xuc_xac: latestSession.Xuc_xac,
            tong: latestSession.Tong,
            ket_qua: latestSession.Ket_qua,
            phien_sau: latestSession.Phien + 1,
            du_doan: predictionResult.du_doan,
            do_tin_cay: predictionResult.do_tin_cay,
            giai_thich: predictionResult.giai_thich,
            tong_phien_du_doan: history.length
        };

        res.json(responseData);
    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).json({ error: 'Failed to fetch data or generate prediction' });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
