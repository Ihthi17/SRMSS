// Quick script to create sample trips for testing the trip management
const db = require('./src/config/db');

async function createSampleTrips() {
  try {
    console.log('Creating sample trips for testing...');

    // Get existing schedule, vehicle, driver data
    const [schedules] = await db.query('SELECT schedule_id, schedule_code, schedule_date FROM schedules LIMIT 5');
    const [vehicles] = await db.query('SELECT vehicle_id FROM vehicles LIMIT 5');
    const [drivers] = await db.query('SELECT driver_id FROM drivers LIMIT 5');

    if (schedules.length === 0) {
      console.log('No schedules found. Please create schedules first using create-sample-schedules.js');
      process.exit(0);
    }

    let vehicleId = vehicles.length > 0 ? vehicles[0].vehicle_id : null;
    let driverId = drivers.length > 0 ? drivers[0].driver_id : null;

    // Create sample trips
    const tripStatuses = ['Scheduled', 'In Progress', 'Completed', 'Delayed'];
    let tripCount = 0;

    for (const schedule of schedules) {
      for (let i = 0; i < 2; i++) {
        const status = tripStatuses[Math.floor(Math.random() * tripStatuses.length)];
        const passengers = Math.floor(Math.random() * 40) + 5; // 5-45 passengers
        const fuel = (Math.random() * 30 + 10).toFixed(2); // 10-40 liters
        
        // Create departure time (08:00, 14:00, 17:00)
        const departureHour = [8, 14, 17][i % 3];
        const departureTime = `${String(departureHour).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}:00`;
        
        // Create arrival time (3-4 hours later)
        const arrivalHour = departureHour + 3 + (Math.random() > 0.5 ? 1 : 0);
        const arrivalTime = `${String(arrivalHour).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}:00`;

        try {
          await db.query(`
            INSERT INTO trips (schedule_id, vehicle_id, driver_id, trip_date, departure_time, arrival_time, trip_status, passengers_count, route_distance, fuel_consumed)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            schedule.schedule_id,
            vehicleId || null,
            driverId || null,
            schedule.schedule_date || new Date().toISOString().slice(0, 10),
            departureTime,
            arrivalTime,
            status,
            passengers,
            (100 + Math.random() * 50).toFixed(2),
            fuel
          ]);
          
          tripCount++;
          console.log(`Created trip #${tripCount} for schedule ${schedule.schedule_code}`);
        } catch (err) {
          if (err.code === 'ER_DUP_ENTRY') {
            console.log(`Trip already exists, skipping...`);
          } else {
            console.error('Error creating trip:', err.message);
          }
        }
      }
    }

    console.log(`\n✅ Successfully created ${tripCount} sample trips!`);
    console.log('You can now view trips at: http://localhost:3000/trip-management');
    console.log('Depot dashboard will also show these trips at: http://localhost:3000/depot-dashboard/1');
    
  } catch (error) {
    console.error('Error creating sample trips:', error);
  } finally {
    process.exit(0);
  }
}

createSampleTrips();