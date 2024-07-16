import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config(); 

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const JWT_SECRET = process.env.JWT_SECRET as string;

  if (!authHeader) {
    return res.status(401).json({ error: 'Unauthorized, missing token' });
  }

  const token = authHeader.split(' ')[1];

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      console.error('Error verifying token:', err);
      return res.status(401).json({ error: 'Unauthorized, invalid token' });
    }

    // Décode le token et l'ajoute à l'objet de requête pour une utilisation future
    (req as any).userId = (decoded as any).userId;
    next();
  });
}
