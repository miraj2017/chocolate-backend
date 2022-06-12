const express = require("express");
const { MongoClient } = require("mongodb");
const app = express();
const cors = require("cors");
const admin = require("firebase-admin");

require("dotenv").config();
const ObjectId = require("mongodb").ObjectId;
const port = process.env.PORT || 5000;

// chocolate-574d9-firebase-adminsdk-fz6c4-d0093aab55.json

const serviceAccount = require("./chocolate-574d9-firebase-adminsdk-fz6c4-d0093aab55.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
app.use(cors());
app.use(express.json());

// chocolate  ycicfLXWaYMDKShp

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.yce18.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function verifyToken(req, res, next) {
  if (req.headers?.authorization?.startsWith("Bearer ")) {
    const token = req.headers.authorization.split(" ")[1];

    try {
      const decodedUser = await admin.auth().verifyIdToken(token);
      req.decodedEmail = decodedUser.email;
    } catch {}
  }
  next();
}
async function run() {
  try {
    await client.connect();
    const database = client.db("chocolate");
    const productsCollection = database.collection("deliveries");
    const ordersCollection = database.collection("orders");
    const usersCollection = database.collection("users");

    app.get("/deliveries", async (req, res) => {
      const delivery = productsCollection.find({});
      const deliveries = await delivery.toArray();
      res.json(deliveries);
    });

    app.get("/deliveries/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const delivery = await productsCollection.findOne(query);

      res.json(delivery);
    });

    app.post("/orders", async (req, res) => {
      const order = req.body;

      const orders = await ordersCollection.insertOne(order);
      res.json(orders);
    });
    app.get("/orders", async (req, res) => {
      // const email = req.query.user.email;
      // const query = { email: email };

      const order = ordersCollection.find({ email: req.body.email });
      const orders = await order.toArray();
      res.json(orders);
    });

    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };

      const user = await usersCollection.findOne(query);
      let isAdmin = false;
      if (user?.role === "admin") {
        isAdmin = true;
      }
      res.json({ admin: isAdmin });
    });
    app.post("/users", async (req, res) => {
      const user = req.body;

      const users = await usersCollection.insertOne(user);
      res.json(users);
    });
    app.put("/users", async (req, res) => {
      const user = req.body;
      const filter = { email: user.email };

      const options = { upsert: true };
      const updateDoc = { $set: user };

      const result = await usersCollection.updateOne(
        filter,
        updateDoc,
        options
      );

      res.json(result);
    });
    app.put("/users/admin", verifyToken, async (req, res) => {
      const user = req.body;
      const requester = req.decodedEmail;
      if (requester) {
        const requesterAccount = await usersCollection.findOne({
          email: requester,
        });
        if (requesterAccount.role === "admin") {
          const filter = { email: user.email };

          const updateDoc = { $set: { role: "admin" } };

          const result = await usersCollection.updateOne(filter, updateDoc);
          res.json(result);
        }
      } else {
        res
          .status(403)
          .json({ message: "you do not have access to make admin " });
      }
    });
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("gift server");
});

app.listen(port, () => {
  console.log(`listening at ${port}`);
});
