import {createHmac,timingSafeEqual} from 'node:crypto';

const cookieName='ff_admin_session';
const maxAge=60*60*8;

function key(){
  const value=process.env.SESSION_SECRET;
  if(!value || value.length<32) throw new Error('SESSION_SECRET must be at least 32 characters.');
  return value;
}

function encode(value:string){
  return Buffer.from(value,'utf8').toString('base64url');
}

function sign(value:string){
  return createHmac('sha256',key()).update(value).digest('base64url');
}

function makeToken(){
  const payload=encode(JSON.stringify({role:'admin',username:'admin',exp:Math.floor(Date.now()/1000)+maxAge}));
  return payload+'.'+sign(payload);
}

function validToken(token:string){
  const parts=token.split('.');
  if(parts.length!==2)return false;
  const expected=sign(parts[0]);
  const a=Buffer.from(parts[1]);
  const b=Buffer.from(expected);
  if(a.length!==b.length || !timingSafeEqual(a,b))return false;
  try{
    const payload=JSON.parse(Buffer.from(parts[0],'base64url').toString('utf8'));
    return payload.role==='admin' && payload.username==='admin' && Number(payload.exp)>Math.floor(Date.now()/1000);
  }catch{return false;}
}

export function setSession(res:any){
  const token=makeToken();
  res.setHeader('Set-Cookie',`${cookieName}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`);
}

export function getSession(req:any){
  const cookieHeader=Array.isArray(req.headers.cookie)?req.headers.cookie.join(';'):req.headers.cookie||'';
  const raw=cookieHeader.split(';').map((x:string)=>x.trim()).find((x:string)=>x.startsWith(cookieName+'='));
  if(!raw)return null;
  const token=raw.slice(cookieName.length+1);
  return validToken(token)?{username:'admin'}:null;
}

export function clearSession(res:any){
  res.setHeader('Set-Cookie',`${cookieName}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`);
}

export function requireAdmin(req:any,res:any){
  const session=getSession(req);
  if(!session){
    res.status(401).json({error:'Administrator login required.'});
    return null;
  }
  return session;
}
