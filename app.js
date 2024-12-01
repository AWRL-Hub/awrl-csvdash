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

// Initialize Firebase
console.log('Initializing Firebase with config:', firebaseConfig);
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Specific User ID
const SPECIFIC_UID = 'VI0NhvakSSZz3Sb3ZB44TOHBEWB3';

// Chart configuration base template
const chartConfig = {
    type: 'line',
    options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false
            }
        },
        scales: {
            x: {
                type: 'time',
                time: {
                    unit: 'hour',
                    displayFormats: {
                        hour: 'HH:mm'
                    }
                },
                grid: {
                    display: false
                },
                ticks: {
                    maxRotation: 0
                }
            },
            y: {
                beginAtZero: true,
                grid: {
                    color: '#f0f0f0'
                }
            }
        },
        elements: {
            line: {
                tension: 0.4,
                borderWidth: 1.5
            },
            point: {
                radius: 0,
                hitRadius: 10,
                hoverRadius: 4
            }
        },
        interaction: {
            intersect: false,
            mode: 'index'
        }
    }
};

// Initialize Charts
const depthChart = new Chart(document.getElementById('depthChart').getContext('2d'), {
    ...chartConfig,
    data: {
        datasets: [{
            label: 'Water Depth',
            borderColor: '#1a73e8',
            backgroundColor: '#1a73e8',
            data: []
        }]
    }
});

const temperatureChart = new Chart(document.getElementById('temperatureChart').getContext('2d'), {
    ...chartConfig,
    data: {
        datasets: [{
            label: 'Temperature',
            borderColor: '#ea4335',
            backgroundColor: '#ea4335',
            data: []
        }]
    }
});

const turbidityChart = new Chart(document.getElementById('turbidityChart').getContext('2d'), {
    ...chartConfig,
    data: {
        datasets: [{
            label: 'Turbidity',
            borderColor: '#34a853',
            backgroundColor: '#34a853',
            data: []
        }]
    }
});

// Store data globally for download
let globalData = [];

// Initialize data listening with anonymous auth
firebase.auth().signInAnonymously()
    .then(() => {
        console.log('Anonymous authentication successful');
        startDataListening(SPECIFIC_UID);
    })
    .catch((error) => {
        console.error('Authentication error:', error);
        document.getElementById('connectionStatus').textContent = 'Authentication Error';
        document.getElementById('connectionStatus').style.color = '#dc3545';
    });

function startDataListening(uid) {
    const dataPath = `/AWRLData/${uid}/Record`;
    console.log('Starting data listener at path:', dataPath);
    
    // Real-time listener for latest data
    database.ref(dataPath).limitToLast(24).on('value', (snapshot) => {
        const data = snapshot.val();
        if (!data) {
            console.log('No data available');
            return;
        }

        try {
            // Process and sort the data
            const readings = Object.entries(data)
                .map(([key, value]) => ({
                    timestamp: new Date(value.timestamp.replace('_', ' ').replace(/-/g, '/')),
                    depth: value.depth,
                    temperature: value.temperature,
                    turbidity_ntu: value.turbidity_ntu
                }))
                .sort((a, b) => a.timestamp - b.timestamp);

            globalData = readings; // Store for download feature

            // Update latest values in the cards
            const latest = readings[readings.length - 1];
            document.getElementById('depthValue').textContent = latest.depth.toFixed(1);
            document.getElementById('temperatureValue').textContent = latest.temperature.toFixed(1);
            document.getElementById('turbidityValue').textContent = latest.turbidity_ntu.toFixed(1);
            document.getElementById('lastUpdate').textContent = latest.timestamp.toLocaleString();

            // Update all charts
            updateCharts(readings);

        } catch (error) {
            console.error('Error processing data:', error);
        }
    }, (error) => {
        console.error('Database error:', error);
    });
}

function updateCharts(readings) {
    // Map data for charts
    const chartData = readings.map(reading => ({
        x: reading.timestamp,
        y: reading.value
    }));

    // Update Depth Chart
    depthChart.data.datasets[0].data = readings.map(reading => ({
        x: reading.timestamp,
        y: reading.depth
    }));
    depthChart.update('quiet');

    // Update Temperature Chart
    temperatureChart.data.datasets[0].data = readings.map(reading => ({
        x: reading.timestamp,
        y: reading.temperature
    }));
    temperatureChart.update('quiet');

    // Update Turbidity Chart
    turbidityChart.data.datasets[0].data = readings.map(reading => ({
        x: reading.timestamp,
        y: reading.turbidity_ntu
    }));
    turbidityChart.update('quiet');
}

// Connection status monitor
database.ref('.info/connected').on('value', (snap) => {
    const isConnected = snap.val() === true;
    const statusElement = document.querySelector('.status-text .connected');
    if (statusElement) {
        statusElement.textContent = isConnected ? 'Connected' : 'Disconnected';
        statusElement.style.color = isConnected ? 'green' : 'red';
    }
});

// Download data function
function downloadData() {
    if (globalData.length === 0) {
        console.log('No data to download');
        return;
    }

    // Create CSV content
    const headers = ['Timestamp', 'Depth (cm)', 'Temperature (°C)', 'Turbidity (NTU)'];
    const csvContent = [
        headers.join(','),
        ...globalData.map(row => [
            row.timestamp.toLocaleString(),
            row.depth.toFixed(1),
            row.temperature.toFixed(1),
            row.turbidity_ntu.toFixed(1)
        ].join(','))
    ].join('\n');

    // Create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `water_monitoring_data_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}