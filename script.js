document.getElementById('fileInput').addEventListener('change', handleMetricsFileSelect, false);
document.getElementById('videoFileInput1').addEventListener('change', handleVideoFileSelect1, false);
document.getElementById('videoFileInput2').addEventListener('change', handleVideoFileSelect2, false);
document.getElementById('refreshButton').addEventListener('click', handleRefreshButtonClick);

let metricsData = null;
let videoFile1 = null;
let videoFile2 = null;
let chart = null;

async function handleMetricsFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = async function(event) {
        const textContent = event.target.result;
        metricsData = parseMetricsData(textContent);
        initializeVideoPlayers();
        createChart(metricsData);
    };

    reader.readAsText(file);
}

function handleVideoFileSelect1(event) {
    videoFile1 = event.target.files[0];
    initializeVideoPlayers();
}

function handleVideoFileSelect2(event) {
    videoFile2 = event.target.files[0];
    initializeVideoPlayers();
}

function handleRefreshButtonClick() {
    metricsData = null;
    videoFile1 = null;
    videoFile2 = null;
    document.getElementById('fileInput').value = '';
    document.getElementById('videoFileInput1').value = '';
    document.getElementById('videoFileInput2').value = '';
    document.getElementById('metricsDisplay').innerHTML = '';
    const videoPlayer1 = document.getElementById('videoPlayer1');
    const videoPlayer2 = document.getElementById('videoPlayer2');
    videoPlayer1.pause();
    videoPlayer2.pause();
    videoPlayer1.src = '';
    videoPlayer2.src = '';
    if (chart) {
        chart.destroy();
    }
}

function initializeVideoPlayers() {
    if (!metricsData || (!videoFile1 && !videoFile2)) return;

    if (videoFile1) {
        const videoPlayer1 = document.getElementById('videoPlayer1');
        videoPlayer1.src = URL.createObjectURL(videoFile1);

        videoPlayer1.addEventListener('timeupdate', function() {
            const currentTime = Math.floor(videoPlayer1.currentTime);
            updateMetricsDisplay(metricsData, currentTime);
        });
    }

    if (videoFile2) {
        const videoPlayer2 = document.getElementById('videoPlayer2');
        videoPlayer2.src = URL.createObjectURL(videoFile2);

        videoPlayer2.addEventListener('timeupdate', function() {
            const currentTime = Math.floor(videoPlayer2.currentTime);
            updateMetricsDisplay(metricsData, currentTime);
        });
    }
}

function parseMetricsData(textContent) {
    const lines = textContent.split('\n');
    const metrics = [];
    let currentMetrics = null;

    for (const line of lines) {
        if (line.includes('[RTDM][Timestamps]')) {
            const matches = line.match(/\[(\d+\.\d+)sec - (\d+\.\d+)sec\]/);
            if (matches) {
                const startSec = parseFloat(matches[1]);
                const endSec = parseFloat(matches[2]);
                currentMetrics = { startSec, endSec, metrics: [] };
                metrics.push(currentMetrics);
            }
        } else if (currentMetrics) {
            if (line.includes('Smoothness Score') ||
                line.includes('SRC Score') ||
                line.includes('Background_Noise Score') ||
                line.includes('Isochrony Score') ||
                line.includes('RT_Metric Score')) {
                currentMetrics.metrics.push(line.trim());
            }
        }
    }
    return metrics;
}

function updateMetricsDisplay(metrics, currentTime) {
    const metricsDisplay = document.getElementById('metricsDisplay');
    metricsDisplay.innerHTML = '';

    const timestamp = findTimestamp(metrics, currentTime);
    if (timestamp) {
        const div = document.createElement('div');
        div.classList.add('timestamp-data');
        div.innerHTML = `<h3>Timestamp: ${timestamp.startSec} sec - ${timestamp.endSec} sec</h3>`;

        if (timestamp.metrics.length > 0) {
            const ul = document.createElement('ul');
            timestamp.metrics.forEach(metric => {
                const li = document.createElement('li');
                li.textContent = metric;
                ul.appendChild(li);
            });
            div.appendChild(ul);
        }

        metricsDisplay.appendChild(div);
    }
}

function findTimestamp(metrics, currentTime) {
    for (const metric of metrics) {
        if (currentTime >= metric.startSec && currentTime <= metric.endSec) {
            return metric;
        }
    }
    return null;
}

function createChart(metricsData) {
    const ctx = document.getElementById('metricsChart').getContext('2d');
    const labels = metricsData.map(m => `${m.startSec}-${m.endSec} sec`);
    const smoothnessScores = metricsData.map(m => extractMetricValue(m.metrics, 'Smoothness Score'));
    const srcScores = metricsData.map(m => extractMetricValue(m.metrics, 'SRC Score'));
    const backgroundNoiseScores = metricsData.map(m => extractMetricValue(m.metrics
