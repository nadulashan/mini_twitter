import { describe, it, beforeEach, afterEach, expect } from 'vitest'
import request from 'supertest'
import app from '../src/app'
import { registerEndpoint, usersEndpoint } from './variables'
import { randomUUID } from 'node:crypto'
import pool from '../src/db'

describe( "Get all Users", () => {
    const userEmails: string[] = []

    beforeEach( async () => {
        for ( let i = 0; i < 5; i++ ) {
            const testEmail = `test-${randomUUID()}@email.com`;
    
            // Account credentials
            const accountDetails = () => ({
                email: testEmail,
                password: "samePassword123"
            })
    
            // Register a fresh account.
            const createAccountResponse = await request(app)
            .post(registerEndpoint)
            .send({
                ...accountDetails(),
                username: `test user ${i+1}`,
            });    
            expect(createAccountResponse.status).toBe(201);
            userEmails.push(createAccountResponse.body.email)
        }
    })

    afterEach( async () => {
        await pool.query(
            "DELETE FROM users WHERE email=ANY($1::text[]);",
            [ userEmails ]
        )
    })

    it ( "should return a list of all the users", async () => {
        const response = await request(app)
            .get( usersEndpoint )
        expect(response.status).toBe(200)
    })
})