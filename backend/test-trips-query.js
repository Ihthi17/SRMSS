const db = require('./src/config/db');

async function testTripsQuery() {
  try {
    console.log('Testing trips query...');
    
    const [trips] = await db.query(`
      SELECT 
        t.trip_id,
        t.schedule_id,
        t.vehicle_id,
        t.driver_id,
        t.trip_date,
        t.departure_time,
        t.arrival_time,
        t.actual_departure_time,
        t.actual_arrival_time,
        t.trip_status,
        t.passengers_count,
        t.route_distance,
        t.fuel_consumed,
        s.schedule_code,
        r.route_name,
        r.start_location,
        r.end_location,
        b.bus_code,
        v.registration_number,
        d1.first_name as driver_first_name,
        d1.last_name as driver_last_name,
        CONCAT(COALESCE(d1.first_name, 'Unassigned'), ' ', COALESCE(d1.last_name, '')) as driver_name
      FROM trips t
      LEFT JOIN schedules s ON t.schedule_id = s.schedule_id
      LEFT JOIN routes r ON s.route_id = r.route_id
      LEFT JOIN vehicles v ON t.vehicle_id = v.vehicle_id
      LEFT JOIN buses b ON b.vehicle_id = v.vehicle_id
      LEFT JOIN drivers d1 ON t.driver_id = d1.driver_id
      ORDER BY t.trip_date DESC, t.departure_time DESC
    `);
    
    console.log('✅ Query successful!');
    console.log('Total trips found:', trips.length);
    
    if (trips.length > 0) {
      console.log('\nFirst trip details:');
      console.log(JSON.stringify(trips[0], null, 2));
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testTripsQuery();
