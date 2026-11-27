'use client';
export default function ErrorState({reset}:{reset:()=>void}){return <main className="work-room"><h1>Employer profile unavailable</h1><p role="alert">The profile could not be loaded.</p><button onClick={reset}>Try again</button></main>}
