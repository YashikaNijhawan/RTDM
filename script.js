document.getElementById('fileInput').addEventListener('change', handleMetricsFileSelect, false);
document.getElementById('videoFileInput').addEventListener('change', handleVideoFileSelect, false);
document.getElementById('refreshButton').addEventListener('click', handleRefreshButtonClick);

let metricsData = null;
let videoFile = null;
let chart = null;

async function handleMetricsFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = async function(event) {
        const textContent = event.target.result;
        metricsData = parseMetricsData(textContent);
        initializeVideoPlayer();
        createChart(metricsData);
    };

    reader.readAsText(file);
}

function handleVideoFileSelect(event) {
    videoFile = event.target.files[0];
    initializeVideoPlayer();
}

function handleRefreshButtonClick() {
    metricsData = null;
    videoFile = null;
    translations = null;
    document.getElementById('fileInput').value = '';
    document.getElementById('videoFileInput').value = '';
    document.getElementById('metricsDisplay').innerHTML = '';
    document.getElementById('translationsDisplay').innerHTML = '';
    const videoPlayer = document.getElementById('videoPlayer');
    videoPlayer.pause();
    videoPlayer.src = '';
    if (chart) {
        chart.destroy();
    }
}

function initializeVideoPlayer() {
    if (!metricsData || !videoFile) return;

    const videoPlayer = document.getElementById('videoPlayer');
    videoPlayer.src = URL.createObjectURL(videoFile);

    videoPlayer.addEventListener('timeupdate', function() {
        const currentTime = Math.floor(videoPlayer.currentTime);
        updateMetricsDisplay(metricsData, currentTime);
    });
}

function parseMetricsData(textContent) {
    const lines = textContent.split('\n');
    const metrics = [];
    const translations = [];
    let currentMetrics = null;

    for (const line of lines) {
        if (line.includes('[RTDM][Timestamps]')) {
            const matches = line.match(/\[(\d+\.\d+)sec - (\d+\.\d+)sec\]/);
            if (matches) {
                const startSec = parseFloat(matches[1]);
                const endSec = parseFloat(matches[2]);
                currentMetrics = { startSec, endSec, metrics: []};
                metrics.push(currentMetrics);
            }
        } else if (currentMetrics) {
            if (line.includes('Smoothness Score') ||
                line.includes('SRC Score') ||
                line.includes('Background_Noise Score') ||
                line.includes('Speaker_Level Score') ||
                line.includes('Isochrony Score') ||
                line.includes('RT_Metric Score')||
                line.includes('RECOGNIZED:')) {
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
    const backgroundNoiseScores = metricsData.map(m => extractMetricValue(m.metrics, 'Background_Noise Score'));
    const speakerLevelScores = metricsData.map(m => extractMetricValue(m.metrics, 'Speaker_Level Score'));
    const isochronyScores = metricsData.map(m => extractMetricValue(m.metrics, 'Isochrony Score'));
    const rtMetricScores = metricsData.map(m => extractMetricValue(m.metrics, 'RT_Metric Score'));

    if (chart) {
        chart.destroy();
    }

    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Smoothness Score',
                    data: smoothnessScores,
                    borderColor: 'rgba(255, 99, 132, 1)',
                    backgroundColor: 'rgba(255, 99, 132, 0.2)',
                    fill: false
                },
                {
                    label: 'SRC Score',
                    data: srcScores,
                    borderColor: 'rgba(54, 162, 235, 1)',
                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
                    fill: false
                },
                {
                    label: 'Background_Noise Score',
                    data: backgroundNoiseScores,
                    borderColor: 'rgba(255, 206, 86, 1)',
                    backgroundColor: 'rgba(255, 206, 86, 0.2)',
                    fill: false
                },
                {
                    label: 'Speaker_Level Score',
                    data: speakerLevelScores,
                    borderColor: 'rgba(75, 192, 192, 1)',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    fill: false
                },
                {
                    label: 'Isochrony Score',
                    data: isochronyScores,
                    borderColor: 'rgba(153, 102, 255, 1)',
                    backgroundColor: 'rgba(153, 102, 255, 0.2)',
                    fill: false
                },
                {
                    label: 'RT_Metric Score',
                    data: rtMetricScores,
                    borderColor: 'rgba(255, 159, 64, 1)',
                    backgroundColor: 'rgba(255, 159, 64, 0.2)',
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Timestamp (sec)'
                    }
                },
                y: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Score'
                    },
                    suggestedMin: 0,
                    suggestedMax: 1
                }
            }
        }
    });
}

function extractMetricValue(metrics, metricName) {
    const metric = metrics.find(m => m.includes(metricName));
    if (metric) {
        const matches = metric.match(/Score:\s*(-?\d+(\.\d+)?)/i);
        if (matches) {
            return parseFloat(matches[1]);
        }
    }
    return null;
}
