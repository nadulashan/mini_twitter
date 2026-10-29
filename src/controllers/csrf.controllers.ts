import { Request, Response } from 'express';
import { randomBytes } from 'node:crypto';

export function getCsrfToken( req: Request, res: Response ) {

    if ( !req.session.csrfToken ){
        req.session.csrfToken = randomBytes(32).toString('hex')
    }
    
    return res.status(200).json({
        csrfToken: req.session.csrfToken
    })
}