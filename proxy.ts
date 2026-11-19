import {NextRequest,NextResponse} from 'next/server';
import {modeAllows,previewMode} from './lib/platform/config';
import {hostedReviewAllowed} from './lib/platform/preview-access';
export function proxy(req:NextRequest){
 const mode=previewMode(),path=req.nextUrl.pathname;
 const hosted=!!process.env.VERCEL;
 if(hosted&&!hostedReviewAllowed(req.headers.get('host')))return new NextResponse('Private review unavailable',{status:404});
 if(hosted&&/^\/(signup|forgot-password|reset-password|confirm-email|preview|api\/path-demo)(\/|$)/.test(path))return new NextResponse('This private review uses assigned test accounts. Registration and email delivery are unavailable.',{status:404});
 if(!modeAllows(mode,path,process.env.ENABLE_CIVIC_DEMO==='1',process.env.ENABLE_PLATFORM_SHOWCASE==='1'))return new NextResponse('Not found',{status:404});
 if(mode!=='back2kc'&&!hosted&&! /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(req.headers.get('host')||''))return new NextResponse('Local demonstration only',{status:404});
 if(path==='/'&&mode!=='back2kc')return NextResponse.redirect(new URL(mode==='kcnow'?'/civic':'/showcase',req.url));
 const response=NextResponse.next();
 if(hosted){response.headers.set('X-Robots-Tag','noindex, nofollow, noarchive');response.headers.set('Cache-Control','private, no-store');}
 return response;
}
export const config={matcher:['/((?!_next/static|_next/image).*)']};
