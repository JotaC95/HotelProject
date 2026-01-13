import axios from 'axios';

//const BASE_URL = 'http://192.168.0.171:8000/api'; // Local LAN IP
//const BASE_URL = 'https://52f2e4c5bf65.ngrok-free.app/api'; // Ngrok Tunnel
const BASE_URL = 'https://hotel-backend-ql8r.onrender.com/api'; // Render Cloud URL

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true'
  },
});

api.interceptors.response.use(
  response => response,
  error => {
    // console.log('API Error:', error.message);
    return Promise.reject(error);
  }
);

export const setAuthToken = (token: string | null) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Token ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

export default api;