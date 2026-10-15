import "dotenv/config";
import pool from "./db.js";
import express, { Request, Response, NextFunction } from "express";
import argon2 from "argon2";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";

const app = express();

const PORT = 3000;

// Middleware: parse incoming JSON request bodies
app.use(express.json());
const PgSession = connectPgSimple(session);

app.use(

  //
  session({
    store: new PgSession({
      pool,
      createTableIfMissing: true,
    }),

    //
    secret: process.env.SECRET_KEY!,
    resave: false,
    saveUninitialized: false,

    //
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  })
);

// Check isAuthenticated
function checkAuth ( 
  req: Request, 
  res: Response, 
  next: NextFunction 
){
  if ( !req.session.userId ) {
    return res.status(401).json({
      message: "User not logged in"
    })
  }

  next()
}


// Get all the users
app.get("/api/users", async ( req, res ) => {
  
  const result = await pool.query(
    "SELECT * FROM users;"
  )
  res.status(200).json(result.rows)

})

// get all posts
app.get("/api/test-db", async (req, res) => {
   
  const result = await pool.query(`
    SELECT
      posts.id,
      posts.content,
      posts.created_at,
      users.username AS author
    FROM posts
    JOIN users
      ON posts.user_id = users.id
    ORDER BY posts.created_at DESC;
  `);
  console.log(result)
  res.status(200).json(result.rows)

});


// Insert new post
app.post("/api/posts", checkAuth, async ( req, res ) => {

  try {
    
    const { content } = req.body;
    const userId = req.session.userId

    console.log(userId, content)
    if ( typeof content !== "string" || !content.trim() ){
      return res.status(400).json({
        message: "Content is invalied."
      })
    }

    const result = await pool.query(`
        INSERT INTO posts ( content, user_id ) 
        VALUES ( $1, $2 )
        RETURNING content, user_id, created_at;
      `, [ content, userId ])
    
      res.status(201).json(result.rows[0])

  } catch ( e ) {

    console.error(e)

    res.status(500).json({
      message: "Database error"
    })

  }

})

// Add new user
app.post( "/api/auth/register", async ( req, res ) => {

  try {

    const { username, email, password } = req.body;

    // Validate data
    if (
      typeof username !== "string" || 
      typeof password !== "string" || 
      typeof email !== "string" ||
      !username.trim() ||
      !password.trim() ||
      !email.trim() ||
      password.length < 8
    ) {
      return res.status(400).json({
        message: "Username, Password and Email cannot be blank. Password must at least contain 8 characters"
      })
    }

    const cleanUsername = username.trim();
    const cleanEmail = email.trim().toLowerCase();
    const password_hash = await argon2.hash(password)

    // Pass data on to the database
    const result = await pool.query(`
        INSERT INTO users (username, email, password_hash)
        VALUES ( $1, $2, $3 )
        RETURNING ( id, username, email, created_at);
      `, [ cleanUsername, cleanEmail, password_hash ])
      
    res.status(201).json(result.rows[0])

  } catch (e: any) {

    if ( e.code === "23505" ){
      res.status(409).json({
        message: "An account with this email already exist."
      })
    }

    console.error(e)
    res.status(500).json({
      message:'Database error'
    })

  }

})

// User log in 
app.post( "/api/auth/login", async ( req, res ) => {

  try {

    const { email, password } = req.body;

    // Validate uesr input data
    if (
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      !email.trim() ||
      !password.trim()
    ) {
      return res.status(400).json({
        message: "Email or Password cannot be blank."
      })
    }

    const cleanEmail = email.trim().toLowerCase();
    
    // Fetch Hash password
    const result = await pool.query(`
        SELECT password_hash, id
        FROM users
        WHERE email=$1;
      `, [ cleanEmail ]);

    // Return if user not found
    if ( result.rowCount === 0 ) {
      return res.status(401).json({
        message: "Invalied username or password"
      })
    }

    const hashPassword = result.rows[0].password_hash

    // Validate user
    const doesMatch = await argon2.verify(hashPassword, password)
    
    if ( !doesMatch ) {
      return res.status(401).json({
        message: "Invalied username or password"
      })
    }

    // Authentication token or something
    req.session.userId = result.rows[0].id;

    req.session.save((err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({
          message: "Failed to create session."
        });
      }

      return res.status(200).json({
        message: "Authentication successful."
      });
    });

  } catch (e) {

    console.error(e)
    res.status(500).json({
      message:"Server Error"
    })

  }

})


app.get("/api/auth/me", checkAuth, async ( req, res ) => {

  try {

    const result = await pool.query(`
        SELECT username, email, created_at
        FROM users
        WHERE id=$1
      `, [ req.session.userId ])

    if ( !result.rows[0] ){
      return res.status(400).json({
        message: "Cannot find user account. It may have been deleted."
      })
    }

    return res.status(200).json(result.rows[0])

  } catch (e) {
    console.error(e)
    return res.status(500).json("Server error")
  }

})


// Start the server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});