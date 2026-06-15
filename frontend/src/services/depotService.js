const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

class DepotService {
  async getAllDepots() {
    try {
      const response = await fetch(`${API_BASE_URL}/depots`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching depots:', error);
      throw error;
    }
  }

  async getAllDepotsWithStats() {
    try {
      const response = await fetch(`${API_BASE_URL}/depots/with-stats`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching depots with stats:', error);
      throw error;
    }
  }

  async getDepotDashboard(depotId) {
    try {
      const response = await fetch(`${API_BASE_URL}/depots/dashboard/${depotId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching depot dashboard:', error);
      throw error;
    }
  }

  async createDepot(depotData) {
    try {
      const response = await fetch(`${API_BASE_URL}/depots`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(depotData),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || `HTTP error! status: ${response.status}`);
      }
      
      return result;
    } catch (error) {
      console.error('Error creating depot:', error);
      throw error;
    }
  }

  async updateDepot(depotId, depotData) {
    try {
      const response = await fetch(`${API_BASE_URL}/depots/${depotId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(depotData),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || `HTTP error! status: ${response.status}`);
      }
      
      return result;
    } catch (error) {
      console.error('Error updating depot:', error);
      throw error;
    }
  }

  async deleteDepot(depotId) {
    try {
      const response = await fetch(`${API_BASE_URL}/depots/${depotId}`, {
        method: 'DELETE',
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || `HTTP error! status: ${response.status}`);
      }
      
      return result;
    } catch (error) {
      console.error('Error deleting depot:', error);
      throw error;
    }
  }
}

export default new DepotService();