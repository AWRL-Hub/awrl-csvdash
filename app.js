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
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Specific User ID
const SPECIFIC_UID = 'VI0NhvakSSZz3Sb3ZB44TOHBEWB3';

// Chart configuration
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
            y: {
                beginAtZero: true,
                grid: {
                    color: '#f0f0f0'
                }
            },
            x: {
                grid: {
                    display: false
                },
                ticks: {
                    maxTicksLimit: 6
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
        labels: [],
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
        labels: [],
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
        labels: [],
        datasets: [{
            label: 'Turbidity',
            borderColor: '#34a853',
            backgroundColor: '#34a853',
            data: []
        }]
    }
});

// Store data globally
let globalData = [];

// Initialize data listening
firebase.auth().signInAnonymously()
    .then(() => {
        console.log('Anonymous authentication successful');
        startDataListening(SPECIFIC_UID);
    })
    .catch((error) => {
        console.error('Authentication error:', error);
    });

function startDataListening(uid) {
    const dataPath = `/AWRLData/${uid}/Record`;
    
    database.ref(dataPath).limitToLast(24).on('value', (snapshot) => {
        const data = snapshot.val();
        if (!data) {
            console.log('No data available');
            return;
        }

        try {
            const readings = Object.entries(data)
                .map(([key, value]) => ({
                    timestamp: value.timestamp.replace('_', ' '),
                    depth: value.depth,
                    temperature: value.temperature,
                    turbidity_ntu: value.turbidity_ntu
                }))
                .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

            globalData = readings;

            // Update latest values
            const latest = readings[readings.length - 1];
            document.getElementById('depthValue').textContent = latest.depth.toFixed(1);
            document.getElementById('temperatureValue').textContent = latest.temperature.toFixed(1);
            document.getElementById('turbidityValue').textContent = latest.turbidity_ntu.toFixed(1);
            document.getElementById('lastUpdate').textContent = latest.timestamp;

            // Update charts
            updateCharts(readings);

        } catch (error) {
            console.error('Error processing data:', error);
        }
    });
}

function updateCharts(readings) {
    const timestamps = readings.map(r => r.timestamp);

    // Update Depth Chart
    depthChart.data.labels = timestamps;
    depthChart.data.datasets[0].data = readings.map(r => r.depth);
    depthChart.update('quiet');

    // Update Temperature Chart
    temperatureChart.data.labels = timestamps;
    temperatureChart.data.datasets[0].data = readings.map(r => r.temperature);
    temperatureChart.update('quiet');

    // Update Turbidity Chart
    turbidityChart.data.labels = timestamps;
    turbidityChart.data.datasets[0].data = readings.map(r => r.turbidity_ntu);
    turbidityChart.update('quiet');
}

// Monitor connection status
database.ref('.info/connected').on('value', (snap) => {
    const isConnected = snap.val() === true;
    const statusElement = document.querySelector('.connected');
    if (statusElement) {
        statusElement.textContent = isConnected ? 'Connected' : 'Disconnected';
        statusElement.style.color = isConnected ? 'green' : 'red';
    }
});

// Download function
function downloadData() {
    if (globalData.length === 0) return;

    const headers = ['Timestamp', 'Depth (cm)', 'Temperature (°C)', 'Turbidity (NTU)'];
    const csvContent = [
        headers.join(','),
        ...globalData.map(row => [
            row.timestamp,
            row.depth.toFixed(1),
            row.temperature.toFixed(1),
            row.turbidity_ntu.toFixed(1)
        ].join(','))
    ].join('\n');

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