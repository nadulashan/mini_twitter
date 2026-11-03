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
import { 
  createPostEndpoint, 
  csrfTokenName, 
  extractSId, 
  getCsrfTokenEndpoint, 
  loginEndpoint, 
  logoutEndpoint, 
  meEndpoint, 
  registerEndpoint 
} from "./variables.js";

describe( "Registration", () => {

  let testEmail: string

  beforeEach( async () => {
    testEmail = `test-${randomUUID()}@email.com`
  })

  afterEach ( async () => {
    await pool.query(`
        DELETE FROM users;
      `)
  })

  const validData = () => ({
    email: testEmail,
    username: 'test user',
    password: 'testPassword123'
  })

  describe( "Input Validation", () => {
    
    async function checkDatabaseSideEffectsRegFail() {
      const databaseResponse = await pool.query(
        "SELECT id FROM users WHERE email = $1;",
        [ testEmail ]
      )
      expect(databaseResponse.rowCount).toBe(0)
    }

    async function checkDatabaseSideEffectsRegPass() {
      const databaseResponse = await pool.query(
        "SELECT id FROM users WHERE email = $1;",
        [ testEmail ]
      )
      expect(databaseResponse.rowCount).toBe(1)
    }

    describe( "Empty inputs", () => {
      it.each( [ "username", "email", "password" ] as const ) (
        "should reject empty %s", async ( field ) => {

          const response = await request(app)
            .post(registerEndpoint)
            .send({
            ...validData(),
            [ field ]: ""
          })
          expect(response.status).toBe(400)

          checkDatabaseSideEffectsRegFail()
        }
      )
    })

    describe( "White-space only inputs", () => {
      it.each ( [ "username", "email", "password"] as const )(
        "should reject white-space only %s", async ( field ) => {

          const response = await request(app)
            .post(registerEndpoint)
            .send({
              ...validData(),
              [field]: "    "
            })
          
          expect(response.status).toBe(400)

          checkDatabaseSideEffectsRegFail()
        }
      )
    })

    describe( "Non-string inputs", () => {
      it.each([ "username", "email", "password" ] as const )(
        "should reject non-string type for %s", async ( field ) => {

          const response = await request(app)
            .post(registerEndpoint)
            .send({
              ...validData(),
              [ field ]: 123,
            })

            expect(response.status).toBe(400)

            checkDatabaseSideEffectsRegFail()
        }
      )
    })

    it( "should reject short passwords", async () => {
      const response = await request(app)
        .post(registerEndpoint)
        .send({
          ...validData(),
          password: "short"
        })

      expect(response.status).toBe(400)

      checkDatabaseSideEffectsRegFail()
    })

    describe( "Invalid emails", () => {
      it.each([ "invalidEmail#mail.com", "invalidEmail@mail,com" ])
      ( "should reject invalid emails: %s", async ( invaldEmail ) => {

        const response = await request(app)
          .post( registerEndpoint )
          .send({
            ...validData(),
            email: invaldEmail
          })

        expect(response.status).toBe(400)

        checkDatabaseSideEffectsRegFail()
      })
    })

    describe( "Missing Fields", () => {
      it.each([ "username", "email", "password" ] as const )("missing field: %s", async ( field ) => {

        const { [field]: omitted, ...data } = validData()

        const response = await request(app)
          .post( registerEndpoint )
          .send(data)
        expect(response.status).toBe(400)

        checkDatabaseSideEffectsRegFail()
      });
    })

  it( "should normalise email", async () => {

    const response = await request(app)
      .post(registerEndpoint)
      .send({
        ...validData(),
        email: `  ${testEmail.toUpperCase()}  `
      })
    
      expect(response.status).toBe(201)
      expect(response.body).toMatchObject({
        email: testEmail,
        username: "test user"
      })
      expect(response.body).toHaveProperty("id")
      expect(response.body).toHaveProperty("created_at")
      expect(response.body).not.toHaveProperty("password_hash")

      checkDatabaseSideEffectsRegPass()

  })

  it( "should reject duplicate registration", async () => {

    const firstResponse = await request(app)
      .post(registerEndpoint)
      .send({
        ...validData()
      })

    expect(firstResponse.status).toBe(201)

    checkDatabaseSideEffectsRegPass()
    
    const secondResponse = await request(app)
      .post(registerEndpoint)
      .send({
        ...validData()
      })

    expect(secondResponse.status).toBe(409)

  })

  it( "should perform successful registration", async () => {
    const response = await request(app)
    .post( registerEndpoint )
    .send({
      ...validData()
    })

    expect(response.status).toBe(201)
    expect(response.body).toMatchObject({
      email: testEmail,
      username: validData().username
    })
    expect(response.body).toHaveProperty("id")
    expect(response.body).toHaveProperty("created_at")
    expect(response.body).not.toHaveProperty("password_hash")

    checkDatabaseSideEffectsRegPass()
  })

})


})

describe( "Login", () => {
let testEmail: string;
let csrfToken: string;
let agent: ReturnType<typeof request.agent>;
let sessionId: string;

const validData = () => ({
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
      ...validData(),
      username: "test user",
    });
  expect(createAccountResponse.status).toBe(201);

  // Obtain a CSRF token for this agent's session.
  const csrfResponse = await agent.get(getCsrfTokenEndpoint);
  expect(csrfResponse.status).toBe(200);

  sessionId =  extractSId(csrfResponse.header['set-cookie'][0])

  csrfToken = csrfResponse.body.csrfToken;
});

afterEach(async () => {
  await pool.query(
    `
    DELETE FROM users WHERE email = $1`,
    [testEmail]
  );
});

  describe( "Input Validation", () => {

    describe( "Empty inputs", () => {
      it.each( [ "email", "password" ] as const ) (
        "should reject empty %s", async ( field ) => {

          const response = await agent
            .post( loginEndpoint )
            .set( csrfTokenName, csrfToken)
            .send({
              ...validData(),
              [ field ]: ""
            })

          expect(response.status).toBe(400)
        }
      )
    })

    describe( "White-space only inputs", () => {
      it.each ( [ "email", "password"] as const )(
        "should reject white-space only %s", async ( field ) => {

          const response = await agent
            .post( loginEndpoint )
            .set( csrfTokenName, csrfToken)
            .send({
              ...validData(),
              [field]: "    "
            })
          
          expect(response.status).toBe(400)
        }
      )
    })

    describe("Non-string type inputs", () => {
      it.each([ "email", "password" ] as const )(
        "should reject non-string type for %s", async ( field ) => {

          const response = await agent
            .post( loginEndpoint )
            .set( csrfTokenName, csrfToken)
            .send({
              ...validData(),
              [ field ]: 123,
            })

            expect(response.status).toBe(400)
        }
      )
    })

    describe( "Invalid Email formats", () => {
      it.each([ "invalidEmail#mail.com", "invalidEmail@mail,com" ])
      ( "should reject invalid emails: %s", async ( invaldEmail ) => {

        const response = await agent
          .post( loginEndpoint )
          .set( csrfTokenName, csrfToken)
          .send({
            ...validData(),
            email: invaldEmail
          })

        expect(response.status).toBe(400)
      })
    })

    describe( "Missing Fields", () => {
      it.each([ "email", "password" ] as const )("missing field: %s", async ( field ) => {

        const { [field]: omitted, ...data } = validData()

        const response = await agent
          .post( loginEndpoint )
          .set( csrfTokenName, csrfToken )
          .send( data )
        expect(response.status).toBe(400)
      });
    })

    describe( "Wrong Credentials", () => {
      it( "should reject non-existing account", async () => {
        const response = await agent
          .post( loginEndpoint) 
          .set( csrfTokenName, csrfToken )
          .send({
            ...validData(),
            email: "somethingelse@mail.com"
          })

        expect(response.status).toBe(401)
      })
      
      it( "should reject wrong password and not regenerate new Token", async () => {
        const response = await agent
          .post( loginEndpoint )
          .set( csrfTokenName, csrfToken )
          .send({
            ...validData(),
            password: "wrongpassword"
          })

        expect(response.status).toBe(401)         
        
        const csrfResponse = await agent
          .get( getCsrfTokenEndpoint )
        
        expect(csrfResponse.body.csrfToken).toBe(csrfToken)
      })
    })

    it( "should perform successful login", async () => {
      const response = await agent
        .post( loginEndpoint )
        .set( csrfTokenName, csrfToken )
        .send( validData() )
        
      expect(response.status).toBe(200)
      expect(response.body).toMatchObject({
        message: "Authentication successful."
      })
      expect( extractSId(response.header['set-cookie'][0]) ).not.toBe(sessionId)

      const csrfResponse = await agent 
        .get( getCsrfTokenEndpoint )
      
      expect(csrfResponse.body.csrfToken).not.toBe( csrfToken )
    })

})


})

describe( "Logout", () => {

  let csrfToken: string;
  let agent: ReturnType<typeof request.agent>;
  let userIds: number[] = []
  
  beforeEach(async () => {

    agent = request.agent(app);

    const testEmail = `test-${randomUUID()}@email.com`;

    // Account credentials
    const accountDetails = {
        email: testEmail,
        password: "samePassword123"
    }

    // Register a fresh account.
    const createAccountResponse = await agent
      .post(registerEndpoint)
      .send({
        ...accountDetails,
        username: `test user`,
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
      .send( accountDetails )
      
    expect( loginResponse.status ).toBe(200)

    // Update regenerated token
    const csrfUpdatedResponse = await agent.get(getCsrfTokenEndpoint);

    expect(csrfUpdatedResponse.status).toBe(200);
    csrfToken = csrfUpdatedResponse.body.csrfToken;
  })

  afterEach( async () => {
    
  await pool.query(
    "DELETE FROM posts WHERE user_id = ANY($1::int[])",
      [userIds]
    );

    await pool.query(
      "DELETE FROM users WHERE id = ANY($1::int[])",
      [userIds]
    );

    userIds = [];

  })

  describe( "Missing or Invalid CSRF Token", () => {

    it( "should reject logout without CSRF Token", async () => {
      const response = await agent
        .post( logoutEndpoint )

      expect(response.status).toBe(403)
    })

    it( "should reject logout with invalid CSRF Token", async () => {
      const response = await agent
        .post( logoutEndpoint )
        .set( csrfTokenName, "someRandomToken")

      expect(response.status).toBe(403)
    })
  })

  it("should successfully logout and invalidate the session", async () => {
    const response = await agent
      .post(logoutEndpoint)
      .set(csrfTokenName, csrfToken);

    expect(response.status).toBe(200);

    // Verify cookie clearing instruction.
    const cookies = response.headers["set-cookie"];

    expect(
      cookies?.some(( cookie: string ) =>
        cookie.startsWith("connect.sid=") &&
        cookie.includes("Expires=Thu, 01 Jan 1970")
      )
    ).toBe(true);
    
    // Verify authentication is no longer available.
    const meResponse = await agent.get("/api/auth/me");

    expect(meResponse.status).toBe(401);

    // Verify another protected endpoint rejects the request.
    const protectedResponse = await agent
      .post(createPostEndpoint)
      .send({
        content: `Test post ${randomUUID()}`,
      });

    expect(protectedResponse.status).toBe(401);
  });

})

describe( "Me", () => {
  let agent: ReturnType<typeof request.agent>;
  let testEmail: string;
  let userDetails: { email: string, password: string }
  let csrfToken: string;

  beforeEach( async () => {

    testEmail = `test-${randomUUID()}@email.com`;
    userDetails = {
      email: testEmail,
      password: "StrongPassword123"
    }

    agent = request.agent(app);

    // Register a fresh account.
    const createAccountResponse = await agent
      .post(registerEndpoint)
      .send({
        ...userDetails,
        username: "test user",
      });
    expect(createAccountResponse.status).toBe(201);

    // Obtain a CSRF token for this agent's session.
    const csrfResponse = await agent.get(getCsrfTokenEndpoint);
    expect(csrfResponse.status).toBe(200);
    csrfToken = csrfResponse.body.csrfToken;
  })
  afterEach( async () => {
    await pool.query(
      "DELETE FROM users WHERE email = $1;",
      [ testEmail ]
    )
  })

  describe( "Before loggin in", () => {
    it( "should reject without loggin in without cookie", async () => {
      const response = await request(app)
        .get( meEndpoint )
      expect(response.status).toBe(401)
    })
    it( "should reject without loggin in with cookie", async () => {
      const response = await agent
        .get( meEndpoint )
      expect(response.status).toBe(401)
    })
  })

  describe( "After loggin in", () => {
    it( "should reject requests without a cookie", async () => {
      const loginResponse = await agent
        .post( loginEndpoint )
        .set( csrfTokenName, csrfToken )
        .send( userDetails )
      expect(loginResponse.status).toBe(200)

      const response = await request(app)
        .get( meEndpoint )
      expect(response.status).toBe(401)
    })
    it( "should accept request with cookie ", async () => {
      const loginResponse = await agent
        .post( loginEndpoint )
        .set( csrfTokenName, csrfToken )
        .send( userDetails )
      expect(loginResponse.status).toBe(200)

      const response = await agent
        .get( meEndpoint )
      expect(response.status).toBe(200)
      expect(response.body.email).toBe(testEmail)
      expect(response.body).toHaveProperty("created_at")
    })
  })
})