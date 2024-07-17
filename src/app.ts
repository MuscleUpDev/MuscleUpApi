import express from 'express';
import { UserController } from './controllers/userController';
const cors = require('cors');
const app = express();

app.use(express.json());
app.use(cors());

app.post('/register', UserController.register);
app.post('/login', UserController.login);


const port = 3000;
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
