import { useState, useMemo, useEffect, useRef } from "react";
import { db } from "./firebase";
import { ref, onValue, set, update } from "firebase/database";

const TEAMS = [
  { id: 0,  name: "Arsenal A",       player: "Andy" },
  { id: 1,  name: "Real Madrid A",   player: "Cami Cab" },
  { id: 2,  name: "Liverpool A",     player: "Cami Cas" },
  { id: 3,  name: "PSG A",           player: "Checho" },
  { id: 4,  name: "FC Barcelona A",  player: "Diego" },
  { id: 5,  name: "Man. City A",     player: "Edgar" },
  { id: 6,  name: "Bayern Munich A", player: "Esteban" },
  { id: 7,  name: "Real Madrid B",   player: "German" },
  { id: 8,  name: "Arsenal B",       player: "Mate" },
  { id: 9,  name: "Liverpool B",     player: "Nico" },
  { id: 10, name: "PSG B",           player: "Profe" },
  { id: 11, name: "Man. City B",     player: "Santi" },
  { id: 12, name: "Bayern Munich B", player: "Sammy" },
  { id: 13, name: "FC Barcelona B",  player: "Tatan" },
  { id: 14, name: "Real Madrid C",   player: "David" },
];

const STADIUMS = [
  { id: 0, name: "Camp Nou",          host: "David Casallas",     emoji: "🔵" },
  { id: 1, name: "Santiago Bernabéu",host: "Profe Pelu",          emoji: "⚪" },
  { id: 2, name: "Wembley",           host: "Camilo Casteblanco", emoji: "⚡" },
  { id: 3, name: "Allianz Arena",     host: "VillaBayona",        emoji: "🔴" },
  { id: 4, name: "Maracanã",          host: "Amayamirez",         emoji: "🟡" },
  { id: 5, name: "Azteca",            host: "SarmiCasa",          emoji: "🟢" },
  { id: 6, name: "Old Trafford",      host: "DiegoSallas",        emoji: "🏟️" },
];

function generateSchedule() {
  const n = 16;
  const arr = [...Array(n).keys()];
  const all = [];
  const teamStadiumCount = Array.from({length: 15}, () => Array(7).fill(0));
  for (let r = 0; r < n - 1; r++) {
    const roundPairs = [];
    for (let i = 0; i < n / 2; i++) {
      const home = arr[i], away = arr[n - 1 - i];
      if (home !== 15 && away !== 15) roundPairs.push({ home, away });
    }
    const usedStadiums = new Set();
    roundPairs.forEach(m => {
      let bestStad = -1, bestScore = Infinity;
      for (let s = 0; s < 7; s++) {
        if (usedStadiums.has(s)) continue;
        const score = teamStadiumCount[m.home][s] + teamStadiumCount[m.away][s];
        if (score < bestScore) { bestScore = score; bestStad = s; }
      }
      usedStadiums.add(bestStad);
      teamStadiumCount[m.home][bestStad]++;
      teamStadiumCount[m.away][bestStad]++;
      all.push({ id: all.length, round: r + 1, home: m.home, away: m.away, stadium: bestStad, homeScore: null, awayScore: null });
    });
    arr.splice(1, 0, arr.pop());
  }
  return all;
}

const INITIAL_MATCHES = generateSchedule();
const TOTAL_ROUNDS = Math.max(...INITIAL_MATCHES.map(m => m.round));

function calcByes() {
  const byes = {};
  for (let r = 1; r <= TOTAL_ROUNDS; r++) {
    const playing = new Set();
    INITIAL_MATCHES.filter(m => m.round === r).forEach(m => { playing.add(m.home); playing.add(m.away); });
    byes[r] = TEAMS.find(t => !playing.has(t.id)) || null;
  }
  return byes;
}
const BYES = calcByes();

function calcStandings(matches) {
  const stats = TEAMS.map(t => ({ ...t, J: 0, G: 0, E: 0, P: 0, GF: 0, GC: 0, Pts: 0, form: [] }));
  matches.forEach(m => {
    if (m.homeScore === null || m.awayScore === null) return;
    const h = stats[m.home], a = stats[m.away];
    h.J++; h.GF += m.homeScore; h.GC += m.awayScore;
    a.J++; a.GF += m.awayScore; a.GC += m.homeScore;
    if (m.homeScore > m.awayScore)      { h.G++; h.Pts += 3; h.form.push("W"); a.P++; a.form.push("L"); }
    else if (m.homeScore < m.awayScore) { a.G++; a.Pts += 3; a.form.push("W"); h.P++; h.form.push("L"); }
    else { h.E++; h.Pts++; h.form.push("D"); a.E++; a.Pts++; a.form.push("D"); }
  });
  stats.forEach(s => { s.DG = s.GF - s.GC; });
  return stats.sort((a, b) => b.Pts - a.Pts || b.DG - a.DG || b.GF - a.GF || a.name.localeCompare(b.name));
}

const S = {
  app: { background: "#09090f", minHeight: "100vh", color: "#e2e2ec", fontFamily: "'DM Sans', system-ui, sans-serif" },
  header: { textAlign: "center", padding: "32px 16px 16px", background: "linear-gradient(180deg,rgba(245,197,24,.09) 0%,transparent 100%)", borderBottom: "1px solid rgba(245,197,24,.12)" },
  h1: { fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(44px,9vw,100px)", letterSpacing: "4px", background: "linear-gradient(135deg,#F5C518,#fff 50%,#F5C518)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", lineHeight: 1, margin: 0 },
  sub: { fontSize: 12, color: "#666", letterSpacing: 3, textTransform: "uppercase", marginTop: 6 },
  badge: { display: "inline-block", background: "#F5C518", color: "#000", fontWeight: 700, fontSize: 11, letterSpacing: 2, padding: "4px 14px", borderRadius: 2, marginTop: 10, textTransform: "uppercase" },
  nav: { display: "flex", background: "#111118", borderBottom: "1px solid rgba(245,197,24,.1)", overflowX: "auto" },
  navBtn: (a) => ({ flex: 1, minWidth: 75, padding: "13px 8px", background: "none", border: "none", borderBottom: a ? "3px solid #F5C518" : "3px solid transparent", color: a ? "#F5C518" : "#555", fontWeight: 700, fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit", transition: "all .2s" }),
  page: { maxWidth: 1060, margin: "0 auto", padding: "18px 14px" },
  sectionTitle: { fontFamily: "'Bebas Neue', sans-serif", fontSize: 26, letterSpacing: 2, color: "#F5C518", marginBottom: 14, display: "flex", alignItems: "center", gap: 10 },
  sectionLine: { flex: 1, height: 1, background: "rgba(245,197,24,.15)" },
  infoBox: { background: "#12121a", border: "1px solid rgba(245,197,24,.13)", borderRadius: 8, padding: "14px 16px", fontSize: 13, color: "#888", marginBottom: 14, lineHeight: 1.8 },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: { padding: "9px 7px", fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", color: "#555", fontWeight: 700, textAlign: "center", borderBottom: "2px solid #F5C518" },
  thLeft: { padding: "9px 7px", fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", color: "#555", fontWeight: 700, textAlign: "left", borderBottom: "2px solid #F5C518" },
  td: { padding: "9px 7px", textAlign: "center", borderBottom: "1px solid rgba(255,255,255,.04)" },
  tdLeft: { padding: "9px 7px", textAlign: "left", borderBottom: "1px solid rgba(255,255,255,.04)" },
  pts: { fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, color: "#F5C518" },
  roundBtn: (a) => ({ padding: "5px 13px", background: a ? "#F5C518" : "#1a1a26", border: `1px solid ${a ? "#F5C518" : "rgba(245,197,24,.2)"}`, color: a ? "#000" : "#ccc", borderRadius: 4, cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "inherit", transition: "all .15s" }),
  matchCard: { background: "#12121a", border: "1px solid rgba(245,197,24,.12)", borderRadius: 8, padding: "12px 14px", marginBottom: 7 },
  matchGrid: { display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 8 },
  scoreBox: { width: 38, height: 38, background: "#1a1a26", border: "1px solid rgba(245,197,24,.2)", borderRadius: 5, color: "#fff", fontSize: 20, fontFamily: "'Bebas Neue', sans-serif", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", userSelect: "none" },
  scoreInput: { width: 54, height: 48, background: "#1a1a26", border: "2px solid rgba(245,197,24,.3)", borderRadius: 6, color: "#fff", fontSize: 28, fontFamily: "'Bebas Neue', sans-serif", textAlign: "center", outline: "none" },
  saveBtn: { padding: "8px 18px", background: "#F5C518", color: "#000", fontWeight: 800, fontSize: 12, border: "none", borderRadius: 4, cursor: "pointer", fontFamily: "inherit", letterSpacing: 1, textTransform: "uppercase" },
  clearBtn: { padding: "7px 12px", background: "transparent", color: "#ef4444", fontSize: 11, border: "1px solid #ef4444", borderRadius: 4, cursor: "pointer", fontFamily: "inherit" },
  bracketMatch: { background: "#12121a", border: "1px solid rgba(245,197,24,.18)", borderRadius: 8, overflow: "hidden", minWidth: 210, marginBottom: 16 },
  bracketTeam: (w) => ({ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", fontSize: 13, fontWeight: 500, borderBottom: "1px solid rgba(255,255,255,.05)", background: w ? "rgba(245,197,24,.07)" : "transparent", color: w ? "#F5C518" : "#e2e2ec" }),
  champCard: { background: "linear-gradient(135deg,rgba(245,197,24,.15),rgba(245,197,24,.04))", border: "2px solid #F5C518", borderRadius: 12, padding: 28, textAlign: "center", maxWidth: 280, margin: "24px auto 0" },
  stadCard: { background: "#12121a", border: "1px solid rgba(245,197,24,.12)", borderRadius: 8, padding: 16 },
  syncDot: (ok) => ({ width: 8, height: 8, borderRadius: "50%", background: ok ? "#22c55e" : "#f59e0b", display: "inline-block", marginRight: 6 }),
};

export default function App() {
  const [tab, setTab] = useState("tabla");
  const [matches, setMatches] = useState(INITIAL_MATCHES);
  const [finals, setFinals] = useState({ sf1:{team1:null,team2:null,score1:null,score2:null}, sf2:{team1:null,team2:null,score1:null,score2:null}, third:{team1:null,team2:null,score1:null,score2:null}, final:{team1:null,team2:null,score1:null,score2:null} });
  const [round, setRound] = useState(1);
  const [openCard, setOpenCard] = useState(null);
  const [tempScores, setTempScores] = useState({});
  const [finalInputs, setFinalInputs] = useState({});
  const [connected, setConnected] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsubM = onValue(ref(db,"matches"), (snap) => {
      setConnected(true);
      const data = snap.val();
      if (data) setMatches(prev => prev.map(m => { const r = data[m.id]; return r ? {...m, homeScore:r.homeScore??null, awayScore:r.awayScore??null} : m; }));
    }, () => setConnected(false));
    const unsubF = onValue(ref(db,"finals"), (snap) => { const data = snap.val(); if (data) setFinals(data); });
    return () => { unsubM(); unsubF(); };
  }, []);

  const saveScore = async (matchId) => {
    const hs = parseInt(tempScores[`m_${matchId}_h`]??""), as2 = parseInt(tempScores[`m_${matchId}_a`]??"");
    if (isNaN(hs)||isNaN(as2)||hs<0||as2<0) return;
    setSaving(true);
    try { await set(ref(db,`matches/${matchId}`),{homeScore:hs,awayScore:as2}); } finally { setSaving(false); setOpenCard(null); }
  };

  const clearScore = async (matchId) => {
    setSaving(true);
    try { await set(ref(db,`matches/${matchId}`),{homeScore:null,awayScore:null}); } finally { setSaving(false); setOpenCard(null); }
  };

  const saveFinalScore = async (key) => {
    const s1=parseInt(finalInputs[key+"_1"]??""), s2=parseInt(finalInputs[key+"_2"]??"");
    if (isNaN(s1)||isNaN(s2)) return;
    const winner=s1>=s2?finals[key].team1:finals[key].team2, loser=s1>=s2?finals[key].team2:finals[key].team1;
    const upd={[`finals/${key}/score1`]:s1,[`finals/${key}/score2`]:s2};
    if (key==="sf1"){upd["finals/final/team1"]=winner;upd["finals/third/team1"]=loser;}
    if (key==="sf2"){upd["finals/final/team2"]=winner;upd["finals/third/team2"]=loser;}
    setSaving(true);
    try { await update(ref(db),upd); } finally { setSaving(false); }
  };

  const standings = useMemo(() => calcStandings(matches), [matches]);
  const played = matches.filter(m=>m.homeScore!==null).length;
  const total = matches.length;
  const pct = Math.round(played/total*100);
  const allGroupDone = played===total;
  const top4 = standings.slice(0,4);
  const roundMatches = matches.filter(m=>m.round===round);

  const seededFinals = useMemo(() => {
    if (!allGroupDone) return finals;
    const f={...finals};
    if (f.sf1.team1===null){f.sf1={...f.sf1,team1:top4[0].id,team2:top4[3].id};}
    if (f.sf2.team1===null){f.sf2={...f.sf2,team1:top4[1].id,team2:top4[2].id};}
    if (finals.sf1.team1===null) update(ref(db),{"finals/sf1/team1":top4[0].id,"finals/sf1/team2":top4[3].id,"finals/sf2/team1":top4[1].id,"finals/sf2/team2":top4[2].id});
    return f;
  }, [allGroupDone,finals,top4]);

  return (
    <div style={S.app}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;700&display=swap');*{box-sizing:border-box;}input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none;}input[type=number]{-moz-appearance:textfield;}`}</style>
      <div style={S.header}>
        <div style={S.h1}>FC26 TORNEO</div>
        <div style={S.sub}>Todos contra todos · Fase de Grupos + Final Four</div>
        <div style={S.badge}>⚽ May 3, 2026</div>
        <div style={{marginTop:8,fontSize:11,color:"#555"}}><span style={S.syncDot(connected)}/>{connected?(saving?"Guardando…":"En vivo — todos ven lo mismo"):"Conectando…"}</div>
      </div>
      <div style={S.nav}>
        {[["tabla","🏆 Tabla"],["fixtures","⚽ Partidos"],["finales","🥇 Finales"],["estadios","🏟️ Estadios"]].map(([id,label])=>(<button key={id} style={S.navBtn(tab===id)} onClick={()=>setTab(id)}>{label}</button>))}
      </div>

      {tab==="tabla"&&(<div style={S.page}>
        <div style={S.infoBox}><strong style={{color:"#e2e2ec"}}>Fase de Grupos</strong> — {played} de {total} partidos ({pct}%) · {TOTAL_ROUNDS} rondas · 7 estadios<br/><span>Top 4 clasifican a semifinales</span><div style={{background:"#1a1a26",borderRadius:4,height:5,margin:"10px 0 2px",overflow:"hidden"}}><div style={{height:"100%",width:`${pct}%`,background:"linear-gradient(90deg,#E8A500,#F5C518)",borderRadius:4,transition:"width .4s"}}/></div></div>
        <div style={S.sectionTitle}>Tabla de Posiciones <span style={S.sectionLine}/></div>
        <div style={{overflowX:"auto"}}><table style={S.table}><thead><tr><th style={S.th}>#</th><th style={S.thLeft}>Equipo</th><th style={S.th}>J</th><th style={S.th}>G</th><th style={S.th}>E</th><th style={S.th}>P</th><th style={S.th}>GF</th><th style={S.th}>GC</th><th style={S.th}>DG</th><th style={S.th}>Pts</th><th style={S.th}>Forma</th></tr></thead>
        <tbody>{standings.map((s,i)=>{const q=i<4,dg=s.DG>0?`+${s.DG}`:`${s.DG}`,dgC=s.DG>0?"#22c55e":s.DG<0?"#ef4444":"#888";return(<tr key={s.id} style={{background:q?"rgba(245,197,24,.035)":"transparent"}}><td style={{...S.td,fontFamily:"'Bebas Neue',sans-serif",fontSize:18,color:q?"#F5C518":"#555",borderLeft:q?"3px solid #F5C518":"3px solid transparent"}}>{i+1}</td><td style={S.tdLeft}><div style={{fontWeight:600,fontSize:13}}>{s.name}</div><div style={{fontSize:10,color:"#555"}}>{s.player}</div></td><td style={S.td}>{s.J}</td><td style={S.td}>{s.G}</td><td style={S.td}>{s.E}</td><td style={S.td}>{s.P}</td><td style={S.td}>{s.GF}</td><td style={S.td}>{s.GC}</td><td style={{...S.td,color:dgC,fontWeight:700}}>{dg}</td><td style={{...S.td,...S.pts}}>{s.Pts}</td><td style={S.td}><div style={{display:"flex",gap:3,justifyContent:"center"}}>{s.form.slice(-5).map((f,fi)=>(<span key={fi} style={{width:8,height:8,borderRadius:"50%",background:f==="W"?"#22c55e":f==="D"?"#F5C518":"#ef4444",display:"inline-block"}}/>))}</div></td></tr>);})}</tbody></table></div>
        <div style={{marginTop:10,fontSize:11,color:"#555"}}>⬛ Top 4 clasifican a semifinales</div>
      </div>)}

      {tab==="fixtures"&&(<div style={S.page}>
        <div style={S.sectionTitle}>Partidos <span style={S.sectionLine}/></div>
        <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:14,alignItems:"center"}}>
          <span style={{fontSize:11,color:"#555",textTransform:"uppercase",letterSpacing:1,marginRight:4}}>Ronda:</span>
          {Array.from({length:TOTAL_ROUNDS},(_,i)=>i+1).map(r=>{const done=matches.filter(m=>m.round===r).every(m=>m.homeScore!==null);return(<button key={r} style={S.roundBtn(r===round)} onClick={()=>{setRound(r);setOpenCard(null);}}>{r}{done?" ✓":""}</button>);})}
        </div>
        {BYES[round]&&(<div style={{background:"rgba(99,102,241,.08)",border:"1px solid rgba(99,102,241,.25)",borderRadius:8,padding:"10px 16px",marginBottom:12,display:"flex",alignItems:"center",gap:10,fontSize:13}}><span style={{fontSize:20}}>😴</span><div><span style={{color:"#818cf8",fontWeight:700,fontSize:11,textTransform:"uppercase"}}>Descansa · </span><strong style={{color:"#e2e2ec"}}>{BYES[round].name}</strong><span style={{color:"#555",fontSize:11}}> · {BYES[round].player}</span></div></div>)}
        {roundMatches.map(m=>{const home=TEAMS[m.home],away=TEAMS[m.away],stad=STADIUMS[m.stadium],isOpen=openCard===m.id,isPlayed=m.homeScore!==null,kH=`m_${m.id}_h`,kA=`m_${m.id}_a`;return(<div key={m.id} style={S.matchCard}><div style={S.matchGrid}><div style={{textAlign:"right"}}><div style={{fontWeight:600,fontSize:13}}>{home.name}</div><div style={{fontSize:10,color:"#555"}}>{home.player}</div></div><div style={{textAlign:"center"}}><div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:5}}><div style={{...S.scoreBox,color:isPlayed?"#F5C518":"#444"}} onClick={()=>setOpenCard(isOpen?null:m.id)}>{isPlayed?m.homeScore:"–"}</div><span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:20,color:"#444"}}>:</span><div style={{...S.scoreBox,color:isPlayed?"#F5C518":"#444"}} onClick={()=>setOpenCard(isOpen?null:m.id)}>{isPlayed?m.awayScore:"–"}</div></div><div style={{fontSize:10,color:"#F5C518",letterSpacing:1,textTransform:"uppercase",marginTop:3}}>{stad.emoji} {stad.name}</div>{isPlayed&&<div style={{fontSize:10,background:"rgba(34,197,94,.13)",color:"#22c55e",borderRadius:3,padding:"2px 6px",display:"inline-block",marginTop:2}}>✓ Jugado</div>}</div><div style={{textAlign:"left"}}><div style={{fontWeight:600,fontSize:13}}>{away.name}</div><div style={{fontSize:10,color:"#555"}}>{away.player}</div></div></div>{isOpen&&(<div style={{borderTop:"1px solid rgba(245,197,24,.1)",marginTop:10,paddingTop:10,display:"flex",flexDirection:"column",alignItems:"center",gap:8}}><div style={{fontSize:11,color:"#888",textTransform:"uppercase"}}>{home.name} vs {away.name}</div><div style={{display:"flex",alignItems:"center",gap:8}}><input style={S.scoreInput} type="number" min="0" max="99" placeholder="0" defaultValue={isPlayed?m.homeScore:""} onChange={e=>setTempScores(p=>({...p,[kH]:e.target.value}))}/><span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:28,color:"#444"}}>–</span><input style={S.scoreInput} type="number" min="0" max="99" placeholder="0" defaultValue={isPlayed?m.awayScore:""} onChange={e=>setTempScores(p=>({...p,[kA]:e.target.value}))}/></div><div style={{display:"flex",gap:8}}><button style={S.saveBtn} onClick={()=>saveScore(m.id)}>💾 {saving?"Guardando…":"Guardar"}</button>{isPlayed&&<button style={S.clearBtn} onClick={()=>clearScore(m.id)}>✕ Borrar</button>}</div></div>)}</div>);})}
      </div>)}

      {tab==="finales"&&(<div style={S.page}>
        <div style={S.sectionTitle}>Final Four <span style={S.sectionLine}/></div>
        <div style={S.infoBox}>{!allGroupDone?<><strong style={{color:"#e2e2ec"}}>⏳ En curso</strong> — {played}/{total} partidos. Tentativo: {top4.map(t=><strong key={t.id}> {t.name}</strong>)}</>:<><strong style={{color:"#22c55e"}}>✅ Completada.</strong> {top4.map(t=><strong key={t.id}> {t.name}</strong>)}</>}</div>
        <div style={S.sectionTitle}>Semifinales <span style={S.sectionLine}/></div>
        <div style={{display:"flex",gap:20,flexWrap:"wrap"}}>
          {["sf1","sf2"].map((key,ki)=>{const m=seededFinals[key],t1=m.team1!==null?TEAMS[m.team1]:null,t2=m.team2!==null?TEAMS[m.team2]:null,w1=m.score1!==null&&m.score1>m.score2,w2=m.score1!==null&&m.score2>m.score1;return(<div key={key}><div style={{fontSize:11,color:"#555",letterSpacing:2,textTransform:"uppercase",marginBottom:8}}>Semifinal {ki+1}</div><div style={S.bracketMatch}><div style={S.bracketTeam(w1)}><span>{t1?t1.name:"?"}</span><span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:20,color:"#F5C518"}}>{m.score1??""}</span></div><div style={S.bracketTeam(w2)}><span>{t2?t2.name:"?"}</span><span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:20,color:"#F5C518"}}>{m.score2??""}</span></div></div>{t1&&t2&&(<div style={{display:"flex",alignItems:"center",gap:6,marginTop:6}}><input style={{...S.scoreInput,width:44,height:40,fontSize:22}} type="number" min="0" placeholder="0" onChange={e=>setFinalInputs(p=>({...p,[key+"_1"]:e.target.value}))}/><span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:22,color:"#444"}}>–</span><input style={{...S.scoreInput,width:44,height:40,fontSize:22}} type="number" min="0" placeholder="0" onChange={e=>setFinalInputs(p=>({...p,[key+"_2"]:e.target.value}))}/><button style={S.saveBtn} onClick={()=>saveFinalScore(key)}>💾</button></div>)}</div>);})}
        </div>
        <div style={{...S.sectionTitle,marginTop:24}}>Final & Tercer Puesto <span style={S.sectionLine}/></div>
        <div style={{display:"flex",gap:20,flexWrap:"wrap"}}>
          {[["third","🥉 Tercer Puesto"],["final","🏆 Final"]].map(([key,label])=>{const m=seededFinals[key],t1=m.team1!==null?TEAMS[m.team1]:null,t2=m.team2!==null?TEAMS[m.team2]:null,w1=m.score1!==null&&m.score1>m.score2,w2=m.score1!==null&&m.score2>m.score1;return(<div key={key}><div style={{fontSize:11,color:"#555",letterSpacing:2,textTransform:"uppercase",marginBottom:8}}>{label}</div><div style={S.bracketMatch}><div style={S.bracketTeam(w1)}><span>{t1?t1.name:"Pendiente"}</span><span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:20,color:"#F5C518"}}>{m.score1??""}</span></div><div style={S.bracketTeam(w2)}><span>{t2?t2.name:"Pendiente"}</span><span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:20,color:"#F5C518"}}>{m.score2??""}</span></div></div>{t1&&t2&&(<div style={{display:"flex",alignItems:"center",gap:6,marginTop:6}}><input style={{...S.scoreInput,width:44,height:40,fontSize:22}} type="number" min="0" placeholder="0" onChange={e=>setFinalInputs(p=>({...p,[key+"_1"]:e.target.value}))}/><span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:22,color:"#444"}}>–</span><input style={{...S.scoreInput,width:44,height:40,fontSize:22}} type="number" min="0" placeholder="0" onChange={e=>setFinalInputs(p=>({...p,[key+"_2"]:e.target.value}))}/><button style={S.saveBtn} onClick={()=>saveFinalScore(key)}>💾</button></div>)}</div>);})}
        </div>
        {seededFinals.final.score1!==null&&seededFinals.final.team1!==null&&(<div style={S.champCard}><div style={{fontSize:48}}>🏆</div><div style={{fontSize:11,letterSpacing:3,textTransform:"uppercase",color:"#F5C518",marginBottom:6}}>Campeón FC26 2026</div><div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:38,letterSpacing:2}}>{TEAMS[seededFinals.final.score1>=seededFinals.final.score2?seededFinals.final.team1:seededFinals.final.team2].name}</div><div style={{fontSize:13,color:"#F5C518",marginTop:6}}>{TEAMS[seededFinals.final.score1>=seededFinals.final.score2?seededFinals.final.team1:seededFinals.final.team2].player}</div></div>)}
      </div>)}

      {tab==="estadios"&&(<div style={S.page}>
        <div style={S.sectionTitle}>Estadios <span style={S.sectionLine}/></div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:12}}>
          {STADIUMS.map(s=>(<div key={s.id} style={S.stadCard}><div style={{fontSize:30,marginBottom:8}}>{s.emoji}</div><div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:18,letterSpacing:1,color:"#F5C518"}}>{s.name}</div><div style={{fontSize:12,color:"#555",marginTop:4}}>🎮 {s.host}</div></div>))}
        </div>
      </div>)}
    </div>
  );
}
