import {NextRequest,NextResponse} from 'next/server';
import {modeAllows,previewMode} from './lib/platform/config';
export function proxy(req:NextRequest){
 const mode=previewMode(),path=req.nextUrl.pathname;
 if(!modeAllows(mode,path,process.env.ENABLE_CIVIC_DEMO==='1',process.env.ENABLE_PLATFORM_SHOWCASE==='1'))return new NextResponse('Not found',{status:404});
 if(mode!=='back2kc'&&(process.env.VERCEL||! /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(req.headers.get('host')||'')))return new NextResponse('Local demonstration only',{status:404});
 if(path==='/'&&mode!=='back2kc')return NextResponse.redirect(new URL(mode==='kcnow'?'/civic':'/showcase',req.url));
 return NextResponse.next();
}
export const config={matcher:['/((?!_next/static|_next/image).*)']};
