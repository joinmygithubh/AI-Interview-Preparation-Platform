import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';

import User from '../models/User.js';
import auth from '../middleware/auth.js';
import generateToken from '../utils/generateToken.js';
import asyncHandler from '../utils/asyncHandler.js';

const router = Router();

const SALT_ROUNDS = 12;

/**
 * Run express-validator checks and return a 400 with the collected messages
 * when validation fails. Returns true when the request is valid.
 */
const handleValidation = (req, res) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return true;

  res.status(400).json({
    success: false,
    message: errors
      .array()
      .map((e) => e.msg)
      .join(', '),
    errors: errors.array(),
  });
  return false;
};

/**
 * POST /api/auth/register
 * Validate input, hash the password (bcrypt, salt rounds 12), create the user,
 * and return the user with a freshly signed JWT.
 */
router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
  ],
  asyncHandler(async (req, res) => {
    if (!handleValidation(req, res)) return;

    const { name, email, password } = req.body;

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // Duplicate emails surface as a Mongo 11000 error -> handled (409) by the
    // global error handler.
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      data: { user, token },
      message: 'Registration successful',
    });
  })
);

/**
 * POST /api/auth/login
 * Verify credentials, update lastLoginAt, and return the user with a JWT.
 */
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  asyncHandler(async (req, res) => {
    if (!handleValidation(req, res)) return;

    const { email, password } = req.body;

    // password is select:false, so explicitly include it for comparison.
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: 'Invalid email or password' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, message: 'Invalid email or password' });
    }

    user.lastLoginAt = new Date();
    await user.save();

    const token = generateToken(user._id);

    // toJSON strips the password hash from the response.
    res.json({
      success: true,
      data: { user, token },
      message: 'Login successful',
    });
  })
);

/**
 * GET /api/auth/me
 * Return the authenticated user.
 */
router.get(
  '/me',
  auth,
  asyncHandler(async (req, res) => {
    res.json({ success: true, data: req.user });
  })
);

/**
 * PUT /api/auth/profile
 * Update name, targetRole and/or experienceLevel for the authenticated user.
 */
router.put(
  '/profile',
  auth,
  [
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
    body('targetRole').optional().trim(),
    body('experienceLevel')
      .optional()
      .isIn(['junior', 'mid', 'senior'])
      .withMessage('experienceLevel must be junior, mid or senior'),
  ],
  asyncHandler(async (req, res) => {
    if (!handleValidation(req, res)) return;

    const { name, targetRole, experienceLevel } = req.body;
    const { user } = req;

    if (name !== undefined) user.name = name;
    if (targetRole !== undefined) user.targetRole = targetRole;
    if (experienceLevel !== undefined) user.experienceLevel = experienceLevel;

    await user.save();

    res.json({
      success: true,
      data: user,
      message: 'Profile updated',
    });
  })
);

export default router;
