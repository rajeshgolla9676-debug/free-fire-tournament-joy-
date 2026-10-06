import type {VercelRequest,VercelResponse} from '@vercel/node';
import {timingSafeEqual} from 'node:crypto';
import {z} from 'zod';
import {setSession} from '../_lib/auth';

const schema=z.object({
  username:z.string().trim().min(1).max(80),
  password:z.string().min(1).max(200)
});

function json(res:VercelResponse,status:number,data:unknown){
  res.status(status).setHeader('Content-Type','application/json; charset=utf-8').setHeader('Cache-Control','no-store').json(data);
}

function safeEqual(a:string,b:string){
  const aa=Buffer.from(a,'utf8');
  const bb=Buffer.from(b,'utf8');
  return aa.length===bb.length && timingSafeEqual(aa,bb);
}

export default async function handler(req:VercelRequest,res:VercelResponse){
  if(req.method!=='POST'){
    res.setHeader('Allow','POST');
    return json(res,405,{error:'Method not allowed'});
  }

  try{
    const origin=req.headers.origin;
    const host=req.headers.host;
    if(origin){
      try{
        if(new URL(origin).host!==host) return json(res,403,{error:'Request origin not allowed.'});
      }catch{
        return json(res,403,{error:'Request origin not allowed.'});
      }
    }

    const parsed=schema.safeParse(req.body);
    if(!parsed.success) return json(res,400,{error:'Enter username and password.'});

    const expected=process.env.ADMIN_PASSWORD;
    if(!expected) {
      console.error('ADMIN_PASSWORD is not configured in Vercel.');
      return json(res,500,{error:'Admin password is not configured on the server.'});
    }

    if(parsed.data.username.toLowerCase()!=='admin' || !safeEqual(parsed.data.password,expected)){
      return json(res,401,{error:'Invalid admin username or password.'});
    }

    if(!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length<32){
      console.error('SESSION_SECRET is missing or too short.');
      return json(res,500,{error:'Admin session secret is not configured on the server.'});
    }

    await setSession(res);
    return json(res,200,{success:true});
  }catch(error){
    console.error('Admin login invocation error:',error);
    return json(res,500,{error:'Admin login server error. Check the Vercel environment variables.'});
  }
}
