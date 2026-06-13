import axios from "axios";

const API = "http://localhost:5000/api";

export const login = (data) => {
  return axios.post(`${API}/auth/login`, data);
};