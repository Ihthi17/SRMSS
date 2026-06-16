const db = require('./src/config/db');

async function testTripSave() {
  try {
    console.log('Testing trip save with DATETIME fields...');
    
    // Get a schedule, vehicle, and driver
    const [schedules] = await db.query('SELECT schedule_id FROM schedules LIMIT 1');
    const [vehicles] = await db.query('SELECT vehicle_id FROM vehicles LIMIT 1');
    const [drivers] = await db.query('SELECT driver_id FROM drivers LIMIT 1');
    
    if (!schedules.length || !vehicles.length || !drivers.length) {
      console.error('Missing required data. Create schedules, vehicles, and drivers first.');
      process.exit(1);
    }
    
    const testData = {
      schedule_id: schedules[0].schedule_id,
      vehicle_id: vehicles[0].vehicle_id,
      driver_id: drivers[0].driver_id,
      trip_date: '2026-06-15',
      departure_time: '2026-06-15 08:30:00',
      arrival_time: '2026-06-15 11:30:00',
      actual_departure_time: '2026-06-15 08:35:00',
      actual_arrival_time: '2026-06-15 11:25:00',
      trip_status: 'Completed',
      passengers_count: 35,
      route_distance: 125.50,
      fuel_consumed: 28.75
    };
    
    console.log('\nInserting test trip with data:');
    console.log(JSON.stringify(testData, null, 2));
    
    const [result] = await db.query(`
      INSERT INTO trips (schedule_id, vehicle_id, driver_id, trip_date, departure_time, arrival_time, actual_departure_time, actual_arrival_time, trip_status, passengers_count, route_distance, fuel_consumed)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      testData.schedule_id,
      testData.vehicle_id,
      testData.driver_id,
      testData.trip_date,
      testData.departure_time,
      testData.arrival_time,
      testData.actual_departure_time,
      testData.actual_arrival_time,
      testData.trip_status,
      testData.passengers_count,
      testData.route_distance,
      testData.fuel_consumed
    ]);
    
    console.log('\n✅ Trip inserted successfully! Trip ID:', result.insertId);
    
    // Verify the data was saved correctly
    const [savedTrip] = await db.query('SELECT * FROM trips WHERE trip_id = ?', [result.insertId]);
    
    if (savedTrip.length > 0) {
      console.log('\nVerifying saved trip data:');
      console.log(JSON.stringify(savedTrip[0], null, 2));
      
      // Check if times are properly saved
      if (savedTrip[0].departure_time && savedTrip[0].arrival_time) {
        console.log('\n✅ All DATETIME fields saved correctly!');
      } else {
        console.log('\n❌ Some DATETIME fields are NULL!');
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testTripSave();
