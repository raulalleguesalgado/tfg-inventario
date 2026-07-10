import client from './client';

export const login = async (email, password) => {
  const { data } = await client.post('/auth/login', { email, password });
  localStorage.setItem('token', data.data.token);
  return data.data.user;
};

export const register = async (name, email, password) => {
  await client.post('/auth/register', { name, email, password });
};

export const logout = () => {
  localStorage.removeItem('token');
};

export const getCurrentUser = () => {
  const token = localStorage.getItem('token');
  if (!token) return null;
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload));
  } catch (e) {
    return null;
  }
};
