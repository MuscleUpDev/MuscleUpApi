import express from 'express';
import { UserController } from './controllers/userController';
import { WorkoutController } from './controllers/workoutsController';
import session from 'express-session';
import { AuthMiddleware } from './middleware';

const cors = require('cors');
const app = express();

app.use(express.json());

const corsOptions = {
  origin: 'http://localhost:8100',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
  allowedHeaders: 'Content-Type, Authorization'
};

app.use(cors(corsOptions));

// Configuration de la session
app.use(session({
  secret: 'votre_secret_de_session', // Mettez ici une chaîne de caractères secrète
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // Mettez true si vous utilisez HTTPS
}));

app.post('/register', UserController.register);
app.post('/login', UserController.login);
app.post('/logout', UserController.logout);

// Routes protégées par la session
app.get('/workouts/:userId', AuthMiddleware.requireAuth, WorkoutController.getWorkoutsByUser);
app.post('/workouts', AuthMiddleware.requireAuth, WorkoutController.createWorkout);

const port = 3000;
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});