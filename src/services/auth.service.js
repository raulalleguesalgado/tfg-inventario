import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import * as userRepository from '../repositories/user.repository.js';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

export const register = async (userData) => {
  const existingUser = await userRepository.findByEmail(userData.email);
  if (existingUser) {
    throw new Error('User already exists');
  }

  const passwordHash = await bcrypt.hash(userData.password, 10);

  const user = await userRepository.create({
    name: userData.name,
    email: userData.email,
    passwordHash,
    role: userData.role,
  });

  const { passwordHash: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
};

export const login = async (email, password) => {
  const user = await userRepository.findByEmail(email);
  if (!user) {
    throw new Error('Invalid credentials');
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    throw new Error('Invalid credentials');
  }

  // CORRECCIÓN MÍNIMA C9: name añadido al payload — el frontend (Navbar) lo necesita
  // para mostrar el usuario logueado y el prompt original nunca lo incluyó (Patrón 8).
  const token = jwt.sign(
    { id: user.id, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: '1d' }
  );

  // CORRECCIÓN MÍNIMA C10: user devuelto junto al token — el frontend (AuthContext)
  // espera { token, user } (prompt 09A), el service original solo devolvía { token }.
  const { passwordHash: _, ...userWithoutPassword } = user;
  return { token, user: userWithoutPassword };
};
