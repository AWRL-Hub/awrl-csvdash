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
const analytics = firebase.analytics();

// Specific User ID
const SPECIFIC_UID = 'VI0NhvakSSZz3Sb3ZB44TOHBEWB3';

// Initialize data listening
firebase.auth().signInAnonymously()
    .then((userCredential) => {
        console.log('Anonymous sign-in successful');
        startDataListening(SPECIFIC_UID);  // Use specific UID
    })
    .catch((error) => {
        console.error('Anonymous sign-in error:', error.code, error.message);
    });

function startDataListening(uid) {
    const dataPath = `/AWRLData/${uid}/Record`;
    console.log('Attempting to access data at path:', dataPath);

    // Real-time data listener
    database.ref(dataPath).limitToLast(100).on('value', 
        (snapshot) => {
            console.log('Data received:', snapshot.val());
            const data = snapshot.val();
            if (!data) {
                console.log('No data available at this path');
                document.getElementById('lastUpdate').textContent = 'No data available';
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

                const latest = globalData[globalData.length - 1];
                document.getElementById('depthValue').textContent = latest.depth.toFixed(1);
                document.getElementById('temperatureValue').textContent = latest.temperature.toFixed(1);
                document.getElementById('turbidityValue').textContent = latest.turbidity_ntu.toFixed(1);
                document.getElementById('lastUpdate').textContent = formatTimestamp(latest.timestamp);

                updateChart(globalData);
                console.log('Data successfully processed and displayed');
            } catch (error) {
                console.error('Error processing data:', error);
            }
        }, 
        (error) => {
            console.error('Database error:', error.code, error.message);
            document.getElementById('lastUpdate').textContent = 'Error loading data';
        }
    );
}

// Connection status monitor
let connectedRef = database.ref('.info/connected');
connectedRef.on('value', (snap) => {
    if (snap.val() === true) {
        console.log('Connected to Firebase');
        document.getElementById('connectionStatus').textContent = 'Connected';
        document.getElementById('connectionStatus').style.color = '#4CAF50';
    } else {
        console.log('Not connected to Firebase');
        document.getElementById('connectionStatus').textContent = 'Disconnected';
        document.getElementById('connectionStatus').style.color = '#f44336';
    }
});

// Initialize Chart
const ctx = document.getElementById('historyChart').getContext('2d');
const chart = new Chart(ctx, {
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

// Store data globally for download
let globalData = [];

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