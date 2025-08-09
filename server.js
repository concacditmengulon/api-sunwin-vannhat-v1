// Import các thư viện cần thiết
const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

// ==================== START: VANNHAT ALGORITHM CODE ====================

// Biến lưu trữ dự đoán của các mô hình để đánh giá hiệu suất
let modelPredictions = {};

/**
 * Phát hiện chuỗi cầu (streak) và tính toán xác suất bẻ cầu.
 * @param {Array<Object>} history - Mảng lịch sử các phiên chơi.
 * @returns {Object} - streak, currentResult, breakProb.
 */
function detectStreakAndBreak(history) {
    if (!history || history.length === 0) {
        return { streak: 0, currentResult: null, breakProb: 0 };
    }

    let streak = 1;
    const currentResult = history[history.length - 1].result;

    for (let i = history.length - 2; i >= 0; i--) {
        if (history[i].result === currentResult) streak++;
        else break;
    }

    const last20Results = history.slice(-20).map(item => item.result);
    if (!last20Results.length) {
        return { streak, currentResult, breakProb: 0 };
    }

    const switches = last20Results.slice(1).reduce((count, result, index) => {
        return count + (result !== last20Results[index] ? 1 : 0);
    }, 0);

    const taiCount = last20Results.filter(result => result === 'Tài').length;
    const xiuCount = last20Results.filter(result => result === 'Xỉu').length;
    const imbalance = Math.abs(taiCount - xiuCount) / last20Results.length;

    let breakProb = 0;

    if (streak >= 8) {
        breakProb = Math.min(0.7 + switches / 20 + imbalance * 0.2, 0.95);
    } else if (streak >= 5) {
        breakProb = Math.min(0.45 + switches / 15 + imbalance * 0.3, 0.9);
    } else if (streak >= 3 && switches >= 8) {
        breakProb = 0.4;
    }

    return { streak, currentResult, breakProb };
}

/**
 * Đánh giá hiệu suất của một mô hình dự đoán.
 * @param {Array<Object>} history - Mảng lịch sử.
 * @param {string} modelName - Tên của mô hình.
 * @param {number} lookback - Số phiên để đánh giá.
 * @returns {number} - Tỷ lệ hiệu suất.
 */
function evaluateModelPerformance(history, modelName, lookback = 15) {
    if (!modelPredictions[modelName] || history.length < 2) return 1;

    lookback = Math.min(lookback, history.length - 1);
    let correctPredictions = 0;

    for (let i = 0; i < lookback; i++) {
        const sessionId = history[history.length - (i + 2)].session;
        const prediction = modelPredictions[modelName][sessionId] || 0;
        const actualResult = history[history.length - (i + 1)].result;

        if ((prediction === 1 && actualResult === 'Tài') ||
            (prediction === 2 && actualResult === 'Xỉu')) {
            correctPredictions++;
        }
    }

    const performanceRatio = lookback > 0 ?
        1 + (correctPredictions - lookback / 2) / (lookback / 2) : 1;

    return Math.max(0.6, Math.min(1.4, performanceRatio));
}

/**
 * Thuật toán bẻ cầu thông minh dựa trên streak, điểm số và mẫu lặp.
 * @param {Array<Object>} history - Mảng lịch sử các phiên chơi.
 * @returns {Object} - prediction, breakProb, reason.
 */
function smartBridgeBreak(history) {
    if (!history || history.length < 5) {
        return { prediction: 0, breakProb: 0, reason: 'Không đủ dữ liệu để bẻ cầu' };
    }

    const { streak, currentResult, breakProb } = detectStreakAndBreak(history);
    const last25Results = history.slice(-25).map(item => item.result);
    const last25Scores = history.slice(-25).map(item => item.total || 0);

    let finalBreakProb = breakProb;
    let reason = '';

    const avgScore = last25Scores.reduce((sum, score) => sum + score, 0) / (last25Scores.length || 1);
    const scoreDeviation = last25Scores.reduce((sum, score) => sum + Math.abs(score - avgScore), 0) / (last25Scores.length || 1);

    const last5Results = last25Results.slice(-5);
    const patternCounts = {};

    for (let i = 0; i <= last25Results.length - 4; i++) {
        const pattern = last25Results.slice(i, i + 4).join(',');
        patternCounts[pattern] = (patternCounts[pattern] || 0) + 1;
    }

    const mostCommonPattern = Object.entries(patternCounts).sort((a, b) => b[1] - a[1])[0];
    const hasRepeatingPattern = mostCommonPattern && mostCommonPattern[1] >= 4;

    if (streak >= 7) {
        finalBreakProb = Math.min(finalBreakProb + 0.2, 0.95);
        reason = `[Bẻ Cầu] Chuỗi ${streak} ${currentResult} quá dài, khả năng bẻ cầu rất cao`;
    } else if (streak >= 5 && scoreDeviation > 3.5) {
        finalBreakProb = Math.min(finalBreakProb + 0.15, 0.9);
        reason = `[Bẻ Cầu] Biến động điểm số lớn (${scoreDeviation.toFixed(1)}), khả năng bẻ cầu tăng`;
    } else if (hasRepeatingPattern && last5Results.every(result => result === currentResult)) {
        finalBreakProb = Math.min(finalBreakProb + 0.1, 0.85);
        reason = `[Bẻ Cầu] Phát hiện mẫu lặp ${mostCommonPattern[0]}, khả năng bẻ cầu cao`;
    } else {
        finalBreakProb = Math.max(finalBreakProb - 0.2, 0.1);
        reason = '[Theo Cầu] Không phát hiện mẫu bẻ cầu mạnh, tiếp tục theo cầu';
    }

    let prediction = finalBreakProb > 0.7 ?
        (currentResult === 'Tài' ? 2 : 1) :
        (currentResult === 'Tài' ? 1 : 2);

    return { prediction, breakProb: finalBreakProb, reason };
}

/**
 * Mô hình dự đoán dựa trên xu hướng và xác suất.
 * @param {Array<Object>} history - Mảng lịch sử.
 * @returns {number} - 1 (Tài) hoặc 2 (Xỉu).
 */
function trendAndProb(history) {
    if (!history || history.length < 5) return 0;

    const { streak, currentResult, breakProb } = detectStreakAndBreak(history);

    if (streak >= 6) {
        if (breakProb > 0.8) return currentResult === 'Tài' ? 2 : 1;
        return currentResult === 'Tài' ? 1 : 2;
    }

    const last20Results = history.slice(-20).map(item => item.result);
    if (!last20Results.length) return 0;

    const weightedResults = last20Results.map((result, index) => Math.pow(1.25, index));
    const taiWeight = weightedResults.reduce((sum, weight, i) => sum + (last20Results[i] === 'Tài' ? weight : 0), 0);
    const xiuWeight = weightedResults.reduce((sum, weight, i) => sum + (last20Results[i] === 'Xỉu' ? weight : 0), 0);
    const totalWeight = taiWeight + xiuWeight;

    const last12Results = last20Results.slice(-12);
    const patterns = [];

    if (last12Results.length >= 5) {
        for (let i = 0; i <= last12Results.length - 5; i++) {
            patterns.push(last12Results.slice(i, i + 5).join(','));
        }
    }

    const patternCounts = patterns.reduce((counts, pattern) => {
        counts[pattern] = (counts[pattern] || 0) + 1;
        return counts;
    }, {});

    const mostCommonPattern = Object.entries(patternCounts).sort((a, b) => b[1] - a[1])[0];

    if (mostCommonPattern && mostCommonPattern[1] >= 3) {
        const patternParts = mostCommonPattern[0].split(',');
        return patternParts[patternParts.length - 1] !== last12Results[last12Results.length - 1] ? 1 : 2;
    }

    if (totalWeight > 0 && Math.abs(taiWeight - xiuWeight) / totalWeight >= 0.3) {
        return taiWeight > xiuWeight ? 2 : 1;
    }

    return last20Results[last20Results.length - 1] === 'Xỉu' ? 1 : 2;
}

/**
 * Mô hình dự đoán dựa trên các mẫu ngắn hạn.
 * @param {Array<Object>} history - Mảng lịch sử.
 * @returns {number} - 1 (Tài) hoặc 2 (Xỉu).
 */
function shortPattern(history) {
    if (!history || history.length < 5) return 0;

    const { streak, currentResult, breakProb } = detectStreakAndBreak(history);

    if (streak >= 5) {
        if (breakProb > 0.8) return currentResult === 'Tài' ? 2 : 1;
        return currentResult === 'Tài' ? 1 : 2;
    }

    const last10Results = history.slice(-10).map(item => item.result);
    if (!last10Results.length) return 0;

    const patterns = [];

    if (last10Results.length >= 4) {
        for (let i = 0; i <= last10Results.length - 4; i++) {
            patterns.push(last10Results.slice(i, i + 4).join(','));
        }
    }

    const patternCounts = patterns.reduce((counts, pattern) => {
        counts[pattern] = (counts[pattern] || 0) + 1;
        return counts;
    }, {});

    const mostCommonPattern = Object.entries(patternCounts).sort((a, b) => b[1] - a[1])[0];

    if (mostCommonPattern && mostCommonPattern[1] >= 3) {
        const patternParts = mostCommonPattern[0].split(',');
        return patternParts[patternParts.length - 1] !== last10Results[last10Results.length - 1] ? 1 : 2;
    }

    return last10Results[last10Results.length - 1] === 'Xỉu' ? 1 : 2;
}

/**
 * Mô hình dự đoán dựa trên độ lệch trung bình của điểm số.
 * @param {Array<Object>} history - Mảng lịch sử.
 * @returns {number} - 1 (Tài) hoặc 2 (Xỉu).
 */
function meanDeviation(history) {
    if (!history || history.length < 5) return 0;

    const { streak, currentResult, breakProb } = detectStreakAndBreak(history);

    if (streak >= 5) {
        if (breakProb > 0.8) return currentResult === 'Tài' ? 2 : 1;
        return currentResult === 'Tài' ? 1 : 2;
    }

    const last15Results = history.slice(-15).map(item => item.result);
    const last15Scores = history.slice(-15).map(item => item.total || 0);
    if (!last15Results.length) return 0;

    const taiCount = last15Results.filter(result => result === 'Tài').length;
    const xiuCount = last15Results.length - taiCount;
    const imbalance = Math.abs(taiCount - xiuCount) / last15Results.length;

    const avgScore = last15Scores.reduce((sum, score) => sum + score, 0) / (last15Scores.length || 1);
    const scoreDeviation = last15Scores.reduce((sum, score) => sum + Math.abs(score - avgScore), 0) / (last15Scores.length || 1);

    if (imbalance < 0.3 && scoreDeviation < 3) {
        return last15Results[last15Results.length - 1] === 'Xỉu' ? 1 : 2;
    }

    return xiuCount > taiCount || avgScore < 10 ? 1 : 2;
}

/**
 * Mô hình dự đoán dựa trên số lần chuyển đổi gần đây.
 * @param {Array<Object>} history - Mảng lịch sử.
 * @returns {number} - 1 (Tài) hoặc 2 (Xỉu).
 */
function recentSwitch(history) {
    if (!history || history.length < 5) return 0;

    const { streak, currentResult, breakProb } = detectStreakAndBreak(history);

    if (streak >= 5) {
        if (breakProb > 0.8) return currentResult === 'Tài' ? 2 : 1;
        return currentResult === 'Tài' ? 1 : 2;
    }

    const last12Results = history.slice(-12).map(item => item.result);
    if (!last12Results.length) return 0;

    const switches = last12Results.slice(1).reduce((count, result, index) => {
        return count + (result !== last12Results[index] ? 1 : 0);
    }, 0);

    return switches >= 7 ?
        (last12Results[last12Results.length - 1] === 'Xỉu' ? 1 : 2) :
        (last12Results[last12Results.length - 1] === 'Xỉu' ? 1 : 2);
}

/**
 * Kiểm tra xem lịch sử có đang theo một "cầu xấu" hay không.
 * @param {Array<Object>} history - Mảng lịch sử.
 * @returns {boolean} - true nếu là cầu xấu.
 */
function isBadPattern(history) {
    if (!history || history.length < 5) return false;

    const last20Results = history.slice(-20).map(item => item.result);
    if (!last20Results.length) return false;

    const switches = last20Results.slice(1).reduce((count, result, index) => {
        return count + (result !== last20Results[index] ? 1 : 0);
    }, 0);

    const { streak } = detectStreakAndBreak(history);
    return switches >= 12 || streak >= 9;
}

/**
 * Thuật toán AI VANNHAT cốt lõi.
 * @param {Array<Object>} history - Mảng lịch sử.
 * @returns {Object} - prediction, reason, source.
 */
function aiVannhatLogic(history) {
    if (!history || history.length < 5) {
        return {
            prediction: history[history.length - 1]?.result === 'Tài' ? 'Xỉu' : 'Tài',
            reason: 'Không đủ lịch sử, dự đoán dựa trên phiên cuối',
            source: 'AI VANNHAT'
        };
    }

    const last7Results = history.slice(-7).map(item => item.result);
    const last7Scores = history.slice(-7).map(item => item.total || 0);
    const taiCount = last7Results.filter(result => result === 'Tài').length;
    const xiuCount = last7Results.filter(result => result === 'Xỉu').length;

    // Phát hiện mẫu nâng cao
    const patterns = [];
    for (let i = 0; i <= last7Results.length - 4; i++) {
        patterns.push(last7Results.slice(i, i + 4).join(','));
    }
    const patternCounts = patterns.reduce((counts, pattern) => {
        counts[pattern] = (counts[pattern] || 0) + 1;
        return counts;
    }, {});
    const mostCommonPattern = Object.entries(patternCounts).sort((a, b) => b[1] - a[1])[0];

    // Các quy tắc mẫu cụ thể
    if (history.length >= 5) {
        const last5Results = history.slice(-5).map(item => item.result);
        if (last5Results.join(',') === 'Tài,Xỉu,Tài,Xỉu,Tài') {
            return { prediction: 'Xỉu', reason: 'Phát hiện mẫu 1T1X lặp lại → dự đoán Xỉu', source: 'AI VANNHAT' };
        } else if (last5Results.join(',') === 'Xỉu,Tài,Xỉu,Tài,Xỉu') {
            return { prediction: 'Tài', reason: 'Phát hiện mẫu 1X1T lặp lại → dự đoán Tài', source: 'AI VANNHAT' };
        }
    }

    if (history.length >= 6) {
        const last6Results = history.slice(-6).map(item => item.result);
        if (last6Results.join(',') === 'Tài,Tài,Xỉu,Xỉu,Tài,Tài') {
            return { prediction: 'Xỉu', reason: 'Phát hiện mẫu 2T2X2T → dự đoán Xỉu', source: 'AI VANNHAT' };
        } else if (last6Results.join(',') === 'Xỉu,Xỉu,Tài,Tài,Xỉu,Xỉu') {
            return { prediction: 'Tài', reason: 'Phát hiện mẫu 2X2T2X → dự đoán Tài', source: 'AI VANNHAT' };
        }
    }

    // Phát hiện chuỗi dài
    if (history.length >= 10 && history.slice(-7).every(item => item.result === 'Tài')) {
        return { prediction: 'Xỉu', reason: 'Chuỗi Tài quá dài (7 lần) → dự đoán Xỉu', source: 'AI VANNHAT' };
    } else if (history.length >= 10 && history.slice(-7).every(item => item.result === 'Xỉu')) {
        return { prediction: 'Tài', reason: 'Chuỗi Xỉu quá dài (7 lần) → dự đoán Tài', source: 'AI VANNHAT' };
    }

    // Phân tích dựa trên điểm số
    const avgScore = last7Scores.reduce((sum, score) => sum + score, 0) / (last7Scores.length || 1);
    const scoreDeviation = last7Scores.reduce((sum, score) => sum + Math.abs(score - avgScore), 0) / (last7Scores.length || 1);

    if (avgScore > 11 && scoreDeviation < 2.5) {
        return { prediction: 'Tài', reason: `Điểm trung bình cao (${avgScore.toFixed(1)}) với độ lệch thấp → dự đoán Tài`, source: 'AI VANNHAT' };
    } else if (avgScore < 7 && scoreDeviation < 2.5) {
        return { prediction: 'Xỉu', reason: `Điểm trung bình thấp (${avgScore.toFixed(1)}) với độ lệch thấp → dự đoán Xỉu`, source: 'AI VANNHAT' };
    }

    // Dự đoán dựa trên sự mất cân bằng
    if (taiCount > xiuCount + 2) {
        return { prediction: 'Xỉu', reason: `Tài chiếm ưu thế (${taiCount}/${last7Results.length}) → dự đoán Xỉu`, source: 'AI VANNHAT' };
    } else if (xiuCount > taiCount + 2) {
        return { prediction: 'Tài', reason: `Xỉu chiếm ưu thế (${xiuCount}/${last7Results.length}) → dự đoán Tài`, source: 'AI VANNHAT' };
    }

    // Dự đoán dựa trên mẫu lặp
    if (mostCommonPattern && mostCommonPattern[1] >= 2) {
        const patternParts = mostCommonPattern[0].split(',');
        const nextPred = patternParts[patternParts.length - 1] === 'Tài' ? 'Xỉu' : 'Tài';
        return { prediction: nextPred, reason: `Dựa trên mẫu lặp ${mostCommonPattern[0]} → dự đoán ${nextPred}`, source: 'AI VANNHAT' };
    }

    // Mặc định: theo xu hướng gần nhất và đảo chiều
    const last3Results = history.slice(-3).map(item => item.result);
    const last3TaiCount = last3Results.filter(result => result === 'Tài').length;
    return {
        prediction: last3TaiCount >= 2 ? 'Xỉu' : 'Tài',
        reason: 'Dựa trên xu hướng gần nhất (3 phiên), dự đoán đảo chiều',
        source: 'AI VANNHAT'
    };
}

/**
 * Tổng hợp dự đoán từ tất cả các mô hình con.
 * @param {Array<Object>} history - Mảng lịch sử.
 * @param {Object} predictions - Dự đoán của các mô hình trong các phiên trước.
 * @returns {Object} - prediction, confidence, reason, scores.
 */
function generatePrediction(history, predictions) {
    modelPredictions = predictions || {};

    if (!history || history.length === 0) {
        return { prediction: 'Tài', confidence: 50, reason: 'Không đủ lịch sử, mặc định Tài', scores: { taiScore: 0.5, xiuScore: 0.5 } };
    }

    if (!modelPredictions.trend) {
        modelPredictions = {
            trend: {},
            short: {},
            mean: {},
            switch: {},
            bridge: {}
        };
    }

    const currentSession = history[history.length - 1].session;

    // Chạy từng mô hình con
    const trendPred = history.length < 5 ?
        (history[history.length - 1].result === 'Tài' ? 2 : 1) :
        trendAndProb(history);

    const shortPred = history.length < 5 ?
        (history[history.length - 1].result === 'Tài' ? 2 : 1) :
        shortPattern(history);

    const meanPred = history.length < 5 ?
        (history[history.length - 1].result === 'Tài' ? 2 : 1) :
        meanDeviation(history);

    const switchPred = history.length < 5 ?
        (history[history.length - 1].result === 'Tài' ? 2 : 1) :
        recentSwitch(history);

    const bridgePred = history.length < 5 ?
        { prediction: history[history.length - 1].result === 'Tài' ? 2 : 1, breakProb: 0, reason: 'Lịch sử ngắn' } :
        smartBridgeBreak(history);

    const aiPred = aiVannhatLogic(history);

    // Lưu lại dự đoán của các mô hình để đánh giá sau
    modelPredictions.trend[currentSession] = trendPred;
    modelPredictions.short[currentSession] = shortPred;
    modelPredictions.mean[currentSession] = meanPred;
    modelPredictions.switch[currentSession] = switchPred;
    modelPredictions.bridge[currentSession] = bridgePred.prediction;

    // Đánh giá hiệu suất của các mô hình và gán trọng số
    const modelPerformance = {
        trend: evaluateModelPerformance(history, 'trend'),
        short: evaluateModelPerformance(history, 'short'),
        mean: evaluateModelPerformance(history, 'mean'),
        switch: evaluateModelPerformance(history, 'switch'),
        bridge: evaluateModelPerformance(history, 'bridge')
    };

    const modelWeights = {
        trend: 0.2 * modelPerformance.trend,
        short: 0.2 * modelPerformance.short,
        mean: 0.25 * modelPerformance.mean,
        switch: 0.15 * modelPerformance.switch,
        bridge: 0.2 * modelPerformance.bridge,
        aiVannhat: 0.25
    };

    let taiScore = 0;
    let xiuScore = 0;

    // Tổng hợp điểm số từ các mô hình
    if (trendPred === 1) taiScore += modelWeights.trend;
    else if (trendPred === 2) xiuScore += modelWeights.trend;

    if (shortPred === 1) taiScore += modelWeights.short;
    else if (shortPred === 2) xiuScore += modelWeights.short;

    if (meanPred === 1) taiScore += modelWeights.mean;
    else if (meanPred === 2) xiuScore += modelWeights.mean;

    if (switchPred === 1) taiScore += modelWeights.switch;
    else if (switchPred === 2) xiuScore += modelWeights.switch;

    if (bridgePred.prediction === 1) taiScore += modelWeights.bridge;
    else if (bridgePred.prediction === 2) xiuScore += modelWeights.bridge;

    if (aiPred.prediction === 'Tài') taiScore += modelWeights.aiVannhat;
    else xiuScore += modelWeights.aiVannhat;

    // Điều chỉnh điểm số dựa trên các mẫu "cầu xấu"
    if (isBadPattern(history)) {
        taiScore *= 0.7;
        xiuScore *= 0.7;
    }

    // Điều chỉnh điểm số dựa trên sự mất cân bằng gần đây
    const last15Results = history.slice(-15).map(item => item.result);
    const last15TaiCount = last15Results.filter(result => result === 'Tài').length;

    if (last15TaiCount >= 10) {
        xiuScore += 0.2;
    } else if (last15TaiCount <= 5) {
        taiScore += 0.2;
    }

    // Điều chỉnh điểm số dựa trên xác suất bẻ cầu cao
    if (bridgePred.breakProb > 0.7) {
        if (bridgePred.prediction === 1) taiScore += 0.25;
        else xiuScore += 0.25;
    }

    // Quyết định dự đoán cuối cùng
    const finalPrediction = taiScore > xiuScore ? 'Tài' : 'Xỉu';
    const confidence = Math.min((Math.max(taiScore, xiuScore) / (taiScore + xiuScore)) * 100, 95);
    const reason = `${aiPred.reason} | ${bridgePred.reason}`;

    return { prediction: finalPrediction, confidence, reason, scores: { taiScore, xiuScore } };
}

// ==================== END: VANNHAT ALGORITHM CODE ====================

/**
 * Hàm fetchWithRetry để tự động thử lại khi gặp lỗi mạng.
 * @param {string} url - URL của API gốc.
 * @param {number} retries - Số lần thử lại tối đa.
 * @param {number} delay - Thời gian chờ giữa các lần thử (ms).
 * @returns {Promise<Object>} - Phản hồi từ API.
 */
async function fetchWithRetry(url, retries = 3, delay = 2000) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await axios.get(url);
            return response;
        } catch (error) {
            console.error(`Lỗi khi lấy dữ liệu từ API gốc (lần ${i + 1}/${retries}):`, error.message);
            if (i < retries - 1) {
                await new Promise(res => setTimeout(res, delay));
            } else {
                throw error; // Ném lỗi sau khi hết số lần thử
            }
        }
    }
}

// API Endpoint chính
app.get('/api/sunwin', async (req, res) => {
    try {
        // Gọi API gốc với cơ chế thử lại
        const response = await fetchWithRetry('https://binhtool90-sunpredict.onrender.com/api/taixiu/history');
        const historyData = response.data.history;

        // Kiểm tra dữ liệu trả về
        if (!historyData || historyData.length === 0) {
            return res.status(500).json({
                status: "error",
                message: "Dữ liệu lịch sử rỗng hoặc không hợp lệ từ API gốc."
            });
        }

        // Sắp xếp dữ liệu theo session
        historyData.sort((a, b) => parseInt(a.session) - parseInt(b.session));

        // Tạo dự đoán
        const lastSession = historyData[historyData.length - 1];
        const predictionResult = generatePrediction(historyData);
        const nextSession = parseInt(lastSession.session) + 1;

        // Định dạng phản hồi
        const apiResponse = {
            phien_truoc: lastSession.session,
            xuc_xac: lastSession.dice,
            tong: lastSession.total,
            ket_qua: lastSession.result,
            phien_sau: nextSession,
            du_doan: `VANNHAT AI VIP PREDICTION: ${predictionResult.prediction}`,
            do_tin_cay: `Độ tin cậy: ${predictionResult.confidence.toFixed(2)}%`,
            giai_thich: predictionResult.reason,
            tong_phien_du_doan: nextSession
        };

        res.json({
            status: "success",
            message: "Dự đoán phiên tiếp theo thành công.",
            data: apiResponse
        });

    } catch (error) {
        console.error('Lỗi nghiêm trọng khi xử lý API:', error.message);
        res.status(503).json({
            status: "error",
            message: "Có lỗi xảy ra khi lấy dữ liệu từ nguồn gốc sau nhiều lần thử. Vui lòng thử lại sau.",
            data: null
        });
    }
});

// Chạy server
app.listen(PORT, () => {
    console.log(`Server đang chạy tại http://localhost:${PORT}`);
});
