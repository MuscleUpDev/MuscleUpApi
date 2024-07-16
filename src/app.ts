import express from 'express';
import { UserController } from './controllers/userController';

const app = express();

app.use(express.json());

app.post('/register', UserController.register);
app.get('/login', UserController.login);


const port = 3000;
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
