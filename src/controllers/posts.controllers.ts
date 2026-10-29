import type { Request, Response } from "express";
import pool from "../db.js";

export async function getAllPosts(
  req: Request,
  res: Response
) {
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
}

export async function getPostById(req: Request, res: Response) {
  try {
    const postId = Number(req.params.id)

    if ( !Number.isInteger(postId) ||
          postId <= 0 ||
          postId > 2147483647 ) {
      return res.status(400).json({
        message: "Invalid Post ID."
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

      if ( result.rowCount === 0 ) {
        return res.status(404).json({
          message: "Post not found."
        })
      }

      return res.status(200).json(result.rows[0])
  } catch ( e ) {
    console.error(e)
    return res.status(500).json({
      message: "Cound not fetch post."
    })
  }
}

export async function createPost(req: Request, res: Response) {
  
  try {
    
    const { content } = req.body;
    const userId = req.session.userId

    if ( typeof content !== "string" || !content.trim() ){
      return res.status(400).json({
        message: "Content is invalied."
      })
    }

    const trimmedContent = content.trim()

    if ( trimmedContent.length > 280 ) {
      return res.status(400).json({
        message: "Content is too long."
      })
    }

    const result = await pool.query(`
        INSERT INTO posts ( content, user_id ) 
        VALUES ( $1, $2 )
        RETURNING content, user_id, created_at;
      `, [ trimmedContent, userId ])
    
      res.status(201).json(result.rows[0])

  } catch ( e ) {

    console.error(e)

    res.status(500).json({
      message: "Server could not create a new post"
    })

  }

}

export async function deletePost(req: Request, res: Response) {
  try {
    
    const postId = Number( req.params.id );
    const userId = req.session.userId;

    if ( !Number.isInteger( postId ) || postId <=0 ) {
      return res.status(400).json({
        message: "Invalid Post ID."
      })
    }

    const result = await pool.query(`
        DELETE
        FROM posts
        WHERE id = $1 AND user_id = $2
        RETURNING id, content, created_at;
      `, [ postId, userId ])

    if ( result.rowCount === 0 ) {
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
}