const mysql = require("mysql2/promise");

// 🗄️ Database Connection Configuration Pool
const dbPool = mysql.createPool({
    host: "localhost",
    user: "root",
    password: "",
    database: "your_database_name", 
    waitForConnections: true,
    connectionLimit: 10
});

/**
 * 🚀 Core Automated Timetable Generator Engine
 * Generates bulk row schedules within the master schedule table based on a template rule.
 */
const createRecurringSchedules = async (req, res) => {
    const connection = await dbPool.getConnection();
    
    try {
        // Start Database Transaction to guarantee data integrity across bulk injections
        await connection.beginTransaction();

        const {
            schedule_code_prefix,
            depot_id,
            route_id,
            schedule_type,
            departure_time,
            expected_arrival_time,
            recurrence_type,
            recurrence_value,
            start_date,
            end_date
        } = req.body;

        // 1. Persist master template configurations to 'schedule_templates'
        const insertTemplateQuery = `
            INSERT INTO schedule_templates 
            (schedule_code_prefix, depot_id, route_id, schedule_type, departure_time, expected_arrival_time, recurrence_type, recurrence_value, start_date, end_date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const [templateResult] = await connection.execute(insertTemplateQuery, [
            schedule_code_prefix, 
            depot_id || null, 
            route_id || null, 
            schedule_type || 'Standard', 
            departure_time, 
            expected_arrival_time, 
            recurrence_type, 
            recurrence_value || null, 
            start_date, 
            end_date
        ]);
        
        const templateId = templateResult.insertId;
        
        // Generate a distinct cluster Batch ID for atomic structural updates or batch rollbacks
        const recurringGroupId = `GRP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        // 2. Date Projection Engine Loop
        const schedulesToInsert = [];
        let currentLoopDate = new Date(start_date);
        const finalEndDate = new Date(end_date);
        const targetDays = recurrence_value ? recurrence_value.split(",").map(Number) : [];

        while (currentLoopDate <= finalEndDate) {
            let shouldGenerate = false;
            const formattedDateStr = currentLoopDate.toISOString().split("T")[0]; // Outputs YYYY-MM-DD

            if (recurrence_type === "Daily") {
                shouldGenerate = true;
            } 
            else if (recurrence_type === "Weekly") {
                let jsDay = currentLoopDate.getDay();
                let customDayValue = jsDay === 0 ? 7 : jsDay; // Convert JS Sunday (0) to System Sunday (7)
                if (targetDays.includes(customDayValue)) {
                    shouldGenerate = true;
                }
            } 
            else if (recurrence_type === "Monthly") {
                let currentDayOfMonth = currentLoopDate.getDate();
                if (targetDays.includes(currentDayOfMonth)) {
                    shouldGenerate = true;
                }
            }

            if (shouldGenerate) {
                // Compose dynamic operational system codes per entry (e.g., ROUTE10-AM-20260615)
                const uniqueScheduleCode = `${schedule_code_prefix}-${formattedDateStr.replace(/-/g, "")}`;
                
                // Align nested array explicitly to your production table structure maps:
                // [template_id, recurring_group_id, depot_id, route_id, schedule_code, schedule_date, schedule_type, departure_time, expected_arrival_time, status]
                schedulesToInsert.push([
                    templateId,
                    recurringGroupId,
                    depot_id || null,
                    route_id || null,
                    uniqueScheduleCode,
                    formattedDateStr, // maps directly to schedule_date field
                    schedule_type || 'Standard',
                    departure_time,
                    expected_arrival_time,
                    'Scheduled' // default state status configuration
                ]);
            }

            // Move pointer forward to the next calendar day
            currentLoopDate.setDate(currentLoopDate.getDate() + 1);
        }

        // Interrupt matrix operations if the timeframe parameters yield no target validation matches
        if (schedulesToInsert.length === 0) {
            await connection.rollback();
            return res.status(400).json({ error: "No operational dates matched the selected pattern in this date range." });
        }

        // 3. Batch insert structural array block directly to production 'schedule' table
        const insertSchedulesQuery = `
            INSERT INTO schedule 
            (template_id, recurring_group_id, depot_id, route_id, schedule_code, schedule_date, schedule_type, departure_time, expected_arrival_time, status)
            VALUES ?
        `;
        
        await connection.query(insertSchedulesQuery, [schedulesToInsert]);

        // Commit all changes atomically to database records
        await connection.commit();
        
        res.json({ 
            message: `Batch generation successful! Created ${schedulesToInsert.length} automated schedule records in your master table.` 
        });

    } catch (err) {
        // Rollback mutations if execution fails at any step
        await connection.rollback();
        console.error("Database Engine Execution Failure Exception Handling:", err);
        res.status(500).json({ error: "Operational timetable matrix processing failed." });
    } finally {
        connection.release();
    }
};

module.exports = {
    createRecurringSchedules
};