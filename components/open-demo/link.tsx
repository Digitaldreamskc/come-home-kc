"use client";
import Link from 'next/link';
import {createContext,useContext,type ComponentProps} from 'react';
export const DemoContext=createContext(false);
export function useOpenDemo(){return useContext(DemoContext);}
export default function DemoLink(props:ComponentProps<typeof Link>){const demo=useOpenDemo();let href=props.href;if(demo&&typeof href==='string'&&href.startsWith('/')&&!href.startsWith('/demo')){if(href.startsWith('/civic'))href='/demo/kcnow'+href.slice(6);else if(href.startsWith('/partners')||href.includes('employer'))href='/demo/partners';else if(href.startsWith('/signup')||href.startsWith('/portal'))href='/demo/profile';else if(href==='/')href='/demo/back2kc';else if(href.includes('connection')||href.includes('find-your-path'))href='/demo/paths';else href='/demo';}return <Link {...props} href={href}/>;}
