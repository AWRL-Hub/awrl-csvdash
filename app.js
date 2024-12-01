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

// Chart configuration
const chartConfig = {
    type: 'line',
    options: {
        responsive: true,
        interaction: {
            intersect: false,
            mode: 'index',
        },
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                callbacks: {
                    title: function(context) {
                        return 'Time: ' + context[0].raw.originalTime;  // Show full time in tooltip
                    },
                    label: function(context) {
                        return context.formattedValue;
                    }
                }
            }
        },
        scales: {
            x: {
                display: true,
                grid: {
                    display: false
                },
                title: {
                    display: false
                },
                ticks: {
                    callback: function(value, index, values) {
                        // Just show the hour number
                        const hour = this.getLabelForValue(value).split(':')[0];
                        return hour;
                    }
                }
            },
            y: {
                display: true,
                grid: {
                    display: false
                },
                beginAtZero: false,
                title: {
                    display: false
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
});

function initializeCharts() {
    // Initialize Depth Chart
    depthChart = new Chart(document.getElementById('depthChart').getContext('2d'), {
        ...chartConfig,
        data: {
            labels: [],
            datasets: [{
                label: 'Depth',
                data: [],
                borderColor: '#1a73e8',
                tension: 0.1,
                fill: false,
                pointRadius: 0
            }]
        }
    });

    // Initialize Temperature Chart
    temperatureChart = new Chart(document.getElementById('temperatureChart').getContext('2d'), {
        ...chartConfig,
        data: {
            labels: [],
            datasets: [{
                label: 'Temperature',
                data: [],
                borderColor: '#ea4335',
                tension: 0.1,
                fill: false,
                pointRadius: 0
            }]
        }
    });

    // Initialize Turbidity Chart
    turbidityChart = new Chart(document.getElementById('turbidityChart').getContext('2d'), {
        ...chartConfig,
        data: {
            labels: [],
            datasets: [{
                label: 'Turbidity',
                data: [],
                borderColor: '#34a853',
                tension: 0.1,
                fill: false,
                pointRadius: 0
            }]
        }
    });
}

function startDataListening(database) {
    const dataPath = `/AWRLData/${SPECIFIC_UID}/Record`;
    console.log('Attempting to access data at path:', dataPath);

    database.ref(dataPath).limitToLast(100).on('value', 
        (snapshot) => {
            console.log('Data received:', snapshot.val());
            const data = snapshot.val();
            if (!data) {
                console.log('No data available at this path');
                document.getElementById('connectionStatus').textContent = 'No data available';
                return;
            }

            try {
                globalData = Object.entries(data)
                    .map(([key, value]) => ({
                        timestamp: value.timestamp,
                        depth: value.depth,
                        temperature: value.temperature,
                        turbidity_ntu: value.turbidity_ntu
                    }))
                    .sort((a, b) => new Date(a.timestamp.replace('_', ' ')) - new Date(b.timestamp.replace('_', ' ')));

                // Update latest values
                const latest = globalData[globalData.length - 1];
                document.getElementById('depthValue').textContent = latest.depth.toFixed(1);
                document.getElementById('temperatureValue').textContent = latest.temperature.toFixed(1);
                document.getElementById('turbidityValue').textContent = latest.turbidity_ntu.toFixed(1);
                document.getElementById('lastUpdate').textContent = formatTimestamp(latest.timestamp);
                document.getElementById('connectionStatus').textContent = 'Connected - Data Updated';

                // Update charts
                updateCharts(globalData);
                console.log('Data successfully processed and displayed');
            } catch (error) {
                console.error('Error processing data:', error);
                document.getElementById('connectionStatus').textContent = 'Error processing data';
            }
        }, 
        (error) => {
            console.error('Database error:', error.code, error.message);
            document.getElementById('connectionStatus').textContent = 'Error: ' + error.message;
        }
    );
}

function updateCharts(data) {
    const labels = data.map(d => formatTimestampForChart(d.timestamp));
    const depthData = data.map(d => ({
        y: d.depth,
        originalTime: formatTimestamp(d.timestamp)  // Store full timestamp for tooltip
    }));
    const tempData = data.map(d => ({
        y: d.temperature,
        originalTime: formatTimestamp(d.timestamp)
    }));
    const turbData = data.map(d => ({
        y: d.turbidity_ntu,
        originalTime: formatTimestamp(d.timestamp)
    }));

    // Update Depth Chart
    depthChart.data.labels = labels;
    depthChart.data.datasets[0].data = depthData;
    depthChart.update();

    // Update Temperature Chart
    temperatureChart.data.labels = labels;
    temperatureChart.data.datasets[0].data = tempData;
    temperatureChart.update();

    // Update Turbidity Chart
    turbidityChart.data.labels = labels;
    turbidityChart.data.datasets[0].data = turbData;
    turbidityChart.update();
}

function formatTimestamp(timestamp) {
    // Parse the timestamp string
    const [datePart, timePart] = timestamp.split('_');
    const [year, month, day] = datePart.split('-');
    const [hours, minutes, seconds] = timePart.split('-');

    // Return formatted date string
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

// Format timestamp to show only hours
function formatTimestampForChart(timestamp) {
    const [datePart, timePart] = timestamp.split('_');
    const [hours, minutes] = timePart.split('-');
    return hours.padStart(2, '0');
}


function downloadData() {
    if (globalData.length === 0) return;

    // Create CSV content with formatted timestamp
    const headers = ['Timestamp', 'Depth (cm)', 'Temperature (°C)', 'Turbidity (NTU)'];
    const csvContent = [
        headers.join(','),
        ...globalData.map(row => [
            formatTimestamp(row.timestamp),  // Use formatted timestamp
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
}