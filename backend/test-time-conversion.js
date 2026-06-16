const db = require('./src/config/db');

async function testTimeConversion() {
  try {
    console.log('Testing time conversion and storage...');
    
    // Get a schedule, vehicle, and driver
    const [schedules] = await db.query('SELECT schedule_id FROM schedules LIMIT 1');
    const [vehicles] = await db.query('SELECT vehicle_id FROM vehicles LIMIT 1');
    const [drivers] = await db.query('SELECT driver_id FROM drivers LIMIT 1');
    
    if (!schedules.length || !vehicles.length || !drivers.length) {
      console.error('Missing required data.');
      process.exit(1);
    }
    
    // Test data with times in DATETIME format (as sent by frontend)
    const testData = {
      schedule_id: schedules[0].schedule_id,
      vehicle_id: vehicles[0].vehicle_id,
      driver_id: drivers[0].driver_id,
      trip_date: '2026-06-20',
      departure_time: '2026-06-20 09:00:00', // Frontend sends DATETIME
      arrival_time: '2026-06-20 12:30:00',
      actual_departure_time: '2026-06-20 09:05:00',
      actual_arrival_time: '2026-06-20 12:25:00',
      trip_status: 'Completed',
      passengers_count: 40,
      route_distance: 150.00,
      fuel_consumed: 35.50
    };
    
    console.log('\nTest Data Sent (with DATETIME):');
    console.log('departure_time:', testData.departure_time);
    console.log('arrival_time:', testData.arrival_time);
    
    // Simulate the backend's extractTime function
    const extractTime = (datetimeStr) => {
      if (!datetimeStr) return null;
      if (datetimeStr.includes(' ')) {
        return datetimeStr.split(' ')[1]; // Extract time portion
      }
      return datetimeStr;
    };
    
    const extractedTimes = {
      departure_time: extractTime(testData.departure_time),
      arrival_time: extractTime(testData.arrival_time),
      actual_departure_time: extractTime(testData.actual_departure_time),
      actual_arrival_time: extractTime(testData.actual_arrival_time)
    };
    
    console.log('\nAfter Backend Extraction (TIME only):');
    console.log('departure_time:', extractedTimes.departure_time);
    console.log('arrival_time:', extractedTimes.arrival_time);
    
    // Insert the trip
    const [result] = await db.query(`
      INSERT INTO trips (schedule_id, vehicle_id, driver_id, trip_date, departure_time, arrival_time, actual_departure_time, actual_arrival_time, trip_status, passengers_count, route_distance, fuel_consumed)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      testData.schedule_id,
      testData.vehicle_id,
      testData.driver_id,
      testData.trip_date,
      extractedTimes.departure_time,
      extractedTimes.arrival_time,
      extractedTimes.actual_departure_time,
      extractedTimes.actual_arrival_time,
      testData.trip_status,
      testData.passengers_count,
      testData.route_distance,
      testData.fuel_consumed
    ]);
    
    console.log('\n✅ Trip inserted successfully! Trip ID:', result.insertId);
    
    // Fetch and display the saved data
    const [savedTrip] = await db.query('SELECT * FROM trips WHERE trip_id = ?', [result.insertId]);
    
    if (savedTrip.length > 0) {
      console.log('\nStored in Database (retrieved):');
      console.log('trip_date:', savedTrip[0].trip_date);
      console.log('departure_time:', savedTrip[0].departure_time);
      console.log('arrival_time:', savedTrip[0].arrival_time);
      console.log('actual_departure_time:', savedTrip[0].actual_departure_time);
      console.log('actual_arrival_time:', savedTrip[0].actual_arrival_time);
      
      // Extract just the time portion for display
      const displayTime = (timeStr) => {
        if (!timeStr) return 'NULL';
        if (timeStr.includes('T')) {
          return timeStr.split('T')[1].slice(0, 5); // ISO format
        }
        return timeStr.slice(0, 5); // Regular format
      };
      
      console.log('\nAs Displayed in Frontend (HH:MM format):');
      console.log('departure_time:', displayTime(savedTrip[0].departure_time));
      console.log('arrival_time:', displayTime(savedTrip[0].arrival_time));
      
      if (displayTime(savedTrip[0].departure_time) === '09:00') {
        console.log('\n✅ TIME CONVERSION SUCCESSFUL - Times are stored and displayed correctly!');
      } else {
        console.log('\n❌ TIME MISMATCH - There may still be timezone issues');
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testTimeConversion();
