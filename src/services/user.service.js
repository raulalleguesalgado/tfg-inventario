import * as userRepository from '../repositories/user.repository.js';

export const getAll = async () => {
  return await userRepository.findAll();
};

export const getById = async (id) => {
  const user = await userRepository.findById(id);
  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }
  return user;
};

export const update = async (id, updateData) => {
  await getById(id);
  return await userRepository.update(id, updateData);
};
