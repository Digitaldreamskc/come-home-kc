import type {ProgramWorkspace} from './program';
// Exact known demonstration annotations only; never strip arbitrary participant text.
const fixtureNotes:Record<string,string>={
 'Fictional participation: attended the Riverbend board orientation as an observer. Self-reported; not a board appointment.':'Attended the Riverbend board orientation as an observer. Self-reported; not a board appointment.',
 'Synthetic interest: I would like to learn about the responsibilities of this board.':'I would like to learn about the responsibilities of this board.',
 'I would like to understand this fictional board role, its time commitment, and how new members can contribute. Synthetic permission review only.':'I would like to understand this board role, its time commitment, and how new members can contribute.',
 'I would like to understand the fictional board role, its time commitment, and how new members can contribute.':'I would like to understand this board role, its time commitment, and how new members can contribute.',
};
export function demonstrationNote(note:string){return fixtureNotes[note]??note;}
export function journeyProgress(data:ProgramWorkspace){
 const done=[!!data.profile,data.records.some(r=>r.kind==='learning'),!!data.connections?.some(c=>['introduced','replied','completed'].includes(c.state)),data.records.some(r=>r.kind==='interest'),data.records.some(r=>r.kind==='outcome'),false];
 const text=[done[0]?'Private profile saved':'Create your private civic profile',done[1]?'Learning activity recorded · self-reported':'Explore a civic learning activity',done[2]?'Introduction made · view the recorded steps':'View your permissioned introduction tracker',done[3]?'Interest recorded · not an application':'Explore leadership opportunities',done[4]?'Participation recorded · self-reported':'No participation reported yet','Not started · civic impact has not been independently measured.'];
 return done.map((complete,i)=>({complete,text:text[i]}));
}
