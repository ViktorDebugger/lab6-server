import express from "express";
import cors from "cors";
import admin from "firebase-admin";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Налаштування CORS
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true,
  })
);

app.use(express.json());
const port = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "../client/dist")));

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || "{}");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

app.get("/publications", async (_, res) => {
  try {
    const publicationsRef = db.collection("publications");
    const snapshot = await publicationsRef.get();

    const publications = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.status(200).json(publications);
  } catch (error) {
    console.error("Error fetching publications:", error);
    res.status(500).json({ error: "Failed to fetch publications" });
  }
});

app.get("/publications/user", async (req, res) => {
  try {
    const { userId } = req.query;
    const publicationsRef = db.collection("publications");

    let query = publicationsRef;
    if (userId) {
      query = publicationsRef.where("userId", "==", userId);
    }
    const snapshot = await query.get();

    const publications = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.status(200).json(publications);
  } catch (error) {
    console.error("Error fetching publications:", error);
    res.status(500).json({ error: "Failed to fetch publications" });
  }
});

app.listen(port, () => {
  console.log("Server is running on http://localhost:" + port);
});

app.post("/publications", async (req, res) => {
  try {
    const newPublication = req.body;
    const docRef = await db.collection("publications").add(newPublication);
    res.status(201).json({ id: docRef.id, ...newPublication });
  } catch (error) {
    console.error("Error adding publication:", error);
    res.status(500).json({ error: "Failed to add publication" });
  }
});

app.put("/publications/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updatedPublication = req.body;
    const docRef = db.collection("publications").doc(id);
    await docRef.update(updatedPublication);
    res.status(200).json({ message: "Publication updated successfully" });
  } catch (error) {
    console.error("Error updating publication:", error);
    res.status(500).json({ error: "Failed to update publication" });
  }
});

app.delete("/publications/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const docRef = db.collection("publications").doc(id);
    await docRef.delete();
    res.status(200).json({ message: "Publication deleted successfully" });
  } catch (error) {
    console.error("Error deleting publication:", error);
    res.status(500).json({ error: "Failed to delete publication" });
  }
});

app.post("/publications/:publicationId/comments", async (req, res) => {
    try {
      const { publicationId } = req.params;
      const comment = req.body;
  
      const commentsRef = db
        .collection("publications")
        .doc(publicationId)
        .collection("comments");
  
      const docRef = await commentsRef.add(comment);
      res.status(201).json({ id: docRef.id, ...comment });
    } catch (error) {
      console.error("Error adding comment:", error);
      res.status(500).json({ error: "Failed to add comment" });
    }
  });
  
app.get("/publications/:publicationId/comments", async (req, res) => {
try {
    const { publicationId } = req.params;

    const commentsRef = db
    .collection("publications")
    .doc(publicationId)
    .collection("comments");

    const snapshot = await commentsRef.orderBy("createdAt", "desc").get();

    const comments = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    }));

    res.status(200).json(comments);
} catch (error) {
    console.error("Error fetching comments:", error);
    res.status(500).json({ error: "Failed to fetch comments" });
}
});

// Додати лайк до публікації
app.post("/publications/:publicationId/likes", async (req, res) => {
    try {
      const { publicationId } = req.params;
      const { userId } = req.body;
  
      const likeRef = db
        .collection("publications")
        .doc(publicationId)
        .collection("likes")
        .doc(userId);
  
      await likeRef.set({ userId });
      res.status(201).json({ message: "Like added successfully" });
    } catch (error) {
      console.error("Error adding like:", error);
      res.status(500).json({ error: "Failed to add like" });
    }
  });
  
  // Видалити лайк з публікації
  app.delete("/publications/:publicationId/likes/:userId", async (req, res) => {
    try {
      const { publicationId, userId } = req.params;
  
      const likeRef = db
        .collection("publications")
        .doc(publicationId)
        .collection("likes")
        .doc(userId);
  
      await likeRef.delete();
      res.status(200).json({ message: "Like removed successfully" });
    } catch (error) {
      console.error("Error removing like:", error);
      res.status(500).json({ error: "Failed to remove like" });
    }
  });
  
  // Отримати кількість лайків для публікації
  app.get("/publications/:publicationId/likes/count", async (req, res) => {
    try {
      const { publicationId } = req.params;
  
      const likesRef = db
        .collection("publications")
        .doc(publicationId)
        .collection("likes");
  
      const snapshot = await likesRef.get();
      res.status(200).json({ count: snapshot.size });
    } catch (error) {
      console.error("Error fetching likes count:", error);
      res.status(500).json({ error: "Failed to fetch likes count" });
    }
  });
  
  // Перевірити, чи користувач лайкнув публікацію
  app.get("/publications/:publicationId/likes/:userId", async (req, res) => {
    try {
      const { publicationId, userId } = req.params;
  
      const likeRef = db
        .collection("publications")
        .doc(publicationId)
        .collection("likes")
        .doc(userId);
  
      const likeSnapshot = await likeRef.get();
      res.status(200).json({ hasLiked: likeSnapshot.exists });
    } catch (error) {
      console.error("Error checking like:", error);
      res.status(500).json({ error: "Failed to check like" });
    }
  });

  const authenticateUser = async (req, res, next) => {
    try {
      const idToken = req.headers.authorization?.split("Bearer ")[1];
      if (!idToken) {
        return res.status(401).json({ message: "Unauthorized access" });
      }
  
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      req.user = decodedToken;
      next();
    } catch (error) {
      console.error("Token verification error:", error);
      res.status(401).json({ message: "Unauthorized access" });
    }
  };

app.post("/api/signup", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Create user
    const userRecord = await admin.auth().createUser({
      email,
      password,
    });

    // Create customToken
    const customToken = await admin.auth().createCustomToken(userRecord.uid);

    // Get idToken via Firebase Auth REST API
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${serviceAccount.webApiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: customToken,
          returnSecureToken: true,
        }),
      }
    );

    const data = await response.json();
    res.status(201).json({
      message: "User successfully created",
      token: data.idToken,
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
      },
    });
  } catch (error) {
    console.error("Signup error:", error);
    if (error.code === "auth/email-already-in-use") {
      res.status(400).json({ message: "An account with this email already exists" });
    } else {
      res.status(500).json({ message: "Error creating user" });
    }
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Get user by email
    const userRecord = await admin.auth().getUserByEmail(email);

    // Create customToken
    const customToken = await admin.auth().createCustomToken(userRecord.uid);
    // Get idToken via Firebase Auth REST API
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${serviceAccount.webApiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: customToken,
          returnSecureToken: true,
        }),
      }
    );

    const data = await response.json();
    console.log("Login response:", data);
    if (!data.idToken) {
      throw new Error("Failed to retrieve idToken from Firebase");
    }

    res.status(200).json({
      message: "Login successful",
      token: data.idToken,
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(401).json({ message: "Invalid email or password" });
  }
});

app.post("/api/logout", authenticateUser, async (req, res) => {
  try {
    await admin.auth().revokeRefreshTokens(req.user.uid);
    res.json({ message: "Logout successful" });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ message: "Error during logout" });
  }
});

app.get("/api/user", authenticateUser, async (req, res) => {
  try {
    const userRecord = await admin.auth().getUser(req.user.uid);
    res.json({
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
      },
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Error fetching user data" });
  }
});