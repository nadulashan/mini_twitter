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

const registerEndpoint = "/api/auth/register"
const loginEndpoint = "/api/auth/login"
const getCsrfTokenEndpoint = "/api/auth/csrf"
const csrfTokenName = "X-CSRF-Token"
const createPostEndpoint = "/api/posts/"

describe( "Post Creation", () => {
  let testEmail: string;
  let oldCsrfToken: string;
  let newCsrfToken: string;
  let agent: ReturnType<typeof request.agent>;

  const validUserData = () => ({
    email: testEmail,
    password: "testPassword123",
  });

  beforeEach(async () => {
    testEmail = `test-${randomUUID()}@email.com`;

    agent = request.agent(app);

    // Register a fresh account.
    const createAccountResponse = await agent
      .post(registerEndpoint)
      .send({
        ...validUserData(),
        username: "test user",
      });

    expect(createAccountResponse.status).toBe(201);

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
    })
  })
  describe( "Missing Credentials", () => {
    
    it( "should reject requests without cookie", async () => {  
      const response = await request(app)
        .post( createPostEndpoint )
        .set( csrfTokenName, newCsrfToken )
        .send({ content: "some content" })
      
        expect(response.status).toBe(401)
    })

    it( "should reject requests without CSRF token", async () => {  
      const response = await agent
        .post( createPostEndpoint )
        .send({ content: "content" })
      
        expect(response.status).toBe(403)
    })

    it( "should reject requests invalid CSRF token", async () => {  
      const response = await agent
        .post( createPostEndpoint )
        .set( csrfTokenName, oldCsrfToken )
        .send({ content: "123" })
      
        expect(response.status).toBe(403)
    })
  })

  it( "should reject content with more than 280 characters", async () => {
    const shouldAcceptResponse = await agent
      .post( createPostEndpoint )
      .set( csrfTokenName, newCsrfToken )
      .send({
        content: "a".repeat(280)
      })
    
    expect(shouldAcceptResponse.status).toBe(201)

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

    for ( let i = 0; i === 3; i ++) {
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
  })
})