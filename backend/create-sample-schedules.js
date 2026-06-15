// Quick script to create sample schedules for testing the dashboard
const db = require('./src/config/db');

async function createSampleSchedules() {
  try {
    console.log('Creating sample schedules for testing...');

    // Get existing depot and route data
    const [depots] = await db.query('SELECT depot_id FROM depots LIMIT 1');
    const [routes] = await db.query('SELECT route_id FROM routes LIMIT 1');

    if (depots.length === 0) {
      console.log('No depots found, creating a sample depot...');
      await db.query(
        'INSERT INTO depots (depot_name, location, contact_person, contact_phone, email) VALUES (?, ?, ?, ?, ?)',
        ['Main Depot', 'Colombo', 'Mohamed Iftikham', '0765502459', 'depot@srmss.com']
      );
      const [newDepots] = await db.query('SELECT depot_id FROM depots LIMIT 1');
      console.log('Created depot with ID:', newDepots[0].depot_id);
    }

    if (routes.length === 0) {
      console.log('No routes found, creating a sample route...');
      await db.query(
        'INSERT INTO routes (route_name, start_location, end_location, total_distance, is_active) VALUES (?, ?, ?, ?, ?)',
        ['Route 001', 'Colombo Fort', 'Kandy', 115.5, 1]
      );
      const [newRoutes] = await db.query('SELECT route_id FROM routes LIMIT 1');
      console.log('Created route with ID:', newRoutes[0].route_id);
    }

    // Get the IDs again
    const [finalDepots] = await db.query('SELECT depot_id FROM depots LIMIT 1');
    const [finalRoutes] = await db.query('SELECT route_id FROM routes LIMIT 1');

    const depotId = finalDepots[0].depot_id;
    const routeId = finalRoutes[0].route_id;

    // Create sample schedules for the next 7 days
    const schedules = [];
    const today = new Date();
    
    for (let i = 0; i < 7; i++) {
      const scheduleDate = new Date(today);
      scheduleDate.setDate(today.getDate() + i);
      
      // Morning schedule
      schedules.push({
        depot_id: depotId,
        route_id: routeId,
        schedule_code: `MOR_${scheduleDate.getFullYear()}${String(scheduleDate.getMonth() + 1).padStart(2, '0')}${String(scheduleDate.getDate()).padStart(2, '0')}_001`,
        schedule_date: scheduleDate.toISOString().slice(0, 10),
        schedule_type: 'Regular',
        departure_time: '08:00:00',
        expected_arrival_time: '11:30:00',
        status: i === 0 ? 'In Progress' : (i < 2 ? 'Scheduled' : 'Scheduled')
      });

      // Evening schedule
      schedules.push({
        depot_id: depotId,
        route_id: routeId,
        schedule_code: `EVE_${scheduleDate.getFullYear()}${String(scheduleDate.getMonth() + 1).padStart(2, '0')}${String(scheduleDate.getDate()).padStart(2, '0')}_002`,
        schedule_date: scheduleDate.toISOString().slice(0, 10),
        schedule_type: 'Regular',
        departure_time: '17:00:00',
        expected_arrival_time: '20:30:00',
        status: i === 0 ? 'Completed' : 'Scheduled'
      });
    }

    // Insert schedules
    for (const schedule of schedules) {
      try {
        await db.query(
          'INSERT INTO schedules (depot_id, route_id, schedule_code, schedule_date, schedule_type, departure_time, expected_arrival_time, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [schedule.depot_id, schedule.route_id, schedule.schedule_code, schedule.schedule_date, schedule.schedule_type, schedule.departure_time, schedule.expected_arrival_time, schedule.status]
        );
        console.log(`Created schedule: ${schedule.schedule_code}`);
      } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          console.log(`Schedule ${schedule.schedule_code} already exists, skipping...`);
        } else {
          console.error('Error creating schedule:', err.message);
        }
      }
    }

    console.log('Sample schedules created successfully!');
    console.log('You can now test the depot dashboard at: http://localhost:3000/depot-dashboard/1');
    
  } catch (error) {
    console.error('Error creating sample schedules:', error);
  } finally {
    process.exit(0);
  }
}

createSampleSchedules();