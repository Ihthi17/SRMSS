/**
 * Comprehensive Test Script for fuelController.js
 * Tests all CRUD operations, validation, and business logic
 */

const http = require('http');

const BASE_URL = 'http://localhost:5000/api/fuel';

// Helper function to make HTTP requests
function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: data ? JSON.parse(data) : null,
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: data,
          });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// Test cases
const tests = [
  {
    name: 'Create valid fuel record',
    method: 'POST',
    path: '',
    body: {
      vehicle_id: 1,
      fuel_quantity: 45.50,
      fuel_cost: 2275.00,
      fuel_type: 'Diesel',
      fuel_date: '2024-01-15',
      fuel_time: '14:30:00',
      odometer_reading: 125000.50,
    },
    expectedStatus: 201,
  },
  {
    name: 'Reject fuel record with zero fuel_quantity',
    method: 'POST',
    path: '',
    body: {
      vehicle_id: 1,
      fuel_quantity: 0,
      fuel_cost: 0,
      fuel_type: 'Diesel',
      fuel_date: '2024-01-15',
      fuel_time: '14:30:00',
      odometer_reading: 125000.50,
    },
    expectedStatus: 400,
  },
  {
    name: 'Reject fuel record with negative fuel_cost',
    method: 'POST',
    path: '',
    body: {
      vehicle_id: 1,
      fuel_quantity: 45.50,
      fuel_cost: -100,
      fuel_type: 'Diesel',
      fuel_date: '2024-01-15',
      fuel_time: '14:30:00',
      odometer_reading: 125000.50,
    },
    expectedStatus: 400,
  },
  {
    name: 'Reject fuel record with odometer regression',
    method: 'POST',
    path: '',
    body: {
      vehicle_id: 1,
      fuel_quantity: 45.50,
      fuel_cost: 2275.00,
      fuel_type: 'Diesel',
      fuel_date: '2024-01-14',
      fuel_time: '14:30:00',
      odometer_reading: 124000.00, // Less than previous
    },
    expectedStatus: 400,
  },
  {
    name: 'Get all fuel records',
    method: 'GET',
    path: '',
    expectedStatus: 200,
  },
  {
    name: 'Get fuel records with vehicle_id filter',
    method: 'GET',
    path: '?vehicle_id=1',
    expectedStatus: 200,
  },
  {
    name: 'Get fuel records with date range filter',
    method: 'GET',
    path: '?start_date=2024-01-01&end_date=2024-01-31',
    expectedStatus: 200,
  },
  {
    name: 'Get specific fuel record (assuming fuel_id 1 exists)',
    method: 'GET',
    path: '/1',
    expectedStatus: 200,
  },
  {
    name: 'Get non-existent fuel record',
    method: 'GET',
    path: '/99999',
    expectedStatus: 404,
  },
  {
    name: 'Delete non-existent fuel record',
    method: 'DELETE',
    path: '/99999',
    expectedStatus: 404,
  },
];

// Run tests
async function runTests() {
  console.log('🚀 Starting fuelController Tests...\n');
  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      const response = await makeRequest(test.method, test.path, test.body);
      const testPassed = response.status === test.expectedStatus;
      
      if (testPassed) {
        console.log(`✅ ${test.name}`);
        console.log(`   Status: ${response.status} (expected ${test.expectedStatus})`);
        passed++;
      } else {
        console.log(`❌ ${test.name}`);
        console.log(`   Status: ${response.status} (expected ${test.expectedStatus})`);
        console.log(`   Response: ${JSON.stringify(response.data, null, 2)}`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ ${test.name}`);
      console.log(`   Error: ${error.message}`);
      failed++;
    }
    console.log();
  }

  console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

// Wait a moment for server to be fully ready, then run tests
setTimeout(runTests, 2000);
