import * as userService from '../services/user.service.js';

export const getAll = async (req, res, next) => {
  try {
    const users = await userService.getAll();
    res.status(200).json({
      success: true,
      data: users,
      message: 'Users retrieved successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const getById = async (req, res, next) => {
  try {
    const user = await userService.getById(req.params.id);
    res.status(200).json({
      success: true,
      data: user,
      message: 'User retrieved successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const update = async (req, res, next) => {
  try {
    const updatedUser = await userService.update(req.params.id, req.body);
    res.status(200).json({
      success: true,
      data: updatedUser,
      message: 'User updated successfully',
    });
  } catch (error) {
    next(error);
  }
};
