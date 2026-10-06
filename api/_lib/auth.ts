import { SignJWT, jwtVerify } from 'jose';
const cookieName='ff_admin_session';
function secret(){const value=process.env.SESSION_SECRET;if(!value||value.length<32)throw new Error('SESSION_SECRET must be at least 32 characters.');return new TextEncoder().encode(value);}
export async function setSession(res:any){const token=await new SignJWT({role:'admin',username:'admin'}).setProtectedHeader({alg:'HS256'}).setSubject('admin').setIssuedAt().setExpirationTime('8h').sign(secret());res.setHeader('Set-Cookie',cookieName+'='+token+'; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=28800');}
export async function getSession(req:any){const raw=req.headers.cookie?.split(';').map((x:string)=>x.trim()).find((x:string)=>x.startsWith(cookieName+'='))?.slice(cookieName.length+1);if(!raw)return null;try{const {payload}=await jwtVerify(raw,secret());return payload.sub==='admin'&&payload.role==='admin'?{username:'admin'}:null;}catch{return null;}}
export function clearSession(res:any){res.setHeader('Set-Cookie',cookieName+'=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0');}
export async function requireAdmin(req:any,res:any){const session=await getSession(req);if(!session){res.status(401).json({error:'Administrator login required.'});return null;}return session;}
