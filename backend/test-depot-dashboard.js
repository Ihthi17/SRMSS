// Quick test file to verify depot dashboard endpoints
const http = require('http');

// Test the new depot dashboard endpoint
const testDepotDashboard = (depotId = 1) => {
  const options = {
    hostname: 'localhost',
    port: 5000,
    path: `/api/depots/dashboard/${depotId}`,
    method: 'GET'
  };

  const req = http.request(options, (res) => {
    console.log(`\n=== Testing Depot Dashboard API ===`);
    console.log(`Status: ${res.statusCode}`);
    console.log(`Headers:`, res.headers);

    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      try {
        const result = JSON.parse(data);
        console.log('Dashboard Data Structure:');
        console.log('- Depot:', result.depot?.depot_name || 'N/A');
        console.log('- Active Routes:', result.overview?.activeRoutes || 0);
        console.log('- Available Buses:', result.overview?.availableBuses || 0);
        console.log('- Assigned Drivers:', result.overview?.assignedDrivers || 0);
        console.log('- Real-time Trips:', result.realTimeTrips?.length || 0);
        console.log('- Total Routes:', result.statistics?.totalRoutes || 0);
        console.log('- Trips Completed (30d):', result.statistics?.tripsCompleted || 0);
        console.log('- Vehicle Utilization:', result.statistics?.vehicleUtilizationRate || 0, '%');
        console.log('- Recent Activities:', result.recentActivities?.length || 0);
      } catch (error) {
        console.log('Response Data:', data);
        console.error('JSON Parse Error:', error.message);
      }
    });
  });

  req.on('error', (error) => {
    console.error('Request Error:', error.message);
  });

  req.end();
};

// Test depots with stats endpoint
const testDepotsWithStats = () => {
  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/depots/with-stats',
    method: 'GET'
  };

  const req = http.request(options, (res) => {
    console.log(`\n=== Testing Depots With Stats API ===`);
    console.log(`Status: ${res.statusCode}`);

    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      try {
        const result = JSON.parse(data);
        console.log(`Found ${result.length} depots with stats`);
        if (result.length > 0) {
          const firstDepot = result[0];
          console.log('Sample Depot Stats:');
          console.log('- Depot Name:', firstDepot.depot_name);
          console.log('- Total Buses:', firstDepot.total_buses || 0);
          console.log('- Active Trips:', firstDepot.active_trips || 0);
          console.log('- Available Buses:', firstDepot.available_buses || 0);
        }
      } catch (error) {
        console.log('Response Data:', data);
        console.error('JSON Parse Error:', error.message);
      }
    });
  });

  req.on('error', (error) => {
    console.error('Request Error:', error.message);
  });

  req.end();
};

// Run tests
console.log('Starting API endpoint tests...');
console.log('Make sure the backend server is running on port 5000\n');

testDepotsWithStats();
setTimeout(() => testDepotDashboard(1), 1000);

setTimeout(() => {
  console.log('\n=== Test Complete ===');
  process.exit(0);
}, 3000);