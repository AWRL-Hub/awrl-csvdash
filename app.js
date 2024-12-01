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
let chart;
let globalData = [];
const SPECIFIC_UID = "VI0NhvakSSZz3Sb3ZB44TOHBEWB3";

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Firebase
    firebase.initializeApp(firebaseConfig);
    const database = firebase.database();
    const analytics = firebase.analytics();

    // Initialize Chart
    initializeChart();

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

function initializeChart() {
    const ctx = document.getElementById('historyChart').getContext('2d');
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Water Depth (cm)',
                    data: [],
                    borderColor: '#1a73e8',
                    tension: 0.1
                },
                {
                    label: 'Temperature (°C)',
                    data: [],
                    borderColor: '#ea4335',
                    tension: 0.1
                },
                {
                    label: 'Turbidity (NTU)',
                    data: [],
                    borderColor: '#34a853',
                    tension: 0.1
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Sensor Measurements History'
                }
            },
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Time'
                    }
                },
                y: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Value'
                    }
                }
            }
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

                // Update chart
                updateChart(globalData);
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

function updateChart(data) {
    const labels = data.map(d => formatTimestamp(d.timestamp));
    const depthData = data.map(d => d.depth);
    const tempData = data.map(d => d.temperature);
    const turbData = data.map(d => d.turbidity_ntu);

    chart.data.labels = labels;
    chart.data.datasets[0].data = depthData;
    chart.data.datasets[1].data = tempData;
    chart.data.datasets[2].data = turbData;
    chart.update();
}

function formatTimestamp(timestamp) {
    return new Date(timestamp.replace('_', ' ').replace(/-/g, '/')).toLocaleString();
}

function downloadData() {
    if (globalData.length === 0) return;

    // Create CSV content
    const headers = ['Timestamp', 'Depth (cm)', 'Temperature (°C)', 'Turbidity (NTU)'];
    const csvContent = [
        headers.join(','),
        ...globalData.map(row => [
            row.timestamp,
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