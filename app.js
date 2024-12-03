// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCTjgXOengQjinmKz5hB7IwaLN1cVylOBs",
    authDomain: "awrl-49c31.firebaseapp.com",
    databaseURL: "https://awrl-49c31-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "awrl-49c31",
    storageBucket: "awrl-49c31.firebasestorage.app",
    messagingSenderId: "109887515682",
    appId: "1:109887515682:web:16505c870d21a581aaee7b",
    measurementId: "G-MFMHM3YY7H"
};

// Global variables
let depthChart, temperatureChart, turbidityChart;
let globalData = [];
const SPECIFIC_UID = "VI0NhvakSSZz3Sb3ZB44TOHBEWB3";
let availableDates = new Set();

// Helper function to get units for different measurements
function getUnit(label) {
    switch (label) {
        case 'Depth':
            return ' cm';
        case 'Temperature':
            return ' °C';
        case 'Turbidity':
            return ' NTU';
        default:
            return '';
    }
}

// Helper function to get chart colors
function getChartColor(label) {
    switch (label) {
        case 'Depth':
            return '#1a73e8';
        case 'Temperature':
            return '#ea4335';
        case 'Turbidity':
            return '#34a853';
        default:
            return '#000000';
    }
}

// Chart configuration
const chartConfig = {
    type: 'line',
    options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            intersect: false,
            mode: 'index',
        },
        plugins: {
            legend: {
                display: false  // This removes the legend
            },
            tooltip: {
                backgroundColor: 'white',
                titleColor: 'black',
                bodyColor: 'black',
                borderColor: '#ddd',
                borderWidth: 1,
                padding: 10,
                displayColors: false,
                callbacks: {
                    title: function(context) {
                        const timestamp = context[0].dataset.timestamps?.[context[0].dataIndex];
                        if (timestamp) {
                            const [_, timePart] = timestamp.split('_');
                            const [hours, minutes] = timePart.split('-');
                            return `${hours}:${minutes} WIB`;
                        }
                        return context[0].label;
                    },
                    label: function(context) {
                        if (context.raw === null || context.raw.y === null) return `${context.dataset.label}: No data`;
                        const value = typeof context.raw.y === 'number' ? context.raw.y.toFixed(1) : context.raw.y;
                        const unit = getUnit(context.dataset.label);
                        return `${context.dataset.label}: ${value}${unit}`;
                    }
                }
            }
        },
        scales: {
            x: {
                type: 'linear',
                min: 0,
                max: 23,
                display: true,
                grid: {
                    display: false,
                    drawBorder: false
                },
                ticks: {
                    stepSize: 2,
                    maxRotation: 0,
                    autoSkip: false,
                    callback: function(value) {
                        return value.toString().padStart(2, '0');
                    },
                    color: '#666',
                    font: {
                        size: 11
                    }
                },
                border: {
                    display: true,
                    color: '#ddd'
                }
            },
            y: {
                display: true,
                position: 'left',
                grid: {
                    display: false,
                    drawBorder: false
                },
                ticks: {
                    padding: 10,
                    color: '#666',
                    font: {
                        size: 11
                    }
                },
                border: {
                    display: true,
                    color: '#ddd'
                }
            }
        }
    }
};

document.addEventListener('DOMContentLoaded', function() {
    // Initialize Firebase
    firebase.initializeApp(firebaseConfig);
    const database = firebase.database();
    const analytics = firebase.analytics();

    // Initialize Charts
    initializeCharts();

    // Start authentication and data listening
    firebase.auth().signInAnonymously()
        .then(() => {
            console.log('Signed in anonymously');
            startDataListening(database);
        })
        .catch((error) => {
            console.error('Error signing in:', error);
            document.getElementById('connectionStatus').textContent = 'Authentication Error: ' + error.message;
        });

    // Monitor connection status
    database.ref('.info/connected').on('value', (snapshot) => {
        const connected = snapshot.val();
        const statusElement = document.getElementById('connectionStatus');
        if (connected) {
            statusElement.textContent = 'Connected to Firebase';
            statusElement.style.color = '#4CAF50';
        } else {
            statusElement.textContent = 'Disconnected - Trying to reconnect...';
            statusElement.style.color = '#f44336';
        }
    });

    // Initialize date picker with today's date
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('datePicker').value = today;
});

function initializeCharts() {
    const chartHeight = '250px';

    document.querySelectorAll('.chart-container').forEach(container => {
        container.style.height = chartHeight;
    });

    // Initialize charts with basic configuration
    depthChart = new Chart(document.getElementById('depthChart').getContext('2d'), {
        ...chartConfig,
        data: {
            datasets: [{
                label: 'Depth',
                data: [],
                timestamps: [],
                borderColor: getChartColor('Depth'),
                tension: 0.1,
                fill: false,
                pointRadius: 3,
                borderWidth: 1.5
            }]
        }
    });

    temperatureChart = new Chart(document.getElementById('temperatureChart').getContext('2d'), {
        ...chartConfig,
        data: {
            datasets: [{
                label: 'Temperature',
                data: [],
                timestamps: [],
                borderColor: getChartColor('Temperature'),
                tension: 0.1,
                fill: false,
                pointRadius: 3,
                borderWidth: 1.5
            }]
        }
    });

    turbidityChart = new Chart(document.getElementById('turbidityChart').getContext('2d'), {
        ...chartConfig,
        data: {
            datasets: [{
                label: 'Turbidity',
                data: [],
                timestamps: [],
                borderColor: getChartColor('Turbidity'),
                tension: 0.1,
                fill: false,
                pointRadius: 3,
                borderWidth: 1.5
            }]
        }
    });
}

function updateCharts(data) {
    // Sort data by timestamp
    const sortedData = data.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    
    // Create data points with exact positions
    const chartData = sortedData.map(item => {
        const [_, timePart] = item.timestamp.split('_');
        const [hours, minutes] = timePart.split('-');
        const xPosition = parseInt(hours) + (parseInt(minutes) / 60);
        
        return {
            timestamp: item.timestamp,
            xPosition: xPosition,
            depth: item.depth,
            temperature: item.temperature,
            turbidity: item.turbidity_ntu
        };
    });

    // Update each chart
    updateSingleChart(depthChart, chartData, 'Depth', d => d.depth);
    updateSingleChart(temperatureChart, chartData, 'Temperature', d => d.temperature);
    updateSingleChart(turbidityChart, chartData, 'Turbidity', d => d.turbidity);
}

function updateSingleChart(chart, data, label, valueGetter) {
    chart.data.datasets[0] = {
        label: label,
        data: data.map(d => ({
            x: d.xPosition,
            y: valueGetter(d)
        })),
        timestamps: data.map(d => d.timestamp),
        borderColor: getChartColor(label),
        tension: 0.1,
        fill: false,
        pointRadius: 3,
        borderWidth: 1.5
    };
    chart.update();
}

function clearCharts() {
    [depthChart, temperatureChart, turbidityChart].forEach(chart => {
        chart.data.datasets[0].data = [];
        chart.data.datasets[0].timestamps = [];
        chart.update();
    });
}

function formatTimestamp(timestamp) {
    try {
        if (!timestamp) return '-';
        const [datePart, timePart] = timestamp.split('_');
        const [year, month, day] = datePart.split('-');
        const [hours, minutes, seconds] = timePart.split('-');
        return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
    } catch (error) {
        console.error('Error formatting timestamp:', error);
        return '-';
    }
}

function changeDate() {
    filterAndDisplayData();
}

function downloadData() {
    if (globalData.length === 0) return;

    // Create CSV content with formatted timestamp
    const headers = ['Timestamp', 'Depth (cm)', 'Temperature (°C)', 'Turbidity (NTU)'];
    const csvContent = [
        headers.join(','),
        ...globalData.map(row => [
            formatTimestamp(row.timestamp),
            row.depth,
            row.temperature,
            row.turbidity_ntu
        ].join(','))
    ].join('\n');

    // Create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', 'water_monitoring_data.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}