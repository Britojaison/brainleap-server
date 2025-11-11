import { getUserProfile } from '../services/userService.js';
import { successResponse } from '../utils/responseHelper.js';

export const getProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const profile = await getUserProfile(userId);
    successResponse(res, profile);
  } catch (error) {
    next(error);
  }
};
