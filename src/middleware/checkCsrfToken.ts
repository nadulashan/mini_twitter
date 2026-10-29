import { Request, Response, NextFunction } from "express"
import { timingSafeEqual } from "node:crypto"

export function checkCsrfToken( req: Request, res: Response, next: NextFunction ) {

    const sessionToken = req.session.csrfToken
    const requestToken = req.get("X-CSRF-Token")

    if ( !sessionToken || !requestToken ) {
        return res.status(403).json({
            message: "Missing Token"
        })
    }

    const expected = Buffer.from( sessionToken, "utf8")
    const received = Buffer.from( requestToken, "utf8")

    if ( expected.length !== received.length || !timingSafeEqual( expected, received ) ) {
        return res.status(403).json({
            message: "Invalid Token."
        })
    }

    next()
    
}