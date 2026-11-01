import express from "express";
import cors from "cors";
import "dotenv/config";
import { MongoClient, ObjectId } from "mongodb";

// initialized
const app = express();
const port = process.env.PORT || 5000;

// middlewars
app.use(express.json());
app.use(cors());

const mongoDbUri = process.env.MONGODB_URI;
const client = new MongoClient(
  mongoDbUri ||
    `mongodb://${process.env.MONGODB_USER}:${process.env.MONGODB_PASS}@ac-vwgi4dy-shard-00-00.yleslu4.mongodb.net:27017,ac-vwgi4dy-shard-00-01.yleslu4.mongodb.net:27017,ac-vwgi4dy-shard-00-02.yleslu4.mongodb.net:27017/?ssl=true&replicaSet=atlas-ydwn0o-shard-0&authSource=admin`,
);

export async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("You successfully connected to MongoDB!");
    return client;
  } catch (err) {
    console.dir(err);
  }
}
const mongoClient = await connectToMongoDB();
if (!mongoClient) {
  console.error("Failed to connect to MongoDB. Exiting.");
  process.exit(1);
}

const database = mongoClient.db("book-nook");
const booksCollection = database.collection("allBooks");
const borrowsCollection = database.collection("borrows");

app.get("/", (req, res) => {
  res.send({ msg: "BookNook server is running" });
});

app.post("/add-book", async (req, res) => {
  const newBook = req.body ?? {};
  const result = await booksCollection.insertOne(newBook);
  res.send({ result });
});

app.get("/allBooks", async (req, res) => {
  const cursor = booksCollection.find({});
  const books = await cursor.toArray();
  res.send(books);
});

app.get("/new-arrivals", async (req, res) => {
  try {
    const books = await booksCollection.find({}).toArray();
    const latestBooks = books.reverse().slice(0, 12);
    res.send(latestBooks);
  } catch (error) {
    res.status(500).send({ message: "Failed to fetch new arrivals", error });
  }
});

app.get("/allBooks/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid book ID format" });
    }
    const result = await booksCollection.findOne({ _id: new ObjectId(id) });
    if (!result) {
      return res.status(404).json({ error: "Book not found" });
    }
    res.send(result);
  } catch (error) {
    console.error("Database Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/borrow", async (req, res) => {
  try {
    const { bookId, userEmail, title, image, author } = req.body;
    const existingBorrow = await borrowsCollection.findOne({
      bookId,
      userEmail,
    });
    if (existingBorrow) {
      return res.status(400).json({
        error:
          "You have already borrowed this book and haven't returned it yet!",
      });
    }
    const book = await booksCollection.findOne({ _id: new ObjectId(bookId) });
    if (!book) {
      return res.status(404).json({ error: "Book not found" });
    }
    const currentQuantity = parseInt(book.quantity || "0", 10);
    if (currentQuantity <= 0) {
      return res
        .status(400)
        .json({ error: "Sorry, no copies available for borrowing right now." });
    }
    await booksCollection.updateOne(
      { _id: new ObjectId(bookId) },
      { $set: { quantity: (currentQuantity - 1).toString() } },
    );
    const borrowRecord = {
      bookId,
      userEmail,
      title,
      image,
      author,
      borrowDate: new Date(),
    };
    const result = await borrowsCollection.insertOne(borrowRecord);
    res.status(200).json({ message: "Book borrowed successfully!", result });
  } catch (error) {
    console.error("Borrow Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/borrow/:email", async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email);
    const result = await borrowsCollection.find({ userEmail: email }).toArray();
    res.status(200).json(result);
  } catch (error) {
    console.error("Fetch Borrows Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.delete("/borrows/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid record ID" });
    }
    const borrowRecord = await borrowsCollection.findOne({
      _id: new ObjectId(id),
    });
    if (!borrowRecord) {
      return res.status(404).json({ error: "Borrow record not found" });
    }
    await borrowsCollection.deleteOne({ _id: new ObjectId(id) });
    const book = await booksCollection.findOne({
      _id: new ObjectId(borrowRecord.bookId),
    });
    if (book) {
      const currentQuantity = parseInt(book.quantity || "0", 10);
      await booksCollection.updateOne(
        { _id: new ObjectId(borrowRecord.bookId) },
        { $set: { quantity: (currentQuantity + 1).toString() } },
      );
    }
    res.status(200).json({ message: "Book returned successfully!" });
  } catch (error) {
    console.error("Return Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/books/user/:email", async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email);
    const query = { contributorEmail: email };
    const result = await booksCollection.find(query).toArray();
    res.send(result);
  } catch (error) {
    res.status(500).send({ message: "Failed to fetch user books" });
  }
});

app.delete("/books/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const result = await booksCollection.deleteOne(query);
    res.send(result);
  } catch (error) {
    res.status(500).send({ message: "Failed to delete book" });
  }
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
