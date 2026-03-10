import axios from 'axios';
const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL || 'http://localhost:3001';
const PAYMENT_URL = process.env.NEXT_PUBLIC_PAYMENT_URL || 'http://localhost:3002';
const NOTIFICATION_URL = process.env.NEXT_PUBLIC_NOTIFICATION_URL || 'http://localhost:3003';
const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('token') : null;
const h = () => ({ Authorization: 'Bearer ' + getToken() });
export const authAPI = {
  register: (d) => axios.post(AUTH_URL + '/api/auth/register', d),
  login: (d) => axios.post(AUTH_URL + '/api/auth/login', d),
  me: () => axios.get(AUTH_URL + '/api/auth/me', { headers: h() }),
};
export const paymentAPI = {
  create: (d) => axios.post(PAYMENT_URL + '/api/payment', d, { headers: h() }),
  myPayments: () => axios.get(PAYMENT_URL + '/api/payment/my', { headers: h() }),
};
export const notificationAPI = {
  byUser: (id) => axios.get(NOTIFICATION_URL + '/api/notification/user/' + id),
};
