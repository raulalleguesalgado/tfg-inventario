// Corrección mínima C10: respuestas con el formato { success, data, error, message }.

import * as authService from '../services/auth.service.js';

export const register = async (req, res, next) => {
  try {
    const user = await authService.register(req.body);
    res.status(201).json({ success: true, data: user, error: null, message: 'User registered' });
  } catch (error) {
    res.status(400).json({ success: false, data: null, error: error.message, message: error.message });
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    res.status(200).json({ success: true, data: result, error: null, message: 'Login successful' });
  } catch (error) {
    res.status(401).json({ success: false, data: null, error: error.message, message: error.message });
  }
};
