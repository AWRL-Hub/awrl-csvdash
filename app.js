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

// Chart configurations
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
                tension: 0.4
            },
            point: {
                radius: 0
            }
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
            borderWidth: 2,
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
            borderWidth: 2,
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
            borderWidth: 2,
            data: []
        }]
    }
});

// Initialize data listening
firebase.auth().signInAnonymously()
    .then(() => {
        startDataListening(SPECIFIC_UID);
    })
    .catch((error) => {
        console.error('Authentication error:', error);
    });

function startDataListening(uid) {
    const dataPath = `/AWRLData/${uid}/Record`;
    
    database.ref(dataPath).limitToLast(24).on('value', (snapshot) => {
        const data = snapshot.val();
        if (!data) return;

        const readings = Object.entries(data)
            .map(([key, value]) => ({
                timestamp: new Date(value.timestamp.replace('_', ' ').replace(/-/g, '/')),
                depth: value.depth,
                temperature: value.temperature,
                turbidity_ntu: value.turbidity_ntu
            }))
            .sort((a, b) => a.timestamp - b.timestamp);

        // Update latest values
        const latest = readings[readings.length - 1];
        document.getElementById('depthValue').textContent = latest.depth.toFixed(1);
        document.getElementById('temperatureValue').textContent = latest.temperature.toFixed(1);
        document.getElementById('turbidityValue').textContent = latest.turbidity_ntu.toFixed(1);
        document.getElementById('lastUpdate').textContent = latest.timestamp.toLocaleString();

        // Update charts
        updateCharts(readings);
    });
}

function updateCharts(readings) {
    // Update Depth Chart
    depthChart.data.datasets[0].data = readings.map(reading => ({
        x: reading.timestamp,
        y: reading.depth
    }));
    depthChart.update();

    // Update Temperature Chart
    temperatureChart.data.datasets[0].data = readings.map(reading => ({
        x: reading.timestamp,
        y: reading.temperature
    }));
    temperatureChart.update();

    // Update Turbidity Chart
    turbidityChart.data.datasets[0].data = readings.map(reading => ({
        x: reading.timestamp,
        y: reading.turbidity_ntu
    }));
    turbidityChart.update();
}