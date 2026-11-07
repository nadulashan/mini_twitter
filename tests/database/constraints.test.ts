import { beforeEach, afterEach, describe, it, expect } from 'vitest'
import request from 'supertest'
import app from '../../src/app'
import { registerEndpoint } from '../variables'
import pool from '../../src/db'
import { randomUUID } from 'node:crypto'

describe( "Database Constraints", () => {
    let userId: number;

    beforeEach( async () => {
        const response = await request(app)
            .post(registerEndpoint)
            .send({
                username: "test user",
                email: `${randomUUID()}@gmail.com`,
                password: 'StronPassword123'
            })
        expect(response.status).toBe(201)
        userId = response.body.id
    })

    afterEach( async () => {
        await pool.query(
            "DELETE FROM users WHERE id = $1;",
            [ userId ]
        )
    })
    describe( "Username constraints", () => {
        it( "should reject white-spaced username", async () => {
            await expect( 
                pool.query(
                "INSERT INTO users(email, username, password_hash) VALUES ($1,$2, $3);",
                [ 'someemail@mail.com', ' ', 'StronPassword123']
                )
            ).rejects.toMatchObject({
                code: "23514",
                constraint: "users_username_valid"
            })
        })
        it( "should reject emun-trimmed username", async () => {
            await expect( 
                pool.query(
                "INSERT INTO users(email, username, password_hash) VALUES ($1,$2, $3);",
                [ 'someemail@mail.com', ' untrimmed ', 'StronPassword123']
                )
            ).rejects.toMatchObject({
                code: "23514",
                constraint: "users_username_valid"
            })
        })
    })

    describe( "Email constraints", () => {
        it( "should reject white-spaced email", async () => {
            await expect( 
                pool.query(
                "INSERT INTO users(email, username, password_hash) VALUES ($1,$2, $3);",
                [ ' ', 'test user', 'StronPassword123']
                )
            ).rejects.toMatchObject({
                code: "23514",
                constraint: "users_email_valid"
            })
        })
        it( "should reject not-normalised email", async () => {
            await expect( 
                pool.query(
                "INSERT INTO users(email, username, password_hash) VALUES ($1,$2, $3);",
                [ 'SOMECAPITALEMAIL@MAIL.COM', 'test user', 'StronPassword123']
                )
            ).rejects.toMatchObject({
                code: "23514",
                constraint: "users_email_valid"
            })
        })
        it( "should reject un-trimmed email", async () => {
            await expect( 
                pool.query(
                "INSERT INTO users(email, username, password_hash) VALUES ($1,$2, $3);",
                [ ' untrimmedemail@mail.com ', 'test user', 'StronPassword123']
                )
            ).rejects.toMatchObject({
                code: "23514",
                constraint: "users_email_valid"
            })
        })
    })

    describe( "Post Content constraints", () => {
        it( "should reject white-spaced content", async () => {
            await expect (
                pool.query(
                `INSERT INTO posts(user_id, content) VALUES ($1,$2)
                RETURNING id;`,
                [ userId, ' ']
                )
            ).rejects.toMatchObject({
                code: "23514",
                constraint: "posts_content_valid"
            })
        })
        it( "should reject un-trimmed content", async () => {
            await expect (
                pool.query(
                `INSERT INTO posts(user_id, content) VALUES ($1,$2)
                RETURNING id;`,
                [ userId, ' notTrimmed ']
                )
            ).rejects.toMatchObject({
                code: "23514",
                constraint: "posts_content_valid"
            })
        })
        it( "should reject long content", async () => {
            const longContent = "a".repeat(281)
            await expect (
                pool.query(
                `INSERT INTO posts(user_id, content) VALUES ($1,$2)
                RETURNING id;`,
                [ userId, longContent]
                )
            ).rejects.toMatchObject({
                code: "23514",
                constraint: "posts_content_valid"
            })
        })
    })

})