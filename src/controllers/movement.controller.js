import * as movementService from '../services/movement.service.js';

export const registerMovement = async (req, res, next) => {
  try {
    const movement = await movementService.register({
      ...req.body,
      userId: req.user.id, // Assuming userId comes from auth middleware
    });

    res.status(201).json({
      success: true,
      data: movement,
      error: null,
      message: 'Stock movement recorded successfully',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      data: null,
      error: error.message,
      message: 'Failed to record movement',
    });
  }
};

export const getByProduct = async (req, res, next) => {
  try {
    const movements = await movementService.getByProduct(req.params.id);

    res.status(200).json({
      success: true,
      data: movements,
      error: null,
      message: 'Movements retrieved successfully',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      data: null,
      error: error.message,
      message: 'Failed to retrieve movements',
    });
  }
};
