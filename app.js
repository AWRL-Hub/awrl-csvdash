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
                        return `${context[0].label}:00 WIB`;
                    },
                    label: function(context) {
                        if (context.raw === null) return `${context.dataset.label}: No data`;
                        const value = typeof context.raw === 'number' ? context.raw.toFixed(1) : context.raw;
                        return `${context.dataset.label}: ${value}`;
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

// Initialize charts when DOM is loaded
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

    // Set height for chart containers
    document.querySelectorAll('.chart-container').forEach(container => {
        container.style.height = chartHeight;
    });

    // Initialize Depth Chart
    depthChart = new Chart(document.getElementById('depthChart').getContext('2d'), {
        ...chartConfig,
        data: {
            labels: Array.from({length: 24}, (_, i) => i.toString().padStart(2, '0')),
            datasets: [{
                label: 'Depth',
                data: [],
                borderColor: '#1a73e8',
                tension: 0.1,
                fill: false,
                pointRadius: 0,
                borderWidth: 1.5
            }]
        }
    });

    // Initialize Temperature Chart
    temperatureChart = new Chart(document.getElementById('temperatureChart').getContext('2d'), {
        ...chartConfig,
        data: {
            labels: Array.from({length: 24}, (_, i) => i.toString().padStart(2, '0')),
            datasets: [{
                label: 'Temperature',
                data: [],
                borderColor: '#ea4335',
                tension: 0.1,
                fill: false,
                pointRadius: 0,
                borderWidth: 1.5
            }]
        }
    });

    // Initialize Turbidity Chart
    turbidityChart = new Chart(document.getElementById('turbidityChart').getContext('2d'), {
        ...chartConfig,
        data: {
            labels: Array.from({length: 24}, (_, i) => i.toString().padStart(2, '0')),
            datasets: [{
                label: 'Turbidity',
                data: [],
                borderColor: '#34a853',
                tension: 0.1,
                fill: false,
                pointRadius: 0,
                borderWidth: 1.5
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
                // Convert object to array and sort by timestamp
                globalData = Object.entries(data)
                    .map(([key, value]) => ({
                        timestamp: value.timestamp || '',
                        depth: parseFloat(value.depth) || 0,
                        temperature: parseFloat(value.temperature) || 0,
                        turbidity_ntu: parseFloat(value.turbidity_ntu) || 0
                    }))
                    .filter(item => item.timestamp) // Remove entries with empty timestamps
                    .sort((a, b) => {
                        // Parse timestamps safely
                        const dateA = parseTimestamp(a.timestamp);
                        const dateB = parseTimestamp(b.timestamp);
                        return dateA - dateB;
                    });

                // Update available dates
                updateAvailableDates(globalData);

                if (globalData.length > 0) {
                    // Update latest values
                    const latest = globalData[globalData.length - 1];
                    document.getElementById('depthValue').textContent = latest.depth.toFixed(1);
                    document.getElementById('temperatureValue').textContent = latest.temperature.toFixed(1);
                    document.getElementById('turbidityValue').textContent = latest.turbidity_ntu.toFixed(1);
                    document.getElementById('lastUpdate').textContent = formatTimestamp(latest.timestamp);
                    document.getElementById('connectionStatus').textContent = 'Connected - Data Updated';

                    // Filter and display data for the selected date
                    filterAndDisplayData();
                }

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

function updateAvailableDates(data) {
    availableDates.clear();
    data.forEach(item => {
        const date = item.timestamp.split('_')[0]; // Get date part only
        availableDates.add(date);
    });
    
    // Update datepicker
    const datePicker = document.getElementById('datePicker');
    
    // Convert Set to Array and sort
    const dates = Array.from(availableDates).sort();
    
    // Update datepicker attributes
    if (dates.length > 0) {
        datePicker.min = dates[0];
        datePicker.max = dates[dates.length - 1];
        
        // If current selected date is not in available dates, select the latest date
        if (!availableDates.has(datePicker.value)) {
            datePicker.value = dates[dates.length - 1];
        }
    }
}

function parseTimestamp(timestamp) {
    try {
        if (!timestamp || typeof timestamp !== 'string') return new Date(0);
        
        const [datePart, timePart] = timestamp.split('_');
        if (!datePart || !timePart) return new Date(0);
        
        const [year, month, day] = datePart.split('-').map(num => parseInt(num, 10));
        const [hours, minutes, seconds] = timePart.split('-').map(num => parseInt(num, 10));
        
        return new Date(year, month - 1, day, hours, minutes, seconds);
    } catch (error) {
        console.error('Error parsing timestamp:', error);
        return new Date(0);
    }
}

function filterAndDisplayData() {
    const selectedDate = document.getElementById('datePicker').value;
    
    // Filter data for selected date
    const filteredData = globalData.filter(item => item.timestamp.startsWith(selectedDate));
    
    if (filteredData.length > 0) {
        updateCharts(filteredData);
        document.getElementById('dateInfo').textContent = `Showing data for ${selectedDate}`;
    } else {
        document.getElementById('dateInfo').textContent = `No data available for ${selectedDate}`;
        clearCharts();
    }
}

function updateCharts(data) {
    // Group data by hour for better visualization
    const hourlyData = data.reduce((acc, item) => {
        const hour = parseTimestamp(item.timestamp).getHours();
        if (!acc[hour]) {
            acc[hour] = {
                depth: [],
                temperature: [],
                turbidity: []
            };
        }
        acc[hour].depth.push(item.depth);
        acc[hour].temperature.push(item.temperature);
        acc[hour].turbidity.push(item.turbidity_ntu);
        return acc;
    }, {});

    // Calculate averages for each hour
    const labels = Array.from({length: 24}, (_, i) => i.toString().padStart(2, '0'));
    const chartData = {
        depth: labels.map(hour => {
            const values = hourlyData[parseInt(hour)]?.depth || [];
            return values.length ? (values.reduce((a, b) => a + b, 0) / values.length) : null;
        }),
        temperature: labels.map(hour => {
            const values = hourlyData[parseInt(hour)]?.temperature || [];
            return values.length ? (values.reduce((a, b) => a + b, 0) / values.length) : null;
        }),
        turbidity: labels.map(hour => {
            const values = hourlyData[parseInt(hour)]?.turbidity || [];
            return values.length ? (values.reduce((a, b) => a + b, 0) / values.length) : null;
        })
    };

    // Update each chart
    updateSingleChart(depthChart, labels, chartData.depth, 'Depth');
    updateSingleChart(temperatureChart, labels, chartData.temperature, 'Temperature');
    updateSingleChart(turbidityChart, labels, chartData.turbidity, 'Turbidity');
}

function updateSingleChart(chart, labels, data, label) {
    chart.data.labels = labels;
    chart.data.datasets[0].data = data;
    chart.data.datasets[0].label = label;
    chart.update();
}

function clearCharts() {
    depthChart.data.datasets[0].data = [];
    temperatureChart.data.datasets[0].data = [];
    turbidityChart.data.datasets[0].data = [];
    
    depthChart.update();
    temperatureChart.update();
    turbidityChart.update();
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
}