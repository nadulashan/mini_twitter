import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import request from "supertest";
import { randomUUID } from "node:crypto";
import app from "../src/app.js";
import pool from "../src/db.js";
import { createPostEndpoint, csrfTokenName, deletePostEndpoint, getCsrfTokenEndpoint, loginEndpoint, registerEndpoint } from "./variables.js";

describe( "Post Creation", () => {
  let oldCsrfToken: string;
  let newCsrfToken: string;
  let agent: ReturnType<typeof request.agent>;
  let userId: number;


  const testEmail = `test-${randomUUID()}@email.com`;

  const validUserData = () => ({
    email: testEmail,
    password: "testPassword123",
  });

  async function checkDatabaseSideEffectsPostCreatFail(){
    const databaseResponse = await pool.query(
      "SELECT id FROM posts WHERE user_id = $1;",
      [ userId ]
    )
    expect(databaseResponse.rowCount).toBe(0)
  }

  async function checkDatabaseSideEffectsPostCreatPass(){
    const databaseResponse = await pool.query(
      "SELECT id FROM posts WHERE user_id = $1;",
      [ userId ]
    )
    expect(databaseResponse.rowCount).not.toBe(0)
  }

  beforeEach(async () => {

    agent = request.agent(app);

    // Register a fresh account.
    const createAccountResponse = await agent
      .post(registerEndpoint)
      .send({
        ...validUserData(),
        username: "test user",
      });

    expect(createAccountResponse.status).toBe(201);
    userId = createAccountResponse.body.id

    // Obtain a CSRF token for this agent's session.
    const csrfResponse = await agent.get(getCsrfTokenEndpoint);

    expect(csrfResponse.status).toBe(200);
    oldCsrfToken = csrfResponse.body.csrfToken;

    // Log in 
    const loginResponse = await agent
      .post( loginEndpoint )
      .set( csrfTokenName, oldCsrfToken )
      .send( validUserData() )
      
    expect( loginResponse.status ).toBe(200)

    // Update regenerated token
    const csrfUpdatedResponse = await agent.get(getCsrfTokenEndpoint);

    expect(csrfUpdatedResponse.status).toBe(200);
    newCsrfToken = csrfUpdatedResponse.body.csrfToken;

  });

  afterEach(async () => {
    const response = await pool.query(`
        SELECT id FROM users WHERE email = $1;
      `, [testEmail])
    
    if ( response.rowCount !== 0 ) {
      await pool.query(
        "DELETE FROM posts WHERE user_id = $1;",
        [ response.rows[0].id ]
      )
    }
      
    await pool.query(
      "DELETE FROM users WHERE email = $1",
      [testEmail]
    );


  });

  describe( "Invalid Inputs", () => {
    
    it( "should reject empty field", async () => {  
      const response = await agent
        .post( createPostEndpoint )
        .set( csrfTokenName, newCsrfToken )
        .send({ content: "" })
      
        expect(response.status).toBe(400)
        expect(response.body).toMatchObject({
          message: "Content is invalid."
        })

        await await checkDatabaseSideEffectsPostCreatFail()
    })

    it( "should reject white-spaced field", async () => {  
      const response = await agent
        .post( createPostEndpoint )
        .set( csrfTokenName, newCsrfToken )
        .send({ content: "    " })
      
        expect(response.status).toBe(400)
        expect(response.body).toMatchObject({
          message: "Content is invalid."
        })

        await checkDatabaseSideEffectsPostCreatFail()
    })

    it( "should reject non-string field", async () => {  
      const response = await agent
        .post( createPostEndpoint )
        .set( csrfTokenName, newCsrfToken )
        .send({ content: 123 })
      
        expect(response.status).toBe(400)
        expect(response.body).toMatchObject({
          message: "Content is invalid."
        })
        await checkDatabaseSideEffectsPostCreatFail()

    })

    it( "should reject missing field", async () => {  
      const response = await agent
        .post( createPostEndpoint )
        .set( csrfTokenName, newCsrfToken )
        .send({ })
      
        expect(response.status).toBe(400)
        expect(response.body).toMatchObject({
          message: "Content is invalid."
        })
        await checkDatabaseSideEffectsPostCreatFail()

    })

    it( "should reject null field", async () => {  
      const response = await agent
        .post( createPostEndpoint )
        .set( csrfTokenName, newCsrfToken )
        .send({ content: null })
      
        expect(response.status).toBe(400)
        expect(response.body).toMatchObject({
          message: "Content is invalid."
        })
        await checkDatabaseSideEffectsPostCreatFail()

    })

    it( "should reject content being an object", async () => {  
      const response = await agent
        .post( createPostEndpoint )
        .set( csrfTokenName, newCsrfToken )
        .send({ content: {property: "value"} })
      
        expect(response.status).toBe(400)
        expect(response.body).toMatchObject({
          message: "Content is invalid."
        })
        await checkDatabaseSideEffectsPostCreatFail()

    })

    it( "should reject content being an array", async () => {  
      const response = await agent
        .post( createPostEndpoint )
        .set( csrfTokenName, newCsrfToken )
        .send({ content: [ "an", "array", "of", "items" ] })
      
        expect(response.status).toBe(400)
        expect(response.body).toMatchObject({
          message: "Content is invalid."
        })
        await checkDatabaseSideEffectsPostCreatFail()
      
    })
  })
  describe( "Missing Credentials", () => {
    
    it( "should reject requests without cookie", async () => {  
      const response = await request(app)
        .post( createPostEndpoint )
        .set( csrfTokenName, newCsrfToken )
        .send({ content: "some content" })
      
        expect(response.status).toBe(401)
        await checkDatabaseSideEffectsPostCreatFail()

    })

    it( "should reject requests without CSRF token", async () => {  
      const response = await agent
        .post( createPostEndpoint )
        .send({ content: "content" })
      
        expect(response.status).toBe(403)
        await checkDatabaseSideEffectsPostCreatFail()

    })

    it( "should reject requests invalid CSRF token", async () => {  
      const response = await agent
        .post( createPostEndpoint )
        .set( csrfTokenName, oldCsrfToken )
        .send({ content: "123" })
      
        expect(response.status).toBe(403)
        await checkDatabaseSideEffectsPostCreatFail()

    })
  })

  describe( "Long content", () => {
    it( "should reject content with more than 280 characters", async () => {
      const shouldRejectResponse = await agent
        .post( createPostEndpoint )
        .set( csrfTokenName, newCsrfToken )
        .send({
          content: "a".repeat(281)
        })
      
      expect(shouldRejectResponse.status).toBe(400)
      expect(shouldRejectResponse.body).toMatchObject({
        message: "Content is too long."
      })
      await checkDatabaseSideEffectsPostCreatFail()

    })

    it( "should accept content with 280 characters", async () => {
      const shouldAcceptResponse = await agent
        .post( createPostEndpoint )
        .set( csrfTokenName, newCsrfToken )
        .send({
          content: "a".repeat(280)
        })
      await checkDatabaseSideEffectsPostCreatPass()      
      expect(shouldAcceptResponse.status).toBe(201)
    })

  })

  it( "should create a successful post and should have correct ownership", async () => {
    const content = { content: "some valid post content"}
    const response = await agent
      .post( createPostEndpoint )
      .set( csrfTokenName, newCsrfToken )
      .send( content )

    expect(response.status).toBe(201)
    expect(response.body).toMatchObject(content)
    expect(response.body).toHaveProperty('created_at')
    expect(response.body).toHaveProperty('id')
    await checkDatabaseSideEffectsPostCreatPass()

    const ownershipResponse = await pool.query(
      `SELECT users.email
      FROM users
      JOIN posts
      ON users.id = posts.user_id
      WHERE posts.id = $1;`,
      [ response.body.id ]
    )

    expect(ownershipResponse.rows).toHaveLength(1)
    expect(ownershipResponse.rows[0].email).toBe(testEmail)
  })

  it( "should create multiple posts successfully", async () => {

    for ( let i = 0; i < 3; i ++) {
      const content = { content: `some valid post content ${randomUUID()}` }
      const response = await agent
        .post( createPostEndpoint )
        .set( csrfTokenName, newCsrfToken )
        .send( content )

      expect(response.status).toBe(201)
      expect(response.body).toMatchObject(content)
      expect(response.body).toHaveProperty('created_at')
      expect(response.body).toHaveProperty('id')
    }
    await checkDatabaseSideEffectsPostCreatPass()

  })
})

describe( "Post Deletion", () => {
  let csrfToken: string;
  let agent: ReturnType<typeof request.agent>;

  let userIds: number[] = []
  let postIds: number[] = []
  let activePost: number;

  async function checkDatabaseSideEffectsPostDelFail( postId: number ) {
    const response = await pool.query(
      "SELECT id FROM posts WHERE id = $1;",
      [ postId ]
    )
    expect(response.rowCount).not.toBe(0)
  }

  async function checkDatabaseSideEffectsPostDelPass( postId: number ) {
    const response = await pool.query(
      "SELECT id FROM posts WHERE id = $1;",
      [ postId ]
    )
    expect(response.rowCount).toBe(0)
  }

  async function checkDatabaseSideEffectsAllPostsExists() {
    const response = await pool.query(
      `
      SELECT
        cardinality($1::int[]) > 0
        AND COUNT(*) = cardinality($1::int[]) AS all_posts_exist
      FROM posts
      WHERE id = ANY($1::int[]);
      `,
      [ postIds ]
    )
    // console.log(response)
    expect(response.rows[0].all_posts_exist).toBe(true)
  }

  beforeEach(async () => {

    agent = request.agent(app);

    userIds = []
    postIds = []

    // Create 2 accounts for tesiting purposes. 
    for ( let i = 0; i < 2; i++) {
      const testEmail = `test-${randomUUID()}@email.com`;

      // Account credentials
      const accountDetails = () => ({
          email: testEmail,
          password: "samePassword123"
      })

      // Register a fresh account.
      const createAccountResponse = await agent
        .post(registerEndpoint)
        .send({
          ...accountDetails(),
          username: `test user ${i+1}`,
        });

      expect(createAccountResponse.status).toBe(201);
      userIds.push( createAccountResponse.body.id )

      // Obtain a CSRF token for this agent's session.
      const csrfResponse = await agent.get(getCsrfTokenEndpoint);

      expect(csrfResponse.status).toBe(200);
      csrfToken = csrfResponse.body.csrfToken;

      // Log in 
      const loginResponse = await agent
        .post( loginEndpoint )
        .set( csrfTokenName, csrfToken )
        .send( accountDetails() )
        
      expect( loginResponse.status ).toBe(200)

      // Update regenerated token
      const csrfUpdatedResponse = await agent.get(getCsrfTokenEndpoint);

      expect(csrfUpdatedResponse.status).toBe(200);
      csrfToken = csrfUpdatedResponse.body.csrfToken;

      // Create a post
      const content = { content: `some valid post content ${randomUUID()} by user ${i+1}` }
      const response = await agent
        .post( createPostEndpoint )
        .set( csrfTokenName, csrfToken )
        .send( content )

      expect(response.status).toBe(201)

      postIds.push(response.body.id)

      if (i === 0) {
        const response = await agent
          .post("/api/auth/logout")
          .set(csrfTokenName, csrfToken);

        expect(response.status).toBe(200);
      }
    }

    // Setup active post
    activePost = postIds[1]

  });

  afterEach(async () => {
    for (const id of userIds) {
      await pool.query(
        "DELETE FROM posts WHERE user_id = $1",
        [id]
      );
    }

    await pool.query(
      "DELETE FROM users WHERE id = ANY($1::int[])",
      [userIds]
    );

    postIds = [];
    userIds = [];
  });

  describe( "Invalid Post ID", () => {
    it( "should reject non-number post id", async () => {
      const idToBeSent = "string"
      const response = await agent
        .delete(`${deletePostEndpoint}${idToBeSent}`)
        .set( csrfTokenName, csrfToken )
        
      expect(response.status).toBe(400)
      await checkDatabaseSideEffectsAllPostsExists()
    })

    it( "should reject no post id", async () => {
      const response = await agent
        .delete(`${deletePostEndpoint}`)
        .set( csrfTokenName, csrfToken )
        
      expect(response.status).toBe(404)
      await checkDatabaseSideEffectsAllPostsExists()
    })

    it( "should reject null post id", async () => {
      const response = await agent
        .delete(`${deletePostEndpoint}${null}`)
        .set( csrfTokenName, csrfToken )
        
      expect(response.status).toBe(400)
      await checkDatabaseSideEffectsAllPostsExists()
    })
  })


  it( "should reject deleting another user's post", async () => {
    const targetedPost = postIds[0]
    const response = await agent
      .delete(`${deletePostEndpoint}${targetedPost}`)
      .set( csrfTokenName, csrfToken )
    expect(response.status).toBe(404)

    const databaseResponse = await pool.query(
      "SELECT id FROM posts WHERE id = $1",
      [postIds[0]]
    );

    expect(databaseResponse.rowCount).toBe(1);
    await checkDatabaseSideEffectsPostDelFail(targetedPost)
  })

  it( "should reject deleting non-existing post", async () => {

    // Generate a non-existing post ID
    const result = await pool.query(
      "SELECT nextval(pg_get_serial_sequence('posts', 'id')) AS id"
    );

    const nonExistingPostId = result.rows[0].id;

    const response = await agent
      .delete(`${deletePostEndpoint}${nonExistingPostId}`)
      .set( csrfTokenName, csrfToken )

    expect(response.status).toBe(404)
    await checkDatabaseSideEffectsAllPostsExists()
  })

  describe( "Missing Credentials", () => {
    it( "should reject requests without CSRF token", async () => {
      const response = await agent
        .delete(`${deletePostEndpoint}${activePost}`)

      expect(response.status).toBe(403)
      await checkDatabaseSideEffectsPostDelFail(activePost)
    })

    it( "should reject requests with invalid CSRF token", async () => {
      const response = await agent
        .delete(`${deletePostEndpoint}${activePost}`)
        .set( csrfTokenName, "someRandomToken")

      expect(response.status).toBe(403)
      await checkDatabaseSideEffectsPostDelFail(activePost)
    })

    it( "should reject requests without a session cookie", async () => {
      const response = await request(app)
        .delete(`${deletePostEndpoint}${activePost}`)
        .set( csrfTokenName, csrfToken )

      expect(response.status).toBe(401)
      await checkDatabaseSideEffectsPostDelFail(activePost)
    })
  })
  
  it( "should successfully delete active user's post an perform database verification and should reject attempting to delete the same post", async () => {
    const response = await agent
      .delete(`${deletePostEndpoint}${activePost}`)
      .set( csrfTokenName, csrfToken )

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({
      message: "Post deleted successfully.",
    })
    expect(response.body).toHaveProperty("data")

    await checkDatabaseSideEffectsPostDelPass(activePost)

    const deleteSamePostResponse = await agent
      .delete(`${deletePostEndpoint}${activePost}`)
      .set( csrfTokenName, csrfToken ) 
    expect(deleteSamePostResponse.status).toBe(404)
  })

})