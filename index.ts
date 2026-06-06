import express from 'express';
import dotenv from 'dotenv';
dotenv.config();
import cors from 'cors';
import routes from './routes/index.route';


const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: "*"
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/health", (req, res) => {
  res.status(200).send("Server is healthy");
});



app.use("/api", routes);


app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});