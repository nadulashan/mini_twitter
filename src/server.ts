import "dotenv/config";
import pool from "./db.js";
import express, { Request, Response, NextFunction } from "express";
import argon2 from "argon2";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { rateLimit, ipKeyGenerator } from "express-rate-limit"

type IpLoginFailureType = {
  count: number,
  lastFailureAt: number
}


const ipLoginFailure = new Map< string, IpLoginFailureType >();

const FAILURE_WINDOW_MS = 1000*60*15
const MAX_LOGIN_DELAY_MS = 1000*8

const DUMMY_PASSWORD_HASH = "$argon2id$v=19$m=65536,p=4,t=3$Rlj6EmwwM/QFMrR/EANfDg$54LNiyeNrwhgEHsxxrZ+QSjBYYTnJb3pbWkr26gYvgg"


function recordIpFailure( ip: string, email: string ): number{
  cleanupLoginFailures()

  const key = JSON.stringify([ ipKeyGenerator(ip), email ])
  const now = Date.now()
  const previous = ipLoginFailure.get(key)

  const count = !previous || now - previous.lastFailureAt > FAILURE_WINDOW_MS ?
                1 :
                previous.count + 1

  ipLoginFailure.set( key, {
    count,
    lastFailureAt: now
  })

  if ( count < 3 ) {
    return 0
  }

  return Math.min( 1000*2**(count - 3), MAX_LOGIN_DELAY_MS )

}

// Clean Up functions
function resetIpLoginFailure( ip: string, email: string ): void{
  const key = JSON.stringify([ipKeyGenerator(ip), email])
  ipLoginFailure.delete( key )
}

function cleanupLoginFailures(): void {
  const now = Date.now()

  for ( const [ key, failure ] of ipLoginFailure ) {
    if ( now - failure.lastFailureAt > FAILURE_WINDOW_MS ) {
      ipLoginFailure.delete(key)
    }
  }
}

function wait( ms: number): Promise< void >{
  return new Promise(( resolve ) => setTimeout( resolve, ms))
}

const app = express();

const PORT = 3000;

// Middleware: parse incoming JSON request bodies
app.use(express.json());
const PgSession = connectPgSimple(session);

// Create sessions and maintain them
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

// Login Rate Limiter
const loginIpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    message: "Too many login attempts. Please try again later."
  }
});

// Login Email Limiter
const loginAccountLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,

  keyGenerator: (req) => {
    const email = req.body?.email;

    if (typeof email === "string" && email.trim()) {
      return `email:${email.trim().toLowerCase()}`;
    }

    return `ip:${ipKeyGenerator(req.ip!)}`;
  },

  skipSuccessfulRequests: true,

  standardHeaders: false,
  legacyHeaders: false,

  message: {
    message:
      "Too many failed login attempts for this account. Please try again later."
  }
});

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
app.post("/api/create-posts", checkAuth, async ( req, res ) => {

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
        RETURNING id, username, email, created_at;
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
app.post( "/api/auth/login", 
          loginIpLimiter,
          async ( req, res ) => {

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
        message: "Invalied email or password."
      })
    }

    const normalisedEmail = email.trim().toLowerCase();
    
    // Fetch Hash password
    const result = await pool.query(`
        SELECT password_hash, id
        FROM users
        WHERE email=$1;
      `, [ normalisedEmail ]);

    
    const user = result.rows[0]

    const hashToVerify = user? user.password : DUMMY_PASSWORD_HASH
      
    const isPasswordCorrect = await argon2.verify(hashToVerify, password)

    const authenticated = Boolean( isPasswordCorrect && user )

    const userId: number | undefined = authenticated? result.rows[0].id : undefined

    if ( !authenticated ) {

      const delayMs = recordIpFailure( req.ip!, normalisedEmail )

      if ( delayMs > 0 ){
        await wait( delayMs )
      }

      return res.status(401).json({
        message: "Invalied Email or Password"
      })
    }

    // Reset failiure counters
    resetIpLoginFailure( req.ip!, normalisedEmail )

    // Create session
    req.session.userId = userId;

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

app.post("/api/auth/logout", (req, res) => {

  req.session.destroy( err => {
    if ( err ) {
      console.error(err)

      return res.status(500).json({
        message: "Failed to Log out"
      })
    }

    res.clearCookie("connect.sid", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax"
    })

    return res.status(200).json({
      message: "Successfully logged out"
    })
  })

})

app.get("/api/posts", async ( req, res ) => {

  try {

    const results = await pool.query(`
        SELECT 
          posts.id,
          posts.content,
          posts.created_at,
          users.username AS author
        FROM posts
        JOIN users ON posts.user_id = users.id
        ORDER BY posts.created_at DESC;
      `)
    res.status(200).json(results.rows)

  } catch (e) {

    console.error(e)
    return res.status(500).json({
      message: "Server could not fetch posts"
    })

  }

})

app.get("/api/posts/:id", async ( req, res ) => {
  try {
    const postId = Number(req.params.id)

    if ( !Number.isInteger(postId) || postId <= 0 ) {
      return res.status(400).json({
        message: "Invalied Post ID."
      })
    }

    const result = await pool.query(`
        SELECT  
          posts.id,
          posts.content,
          posts.created_at,
          users.username AS author
        FROM posts
        JOIN users ON posts.user_id = users.id
        WHERE posts.id = $1;
      `, [ postId ])

      if ( result.rowCount == 0 ) {
        return res.status(204).json({
          message: "Post unavailable"
        })
      }

      return res.status(200).json(result.rows[0])
  } catch ( e ) {
    console.error(e)
    return res.status(500).json({
      message: "Cound not fetch post with the passed ID"
    })
  }
})

app.delete("/api/posts/:id", checkAuth, async ( req, res ) => {
  try {
    
    const postId = Number( req.params.id );
    const userId = req.session.userId;

    if ( !Number.isInteger( postId ) || postId <=0 ) {
      return res.status(400).json({
        message: "Invalied Post ID."
      })
    }

    const result = await pool.query(`
        DELETE
        FROM posts
        WHERE id = $1 AND user_id = $2;
      `, [ postId, userId ])

    if ( result.rowCount == 0 ) {
      return res.status(404).json({
        message: "Post Not Found."
      })
    }

    return res.status(200).json({
      message: "Post deleted successfully.",
      data: result.rows[0]
    })

  } catch (e) {
    console.error(e)
    return res.status(500).json({
      message: "Could not delete the post."
    })
  }
})


// Start the server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});