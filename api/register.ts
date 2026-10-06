import type {VercelRequest,VercelResponse} from '@vercel/node';
import {db,json,method,sameOrigin} from './_lib/db';
import {randomTeamCode} from './_lib/security';

const phoneOk=(v:string)=>/^[6-9]\d{9}$/.test(v);
const uidOk=(v:string)=>/^\d{5,20}$/.test(v);
const clean=(v:unknown,max:number)=>typeof v==='string'?v.trim().slice(0,max):'';

export default async function handler(req:VercelRequest,res:VercelResponse){
  if(!method(req,res,['POST']))return;
  if(!sameOrigin(req))return json(res,403,{error:'Request origin not allowed.'});
  try{
    const b=req.body&&typeof req.body==='object'?req.body as Record<string,any>:{};
    const teamName=clean(b.teamName,60),captainName=clean(b.captainName,80),captainPhone=clean(b.captainPhone,10);
    const email=clean(b.email,120),college=clean(b.college,100),city=clean(b.city,80);
    const players=Array.isArray(b.players)?b.players:[];
    if(teamName.length<2)return json(res,400,{error:'Enter a valid team name.'});
    if(captainName.length<2)return json(res,400,{error:'Enter a valid captain name.'});
    if(!phoneOk(captainPhone))return json(res,400,{error:'Enter a valid 10-digit Indian mobile number.'});
    if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return json(res,400,{error:'Enter a valid email address.'});
    if(players.length!==4)return json(res,400,{error:'Exactly four players are required.'});
    const normalized=players.map((p:any)=>({fullName:clean(p?.fullName,80),uid:clean(p?.uid,20),ign:clean(p?.ign,40),phone:clean(p?.phone,10)}));
    if(normalized.some((p:any)=>p.fullName.length<2||!uidOk(p.uid)||p.ign.length<2||(p.phone&&!phoneOk(p.phone))))return json(res,400,{error:'Check all four player details and phone numbers.'});
    if(new Set(normalized.map((p:any)=>p.uid)).size!==4)return json(res,409,{error:'Each player must have a different UID.'});
    if(b.consent!==true)return json(res,400,{error:'Please accept the privacy consent.'});
    const sql=db();
    const t=await sql`SELECT id FROM tournaments WHERE active=true AND registration_open=true ORDER BY created_at DESC LIMIT 1`;
    if(!t.length)return json(res,403,{error:'Registration is currently closed.'});
    for(let attempt=0;attempt<5;attempt++){
      const code=randomTeamCode();
      try{
        const r=await sql`SELECT register_team(${t[0].id}::uuid,${code},${teamName},${captainName},${captainPhone},${email||null},${college||null},${city||null},${JSON.stringify(normalized.map((x:any,i:number)=>({slot:i+1,...x})))}::jsonb) AS team_code`;
        return json(res,201,{success:true,teamCode:String(r[0].team_code)});
      }catch(e){
        const m=String(e).toLowerCase();
        if(m.includes('duplicate')||m.includes('unique'))return json(res,409,{error:'This team name, captain phone, or player UID is already registered.'});
        if(attempt===4)throw e;
      }
    }
  }catch(e){
    console.error('Registration API error:',e);
    return json(res,500,{error:'Registration could not be completed. Check DATABASE_URL and the Neon database migration.'});
  }
}
