import React, { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";

export default function CreateRecurring() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [formData, setFormData] = useState({
    depot_id: "",
    route_id: "",
    schedule_code_prefix: "",
    start_date: "",
    end_date: "",
    departure_time: "",
    expected_arrival_time: "",
    schedule_type: "Regular",
    recurring_pattern: "daily", // daily, weekly, monthly
    days_of_week: [], // for weekly pattern
    frequency: 1, // every N days/weeks/months
    status: "Scheduled"
  });

  const [depots, setDepots] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [previewSchedules, setPreviewSchedules] = useState([]);
  const [showPreview, setShowPreview] = useState(false);

  // Alert system
  const [alertConfig, setAlertConfig] = useState({
    isOpen: false,
    message: "",
    type: "success",
  });

  const showAlert = (message, type = "success") => {
    setAlertConfig({ isOpen: true, message, type });
    setTimeout(() => {
      setAlertConfig((prev) => ({ ...prev, isOpen: false }));
    }, 4500);
  };

  // Load depots and routes
  useEffect(() => {
    fetchDepots();
    fetchRoutes();
  }, []);

  const fetchDepots = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/depots");
      const data = await response.json();
      if (Array.isArray(data)) {
        setDepots(data);
      }
    } catch (error) {
      console.error("Error fetching depots:", error);
      showAlert("Failed to load depots", "error");
    }
  };

  const fetchRoutes = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/routes");
      const data = await response.json();
      console.log('Routes fetched:', data);
      if (Array.isArray(data)) {
        setRoutes(data);
      }
    } catch (error) {
      console.error("Error fetching routes:", error);
      showAlert("Failed to load routes", "error");
    }
  };

  const generateScheduleCode = (prefix, date, index) => {
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    return `${prefix}_${dateStr}_${String(index + 1).padStart(3, '0')}`;
  };

  const generateRecurringDates = () => {
    const dates = [];
    const startDate = new Date(formData.start_date);
    const endDate = new Date(formData.end_date);
    const frequency = parseInt(formData.frequency);

    let currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      if (formData.recurring_pattern === "daily") {
        dates.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + frequency);
      } else if (formData.recurring_pattern === "weekly") {
        // If specific days are selected
        if (formData.days_of_week.length > 0) {
          const dayOfWeek = currentDate.getDay();
          if (formData.days_of_week.includes(dayOfWeek)) {
            dates.push(new Date(currentDate));
          }
          currentDate.setDate(currentDate.getDate() + 1);
        } else {
          dates.push(new Date(currentDate));
          currentDate.setDate(currentDate.getDate() + (7 * frequency));
        }
      } else if (formData.recurring_pattern === "monthly") {
        dates.push(new Date(currentDate));
        currentDate.setMonth(currentDate.getMonth() + frequency);
      }

      // Safety check to prevent infinite loops
      if (dates.length > 365) break;
    }

    return dates;
  };

  const handlePreview = () => {
    if (!formData.start_date || !formData.end_date) {
      showAlert("Please select start and end dates", "error");
      return;
    }

    const dates = generateRecurringDates();
    const schedules = dates.map((date, index) => ({
      schedule_code: generateScheduleCode(formData.schedule_code_prefix, date, index),
      schedule_date: date.toISOString().slice(0, 10),
      departure_time: formData.departure_time,
      expected_arrival_time: formData.expected_arrival_time,
      status: formData.status
    }));

    setPreviewSchedules(schedules);
    setShowPreview(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const dates = generateRecurringDates();
      const schedules = dates.map((date, index) => ({
        depot_id: formData.depot_id,
        route_id: formData.route_id,
        schedule_code: generateScheduleCode(formData.schedule_code_prefix, date, index),
        schedule_date: date.toISOString().slice(0, 10),
        schedule_type: formData.schedule_type,
        departure_time: formData.departure_time,
        expected_arrival_time: formData.expected_arrival_time,
        status: formData.status
      }));

      const response = await fetch("http://localhost:5000/api/schedules/bulk-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schedules })
      });

      const result = await response.json();

      if (response.ok) {
        showAlert(`Successfully created ${schedules.length} recurring schedules!`, "success");
        // Reset form
        setFormData({
          depot_id: "",
          route_id: "",
          schedule_code_prefix: "",
          start_date: "",
          end_date: "",
          departure_time: "",
          expected_arrival_time: "",
          schedule_type: "Regular",
          recurring_pattern: "daily",
          days_of_week: [],
          frequency: 1,
          status: "Scheduled"
        });
        setShowPreview(false);
        setPreviewSchedules([]);
      } else {
        showAlert("Error: " + (result.error || "Failed to create schedules"), "error");
      }
    } catch (error) {
      showAlert("Submission Error: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDayOfWeekChange = (day) => {
    const dayNumber = parseInt(day);
    const newDays = formData.days_of_week.includes(dayNumber)
      ? formData.days_of_week.filter(d => d !== dayNumber)
      : [...formData.days_of_week, dayNumber];
    
    setFormData({ ...formData, days_of_week: newDays });
  };

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return (
    <div className="flex min-h-screen bg-neutral-950 text-white">
      
      {/* Alert Notification */}
      {alertConfig.isOpen && (
        <div className="fixed top-5 right-5 z-[100] max-w-sm w-[90%] sm:w-full bg-neutral-900 border rounded-xl shadow-2xl p-4 animate-fade-in-down transition-all duration-300 flex items-start gap-3 border-neutral-800">
          <div className="mt-0.5">
            {alertConfig.type === "success" ? (
              <div className="p-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            ) : (
              <div className="p-1 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            )}
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold capitalize text-white tracking-wide">
              {alertConfig.type === "success" ? "System Notification" : "Operational Alert"}
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5 leading-relaxed">{alertConfig.message}</p>
          </div>
          <button 
            onClick={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))} 
            className="text-neutral-500 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <Sidebar isOpen={isSidebarOpen} />
      <div className="flex-1 flex flex-col">
        <Navbar 
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} 
          onLogout={() => window.location.href = "/"} 
        />
        
        <div className="p-6 max-w-7xl w-full mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-wide flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              Create Recurring Schedules
            </h1>
            <p className="text-neutral-400 mt-2">Generate multiple schedules with automated recurrence patterns for efficient transit planning</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Form Section */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 space-y-6">
              <h2 className="text-xl font-bold text-white border-b border-neutral-800 pb-3">Schedule Configuration</h2>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* Basic Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-amber-500">Basic Information</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">Depot</label>
                      <select 
                        required 
                        value={formData.depot_id} 
                        onChange={(e) => setFormData({...formData, depot_id: e.target.value})}
                        className="w-full px-4 py-2 text-sm bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:ring-1 focus:ring-amber-500 focus:outline-none"
                      >
                        <option value="">Select Depot</option>
                        {depots.map(depot => (
                          <option key={depot.depot_id} value={depot.depot_id}>{depot.depot_name}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">Route</label>
                      <select 
                        required 
                        value={formData.route_id} 
                        onChange={(e) => setFormData({...formData, route_id: e.target.value})}
                        className="w-full px-4 py-2 text-sm bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:ring-1 focus:ring-amber-500 focus:outline-none"
                      >
                        <option value="">Select Route</option>
                        {routes.map(route => (
                          <option key={route.route_id} value={route.route_id}>{route.route_name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">Schedule Code Prefix</label>
                    <input 
                      type="text" 
                      required 
                      value={formData.schedule_code_prefix} 
                      onChange={(e) => setFormData({...formData, schedule_code_prefix: e.target.value})}
                      placeholder="e.g., RT001, MORNING, etc."
                      className="w-full px-4 py-2 text-sm bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:ring-1 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Timing Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-amber-500">Timing Configuration</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">Departure Time</label>
                      <input 
                        type="time" 
                        required 
                        value={formData.departure_time} 
                        onChange={(e) => setFormData({...formData, departure_time: e.target.value})}
                        className="w-full px-4 py-2 text-sm bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:ring-1 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">Expected Arrival Time</label>
                      <input 
                        type="time" 
                        required 
                        value={formData.expected_arrival_time} 
                        onChange={(e) => setFormData({...formData, expected_arrival_time: e.target.value})}
                        className="w-full px-4 py-2 text-sm bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:ring-1 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Recurrence Pattern */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-amber-500">Recurrence Pattern</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">Start Date</label>
                      <input 
                        type="date" 
                        required 
                        value={formData.start_date} 
                        onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                        className="w-full px-4 py-2 text-sm bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:ring-1 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">End Date</label>
                      <input 
                        type="date" 
                        required 
                        value={formData.end_date} 
                        onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                        className="w-full px-4 py-2 text-sm bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:ring-1 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">Pattern</label>
                      <select 
                        value={formData.recurring_pattern} 
                        onChange={(e) => setFormData({...formData, recurring_pattern: e.target.value})}
                        className="w-full px-4 py-2 text-sm bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:ring-1 focus:ring-amber-500 focus:outline-none"
                      >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-semibold text-amber-500 uppercase mb-1.5 tracking-wider">Frequency</label>
                      <input 
                        type="number" 
                        min="1" 
                        max="30" 
                        value={formData.frequency} 
                        onChange={(e) => setFormData({...formData, frequency: e.target.value})}
                        placeholder="Every N days/weeks/months"
                        className="w-full px-4 py-2 text-sm bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:ring-1 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {formData.recurring_pattern === "weekly" && (
                    <div>
                      <label className="block text-xs font-semibold text-amber-500 uppercase mb-2 tracking-wider">Days of Week (Optional)</label>
                      <div className="grid grid-cols-4 gap-2">
                        {dayNames.map((day, index) => (
                          <label key={index} className="flex items-center space-x-2 text-sm">
                            <input
                              type="checkbox"
                              checked={formData.days_of_week.includes(index)}
                              onChange={() => handleDayOfWeekChange(index)}
                              className="rounded border-neutral-700 bg-neutral-950 text-amber-500 focus:ring-amber-500 focus:ring-1"
                            />
                            <span className="text-neutral-300">{day.slice(0, 3)}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4 pt-6 border-t border-neutral-800">
                  <button
                    type="button"
                    onClick={handlePreview}
                    className="flex-1 bg-neutral-700 hover:bg-neutral-600 text-white font-medium px-6 py-3 rounded-lg transition-colors"
                  >
                    Preview Schedules
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 text-neutral-950 font-bold px-6 py-3 rounded-lg shadow-md hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {loading ? "Creating..." : "Create Schedules"}
                  </button>
                </div>
              </form>
            </div>

            {/* Preview Section */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
              <h2 className="text-xl font-bold text-white border-b border-neutral-800 pb-3 mb-4">
                Schedule Preview
                {previewSchedules.length > 0 && (
                  <span className="text-sm text-amber-500 ml-2">({previewSchedules.length} schedules)</span>
                )}
              </h2>
              
              {showPreview && previewSchedules.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {previewSchedules.slice(0, 10).map((schedule, index) => (
                    <div key={index} className="bg-neutral-950 border border-neutral-800 rounded-lg p-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-mono text-amber-400 text-sm">{schedule.schedule_code}</div>
                          <div className="text-xs text-neutral-400">{schedule.schedule_date}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-white">{schedule.departure_time} → {schedule.expected_arrival_time}</div>
                          <div className="text-xs text-emerald-400">{schedule.status}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {previewSchedules.length > 10 && (
                    <div className="text-center text-neutral-500 text-sm py-2">
                      ... and {previewSchedules.length - 10} more schedules
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-neutral-500 py-12">
                  <svg className="w-16 h-16 mx-auto mb-4 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p>Configure your schedule settings and click "Preview Schedules" to see the generated schedule list</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}