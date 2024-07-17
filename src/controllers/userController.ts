import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import db from '../config/db';
import { User } from '../models/user';
import { RowDataPacket } from 'mysql2';

const saltRounds = 10;
const JWT_SECRET = process.env.JWT_SECRET as string;

export class UserController {
  static async register(req: Request, res: Response) {
    const { username, password } = req.body;

    try {
      if (!password) {
        throw new Error('Password is required');
      }

      const hashedPassword = await bcrypt.hash(password, saltRounds);

      const newUser: User = {
        username,
        password: hashedPassword
      };

      db.query('INSERT INTO users SET ?', newUser, (err, results) => {
        if (err) {
          console.error('Error registering user:', err);
          return res.status(500).json({ error: 'Internal server error' });
        }
        console.log('User registered successfully');
        res.status(201).json({ message: 'User registered successfully' });
      });

    } catch (error) {
      console.error('Error registering user:', error);
      res.status(500).json({ error: 'Error registering user' });
    }
  }

  static async login(req: Request, res: Response) {
    const { username, password } = req.body;
    console.log(req.body)

    console.log(username)
    console.log(password)

    try {
      db.query('SELECT * FROM users WHERE username = ?', [username], async (err, results: RowDataPacket[]) => {
        if (err) {
          console.error('Error logging in:', err);
          return res.status(500).json({ error: 'Internal server error' });
        }
  
        console.log('Query results:', results);
  
        if (results.length === 0) {
          console.log('User not found');
          return res.status(401).json({ error: 'Username or password incorrect' });
        }
  
        const fetchedUser = results[0];
        const user: User = {
          id: fetchedUser.id,
          username: fetchedUser.username,
          password: fetchedUser.password
        };
  
        const passwordMatch = await bcrypt.compare(password, user.password);
  
        if (!passwordMatch) {
          console.log('Password does not match');
          return res.status(401).json({ error: 'Username or password incorrect' });
        }
  
        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '1h' });
  
        res.status(200).json({ message: 'Login successful', token });
      });
    } catch (error) {
      console.error('Error logging in:', error);
      res.status(500).json({ error: 'Error logging in' });
    }
  }

  static logout(req: Request, res: Response) {
    res.status(200).json({ message: 'Logout successful' });
  }
}
