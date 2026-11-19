import { NextRequest,NextResponse } from 'next/server';
export function fail(message:string,status=400){return NextResponse.json({error:message},{status,headers:{'Cache-Control':'no-store'}});}
export function sameOrigin(req:NextRequest){const origin=req.headers.get('origin'),host=req.headers.get('host');if(!origin||!host)return false;try{return origin===new URL(req.nextUrl.protocol+'//'+host).origin;}catch{return false;}}
export async function body(req:NextRequest){if(Number(req.headers.get('content-length')||0)>1000000)throw Error('Request too large.');const text=await req.text();if(text.length>1000000)throw Error('Request too large.');return JSON.parse(text);}

export function requestOrigin(req:NextRequest){const host=req.headers.get("host");if(!host)throw Error("Missing host");return new URL(req.nextUrl.protocol+"//"+host).origin;}
