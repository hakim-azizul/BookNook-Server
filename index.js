import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { MongoClient } from 'mongodb';

// initialized
const app = express();
const port = process.env.PORT || 5000;

// middlewars
app.use(express.json())
app.use(cors());

const mongoDbUri = process.env.MONGODB_URI
const client = new MongoClient(mongoDbUri || `mongodb://${process.env.MONGODB_USER}:${process.env.MONGODB_PASS}@ac-vwgi4dy-shard-00-00.yleslu4.mongodb.net:27017,ac-vwgi4dy-shard-00-01.yleslu4.mongodb.net:27017,ac-vwgi4dy-shard-00-02.yleslu4.mongodb.net:27017/?ssl=true&replicaSet=atlas-ydwn0o-shard-0&authSource=admin`);

export async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("You successfully connected to MongoDB!");
    return client;
  } catch (err) {
    console.dir(err);
  }
}
connectToMongoDB()

app.get('/', (req, res) => {
  res.send({msg: 'BookNook server is running'});
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});