import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import db from '../config/db';
import { User } from '../models/user';
import { RowDataPacket } from 'mysql2';

const saltRounds = 10;
const JWT_SECRET = 'your_jwt_secret'; // Remplacez par une chaîne aléatoire plus sécurisée

export class UserController {
  static async register(req: Request, res: Response) {
    const { username, password } = req.body;

    try {
      if (!password) {
        throw new Error('Password is required');
      }

      db.query('SELECT * FROM users WHERE username = ?', [username], async (err, results: RowDataPacket[]) => {
        if (err) {
          console.error('Error checking existing user:', err);
          return res.status(500).json({ error: 'Internal server error' });
        }

        if (results.length > 0) {
          return res.status(400).json({ error: 'Username already exists' });
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
      });
    } catch (error) {
      console.error('Error registering user:', error);
      res.status(500).json({ error: 'Error registering user' });
    }
  }

  static async login(req: Request, res: Response) {
    const { username, password } = req.body;

    db.query('SELECT * FROM users WHERE username = ?', [username], async (err, results: RowDataPacket[]) => {
      if (err) {
        console.error('Error logging in:', err);
        res.status(500).json({ error: 'Internal server error' });
        return;
      }

      if (results.length === 0) {
        res.status(401).json({ error: 'Username or password incorrect' });
        return;
      }

      const fetchedUser = results[0];
      const user: User = {
        id: fetchedUser.id,
        username: fetchedUser.username,
        password: fetchedUser.password
      };

      const passwordMatch = await bcrypt.compare(password, user.password);

      if (!passwordMatch) {
        res.status(401).json({ error: 'Username or password incorrect' });
        return;
      }

      // Générer un token JWT
      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '1h' });

      // Envoyer le token dans la réponse
      res.status(200).json({ message: 'Login successful', token });
    });
  }

  static logout(req: Request, res: Response) {
    // Pour JWT, la déconnexion se fait côté client en supprimant le token côté client
    // Vous pouvez renvoyer une confirmation de déconnexion ici si nécessaire
    res.status(200).json({ message: 'Logout successful' });
  }
}
