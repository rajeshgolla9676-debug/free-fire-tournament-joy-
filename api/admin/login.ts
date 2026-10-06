import type {VercelRequest,VercelResponse} from '@vercel/node';
import {timingSafeEqual} from 'node:crypto';
import {setSession} from '../_lib/auth';

function json(res:VercelResponse,status:number,data:unknown){
  res.status(status).setHeader('Content-Type','application/json; charset=utf-8').setHeader('Cache-Control','no-store').json(data);
}
function safeEqual(a:string,b:string){
  const aa=Buffer.from(a,'utf8'),bb=Buffer.from(b,'utf8');
  return aa.length===bb.length && timingSafeEqual(aa,bb);
}
export default async function handler(req:VercelRequest,res:VercelResponse){
  if(req.method!=='POST'){res.setHeader('Allow','POST');return json(res,405,{error:'Method not allowed'});}
  try{
    const body=req.body&&typeof req.body==='object'?req.body as Record<string,unknown>:{};
    const username=typeof body.username==='string'?body.username.trim():'';
    const password=typeof body.password==='string'?body.password:'';
    if(!username||!password)return json(res,400,{error:'Enter username and password.'});
    const origin=req.headers.origin,host=req.headers.host;
    if(origin){try{if(new URL(origin).host!==host)return json(res,403,{error:'Request origin not allowed.'});}catch{return json(res,403,{error:'Request origin not allowed.'});}}
    const expected=process.env.ADMIN_PASSWORD;
    if(!expected)return json(res,500,{error:'ADMIN_PASSWORD is missing in Vercel Production environment variables.'});
    if(username.toLowerCase()!=='admin'||!safeEqual(password,expected))return json(res,401,{error:'Invalid admin username or password.'});
    const secret=process.env.SESSION_SECRET;
    if(!secret||secret.length<32)return json(res,500,{error:'SESSION_SECRET is missing or too short in Vercel Production environment variables.'});
    setSession(res);
    return json(res,200,{success:true});
  }catch(error){
    console.error('Admin login error:',error);
    return json(res,500,{error:'Admin login server error. Check Vercel environment variables.'});
  }
}
