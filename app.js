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
                display: false
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
                        return `${context[0].label}:00 WIB`;
                    },
                    label: function(context) {
                        if (context.raw === null) return `${context.dataset.label}: No data`;
                        const value = typeof context.raw === 'number' ? context.raw.toFixed(1) : context.raw;
                        const unit = getUnit(context.dataset.label);
                        return `${context.dataset.label}: ${value}${unit}`;
                    }
                }
            }
        },
        scales: {
            x: {
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

// Initialize everything when DOM is loaded
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

    // Initialize each chart with common configuration
    const commonConfig = {
        labels: Array.from({length: 24}, (_, i) => i.toString().padStart(2, '0')),
        datasets: [{
            data: [],
            timestamps: [],
            tension: 0.1,
            fill: false,
            pointRadius: 3,
            borderWidth: 1.5
        }]
    };

    depthChart = new Chart(document.getElementById('depthChart').getContext('2d'), {
        ...chartConfig,
        data: {
            ...commonConfig,
            datasets: [{
                ...commonConfig.datasets[0],
                label: 'Depth',
                borderColor: getChartColor('Depth')
            }]
        }
    });

    temperatureChart = new Chart(document.getElementById('temperatureChart').getContext('2d'), {
        ...chartConfig,
        data: {
            ...commonConfig,
            datasets: [{
                ...commonConfig.datasets[0],
                label: 'Temperature',
                borderColor: getChartColor('Temperature')
            }]
        }
    });

    turbidityChart = new Chart(document.getElementById('turbidityChart').getContext('2d'), {
        ...chartConfig,
        data: {
            ...commonConfig,
            datasets: [{
                ...commonConfig.datasets[0],
                label: 'Turbidity',
                borderColor: getChartColor('Turbidity')
            }]
        }
    });
}

function startDataListening(database) {
    const dataPath = `/AWRLData/${SPECIFIC_UID}/Record`;
    console.log('Attempting to access data at path:', dataPath);

    database.ref(dataPath).on('value', 
        (snapshot) => {
            console.log('Data received');
            const data = snapshot.val();
            if (!data) {
                console.log('No data available at this path');
                document.getElementById('connectionStatus').textContent = 'No data available';
                return;
            }

            try {
                // Convert the data to array with timestamp from the key
                globalData = Object.entries(data)
                    .map(([key, value]) => ({
                        timestamp: key,
                        depth: parseFloat(value?.depth) || 0,
                        temperature: parseFloat(value?.temperature) || 0,
                        turbidity_ntu: parseFloat(value?.turbidity_ntu) || 0
                    }))
                    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

                console.log('Processed data length:', globalData.length);

                if (globalData.length > 0) {
                    // Update latest values
                    const latest = globalData[globalData.length - 1];
                    document.getElementById('depthValue').textContent = latest.depth.toFixed(1);
                    document.getElementById('temperatureValue').textContent = latest.temperature.toFixed(1);
                    document.getElementById('turbidityValue').textContent = latest.turbidity_ntu.toFixed(1);
                    document.getElementById('lastUpdate').textContent = formatTimestamp(latest.timestamp);
                    document.getElementById('connectionStatus').textContent = 'Connected - Data Updated';

                    // Update available dates
                    updateAvailableDates(globalData);

                    // Filter and display data for selected date
                    filterAndDisplayData();
                }

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

function updateAvailableDates(data) {
    availableDates.clear();
    data.forEach(item => {
        try {
            if (item.timestamp) {
                const datePart = item.timestamp.split('_')[0];
                if (datePart) {
                    availableDates.add(datePart);
                }
            }
        } catch (error) {
            console.error('Error updating available dates:', error);
        }
    });
    
    const datePicker = document.getElementById('datePicker');
    const dates = Array.from(availableDates).sort();
    
    if (dates.length > 0) {
        datePicker.min = dates[0];
        datePicker.max = dates[dates.length - 1];
        
        if (!availableDates.has(datePicker.value)) {
            datePicker.value = dates[dates.length - 1];
        }
    }
}

function filterAndDisplayData() {
    const selectedDate = document.getElementById('datePicker').value;
    
    const filteredData = globalData.filter(item => 
        item.timestamp && item.timestamp.startsWith(selectedDate)
    );
    
    if (filteredData.length > 0) {
        updateCharts(filteredData);
        document.getElementById('dateInfo').textContent = `Showing data for ${selectedDate}`;
    } else {
        document.getElementById('dateInfo').textContent = `No data available for ${selectedDate}`;
        clearCharts();
    }
}

function updateCharts(data) {
    // Create 24-hour array for labels
    const labels = Array.from({length: 24}, (_, i) => i.toString().padStart(2, '0'));
    
    // Map data points to their corresponding hour slots
    const mappedData = {
        depth: new Array(24).fill(null),
        temperature: new Array(24).fill(null),
        turbidity: new Array(24).fill(null),
        timestamps: new Array(24).fill(null)
    };

    data.forEach(item => {
        const hour = parseInt(item.timestamp.split('_')[1].split('-')[0]);
        mappedData.depth[hour] = item.depth;
        mappedData.temperature[hour] = item.temperature;
        mappedData.turbidity[hour] = item.turbidity_ntu;
        mappedData.timestamps[hour] = item.timestamp;
    });

    // Update each chart
    updateSingleChart(depthChart, labels, {
        data: mappedData.depth,
        timestamps: mappedData.timestamps
    }, 'Depth');
    updateSingleChart(temperatureChart, labels, {
        data: mappedData.temperature,
        timestamps: mappedData.timestamps
    }, 'Temperature');
    updateSingleChart(turbidityChart, labels, {
        data: mappedData.turbidity,
        timestamps: mappedData.timestamps
    }, 'Turbidity');
}

function updateSingleChart(chart, labels, data, label) {
    chart.data.labels = labels;
    chart.data.datasets[0] = {
        label: label,
        data: data.data,
        timestamps: data.timestamps,
        borderColor: getChartColor(label),
        tension: 0.1,
        fill: false,
        pointRadius: 3,
        borderWidth: 1.5
    };
    chart.update();
}

function clearCharts() {
    const emptyData = Array(24).fill(null);
    const labels = Array.from({length: 24}, (_, i) => i.toString().padStart(2, '0'));
    
    [depthChart, temperatureChart, turbidityChart].forEach(chart => {
        chart.data.labels = labels;
        chart.data.datasets[0].data = emptyData;
        chart.data.datasets[0].timestamps = emptyData;
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