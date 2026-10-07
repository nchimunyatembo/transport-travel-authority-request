const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

const roleToApp = {
  officer: 'APPLICANT',
  recommender: 'RECOMMENDER',
  boss: 'APPROVER',
  delegate: 'ADMIN'
};

const roleToDatabase = {
  APPLICANT: 'officer',
  RECOMMENDER: 'recommender',
  APPROVER: 'Boss',
  ADMIN: 'delegate'
};

const formatUser = (user) => ({
  id: user.id,
  full_name: user.name,
  email: user.email,
  role: roleToApp[user.role.toLowerCase()] || 'APPLICANT',
  department: null
});

// 1. REGISTER NEW USER
exports.register = async (req, res, next) => {
  try {
    const { full_name, email, password, role = 'APPLICANT' } = req.body;

    if (!full_name || !email || !password) {
      return res.status(400).json({ message: 'Full name, email, and password are required.' });
    }
    if (password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
      return res.status(400).json({ message: 'Password must be 8 to 72 bytes long.' });
    }
    if (!roleToDatabase[role]) {
      return res.status(400).json({ message: 'Role must be APPLICANT, RECOMMENDER, APPROVER, or ADMIN.' });
    }

    // Check if user already exists
    const [existingUsers] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUsers.length > 0) {
      return res.status(409).json({ message: 'User with this email already exists.' });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const insertQuery = `
      INSERT INTO users (name, email, password, role, approval_status)
      VALUES (?, ?, ?, ?, 'approved')
    `;
    const [result] = await db.query(insertQuery, [
      full_name,
      email,
      hashedPassword,
      roleToDatabase[role]
    ]);

    res.status(201).json({
      message: 'User registered successfully',
      userId: result.insertId
    });
  } catch (error) {
    next(error);
  }
};

// 2. USER LOGIN
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate request body
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    // Find user by email
    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const user = users[0];

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    // Generate JWT Token
    const jwtSecret = process.env.JWT_SECRET || 'your_fallback_secret_key';
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: formatUser(user).role
      },
      jwtSecret,
      { expiresIn: '8h' } // Token valid for 8 hours
    );

    // Return user info and token (exclude password)
    res.json({
      message: 'Login successful',
      token,
      user: formatUser(user)
    });
  } catch (error) {
    next(error);
  }
};

// 3. GET CURRENT USER PROFILE
exports.getProfile = async (req, res, next) => {
  try {
    // req.user.id comes from the auth middleware after verifying the JWT
    const userId = req.user.id;

    const [users] = await db.query(
      'SELECT id, name, email, role, created_at FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.json({ user: formatUser(users[0]) });
  } catch (error) {
    next(error);
  }
};

exports.getUsers = async (req, res, next) => {
  try {
    const [users] = await db.query(
      'SELECT id, name, email, role, approval_status, created_at FROM users ORDER BY name'
    );
    res.json({
      users: users.map((user) => ({
        ...formatUser(user),
        approval_status: user.approval_status,
        created_at: user.created_at
      }))
    });
  } catch (error) {
    next(error);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { password } = req.body;
    if (typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
      return res.status(400).json({ message: 'Password must be 8 to 72 bytes long.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      'UPDATE users SET password = ? WHERE id = ?',
      [hashedPassword, req.params.id]
    );
    if (!result.affectedRows) {
      return res.status(404).json({ message: 'Staff account not found.' });
    }

    res.json({ message: 'Password reset successfully.' });
  } catch (error) {
    next(error);
  }
};

exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (typeof currentPassword !== 'string' || !currentPassword) {
      return res.status(400).json({ message: 'Current password is required.' });
    }
    if (typeof newPassword !== 'string' || newPassword.length < 8 || Buffer.byteLength(newPassword, 'utf8') > 72) {
      return res.status(400).json({ message: 'New password must be 8 to 72 bytes long.' });
    }

    const [users] = await db.query('SELECT password FROM users WHERE id = ?', [req.user.id]);
    if (!users.length) return res.status(404).json({ message: 'User not found.' });
    if (!(await bcrypt.compare(currentPassword, users[0].password))) {
      return res.status(401).json({ message: 'Current password is incorrect.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, req.user.id]);
    res.json({ message: 'Password changed successfully.' });
  } catch (error) {
    next(error);
  }
};