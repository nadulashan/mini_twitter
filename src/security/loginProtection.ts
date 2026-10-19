import { ipKeyGenerator } from "express-rate-limit";

type IpLoginFailureType = {
  count: number,
  lastFailureAt: number
}

const ipLoginFailure = new Map< string, IpLoginFailureType >();

const FAILURE_WINDOW_MS = 1000*60*15
const MAX_LOGIN_DELAY_MS = 1000*8


// Record Login failures 
export function recordIpFailure( ip: string, email: string ): number{
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
export function resetIpLoginFailure( ip: string, email: string ): void{
  const key = JSON.stringify([ipKeyGenerator(ip), email])
  ipLoginFailure.delete( key )
}

export function cleanupLoginFailures(): void {
  const now = Date.now()

  for ( const [ key, failure ] of ipLoginFailure ) {
    if ( now - failure.lastFailureAt > FAILURE_WINDOW_MS ) {
      ipLoginFailure.delete(key)
    }
  }
}

// Delay function
export function wait( ms: number): Promise< void >{
  return new Promise(( resolve ) => setTimeout( resolve, ms))
}
